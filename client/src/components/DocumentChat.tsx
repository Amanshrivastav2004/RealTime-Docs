import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useStore } from '../store/zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isApprovalRequest?: boolean;
  delta?: any;
}

interface PendingApproval {
  threadId: string;
  delta: any;
  instruction: string;
  messageId: string;
}

interface DocumentChatProps {
  onClose?: () => void;
}

const DocumentChat = ({ onClose }: DocumentChatProps) => {

  const { docId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [threadId, setThreadId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get document content from Zustand store
  const documentContent = useStore((state) => state.document.content);
  const selection = useStore((state) => state.selection);
  
  // Convert Quill Delta or HTML to plain text
  const getPlainText = (content: string): string => {
    if (!content) return '';
    try {
      // If it's JSON Delta, extract text
      if (content.trim().startsWith('{')) {
        const delta = JSON.parse(content);
        if (delta.ops) {
          return delta.ops.map((op: any) => op.insert || '').join('');
        }
      }
      // If HTML, strip tags
      const div = document.createElement('div');
      div.innerHTML = content;
      return div.textContent || div.innerText || '';
    } catch {
      return content;
    }
  };


  useEffect(() => {
    // Generate or load threadId for this document
    const storedThreadId = localStorage.getItem(`thread_${docId}`);
    if (storedThreadId) {
      setThreadId(storedThreadId);
    } else {
      const newThreadId = `doc_${docId}_${Date.now()}`;
      setThreadId(newThreadId);
      localStorage.setItem(`thread_${docId}`, newThreadId);
    }
  }, [docId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuestion = input;
    setInput('');
    setLoading(true);

    // Create placeholder for assistant message
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch(`${import.meta.env.VITE_URL}/api/v1/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docId: Number(docId),
          question: currentQuestion,
          threadId: threadId,
          documentText: getPlainText(documentContent), // Get actual document text
          selection: selection
        }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            let data;
            try {
              data = JSON.parse(line.slice(6));
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
            
            if (data.done) {
              setLoading(false);
              return; // Exit completely when done
            }

            // Check if this is an interrupt (approval request)
            if (data.interrupt && data.type === 'EDITOR_APPROVAL') {
              setPendingApproval({
                threadId: data.threadId || threadId,
                delta: data.delta,
                instruction: data.instruction || currentQuestion,
                messageId: assistantId,
              });
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        content: '🤖 I want to make the following changes to your document:',
                        isApprovalRequest: true,
                        delta: data.delta,
                      }
                    : msg
                )
              );
              setLoading(false);
              return; // Stop processing, wait for approval
            }

            // Check if this is an approval request (interrupt)
            if (data.token && typeof data.token === 'string') {
              try {
                const parsedToken = JSON.parse(data.token);
                if (parsedToken.type === 'EDITOR_APPROVAL') {
                  // This is an approval request
                  setPendingApproval({
                    threadId: threadId,
                    delta: parsedToken.delta,
                    instruction: parsedToken.instruction || currentQuestion,
                    messageId: assistantId,
                  });
                  
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? {
                            ...msg,
                            content: '🤖 I want to make the following changes to your document:',
                            isApprovalRequest: true,
                            delta: parsedToken.delta,
                          }
                        : msg
                    )
                  );
                  setLoading(false);
                  return;
                }
              } catch (e) {
                // Not JSON, regular content
              }
            }

            if (data.token) {
              accumulatedContent += data.token;
              
              // Update the assistant message with streaming content
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }
          }
        }
      }

      // If we reach here, streaming completed normally
      setLoading(false);

    } catch (error) {
      console.error('Error asking AI:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: 'Sorry, there was an error processing your question.' }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!pendingApproval) return;

    setLoading(true);
    try {
      await axios.post(`${import.meta.env.VITE_URL}/api/v1/ai/approve`, {
        threadId: pendingApproval.threadId,
        approved,
      });

      // Update the message with approval result
      const resultMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: approved 
          ? '✅ Changes applied successfully!' 
          : '❌ Changes cancelled.',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, resultMessage]);
      setPendingApproval(null);

    } catch (error) {
      console.error('Error with approval:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your approval.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Document Assistant</h2>
          <p className="text-sm text-gray-500">Ask questions about this document</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 focus:outline-none transition-colors"
            title="Close Assistant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <svg
              className="mx-auto h-12 w-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p>Start a conversation</p>
            <p className="text-xs mt-1">Ask questions about your document</p>
          </div>
        )}

        {messages.map((message) => {
          // Don't render empty assistant messages (they're being streamed)
          if (message.role === 'assistant' && !message.content && !message.isApprovalRequest) {
            return null;
          }
          
          return (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Show delta preview if this is an approval request */}
              {message.isApprovalRequest && message.delta && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-300">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Proposed Changes:</p>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(message.delta, null, 2)}
                  </pre>
                  
                  {pendingApproval && pendingApproval.messageId === message.id && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApproval(true)}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleApproval(false)}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about the document..."
            className="flex-1 resize-none border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default DocumentChat;
