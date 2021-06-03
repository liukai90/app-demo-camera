/*
 * Copyright (c) 2019 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: main.js demo application.
 *
 * Author: Cheng.yongbin
 *
 */

var WebApp = require('webapp');
var iosched = require('iosched');
var util = require('./util');

/* 
 * WebApp.
 */
var app = WebApp.createApp();

/*
 * Set static path.
 */
app.use(WebApp.static('./public'));

/*
 * Meia server.
 */
var server = undefined;

/*
 * Create Meia server.
 */
function createMediaSer() {
	console.log('Create media server.');
	if (server) {
		return Promise.resolve(server);
	}
	return util.getIfnames()
	.then((ifnames) => {
		var MediaApi = require('./media_api'); /* or: require('./media_api2') */
		server = new MediaApi(app, {
			faceEnable: true,
			fps: 1.5,
			nets: [
				{ifname: ifnames.lan, localPort: 0},
				{ifname: ifnames.wan, localPort: 0}
			],
			mediaTimeout: 1800000,
			searchCycle: 20000
		});
		console.log('Create media server success.');
		return server;
	})
	.catch((e) => {
		server = undefined;
		console.error(e.message);
		throw e;
	});
}

/*
 * Is server starting. 
 */
var starting = false;

/*
 * Start Meia server.
 */
function startServer() {
	if (server) {
		return Promise.resolve(server);
	}
	if (starting) {
		return Promise.reject(new Error('Server starting.'));
	} else {
		starting = true;
	}

	var perms = ['network'];
	return util.checkPerm(perms)
	.then((ret) => {
		return createMediaSer();
	})
	.then((ser) => {
		starting = false;
		console.log('Start server success.');
		return ser;
	})
	.catch((err) => {
		starting = false;
		console.warn('Start server fail:', err.message);
		throw err;
	});
}

/*
 * Init start mult-meida server.
 */
Task.nextTick(() => {
	startServer().catch((err) => {
		console.error(err.message);
	});
});

/* 
 * req: null
 * res: [{devId, alias, report, status}...]
 */
app.get('/api/list', async (req, res) => {
	if (!server) {
		try {
			await startServer();
		} catch (err) {
			return res.json([]);
		}
	}
	var devs = server.getMediaList();
	res.send(JSON.stringify(devs));
});

/*
 * req: url
 * res: [{devId, alias, report, status}]
 */
app.get('/api/search', (req, res) => {
	console.log('Recv camera-search message.');
	if (!server) {
		res.json([]);
		return;
	}
	var url = req.query.url;
	if (typeof url !== 'string') {
		res.send(JSON.stringify([]));
		return;
	}
	server.fetchMedia(url, (media) => {
		var ret = [];
		if (!(media instanceof Error)) {
			ret = [{
				devId: media.key,
				alias: media.sid,
				report: media.sid,
				status: true,
			}];
			console.info(`Device key: ${media.key}`);
		}
		res.send(JSON.stringify(ret));
	});
});

/*
 * req: devId
 * res: {result, msg, login, videoUrl, enableMove, autoMode}
 */
app.get('/api/select', async (req, res) => {
	console.log('Recv camera-select message.');
	if (!server) {
		return res.json({
			result: false,
			msg: 'Media not start.'
		});
	}

	try {
		await util.checkPerm(['rtsp']);
	} catch(err) {
		return res.json({
			result: false,
			msg: 'Need rtsp permission.'
		});
	}

	var ret = {result: false, msg: 'error', login: false};
	var deviceId = req.query.devId;
	if (!deviceId) {
		ret.msg = `Invalid device id: ${deviceId}`;
		console.warn(ret.msg);
		res.send(JSON.stringify(ret));
		return;
	}

	server.selectMedia(deviceId, (media) => {
		if (media instanceof Error) {
			ret.msg = `Invalid device id: ${deviceId}`;
			console.warn(ret.msg);
		} else if (!media) {
			ret.result = true;
			ret.msg = 'Need login camera.';
			ret.login = true;
		} else {
			ret.result = true;
			ret.msg = 'ok';
			ret.videoUrl = '/' + media.sid;
			ret.enableMove = media.enableMove;
			ret.autoMode = media.autoMove;
		}
		res.send(JSON.stringify(ret));
	});
});

/*
 * req: {devId, username, password}
 * res: {result, msg, videoUrl, enableMove, autoMove}
 */
app.post('/api/login', (req, res) => {
	console.log('Recv camera-login message.');
	if (!server) {
		return res.json({
			result: false,
			msg: 'Media not start.'
		});
	}

	var ret = {result: false, msg: 'error'};
	var data = [];
	req.on('data', (buf) => {
		data.push(buf);
	});

	req.on('end', async () => {
		try {
			await util.checkPerm(['rtsp']);

			data = Buffer.concat(data);
			var info = JSON.parse(data.toString());
			var deviceId = info.devId;
			if (!deviceId) {
				ret.msg = `Invalid device id: ${deviceId}`;
				console.warn(ret.msg);
				res.send(JSON.stringify(ret));
				return;
			}

			server.loginMedia(info, (media) => {
				if (!media || media instanceof Error) {
					ret.msg = `Device ${deviceId} login fail.`;
					console.warn(ret.msg);
				} else {
					ret.result = true;
					ret.msg = 'ok';
					ret.videoUrl = '/' + media.sid;
					ret.enableMove = media.enableMove;
					ret.autoMode = media.autoMove;
				}
				res.send(JSON.stringify(ret));
			});

		} catch(e) {
			ret.result = false;
			ret.msg = e.message;
			console.warn(ret.msg);
			res.send(JSON.stringify(ret));
			return;
		}
	});
});

/*
 * req: devId
 * res: {result, msg}
 */
app.put('/api/close', (req, res) => {
	console.log('Recv camera-close message.');
	if (!server) {
		res.json({
			result: false,
			msg: 'Media not start.'
		});
		return;
	}
	var ret = {result: false, msg: 'error'};
	var data = [];
	req.on('data', (buf) => {
		data.push(buf);
	});

	req.on('end', () => {
		try {
			data = Buffer.concat(data);
			var deviceId = data.toString();
			if (!deviceId) {
				ret.msg = `Invalid device id: ${deviceId}`;
				console.warn(ret.msg);
				res.send(JSON.stringify(ret));
				return;
			}

			server.closeMedia(deviceId, (isOk) => {
				ret.result = isOk;
				ret.msg = isOk ? 'ok' : `Device ${deviceId} close fail.`;
				res.send(JSON.stringify(ret));
			});

		} catch(e) {
			ret.result = false;
			ret.msg = e.message;
			console.warn(ret.msg);
			res.send(JSON.stringify(ret));
			return;
		}
	});
});

/*
 * app start
 */
app.start();

/*
 * Event loop
 */
iosched.forever();
