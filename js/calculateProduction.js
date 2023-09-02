"use strict";
// Calculates graph of nodes and renders it
var camera = Render.camera;
function calculateProduction(productName, desiredQuantity) {
	console.clear();
	var blockSize = 120;
	Render.events.beforeRender.length = 0;
	mouse.clickingNode = null;
	
	// Create base tree with excess production
	let allNodes = [];
	let baseNodes = [];
	function createNode(type) { // creates a node and its inputs recursively
		let node = new Node(type);
		for (let childType of Object.keys(node.inputResources)) {
			let resourcesNeeded = node.inputResources[childType];
			let resourceBlock = ComponentData[childType].quantity; // # of resources per machine
			let numMachines = Math.ceil(resourcesNeeded / resourceBlock);
			for (let i = 0; i < numMachines; i++) {
				let child = createNode(childType);
				let taken = Math.min(child.outputResources[childType], node.remainingInputResources[childType]);
				new Connection(child, node, childType, taken);
			}
		}
		allNodes.push(node);
		if (node.depth === 0) baseNodes.push(node);
		return node;
	}
	let numProductFactories = Math.ceil(desiredQuantity / ComponentData[productName].quantity);
	let productNodes = [];
	for (let i = 0; i < numProductFactories; i++) {
		productNodes.push(createNode(productName));
	}

	document.getElementById("desiredQuantity").value = numProductFactories * ComponentData[productName].quantity;

	// console.log(productNodes);
	// console.log(allNodes);

	// Trim excess production
	let branches = [];
	let renderBranches = [];
	let allRenderBranches = [];
	window.branches = branches;
	window.allNodes = allNodes;
	function resetBranches(branches) {
		for (let branch of branches) {
			for (let i = 0; i < branch.nodes.length;) {
				branch.nodes[0].position.set(new vec(0, 0));
				branch.removeNode(branch.nodes[0]);
			}
		}
		branches.length = 0;
	}
	(function trimExcess() {
		// create a branch for each base node
		for (let node of baseNodes) {
			let branch = new Branch();
			branch.addNode(node);
			branches.push(branch);
		}
		// console.log(...branches);

		function trimBranch(branch) {
			// console.log(merge({}, branch.components));
			let hasMerge = false;
			for (let componentName of Object.keys(branch.components)) {
				// test if trimming is needed
				let componentData = branch.components[componentName];
				if (componentData.block === 0) continue;
				let neededNodes = Math.ceil(componentData.used / componentData.block);
				let usedNodes = Math.ceil(componentData.produced / componentData.block);
				let excessNodes = usedNodes - neededNodes;
				if (componentData.used > 0 && excessNodes > 0) {
					// console.log("trimming components: ", componentName, merge({}, componentData));
					hasMerge = true;
					// trim this branch
					// ~ find a node with an output of this component type
					let possibleTrims = [];
					for (let i = 0; i < branch.nodes.length; i++) {
						let node = branch.nodes[i];
						if (node.outputResources[componentName]) {
							possibleTrims.push(node);
						}
					}

					function trimNode(node) {
						// trim this node
						branch.removeNode(node);
						allNodes.delete(node);
						if (node.depth === 0) baseNodes.delete(node);
						// console.log("Trimmed", node);

						// trim parent nodes out
						function trimInputs(node) {
							for (let i = 0; i < node.in.length; i++) {
								let inputConnection = node.in[i];
								let inputNode = inputConnection.from;
								if (inputNode.out.length === 1) {
									branch.removeNode(inputNode);
									allNodes.delete(inputNode);
									if (node.depth === 0) baseNodes.delete(node);
									trimInputs(inputNode);
								}
								else {
									inputConnection.delete();
									i--;
								}
							}
						}
						trimInputs(node);

						// reconnect outputs with a new input
						for (let i = 0; i < node.out.length;) {
							let outputConnection = node.out[i];
							outputConnection.delete();

							let outputNode = outputConnection.to;
							let neededType = outputConnection.type;
							let neededInput = outputNode.remainingInputResources[neededType];
							for (let node of branch.nodes) {
								if (node.remainingOutputResources[neededType]) {
									let taken = Math.min(node.remainingOutputResources[neededType], neededInput);
									// console.log(`taken ${taken} ${neededType} #${node.id} for ${outputNode.type} #${outputNode.id}`);
									neededInput -= taken;
									new Connection(node, outputNode, neededType, taken);
									if (neededInput <= 0) {
										break;
									}
								}
							}
						}
					}
					possibleTrims.sort((a, b) => a.out.length - b.out.length);
					for (let i = 0; i < excessNodes; i++) { // assumes excess nodes >= possibleTrims.length
						trimNode(possibleTrims[i]);
					}
				}
			}
			return hasMerge;
		}
		function crawlBranch(branch, depth) { // crawls branch at depth, returns branch it merged (or null if none)
			let n = 1;
			// console.log(`${depth} / ${branch.id}: `);
			// branch.nodes.sort((a, b) => a.depth - b.depth);
			for (let node of branch.nodes) {
				for (let connection of node.out) {
					let nodeOut = connection.to;
					if (nodeOut.depth <= depth) { // expand to this depth
						if (nodeOut.in.length > 1 && !nodeOut.mergedIn) { // merge all input branches together
							// console.log(`merged`, nodeOut);

							let inputs = nodeOut.in;
							let newBranch = new Branch();
							newBranch.addNode(nodeOut);
							nodeOut.mergedIn = true;
							

							// Group together input types
							let inputTypes = {};
							for (let connection of inputs) {
								let type = connection.type;
								if (connection.from.group) {
									if (!inputTypes[type]) inputTypes[type] = [];
									inputTypes[type].push(connection.from.group);
								}
							}

							// Merge + trim each component types separate
							// the goal is to keep trims as local as possible so they make the most sense even if picked at random
							for (let componentName of Object.keys(inputTypes)) {
								let componentBranches = inputTypes[componentName];
								let mainBranch = componentBranches[0];

								// merge all other branches onto mainBranch
								for (let i = 1; i < componentBranches.length; i++) {
									let curBranch = componentBranches[i];
									if (curBranch !== mainBranch) {
										mainBranch.addBranch(curBranch);
										if (!branches.delete(curBranch)) {
											// console.error(curBranch, branches);
											// throw new Error("Fail");
										}
									}
								}

								// trim main branch
								while (trimBranch(mainBranch));

								// merge main branch with the new branch
								newBranch.addBranch(mainBranch);
								if (!branches.delete(mainBranch)) {
									// console.error(mainBranch, branches);
									// throw new Error("Fail");
								}
							}
							while (trimBranch(newBranch));
							branches.push(newBranch);

							return newBranch;
						}
						else { // add node to this branch
							branch.addNode(nodeOut);
							++n;
						}
					}
				}
			}
			return null;
		}
		function finalize() {
			// merge together final branches
			for (let i = 1; i < branches.length;) {
				branches[0].addBranch(branches[i]);
				if (!branches.delete(branches[i])) {
					console.error(curBranch, branches);
					throw new Error("Fail");
				}
			}
			// add missing nodes (I have no idea why they aren't there, but this seems to fix it, even if the graph isn't as pretty)
			for (let node of allNodes) {
				if (!branches[0].nodes.includes(node)) {
					branches[0].addNode(node);
				}
			}
			// connect product nodes to output
			let outputNode = new Node("output");
			outputNode.depth = ComponentData[productName].depth + 1;
			branches[0].addNode(outputNode);
			allNodes.push(outputNode);
			for (let node of allNodes) {
				if (node.type === productName) {
					new Connection(node, outputNode, productName, node.outputResources[productName]);
				}
			}
			let mergedBranch = crawlBranch(branches[0], outputNode.depth, true);
			if (mergedBranch) {
				// console.log("FINAL branch components", merge({}, mergedBranch.components), mergedBranch.id);
			}
			
			// console.log("final components: ", ...branches.map(v => merge({}, v.components)));
			console.log(branches);
			console.log(outputNode);
	
			createRenderNodes();
		}
		
		/*
		let depth = 1;
		let i = 0;
		window.addEventListener("mousedown", () => {
			if (depth <= ComponentData[productName].depth) {
				let branch = branches[i];
				let mergedBranch = crawlBranch(branch, depth);
				if (mergedBranch) {
					console.log("NEW branch components", merge({}, mergedBranch.components), mergedBranch.id);
					i = Math.max(-1, branches.indexOf(mergedBranch) - 1); // recrawl merged branch to finish up crawling whatever was missed by branch merge
				}
				++i;
				if (i >= branches.length) {
					++depth;
					i = 0;
				}

				createRenderNodes();
			}
			else {
				finalize();
			}
		});/* */
		
		for (let depth = 1; depth <= ComponentData[productName].depth; depth++) {
			for (let i = 0; i < branches.length; i++) {
				let branch = branches[i];
				let mergedBranch = crawlBranch(branch, depth);
				if (mergedBranch) {
					// console.log("NEW branch components", merge({}, mergedBranch.components), mergedBranch.id);
					i = Math.min(i, Math.max(-1, branches.indexOf(mergedBranch) - 1)); // recrawl merged branch to finish up crawling whatever was missed by branch merge
				}
			}
		}
		finalize();
		/* */

	})();

	// log resources
	console.log(`%cProducing x${desiredQuantity} ${productName}`, "color: #A493EA; font-size: 20px; font-weight: bold; margin: 10px;");
	console.log("%cCOMPONENTS USED: ", "color: white; font-size: 16px; font-weight: bold; margin: 10px; margin-left: 0px; margin-bottom: 5px;");
	let usedComponents = branches[0].components;
	let numberStyle = "color: #63FFA1; padding: 5px; padding-top: 2px; padding-bottom: 2px; background: #2F245A; border-radius: 2px;";
	let wastedStyle = "color: #FF7A7A; padding: 5px; padding-top: 2px; padding-bottom: 2px; background: #3C1939; border-radius: 2px;";
	let notWastedStyle = "color: #63FFA1; padding: 5px; padding-top: 2px; padding-bottom: 2px; background: #1A3C36; border-radius: 2px;";
	let textStyle = "color: white; background: none;"
	for (let componentName of Object.keys(usedComponents)) {
		let component = usedComponents[componentName];
		if (component.block === 0 || componentName === productName) continue;
		
		let waste = component.produced - component.used;
		let curWasteStyle = waste == 0 ? notWastedStyle : wastedStyle;
		console.log(`${componentName}: %c${component.used}%c used | %c${component.produced}%c produced | %c${Math.ceil(component.used / component.block)}%c factories | %c${waste}%c wasted`, numberStyle, textStyle, numberStyle, textStyle,  numberStyle, textStyle, curWasteStyle, textStyle);
	}

	// Add components to UI
	function setUI() {
		let parent = document.getElementById("componentsList");
		parent.innerHTML = "";
		let keys = Object.keys(usedComponents);
		keys.sort((a, b) => {
			let componentA = ComponentData[a];
			let componentB = ComponentData[b];
			return componentA.depth - componentB.depth;
		});
		for (let componentName of keys) {
			let component = usedComponents[componentName];
			if (component.block === 0 || componentName === productName) continue;
			
			let { used, produced, block } = component;
			let waste = produced - used;
			let factories = Math.ceil(used / block);
			let hasWaste = waste != 0;
			
			let componentElem = createElement("div", {
				class: `component${ hasWaste ? " waste" : "" }`,
				parent: parent,
			});
			createElement("h1", {
				parent: componentElem,
				innerHTML: componentName.toCapital(),
			});
			
			let usedElem = createElement("div", {
				parent: componentElem
			});
			createElement("div", {
				parent: usedElem,
				innerHTML: used,
				class: "number",
			});
			usedElem.innerHTML += " Used";
			
			let producedElem = createElement("div", {
				parent: componentElem
			});
			createElement("div", {
				parent: producedElem,
				innerHTML: produced,
				class: "number",
			});
			producedElem.innerHTML += " Produced";
			
			let factoriesElem = createElement("div", {
				parent: componentElem
			});
			createElement("div", {
				parent: factoriesElem,
				innerHTML: factories,
				class: "number",
			});
			let name = ComponentData[componentName].machine.toCapital();
			if (factories != 1 && name[name.length - 1] === "y") name = name.slice(0, name.length - 1) + "ie";
			factoriesElem.innerHTML += ` ${ name }${ factories != 1 ? "s" : "" }`;
			
			let wasteElem = createElement("div", {
				parent: componentElem
			});
			createElement("div", {
				parent: wasteElem,
				innerHTML: waste,
				class: `number ${ hasWaste ? "waste" : "noWaste" }`,
			});
			wasteElem.innerHTML += " Wasted";
		}
	}
	setUI();

	// Create render nodes
	function viewBranch(branch) {
		let max = branch.bounds.max.sub(new vec(0, 1)); // remove output from bounds
		camera.position.set(max.add(branch.bounds.min).mult(0.5 * blockSize));
		let boundSize = max.sub(branch.bounds.min);
		camera.fov = Math.max(800, Math.max(boundSize.x, boundSize.y) * blockSize * 1 + 200);
		bounds.fov.max = camera.fov;

		let center = max.avg(branch.bounds.min).mult(blockSize);
		let size = max.sub(branch.bounds.min).mult(blockSize);
		console.log(center, size);
		bounds.camera.max.set(center.add(size.mult(0.8)));
		bounds.camera.min.set(center.sub(size.mult(0.8)));
	}
	function createRenderNodes() {
		resetBranches(renderBranches);
		// create a branch for each base node
		for (let node of baseNodes) {
			if (allNodes.includes(node)) {
				let branch = new RenderBranch();
				branch.addNode(node);
				renderBranches.push(branch);
			}
		}

		function crawlBranch(branch, depth) { // crawls branch to depth, returns branch it merged (or null if none)
			let n = 1;
			for (let node of branch.nodes) {
				for (let connection of node.out) {
					let nodeOut = connection.to;
					if (nodeOut.depth === depth) { // expand to this depth
						if (nodeOut.renderGroup && nodeOut.renderGroup !== branch) { // merge this branch onto other
							let branchB = nodeOut.renderGroup;
							let boundsA = branch.bounds;
							let boundsB = branchB.bounds;
							let widthB = boundsB.max.x - boundsB.min.x + 1;

							let shiftDirection = Math.sign((nodeOut.position.x - boundsB.min.x) - widthB / 2) || 1;
							let shiftAmount = 0;
							if (shiftDirection < 0) {
								shiftAmount = boundsB.min.x - boundsA.max.x - 1;
							}
							else {
								shiftAmount = boundsB.max.x - boundsA.min.x + 1;
							}
							branch.shift(new vec(shiftAmount, 0)); // shift branch onto edge of branchB

							let i = 0;
							let slotDirection = new vec(-shiftDirection, 0); // shift branch in opposite direction to remove gaps
							while (branch.canShift(slotDirection, branchB) && i++ < 1000) {
								branch.shift(slotDirection);
							}

							branchB.addBranch(branch);
							return branchB;
						}
						else if (!nodeOut.renderGroup) { // add node to this branch
							nodeOut.position.y = depth;

							// mean
							nodeOut.position.x = Math.ceil(nodeOut.in.reduce((total, inputConnection) => {
								return total + inputConnection.from.position.x;
							}, 0) / (nodeOut.in.length || 1));

							// weighted mean (not working)
							// let totalDepth = 1;
							// console.log("-----");
							// nodeOut.position.x = nodeOut.in.reduce((total, inputConnection) => {
							// 	let weight = (inputConnection.from.depth + 1) ** 0.5;
							// 	totalDepth += weight;
							// 	console.log(inputConnection.from.position.x, weight);
							// 	return total + inputConnection.from.position.x * weight;
							// }, 0);
							// node.position.x = Math.round(node.position.x / totalDepth);
							// console.log(node.position.x, totalDepth);


							// median
							let nodeOutInputs = nodeOut.in.map(inputConnection => inputConnection.from.position.x).sort((a, b) => a - b);
							nodeOut.position.x = Math.ceil((nodeOutInputs[Math.max(0, Math.floor(nodeOutInputs.length / 2 - 1))] + nodeOutInputs[Math.ceil(nodeOutInputs.length / 2 - 1)]) / 2); // medium with avg
							// nodeOut.position.x = nodeOutInputs[Math.floor(nodeOutInputs.length / 2)]; // median without avg

							let posA = branch.getOpenPosition(new vec(nodeOut.position), new vec(-1, 0));
							let posB = branch.getOpenPosition(new vec(nodeOut.position), new vec( 1, 0));
							if (Math.abs(posA.x - nodeOut.position.x) <= Math.abs(posB.x - nodeOut.position.x)) {
								nodeOut.position.x = posA.x;
							}
							else {
								nodeOut.position.x = posB.x;
							}
							branch.addNode(nodeOut);
							++n;
						}
					}
				}
			}
			return null;
		}

		/*
		let depth = 1;
		let i = 0;
		window.addEventListener("mousedown", () => {
			if (depth <= ComponentData[productName].depth + 1) {
				let branch = renderBranches[i];
				let mergedBranch = crawlBranch(branch, depth);
				if (mergedBranch) {
					renderBranches.delete(branch);
					i--; // recrawl merged branch to finish up crawling whatever was missed by branch merge
				}
				++i;
				if (i >= renderBranches.length) {
					++depth;
					i = 0;
				}

				viewBranch(renderBranches[0]);
			}
		});/* */
		
		allRenderBranches = [...renderBranches];
		for (let depth = 0; depth <= ComponentData[productName].depth + 1; depth++) {
			for (let i = 0; i < renderBranches.length; i++) {
				let branch = renderBranches[i];
				let mergedBranch = crawlBranch(branch, depth);
				if (mergedBranch) {
					renderBranches.delete(branch);
					i = -1; // recrawl merged branch to finish up crawling whatever was missed by branch merge
				}
			}
		}/* */
		viewBranch(renderBranches[0]);
	}

	// Reset pipes
	Pipeline.all.length = 0;
	Pipeline.initGrid(allNodes);
	Pipeline.scale = blockSize;

	// Create pipes
	for (let node of allNodes) {
		for (let connection of node.out) {
			if (connection.from && connection.to && connection.to.type !== "output") {
				new Pipeline(connection.from, connection.to);
			}
		}
	}
	Pipeline.shiftAll();

	function getNodeHovering() {
		let mousePosition = getMouseCanvas();
		for (let node of allNodes) {
			let position = node.position.mult(blockSize);
			let size = new vec(100, 70);
			let distance = mousePosition.sub(position).abs2().sub(size.mult(0.5));

			if (distance.x <= 0 && distance.y <= 0) {
				return node;
			}
		}
	}
	function openNodeInfo(node) {
		console.log("opened", node);
	}

	// Render nodes
	Render.on("beforeRender", () => {
		let nodeHovering = getNodeHovering();
		
		// render pipes
		ctx.lineWidth = 4;
		ctx.strokeStyle = "#73747880";
		ctx.globalCompositeOperation = "screen";
		let highlightedPipes = [];
		for (let pipe of Pipeline.all) {
			let highlight = nodeHovering === pipe.from || nodeHovering === pipe.to;
			if (highlight) {
				highlightedPipes.push(pipe);
				continue;
			}
			pipe.render();
		}
		ctx.globalCompositeOperation = "source-over";

		// Render highlighted pipes above other pipes
		ctx.strokeStyle = "#8FFFAEd0";
		for (let pipe of highlightedPipes) {
			pipe.render();
		}

		// render nodes
		let groupShiftAmount = 0;
		let minId = Math.min(...renderBranches.map(v => v.id));
		for (let node of allNodes) {
			// if (!node.group) continue;
			if (node.type === "output") continue;
			let position = node.position.mult(blockSize);
			let groupShift = new vec(((node.renderGroup?.id || 0) - minId) * groupShiftAmount, 0);
			position.add2(groupShift);

			
			// render connections
			/*
			ctx.beginPath();
			ctx.strokeStyle = "#73747880";
			ctx.lineWidth = 3;
			for (let connection of node.out) {
				if (connection.from && connection.to) {
					let from = connection.from.position.mult(blockSize).add2(groupShift);
					let to = connection.to.position.mult(blockSize).add2(groupShift);
	
					let dir = to.sub(from).normalize().mult(25);
					ctx.moveTo(from.x + dir.x, from.y + dir.y);
					for (let point of connection.interPoints) {
						point = point.mult(blockSize);
						ctx.lineTo(point.x, point.y);
						ctx.arc(point.x, point.y, 3, 0, Math.PI*2);
						ctx.moveTo(point.x, point.y);
					}
					ctx.lineTo(to.x - dir.x, to.y - dir.y);
					Render.arrow(to.sub(dir), dir.normalize(), 5);
				}
			}
			ctx.stroke();/**/

			// render node
			ctx.beginPath();
			let size = new vec(100, 70);
			ctx.fillStyle = "#BE7040"; // E6905Bbf
			if (mouse.clickingNode === node) {
				ctx.fillStyle = "#A76339";
				size.mult2(0.95);
			}
			Render.roundedRect(size.x, size.y, position, 10);
			// ctx.arc(position.x, position.y, 20, 0, Math.PI*2);
			ctx.fill();

			// Render text
			ctx.beginPath();
			let fontSize = 16;
			let centerY = position.y + 6;
			let lineSize = 17;
			
			// - get lines of text
			let text = node.type.toTitle().split(" ");
			let characters = 0;
			let maxLineCharacters = 4;
			for (let i = 0; i < text.length; i++) {
				let piece = text[i];
				characters += piece.length;
				if (characters > maxLineCharacters) {
					characters = 0;
					text[i] += "\n";
				}
			}
			text = text.join(" ");
			let lines = text.split("\n").filter(v => v != "\n" && v);
			lines.unshift(node.outputResources[node.type]);

			// - render lines
			ctx.font = `700 ${fontSize}px Noto Sans Display`;
			ctx.fillStyle = "#F0F0EF";
			ctx.textAlign = "center";
			for (let i = 0; i < lines.length; i++) {
				ctx.fillText(lines[i], position.x, centerY - lineSize * (lines.length*0.5 - i) + 10);
			}
			// ctx.font = `700 ${fontSize}px Poppins`;
			// ctx.fillText(node.outputResources[node.type], position.x, centerY + lineSize);
		}

		// branch bounds render
		/*
		for (let branch of allRenderBranches) {
			let groupShift = new vec(branch.id * groupShiftAmount, 0);
			ctx.beginPath();
			ctx.strokeStyle = "#ff000060";
			ctx.lineWidth = 6;
			let bounds = branch.bounds;
			let size = bounds.max.sub(bounds.min).add(1).mult(blockSize);
			let center = bounds.min.avg(bounds.max).mult(blockSize).add(groupShift);
			Render.roundedRect(size.x, size.y, center, 40);
			ctx.stroke();
		}/**/
	});
}

