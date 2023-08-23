"use strict";
// todo: expand data to include multiple outputs
var ComponentData = {
	// output
	"output": {
		machine: "output",
		quantity: 0,
		inputs: {
		},
	},

	// 0 base materials
	"iron ore": {
		machine: "miner",
		quantity: 60,
		inputs: {
		},
	},
	"limestone": {
		machine: "miner",
		quantity: 60,
		inputs: {
		},
	},
	"coal": {
		machine: "miner",
		quantity: 60,
		inputs: {
		},
	},
	"sulfur": {
		machine: "miner",
		quantity: 60,
		inputs: {
		},
	},
	"water": {
		machine: "water extractor",
		quantity: 60,
		inputs: {
		},
	},

	// 1
	"iron ingot": {
		machine: "smelter",
		quantity: 30,
		inputs: {
			"iron ore": 30,
		},
	},
	"concrete": {
		machine: "constructor",
		quantity: 15,
		inputs: {
			"limestone": 45,
		},
	},
	"steel ingot": {
		machine: "foundry",
		quantity: 45,
		inputs: {
			"iron ore": 45,
			"coal": 45,
		},
	},
	"black powder": {
		machine: "assembler",
		quantity: 30,
		inputs: {
			"sulfur": 15,
			"coal": 15,
		},
	},
	"sulfuric acid": {
		machine: "refinery",
		quantity: 50,
		inputs: {
			"water": 50,
			"iron ore": 50,
		},
	},

	// 2
	"iron plate": {
		machine: "constructor",
		quantity: 20,
		inputs: {
			"iron ingot": 30,
		},
	},
	"iron rod": {
		machine: "constructor",
		quantity: 15,
		inputs: {
			"iron ingot": 15,
		},
	},
	"screw": {
		machine: "constructor",
		quantity: 40,
		inputs: {
			"iron rod": 10,
		},
	},
	"steel beam": {
		machine: "constructor",
		quantity: 15,
		inputs: {
			"steel ingot": 60,
		},
	},

	// 3
	"reinforced iron plate": {
		machine: "constructor",
		quantity: 5,
		inputs: {
			"iron plate": 30,
			"screw": 60,
		},
	},
	"rotor": {
		machine: "assembler",
		quantity: 4,
		inputs: {
			"iron rod": 20,
			"screw": 100,
		},
	},
	"encased industrial beam": {
		machine: "constructor",
		quantity: 6,
		inputs: {
			"steel beam": 24,
			"concrete": 30,
		},
	},

	// 4
	"modular frame": {
		machine: "assembler",
		quantity: 2,
		inputs: {
			"reinforced iron plate": 3,
			"iron rod": 12,
		},
	},

	// 5 
	"versatile framework": {
		machine: "assembler",
		quantity: 5,
		inputs: {
			"modular frame": 2.5,
			"steel beam": 30,
		},
	},
}


function getComponentDepth(type) {
	let component = ComponentData[type];
	if (component.depth) return component.depth;
	let inputTypes = Object.keys(component.inputs);
	let depth = 0;
	for (let type of inputTypes) {
		depth = Math.max(depth, getComponentDepth(type) + 1);
	}

	component.depth = depth;
	return depth;
}
function initAllComponentDepths() {
	let allTypes = Object.keys(ComponentData);
	for (let type of allTypes) {
		getComponentDepth(type);
	}
}
initAllComponentDepths();

function selectComponent(componentName) {
	document.getElementById("componentModal").classList.remove("active");
	document.getElementById("sideMenu").classList.remove("componentModal");

	let desiredComponentElem = document.getElementById("desiredComponent");
	desiredComponentElem.value = componentName;
	desiredComponentElem.innerHTML = componentName.toCapital();
	document.getElementById("desiredQuantity").value = ComponentData[componentName].quantity;
}
function initComponentUI() {
	/*
	<div class="tier">
		<h1>Tier 1</h1>
		<div class="component">Iron rod</div>
		<div class="component">Iron plate</div>
		<div class="component">Copper plate</div>
		<div class="component">Steel ingot</div>
	</div>
	*/
	let parent = document.getElementById("componentModalContent");
	let allTypes = Object.keys(ComponentData);
	let tiers = [];
	for (let name of allTypes) {
		let component = ComponentData[name];
		let { depth } = component;
		if (depth === 0) continue;

		if (!tiers[depth]) {
			let tierElem = createElement("div", {
				class: "tier",
				parent: parent,
			});
			let header = createElement("h1", {
				innerHTML: `Tier ${ depth }`,
				parent: tierElem,
			});
			tiers[depth] = tierElem;
		}

		let elem = createElement("div", {
			class: "component",
			innerHTML: name.toCapital(),
			parent: tiers[depth],
		});
		elem.onclick = function() {
			selectComponent(name);
		}
	}

	createElement("div", {
		style: {
			height: "50px",
		},
		parent: parent,
	});
}
initComponentUI();
