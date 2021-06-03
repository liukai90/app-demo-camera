/*
 * Copyright (c) 2019 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: mediawrap.js media client wrap module.
 *
 * Author: Cheng.yongbin
 *
 */

/*
 * createMediaClient(ClientType, origin, canvas, opts, shakeHandle)
 */
function createMediaClient(ClientType, origin, canvas, opts, shakeHandle) {
	/*
	 * ClientWrap.
	 */
	class ClientWrap extends ClientType {
		/*
		 * constructor(origin, canvas, opts, shakeHandle)
		 * opts:
		 *  timeout {Integer}
 		 *  log {Function}
 		 *  info {Function}
 		 *  error {Function}
		  * path {String}
		 *  token {String}
		 *  srand {String}
		 *  range {Object}
		 * 		videow {Number}
		 * 		videoh {Number}
		 * 		canvaw {Number}
		 * 		canvah {Number}
		 * shakeHandle {Function}
 		 *  self {MediaClient}
 		 *  id {Number}
		 */
		constructor(origin, canvas, opts, shakeHandle) {
			super(origin, shakeHandle, opts);

			this.canvas = canvas;
			this.ctx = this.canvas.getContext("2d");
			var range = opts.range ? opts.range : {};
			this.videow = range.videow ? range.videow : 1280;
			this.videoh = range.videoh ? range.videoh : 720;
			this.canvaw = range.canvaw ? range.canvaw : 1280;
			this.canvah = range.canvah ? range.canvah : 720;
			this.rw = 1.0;
			this.rh = 1.0;
			this.fullScreen = false;
			this.setCanvaSize(opts.canvaw, opts.canvah);
			this.clean();

			this.on('data', this.onData.bind(this));
		}

		/*
		 * _uninit
		 */
		_uninit() {
			this.canvas = null;
			this.ctx = null;
			super._uninit();
		}

		/*
		 * setVideoSize(w, h)
		 */
		setVideoSize(w, h) {
			this.videow = typeof w === 'number' ? w : this.videow;
			this.videoh = typeof h === 'number' ? h : this.videoh;
			this.rw = this.canvaw / this.videow;
			this.rh = this.canvah / this.videoh;
		}

		/*
		 * setCanvaSize(w, h)
		 */
		setCanvaSize(w, h) {
			this.canvaw = typeof w === 'number' ? w : this.canvaw;
			this.canvah = typeof h === 'number' ? h : this.canvah;
			this.rw = w / this.videow;
			this.rh = h / this.videoh;
			this.fullScreen = false;
		}

		/*
		 * setFullScreen(w, h)
		 */
		setFullScreen(w, h) {
			this.setCanvaSize(h, w);
			this.fullScreen = true;
		}

		/*
		 * clean()
		 */
		clean() {
			var ctx = this.ctx;
			if (this.fullScreen) {
				ctx.clearRect(0, 0, this.canvah, this.canvaw);
			} else {
				ctx.clearRect(0, 0, this.canvaw, this.canvah);
			}
		}

		/*
		 * draw(layouts)
		 */
		draw(layouts) {
			if (!Array.isArray(layouts)) {
				return;
			}
			this.clean();
			var count = layouts.length;
			var ctx = this.ctx;
			for (var i = 0; i < count; i++) {
				var layout = layouts[i];
				var x0 = layout.x0 * this.rw;
				var y0 = layout.y0 * this.rh;
				var w = (layout.x1 - layout.x0) * this.rw;
				var h = (layout.y1 - layout.y0) * this.rh;
				ctx.strokeStyle = (layout.id === 0 ? '#00FF00' : '#FF0000');
				if (this.fullScreen) {
					var x = this.canvah - y0 - h;
					var y = x0;
					ctx.strokeRect(x, y, h, w);
				} else {
					ctx.strokeRect(x0, y0, w, h);
				}
			}
		}

		/*
		 * onData(self, opts, data)
		 */
		onData(self, opts, data) {
			var type = opts && opts.type ? opts.type : null;
			if (type === 'media') {
				this.info('media info:' + data);
				this.setVideoSize(data.width, data.height);

			} else if (type === 'face') {
				this.log('face info: ' + data);
				this.draw(data);

			} else {
				this.errInfo('Data invalid.');
			}
		}
	}

	return new ClientWrap(origin, canvas, opts, shakeHandle);
}
