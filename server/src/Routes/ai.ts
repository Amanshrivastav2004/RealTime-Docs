import { Router } from "express";
import { HumanMessage } from "@langchain/core/messages";
import { agentGraph } from "../rag/agentGraph";
import { Command } from "@langchain/langgraph";

const airouter = Router();

airouter.post("/ask", async (req, res) => {
  const { docId, question, documentText, threadId, selection } = req.body;
  
  try {
    if (!docId || !question) {
      return res.status(400).json({ error: "docId and question are required" });
    }

    console.log(`AI ask request for docId: ${docId}, question: ${question}`);

    // Set headers for SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Invoke the agent graph with streaming
    const config = {
      configurable: {
        thread_id: threadId || `doc_${docId}_${Date.now()}`,
      },
      streamMode: "updates" as const,
      recursionLimit: 10, // Prevent infinite loops
    };

    const initialState = {
      messages: [new HumanMessage(question)],
      docId: String(docId),
      documentText: documentText || "",
      selection: selection || { index: 0, length: 0 },
    };

    // Stream the agent execution
    const stream = await agentGraph.stream(initialState, config);

    for await (const event of stream) {
      console.log("Stream event:", JSON.stringify(event, null, 2));
      
      // Check for interrupt
      if ((event as any).__interrupt__) {
        const interrupts = (event as any).__interrupt__;
        if (Array.isArray(interrupts) && interrupts.length > 0) {
          const interrupt = interrupts[0].value;
          console.log("Interrupt detected:", interrupt);
          res.write(`data: ${JSON.stringify({ 
            interrupt: true,
            type: interrupt.type,
            delta: interrupt.delta,
            instruction: interrupt.instruction,
            threadId: threadId || config.configurable.thread_id
          })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
      }
      
      // In 'updates' mode, event contains only the new node output
      // Extract messages from the update
      let messages = [];
      if (event && typeof event === 'object') {
        // Get messages from any node in the update
        for (const [nodeName, nodeOutput] of Object.entries(event)) {
          if (nodeOutput && typeof nodeOutput === 'object' && 'messages' in nodeOutput) {
            messages = (nodeOutput as any).messages;
            break;
          }
        }
      }

      if (!messages || messages.length === 0) {
        continue;
      }

      // Send the current state to client
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage) {
        // Check message type - handle both LangChain objects and plain objects
                                      const messageType = typeof lastMessage._getType === 'function' 
          ? lastMessage._getType() 
          : lastMessage.role || (lastMessage.constructor?.name === 'HumanMessage' ? 'human' : 'ai');
        
        console.log("Last message type:", messageType);
        console.log("Last message content:", lastMessage.content);
        
        // Only stream AI messages, not human or tool messages
        if (messageType === 'human' || messageType === 'tool') {
          continue; // Skip human and tool messages
        }
        
        const content = typeof lastMessage.content === 'string' 
          ? lastMessage.content 
          : JSON.stringify(lastMessage.content);
        
        res.write(`data: ${JSON.stringify({ 
          token: content,
          type: messageType,
          toolCalls: (lastMessage as any).tool_calls || []
        })}\n\n`);
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (err: any) {
    console.error("AI error:", err);
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    
    // Check if this is a GraphInterrupt (for human approval)
    if (err.constructor.name === 'GraphInterrupt' || err.name === 'GraphInterrupt') {
      try {
        // LangGraph interrupt format
        const interruptData = err.interrupts || err;
        console.log("Interrupt data:", JSON.stringify(interruptData, null, 2));
        
        if (Array.isArray(interruptData) && interruptData.length > 0) {
          const interrupt = interruptData[0].value;
          res.write(`data: ${JSON.stringify({ 
            interrupt: true,
            type: interrupt.type,
            delta: interrupt.delta,
            instruction: interrupt.instruction,
            threadId: threadId
          })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
      } catch (parseErr) {
        console.error("Error parsing interrupt:", parseErr);
      }
    }
    
    // Also check if error message contains interrupt data
    if (err.message && (err.message.includes('EDITOR_APPROVAL') || err.message.includes('interrupt'))) {
      try {
        const interrupts = JSON.parse(err.message);
        if (Array.isArray(interrupts) && interrupts.length > 0) {
          const interrupt = interrupts[0].value;
          res.write(`data: ${JSON.stringify({ 
            interrupt: true,
            type: interrupt.type,
            delta: interrupt.delta,
            instruction: interrupt.instruction,
            threadId: threadId
          })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        }
      } catch (parseErr) {
        // Not a valid interrupt, treat as normal error
      }
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "AI error", 
        message: err.message || "Unknown error"
      });
    }
  }
});

// Endpoint to approve/reject editor tool suggestions
airouter.post("/approve", async (req, res) => {
  try {
    const { threadId, approved } = req.body;

    if (!threadId) {
      return res.status(400).json({ error: "threadId is required" });
    }

    console.log(`Approval request for thread: ${threadId}, approved: ${approved}`);

    // Resume the graph execution with approval decision
    const config = {
      configurable: {
        thread_id: threadId,
      },
    };

    // Get current state from checkpoint to verify it exists
    const state = await agentGraph.getState(config);
    console.log("Current state before resume:", JSON.stringify(state.values, null, 2));

    if (!state || !state.values) {
      return res.status(404).json({ error: "No checkpoint found for this thread" });
    }

    // Resume from interrupt - use Command with resume property
    let finalResult = null;
    let streamError = null;
    
    try {
      const stream = await agentGraph.stream(
        new Command({
          resume: { approved }, // This value is passed to interrupt() as return value
        }),
        config
      );

      for await (const event of stream) {
        console.log("Resume event:", JSON.stringify(event, null, 2));
        finalResult = event;
      }
    } catch (streamErr: any) {
      // Even if stream fails, the edit might have been applied
      console.error("Stream error (edit may still have succeeded):", streamErr.message);
      streamError = streamErr.message;
    }

    // Return success regardless - the edit was likely applied
    res.json({ 
      success: true, 
      message: approved ? "Changes applied successfully" : "Changes rejected",
      result: finalResult,
      warning: streamError ? "Edit applied but stream had an error: " + streamError : undefined
    });

  } catch (err: any) {
    console.error("Approval error:", err.message || err);
    console.error("Full error:", err);
    res.status(500).json({ 
      error: "Approval error", 
      message: err.message || "Unknown error"
    });
  }
});

export default airouter;
