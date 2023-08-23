"use strict";
class SplitterNode { // actually does both inputs and outputs
	constructor(quantity, inputs = [], outputs = []) {
		this.inputs = inputs;
		this.outputs = outputs;
		this.quantity = quantity;
	}
}
function calculateSplitters(inputQuantity, outputQuantites) {
	let gcd = Math.gcd(inputQuantity, ...outputQuantites);
	let maxSplits = inputQuantity / gcd;
	let primeFactors = Math.primeFactors(maxSplits);
	console.log(primeFactors);
	if (primeFactors.filter(v => !(v === 2 || v === 3)).length > 0) {
		// not possible to split it to this value
		return null;
	}
	
	let source = new SplitterNode(inputQuantity / gcd);
	let outputs = [];
	for (let outputQuantity of outputQuantites) {
		let quantity = outputQuantity / gcd;
		let node = new SplitterNode(quantity);
		node.remainingInput = quantity;
		outputs.push(node);
	}
	let hangingNodes = []; // nodes with no output that need one
	function split(inputNode, i = 0) {
		for (let outputNode of outputs) {
			let givenNodes = Math.floor(outputNode.remainingInput / inputNode.quantity);
			if (givenNodes > 0) {
				outputNode.inputs.push(inputNode);
				outputNode.remainingInput -= inputNode.quantity;
				return;
			}
		}
		let splitAmount = primeFactors[i];
		for (let j = 0; j < splitAmount; j++) {
			let node = new SplitterNode(inputNode.quantity / splitAmount, [inputNode]);
			inputNode.outputs.push(node);
			if (i + 1 >= primeFactors.length) hangingNodes.push(node);
			if (i < primeFactors.length) {
				split(node, i + 1);
			}
		}
	}
	split(source);
	
	for (let node of hangingNodes) {
		for (let outputNode of outputs) { 
			let givenNodes = Math.floor(outputNode.remainingInput / node.quantity);
			if (givenNodes > 0) {
				outputNode.inputs.push(node);
				outputNode.remainingInput -= node.quantity;
				break;
			}
		}
	}
	console.log(source, outputs);
}