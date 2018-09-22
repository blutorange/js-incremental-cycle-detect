import { MultiGraphAdapter } from "./src/MultiGraphAdapter";

const g = MultiGraphAdapter.create<number, number, string>();
g.addEdge(1, 2, 12, "12");
g.addEdge(2, 3, 23, "23");
g.addEdge(1, 3, 13, "13");
console.log(g.canContractEdge(2 ,3));

console.log(g.getLabeledEdgeCount());
console.log(g.getEdgeCount());
g.contractEdge(2, 3);
console.log(g.getLabeledEdgeCount());
console.log(g.getEdgeCount());

console.log(g.canContractEdge(1 ,2));