"use strict";
class Component {
	static all = {};
	constructor(name) {
		this.name = name;
		this.production = ComponentData[name];
		this.waste = 0;
		this.machines = 0;
		this.quantity = 0;
		this._desiredQuantity = 0;
		Object.defineProperty(this, "desiredQuantity", {
			set: function(value) {
				this._desiredQuantity = value;

				let productionQuantity = this.production.quantity;
				this.machines = Math.ceil(this._desiredQuantity / productionQuantity);
				this.quantity = this.machines * productionQuantity;
				this.waste = this.quantity - this._desiredQuantity;
			},
			get: function() {
				return this._desiredQuantity;
			}
		});
	}
}

class Node {
	static id = 0;
	constructor(type) {
		let componentData = ComponentData[type];
		this.type = type;
		this.inputResources = componentData.inputs;
		this.outputResources = { [type]: componentData.quantity };
		this.depth = componentData.depth;
		this.group = null;

		this.remainingInputResources = merge({}, componentData.inputs);
		this.remainingOutputResources = merge({}, this.outputResources);

		this.position = new vec(0, 0);
		this.in = [];
		this.out = [];
		this.id = Node.id++;
	}
	connectIn(node) {
		if (!this.in.includes(node)) {
			this.in.push(node);
		}
	}
	connectOut(node) {
		if (!this.out.includes(node)) {
			this.out.push(node);
		}
	}
	removeIn(node) {
		if (this.in.includes(node)) {
			this.in.delete(node);
		}
	}
	removeOut(node) {
		if (this.out.includes(node)) {
			this.out.delete(node);
		}
	}
	setPosition(position) {
		if (!this.renderGroup) {
			this.position.set(position);
			console.warn("no group");
			return;
		}
		let grid = this.renderGroup.grid;
		grid.removeBody(this);
		this.position.set(position);
		grid.addBody(this);

		this.renderGroup.bounds.min.min2(this.position);
		this.renderGroup.bounds.max.max2(this.position);
	}
}
class Connection {
	constructor(from, to, type, quantity) {
		this.from = from;
		this.to = to;
		this.type = type;
		this.quantity = quantity;
		this.interPoints = [];

		from.remainingOutputResources[type] -= quantity;
		to.remainingInputResources[type] -= quantity;

		from.connectOut(this);
		to.connectIn(this);
	}
	delete() {
		this.from.remainingOutputResources[this.type] += this.quantity;
		this.to.remainingInputResources[this.type] += this.quantity;

		this.from.removeOut(this);
		this.to.removeIn(this);
	}
}

class RenderGrid {
	static pair = function(pos) {
		let x = pos.x >= 0 ? pos.x * 2 : pos.x * -2 - 1;
		let y = pos.y >= 0 ? pos.y * 2 : pos.y * -2 - 1;
		return (x >= y) ? (x * x + x + y) : (y * y + x);
	}
	constructor() {
		this.grid = {};
	}
	addBody(body) {
		let id = RenderGrid.pair(body.position);
		if (this.grid[id]) {
			// console.warn("Body already in position " + body.position);
			return false;
		}
		this.grid[id] = body;
		return true;
	}
	removeBody(body) {
		let id = RenderGrid.pair(body.position);
		delete this.grid[id];
	}
	getBody(position) {
		let id = RenderGrid.pair(position);
		return this.grid[id];
	}
}
class Branch {
	static id = 0;
	static addComponents(componentsA, componentsB) { // adds componentsB to componentsA, modifying componentsA
		for (let componentName of Object.keys(componentsB)) {
			let dataB = componentsB[componentName];
			if (!componentsA[componentName]) {
				componentsA[componentName] = {
					used: 0,
					produced: 0,
					block: ComponentData[componentName].quantity,
				};
			}
			let dataA = componentsA[componentName];
			dataA.used += dataB.used;
			dataA.produced += dataB.produced;
		}
		return componentsA;
	}
	static createComponentObject(node) {
		let components = {};
		let { inputResources, outputResources } = node;
		for (let componentName of Object.keys(inputResources)) {
			if (!components[componentName]) {
				components[componentName] = {
					used: 0,
					produced: 0,
					block: ComponentData[componentName].quantity,
				};
			}
			components[componentName].used += inputResources[componentName];
		}
		for (let componentName of Object.keys(outputResources)) {
			if (!components[componentName]) {
				components[componentName] = {
					used: 0,
					produced: 0,
					block: ComponentData[componentName].quantity,
				};
			}
			components[componentName].produced += outputResources[componentName];
		}
		return components;
	}
	constructor() {
		this.nodes = [];
		this.id = Branch.id++;
		this.components = {};
	}
	addComponents(node) {
		let { inputResources, outputResources } = node;
		for (let componentName of Object.keys(inputResources)) {
			if (!this.components[componentName]) {
				this.components[componentName] = {
					used: 0,
					produced: 0,
					block: ComponentData[componentName].quantity,
				};
			}
			this.components[componentName].used += inputResources[componentName];
		}
		for (let componentName of Object.keys(outputResources)) {
			if (!this.components[componentName]) {
				this.components[componentName] = {
					used: 0,
					produced: 0,
					block: ComponentData[componentName].quantity,
				};
			}
			this.components[componentName].produced += outputResources[componentName];
		}
	}
	removeComponents(node) {
		let { inputResources, outputResources } = node;
		for (let componentName of Object.keys(inputResources)) {
			this.components[componentName].used -= inputResources[componentName];
		}
		for (let componentName of Object.keys(outputResources)) {
			this.components[componentName].produced -= outputResources[componentName];
		}
	}
	resetComponents() {
		this.components = {};
		for (let node of this.nodes) {
			this.addComponents(node);
		}
	}
	addNode(node) {
		if (!this.nodes.includes(node)) {
			this.nodes.push(node);
			node.group = this;
			this.addComponents(node);
		}
	}
	removeNode(node) {
		if (this.nodes.includes(node)) {
			this.nodes.delete(node);
			node.group = null;
			this.removeComponents(node);
		}
		else {
			console.warn("no node", node, this);
		}
	}
	addBranch(branch) { // merges `branch` onto `this`
		if (branch !== this) {
			for (let i = 0; i < branch.nodes.length;) {
				let node = branch.nodes[0];
				branch.removeNode(node);
				this.addNode(node);
			}
		}
	}
}

class RenderBranch {
	static id = 0;
	constructor() {
		this.nodes = [];
		this.id = RenderBranch.id++;
		this.grid = new RenderGrid();
		this.bounds = {
			min: new vec(0, 0),
			max: new vec(0, 0),
		}
	}
	resetBounds() {
		return; // doesn't really do anything since you nodes are only removed when deleting a branch
		this.bounds = {
			min: new vec(0, 0),
			max: new vec(0, 0),
		};

		for (let node of this.nodes) {
			this.bounds.min.min2(node.position);
			this.bounds.max.max2(node.position);
		}
	}
	addNode(node) {
		if (!this.nodes.includes(node)) {
			this.nodes.push(node);
			this.grid.addBody(node);
			node.renderGroup = this;
			this.bounds.min.min2(node.position);
			this.bounds.max.max2(node.position);
		}
	}
	removeNode(node) {
		if (this.nodes.includes(node)) {
			this.nodes.delete(node);
			this.grid.removeBody(node);
			node.renderGroup = null;
			this.resetBounds();
		}
		else {
			console.warn("no node", node, this);
		}
	}
	addBranch(branch) { // merges `branch` onto `this`
		if (branch !== this) {
			for (let i = 0; i < branch.nodes.length;) {
				let node = branch.nodes[0];
				branch.removeNode(node);
				this.addNode(node);
			}
		}
	}
	getOpenPosition(position, direction) { // gets the closest open pos in a direction, position argument is modified by function and returned
		let { grid } = this;
		let i = 0;
		let maxDistance = 10000; // shouldn't get close to this, who knows though
		while (++i < maxDistance) {
			if (!grid.getBody(position)) {
				break;
			}
			else {
				position.add2(direction);
			}
		}
		if (i >= maxDistance) console.error("couldn't find position", position, direction, this);
		return position;
	}
	shift(shift) { // shifts all nodes by given amount
		for (let node of this.nodes) {
			node.setPosition(node.position.add(shift));
			// this.bounds.min.min2(node.position);
			// this.bounds.max.max2(node.position);
		}
		this.resetBounds();
	}
	canShift(shift, branchB) {
		for (let node of this.nodes) {
			if (branchB.grid.getBody(node.position.add(shift))) {
				return false;
			}
		}
		return true;
	}
}
