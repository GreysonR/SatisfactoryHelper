"use strict";
// inputs for moving camera

var mouse = {
	position: new vec(0, 0),
	mouse0: false,
	clickingNode: null,
}
var bounds = {
	canv: {
		min: new vec(20, 20),
	},
	fov: {
		min: 300,
		max: 1000,
	},
	camera: {
		min: new vec(-800, -800),
		max: new vec(500, 1000),
	},
};
(function getCanvBounds() {
	let boundingRect = canv.getBoundingClientRect();
	bounds.canv.min.x = boundingRect.left;
	bounds.canv.min.y = boundingRect.top;
})();
window.addEventListener("mousemove", event => {
	let lastPosition = getMouseCanvas();
	mouse.position.set(new vec(event.clientX, event.clientY));

	if (mouse.mouse0) {
		let curPosition = getMouseCanvas();
		let diff = lastPosition.sub(curPosition);
		camera.position.add2(diff);
	}
});
Render.on("beforeSave", () => { // restrict camera to bounds
	let delta = new vec();
	if (camera.bounds.min.x < bounds.camera.min.x || camera.bounds.min.y < bounds.camera.min.y) { // not confusing at all
		delta.add2(camera.bounds.min.max(bounds.camera.min).sub(camera.bounds.min).mult(Performance.delta * 0.01));
	}
	if (camera.bounds.max.x > bounds.camera.max.x || camera.bounds.max.y > bounds.camera.max.y) {
		delta.add2(camera.bounds.max.min(bounds.camera.max).sub(camera.bounds.max).mult(Performance.delta * 0.01));
	}
	delta = delta.abs().pow(2).mult(delta.sign()).mult(0.1);
	camera.position.add2(delta);

	if (isNaN(camera.position.x) || isNaN(camera.position.y)) {
		camera.position.set(bounds.camera.max.avg(bounds.camera.min));
	}
	if (isNaN(camera.fov)) {
		camera.fov = camera.fov.max;
	}
});
window.addEventListener("mousedown", event => {
	if (event.button === 0 && event.target.id === "canvWrapper") {
		mouse.mouse0 = true;
	}
});
window.addEventListener("mouseup", event => {
	if (event.button === 0) {
		mouse.mouse0 = false;
	}
});

function getMouseCanvas() {
	let positionRelative = mouse.position.sub(bounds.canv.min);
	let positionCanv = camera.screenPtToGame(positionRelative);
	return positionCanv;
}

window.addEventListener("wheel", event => {
	if (event.target.id === "canvWrapper") {
		let { min: minFov, max: maxFov } = bounds.fov;
		let delta = event.deltaY;
		let dFov = (camera.fov / 500) * 0.4 * delta;
		let nextFov = camera.fov + dFov;
		nextFov = Math.max(minFov, Math.min(maxFov, nextFov));
		let mousePosRelative = camera.position.sub(getMouseCanvas());
		let fovMultiplier = (nextFov) / camera.fov;
		camera.fov = nextFov;
		camera.position.add2(mousePosRelative.mult((fovMultiplier - 1)));
	}
});
