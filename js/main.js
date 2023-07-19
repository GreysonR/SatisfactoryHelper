"use strict";

var canvWrapper = document.getElementById("canvWrapper");
Render.pixelRatio = devicePixelRatio * 2;
function resize() {
	Render.setSize(canvWrapper.clientWidth, canvWrapper.clientHeight);
	window.scrollTo(0, 0);
}
window.addEventListener("resize", resize);
setTimeout(resize, 0);

var camera = Render.camera;

function main() {
	Render();
	requestAnimationFrame(main);
}
window.addEventListener("load", main);
