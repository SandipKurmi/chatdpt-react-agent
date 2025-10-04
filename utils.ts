import { writeFileSync } from "fs";

export const saveGraphState = async (graph: any, fileName: string) => {
  const graphState = await graph.getGraphAsync();
  const graphStatePng = await graphState.drawMermaidPng();
  const graphStateBuffer = await graphStatePng.arrayBuffer();
  writeFileSync(fileName, new Uint8Array(graphStateBuffer));
};
