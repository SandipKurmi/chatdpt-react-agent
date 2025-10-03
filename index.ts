import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { writeFileSync } from "fs";
import readline from "readline";
import { MemorySaver } from "@langchain/langgraph";

const main = async () => {
  // Initialize readline for user input
  const userInputInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Set up the language model
  const chatModel = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
  });

  // Configure Tavily web search tool
  const webSearchTool = new TavilySearch({
    maxResults: 5,
    topic: "general",
  });

  // Create a calendar events tool (simulate Google Calendar)
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

  // Set up memory to save the agent's state
  const agentMemory = new MemorySaver();

  // Create the ReAct agent with model, tools, and memory
  const reactAgent = createReactAgent({
    llm: chatModel,
    tools: [webSearchTool, calendarEventsTool],
    checkpointer: agentMemory,
  });

  console.log("Personal Assistant Agent started.");

  // Chat loop to keep taking user input
  while (true) {
    const userMessage: string = await new Promise((resolve) => {
      userInputInterface.question("Enter your message: ", resolve);
    });

    if (!userMessage || userMessage.toLowerCase() === "bye") {
      break;
    }

    // Agent processes message and returns response
    const agentResponse = await reactAgent.invoke(
      {
        messages: [
          {
            role: "system",
            content: `You are a helpful Personal Assistant. You provide tools to get the information you need. If you don't have it, let the user know. Current time is ${new Date().toUTCString()}`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      },
      {
        configurable: { thread_id: "1" },
      }
    );

    console.log(
      agentResponse.messages[agentResponse.messages.length - 1]?.content
    );
  }

  // Close the readline interface when finished
  userInputInterface.close();

  // Draw and save agent graph state image
  const agentGraphState = await reactAgent.getGraphAsync();
  const graphStatePng = await agentGraphState.drawMermaidPng();
  const graphStateBuffer = await graphStatePng.arrayBuffer();
  writeFileSync("./graphState.png", new Uint8Array(graphStateBuffer));
};

main();
