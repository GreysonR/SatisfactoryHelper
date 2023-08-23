"use strict";
class Pipeline {
	static all = [];
	static nodesGrid = null;
	static scale = 1;
	static initGrid(nodes) {
		this.nodesGrid = new Grid(1);
		for (let node of nodes) {
			this.nodesGrid.addPoint(node);
		}
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
	}
	render() {
		ctx.globalCompositeOperation = "screen";
		ctx.beginPath();
		let scale = Pipeline.scale;
		let vertices = this.vertices;
		ctx.moveTo(vertices[0].x * scale, vertices[0].y * scale);
		for (let i = 1; i < vertices.length; i++) {
			let vertice = vertices[i];
			ctx.lineTo(vertice.x * scale, vertice.y * scale);
		}
		ctx.stroke();
		ctx.globalCompositeOperation = "source-over";
	}
}