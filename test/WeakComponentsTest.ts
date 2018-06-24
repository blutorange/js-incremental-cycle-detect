import { Consumer } from "andross";
import { expect } from "chai";
import { suite, test } from "mocha-typescript";
import * as Random from "random-js";
import { Algorithm, CommonAdapter, GenericGraphAdapter, MultiGraphAdapter, WeaklyConnectedComponent } from "../index";

type TVertex = number;
type TEdgeData = string;
type TEdgeLabel = string;

@suite("Graph adapter - Graphlib")
export class WeakComponentsTest {

    @test("should work with an empty graph")
    emptyGraph() {
        const g = this.make();
        this.expectComponentsToEqual(g, []);
    }

    @test("should work with a single vertex")
    singleVertex() {
        const g = this.make();
        g.addVertex(0);
        this.expectComponentsToEqual(g, [
            {
                edges: [],
                vertices: [0],
            }
        ]);
    }

    @test("should work with a single edge")
    singleEdge() {
        const g = this.make();
        g.addEdge(0, 1, "foo");
        this.expectComponentsToEqual(g, [
            {
                edges: [[0, 1, "foo"]],
                vertices: [0, 1],
            }
        ]);
    }

    @test("should work with only vertices")
    onlyVertices() {
        const g = this.make();
        g.addVertex(0);
        g.addVertex(1);
        g.addVertex(2);
        g.addVertex(3);
        this.expectComponentsToEqual(g, [
            {
                edges: [],
                vertices: [0],
            },
            {
                edges: [],
                vertices: [1],
            },
            {
                edges: [],
                vertices: [2],
            },
            {
                edges: [],
                vertices: [3],
            },
        ]);
    }

    @test("should work with two components")
    twoComponents() {
        const g = this.make();
        g.addEdge(0, 1, "0_1");
        g.addEdge(0, 2, "0_2");
        g.addEdge(10, 11, "10_11");
        g.addEdge(11, 12, "11_12");
        this.expectComponentsToEqual(g, [
            {
                edges: [[0, 1, "0_1"], [0, 2, "0_2"]],
                vertices: [0, 1, 2],
            },
            {
                edges: [[10, 11, "10_11"], [11, 12, "11_12"]],
                vertices: [10, 11, 12],
            },
        ]);

        g.addEdge(2, 12, "2_12");
        this.expectComponentsToEqual(g, [
            {
                edges: [[0, 1, "0_1"], [0, 2, "0_2"], [2, 12, "2_12"], [10, 11, "10_11"], [11, 12, "11_12"]],
                vertices: [0, 1, 2, 10, 11, 12],
            },
        ]);
    }

    @test("should work with two components in a different order")
    twoComponentsDifferentOrder() {
        const g = this.make();
        g.addEdge(10, 11, "10_11");
        g.addEdge(0, 1, "0_1");
        g.addEdge(11, 12, "11_12");
        g.addEdge(0, 2, "0_2");
        this.expectComponentsToEqual(g, [
            {
                edges: [[0, 1, "0_1"], [0, 2, "0_2"]],
                vertices: [0, 1, 2],
            },
            {
                edges: [[10, 11, "10_11"], [11, 12, "11_12"]],
                vertices: [10, 11, 12],
            },
        ]);
        g.addEdge(2, 12, "2_12");
        this.expectComponentsToEqual(g, [
            {
                edges: [[0, 1, "0_1"], [0, 2, "0_2"], [2, 12, "2_12"], [10, 11, "10_11"], [11, 12, "11_12"]],
                vertices: [0, 1, 2, 10, 11, 12],
            },
        ]);
    }

    @test("should work with maximally connected components in any order")
    maximallyConnectedAnyOrder() {
        const engine = Random.engines.mt19937();
        engine.seed(0x4213);

        const commands: Consumer<CommonAdapter<TVertex, TEdgeData>>[] = [
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(1, 2, "12"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(1, 3, "13"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(1, 4, "14"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(1, 5, "15"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(2, 3, "23"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(2, 4, "24"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(2, 5, "25"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(3, 4, "34"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(3, 5, "35"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(4, 5, "45"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(7, 8, "78"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(7, 9, "79"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(8, 9, "89"),
        ];

        for (let i = 1000; i -- > 0;) {
            const graph = this.make();
            Random.shuffle(engine, commands).forEach(command => command(graph));
            this.expectComponentsToEqual(graph, [
                {
                    edges: [[1, 2, "12"], [1, 3, "13"], [1, 4, "14"], [1, 5, "15"], [2, 3, "23"], [2, 4, "24"], [2, 5, "25"], [3, 4, "34"], [3, 5, "35"], [4, 5, "45"]],
                    vertices: [1, 2, 3, 4, 5],
                },
                {
                    edges: [[7, 8, "78"], [7, 9, "79"], [8, 9, "89"]],
                    vertices: [7, 8, 9],
                },
            ]);
        }
    }

    @test("should work with minimally connected components in any order")
    minimallyConnectedAnyOrder() {
        const engine = Random.engines.mt19937();
        engine.seed(0x4213);

        const commands: Consumer<CommonAdapter<TVertex, TEdgeData>>[] = [
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(1, 2, "12"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(2, 3, "23"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(3, 4, "34"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(4, 5, "45"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(7, 8, "78"),
            (g: CommonAdapter<TVertex, TEdgeData>) => g.addEdge(8, 9, "89"),
        ];

        for (let i = 1000; i -- > 0;) {
            const graph = this.make();
            Random.shuffle(engine, commands).forEach(command => command(graph));
            this.expectComponentsToEqual(graph, [
                {
                    edges: [[1, 2, "12"], [2, 3, "23"], [3, 4, "34"], [4, 5, "45"]],
                    vertices: [1, 2, 3, 4, 5],
                },
                {
                    edges: [[7, 8, "78"], [8, 9, "89"]],
                    vertices: [7, 8, 9],
                },
            ]);
        }
    }

    @test("should work with MultiGraphAdapter")
    multiGraph() {
        const g = MultiGraphAdapter.create<TVertex, TEdgeData, TEdgeLabel>();
        g.addEdge(0, 1, "01a", "a");
        g.addEdge(1, 2, "12a", "a");
        g.addEdge(0, 1, "01b", "b");
        g.addEdge(0, 2, "02a", "a");
        g.addEdge(0, 1, "01c", "c");
        this.expectComponentsToEqual(g, [
            {
                edges: [[0, 1, "01a"], [0, 1, "01b"], [0, 1, "01c"], [0, 2, "02a"], [1, 2, "12a"]],
                vertices: [0, 1, 2],
            },
        ]);
    }

    private make(): GenericGraphAdapter<TVertex, TEdgeData> {
        const adapter = GenericGraphAdapter.create<TVertex, TEdgeData>();
        return adapter;
    }

    private expectComponentsToEqual(graph: CommonAdapter<TVertex, TEdgeData>, expected: WeaklyConnectedComponent<TVertex, TEdgeData>[]): void {
        const c = Algorithm.findWeaklyConnectedComponents(graph);
        expect(c.length).to.equal(expected.length);
        c.forEach(x => expect(x.vertices.length).to.be.greaterThan(0));
        c.forEach(x => x.vertices.sort((lhs, rhs) => lhs - rhs));
        c.forEach(x => x.edges.sort((lhs, rhs) => {
            if (lhs[0] !== rhs[0]) {
                return lhs[0] - rhs[0];
            }
            if (lhs[1] !== rhs[1]) {
                return lhs[1] - rhs[1];
            }
            const l2 = String(lhs[2]);
            const r2 = String(rhs[2]);
            return l2 < r2 ? -1 : l2 > r2 ? 1 : 0;
        }));
        c.sort((lhs, rhs) => lhs.vertices[0] - rhs.vertices[0]);
        c.forEach((component, index) => {
            expect(component.vertices).to.deep.equal(expected[index].vertices);
            expect(component.edges).to.deep.equal(expected[index].edges);
        });
    }
}
