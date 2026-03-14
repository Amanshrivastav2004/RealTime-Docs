import fs from "fs";
import { createVectorStore } from "./createVectorStore";

export async function initVectorStore(
  docId: string,
  content: string
) {
  const path = `faiss_indexes/${docId}`;

  if (!fs.existsSync(path)) {
    console.log("FAISS not found, creating embeddings");
    await createVectorStore(docId, content);
  } else {
    console.log("FAISS already exists");
  }
}
