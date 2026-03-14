import { tool } from "langchain";
import { z } from "zod";
import { loadVectorStore } from "./loadVectorStore";
import { ChatGroq } from "@langchain/groq";

const schema = z.object({
  question: z.string().describe("The user's question about the document"),
});

export const documentQueryTool = tool(
  async ({ question }: z.infer<typeof schema>, config?: { configurable?: { docId?: string } }) => {
    try {
      // Get docId from config if available, otherwise error
      const docId = config?.configurable?.docId;
      if (!docId) {
        return "Error: Document ID not available";
      }
      
      const vectorstore = await loadVectorStore(docId);
      const retriever = vectorstore.asRetriever({ k: 5 });
      const docs = await retriever.invoke(question);

      const context = docs.map(d => d.pageContent).join("\n");

      const model = new ChatGroq({
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        apiKey: process.env.GROQ_API_KEY
      });

      const res = await model.invoke(`
Answer using the document context.
Context:
${context}

Question:
${question}
    `);

      return JSON.stringify({
        status: "success",
        answer: String(res.content)
      });
    } catch (error: any) {
      // If vector store doesn't exist, return a helpful message
      if (error.message.includes('Vector store not found')) {
        return JSON.stringify({
          status: "error",
          message: "I cannot search this document yet as it hasn't been indexed. However, I can help you edit or add content to the document. What would you like to write?"
        });
      }
      return JSON.stringify({
        status: "error",
        message: error.message
      });
    }
  },
  {
    name: "doc_query",
    description: "Search and retrieve information from the document to answer questions about EXISTING content. Use this when user asks 'tell me about...', 'what does it say about...', 'explain...', 'summarize...', 'find information about...'. DO NOT use for writing or adding new content.",
    schema,
  }
);
