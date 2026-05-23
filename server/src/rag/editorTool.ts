import { tool } from "langchain";
import { z } from "zod";
import { ChatGroq } from "@langchain/groq";
import { interrupt } from "@langchain/langgraph";
import { applyDeltaToDocument } from "./applyDelta";

const editorSchema = z.object({
  instruction: z.string().describe("The edit instruction from the user"),
  selection: z.object({
    index: z.number().describe("Starting index of the selection"),
    length: z.number().describe("Length of the selection")
  }).describe("The current text selection in the editor"),
  documentText: z.string().describe("The current document text"),
  docId: z.string().describe("The document ID")
});

function getWordRangeAt(text: string, index: number) {
  if (!text || index < 0 || index > text.length) {
    return { index, length: 0 };
  }

  if (text.trim() === '') {
    return { index: 0, length: 0 };
  }

  let start = index;
  let end = index;

  const isBoundary = (char: string) => {
    return /\s|[\.,\/#!$%\^&\*;:{}=\-_`~()?"']/.test(char);
  };

  if (start > 0 && (start === text.length || isBoundary(text[start]))) {
    if (!isBoundary(text[start - 1])) {
      start--;
      end = start + 1;
    }
  }

  while (start > 0 && !isBoundary(text[start - 1])) {
    start--;
  }

  while (end < text.length && !isBoundary(text[end])) {
    end++;
  }

  const length = end - start;
  return { index: start, length: length > 0 ? length : 0 };
}

export const editorTool = tool(
  async ({ instruction, selection, documentText, docId }: z.infer<typeof editorSchema>) => {
    let activeSelection = { ...selection };

    // Check for formatting operations that require text selection
    const formattingKeywords = ['bold', 'italic', 'underline', 'color', 'blue', 'red', 'green', 'highlight', 'heading', 'align', 'bigger', 'smaller', 'link'];
    const isFormatting = formattingKeywords.some(keyword => instruction.toLowerCase().includes(keyword));
    
    // If it's a formatting operation but nothing is selected, try to expand to the word under the cursor
    if (isFormatting && activeSelection.length === 0) {
      const expanded = getWordRangeAt(documentText, activeSelection.index);
      if (expanded.length > 0) {
        activeSelection = expanded;
        console.log(`[EditorTool] Expanded empty selection to word range: index ${activeSelection.index}, length ${activeSelection.length} ("${documentText.substring(activeSelection.index, activeSelection.index + activeSelection.length)}")`);
      } else {
        return JSON.stringify({
          status: "error",
          message: "Please place your cursor on a word or highlight the text you want to format first."
        });
      }
    }
    
    // 1️⃣ Generate delta using LLM
    const model = new ChatGroq({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      apiKey: process.env.GROQ_API_KEY
    });

    const response = await model.invoke(`
You are a professional document editor AI. Generate ONLY valid Quill Delta JSON for any formatting or content operation.

=== SUPPORTED OPERATIONS ===

1. TEXT FORMATTING:
   - Bold: "make it bold", "bold this" → {"attributes": {"bold": true}}
   - Italic: "make it italic", "italicize" → {"attributes": {"italic": true}}
   - Underline: "underline this" → {"attributes": {"underline": true}}
   - Strikethrough: "strike through", "cross out" → {"attributes": {"strike": true}}
   - Multiple: "make it bold and italic" → {"attributes": {"bold": true, "italic": true}}

2. HEADINGS:
   - "make it heading 1/h1" → {"attributes": {"header": 1}}
   - "make it heading 2/h2" → {"attributes": {"header": 2}}
   - Up to header: 6

3. LISTS:
   - Bullet: "make points", "bullet list" → {"attributes": {"list": "bullet"}}
   - Numbered: "numbered list", "ordered list" → {"attributes": {"list": "ordered"}}
   - Checklist: "make checklist", "todo list" → {"attributes": {"list": "check"}}

4. ALIGNMENT:
   - "align left" → {"attributes": {"align": "left"}}
   - "align center/centre" → {"attributes": {"align": "center"}}
   - "align right" → {"attributes": {"align": "right"}}
   - "justify" → {"attributes": {"align": "justify"}}

5. COLORS:
   - "make it red" → {"attributes": {"color": "#ff0000"}}
   - "highlight yellow" → {"attributes": {"background": "#ffff00"}}
   - Common colors: red, blue, green, yellow, orange, purple, black, white

6. TEXT SIZE:
   - "make it larger/bigger" → {"attributes": {"size": "large"}}
   - "make it huge" → {"attributes": {"size": "huge"}}
   - "make it small/smaller" → {"attributes": {"size": "small"}}

7. SPECIAL FORMATS:
   - "code block" → {"attributes": {"code-block": true}}
   - "blockquote" → {"attributes": {"blockquote": true}}
   - "inline code" → {"attributes": {"code": true}}

8. INDENTATION:
   - "indent" → {"attributes": {"indent": 1}}
   - "indent more" → {"attributes": {"indent": 2}}
   - "outdent" → {"attributes": {"indent": -1}}

9. LINKS:
   - "make it a link to URL" → {"attributes": {"link": "https://example.com"}}

10. CONTENT CREATION:
    - "write about X" → Generate full detailed paragraph (50+ words)
    - "add X" → Insert new content

=== CURRENT CONTEXT ===

Document Text:
${documentText || "(empty document)"}

Selected Text (what user wants to format):
${activeSelection.length > 0 ? documentText.substring(activeSelection.index, activeSelection.index + activeSelection.length) : "(no selection - will insert new content)"}

Cursor/Selection:
- Index: ${activeSelection.index}
- Length: ${activeSelection.length} (0=insert new content, >0=format/replace selected text)

User Instruction:
"${instruction}"

=== RESPONSE FORMAT ===

You MUST return ONLY valid JSON in one of these formats:

FORMAT 1: Apply formatting (bold, italic, color, alignment, etc.) to selected text (when selection.length > 0):
{
  "ops": [
    {"retain": ${activeSelection.index}},
    {"retain": ${activeSelection.length}, "attributes": {"bold": true}}
  ]
}

FORMAT 2: Insert new content (when selection.length = 0):
{
  "ops": [
    {"retain": ${activeSelection.index}},
    {"insert": "new content here"}
  ]
}

FORMAT 3: For bullet/numbered lists from selected text:
{
  "ops": [
    {"retain": ${activeSelection.index}},
    {"delete": ${activeSelection.length}},
    {"insert": "Point 1\\nPoint 2\\nPoint 3\\n", "attributes": {"list": "bullet"}}
  ]
}

CRITICAL RULES:
- If selection.length > 0: You're formatting the SELECTED text. ALWAYS use two retain operations: one to skip to the selection index, and another to format the selection length with your attributes. Do NOT delete or re-insert the text!
- If selection.length = 0: You're INSERTING new content. Generate new text to insert
- For colors: red=#ff0000, blue=#0000ff, green=#00ff00, yellow=#ffff00, orange=#ffa500, purple=#800080
- For lists: Split sentences with \\n between each point
- NEVER use {"delete": 0} or {"insert": ""} - these do nothing!

EXAMPLES:

Example 1 - Make selected text blue (selection.length=100):
Selected text: "Deep learning is a subset"
{
  "ops": [
    {"retain": 0},
    {"retain": 100, "attributes": {"color": "#0000ff"}}
  ]
}

Example 2 - Make selected text bold and red (selection.length=50):
Selected text: "machine learning"
{
  "ops": [
    {"retain": 10},
    {"retain": 50, "attributes": {"bold": true, "color": "#ff0000"}}
  ]
}

Example 3 - Insert new content (selection.length=0):
{
  "ops": [
    {"insert": "New paragraph about AI and neural networks..."}
  ]
}

NOW GENERATE THE DELTA FOR THIS REQUEST:
User wants: "${instruction}"
Selection length: ${activeSelection.length}
${activeSelection.length > 0 ? `Selected text: "${documentText.substring(activeSelection.index, activeSelection.index + activeSelection.length)}"` : 'No selection - inserting new content'}

Return ONLY the JSON delta object, no other text.
    `);

    let delta;
    try {
      const responseContent = String(response.content).trim();
      console.log("[EditorTool] Raw LLM response:", responseContent);
      
      // Try to extract JSON if it's wrapped in markdown code blocks
      let jsonString = responseContent;
      if (responseContent.includes('```json')) {
        const match = responseContent.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (match) {
          jsonString = match[1];
        }
      } else if (responseContent.includes('```')) {
        const match = responseContent.match(/```\s*(\{[\s\S]*?\})\s*```/);
        if (match) {
          jsonString = match[1];
        }
      }
      
      delta = JSON.parse(jsonString);
      console.log("[EditorTool] Parsed delta:", JSON.stringify(delta));
    } catch (error) {
      console.error("[EditorTool] Failed to parse delta:", error);
      console.error("[EditorTool] Response was:", String(response.content));
      return JSON.stringify({
        status: "error",
        message: "Failed to parse delta from LLM response"
      });
    }

    // 2️⃣ PAUSE for human approval (HITL)
    const resumePayload = interrupt({
      type: "EDITOR_APPROVAL",
      delta,
      instruction,
      selection: activeSelection
    });

    // 🔥 EXECUTION RESUMES FROM HERE AFTER HUMAN DECISION 🔥

    if (resumePayload?.approved === true) {
      // 3️⃣ APPLY DELTA (Update DB + Broadcast via Socket.IO)
      await applyDeltaToDocument(docId, delta);

      return JSON.stringify({
        status: "applied",
        delta,
        message: "Document successfully updated"
      });
    }

    // 4️⃣ Rejected or cancelled
    return JSON.stringify({
      status: "cancelled",
      message: "Edit was cancelled by user"
    });
  },
  {
    name: "edit_document",
    description: "Edit or add NEW content to the document using Quill Delta operations. Use this when user wants to WRITE, ADD, INSERT, MODIFY, FORMAT, or CREATE content. Examples: 'write about...', 'add...', 'make it bold', 'create a list'. DO NOT use for answering questions about existing content.",
    schema: editorSchema,
  }
);
