import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import fs from "fs";
import path from "path";


export async function loadVectorStore(docId: string) {
  const indexPath = path.join("faiss_indexes", docId.toString());
  
  // Check if vector store exists
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Vector store not found for document ${docId}. Please wait for the document to be indexed.`);
  }

  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_KEY!,
    model: "sentence-transformers/all-MiniLM-L6-v2"
  });

  const vectorstore = await FaissStore.load(
    indexPath,
    embeddings
  );

  return vectorstore;
}