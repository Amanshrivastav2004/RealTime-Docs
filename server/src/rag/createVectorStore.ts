import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import fs from "fs";
import path from "path";

export async function createVectorStore(
  docId: string,
  documentText: string
) {
  try {
    const dirPath = path.join("faiss_indexes", docId);

    //  DELETE OLD EMBEDDINGS FIRST
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }

    // Check if document has content
    if (!documentText || documentText.trim().length === 0) {
      console.log("Document is empty, skipping vector store creation");
      return;
    }

    // Split document
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });

    const docs = await splitter.createDocuments([documentText]);
    
    if (docs.length === 0) {
      console.log("No documents created after splitting");
      return;
    }

    console.log(`Creating embeddings for ${docs.length} chunks...`);

    const embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACEHUB_API_KEY!,
      model: "sentence-transformers/all-MiniLM-L6-v2"
    });

    // Create fresh FAISS index
    const vectorstore = await FaissStore.fromDocuments(docs, embeddings);

    // Save new embeddings
    fs.mkdirSync(dirPath, { recursive: true });
    await vectorstore.save(dirPath);

    console.log(`FAISS index created successfully for doc ${docId}`);
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw error;
  }
}
