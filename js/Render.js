"use strict";
var canvas = document.getElementById("canv");
var ctx = canvas.getContext("2d");

let Render = function() {
	const { camera } = Render;
	const { position:cameraPosition, fov:FoV } = camera;
	const boundSize = camera.boundSize;
	const canvWidth = canvas.width;
	const canvHeight = canvas.height;

	camera.translation = { x: -cameraPosition.x * boundSize/FoV + canvWidth/2, y: -cameraPosition.y * boundSize/FoV + canvHeight/2 };
	camera.scale = boundSize / FoV;
	camera.bounds.min.set({ x: -camera.translation.x / camera.scale, y: -camera.translation.y / camera.scale });
	camera.bounds.max.set({ x: (canvWidth - camera.translation.x) / camera.scale, y: (canvHeight - camera.translation.y) / camera.scale });

	ctx.clearRect(0, 0, canvWidth, canvHeight);
	
	ctx.fillStyle = "#0A1C29";
	ctx.beginPath();
	ctx.fillRect(0, 0, canvWidth, canvHeight);

	Render.trigger("beforeSave");
	ctx.save();
	ctx.translate(camera.translation.x, camera.translation.y);
	ctx.scale(camera.scale, camera.scale);
	Render.trigger("beforeRender");

	Render.trigger("afterRender");
	ctx.restore();
	Render.trigger("afterRestore");
}
Render.camera = {
	position: new vec(0, 0),
	fov: 2000,
	translation: new vec(0, 0),
	scale: 1,
	boundSize: 1,
	bounds: {
		min: new vec({ x: 0, y: 0 }),
		max: new vec({ x: 2000, y: 2000 }),
	},
	screenPtToGame: function(point) {
		return new vec((point.x * Render.pixelRatio - camera.translation.x) / camera.scale, (point.y * Render.pixelRatio - camera.translation.y) / camera.scale);
	},
	gamePtToScreen: function(point) {
		return new vec((point.x * camera.scale + camera.translation.x) / Render.pixelRatio, (point.y * camera.scale + camera.translation.y) / Render.pixelRatio);
	},
}
Render.pixelRatio = 1;
Render.setPixelRatio = function(ratio) {
	let { canvas, ctx } = ter;
	let prevRatio = Render.pixelRatio;

	Render.pixelRatio = ratio;
	ctx.scale(prevRatio / ratio, prevRatio / ratio);
	ter.setSize(canvas.width / prevRatio, canvas.height / prevRatio);
}
Render.setSize = function(width, height) {
	let pixelRatio = Render.pixelRatio;
	canvas.width =  width  * pixelRatio;
	canvas.height = height * pixelRatio;
	canvas.style.transformOrigin = "top left";
	canvas.style.transform = `scale(${ 1 / pixelRatio })`;
	Render.camera.boundSize = (Math.min(width, height) || 1) * pixelRatio; // Math.sqrt(width * height) || 1; // Math.sqrt(width**2 + height**2) / 2;
}
Render.vertices = function(vertices) {
	ctx.moveTo(vertices[0].x, vertices[0].y);

	for (let j = 1; j < vertices.length; j++) {
		let vertice = vertices[j];
		ctx.lineTo(vertice.x, vertice.y);
	}

	ctx.closePath();
}
Render.roundedRect = function(width, height, position, round) {
	Render.roundedPolygon([
		position.add(new vec(-width/2, -height/2)),
		position.add(new vec( width/2, -height/2)),
		position.add(new vec( width/2,  height/2)),
		position.add(new vec(-width/2,  height/2)),
	], round);
}
Render.roundedPolygon = function(vertices, round) {
	if (vertices.length < 3) {
		console.warn("Render.roundedPolygon needs at least 3 vertices", vertices);
		return;
	}
	function getPoints(i) {
		let curPt = vertices[i];
		let lastPt = vertices[(vertices.length + i - 1) % vertices.length];
		let nextPt = vertices[(i + 1) % vertices.length];

		let lastDiff = lastPt.sub(curPt);
		let nextDiff = curPt.sub(nextPt);
		let lastLen = lastDiff.length;
		let nextLen = nextDiff.length;

		let curRound = Math.min(lastLen / 2, nextLen / 2, round);
		let cp = curPt;
		let pt1 = cp.add(lastDiff.normalize().mult(curRound));
		let pt2 = cp.sub(nextDiff.normalize().mult(curRound));

		return [pt1, cp, pt2];
	}

	let start = getPoints(0)
	ctx.moveTo(start[0].x, start[0].y);
	ctx.quadraticCurveTo(start[1].x, start[1].y, start[2].x, start[2].y);

	for (let i = 1; i < vertices.length; i++) {
		let cur = getPoints(i);
		ctx.lineTo(cur[0].x, cur[0].y);
		ctx.quadraticCurveTo(cur[1].x, cur[1].y, cur[2].x, cur[2].y);
	}

	ctx.closePath();
}
Render.arrow = function(position, direction, size = 10) {
	let endPos = new vec(position.x + direction.x, position.y + direction.y);
	let sideA = direction.rotate(Math.PI * 3/4).normalize2().mult(size);
	let sideB = sideA.reflect(direction.normalize());

	ctx.moveTo(position.x, position.y);
	ctx.lineTo(endPos.x, endPos.y);
	ctx.lineTo(endPos.x + sideA.x, endPos.y + sideA.y);
	ctx.moveTo(endPos.x, endPos.y);
	ctx.lineTo(endPos.x + sideB.x, endPos.y + sideB.y);
}
// - Events
Render.events = {
	beforeRender: [],
	afterRender: [],
	afterRestore: [],
	beforeSave: [],
}
Render.on = function(event, callback) {
	if (event.includes("beforeLayer") && !Render.events[event]) {
		Render.events[event] = [];
	}
	if (event.includes("afterLayer") && !Render.events[event]) {
		Render.events[event] = [];
	}

	if (Render.events[event]) {
		Render.events[event].push(callback);
	}
	else {
		console.warn(event + " is not a valid event");
	}
}
Render.off = function(event, callback) {
	event = Render.events[event];
	if (event.includes(callback)) {
		event.splice(event.indexOf(callback), 1);
	}
}
Render.trigger = function(event) {
	// Trigger each event
	if (Render.events[event]) {
		Render.events[event].forEach(callback => {
			callback();
		});
	}
}
