/*
 * Copyright (c) 2019 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: media_api.js media api module.
 *
 * Author: Cheng.yongbin
 *
 */

var URL = require('url');
var WebMedia = require('webmedia');
var onvif = require('@edgeros/jsre-onvif');
var CameraSource = require('@edgeros/jsre-camera-src');
const {Media, Manager} = require('@edgeros/jsre-medias');
var checkPerm = require('./util').checkPerm;

/* 
 * Register media source. 
 */
const sourceName = 'camera-flv';
WebMedia.registerSource(sourceName, CameraSource);

/*
 * createSrcHandle(mediaOpts)
 * mediaOpts:
 * 	faceEnable {Boolean} default: true
 * 	fps {Integer} default: 1.5
 */
function createSrcHandle(mediaOpts) {
	var faceEnable = typeof mediaOpts.faceEnable === 'boolean' ? mediaOpts.faceEnable : true;
	var fps = typeof mediaOpts.fps === 'boolean' ? mediaOpts.fps : 1.5;

	return function(opts) {
		return {
			source: sourceName,
			inOpts: {
				host: opts.host,
				port: opts.port,
				path: opts.path,
				user: opts.user,
				pass: opts.pass
			},
			outOpts: {
				faceDetecOpts: {
					enable: faceEnable,
					fps: fps
				}
			}
		}
	}
}

/*
 * AiMedia.
 */
class AiMedia extends Media {
	constructor() {
		super(...arguments);
		this._aiVisitors = 0;
		this._autoMove = false;

		this.on('start', (self) => {
			this.source.on('camMove', (rx, ry) => {
				this.camMove(rx, ry, () => {});
			});
	
			this.source.on('camStop', () => {
				this.camStop(() => {});
			});
	
			this.on('open', onCliOpen);
			this.on('close', onCliClose);
		});
	}

	/*
	 * Get auto move.
	 */
	get autoMove() {
		return this._autoMove;
	}

	/*
	 * Set auto move.
	 */
	set autoMove(auto) {
		if (this.enableMove) {
			this._autoMove = auto;
			this.source.autoMove = auto;
		}
	}

	/*
	 * openAI(enable)
	 */
	openAI(enable) {
		if (typeof enable !== 'boolean') {
			throw new TypeError('Argument error.');
		}
		if (this.ser) {
			this.source.openAI(enable);
		}
	}
}

/*
 * onCliOpen(media, client)
 */
function onCliOpen(media, client) {
	console.info(`Client ${client.id} open.`);
	client._aiOpened = false;
	var self = media;

	/*
	 * call: open
	 * reply: isOpen
	 */
	client.on('camera-ai', async (client, open, cb) => {
		try {
			await checkPerm(['ainn']);
		} catch (err) {
			return cb(client._aiOpened);
		}

		if (open && !client._aiOpened) {
			client._aiOpened = true;
			self._aiVisitors++;
			if (self._aiVisitors > 0) {
				self.openAI(true);
			}
		} else if (!open && client._aiOpened) {
			client._aiOpened = false;
			self._aiVisitors--;
			if (self._aiVisitors === 0) {
				self.openAI(false);
			}
		}
		cb(open);
	});

	/*
	 * call: autoMove
	 * reply: {result, msg, autoMode}
	 */
	client.on('camera-mode', (client, autoMove, cb) => {
		console.log('Recv camera-mode message.');
		if (!self.enableMove) {
			return cb({ result: false, msg: 'Cam disenable move.' });
		}
		if (self.camLock) {
			return cb({ result: false, msg: 'Cam lock.' });
		}
		self.camLock = true;
		if (self.autoMove !== autoMove) {
			self.autoMove = autoMove;
			self.ser.sendEvent('camera-sync', autoMove); /* Sync all clients. */
		}
		cb({ result: true, msg: 'ok', autoMode: autoMove });
		self.camLock = false;
	});

	/*
	 * reply: {result, msg}
	 */
	client.on('camera-home', (client, cb) => {
		console.log('Recv camera-home message.');
		if (self.autoMove) {
			return cb({ result: false, msg: 'Camera auto move.' });
		}
		self.camHome((err) => {
			if (err) {
				cb({ result: false, msg: err.message });
			} else {
				cb({ result: true, msg: 'ok' });
			}
		});
	});

	/*
	 * call: {x, y}
	 * reply: {result, msg}
	 */
	client.on('camera-move', (client, data, cb) => {
		if (self.autoMove) {
			cb({ result: false, msg: 'Camera auto move.' });
			return;
		}
		self.camMove(data.x, data.y, (err) => {
			if (err) {
				cb({ result: false, msg: err.message });
			} else {
				cb({ result: true, msg: 'ok' });
			}
		});
	});

	/*
	 * reply: {result, msg}
	 */
	client.on('camera-stop', (client, cb) => {
		if (self.autoMove) {
			cb({ result: false, msg: 'Camera auto move.' });
			return;
		}
		self.camStop((err) => {
			if (err) {
				cb({ result: false, msg: err.message });
			} else {
				cb({ result: true, msg: 'ok' });
			}
		});
	});
}

/*
 * onCliClose(media, client)
 */
function onCliClose(media, client) {
	console.info(`Client ${client.id} close.`);
	var self = media;
	if (client._aiOpened) {
		self._aiVisitors--;
		if (self._aiVisitors === 0) {
			self.openAI(false);
		}
	}
}

/*
 * MediaApi.
 */
class MediaApi {
	/*
	 * constructor(app, opts)
	 * opts {Object}
	 * 	nets {Object}
	 * 	[mediaTimeout] {Integer}
	 * 	[searchCycle] {Integer}
	 * 	[faceEnable] {Boolean}
	 * 	[fps] {Integer}
	 */
	constructor(app, opts) {
		console.info('MultMedia create');
		opts = typeof opts === 'object' ? opts : {};
		this.mediaMgr = new Manager(app, AiMedia, opts, createSrcHandle(opts));
	}

	/*
	 * getMediaList()
	 */
	getMediaList() {
		var mediaMgr = this.mediaMgr;
		var devs = {};
		mediaMgr.iterDev((key, dev) => {
			devs[key] = {
				devId: key,
				alias: `${dev.hostname}:${dev.port}${dev.path}`,
				report: dev.urn,
				status: false
			}
		});
		mediaMgr.iterCam((key, cam) => {
			devs[key] = {
				devId: key,
				alias: `${cam.hostname}:${cam.port}${cam.path}`,
				report: cam.urn,
				status: false
			}
		});
		mediaMgr.iterMedia((key, media) => {
			devs[key] = {
				devId: media.key,
				alias: media.alias,
				report: media.sid,
				status: true
			}
		});

		var infos = [];
		for (var key in devs) {
			infos.push(devs[key]);
		}
		return infos;
	}

	/*
	 * fetchMedia(url, cb)
	 */
	fetchMedia(url, cb) {
		try {
			var parts = URL.parse(url);
			if (typeof parts.auth === 'string') {
				var fields = parts.auth.split(':');
				parts.user = fields[0];
				parts.pass = fields[1];
			}
		} catch(e) {
			cb(e);
		}
		if (!parts) {
			cb(new Error('Url invalid.'));
		}
		var mediaMgr = this.mediaMgr;
		var key = Manager.key(parts);
		var media = mediaMgr.findMedia(key);
		if (media) {
			cb(media);
		} else {
			mediaMgr.createMedia(key, parts, cb);
		}
	}

	/*
	 * selectMedia(devId, cb)
	 */
	selectMedia(devId, cb) {
		var mediaMgr = this.mediaMgr;
		var media = mediaMgr.findMedia(devId);
		if (media) { /* Media already conect. */
			return cb(media);
		}

		var cam = mediaMgr.findCam(devId);
		if (cam) { /* Media need connect. */
			var urlParts = mediaMgr.getCamUrl(cam);
			var parts = {
				user: urlParts.user || cam.username,
				pass: urlParts.pass || cam.password,
				hostname: urlParts.hostname,
				port: urlParts.port || 554,
				path: urlParts.path || '/'
			}
			return mediaMgr.createMedia(devId, parts, (media) => {
				if (media instanceof Error) {
					cb();
				} else {
					cb(media);
				}
			});
		}

		if (mediaMgr.findDev(devId)) { /* Device invalid, try name/pwd to get media uri. */
			cb();
		} else {
			var err = new Error('Device invalid.');
			err.code = 'invalid';
			cb(err);
		}
	}

	/*
	 * loginMedia(info, cb)
	 */
	loginMedia(info, cb) {
		var mediaMgr = this.mediaMgr;
		var devId = info.devId;
		var cam = mediaMgr.findCam(devId);
		var urlParts = mediaMgr.getCamUrl(cam);
		if (urlParts) {
			var parts = {
				user: info.username,
				pass: info.password,
				hostname: urlParts.hostname,
				port: urlParts.port || 554,
				path: urlParts.path || '/'
			}
			return mediaMgr.createMedia(devId, parts, cb);
		}

		var dev = mediaMgr.findDev(devId);
		if (dev) {
			dev.username = info.username;
			dev.password = info.password;
			var cam = new onvif.Cam(dev);
			cam.on('connect', (err) => {
				if (err) {
					console.warn(`Camera(${cam.urn}) connection fail:`, err);
					cb(err);
					return;
				}
				cam.getStreamUri({protocol:'RTSP'}, (err, stream) => {
					if (err) {
						console.warn(`Camera(${cam.urn}) get uri fail:`, err);
						cb(err);
					} else {
						console.info(`Camera(${cam.urn}) get uri:`, stream.uri);
						mediaMgr.removeDev(dev);
						mediaMgr.addCam(stream.uri, cam);
						this.selectMedia(devId, cb);
					}
				});
			});
		} else {
			var err = new Error('Device invalid.');
			err.code = 'invalid';
			cb(err);
		}
	}

	/*
	 * closeMedia(devId, cb)
	 */
	closeMedia(devId, cb) {
		console.log('Recv camera-close message.', devId);
		this.mediaMgr.destroyMedia(devId, cb);
	}
}

module.exports = MediaApi;
