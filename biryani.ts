import { StateGraph, MessagesAnnotation, END } from "@langchain/langgraph";
import { writeFileSync } from "fs";

// cut the vegetables

function cutVegetables(state: any): any {
  console.log("Cutting vegetables");
  return state;
}

// boil the rice

function boilRice(state: any): any {
  console.log("Boiling rice");
  return state;
}

// add the salt

function addSalt(state: any): any {
  console.log("Adding salt");
  return state;
}

//test the biryani

function testBiryani(state: any): any {
  console.log("Testing biryani");
  return state;
}

type WhareToGo =
  | "__end__"
  | "addSalt"
  | "testBiryani"
  | "cutVegetables"
  | "boilRice";

function whareToGo(state: any): WhareToGo {
  if (true) {
    return "__end__";
  }
  return "addSalt";
}

// Define a new graph

const graph = new StateGraph(MessagesAnnotation)
  .addNode("cutVegetables", cutVegetables)
  .addNode("boilRice", boilRice)
  .addNode("addSalt", addSalt)
  .addNode("testBiryani", testBiryani)
  .addEdge("__start__", "cutVegetables")
  .addEdge("cutVegetables", "boilRice")
  .addEdge("boilRice", "addSalt")
  .addEdge("addSalt", "testBiryani")
  .addConditionalEdges("testBiryani", whareToGo, {
    __end__: END,
    addSalt: "addSalt",
  });

const biryaniProcessor = graph.compile();

async function main() {
  // Draw and save agent graph state image
  const agentGraphState = await biryaniProcessor.getGraphAsync();
  const graphStatePng = await agentGraphState.drawMermaidPng();
  const graphStateBuffer = await graphStatePng.arrayBuffer();
  writeFileSync("./graphState.png", new Uint8Array(graphStateBuffer));

  const biryani = await biryaniProcessor.invoke({
    messages: [{ role: "user", content: "I want to make biryani" }],
  });
  console.log(biryani);
}

main();
