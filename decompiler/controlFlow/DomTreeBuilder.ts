import { DominatorTree } from "./DominatorTree";
import { Queue } from "../../common/util/Queue";

import { ControlFlowGraph, CfgNode } from "./ControlFlowGraph";


/**
 * Creates a dominator tree for control flow analysis.
 */
export class DomTreeBuilder
{
	static Error = class extends Error {};

	private _graph: ControlFlowGraph;
	private _nodes: CfgNode[];
	private _domTree: DominatorTree;

	build ( graph: ControlFlowGraph ): DominatorTree
	{
		this._init (graph);
		this._buildNodeArray ();
		this._buildDomTree ();

		return this._domTree;
	}

	/**
	 * Private methods
	 */

	private _init ( graph: ControlFlowGraph )
	{
		this._graph = graph;
		this._nodes = new Array (graph.size);
		this._domTree = new DominatorTree (graph);
	}

	/**
	 * Builds an array of nodes indexed by their `.postorder` field.
	 */
	private _buildNodeArray ()
	{
		const graph = this._graph;
		const nodes = this._nodes;

		for ( const node of graph )
		{
			nodes[node.postorder] = node;
		}
	}

	/**
	 * "A Simple, Fast Dominance Algorithm" by Keith Cooper, Timothy Harvey, and Ken Kennedy.
	 *
	 * https://www.cs.rice.edu/~keith/EMBED/dom.pdf
	 */
	private _buildDomTree ()
	{
		const domTree = this._domTree;
		const graph = this._graph;
		const nodes = this._nodes;
		const numNodes = nodes.length;

		let changed = true;

		while ( changed )
		{
			changed = false;

			for ( let i = numNodes - 2; i >= 0; i-- )
			{
				const node = nodes[i];
				const predecessors = new Set (graph.edgesTo (node.addr));

				let newIDom: CfgNode = null;

				// Find first predecessor whose dominator has been calculated.
				for ( const predKey of predecessors )
				{
					const pred = graph.node (predKey);

					if ( domTree.getDominator (pred) !== null )
					{
						newIDom = pred;
						predecessors.delete (predKey);
						break;
					}
				}

				if ( newIDom === null )
				{
					throw new DomTreeBuilder.Error (
						`Could not find predecessor of node ${node.postorder} with a calculated dominator`
					);
				}

				for ( const predKey of predecessors )
				{
					const pred = graph.node (predKey);

					if ( domTree.getDominator (pred) !== null )
					{
						newIDom = this._intersectDoms (pred, newIDom);
					}
				}

				if ( domTree.getDominator (node) !== newIDom )
				{
					domTree.setDominator (node, newIDom);
					changed = true;
				}
			}
		}
	}

	/**
	 * Find first common dominator between two nodes.
	 * ----------------------------------------------
	 * "A Simple, Fast Dominance Algorithm" by Keith Cooper, Timothy Harvey, and Ken Kennedy.
	 *
	 * https://www.cs.rice.edu/~keith/EMBED/dom.pdf
	 */
	private _intersectDoms ( node1: CfgNode, node2: CfgNode ): CfgNode
	{
		let finger1 = node1;
		let finger2 = node2;

		const domTree = this._domTree;

		while ( finger1 !== finger2 )
		{
			while ( finger1.postorder < finger2.postorder )
			{
				finger1 = domTree.getDominator (finger1);
			}

			while ( finger2.postorder < finger1.postorder )
			{
				finger2 = domTree.getDominator (finger2);
			}
		}

		return finger1;
	}
};
