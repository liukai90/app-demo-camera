/*
 * Copyright (c) 2019 EdgerOS Team.
 * All rights reserved.
 *
 * Detailed license information can be found in the LICENSE file.
 *
 * File: mediaclient.js media client module.
 *
 * Author: Cheng.yongbin
 *
 */

/*
 * MediaClient Class.
 */
(function () {
	class EventEmitter {
		constructor() {
			this._events = {};
			this.on = this.addEventListener;
			this.off = this.removeEventListener;
		}

		/*
		 * Emit event
		 */
		emit(event) {
			var listeners = this._events[event];
			if (!Array.isArray(listeners)) {
				return false;
			}

			listeners = listeners.slice();
			var args = Array.prototype.slice.call(arguments, 1);
			for (var i = 0; i < listeners.length; ++i) {
				listeners[i].apply(this, args);
			}
			return true;
		}

		/*
		 * Add Event Listener
		 */
		addEventListener(event, listener) {
			if (typeof listener !== 'function') {
				throw new TypeError('listener must be a function');
			}

			if (!this._events[event]) {
				this._events[event] = [];
			}
			this._events[event].push(listener);
			return this;
		}

		/*
		 * Remove Event Listener
		 */
		removeEventListener(event, listener) {
			if (typeof listener !== 'function') {
				throw new TypeError('listener must be a function');
			}

			var list = this._events[event];
			if (!Array.isArray(list)) {
				return this;
			}
			for (var i = list.length - 1; i >= 0; --i) {
				if (list[i] == listener ||
					(list[i].listener && list[i].listener == listener)) {
					list.splice(i, 1);
					if (!list.length) {
						delete this._events[event];
					}
					break;
				}
			}
			return this;
		}

		/*
		 * Remove All Listener
		 */
		removeAllListeners(event) {
			if (arguments.length === 0) {
				this._events = {};
			} else {
				delete this._events[event];
			}
			return this;
		}
	}

	/* 
	 * Event type.
	 */
	var EVENT_TYPE = {
		SEND: 1,
		CALL: 2,
		REPLY: 3,
	};

	/*
	 * System event.
	 */
	var BUILDIN_EVENTS = [
		'error',
		'open',
		'close',
		'pause',
		'resume',
		'data',
		'message',
		'shakeHandle'
	];

	/*
	 * ReplyEvent.
	 */
	class ReplyEvent {
		constructor(client, event, eventId) {
			this.client = client;
			this.event = event;
			this.eventId = eventId;
			this.reply = this._reply.bind(this);
		}

		/*
		 * _uninit()
		 */
		_uninit() {
			this.client = undefined;
			this.reply = undefined;
		}

		/*
		 * _reply(args)
		 * 'message' event args: _reply([opts, ]data)
		 * other event args: _reply(...args)
		 */
		_reply() {
			if (this.client) {
				var opts = undefined;
				var args = Array.prototype.slice.call(arguments);
				var data = args;
				if (this.event === 'message') {
					if (args.length === 1) {
						data = args[0];
					} else if (args.length > 1) {
						opts = args[0];
						data = args[1];
					}
				}
				this.client._reply(this.event, this.eventId, opts, data);
				this._uninit();
			}
		}
	}

	/*
	 * MediaClient.
	 * op: open, close, send, emit, on.
	 * event: open, close, error, data, message, shakeHandle.
	 */
	class MediaClient extends EventEmitter {
		/*
		 * constructor(origin, shakeHandle[, opts])
		 * origin {String}
		 * opts:
		 * 	timeout {Integer}
		 *  log {Function}
		 *  info {Function}
		 *  error {Function}
		 *  path {String} default: /live
		 *  token {String}
		 *  srand {String}
		 * shakeHandle {Function}
		 *  self {MediaClient}
		 *  path {String}
		 */
		constructor(origin, shakeHandle, opts) {
			if (typeof origin !== 'string' || typeof shakeHandle !== 'function') {
				throw new TypeError('Argument error.');
			}
			super();

			if (typeof origin === 'string') {
				if (typeof shakeHandle !== 'function') {
					throw new TypeError('Argument error.');
				}
			} else if (typeof origin === 'function') {
				opts = shakeHandle;
				shakeHandle = origin;
				origin = null;
			} else {
				throw new TypeError('Argument error.');
			}

			opts = typeof opts === 'object' ? opts : {};
			this.opts = opts;
			this.opts.path = this.opts.path || '/live';
			this.origin = origin;
			this.log = opts.log ? opts.log : console.log;
			this.info = opts.info ? opts.info : console.info;
			this.errInfo = opts.error ? opts.error : console.error;
			this.timeout = opts.timeout ? opts.timeout: 30000;
			this.query = '';
			this.updateQuery();

			this.id = undefined;
			this._client = undefined;
			this._timer = undefined;
			this._opened = false;
			this._closing = false;
			this._closed = false;
			this._curEventId = 0;
			this._cbevents = {}; /* eventId: callback */

			this.on('shakeHandle', (self, id) => {
				var query = this.query.length === 0 ? `?id=${id}` : `${this.query}&&id=${id}`;
				var path = `${this.opts.path}${query}`;
				console.log('shakeHandle callback');
				shakeHandle(self, path);
			});
		}

		updateQuery() {
			var query = this.opts.token ? `?edger-token=${this.opts.token}` : '';
			if (this.opts.srand) {
				query = query.length === 0 ? `?edger-srand=${this.opts.srand}` : `${query}&&edger-srand=${this.opts.srand}`;
			}
			this.query = query;
		}

		/*
		 * destroy()
		 */
		destroy() {
			if (this._client) {
				this._client.close();
				this._client = undefined;
			}
			if (this._timer) {
				clearTimeout(this._timer);
				this._timer = undefined;
			}
			this._uninit();
		}

		/*
		 * _uninit()
		 */
		_uninit() {
			this.log = undefined;
			this.info = undefined;
			this.errInfo = undefined;
			this._reset();
			this.removeAllListeners();
		}

		/*
		 * _reset()
		 */
		_reset() {
			this._opened = false;
			this._closing = false;
			this._closed = false;
			this.id = undefined;
			this._client = undefined;
			this._curEventId = 0;
			this._cbevents = {};
		}

		/*
		 * _addEvent(eventId, cb)
		 * eventId {String | Integer}
		 * cb {Function}
		 */
		_addEvent(eventId, cb) {
			var id = eventId.toString();
			if (id in this._cbevents) {
				return false;
			} else {
				this._cbevents[id] = cb;
				return true;
			}
		}

		/*
		 * _removeEvent(eventId)
		 * eventId {String | Integer}
		 */
		_removeEvent(eventId) {
			var id = eventId.toString();
			if (id in this._cbevents) {
				delete this._cbevents[id];
			}
		}

		/*
		 * _findEvent(eventId)
		 * eventId {String | Integer}
		 */
		_findEvent(eventId) {
			var id = eventId.toString();
			if (id in this._cbevents) {
				return this._cbevents[id];
			} else {
				return undefined;
			}
		}

		/*
		 * _genEventId()
		 */
		_genEventId() {
			return ++this._curEventId;
		}

		/* 
		 * open([opts])
		 * opts {Object}
		 *   token {String}
		 *   srand {String}
		 */
		open(opts) {
			if (typeof opts === 'object') {
				var update = false;
				if (typeof opts.token === 'string') {
					this.opts.token = opts.token;
					update = true;
				}
				if (typeof opts.srand === 'string') {
					this.opts.srand = opts.srand;
					update = true;
				}
				if (update) {
					this.updateQuery();
				}
			}
			var wsUrl = `${this.origin}${this.opts.path}.media${this.query}`;
			this.info(`data channel url=${wsUrl}`);

			if (!window.WebSocket) {
				this.log('!window.WebSocket');
				window.WebSocket = window.MozWebSocket;
			}
			if (window.WebSocket) {
				var socket = new WebSocket(wsUrl);
				var self = this;
				socket.onopen = function (event) {
					self.info('Data channel connect success.');
				};
				socket.onmessage = this.onRecv.bind(this);
				socket.onclose = this.onClose.bind(this);

				this._client = socket;
				this._timer = setTimeout(() => {
					var err = new Error('Open channel timeout.');
					err.code = 'timeout';
					self.error(err);
				}, this.timeout);

			} else {
				this.error(new Error('Not support websocket.'));
			}
		}

		/*
		 * close()
		 */
		close() {
			if (this._timer) {
				clearTimeout(this._timer);
				this._timer = undefined;
			}
			if (!this._closing) {
				this.info('Close client.');
				this._closing = true;
				this._opened = false;
				if (this._client) {
					this._client.close();
				}
				this.onClose();
			}
		}

		/*
		 * error(err)
		 */
		error(err) {
			this.emit('error', this, err);
			this.errInfo(err);
			this.close();
		}

		/*
		 * _send(type, event, eventId, opts, data[, cb])
		 * event {String}
		 * eventId {Ingeger | Undefined} Valid for REPLY event.
		 * opts {Object | Undefined}
		 * data {String | Array | Object | Undefined}
		 * cb {Function} Valid for CALL event.
		 */
		_send(type, event, eventId, opts, data, cb) {
			if (typeof type !== 'number' || typeof event !== 'string' || (opts && typeof opts !== 'Object')) {
				throw new TypeError('Argument error.');
			}
			opts = opts ? opts : {};
			eventId = typeof eventId === 'number' ? eventId : undefined;
			cb = typeof cb === 'function' ? cb : undefined;
			if (type === EVENT_TYPE.REPLY && !eventId) {
				throw new TypeError('Argument eventId error.');
			} else if (type === EVENT_TYPE.CALL && !cb) {
				throw new TypeError('Argument cb error.');
			}

			var msg = {
				id: this.id,
				type: type,
				event: event,
				opts: opts,
			}
			if (data) {
				msg.data = data;
			}
			if (type === EVENT_TYPE.CALL) {
				eventId = this._genEventId();
				msg.eventId = eventId;
				this._addEvent(eventId, cb);

			} else if (type === EVENT_TYPE.REPLY) {
				msg.eventId = eventId;
			}
			msg = JSON.stringify(msg);
			this._client.send(msg);
		}

		/*
		 * _reply(event, eventId, opts, data)
		 * Reply message to remote.
		 */
		_reply(event, eventId, opts, data) {
			this._send(EVENT_TYPE.REPLY, event, eventId, opts, data);
		}

		/*
		 * _recv(event, opts, data[, cb])
		 * Recv message and then emit event.
		 */
		_recv(event, opts, data, cb) {
			var args = undefined;
			if (event === 'message') {
				args = [event, this, opts, data];
			} else if (data && Array.isArray(data)) {
				args = data;
				args.unshift(this);
				args.unshift(event);
			} else {
				args = [event, this];
			}
			if (cb) {
				args.push(cb);
			}
			super.emit.apply(this, args); /* Notify: args include self. */
		}

		/*
		 * send(opts, data[, cb])
		 * opts {Object | undefined}
		 * data {String | Array | Object}
		 * cb {Function}
		 */
		send(opts, data, cb) {
			var args = Array.prototype.slice.call(arguments);
			if (args.length < 1) {
				throw new TypeError('Argument error.');
			}
			if ((opts && typeof opts !== 'object') || !data || (cb && typeof cb !== 'function')) {
				throw new TypeError('Argument error.');
			}
			cb = cb ? cb : undefined;
			opts = opts ? opts : undefined;

			var type = cb ? EVENT_TYPE.CALL : EVENT_TYPE.SEND;
			this._send(type, 'message', undefined, opts, data, cb);
		}

		/*
		 * emit(event, ...args[, cb])
		 * event {String}
		 * args {String | Array | Object}
		 * cb {Function}
		 */
		emit(event) {
			if (~BUILDIN_EVENTS.indexOf(event)) {
				super.emit.apply(this, arguments);
				return this;
			}
			if (typeof event !== 'string') {
				throw new TypeError('Argument error.');
			}

			var args = Array.prototype.slice.call(arguments);
			var cb = undefined;
			if (typeof args[args.length - 1] === 'function') {
				cb = args.pop();
			}
			args.shift();
			args = args.length > 0 ? args : undefined;
			var type = cb ? EVENT_TYPE.CALL : EVENT_TYPE.SEND;
			this._send(type, event, undefined, undefined, args, cb);
			return this;
		}

		/*
		 * onRecv(event)
		 */
		onRecv(event) {
			var chunk = event.data;
			try {
				var msg = JSON.parse(chunk);
			} catch (e) {
				this.error(e);
			}

			var id = msg.id;
			var event = msg.event;
			switch (event) {
			case 'shakeHandle':
				this.id = id;
				console.log('on recv shakeHandle');
				super.emit.call(this, 'shakeHandle', this, id);
				break;
			case 'open':
				this.onOpen();
				break;
			case 'close':
				this.log('on recv close.');
				this.onClose();
				break;
			case 'data':
				super.emit.call(this, 'data', this, msg.opts, msg.data);
				break;
			case 'message':
			default:
				this.onMessage(msg);
				return;
			}
		}

		/*
		 * onOpen()
		 */
		onOpen() {
			this._opened = true;
			if (this._timer) {
				clearTimeout(this._timer);
				this._timer = null;
			}
			super.emit.call(this, 'open', this);
		}

		/*
		 * onClose()
		 */
		onClose() {
			this.log('onClose');
			if (!this._closing) {
				this.close();
			} else if (!this._closed) {
				this._closed = true;	
				this._reset();
				super.emit.call(this, 'close', this);
			}
		}

		/*
		 * onMessage(msg)
		 */
		onMessage(msg) {
			if (!msg.id || !msg.type || !msg.event) {
				this.info('Message invalid.');
				return;
			}

			var type = Number(msg.type);
			if (type === EVENT_TYPE.SEND) {
				this._recv(msg.event, msg.opts, msg.data);

			} else if (type === EVENT_TYPE.CALL) {
				if (!msg.eventId) {
					this.info(`Message(${type}) invalid.`);
					return;
				}
				var replyEvt = new ReplyEvent(this, msg.event, msg.eventId);
				this._recv(msg.event, msg.opts, msg.data, replyEvt.reply);

			} else if (type === EVENT_TYPE.REPLY) {
				var cbEvent = undefined;
				if (msg.eventId) {
					cbEvent = this._findEvent(msg.eventId);
				}
				if (!cbEvent) {
					this.info(`Reply event(id=${msg.eventId}) invalid.`);
					return;
				}
				this._removeEvent(msg.eventId);
				var args = [this];
				if (msg.event === 'message') {
					msg.opts = msg.opts ? msg.opts : {};
					args = [this, msg.opts, msg.data];
				} else if (Array.isArray(msg.data)) {
					args = msg.data;
					args.unshift(this);
				}
				cbEvent.apply(cbEvent, args); /* Notify: args include self. */

			} else {
				this.info(`Reply event(type=${msg.type}) invalid.`);
			}
		}
	}

	/*
	 * Export
	 */
	this.MediaClient = MediaClient;
})();
