import { ChatGroq } from "@langchain/groq";
import { TavilySearch } from "@langchain/tavily";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  END,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import readline from "readline/promises";
import { saveGraphState } from "./utils";

// === INPUT/OUTPUT SETUP ===
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// === STATEFUL MEMORY FOR CHAT THREADS ===
const memorySaver = new MemorySaver();

// === TOOL DEFINITIONS ===
const webSearchTool = new TavilySearch({
  maxResults: 5,
  topic: "general",
});

const calendarEventsTool = tool(
  async () => {
    return JSON.stringify({
      events: [
        { title: "Meeting with John", date: "2025-10-03" },
        { title: "Meeting with Jane", date: "2025-10-04" },
        { title: "Meeting with Jim", date: "2025-10-05" },
      ],
    });
  },
  {
    name: "get-calendar-events-by-date",
    description: "Retrieves calendar events for a specific date.",
    schema: z.object({
      query: z.string().describe("The query to use in your calendar search."),
    }),
  }
);

const tools = [webSearchTool, calendarEventsTool];
const toolsNode = new ToolNode(tools);

// === LANGUAGE MODEL SETUP ===
const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
}).bindTools(tools);

// === GRAPH LOGIC FUNCTIONS ===
// LLM node: Calls the model on chat state and returns structured messages
async function callModel(state: any) {
  const response = await llm.invoke(state.messages);
  return {
    messages: [response],
  };
}

// Routing logic: Decides if tools are needed or to end conversation
function shouldContinue(state: any): string {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls?.length > 0) {
    return "tools";
  }
  return "__end__";
}

// === GRAPH STRUCTURE ===
const chatGraph = new StateGraph(MessagesAnnotation)
  .addNode("llm", callModel)
  .addNode("tools", toolsNode)
  .addEdge("__start__", "llm")
  .addEdge("tools", "llm")
  .addConditionalEdges("llm", shouldContinue, {
    __end__: END,
    tools: "tools",
  });

// Compile graph with stateful memory
const graphProcessor = chatGraph.compile({ checkpointer: memorySaver });

// === MAIN CHAT LOOP ===
async function main() {
  const user_id = "1";
  const config = { configurable: { thread_id: "1", user_id } };

  while (true) {
    const userMessage: string = await rl.question("Enter your message: ");

    if (!userMessage || userMessage.toLowerCase() === "bye") {
      break;
    }

    const result = await graphProcessor.invoke(
      {
        messages: [{ role: "user", content: userMessage }],
      },
      { ...config }
    );

    // Print the LLM's response
    const lastMessage = result.messages[result.messages.length - 1];
    console.log("agent response", lastMessage?.content);
  }

  rl.close();

  // === OPTIONAL: SAVE GRAPH DIAGRAM ===
  saveGraphState(graphProcessor, "./graphStateWithTools.png");
}

main();
