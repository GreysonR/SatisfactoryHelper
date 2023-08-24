"use strict";
class Pipeline {
	static all = [];
	static nodesGrid = null;
	static scale = 1;
	static initGrid(nodes) { // resets the body grid to include new nodes
		this.nodesGrid = new Grid(1);
		for (let node of nodes) {
			this.nodesGrid.addPoint(node);
		}
	}
	static shiftAll() { // shifts pipes so they aren't on top of each other

	}
	constructor(from, to) {
		this.from = from;
		this.to = to;
		this.vertices = [];

		Pipeline.all.push(this);
		
		let gap = 0.5;
		let margin = 0.5;
		this.vertices.push(from.add(new vec(0, gap - margin)));
		this.vertices.push(from.add(new vec(0, gap)));
		this.vertices.push(new vec(from.x, (from.y + to.y) * 0.5));
		this.vertices.push(new vec(to.x, (from.y + to.y) * 0.5));
		this.vertices.push(to.add(new vec(0, -gap)));
		this.vertices.push(to.add(new vec(0, -gap + margin)));
		
		// filter out duplicate vertices
		this.vertices = this.vertices.filter((value, index, array) => {
			return index === 0 || !value.equals(array[index - 1]);
		});
	}
	render() {
		ctx.globalCompositeOperation = "screen";
		ctx.beginPath();
		let scale = Pipeline.scale;
		Render.roundedPath(this.vertices.map(v => v.mult(scale)), 20);
		ctx.stroke();
		ctx.globalCompositeOperation = "source-over";
	}
}