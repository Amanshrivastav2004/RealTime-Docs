import { StateGraph, START, END, Annotation, messagesStateReducer, MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatGroq } from "@langchain/groq";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { agentPrompt } from "./prompt";
import { documentQueryTool } from "./documentQueryTool";
import { editorTool } from "./editorTool";
// import { RedisCheckpointer } from "./checkpointer"; // Commented out as Redis is not connecting

// Define state annotation
const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
  }),
  docId: Annotation<string>(),
  documentText: Annotation<string>(),
  selection: Annotation<{ index: number; length: number }>(),
  approved: Annotation<boolean | undefined>(),
});

type AgentState = typeof AgentStateAnnotation.State;

// Initialize LLM with tools
const llm = new ChatGroq({
  model: "llama-3.1-8b-instant",
  temperature: 0.3,
  apiKey: process.env.GROQ_API_KEY
}).bindTools([documentQueryTool, editorTool]);

// Create tools node with state injection
async function toolsNode(state: AgentState): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage._getType() !== "ai" || !(lastMessage as any).tool_calls?.length) {
    return { messages: [] };
  }

  const toolCalls = (lastMessage as any).tool_calls;
  const toolMessages = [];

  for (const toolCall of toolCalls) {
    let result;
    
    if (toolCall.name === "doc_query") {
      result = await documentQueryTool.invoke(
        {
          question: toolCall.args.question,
        },
        {
          configurable: {
            docId: String(state.docId),
          },
        }
      );
      
      toolMessages.push({
        role: "tool",
        content: typeof result === 'string' ? result : JSON.stringify(result),
        tool_call_id: toolCall.id,
        name: toolCall.name,
      });
    } else if (toolCall.name === "edit_document") {
      // Don't catch interrupt - let it bubble up to stop the graph
      result = await editorTool.invoke({
        instruction: toolCall.args.instruction,
        selection: state.selection || { index: 0, length: 0 },
        documentText: state.documentText || "",
        docId: String(state.docId || ""),
      });
      
      toolMessages.push({
        role: "tool",
        content: typeof result === 'string' ? result : JSON.stringify(result),
        tool_call_id: toolCall.id,
        name: toolCall.name,
      });
    } else {
      toolMessages.push({
        role: "tool",
        content: `Unknown tool: ${toolCall.name}`,
        tool_call_id: toolCall.id,
        name: toolCall.name,
      });
    }
  }

  return { messages: toolMessages as any };
}

// Agent node - decides whether to use tools or respond directly
async function agentNode(state: AgentState): Promise<Partial<AgentState>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Format the prompt with context
  const formattedMessages = await agentPrompt.formatMessages({
    input: typeof lastMessage.content === 'string' ? lastMessage.content : '',
    docId: state.docId || 'unknown',
    documentText: state.documentText?.substring(0, 500) + '...' || 'No content available',
    selectionIndex: state.selection?.index ?? 0,
    selectionLength: state.selection?.length ?? 0,
  });

  // Invoke LLM with formatted prompt
  const response = await llm.invoke([...formattedMessages]);

  return {
    messages: [response]
  };
}

// Routing function - decides next step after agent
function routeAfterAgent(state: AgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Check if the last message is an AI message with tool calls
  if (lastMessage._getType() === "ai" && (lastMessage as any).tool_calls?.length > 0) {
    return "tools";
  }
  
  // If no tool calls, end the conversation
  return "end";
}

// Route after tools execute - check if we should continue or end
function routeAfterTools(state: AgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // If the last message is a tool message, check its content
  if (lastMessage._getType() === "tool") {
    try {
      const toolResult = JSON.parse((lastMessage as any).content);
      
      // If editor tool was applied or cancelled, END the conversation
      if (toolResult.status === "applied" || toolResult.status === "cancelled") {
        return "end";
      }
      
      // If editor tool ERROR, END to avoid infinite loop
      if (toolResult.status === "error" && (lastMessage as any).name === "edit_document") {
        console.log("[Route] edit_document failed, ending conversation");
        return "end";
      }
      
      // If query tool returned success, go back to agent ONCE to format answer, then it will END
      if (toolResult.status === "success" && (lastMessage as any).name === "doc_query") {
        console.log("[Route] doc_query succeeded, agent will format final answer");
        return "agent";
      }
      
      // If query tool had an error, go to agent to handle it
      if (toolResult.status === "error" && (lastMessage as any).name === "doc_query") {
        console.log("[Route] doc_query had error, agent will respond");
        return "agent";
      }
      
      // For any other tool results, END
      return "end";
    } catch (e) {
      // If can't parse as JSON, END to prevent loops
      console.log("[Route] Could not parse tool result as JSON, ending to prevent loop");
      return "end";
    }
  }
  
  // Default: END to prevent infinite loops
  return "end";
}

// Use in-memory checkpointer instead of Redis (since Redis connection is failing)
const checkpointer = new MemorySaver();

// Create the graph
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", routeAfterAgent, {
    tools: "tools",
    end: END
  })
  .addConditionalEdges("tools", routeAfterTools, {
    agent: "agent",
    end: END
  }); // After tools, either continue to agent or END

// Compile with checkpointer
export const agentGraph = workflow.compile({ 
  checkpointer,
});

// Export with default recursion limit
export const agentGraphConfig = {
  recursionLimit: 10, // Prevent infinite loops
};
