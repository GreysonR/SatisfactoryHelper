"use strict";
var Performance = {
	lastUpdate: performance.now(),
	fps: 60,
	delta: 16.67,
	frame: 0,
	aliveTime: 0,

	update: function() {
		let curTime = performance.now();
		if (curTime - Performance.lastUpdate === 0) {
			return;
		}

		Performance.delta = Math.min(200, curTime - Performance.lastUpdate);
		Performance.fps = 1000 / Performance.delta;
		Performance.lastUpdate = curTime;
		Performance.aliveTime += Performance.delta;
		Performance.frame++;
	}
};