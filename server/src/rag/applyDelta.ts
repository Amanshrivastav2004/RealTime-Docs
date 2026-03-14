import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";

const prisma = new PrismaClient();

// Store Socket.IO instance (will be set from server.ts)
let io: Server | null = null;

export function setSocketIO(socketServer: Server) {
  io = socketServer;
}

export async function applyDeltaToDocument(docId: string, delta: any) {
  try {
    // 1️⃣ Get current document from database
    const document = await prisma.document.findUnique({
      where: { id: parseInt(docId) }
    });

    if (!document) {
      throw new Error(`Document with ID ${docId} not found`);
    }

    // 2️⃣ Apply delta to current content
    // Note: In a production app, you'd use Quill's Delta API to properly merge
    const Quill = require('quill-delta');
    
    // Handle both JSON Delta and HTML content formats
    let currentDelta;
    if (!document.content || document.content.trim() === '') {
      // Empty document
      currentDelta = new Quill({ ops: [] });
    } else if (document.content.trim().startsWith('<')) {
      // HTML content - start with empty delta since we can't parse HTML to Delta easily
      // In production, you'd use a library to convert HTML to Delta
      console.log('[Apply Delta] Document contains HTML, starting fresh with Delta');
      currentDelta = new Quill({ ops: [] });
    } else {
      // JSON Delta format
      try {
        const parsedContent = JSON.parse(document.content);
        currentDelta = new Quill(parsedContent);
      } catch (parseError) {
        console.warn('[Apply Delta] Failed to parse content as JSON, starting fresh:', parseError);
        currentDelta = new Quill({ ops: [] });
      }
    }
    
    const newDelta = currentDelta.compose(new Quill(delta));

    // 3️⃣ Update document in database
    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(docId) },
      data: {
        content: JSON.stringify(newDelta)
      }
    });

    // 4️⃣ Broadcast delta to all connected clients in this document room
    if (io) {
      console.log(`[Apply Delta] Broadcasting delta to document-${docId}:`, JSON.stringify(delta));
      // Use io.to() to broadcast to ALL clients in the room (including sender)
      io.to(`document-${docId}`).emit("receive-change", delta);
      // Also emit a special event to force refresh if socket connection is fresh
      io.to(`document-${docId}`).emit("ai-update", { docId, delta });
      console.log(`[Apply Delta] Broadcasted to ${io.sockets.adapter.rooms.get(`document-${docId}`)?.size || 0} clients in document-${docId} room`);
    } else {
      console.warn("[Apply Delta] Socket.IO instance not available for broadcasting");
    }

    // 5️⃣ Update vector store with new plain text
    const plainText = extractPlainText(newDelta);
    if (plainText) {
      const { createVectorStore } = await import("./createVectorStore.js");
      await createVectorStore(docId, plainText);
      console.log(`[Apply Delta] Updated vector store for document ${docId}`);
    }

    return {
      success: true,
      document: updatedDocument
    };
  } catch (error: any) {
    console.error("[Apply Delta Error]:", error);
    throw error;
  }
}

// Helper function to extract plain text from Quill Delta
function extractPlainText(delta: any): string {
  if (!delta.ops) return "";
  
  return delta.ops
    .map((op: any) => {
      if (typeof op.insert === 'string') {
        return op.insert;
      }
      return '';
    })
    .join('');
}
