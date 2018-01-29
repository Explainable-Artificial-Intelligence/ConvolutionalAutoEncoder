(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
    module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
    if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
    for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
    }
    return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
    Emitter.prototype.addEventListener = function (event, fn) {
        this._callbacks = this._callbacks || {};
        (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
            .push(fn);
        return this;
    };

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function (event, fn) {
    function on() {
        this.off(event, on);
        fn.apply(this, arguments);
    }

    on.fn = fn;
    this.on(event, on);
    return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
    Emitter.prototype.removeListener =
        Emitter.prototype.removeAllListeners =
            Emitter.prototype.removeEventListener = function (event, fn) {
                this._callbacks = this._callbacks || {};

                // all
                if (0 == arguments.length) {
                    this._callbacks = {};
                    return this;
                }

                // specific event
                var callbacks = this._callbacks['$' + event];
                if (!callbacks) return this;

                // remove all handlers
                if (1 == arguments.length) {
                    delete this._callbacks['$' + event];
                    return this;
                }

                // remove specific handler
                var cb;
                for (var i = 0; i < callbacks.length; i++) {
                    cb = callbacks[i];
                    if (cb === fn || cb.fn === fn) {
                        callbacks.splice(i, 1);
                        break;
                    }
                }
                return this;
            };

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function (event) {
    this._callbacks = this._callbacks || {};
    var args = [].slice.call(arguments, 1)
        , callbacks = this._callbacks['$' + event];

    if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
            callbacks[i].apply(this, args);
        }
    }

    return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function (event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function (event) {
    return !!this.listeners(event).length;
};

},{}],2:[function(require,module,exports){
/**
 * Root reference for iframes.
 */

var root;
if (typeof window !== 'undefined') { // Browser window
    root = window;
} else if (typeof self !== 'undefined') { // Web Worker
    root = self;
} else { // Other environments
    console.warn("Using browser-only version of superagent in non-browser environment");
    root = this;
}

var Emitter = require('component-emitter');
var RequestBase = require('./request-base');
var isObject = require('./is-object');
var isFunction = require('./is-function');
var ResponseBase = require('./response-base');
var shouldRetry = require('./should-retry');

/**
 * Noop.
 */

function noop() {
};

/**
 * Expose `request`.
 */

var request = exports = module.exports = function (method, url) {
    // callback
    if ('function' == typeof url) {
        return new exports.Request('GET', method).end(url);
    }

    // url first
    if (1 == arguments.length) {
        return new exports.Request('GET', method);
    }

    return new exports.Request(method, url);
}

exports.Request = Request;

/**
 * Determine XHR.
 */

request.getXHR = function () {
    if (root.XMLHttpRequest
        && (!root.location || 'file:' != root.location.protocol
            || !root.ActiveXObject)) {
        return new XMLHttpRequest;
    } else {
        try {
            return new ActiveXObject('Microsoft.XMLHTTP');
        } catch (e) {
        }
        try {
            return new ActiveXObject('Msxml2.XMLHTTP.6.0');
        } catch (e) {
        }
        try {
            return new ActiveXObject('Msxml2.XMLHTTP.3.0');
        } catch (e) {
        }
        try {
            return new ActiveXObject('Msxml2.XMLHTTP');
        } catch (e) {
        }
    }
    throw Error("Browser-only verison of superagent could not find XHR");
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
    ? function (s) {
        return s.trim();
    }
    : function (s) {
        return s.replace(/(^\s*|\s*$)/g, '');
    };

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
    if (!isObject(obj)) return obj;
    var pairs = [];
    for (var key in obj) {
        pushEncodedKeyValuePair(pairs, key, obj[key]);
    }
    return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair(pairs, key, val) {
    if (val != null) {
        if (Array.isArray(val)) {
            val.forEach(function (v) {
                pushEncodedKeyValuePair(pairs, key, v);
            });
        } else if (isObject(val)) {
            for (var subkey in val) {
                pushEncodedKeyValuePair(pairs, key + '[' + subkey + ']', val[subkey]);
            }
        } else {
            pairs.push(encodeURIComponent(key)
                + '=' + encodeURIComponent(val));
        }
    } else if (val === null) {
        pairs.push(encodeURIComponent(key));
    }
}

/**
 * Expose serialization method.
 */

request.serializeObject = serialize;

/**
 * Parse the given x-www-form-urlencoded `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseString(str) {
    var obj = {};
    var pairs = str.split('&');
    var pair;
    var pos;

    for (var i = 0, len = pairs.length; i < len; ++i) {
        pair = pairs[i];
        pos = pair.indexOf('=');
        if (pos == -1) {
            obj[decodeURIComponent(pair)] = '';
        } else {
            obj[decodeURIComponent(pair.slice(0, pos))] =
                decodeURIComponent(pair.slice(pos + 1));
        }
    }

    return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
    html: 'text/html',
    json: 'application/json',
    xml: 'application/xml',
    urlencoded: 'application/x-www-form-urlencoded',
    'form': 'application/x-www-form-urlencoded',
    'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

request.serialize = {
    'application/x-www-form-urlencoded': serialize,
    'application/json': JSON.stringify
};

/**
 * Default parsers.
 *
 *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
 *
 */

request.parse = {
    'application/x-www-form-urlencoded': parseString,
    'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
    var lines = str.split(/\r?\n/);
    var fields = {};
    var index;
    var line;
    var field;
    var val;

    lines.pop(); // trailing CRLF

    for (var i = 0, len = lines.length; i < len; ++i) {
        line = lines[i];
        index = line.indexOf(':');
        field = line.slice(0, index).toLowerCase();
        val = trim(line.slice(index + 1));
        fields[field] = val;
    }

    return fields;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
    return /[\/+]json\b/.test(mime);
}

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req) {
    this.req = req;
    this.xhr = this.req.xhr;
    // responseText is accessible only if responseType is '' or 'text' and on older browsers
    this.text = ((this.req.method != 'HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
        ? this.xhr.responseText
        : null;
    this.statusText = this.req.xhr.statusText;
    var status = this.xhr.status;
    // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
    if (status === 1223) {
        status = 204;
    }
    this._setStatusProperties(status);
    this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
    // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
    // getResponseHeader still works. so we get content-type even if getting
    // other headers fails.
    this.header['content-type'] = this.xhr.getResponseHeader('content-type');
    this._setHeaderProperties(this.header);

    if (null === this.text && req._responseType) {
        this.body = this.xhr.response;
    } else {
        this.body = this.req.method != 'HEAD'
            ? this._parseBody(this.text ? this.text : this.xhr.response)
            : null;
    }
}

ResponseBase(Response.prototype);

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype._parseBody = function (str) {
    var parse = request.parse[this.type];
    if (this.req._parser) {
        return this.req._parser(this, str);
    }
    if (!parse && isJSON(this.type)) {
        parse = request.parse['application/json'];
    }
    return parse && str && (str.length || str instanceof Object)
        ? parse(str)
        : null;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function () {
    var req = this.req;
    var method = req.method;
    var url = req.url;

    var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
    var err = new Error(msg);
    err.status = this.status;
    err.method = method;
    err.url = url;

    return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
    var self = this;
    this._query = this._query || [];
    this.method = method;
    this.url = url;
    this.header = {}; // preserves header name case
    this._header = {}; // coerces header names to lowercase
    this.on('end', function () {
        var err = null;
        var res = null;

        try {
            res = new Response(self);
        } catch (e) {
            err = new Error('Parser is unable to parse the response');
            err.parse = true;
            err.original = e;
            // issue #675: return the raw response if the response parsing fails
            if (self.xhr) {
                // ie9 doesn't have 'response' property
                err.rawResponse = typeof self.xhr.responseType == 'undefined' ? self.xhr.responseText : self.xhr.response;
                // issue #876: return the http status code if the response parsing fails
                err.status = self.xhr.status ? self.xhr.status : null;
                err.statusCode = err.status; // backwards-compat only
            } else {
                err.rawResponse = null;
                err.status = null;
            }

            return self.callback(err);
        }

        self.emit('response', res);

        var new_err;
        try {
            if (!self._isResponseOK(res)) {
                new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
                new_err.original = err;
                new_err.response = res;
                new_err.status = res.status;
            }
        } catch (e) {
            new_err = e; // #985 touching res may cause INVALID_STATE_ERR on old Android
        }

        // #1000 don't catch errors from the callback to avoid double calling it
        if (new_err) {
            self.callback(new_err, res);
        } else {
            self.callback(null, res);
        }
    });
}

/**
 * Mixin `Emitter` and `RequestBase`.
 */

Emitter(Request.prototype);
RequestBase(Request.prototype);

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function (type) {
    this.set('Content-Type', request.types[type] || type);
    return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function (type) {
    this.set('Accept', request.types[type] || type);
    return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} [pass] optional in case of using 'bearer' as type
 * @param {Object} options with 'type' property 'auto', 'basic' or 'bearer' (default 'basic')
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function (user, pass, options) {
    if (typeof pass === 'object' && pass !== null) { // pass is optional and can substitute for options
        options = pass;
    }
    if (!options) {
        options = {
            type: 'function' === typeof btoa ? 'basic' : 'auto',
        }
    }

    switch (options.type) {
        case 'basic':
            this.set('Authorization', 'Basic ' + btoa(user + ':' + pass));
            break;

        case 'auto':
            this.username = user;
            this.password = pass;
            break;

        case 'bearer': // usage would be .auth(accessToken, { type: 'bearer' })
            this.set('Authorization', 'Bearer ' + user);
            break;
    }
    return this;
};

/**
 * Add query-string `val`.
 *
 * Examples:
 *
 *   request.get('/shoes')
 *     .query('size=10')
 *     .query({ color: 'blue' })
 *
 * @param {Object|String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.query = function (val) {
    if ('string' != typeof val) val = serialize(val);
    if (val) this._query.push(val);
    return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `options` (or filename).
 *
 * ``` js
 * request.post('/upload')
 *   .attach('content', new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String|Object} options
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function (field, file, options) {
    if (file) {
        if (this._data) {
            throw Error("superagent can't mix .send() and .attach()");
        }

        this._getFormData().append(field, file, options || file.name);
    }
    return this;
};

Request.prototype._getFormData = function () {
    if (!this._formData) {
        this._formData = new root.FormData();
    }
    return this._formData;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function (err, res) {
    // console.log(this._retries, this._maxRetries)
    if (this._maxRetries && this._retries++ < this._maxRetries && shouldRetry(err, res)) {
        return this._retry();
    }

    var fn = this._callback;
    this.clearTimeout();

    if (err) {
        if (this._maxRetries) err.retries = this._retries - 1;
        this.emit('error', err);
    }

    fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function () {
    var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
    err.crossDomain = true;

    err.status = this.status;
    err.method = this.method;
    err.url = this.url;

    this.callback(err);
};

// This only warns, because the request is still likely to work
Request.prototype.buffer = Request.prototype.ca = Request.prototype.agent = function () {
    console.warn("This is not supported in browser version of superagent");
    return this;
};

// This throws, because it can't send/receive data as expected
Request.prototype.pipe = Request.prototype.write = function () {
    throw Error("Streaming is not supported in browser version of superagent");
};

/**
 * Compose querystring to append to req.url
 *
 * @api private
 */

Request.prototype._appendQueryString = function () {
    var query = this._query.join('&');
    if (query) {
        this.url += (this.url.indexOf('?') >= 0 ? '&' : '?') + query;
    }

    if (this._sort) {
        var index = this.url.indexOf('?');
        if (index >= 0) {
            var queryArr = this.url.substring(index + 1).split('&');
            if (isFunction(this._sort)) {
                queryArr.sort(this._sort);
            } else {
                queryArr.sort();
            }
            this.url = this.url.substring(0, index) + '?' + queryArr.join('&');
        }
    }
};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */
Request.prototype._isHost = function _isHost(obj) {
    // Native objects stringify to [object File], [object Blob], [object FormData], etc.
    return obj && 'object' === typeof obj && !Array.isArray(obj) && Object.prototype.toString.call(obj) !== '[object Object]';
}

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function (fn) {
    if (this._endCalled) {
        console.warn("Warning: .end() was called twice. This is not supported in superagent");
    }
    this._endCalled = true;

    // store callback
    this._callback = fn || noop;

    // querystring
    this._appendQueryString();

    return this._end();
};

Request.prototype._end = function () {
    var self = this;
    var xhr = this.xhr = request.getXHR();
    var data = this._formData || this._data;

    this._setTimeouts();

    // state change
    xhr.onreadystatechange = function () {
        var readyState = xhr.readyState;
        if (readyState >= 2 && self._responseTimeoutTimer) {
            clearTimeout(self._responseTimeoutTimer);
        }
        if (4 != readyState) {
            return;
        }

        // In IE9, reads to any property (e.g. status) off of an aborted XHR will
        // result in the error "Could not complete the operation due to error c00c023f"
        var status;
        try {
            status = xhr.status
        } catch (e) {
            status = 0;
        }

        if (!status) {
            if (self.timedout || self._aborted) return;
            return self.crossDomainError();
        }
        self.emit('end');
    };

    // progress
    var handleProgress = function (direction, e) {
        if (e.total > 0) {
            e.percent = e.loaded / e.total * 100;
        }
        e.direction = direction;
        self.emit('progress', e);
    }
    if (this.hasListeners('progress')) {
        try {
            xhr.onprogress = handleProgress.bind(null, 'download');
            if (xhr.upload) {
                xhr.upload.onprogress = handleProgress.bind(null, 'upload');
            }
        } catch (e) {
            // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
            // Reported here:
            // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
        }
    }

    // initiate request
    try {
        if (this.username && this.password) {
            xhr.open(this.method, this.url, true, this.username, this.password);
        } else {
            xhr.open(this.method, this.url, true);
        }
    } catch (err) {
        // see #1149
        return this.callback(err);
    }

    // CORS
    if (this._withCredentials) xhr.withCredentials = true;

    // body
    if (!this._formData && 'GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !this._isHost(data)) {
        // serialize stuff
        var contentType = this._header['content-type'];
        var serialize = this._serializer || request.serialize[contentType ? contentType.split(';')[0] : ''];
        if (!serialize && isJSON(contentType)) {
            serialize = request.serialize['application/json'];
        }
        if (serialize) data = serialize(data);
    }

    // set header fields
    for (var field in this.header) {
        if (null == this.header[field]) continue;

        if (this.header.hasOwnProperty(field))
            xhr.setRequestHeader(field, this.header[field]);
    }

    if (this._responseType) {
        xhr.responseType = this._responseType;
    }

    // send stuff
    this.emit('request', this);

    // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
    // We need null here if data is undefined
    xhr.send(typeof data !== 'undefined' ? data : null);
    return this;
};

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.get = function (url, data, fn) {
    var req = request('GET', url);
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.query(data);
    if (fn) req.end(fn);
    return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.head = function (url, data, fn) {
    var req = request('HEAD', url);
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
};

/**
 * OPTIONS query to `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.options = function (url, data, fn) {
    var req = request('OPTIONS', url);
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
};

/**
 * DELETE `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

function del(url, data, fn) {
    var req = request('DELETE', url);
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
};

request['del'] = del;
request['delete'] = del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.patch = function (url, data, fn) {
    var req = request('PATCH', url);
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} [data]
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.post = function (url, data, fn) {
    var req = request('POST', url);
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} [data] or fn
 * @param {Function} [fn]
 * @return {Request}
 * @api public
 */

request.put = function (url, data, fn) {
    var req = request('PUT', url);
    if ('function' == typeof data) fn = data, data = null;
    if (data) req.send(data);
    if (fn) req.end(fn);
    return req;
};

},{"./is-function":3,"./is-object":4,"./request-base":5,"./response-base":6,"./should-retry":7,"component-emitter":1}],3:[function(require,module,exports){
/**
 * Check if `fn` is a function.
 *
 * @param {Function} fn
 * @return {Boolean}
 * @api private
 */
var isObject = require('./is-object');

function isFunction(fn) {
    var tag = isObject(fn) ? Object.prototype.toString.call(fn) : '';
    return tag === '[object Function]';
}

module.exports = isFunction;

},{"./is-object":4}],4:[function(require,module,exports){
/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
    return null !== obj && 'object' === typeof obj;
}

module.exports = isObject;

},{}],5:[function(require,module,exports){
/**
 * Module of mixed-in functions shared between node and client code
 */
var isObject = require('./is-object');

/**
 * Expose `RequestBase`.
 */

module.exports = RequestBase;

/**
 * Initialize a new `RequestBase`.
 *
 * @api public
 */

function RequestBase(obj) {
    if (obj) return mixin(obj);
}

/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
    for (var key in RequestBase.prototype) {
        obj[key] = RequestBase.prototype[key];
    }
    return obj;
}

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.clearTimeout = function _clearTimeout() {
    clearTimeout(this._timer);
    clearTimeout(this._responseTimeoutTimer);
    delete this._timer;
    delete this._responseTimeoutTimer;
    return this;
};

/**
 * Override default response body parser
 *
 * This function will be called to convert incoming data into request.body
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.parse = function parse(fn) {
    this._parser = fn;
    return this;
};

/**
 * Set format of binary response body.
 * In browser valid formats are 'blob' and 'arraybuffer',
 * which return Blob and ArrayBuffer, respectively.
 *
 * In Node all values result in Buffer.
 *
 * Examples:
 *
 *      req.get('/')
 *        .responseType('blob')
 *        .end(callback);
 *
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.responseType = function (val) {
    this._responseType = val;
    return this;
};

/**
 * Override default request body serializer
 *
 * This function will be called to convert data set via .send or .attach into payload to send
 *
 * @param {Function}
 * @api public
 */

RequestBase.prototype.serialize = function serialize(fn) {
    this._serializer = fn;
    return this;
};

/**
 * Set timeouts.
 *
 * - response timeout is time between sending request and receiving the first byte of the response. Includes DNS and connection time.
 * - deadline is the time from start of the request to receiving response body in full. If the deadline is too short large files may not load at all on slow connections.
 *
 * Value of 0 or false means no timeout.
 *
 * @param {Number|Object} ms or {response, read, deadline}
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.timeout = function timeout(options) {
    if (!options || 'object' !== typeof options) {
        this._timeout = options;
        this._responseTimeout = 0;
        return this;
    }

    for (var option in options) {
        switch (option) {
            case 'deadline':
                this._timeout = options.deadline;
                break;
            case 'response':
                this._responseTimeout = options.response;
                break;
            default:
                console.warn("Unknown timeout option", option);
        }
    }
    return this;
};

/**
 * Set number of retry attempts on error.
 *
 * Failed requests will be retried 'count' times if timeout or err.code >= 500.
 *
 * @param {Number} count
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.retry = function retry(count) {
    // Default to 1 if no count passed or true
    if (arguments.length === 0 || count === true) count = 1;
    if (count <= 0) count = 0;
    this._maxRetries = count;
    this._retries = 0;
    return this;
};

/**
 * Retry request
 *
 * @return {Request} for chaining
 * @api private
 */

RequestBase.prototype._retry = function () {
    this.clearTimeout();

    // node
    if (this.req) {
        this.req = null;
        this.req = this.request();
    }

    this._aborted = false;
    this.timedout = false;

    return this._end();
};

/**
 * Promise support
 *
 * @param {Function} resolve
 * @param {Function} [reject]
 * @return {Request}
 */

RequestBase.prototype.then = function then(resolve, reject) {
    if (!this._fullfilledPromise) {
        var self = this;
        if (this._endCalled) {
            console.warn("Warning: superagent request was sent twice, because both .end() and .then() were called. Never call .end() if you use promises");
        }
        this._fullfilledPromise = new Promise(function (innerResolve, innerReject) {
            self.end(function (err, res) {
                if (err) innerReject(err); else innerResolve(res);
            });
        });
    }
    return this._fullfilledPromise.then(resolve, reject);
}

RequestBase.prototype.catch = function (cb) {
    return this.then(undefined, cb);
};

/**
 * Allow for extension
 */

RequestBase.prototype.use = function use(fn) {
    fn(this);
    return this;
}

RequestBase.prototype.ok = function (cb) {
    if ('function' !== typeof cb) throw Error("Callback required");
    this._okCallback = cb;
    return this;
};

RequestBase.prototype._isResponseOK = function (res) {
    if (!res) {
        return false;
    }

    if (this._okCallback) {
        return this._okCallback(res);
    }

    return res.status >= 200 && res.status < 300;
};


/**
 * Get request header `field`.
 * Case-insensitive.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

RequestBase.prototype.get = function (field) {
    return this._header[field.toLowerCase()];
};

/**
 * Get case-insensitive header `field` value.
 * This is a deprecated internal API. Use `.get(field)` instead.
 *
 * (getHeader is no longer used internally by the superagent code base)
 *
 * @param {String} field
 * @return {String}
 * @api private
 * @deprecated
 */

RequestBase.prototype.getHeader = RequestBase.prototype.get;

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.set = function (field, val) {
    if (isObject(field)) {
        for (var key in field) {
            this.set(key, field[key]);
        }
        return this;
    }
    this._header[field.toLowerCase()] = val;
    this.header[field] = val;
    return this;
};

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 */
RequestBase.prototype.unset = function (field) {
    delete this._header[field.toLowerCase()];
    delete this.header[field];
    return this;
};

/**
 * Write the field `name` and `val`, or multiple fields with one object
 * for "multipart/form-data" request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 *
 * request.post('/upload')
 *   .field({ foo: 'bar', baz: 'qux' })
 *   .end(callback);
 * ```
 *
 * @param {String|Object} name
 * @param {String|Blob|File|Buffer|fs.ReadStream} val
 * @return {Request} for chaining
 * @api public
 */
RequestBase.prototype.field = function (name, val) {

    // name should be either a string or an object.
    if (null === name || undefined === name) {
        throw new Error('.field(name, val) name can not be empty');
    }

    if (this._data) {
        console.error(".field() can't be used if .send() is used. Please use only .send() or only .field() & .attach()");
    }

    if (isObject(name)) {
        for (var key in name) {
            this.field(key, name[key]);
        }
        return this;
    }

    if (Array.isArray(val)) {
        for (var i in val) {
            this.field(name, val[i]);
        }
        return this;
    }

    // val should be defined now
    if (null === val || undefined === val) {
        throw new Error('.field(name, val) val can not be empty');
    }
    if ('boolean' === typeof val) {
        val = '' + val;
    }
    this._getFormData().append(name, val);
    return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */
RequestBase.prototype.abort = function () {
    if (this._aborted) {
        return this;
    }
    this._aborted = true;
    this.xhr && this.xhr.abort(); // browser
    this.req && this.req.abort(); // node
    this.clearTimeout();
    this.emit('abort');
    return this;
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

RequestBase.prototype.withCredentials = function (on) {
    // This is browser-only functionality. Node side is no-op.
    if (on == undefined) on = true;
    this._withCredentials = on;
    return this;
};

/**
 * Set the max redirects to `n`. Does noting in browser XHR implementation.
 *
 * @param {Number} n
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.redirects = function (n) {
    this._maxRedirects = n;
    return this;
};

/**
 * Convert to a plain javascript object (not JSON string) of scalar properties.
 * Note as this method is designed to return a useful non-this value,
 * it cannot be chained.
 *
 * @return {Object} describing method, url, and data of this request
 * @api public
 */

RequestBase.prototype.toJSON = function () {
    return {
        method: this.method,
        url: this.url,
        data: this._data,
        headers: this._header
    };
};


/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
 *      request.post('/user')
 *        .send('name=tobi')
 *        .send('species=ferret')
 *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.send = function (data) {
    var isObj = isObject(data);
    var type = this._header['content-type'];

    if (this._formData) {
        console.error(".send() can't be used if .attach() or .field() is used. Please use only .send() or only .field() & .attach()");
    }

    if (isObj && !this._data) {
        if (Array.isArray(data)) {
            this._data = [];
        } else if (!this._isHost(data)) {
            this._data = {};
        }
    } else if (data && this._data && this._isHost(this._data)) {
        throw Error("Can't merge these send calls");
    }

    // merge
    if (isObj && isObject(this._data)) {
        for (var key in data) {
            this._data[key] = data[key];
        }
    } else if ('string' == typeof data) {
        // default to x-www-form-urlencoded
        if (!type) this.type('form');
        type = this._header['content-type'];
        if ('application/x-www-form-urlencoded' == type) {
            this._data = this._data
                ? this._data + '&' + data
                : data;
        } else {
            this._data = (this._data || '') + data;
        }
    } else {
        this._data = data;
    }

    if (!isObj || this._isHost(data)) {
        return this;
    }

    // default to json
    if (!type) this.type('json');
    return this;
};


/**
 * Sort `querystring` by the sort function
 *
 *
 * Examples:
 *
 *       // default order
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery()
 *         .end(callback)
 *
 *       // customized sort function
 *       request.get('/user')
 *         .query('name=Nick')
 *         .query('search=Manny')
 *         .sortQuery(function(a, b){
 *           return a.length - b.length;
 *         })
 *         .end(callback)
 *
 *
 * @param {Function} sort
 * @return {Request} for chaining
 * @api public
 */

RequestBase.prototype.sortQuery = function (sort) {
    // _sort default to true but otherwise can be a function or boolean
    this._sort = typeof sort === 'undefined' ? true : sort;
    return this;
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

RequestBase.prototype._timeoutError = function (reason, timeout, errno) {
    if (this._aborted) {
        return;
    }
    var err = new Error(reason + timeout + 'ms exceeded');
    err.timeout = timeout;
    err.code = 'ECONNABORTED';
    err.errno = errno;
    this.timedout = true;
    this.abort();
    this.callback(err);
};

RequestBase.prototype._setTimeouts = function () {
    var self = this;

    // deadline
    if (this._timeout && !this._timer) {
        this._timer = setTimeout(function () {
            self._timeoutError('Timeout of ', self._timeout, 'ETIME');
        }, this._timeout);
    }
    // response timeout
    if (this._responseTimeout && !this._responseTimeoutTimer) {
        this._responseTimeoutTimer = setTimeout(function () {
            self._timeoutError('Response timeout of ', self._responseTimeout, 'ETIMEDOUT');
        }, this._responseTimeout);
    }
}

},{"./is-object":4}],6:[function(require,module,exports){
/**
 * Module dependencies.
 */

var utils = require('./utils');

/**
 * Expose `ResponseBase`.
 */

module.exports = ResponseBase;

/**
 * Initialize a new `ResponseBase`.
 *
 * @api public
 */

function ResponseBase(obj) {
    if (obj) return mixin(obj);
}

/**
 * Mixin the prototype properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
    for (var key in ResponseBase.prototype) {
        obj[key] = ResponseBase.prototype[key];
    }
    return obj;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

ResponseBase.prototype.get = function (field) {
    return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

ResponseBase.prototype._setHeaderProperties = function (header) {
    // TODO: moar!
    // TODO: make this a util

    // content-type
    var ct = header['content-type'] || '';
    this.type = utils.type(ct);

    // params
    var params = utils.params(ct);
    for (var key in params) this[key] = params[key];

    this.links = {};

    // links
    try {
        if (header.link) {
            this.links = utils.parseLinks(header.link);
        }
    } catch (err) {
        // ignore
    }
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

ResponseBase.prototype._setStatusProperties = function (status) {
    var type = status / 100 | 0;

    // status / class
    this.status = this.statusCode = status;
    this.statusType = type;

    // basics
    this.info = 1 == type;
    this.ok = 2 == type;
    this.redirect = 3 == type;
    this.clientError = 4 == type;
    this.serverError = 5 == type;
    this.error = (4 == type || 5 == type)
        ? this.toError()
        : false;

    // sugar
    this.accepted = 202 == status;
    this.noContent = 204 == status;
    this.badRequest = 400 == status;
    this.unauthorized = 401 == status;
    this.notAcceptable = 406 == status;
    this.forbidden = 403 == status;
    this.notFound = 404 == status;
};

},{"./utils":8}],7:[function(require,module,exports){
var ERROR_CODES = [
    'ECONNRESET',
    'ETIMEDOUT',
    'EADDRINFO',
    'ESOCKETTIMEDOUT'
];

/**
 * Determine if a request should be retried.
 * (Borrowed from segmentio/superagent-retry)
 *
 * @param {Error} err
 * @param {Response} [res]
 * @returns {Boolean}
 */
module.exports = function shouldRetry(err, res) {
    if (err && err.code && ~ERROR_CODES.indexOf(err.code)) return true;
    if (res && res.status && res.status >= 500) return true;
    // Superagent timeout
    if (err && 'timeout' in err && err.code == 'ECONNABORTED') return true;
    if (err && 'crossDomain' in err) return true;
    return false;
};

},{}],8:[function(require,module,exports){
/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

exports.type = function (str) {
    return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.params = function (str) {
    return str.split(/ *; */).reduce(function (obj, str) {
        var parts = str.split(/ *= */);
        var key = parts.shift();
        var val = parts.shift();

        if (key && val) obj[key] = val;
        return obj;
    }, {});
};

/**
 * Parse Link header fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.parseLinks = function (str) {
    return str.split(/ *, */).reduce(function (obj, str) {
        var parts = str.split(/ *; */);
        var url = parts[0].slice(1, -1);
        var rel = parts[1].split(/ *= */)[1].slice(1, -1);
        obj[rel] = url;
        return obj;
    }, {});
};

/**
 * Strip content related fields from `header`.
 *
 * @param {Object} header
 * @return {Object} header
 * @api private
 */

exports.cleanHeader = function (header, shouldStripCookie) {
    delete header['content-type'];
    delete header['content-length'];
    delete header['transfer-encoding'];
    delete header['host'];
    if (shouldStripCookie) {
        delete header['cookie'];
    }
    return header;
};
},{}],9:[function(require,module,exports){
(function (Buffer){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['superagent', 'querystring'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('superagent'), require('querystring'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.ApiClient = factory(root.superagent, root.querystring);
    }
}(this, function (superagent, querystring) {
    'use strict';

    /**
     * @module ApiClient
     * @version 1.0.7
     */

    /**
     * Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
     * application to use this class directly - the *Api and model classes provide the public API for the service. The
     * contents of this file should be regarded as internal but are documented for completeness.
     * @alias module:ApiClient
     * @class
     */
    var exports = function () {
        /**
         * The base URL against which to resolve every API call's (relative) path.
         * @type {String}
         * @default http://localhost:8080/v2
         */
        this.basePath = 'http://localhost:8080/v2'.replace(/\/+$/, '');

        /**
         * The authentication methods to be included for all API calls.
         * @type {Array.<String>}
         */
        this.authentications = {};
        /**
         * The default HTTP headers to be included for all API calls.
         * @type {Array.<String>}
         * @default {}
         */
        this.defaultHeaders = {};

        /**
         * The default HTTP timeout for all API calls.
         * @type {Number}
         * @default 60000
         */
        this.timeout = 60000;

        /**
         * If set to false an additional timestamp parameter is added to all API GET calls to
         * prevent browser caching
         * @type {Boolean}
         * @default true
         */
        this.cache = true;

        /**
         * If set to true, the client will save the cookies from each server
         * response, and return them in the next request.
         * @default false
         */
        this.enableCookies = false;

        /*
         * Used to save and return cookies in a node.js (non-browser) setting,
         * if this.enableCookies is set to true.
         */
        if (typeof window === 'undefined') {
            this.agent = new superagent.agent();
        }

    };

    /**
     * Returns a string representation for an actual parameter.
     * @param param The actual parameter.
     * @returns {String} The string representation of <code>param</code>.
     */
    exports.prototype.paramToString = function (param) {
        if (param == undefined || param == null) {
            return '';
        }
        if (param instanceof Date) {
            return param.toJSON();
        }
        return param.toString();
    };

    /**
     * Builds full URL by appending the given path to the base URL and replacing path parameter place-holders with parameter values.
     * NOTE: query parameters are not handled here.
     * @param {String} path The path to append to the base URL.
     * @param {Object} pathParams The parameter values to append.
     * @returns {String} The encoded path with parameter values substituted.
     */
    exports.prototype.buildUrl = function (path, pathParams) {
        if (!path.match(/^\//)) {
            path = '/' + path;
        }
        var url = this.basePath + path;
        var _this = this;
        url = url.replace(/\{([\w-]+)\}/g, function (fullMatch, key) {
            var value;
            if (pathParams.hasOwnProperty(key)) {
                value = _this.paramToString(pathParams[key]);
            } else {
                value = fullMatch;
            }
            return encodeURIComponent(value);
        });
        return url;
    };

    /**
     * Checks whether the given content type represents JSON.<br>
     * JSON content type examples:<br>
     * <ul>
     * <li>application/json</li>
     * <li>application/json; charset=UTF8</li>
     * <li>APPLICATION/JSON</li>
     * </ul>
     * @param {String} contentType The MIME content type to check.
     * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
     */
    exports.prototype.isJsonMime = function (contentType) {
        return Boolean(contentType != null && contentType.match(/^application\/json(;.*)?$/i));
    };

    /**
     * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
     * @param {Array.<String>} contentTypes
     * @returns {String} The chosen content type, preferring JSON.
     */
    exports.prototype.jsonPreferredMime = function (contentTypes) {
        for (var i = 0; i < contentTypes.length; i++) {
            if (this.isJsonMime(contentTypes[i])) {
                return contentTypes[i];
            }
        }
        return contentTypes[0];
    };

    /**
     * Checks whether the given parameter value represents file-like content.
     * @param param The parameter to check.
     * @returns {Boolean} <code>true</code> if <code>param</code> represents a file.
     */
    exports.prototype.isFileParam = function (param) {
        // fs.ReadStream in Node.js and Electron (but not in runtime like browserify)
        if (typeof require === 'function') {
            var fs;
            try {
                fs = require('fs');
            } catch (err) {
            }
            if (fs && fs.ReadStream && param instanceof fs.ReadStream) {
                return true;
            }
        }
        // Buffer in Node.js
        if (typeof Buffer === 'function' && param instanceof Buffer) {
            return true;
        }
        // Blob in browser
        if (typeof Blob === 'function' && param instanceof Blob) {
            return true;
        }
        // File in browser (it seems File object is also instance of Blob, but keep this for safe)
        if (typeof File === 'function' && param instanceof File) {
            return true;
        }
        return false;
    };

    /**
     * Normalizes parameter values:
     * <ul>
     * <li>remove nils</li>
     * <li>keep files and arrays</li>
     * <li>format to string with `paramToString` for other cases</li>
     * </ul>
     * @param {Object.<String, Object>} params The parameters as object properties.
     * @returns {Object.<String, Object>} normalized parameters.
     */
    exports.prototype.normalizeParams = function (params) {
        var newParams = {};
        for (var key in params) {
            if (params.hasOwnProperty(key) && params[key] != undefined && params[key] != null) {
                var value = params[key];
                if (this.isFileParam(value) || Array.isArray(value)) {
                    newParams[key] = value;
                } else {
                    newParams[key] = this.paramToString(value);
                }
            }
        }
        return newParams;
    };

    /**
     * Enumeration of collection format separator strategies.
     * @enum {String}
     * @readonly
     */
    exports.CollectionFormatEnum = {
        /**
         * Comma-separated values. Value: <code>csv</code>
         * @const
         */
        CSV: ',',
        /**
         * Space-separated values. Value: <code>ssv</code>
         * @const
         */
        SSV: ' ',
        /**
         * Tab-separated values. Value: <code>tsv</code>
         * @const
         */
        TSV: '\t',
        /**
         * Pipe(|)-separated values. Value: <code>pipes</code>
         * @const
         */
        PIPES: '|',
        /**
         * Native array. Value: <code>multi</code>
         * @const
         */
        MULTI: 'multi'
    };

    /**
     * Builds a string representation of an array-type actual parameter, according to the given collection format.
     * @param {Array} param An array parameter.
     * @param {module:ApiClient.CollectionFormatEnum} collectionFormat The array element separator strategy.
     * @returns {String|Array} A string representation of the supplied collection, using the specified delimiter. Returns
     * <code>param</code> as is if <code>collectionFormat</code> is <code>multi</code>.
     */
    exports.prototype.buildCollectionParam = function buildCollectionParam(param, collectionFormat) {
        if (param == null) {
            return null;
        }
        switch (collectionFormat) {
            case 'csv':
                return param.map(this.paramToString).join(',');
            case 'ssv':
                return param.map(this.paramToString).join(' ');
            case 'tsv':
                return param.map(this.paramToString).join('\t');
            case 'pipes':
                return param.map(this.paramToString).join('|');
            case 'multi':
                // return the array directly as SuperAgent will handle it as expected
                return param.map(this.paramToString);
            default:
                throw new Error('Unknown collection format: ' + collectionFormat);
        }
    };

    /**
     * Applies authentication headers to the request.
     * @param {Object} request The request object created by a <code>superagent()</code> call.
     * @param {Array.<String>} authNames An array of authentication method names.
     */
    exports.prototype.applyAuthToRequest = function (request, authNames) {
        var _this = this;
        authNames.forEach(function (authName) {
            var auth = _this.authentications[authName];
            switch (auth.type) {
                case 'basic':
                    if (auth.username || auth.password) {
                        request.auth(auth.username || '', auth.password || '');
                    }
                    break;
                case 'apiKey':
                    if (auth.apiKey) {
                        var data = {};
                        if (auth.apiKeyPrefix) {
                            data[auth.name] = auth.apiKeyPrefix + ' ' + auth.apiKey;
                        } else {
                            data[auth.name] = auth.apiKey;
                        }
                        if (auth['in'] === 'header') {
                            request.set(data);
                        } else {
                            request.query(data);
                        }
                    }
                    break;
                case 'oauth2':
                    if (auth.accessToken) {
                        request.set({'Authorization': 'Bearer ' + auth.accessToken});
                    }
                    break;
                default:
                    throw new Error('Unknown authentication type: ' + auth.type);
            }
        });
    };

    /**
     * Deserializes an HTTP response body into a value of the specified type.
     * @param {Object} response A SuperAgent response object.
     * @param {(String|Array.<String>|Object.<String, Object>|Function)} returnType The type to return. Pass a string for simple types
     * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
     * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
     * all properties on <code>data<code> will be converted to this type.
     * @returns A value of the specified type.
     */
    exports.prototype.deserialize = function deserialize(response, returnType) {
        if (response == null || returnType == null || response.status == 204) {
            return null;
        }
        // Rely on SuperAgent for parsing response body.
        // See http://visionmedia.github.io/superagent/#parsing-response-bodies
        var data = response.body;
        if (data == null || (typeof data === 'object' && typeof data.length === 'undefined' && !Object.keys(data).length)) {
            // SuperAgent does not always produce a body; use the unparsed response as a fallback
            data = response.text;
        }
        return exports.convertToType(data, returnType);
    };

    /**
     * Callback function to receive the result of the operation.
     * @callback module:ApiClient~callApiCallback
     * @param {String} error Error message, if any.
     * @param data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Invokes the REST service using the supplied settings and parameters.
     * @param {String} path The base URL to invoke.
     * @param {String} httpMethod The HTTP method to use.
     * @param {Object.<String, String>} pathParams A map of path parameters and their values.
     * @param {Object.<String, Object>} queryParams A map of query parameters and their values.
     * @param {Object.<String, Object>} headerParams A map of header parameters and their values.
     * @param {Object.<String, Object>} formParams A map of form parameters and their values.
     * @param {Object} bodyParam The value to pass as the request body.
     * @param {Array.<String>} authNames An array of authentication type names.
     * @param {Array.<String>} contentTypes An array of request MIME types.
     * @param {Array.<String>} accepts An array of acceptable response MIME types.
     * @param {(String|Array|ObjectFunction)} returnType The required type to return; can be a string for simple types or the
     * constructor for a complex type.
     * @param {module:ApiClient~callApiCallback} callback The callback function.
     * @returns {Object} The SuperAgent request object.
     */
    exports.prototype.callApi = function callApi(path, httpMethod, pathParams,
                                                 queryParams, headerParams, formParams, bodyParam, authNames, contentTypes, accepts,
                                                 returnType, callback) {

        var _this = this;
        var url = this.buildUrl(path, pathParams);
        var request = superagent(httpMethod, url);

        // apply authentications
        this.applyAuthToRequest(request, authNames);

        // set query parameters
        if (httpMethod.toUpperCase() === 'GET' && this.cache === false) {
            queryParams['_'] = new Date().getTime();
        }
        request.query(this.normalizeParams(queryParams));

        // set header parameters
        request.set(this.defaultHeaders).set(this.normalizeParams(headerParams));

        // set request timeout
        request.timeout(this.timeout);

        var contentType = this.jsonPreferredMime(contentTypes);
        if (contentType) {
            // Issue with superagent and multipart/form-data (https://github.com/visionmedia/superagent/issues/746)
            if (contentType != 'multipart/form-data') {
                request.type(contentType);
            }
        } else if (!request.header['Content-Type']) {
            request.type('application/json');
        }

        if (contentType === 'application/x-www-form-urlencoded') {
            request.send(querystring.stringify(this.normalizeParams(formParams)));
        } else if (contentType == 'multipart/form-data') {
            var _formParams = this.normalizeParams(formParams);
            for (var key in _formParams) {
                if (_formParams.hasOwnProperty(key)) {
                    if (this.isFileParam(_formParams[key])) {
                        // file field
                        request.attach(key, _formParams[key]);
                    } else {
                        request.field(key, _formParams[key]);
                    }
                }
            }
        } else if (bodyParam) {
            request.send(bodyParam);
        }

        var accept = this.jsonPreferredMime(accepts);
        if (accept) {
            request.accept(accept);
        }

        if (returnType === 'Blob') {
            request.responseType('blob');
        } else if (returnType === 'String') {
            request.responseType('string');
        }

        // Attach previously saved cookies, if enabled
        if (this.enableCookies) {
            if (typeof window === 'undefined') {
                this.agent.attachCookies(request);
            }
            else {
                request.withCredentials();
            }
        }


        request.end(function (error, response) {
            if (callback) {
                var data = null;
                if (!error) {
                    try {
                        data = _this.deserialize(response, returnType);
                        if (_this.enableCookies && typeof window === 'undefined') {
                            _this.agent.saveCookies(response);
                        }
                    } catch (err) {
                        error = err;
                    }
                }
                callback(error, data, response);
            }
        });

        return request;
    };

    /**
     * Parses an ISO-8601 string representation of a date value.
     * @param {String} str The date value as a string.
     * @returns {Date} The parsed date object.
     */
    exports.parseDate = function (str) {
        return new Date(str.replace(/T/i, ' '));
    };

    /**
     * Converts a value to the specified type.
     * @param {(String|Object)} data The data to convert, as a string or object.
     * @param {(String|Array.<String>|Object.<String, Object>|Function)} type The type to return. Pass a string for simple types
     * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
     * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
     * all properties on <code>data<code> will be converted to this type.
     * @returns An instance of the specified type or null or undefined if data is null or undefined.
     */
    exports.convertToType = function (data, type) {
        if (data === null || data === undefined)
            return data

        switch (type) {
            case 'Boolean':
                return Boolean(data);
            case 'Integer':
                return parseInt(data, 10);
            case 'Number':
                return parseFloat(data);
            case 'String':
                return String(data);
            case 'Date':
                return this.parseDate(String(data));
            case 'Blob':
                return data;
            default:
                if (type === Object) {
                    // generic object, return directly
                    return data;
                } else if (typeof type === 'function') {
                    // for model type like: User
                    return type.constructFromObject(data);
                } else if (Array.isArray(type)) {
                    // for array type like: ['String']
                    var itemType = type[0];
                    return data.map(function (item) {
                        return exports.convertToType(item, itemType);
                    });
                } else if (typeof type === 'object') {
                    // for plain object type like: {'String': 'Integer'}
                    var keyType, valueType;
                    for (var k in type) {
                        if (type.hasOwnProperty(k)) {
                            keyType = k;
                            valueType = type[k];
                            break;
                        }
                    }
                    var result = {};
                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            var key = exports.convertToType(k, keyType);
                            var value = exports.convertToType(data[k], valueType);
                            result[key] = value;
                        }
                    }
                    return result;
                } else {
                    // for unknown type, return the data directly
                    return data;
                }
        }
    };

    /**
     * Constructs a new map or array model from REST data.
     * @param data {Object|Array} The REST data.
     * @param obj {Object|Array} The target object or array.
     */
    exports.constructFromObject = function (data, obj, itemType) {
        if (Array.isArray(data)) {
            for (var i = 0; i < data.length; i++) {
                if (data.hasOwnProperty(i))
                    obj[i] = exports.convertToType(data[i], itemType);
            }
        } else {
            for (var k in data) {
                if (data.hasOwnProperty(k))
                    obj[k] = exports.convertToType(data[k], itemType);
            }
        }
    };

    /**
     * The default API client implementation.
     * @type {module:ApiClient}
     */
    exports.instance = new exports();

    return exports;
}));

}).call(this,require("buffer").Buffer)

},{"buffer":28,"fs":27,"querystring":32,"superagent":2}],10:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/ParameterList'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('../model/ParameterList'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.BuildApi = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.ParameterList);
    }
}(this, function (ApiClient, ParameterList) {
    'use strict';

    /**
     * Build service.
     * @module api/BuildApi
     * @version 1.0.7
     */

    /**
     * Constructs a new BuildApi.
     * @alias module:api/BuildApi
     * @class
     * @param {module:ApiClient} apiClient Optional API client implementation to use,
     * default to {@link module:ApiClient#instance} if unspecified.
     */
    var exports = function (apiClient) {
        this.apiClient = apiClient || ApiClient.instance;


        /**
         * Callback function to receive the result of the buildANN operation.
         * @callback module:api/BuildApi~buildANNCallback
         * @param {String} error Error message, if any.
         * @param data This operation does not return a value.
         * @param {String} response The complete HTTP response.
         */

        /**
         * passes all learning and ANN parameters to the server
         * Includes learning parameters and ANN topology
         * @param {module:model/ParameterList} inputParameters object with all tunable parameters
         * @param {module:api/BuildApi~buildANNCallback} callback The callback function, accepting three arguments: error, data, response
         */
        this.buildANN = function (inputParameters, callback) {
            var postBody = inputParameters;

            // verify the required parameter 'inputParameters' is set
            if (inputParameters === undefined || inputParameters === null) {
                throw new Error("Missing the required parameter 'inputParameters' when calling buildANN");
            }


            var pathParams = {};
            var queryParams = {};
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = null;

            return this.apiClient.callApi(
                '/build/buildANN', 'POST',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getInputShape operation.
         * @callback module:api/BuildApi~getInputShapeCallback
         * @param {String} error Error message, if any.
         * @param {Array.<'Number'>} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns the input shape of the train data
         * returns the input shape of the train data
         * @param {Object} opts Optional parameters
         * @param {String} opts.datasetName name of the dataset (default to train_data)
         * @param {module:api/BuildApi~getInputShapeCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link Array.<'Number'>}
         */
        this.getInputShape = function (opts, callback) {
            opts = opts || {};
            var postBody = null;


            var pathParams = {};
            var queryParams = {
                'dataset_name': opts['datasetName']
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = ['Number'];

            return this.apiClient.callApi(
                '/build/getInputShape', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }
    };

    return exports;
}));

},{"../ApiClient":9,"../model/ParameterList":20}],11:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/ImageData'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('../model/ImageData'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.LoadApi = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.ImageData);
    }
}(this, function (ApiClient, ImageData) {
    'use strict';

    /**
     * Load service.
     * @module api/LoadApi
     * @version 1.0.7
     */

    /**
     * Constructs a new LoadApi.
     * @alias module:api/LoadApi
     * @class
     * @param {module:ApiClient} apiClient Optional API client implementation to use,
     * default to {@link module:ApiClient#instance} if unspecified.
     */
    var exports = function (apiClient) {
        this.apiClient = apiClient || ApiClient.instance;


        /**
         * Callback function to receive the result of the getImageBatch operation.
         * @callback module:api/LoadApi~getImageBatchCallback
         * @param {String} error Error message, if any.
         * @param {module:model/ImageData} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns the next batch of input/output images
         * images are encoded as png byte strings
         * @param {Object} opts Optional parameters
         * @param {Number} opts.batchSize defines the number of return images (default to 100)
         * @param {String} opts.datasetname name for dataset on the server (default to train_data)
         * @param {String} opts.sortBy defines the sorting of the input images
         * @param {String} opts.filter the values which should be filtered (whitelist)
         * @param {Boolean} opts.output if true returns AE output Images instead of input Images (default to false)
         * @param {module:api/LoadApi~getImageBatchCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/ImageData}
         */
        this.getImageBatch = function (opts, callback) {
            opts = opts || {};
            var postBody = null;


            var pathParams = {};
            var queryParams = {
                'batch_size': opts['batchSize'],
                'datasetname': opts['datasetname'],
                'sort_by': opts['sortBy'],
                'filter': opts['filter'],
                'output': opts['output']
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = ImageData;

            return this.apiClient.callApi(
                '/load/getImageBatch', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getImageById operation.
         * @callback module:api/LoadApi~getImageByIdCallback
         * @param {String} error Error message, if any.
         * @param {module:model/ImageData} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns a single input/output image
         * images are encoded as png byte strings
         * @param {Number} id defines the id of the images
         * @param {Object} opts Optional parameters
         * @param {String} opts.datasetname name for dataset on the server (default to train_data)
         * @param {String} opts.sortBy defines the sorting of the input images
         * @param {String} opts.filter the values which should be filtered (whitelist)
         * @param {Boolean} opts.output if true returns AE output Images instead of input Images (default to false)
         * @param {module:api/LoadApi~getImageByIdCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/ImageData}
         */
        this.getImageById = function (id, opts, callback) {
            opts = opts || {};
            var postBody = null;

            // verify the required parameter 'id' is set
            if (id === undefined || id === null) {
                throw new Error("Missing the required parameter 'id' when calling getImageById");
            }


            var pathParams = {};
            var queryParams = {
                'id': id,
                'datasetname': opts['datasetname'],
                'sort_by': opts['sortBy'],
                'filter': opts['filter'],
                'output': opts['output']
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = ImageData;

            return this.apiClient.callApi(
                '/load/getImageById', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getImages operation.
         * @callback module:api/LoadApi~getImagesCallback
         * @param {String} error Error message, if any.
         * @param {module:model/ImageData} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns a subset of input/output images
         * images are encoded as png byte strings
         * @param {Number} startIdx name for dataset on the server
         * @param {Number} endIdx name for dataset on the server
         * @param {Object} opts Optional parameters
         * @param {String} opts.datasetname name for dataset on the server (default to train_data)
         * @param {String} opts.sortBy defines the sorting of the input images
         * @param {String} opts.filter the values which should be filtered (whitelist)
         * @param {Boolean} opts.output if true returns AE output Images instead of input Images (default to false)
         * @param {module:api/LoadApi~getImagesCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/ImageData}
         */
        this.getImages = function (startIdx, endIdx, opts, callback) {
            opts = opts || {};
            var postBody = null;

            // verify the required parameter 'startIdx' is set
            if (startIdx === undefined || startIdx === null) {
                throw new Error("Missing the required parameter 'startIdx' when calling getImages");
            }

            // verify the required parameter 'endIdx' is set
            if (endIdx === undefined || endIdx === null) {
                throw new Error("Missing the required parameter 'endIdx' when calling getImages");
            }


            var pathParams = {};
            var queryParams = {
                'start_idx': startIdx,
                'end_idx': endIdx,
                'datasetname': opts['datasetname'],
                'sort_by': opts['sortBy'],
                'filter': opts['filter'],
                'output': opts['output']
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = ImageData;

            return this.apiClient.callApi(
                '/load/getImages', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getRandomImages operation.
         * @callback module:api/LoadApi~getRandomImagesCallback
         * @param {String} error Error message, if any.
         * @param {module:model/ImageData} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns the next batch of input/output images
         * images are encoded as png byte strings
         * @param {Object} opts Optional parameters
         * @param {Number} opts.batchSize defines the number of return images (default to 100)
         * @param {String} opts.datasetname name for dataset on the server (default to train_data)
         * @param {String} opts.sortBy defines the sorting of the input images
         * @param {String} opts.filter the values which should be filtered (whitelist)
         * @param {Boolean} opts.output if true returns AE output Images instead of input Images (default to false)
         * @param {module:api/LoadApi~getRandomImagesCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/ImageData}
         */
        this.getRandomImages = function (opts, callback) {
            opts = opts || {};
            var postBody = null;


            var pathParams = {};
            var queryParams = {
                'batch_size': opts['batchSize'],
                'datasetname': opts['datasetname'],
                'sort_by': opts['sortBy'],
                'filter': opts['filter'],
                'output': opts['output']
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = ImageData;

            return this.apiClient.callApi(
                '/load/getRandomImages', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the loadFile operation.
         * @callback module:api/LoadApi~loadFileCallback
         * @param {String} error Error message, if any.
         * @param data This operation does not return a value.
         * @param {String} response The complete HTTP response.
         */

        /**
         * Load a train/test data file
         * Load a data file in different data formats
         * @param {String} filename
         * @param {Object} opts Optional parameters
         * @param {String} opts.datasetname name for dataset on the server (default to train_data)
         * @param {Boolean} opts.readLabels true to read labels (default to false)
         * @param {String} opts.dataType determines the data format of the input file (default to auto)
         * @param {module:api/LoadApi~loadFileCallback} callback The callback function, accepting three arguments: error, data, response
         */
        this.loadFile = function (filename, opts, callback) {
            opts = opts || {};
            var postBody = null;

            // verify the required parameter 'filename' is set
            if (filename === undefined || filename === null) {
                throw new Error("Missing the required parameter 'filename' when calling loadFile");
            }


            var pathParams = {};
            var queryParams = {
                'filename': filename,
                'datasetname': opts['datasetname'],
                'read_labels': opts['readLabels'],
                'data_type': opts['dataType']
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = null;

            return this.apiClient.callApi(
                '/load/loadFile', 'POST',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }
    };

    return exports;
}));

},{"../ApiClient":9,"../model/ImageData":19}],12:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/ProcessedImageData', 'model/TrainPerformance', 'model/TrainStatus'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('../model/ProcessedImageData'), require('../model/TrainPerformance'), require('../model/TrainStatus'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.TrainApi = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.ProcessedImageData, root.ConvolutionalAutoencoder.TrainPerformance, root.ConvolutionalAutoencoder.TrainStatus);
    }
}(this, function (ApiClient, ProcessedImageData, TrainPerformance, TrainStatus) {
    'use strict';

    /**
     * Train service.
     * @module api/TrainApi
     * @version 1.0.7
     */

    /**
     * Constructs a new TrainApi.
     * @alias module:api/TrainApi
     * @class
     * @param {module:ApiClient} apiClient Optional API client implementation to use,
     * default to {@link module:ApiClient#instance} if unspecified.
     */
    var exports = function (apiClient) {
        this.apiClient = apiClient || ApiClient.instance;


        /**
         * Callback function to receive the result of the controlTraining operation.
         * @callback module:api/TrainApi~controlTrainingCallback
         * @param {String} error Error message, if any.
         * @param data This operation does not return a value.
         * @param {String} response The complete HTTP response.
         */

        /**
         * starts, pauses and stops the training
         * uses a string enum
         * @param {module:model/TrainStatus} trainStatus new status for training
         * @param {module:api/TrainApi~controlTrainingCallback} callback The callback function, accepting three arguments: error, data, response
         */
        this.controlTraining = function (trainStatus, callback) {
            var postBody = trainStatus;

            // verify the required parameter 'trainStatus' is set
            if (trainStatus === undefined || trainStatus === null) {
                throw new Error("Missing the required parameter 'trainStatus' when calling controlTraining");
            }


            var pathParams = {};
            var queryParams = {};
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = null;

            return this.apiClient.callApi(
                '/train/controlTraining', 'POST',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getProcessedImageData operation.
         * @callback module:api/TrainApi~getProcessedImageDataCallback
         * @param {String} error Error message, if any.
         * @param {module:model/ProcessedImageData} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns a subset of the current train images and the corresponding latent representation and output
         *
         * @param {Number} setSize size of the image subset
         * @param {module:api/TrainApi~getProcessedImageDataCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/ProcessedImageData}
         */
        this.getProcessedImageData = function (setSize, callback) {
            var postBody = null;

            // verify the required parameter 'setSize' is set
            if (setSize === undefined || setSize === null) {
                throw new Error("Missing the required parameter 'setSize' when calling getProcessedImageData");
            }


            var pathParams = {};
            var queryParams = {
                'setSize': setSize
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = ProcessedImageData;

            return this.apiClient.callApi(
                '/train/getProcessedImageData', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getTrainPerformance operation.
         * @callback module:api/TrainApi~getTrainPerformanceCallback
         * @param {String} error Error message, if any.
         * @param {module:model/TrainPerformance} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns the next batch of scalar train variables
         * as list of dicts
         * @param {module:api/TrainApi~getTrainPerformanceCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/TrainPerformance}
         */
        this.getTrainPerformance = function (callback) {
            var postBody = null;


            var pathParams = {};
            var queryParams = {};
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = TrainPerformance;

            return this.apiClient.callApi(
                '/train/getTrainPerformance', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }
    };

    return exports;
}));

},{"../ApiClient":9,"../model/ProcessedImageData":22,"../model/TrainPerformance":23,"../model/TrainStatus":24}],13:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/ParameterList', 'model/ProcessedImageData', 'model/TrainPerformance', 'model/TrainStatus'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('../model/ParameterList'), require('../model/ProcessedImageData'), require('../model/TrainPerformance'), require('../model/TrainStatus'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.TuneApi = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.ParameterList, root.ConvolutionalAutoencoder.ProcessedImageData, root.ConvolutionalAutoencoder.TrainPerformance, root.ConvolutionalAutoencoder.TrainStatus);
    }
}(this, function (ApiClient, ParameterList, ProcessedImageData, TrainPerformance, TrainStatus) {
    'use strict';

    /**
     * Tune service.
     * @module api/TuneApi
     * @version 1.0.7
     */

    /**
     * Constructs a new TuneApi.
     * @alias module:api/TuneApi
     * @class
     * @param {module:ApiClient} apiClient Optional API client implementation to use,
     * default to {@link module:ApiClient#instance} if unspecified.
     */
    var exports = function (apiClient) {
        this.apiClient = apiClient || ApiClient.instance;


        /**
         * Callback function to receive the result of the controlTuning operation.
         * @callback module:api/TuneApi~controlTuningCallback
         * @param {String} error Error message, if any.
         * @param data This operation does not return a value.
         * @param {String} response The complete HTTP response.
         */

        /**
         * starts, pauses and stops the tuning
         *
         * @param {module:model/TrainStatus} trainStatus new status for training
         * @param {module:api/TuneApi~controlTuningCallback} callback The callback function, accepting three arguments: error, data, response
         */
        this.controlTuning = function (trainStatus, callback) {
            var postBody = trainStatus;

            // verify the required parameter 'trainStatus' is set
            if (trainStatus === undefined || trainStatus === null) {
                throw new Error("Missing the required parameter 'trainStatus' when calling controlTuning");
            }


            var pathParams = {};
            var queryParams = {};
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = null;

            return this.apiClient.callApi(
                '/tune/controlTuning', 'PUT',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getProcessedImageDataOfCurrentTuning operation.
         * @callback module:api/TuneApi~getProcessedImageDataOfCurrentTuningCallback
         * @param {String} error Error message, if any.
         * @param {module:model/ProcessedImageData} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns a subset of the current train images and the corresponding latent representation and output
         *
         * @param {Number} setSize size of the image subset
         * @param {module:api/TuneApi~getProcessedImageDataOfCurrentTuningCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/ProcessedImageData}
         */
        this.getProcessedImageDataOfCurrentTuning = function (setSize, callback) {
            var postBody = null;

            // verify the required parameter 'setSize' is set
            if (setSize === undefined || setSize === null) {
                throw new Error("Missing the required parameter 'setSize' when calling getProcessedImageDataOfCurrentTuning");
            }


            var pathParams = {};
            var queryParams = {
                'setSize': setSize
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = ProcessedImageData;

            return this.apiClient.callApi(
                '/tune/getProcessedImageDataOfCurrentTuning', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getTrainPerformanceOfCurrentTuning operation.
         * @callback module:api/TuneApi~getTrainPerformanceOfCurrentTuningCallback
         * @param {String} error Error message, if any.
         * @param {module:model/TrainPerformance} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns the next batch of scalar train variables
         * as list of dicts
         * @param {module:api/TuneApi~getTrainPerformanceOfCurrentTuningCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/TrainPerformance}
         */
        this.getTrainPerformanceOfCurrentTuning = function (callback) {
            var postBody = null;


            var pathParams = {};
            var queryParams = {};
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = TrainPerformance;

            return this.apiClient.callApi(
                '/tune/getTrainPerformanceOfCurrentTuning', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the passANNParameterLists operation.
         * @callback module:api/TuneApi~passANNParameterListsCallback
         * @param {String} error Error message, if any.
         * @param data This operation does not return a value.
         * @param {String} response The complete HTTP response.
         */

        /**
         * passes all learning and ANN parameters to the server
         * Includes learning parameters and ANN topology as lists
         * @param {module:model/ParameterList} inputParameterLists object with all tunable parameter lists
         * @param {module:api/TuneApi~passANNParameterListsCallback} callback The callback function, accepting three arguments: error, data, response
         */
        this.passANNParameterLists = function (inputParameterLists, callback) {
            var postBody = inputParameterLists;

            // verify the required parameter 'inputParameterLists' is set
            if (inputParameterLists === undefined || inputParameterLists === null) {
                throw new Error("Missing the required parameter 'inputParameterLists' when calling passANNParameterLists");
            }


            var pathParams = {};
            var queryParams = {};
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = null;

            return this.apiClient.callApi(
                '/tune/buildGridSearchANN', 'POST',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }
    };

    return exports;
}));

},{"../ApiClient":9,"../model/ParameterList":20,"../model/ProcessedImageData":22,"../model/TrainPerformance":23,"../model/TrainStatus":24}],14:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/ClusterParameters', 'model/Clustering', 'model/Image', 'model/Point2D'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('../model/ClusterParameters'), require('../model/Clustering'), require('../model/Image'), require('../model/Point2D'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.VisualizeApi = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.ClusterParameters, root.ConvolutionalAutoencoder.Clustering, root.ConvolutionalAutoencoder.Image, root.ConvolutionalAutoencoder.Point2D);
    }
}(this, function (ApiClient, ClusterParameters, Clustering, Image, Point2D) {
    'use strict';

    /**
     * Visualize service.
     * @module api/VisualizeApi
     * @version 1.0.7
     */

    /**
     * Constructs a new VisualizeApi.
     * @alias module:api/VisualizeApi
     * @class
     * @param {module:ApiClient} apiClient Optional API client implementation to use,
     * default to {@link module:ApiClient#instance} if unspecified.
     */
    var exports = function (apiClient) {
        this.apiClient = apiClient || ApiClient.instance;


        /**
         * Callback function to receive the result of the generateImageFromSinglePoint operation.
         * @callback module:api/VisualizeApi~generateImageFromSinglePointCallback
         * @param {String} error Error message, if any.
         * @param {module:model/Image} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * generates the AE output from a given point of the sample distribution
         *
         * @param {module:model/Point2D} point2D 2D Point of the sample distribution
         * @param {module:api/VisualizeApi~generateImageFromSinglePointCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/Image}
         */
        this.generateImageFromSinglePoint = function (point2D, callback) {
            var postBody = point2D;

            // verify the required parameter 'point2D' is set
            if (point2D === undefined || point2D === null) {
                throw new Error("Missing the required parameter 'point2D' when calling generateImageFromSinglePoint");
            }


            var pathParams = {};
            var queryParams = {};
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = Image;

            return this.apiClient.callApi(
                '/visualize/generateImageFromSinglePoint', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }

        /**
         * Callback function to receive the result of the getHiddenLayerLatentClustering operation.
         * @callback module:api/VisualizeApi~getHiddenLayerLatentClusteringCallback
         * @param {String} error Error message, if any.
         * @param {module:model/Clustering} data The data returned by the service call.
         * @param {String} response The complete HTTP response.
         */

        /**
         * returns the clustering of the latent representation of a hidden layer
         *
         * @param {Object} opts Optional parameters
         * @param {String} opts.algorithm determines the clutering algorithm
         * @param {String} opts.datasetName determines the dataset which should be clustered (default to train_data)
         * @param {String} opts.dimensionReduction determines the algorithm for dim reduction
         * @param {module:model/ClusterParameters} opts.clusterParameters determines the clutering parameters
         * @param {Number} opts.layer determines the hidden layer
         * @param {module:api/VisualizeApi~getHiddenLayerLatentClusteringCallback} callback The callback function, accepting three arguments: error, data, response
         * data is of type: {@link module:model/Clustering}
         */
        this.getHiddenLayerLatentClustering = function (opts, callback) {
            opts = opts || {};
            var postBody = opts['clusterParameters'];


            var pathParams = {};
            var queryParams = {
                'algorithm': opts['algorithm'],
                'dataset_name': opts['datasetName'],
                'dimension_reduction': opts['dimensionReduction'],
                'layer': opts['layer']
            };
            var headerParams = {};
            var formParams = {};

            var authNames = [];
            var contentTypes = ['application/json'];
            var accepts = ['application/json'];
            var returnType = Clustering;

            return this.apiClient.callApi(
                '/visualize/getHiddenLayerLatentClustering', 'GET',
                pathParams, queryParams, headerParams, formParams, postBody,
                authNames, contentTypes, accepts, returnType, callback
            );
        }
    };

    return exports;
}));

},{"../ApiClient":9,"../model/ClusterParameters":16,"../model/Clustering":17,"../model/Image":18,"../model/Point2D":21}],15:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/ClusterParameters', 'model/Clustering', 'model/Image', 'model/ImageData', 'model/ParameterList', 'model/Point2D', 'model/ProcessedImageData', 'model/TrainPerformance', 'model/TrainStatus', 'api/BuildApi', 'api/LoadApi', 'api/TrainApi', 'api/TuneApi', 'api/VisualizeApi'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('./ApiClient'), require('./model/ClusterParameters'), require('./model/Clustering'), require('./model/Image'), require('./model/ImageData'), require('./model/ParameterList'), require('./model/Point2D'), require('./model/ProcessedImageData'), require('./model/TrainPerformance'), require('./model/TrainStatus'), require('./api/BuildApi'), require('./api/LoadApi'), require('./api/TrainApi'), require('./api/TuneApi'), require('./api/VisualizeApi'));
    }
}(function (ApiClient, ClusterParameters, Clustering, Image, ImageData, ParameterList, Point2D, ProcessedImageData, TrainPerformance, TrainStatus, BuildApi, LoadApi, TrainApi, TuneApi, VisualizeApi) {
    'use strict';

    /**
     * WebUI_to_build_train_and_tune_a_Convolutional_Autoencoder.<br>
     * The <code>index</code> module provides access to constructors for all the classes which comprise the public API.
     * <p>
     * An AMD (recommended!) or CommonJS application will generally do something equivalent to the following:
     * <pre>
     * var ConvolutionalAutoencoder = require('index'); // See note below*.
     * var xxxSvc = new ConvolutionalAutoencoder.XxxApi(); // Allocate the API class we're going to use.
     * var yyyModel = new ConvolutionalAutoencoder.Yyy(); // Construct a model instance.
     * yyyModel.someProperty = 'someValue';
     * ...
     * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
     * ...
     * </pre>
     * <em>*NOTE: For a top-level AMD script, use require(['index'], function(){...})
     * and put the application logic within the callback function.</em>
     * </p>
     * <p>
     * A non-AMD browser application (discouraged) might do something like this:
     * <pre>
     * var xxxSvc = new ConvolutionalAutoencoder.XxxApi(); // Allocate the API class we're going to use.
     * var yyy = new ConvolutionalAutoencoder.Yyy(); // Construct a model instance.
     * yyyModel.someProperty = 'someValue';
     * ...
     * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
     * ...
     * </pre>
     * </p>
     * @module index
     * @version 1.0.7
     */
    var exports = {
        /**
         * The ApiClient constructor.
         * @property {module:ApiClient}
         */
        ApiClient: ApiClient,
        /**
         * The ClusterParameters model constructor.
         * @property {module:model/ClusterParameters}
         */
        ClusterParameters: ClusterParameters,
        /**
         * The Clustering model constructor.
         * @property {module:model/Clustering}
         */
        Clustering: Clustering,
        /**
         * The Image model constructor.
         * @property {module:model/Image}
         */
        Image: Image,
        /**
         * The ImageData model constructor.
         * @property {module:model/ImageData}
         */
        ImageData: ImageData,
        /**
         * The ParameterList model constructor.
         * @property {module:model/ParameterList}
         */
        ParameterList: ParameterList,
        /**
         * The Point2D model constructor.
         * @property {module:model/Point2D}
         */
        Point2D: Point2D,
        /**
         * The ProcessedImageData model constructor.
         * @property {module:model/ProcessedImageData}
         */
        ProcessedImageData: ProcessedImageData,
        /**
         * The TrainPerformance model constructor.
         * @property {module:model/TrainPerformance}
         */
        TrainPerformance: TrainPerformance,
        /**
         * The TrainStatus model constructor.
         * @property {module:model/TrainStatus}
         */
        TrainStatus: TrainStatus,
        /**
         * The BuildApi service constructor.
         * @property {module:api/BuildApi}
         */
        BuildApi: BuildApi,
        /**
         * The LoadApi service constructor.
         * @property {module:api/LoadApi}
         */
        LoadApi: LoadApi,
        /**
         * The TrainApi service constructor.
         * @property {module:api/TrainApi}
         */
        TrainApi: TrainApi,
        /**
         * The TuneApi service constructor.
         * @property {module:api/TuneApi}
         */
        TuneApi: TuneApi,
        /**
         * The VisualizeApi service constructor.
         * @property {module:api/VisualizeApi}
         */
        VisualizeApi: VisualizeApi
    };

    return exports;
}));

},{"./ApiClient":9,"./api/BuildApi":10,"./api/LoadApi":11,"./api/TrainApi":12,"./api/TuneApi":13,"./api/VisualizeApi":14,"./model/ClusterParameters":16,"./model/Clustering":17,"./model/Image":18,"./model/ImageData":19,"./model/ParameterList":20,"./model/Point2D":21,"./model/ProcessedImageData":22,"./model/TrainPerformance":23,"./model/TrainStatus":24}],16:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.ClusterParameters = factory(root.ConvolutionalAutoencoder.ApiClient);
    }
}(this, function (ApiClient) {
    'use strict';


    /**
     * The ClusterParameters model module.
     * @module model/ClusterParameters
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>ClusterParameters</code>.
     * @alias module:model/ClusterParameters
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>ClusterParameters</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ClusterParameters} obj Optional instance to populate.
     * @return {module:model/ClusterParameters} The populated <code>ClusterParameters</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('n_clusters')) {
                obj['n_clusters'] = ApiClient.convertToType(data['n_clusters'], 'Number');
            }
            if (data.hasOwnProperty('init')) {
                obj['init'] = ApiClient.convertToType(data['init'], 'String');
            }
            if (data.hasOwnProperty('n_init')) {
                obj['n_init'] = ApiClient.convertToType(data['n_init'], 'Number');
            }
            if (data.hasOwnProperty('max_iter')) {
                obj['max_iter'] = ApiClient.convertToType(data['max_iter'], 'Number');
            }
            if (data.hasOwnProperty('tol')) {
                obj['tol'] = ApiClient.convertToType(data['tol'], 'Number');
            }
            if (data.hasOwnProperty('precompute_distances')) {
                obj['precompute_distances'] = ApiClient.convertToType(data['precompute_distances'], 'String');
            }
            if (data.hasOwnProperty('verbose')) {
                obj['verbose'] = ApiClient.convertToType(data['verbose'], 'Number');
            }
            if (data.hasOwnProperty('random_state')) {
                obj['random_state'] = ApiClient.convertToType(data['random_state'], 'Number');
            }
            if (data.hasOwnProperty('copy_x')) {
                obj['copy_x'] = ApiClient.convertToType(data['copy_x'], 'Boolean');
            }
            if (data.hasOwnProperty('n_jobs')) {
                obj['n_jobs'] = ApiClient.convertToType(data['n_jobs'], 'Number');
            }
            if (data.hasOwnProperty('algorithm')) {
                obj['algorithm'] = ApiClient.convertToType(data['algorithm'], 'String');
            }
        }
        return obj;
    }

    /**
     * @member {Number} n_clusters
     */
    exports.prototype['n_clusters'] = undefined;
    /**
     * @member {String} init
     */
    exports.prototype['init'] = undefined;
    /**
     * @member {Number} n_init
     */
    exports.prototype['n_init'] = undefined;
    /**
     * @member {Number} max_iter
     */
    exports.prototype['max_iter'] = undefined;
    /**
     * @member {Number} tol
     */
    exports.prototype['tol'] = undefined;
    /**
     * @member {String} precompute_distances
     */
    exports.prototype['precompute_distances'] = undefined;
    /**
     * @member {Number} verbose
     */
    exports.prototype['verbose'] = undefined;
    /**
     * @member {Number} random_state
     */
    exports.prototype['random_state'] = undefined;
    /**
     * @member {Boolean} copy_x
     */
    exports.prototype['copy_x'] = undefined;
    /**
     * @member {Number} n_jobs
     */
    exports.prototype['n_jobs'] = undefined;
    /**
     * @member {String} algorithm
     */
    exports.prototype['algorithm'] = undefined;


    return exports;
}));



},{"../ApiClient":9}],17:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/Point2D'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('./Point2D'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.Clustering = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.Point2D);
    }
}(this, function (ApiClient, Point2D) {
    'use strict';


    /**
     * The Clustering model module.
     * @module model/Clustering
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>Clustering</code>.
     * @alias module:model/Clustering
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>Clustering</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Clustering} obj Optional instance to populate.
     * @return {module:model/Clustering} The populated <code>Clustering</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('minX')) {
                obj['minX'] = ApiClient.convertToType(data['minX'], 'Number');
            }
            if (data.hasOwnProperty('maxX')) {
                obj['maxX'] = ApiClient.convertToType(data['maxX'], 'Number');
            }
            if (data.hasOwnProperty('minY')) {
                obj['minY'] = ApiClient.convertToType(data['minY'], 'Number');
            }
            if (data.hasOwnProperty('maxY')) {
                obj['maxY'] = ApiClient.convertToType(data['maxY'], 'Number');
            }
            if (data.hasOwnProperty('nClusters')) {
                obj['nClusters'] = ApiClient.convertToType(data['nClusters'], 'Number');
            }
            if (data.hasOwnProperty('points')) {
                obj['points'] = ApiClient.convertToType(data['points'], [Point2D]);
            }
        }
        return obj;
    }

    /**
     * @member {Number} minX
     */
    exports.prototype['minX'] = undefined;
    /**
     * @member {Number} maxX
     */
    exports.prototype['maxX'] = undefined;
    /**
     * @member {Number} minY
     */
    exports.prototype['minY'] = undefined;
    /**
     * @member {Number} maxY
     */
    exports.prototype['maxY'] = undefined;
    /**
     * @member {Number} nClusters
     */
    exports.prototype['nClusters'] = undefined;
    /**
     * @member {Array.<module:model/Point2D>} points
     */
    exports.prototype['points'] = undefined;


    return exports;
}));



},{"../ApiClient":9,"./Point2D":21}],18:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.Image = factory(root.ConvolutionalAutoencoder.ApiClient);
    }
}(this, function (ApiClient) {
    'use strict';


    /**
     * The Image model module.
     * @module model/Image
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>Image</code>.
     * @alias module:model/Image
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>Image</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Image} obj Optional instance to populate.
     * @return {module:model/Image} The populated <code>Image</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('bytestring')) {
                obj['bytestring'] = ApiClient.convertToType(data['bytestring'], 'String');
            }
            if (data.hasOwnProperty('id')) {
                obj['id'] = ApiClient.convertToType(data['id'], 'Number');
            }
        }
        return obj;
    }

    /**
     * @member {String} bytestring
     */
    exports.prototype['bytestring'] = undefined;
    /**
     * @member {Number} id
     */
    exports.prototype['id'] = undefined;


    return exports;
}));



},{"../ApiClient":9}],19:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/Image'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('./Image'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.ImageData = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.Image);
    }
}(this, function (ApiClient, Image) {
    'use strict';


    /**
     * The ImageData model module.
     * @module model/ImageData
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>ImageData</code>.
     * @alias module:model/ImageData
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>ImageData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ImageData} obj Optional instance to populate.
     * @return {module:model/ImageData} The populated <code>ImageData</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('numImages')) {
                obj['numImages'] = ApiClient.convertToType(data['numImages'], 'Number');
            }
            if (data.hasOwnProperty('resX')) {
                obj['resX'] = ApiClient.convertToType(data['resX'], 'Number');
            }
            if (data.hasOwnProperty('resY')) {
                obj['resY'] = ApiClient.convertToType(data['resY'], 'Number');
            }
            if (data.hasOwnProperty('images')) {
                obj['images'] = ApiClient.convertToType(data['images'], [Image]);
            }
        }
        return obj;
    }

    /**
     * @member {Number} numImages
     */
    exports.prototype['numImages'] = undefined;
    /**
     * @member {Number} resX
     */
    exports.prototype['resX'] = undefined;
    /**
     * @member {Number} resY
     */
    exports.prototype['resY'] = undefined;
    /**
     * @member {Array.<module:model/Image>} images
     */
    exports.prototype['images'] = undefined;


    return exports;
}));



},{"../ApiClient":9,"./Image":18}],20:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.ParameterList = factory(root.ConvolutionalAutoencoder.ApiClient);
    }
}(this, function (ApiClient) {
    'use strict';


    /**
     * The ParameterList model module.
     * @module model/ParameterList
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>ParameterList</code>.
     * @alias module:model/ParameterList
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>ParameterList</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ParameterList} obj Optional instance to populate.
     * @return {module:model/ParameterList} The populated <code>ParameterList</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('input_shape')) {
                obj['input_shape'] = ApiClient.convertToType(data['input_shape'], [['Number']]);
            }
            if (data.hasOwnProperty('number_of_stacks')) {
                obj['number_of_stacks'] = ApiClient.convertToType(data['number_of_stacks'], [['Number']]);
            }
            if (data.hasOwnProperty('filter_sizes')) {
                obj['filter_sizes'] = ApiClient.convertToType(data['filter_sizes'], [['Number']]);
            }
            if (data.hasOwnProperty('mirror_weights')) {
                obj['mirror_weights'] = ApiClient.convertToType(data['mirror_weights'], ['Boolean']);
            }
            if (data.hasOwnProperty('activation_function')) {
                obj['activation_function'] = ApiClient.convertToType(data['activation_function'], ['String']);
            }
            if (data.hasOwnProperty('batch_size')) {
                obj['batch_size'] = ApiClient.convertToType(data['batch_size'], ['Number']);
            }
            if (data.hasOwnProperty('n_epochs')) {
                obj['n_epochs'] = ApiClient.convertToType(data['n_epochs'], ['Number']);
            }
            if (data.hasOwnProperty('use_tensorboard')) {
                obj['use_tensorboard'] = ApiClient.convertToType(data['use_tensorboard'], 'Boolean');
            }
            if (data.hasOwnProperty('verbose')) {
                obj['verbose'] = ApiClient.convertToType(data['verbose'], 'Boolean');
            }
            if (data.hasOwnProperty('learning_rate_function')) {
                obj['learning_rate_function'] = ApiClient.convertToType(data['learning_rate_function'], ['String']);
            }
            if (data.hasOwnProperty('lr_initial_learning_rate')) {
                obj['lr_initial_learning_rate'] = ApiClient.convertToType(data['lr_initial_learning_rate'], ['Number']);
            }
            if (data.hasOwnProperty('lr_decay_steps')) {
                obj['lr_decay_steps'] = ApiClient.convertToType(data['lr_decay_steps'], ['Number']);
            }
            if (data.hasOwnProperty('lr_decay_rate')) {
                obj['lr_decay_rate'] = ApiClient.convertToType(data['lr_decay_rate'], ['Number']);
            }
            if (data.hasOwnProperty('lr_staircase')) {
                obj['lr_staircase'] = ApiClient.convertToType(data['lr_staircase'], ['Boolean']);
            }
            if (data.hasOwnProperty('lr_boundaries')) {
                obj['lr_boundaries'] = ApiClient.convertToType(data['lr_boundaries'], [['Number']]);
            }
            if (data.hasOwnProperty('lr_values')) {
                obj['lr_values'] = ApiClient.convertToType(data['lr_values'], [['Number']]);
            }
            if (data.hasOwnProperty('lr_end_learning_rate')) {
                obj['lr_end_learning_rate'] = ApiClient.convertToType(data['lr_end_learning_rate'], ['Number']);
            }
            if (data.hasOwnProperty('lr_power')) {
                obj['lr_power'] = ApiClient.convertToType(data['lr_power'], ['Number']);
            }
            if (data.hasOwnProperty('lr_cycle')) {
                obj['lr_cycle'] = ApiClient.convertToType(data['lr_cycle'], ['Boolean']);
            }
            if (data.hasOwnProperty('optimizer')) {
                obj['optimizer'] = ApiClient.convertToType(data['optimizer'], ['String']);
            }
            if (data.hasOwnProperty('momentum')) {
                obj['momentum'] = ApiClient.convertToType(data['momentum'], ['Number']);
            }
            if (data.hasOwnProperty('random_function_for_weights')) {
                obj['random_function_for_weights'] = ApiClient.convertToType(data['random_function_for_weights'], ['String']);
            }
            if (data.hasOwnProperty('rw_alpha')) {
                obj['rw_alpha'] = ApiClient.convertToType(data['rw_alpha'], ['Number']);
            }
            if (data.hasOwnProperty('rw_beta')) {
                obj['rw_beta'] = ApiClient.convertToType(data['rw_beta'], ['Number']);
            }
            if (data.hasOwnProperty('rw_mean')) {
                obj['rw_mean'] = ApiClient.convertToType(data['rw_mean'], ['Number']);
            }
            if (data.hasOwnProperty('rw_stddev')) {
                obj['rw_stddev'] = ApiClient.convertToType(data['rw_stddev'], ['Number']);
            }
            if (data.hasOwnProperty('rw_lam')) {
                obj['rw_lam'] = ApiClient.convertToType(data['rw_lam'], ['Number']);
            }
            if (data.hasOwnProperty('rw_minval')) {
                obj['rw_minval'] = ApiClient.convertToType(data['rw_minval'], ['Number']);
            }
            if (data.hasOwnProperty('rw_maxval')) {
                obj['rw_maxval'] = ApiClient.convertToType(data['rw_maxval'], ['Number']);
            }
            if (data.hasOwnProperty('rw_seed')) {
                obj['rw_seed'] = ApiClient.convertToType(data['rw_seed'], ['Number']);
            }
            if (data.hasOwnProperty('random_function_for_biases')) {
                obj['random_function_for_biases'] = ApiClient.convertToType(data['random_function_for_biases'], ['String']);
            }
            if (data.hasOwnProperty('rb_alpha')) {
                obj['rb_alpha'] = ApiClient.convertToType(data['rb_alpha'], ['Number']);
            }
            if (data.hasOwnProperty('rb_beta')) {
                obj['rb_beta'] = ApiClient.convertToType(data['rb_beta'], ['Number']);
            }
            if (data.hasOwnProperty('rb_mean')) {
                obj['rb_mean'] = ApiClient.convertToType(data['rb_mean'], ['Number']);
            }
            if (data.hasOwnProperty('rb_stddev')) {
                obj['rb_stddev'] = ApiClient.convertToType(data['rb_stddev'], ['Number']);
            }
            if (data.hasOwnProperty('rb_lam')) {
                obj['rb_lam'] = ApiClient.convertToType(data['rb_lam'], ['Number']);
            }
            if (data.hasOwnProperty('rb_minval')) {
                obj['rb_minval'] = ApiClient.convertToType(data['rb_minval'], ['Number']);
            }
            if (data.hasOwnProperty('rb_maxval')) {
                obj['rb_maxval'] = ApiClient.convertToType(data['rb_maxval'], ['Number']);
            }
            if (data.hasOwnProperty('rb_seed')) {
                obj['rb_seed'] = ApiClient.convertToType(data['rb_seed'], ['Number']);
            }
            if (data.hasOwnProperty('session_saver_path')) {
                obj['session_saver_path'] = ApiClient.convertToType(data['session_saver_path'], 'String');
            }
            if (data.hasOwnProperty('load_prev_session')) {
                obj['load_prev_session'] = ApiClient.convertToType(data['load_prev_session'], 'Boolean');
            }
            if (data.hasOwnProperty('session_save_duration')) {
                obj['session_save_duration'] = ApiClient.convertToType(data['session_save_duration'], ['Number']);
            }
            if (data.hasOwnProperty('num_test_pictures')) {
                obj['num_test_pictures'] = ApiClient.convertToType(data['num_test_pictures'], ['Number']);
            }
        }
        return obj;
    }

    /**
     * @member {Array.<Array.<Number>>} input_shape
     */
    exports.prototype['input_shape'] = undefined;
    /**
     * @member {Array.<Array.<Number>>} number_of_stacks
     */
    exports.prototype['number_of_stacks'] = undefined;
    /**
     * @member {Array.<Array.<Number>>} filter_sizes
     */
    exports.prototype['filter_sizes'] = undefined;
    /**
     * @member {Array.<Boolean>} mirror_weights
     */
    exports.prototype['mirror_weights'] = undefined;
    /**
     * @member {Array.<String>} activation_function
     */
    exports.prototype['activation_function'] = undefined;
    /**
     * @member {Array.<Number>} batch_size
     */
    exports.prototype['batch_size'] = undefined;
    /**
     * @member {Array.<Number>} n_epochs
     */
    exports.prototype['n_epochs'] = undefined;
    /**
     * @member {Boolean} use_tensorboard
     */
    exports.prototype['use_tensorboard'] = undefined;
    /**
     * @member {Boolean} verbose
     */
    exports.prototype['verbose'] = undefined;
    /**
     * @member {Array.<String>} learning_rate_function
     */
    exports.prototype['learning_rate_function'] = undefined;
    /**
     * @member {Array.<Number>} lr_initial_learning_rate
     */
    exports.prototype['lr_initial_learning_rate'] = undefined;
    /**
     * @member {Array.<Number>} lr_decay_steps
     */
    exports.prototype['lr_decay_steps'] = undefined;
    /**
     * @member {Array.<Number>} lr_decay_rate
     */
    exports.prototype['lr_decay_rate'] = undefined;
    /**
     * @member {Array.<Boolean>} lr_staircase
     */
    exports.prototype['lr_staircase'] = undefined;
    /**
     * @member {Array.<Array.<Number>>} lr_boundaries
     */
    exports.prototype['lr_boundaries'] = undefined;
    /**
     * @member {Array.<Array.<Number>>} lr_values
     */
    exports.prototype['lr_values'] = undefined;
    /**
     * @member {Array.<Number>} lr_end_learning_rate
     */
    exports.prototype['lr_end_learning_rate'] = undefined;
    /**
     * @member {Array.<Number>} lr_power
     */
    exports.prototype['lr_power'] = undefined;
    /**
     * @member {Array.<Boolean>} lr_cycle
     */
    exports.prototype['lr_cycle'] = undefined;
    /**
     * @member {Array.<String>} optimizer
     */
    exports.prototype['optimizer'] = undefined;
    /**
     * @member {Array.<Number>} momentum
     */
    exports.prototype['momentum'] = undefined;
    /**
     * @member {Array.<String>} random_function_for_weights
     */
    exports.prototype['random_function_for_weights'] = undefined;
    /**
     * @member {Array.<Number>} rw_alpha
     */
    exports.prototype['rw_alpha'] = undefined;
    /**
     * @member {Array.<Number>} rw_beta
     */
    exports.prototype['rw_beta'] = undefined;
    /**
     * @member {Array.<Number>} rw_mean
     */
    exports.prototype['rw_mean'] = undefined;
    /**
     * @member {Array.<Number>} rw_stddev
     */
    exports.prototype['rw_stddev'] = undefined;
    /**
     * @member {Array.<Number>} rw_lam
     */
    exports.prototype['rw_lam'] = undefined;
    /**
     * @member {Array.<Number>} rw_minval
     */
    exports.prototype['rw_minval'] = undefined;
    /**
     * @member {Array.<Number>} rw_maxval
     */
    exports.prototype['rw_maxval'] = undefined;
    /**
     * @member {Array.<Number>} rw_seed
     */
    exports.prototype['rw_seed'] = undefined;
    /**
     * @member {Array.<String>} random_function_for_biases
     */
    exports.prototype['random_function_for_biases'] = undefined;
    /**
     * @member {Array.<Number>} rb_alpha
     */
    exports.prototype['rb_alpha'] = undefined;
    /**
     * @member {Array.<Number>} rb_beta
     */
    exports.prototype['rb_beta'] = undefined;
    /**
     * @member {Array.<Number>} rb_mean
     */
    exports.prototype['rb_mean'] = undefined;
    /**
     * @member {Array.<Number>} rb_stddev
     */
    exports.prototype['rb_stddev'] = undefined;
    /**
     * @member {Array.<Number>} rb_lam
     */
    exports.prototype['rb_lam'] = undefined;
    /**
     * @member {Array.<Number>} rb_minval
     */
    exports.prototype['rb_minval'] = undefined;
    /**
     * @member {Array.<Number>} rb_maxval
     */
    exports.prototype['rb_maxval'] = undefined;
    /**
     * @member {Array.<Number>} rb_seed
     */
    exports.prototype['rb_seed'] = undefined;
    /**
     * @member {String} session_saver_path
     */
    exports.prototype['session_saver_path'] = undefined;
    /**
     * @member {Boolean} load_prev_session
     */
    exports.prototype['load_prev_session'] = undefined;
    /**
     * @member {Array.<Number>} session_save_duration
     */
    exports.prototype['session_save_duration'] = undefined;
    /**
     * @member {Array.<Number>} num_test_pictures
     */
    exports.prototype['num_test_pictures'] = undefined;


    return exports;
}));



},{"../ApiClient":9}],21:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.Point2D = factory(root.ConvolutionalAutoencoder.ApiClient);
    }
}(this, function (ApiClient) {
    'use strict';


    /**
     * The Point2D model module.
     * @module model/Point2D
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>Point2D</code>.
     * @alias module:model/Point2D
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>Point2D</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/Point2D} obj Optional instance to populate.
     * @return {module:model/Point2D} The populated <code>Point2D</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('x')) {
                obj['x'] = ApiClient.convertToType(data['x'], 'Number');
            }
            if (data.hasOwnProperty('y')) {
                obj['y'] = ApiClient.convertToType(data['y'], 'Number');
            }
            if (data.hasOwnProperty('cluster')) {
                obj['cluster'] = ApiClient.convertToType(data['cluster'], 'Number');
            }
        }
        return obj;
    }

    /**
     * @member {Number} x
     */
    exports.prototype['x'] = undefined;
    /**
     * @member {Number} y
     */
    exports.prototype['y'] = undefined;
    /**
     * @member {Number} cluster
     */
    exports.prototype['cluster'] = undefined;


    return exports;
}));



},{"../ApiClient":9}],22:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient', 'model/Image'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'), require('./Image'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.ProcessedImageData = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.Image);
    }
}(this, function (ApiClient, Image) {
    'use strict';


    /**
     * The ProcessedImageData model module.
     * @module model/ProcessedImageData
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>ProcessedImageData</code>.
     * @alias module:model/ProcessedImageData
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>ProcessedImageData</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/ProcessedImageData} obj Optional instance to populate.
     * @return {module:model/ProcessedImageData} The populated <code>ProcessedImageData</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('inputLayer')) {
                obj['inputLayer'] = ApiClient.convertToType(data['inputLayer'], [Image]);
            }
            if (data.hasOwnProperty('latentLayer')) {
                obj['latentLayer'] = ApiClient.convertToType(data['latentLayer'], [Image]);
            }
            if (data.hasOwnProperty('outputLayer')) {
                obj['outputLayer'] = ApiClient.convertToType(data['outputLayer'], [Image]);
            }
        }
        return obj;
    }

    /**
     * @member {Array.<module:model/Image>} inputLayer
     */
    exports.prototype['inputLayer'] = undefined;
    /**
     * @member {Array.<module:model/Image>} latentLayer
     */
    exports.prototype['latentLayer'] = undefined;
    /**
     * @member {Array.<module:model/Image>} outputLayer
     */
    exports.prototype['outputLayer'] = undefined;


    return exports;
}));



},{"../ApiClient":9,"./Image":18}],23:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.TrainPerformance = factory(root.ConvolutionalAutoencoder.ApiClient);
    }
}(this, function (ApiClient) {
    'use strict';


    /**
     * The TrainPerformance model module.
     * @module model/TrainPerformance
     * @version 1.0.7
     */

    /**
     * Constructs a new <code>TrainPerformance</code>.
     * @alias module:model/TrainPerformance
     * @class
     */
    var exports = function () {
        var _this = this;


    };

    /**
     * Constructs a <code>TrainPerformance</code> from a plain JavaScript object, optionally creating a new instance.
     * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
     * @param {Object} data The plain JavaScript object bearing properties of interest.
     * @param {module:model/TrainPerformance} obj Optional instance to populate.
     * @return {module:model/TrainPerformance} The populated <code>TrainPerformance</code> instance.
     */
    exports.constructFromObject = function (data, obj) {
        if (data) {
            obj = obj || new exports();

            if (data.hasOwnProperty('model_id')) {
                obj['model_id'] = ApiClient.convertToType(data['model_id'], 'String');
            }
            if (data.hasOwnProperty('cost')) {
                obj['cost'] = ApiClient.convertToType(data['cost'], ['Number']);
            }
            if (data.hasOwnProperty('currentLearningRate')) {
                obj['currentLearningRate'] = ApiClient.convertToType(data['currentLearningRate'], ['Number']);
            }
        }
        return obj;
    }

    /**
     * @member {String} model_id
     */
    exports.prototype['model_id'] = undefined;
    /**
     * @member {Array.<Number>} cost
     */
    exports.prototype['cost'] = undefined;
    /**
     * @member {Array.<Number>} currentLearningRate
     */
    exports.prototype['currentLearningRate'] = undefined;


    return exports;
}));



},{"../ApiClient":9}],24:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.0.7
 * Contact: leon.schuetz@student.uni-tuebingen.de
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 *
 * Swagger Codegen version: 2.2.3
 *
 * Do not edit the class manually.
 *
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['ApiClient'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports, like Node.
        module.exports = factory(require('../ApiClient'));
    } else {
        // Browser globals (root is window)
        if (!root.ConvolutionalAutoencoder) {
            root.ConvolutionalAutoencoder = {};
        }
        root.ConvolutionalAutoencoder.TrainStatus = factory(root.ConvolutionalAutoencoder.ApiClient);
    }
}(this, function (ApiClient) {
    'use strict';


    /**
     * Enum class TrainStatus.
     * @enum {}
     * @readonly
     */
    var exports = {
        /**
         * value: "start"
         * @const
         */
        "start": "start",
        /**
         * value: "pause"
         * @const
         */
        "pause": "pause",
        /**
         * value: "stop"
         * @const
         */
        "stop": "stop",
        /**
         * value: "resume"
         * @const
         */
        "resume": "resume"
    };

    /**
     * Returns a <code>TrainStatus</code> enum value from a Javascript object name.
     * @param {Object} data The plain JavaScript object containing the name of the enum value.
     * @return {module:model/TrainStatus} The enum <code>TrainStatus</code> value.
     */
    exports.constructFromObject = function (object) {
        return object;
    }

    return exports;
}));



},{"../ApiClient":9}],25:[function(require,module,exports){
/*
Includes
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

/*
Global variables
 */
var trainApi = new ConvolutionalAutoencoder.TrainApi();
var trainTimer;

/*
Charts
 */

var costChart = new LineChart("charts", 500, 500, "cost");
var learningRateChart = new LineChart("charts", 500, 500, "learning rate");

console.log(costChart.parentNodeID);

function updateTrainImages() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log(response);
            //console.log(data);

            //get image pane
            var imageGrid = document.getElementById("imageGrid");

            // remove all previous elements:
            imageGrid.innerHTML = "";

            // add image pairs
            for (var i = 0; i < data.inputLayer.length; i++) {
                // create new input image object
                var newInputImage = document.createElement("img");
                newInputImage.id = "InputImage_" + data.inputLayer[i].id;
                newInputImage.src = "data:image/png;base64," + data.inputLayer[i].bytestring.substring(2, data.inputLayer[i].bytestring.length - 1);
                newInputImage.style.width = "80px";
                newInputImage.class = "imageThumbnail";

                // append new image to image grid
                imageGrid.appendChild(newInputImage);

                /*// add eventListener
                // change preview view
                newInputImage.addEventListener("click", function () {
                    console.log(this.id);
                    document.getElementById("imagePreview").src = this.src;
                });*/

                // create new output image object
                var newOutputImage = document.createElement("img");
                newOutputImage.id = "OutputImage_" + data.outputLayer[i].id;
                newOutputImage.src = "data:image/png;base64," + data.outputLayer[i].bytestring.substring(2, data.outputLayer[i].bytestring.length - 1);
                newOutputImage.style.width = "80px";
                newOutputImage.class = "imageThumbnail";

                console.log(newOutputImage.id);
                console.log(data.outputLayer[i].bytestring.substring(2, data.outputLayer[i].bytestring.length - 1));

                // append new image to image grid
                imageGrid.appendChild(newOutputImage);

                //append line break:
                imageGrid.appendChild(document.createElement('br'));

            }


        }
    };
    trainApi.getProcessedImageData(9, callback);
}

function updateTrainStatistics() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);

            //update cost diagram
            if (data.cost.length > 0) {
                costChart.appendData(data.cost);
                learningRateChart.appendData(data.currentLearningRate)
            }

        }


    };

    trainApi.getTrainPerformance(callback);
}

function updateView() {
    console.log("tick");
    // update train images:
    updateTrainImages();

    // update charts:
    updateTrainStatistics();
}

function startTraining() {

    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;

            // start update timer
            trainTimer = setInterval(updateView, 5000);
        }
    }

    trainApi.controlTraining('"start"', callback);
}


function stopTraining() {

    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;

            // stop update timer
            clearInterval(trainTimer);
        }
    }

    trainApi.controlTraining('"stop"', callback);
}


/*
attach Event Listener
 */

document.getElementById("startTraining").addEventListener("click", startTraining);
document.getElementById("stopTraining").addEventListener("click", stopTraining);




},{"convolutional_autoencoder":15}],26:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],27:[function(require,module,exports){

},{}],28:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":26,"ieee754":29}],29:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],30:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],31:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],32:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":30,"./encode":31}]},{},[25])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9jb21wb25lbnQtZW1pdHRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9jbGllbnQuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvaXMtZnVuY3Rpb24uanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvaXMtb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3JlcXVlc3QtYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9yZXNwb25zZS1iYXNlLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3Nob3VsZC1yZXRyeS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9BcGlDbGllbnQuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvYXBpL0J1aWxkQXBpLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL2FwaS9Mb2FkQXBpLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL2FwaS9UcmFpbkFwaS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9hcGkvVHVuZUFwaS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9hcGkvVmlzdWFsaXplQXBpLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL0NsdXN0ZXJpbmcuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvbW9kZWwvSW1hZ2UuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvbW9kZWwvSW1hZ2VEYXRhLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL1BhcmFtZXRlckxpc3QuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvbW9kZWwvUG9pbnQyRC5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvbW9kZWwvVHJhaW5QZXJmb3JtYW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9tb2RlbC9UcmFpblN0YXR1cy5qcyIsInRyYWluLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2luZGV4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9kZWNvZGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZW5jb2RlLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzE3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMva0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN2akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogRXhwb3NlIGBFbWl0dGVyYC5cbiAqL1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBFbWl0dGVyKG9iaikge1xuICAgIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICAgIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xuICAgICAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogTGlzdGVuIG9uIHRoZSBnaXZlbiBgZXZlbnRgIHdpdGggYGZuYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XG4gICAgRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudCwgZm4pIHtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICAgICAgICAodGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW10pXG4gICAgICAgICAgICAucHVzaChmbik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbi8qKlxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXG4gKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XG4gICAgZnVuY3Rpb24gb24oKSB7XG4gICAgICAgIHRoaXMub2ZmKGV2ZW50LCBvbik7XG4gICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgb24uZm4gPSBmbjtcbiAgICB0aGlzLm9uKGV2ZW50LCBvbik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuICAgIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cbiAgICAgICAgRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbiAgICAgICAgICAgIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG4gICAgICAgICAgICAgICAgLy8gYWxsXG4gICAgICAgICAgICAgICAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcbiAgICAgICAgICAgICAgICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXG4gICAgICAgICAgICAgICAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcbiAgICAgICAgICAgICAgICB2YXIgY2I7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYiA9PT0gZm4gfHwgY2IuZm4gPT09IGZuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAgICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xuXG4gICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYXJyYXkgb2YgY2FsbGJhY2tzIGZvciBgZXZlbnRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgICByZXR1cm4gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgcmV0dXJuICEhdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcbn07XG4iLCIvKipcbiAqIFJvb3QgcmVmZXJlbmNlIGZvciBpZnJhbWVzLlxuICovXG5cbnZhciByb290O1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IC8vIEJyb3dzZXIgd2luZG93XG4gICAgcm9vdCA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7IC8vIFdlYiBXb3JrZXJcbiAgICByb290ID0gc2VsZjtcbn0gZWxzZSB7IC8vIE90aGVyIGVudmlyb25tZW50c1xuICAgIGNvbnNvbGUud2FybihcIlVzaW5nIGJyb3dzZXItb25seSB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQgaW4gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRcIik7XG4gICAgcm9vdCA9IHRoaXM7XG59XG5cbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnY29tcG9uZW50LWVtaXR0ZXInKTtcbnZhciBSZXF1ZXN0QmFzZSA9IHJlcXVpcmUoJy4vcmVxdWVzdC1iYXNlJyk7XG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKCcuL2lzLWZ1bmN0aW9uJyk7XG52YXIgUmVzcG9uc2VCYXNlID0gcmVxdWlyZSgnLi9yZXNwb25zZS1iYXNlJyk7XG52YXIgc2hvdWxkUmV0cnkgPSByZXF1aXJlKCcuL3Nob3VsZC1yZXRyeScpO1xuXG4vKipcbiAqIE5vb3AuXG4gKi9cblxuZnVuY3Rpb24gbm9vcCgpIHtcbn07XG5cbi8qKlxuICogRXhwb3NlIGByZXF1ZXN0YC5cbiAqL1xuXG52YXIgcmVxdWVzdCA9IGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtZXRob2QsIHVybCkge1xuICAgIC8vIGNhbGxiYWNrXG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdCgnR0VUJywgbWV0aG9kKS5lbmQodXJsKTtcbiAgICB9XG5cbiAgICAvLyB1cmwgZmlyc3RcbiAgICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KG1ldGhvZCwgdXJsKTtcbn1cblxuZXhwb3J0cy5SZXF1ZXN0ID0gUmVxdWVzdDtcblxuLyoqXG4gKiBEZXRlcm1pbmUgWEhSLlxuICovXG5cbnJlcXVlc3QuZ2V0WEhSID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChyb290LlhNTEh0dHBSZXF1ZXN0XG4gICAgICAgICYmICghcm9vdC5sb2NhdGlvbiB8fCAnZmlsZTonICE9IHJvb3QubG9jYXRpb24ucHJvdG9jb2xcbiAgICAgICAgICAgIHx8ICFyb290LkFjdGl2ZVhPYmplY3QpKSB7XG4gICAgICAgIHJldHVybiBuZXcgWE1MSHR0cFJlcXVlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTWljcm9zb2Z0LlhNTEhUVFAnKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjYuMCcpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAuMy4wJyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUCcpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgRXJyb3IoXCJCcm93c2VyLW9ubHkgdmVyaXNvbiBvZiBzdXBlcmFnZW50IGNvdWxkIG5vdCBmaW5kIFhIUlwiKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLCBhZGRlZCB0byBzdXBwb3J0IElFLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgdHJpbSA9ICcnLnRyaW1cbiAgICA/IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzLnRyaW0oKTtcbiAgICB9XG4gICAgOiBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oXlxccyp8XFxzKiQpL2csICcnKTtcbiAgICB9O1xuXG4vKipcbiAqIFNlcmlhbGl6ZSB0aGUgZ2l2ZW4gYG9iamAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VyaWFsaXplKG9iaikge1xuICAgIGlmICghaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICB2YXIgcGFpcnMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXksIG9ialtrZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzLmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBIZWxwcyAnc2VyaWFsaXplJyB3aXRoIHNlcmlhbGl6aW5nIGFycmF5cy5cbiAqIE11dGF0ZXMgdGhlIHBhaXJzIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhaXJzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2YWwpIHtcbiAgICBpZiAodmFsICE9IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbCkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHN1YmtleSBpbiB2YWwpIHtcbiAgICAgICAgICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5ICsgJ1snICsgc3Via2V5ICsgJ10nLCB2YWxbc3Via2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYWlycy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpXG4gICAgICAgICAgICAgICAgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgICAgICBwYWlycy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpKTtcbiAgICB9XG59XG5cbi8qKlxuICogRXhwb3NlIHNlcmlhbGl6YXRpb24gbWV0aG9kLlxuICovXG5cbnJlcXVlc3Quc2VyaWFsaXplT2JqZWN0ID0gc2VyaWFsaXplO1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiB4LXd3dy1mb3JtLXVybGVuY29kZWQgYHN0cmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VTdHJpbmcoc3RyKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIHZhciBwYWlycyA9IHN0ci5zcGxpdCgnJicpO1xuICAgIHZhciBwYWlyO1xuICAgIHZhciBwb3M7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFpcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgICBwb3MgPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICAgICAgaWYgKHBvcyA9PSAtMSkge1xuICAgICAgICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyKV0gPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtkZWNvZGVVUklDb21wb25lbnQocGFpci5zbGljZSgwLCBwb3MpKV0gPVxuICAgICAgICAgICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKHBvcyArIDEpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogRXhwb3NlIHBhcnNlci5cbiAqL1xuXG5yZXF1ZXN0LnBhcnNlU3RyaW5nID0gcGFyc2VTdHJpbmc7XG5cbi8qKlxuICogRGVmYXVsdCBNSU1FIHR5cGUgbWFwLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnR5cGVzLnhtbCA9ICdhcHBsaWNhdGlvbi94bWwnO1xuICpcbiAqL1xuXG5yZXF1ZXN0LnR5cGVzID0ge1xuICAgIGh0bWw6ICd0ZXh0L2h0bWwnLFxuICAgIGpzb246ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB4bWw6ICdhcHBsaWNhdGlvbi94bWwnLFxuICAgIHVybGVuY29kZWQ6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAgICdmb3JtJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICAgJ2Zvcm0tZGF0YSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXG59O1xuXG4vKipcbiAqIERlZmF1bHQgc2VyaWFsaXphdGlvbiBtYXAuXG4gKlxuICogICAgIHN1cGVyYWdlbnQuc2VyaWFsaXplWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKG9iail7XG4gKiAgICAgICByZXR1cm4gJ2dlbmVyYXRlZCB4bWwgaGVyZSc7XG4gKiAgICAgfTtcbiAqXG4gKi9cblxucmVxdWVzdC5zZXJpYWxpemUgPSB7XG4gICAgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc6IHNlcmlhbGl6ZSxcbiAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5XG59O1xuXG4vKipcbiAqIERlZmF1bHQgcGFyc2Vycy5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC5wYXJzZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihzdHIpe1xuICAqICAgICAgIHJldHVybiB7IG9iamVjdCBwYXJzZWQgZnJvbSBzdHIgfTtcbiAgKiAgICAgfTtcbiAqXG4gKi9cblxucmVxdWVzdC5wYXJzZSA9IHtcbiAgICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogcGFyc2VTdHJpbmcsXG4gICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnBhcnNlXG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBoZWFkZXIgYHN0cmAgaW50b1xuICogYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1hcHBlZCBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VIZWFkZXIoc3RyKSB7XG4gICAgdmFyIGxpbmVzID0gc3RyLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgdmFyIGZpZWxkcyA9IHt9O1xuICAgIHZhciBpbmRleDtcbiAgICB2YXIgbGluZTtcbiAgICB2YXIgZmllbGQ7XG4gICAgdmFyIHZhbDtcblxuICAgIGxpbmVzLnBvcCgpOyAvLyB0cmFpbGluZyBDUkxGXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbGluZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgbGluZSA9IGxpbmVzW2ldO1xuICAgICAgICBpbmRleCA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgICAgICBmaWVsZCA9IGxpbmUuc2xpY2UoMCwgaW5kZXgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHZhbCA9IHRyaW0obGluZS5zbGljZShpbmRleCArIDEpKTtcbiAgICAgICAgZmllbGRzW2ZpZWxkXSA9IHZhbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmllbGRzO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBtaW1lYCBpcyBqc29uIG9yIGhhcyAranNvbiBzdHJ1Y3R1cmVkIHN5bnRheCBzdWZmaXguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1pbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc0pTT04obWltZSkge1xuICAgIHJldHVybiAvW1xcLytdanNvblxcYi8udGVzdChtaW1lKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZWAgd2l0aCB0aGUgZ2l2ZW4gYHhocmAuXG4gKlxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxuICogIC0gcGFyc2UgaGVhZGVyXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogIEFsaWFzaW5nIGBzdXBlcmFnZW50YCBhcyBgcmVxdWVzdGAgaXMgbmljZTpcbiAqXG4gKiAgICAgIHJlcXVlc3QgPSBzdXBlcmFnZW50O1xuICpcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJykuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgU2VuZGluZyBkYXRhIGNhbiBiZSBjaGFpbmVkOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogQHBhcmFtIHtYTUxIVFRQUmVxdWVzdH0geGhyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxKSB7XG4gICAgdGhpcy5yZXEgPSByZXE7XG4gICAgdGhpcy54aHIgPSB0aGlzLnJlcS54aHI7XG4gICAgLy8gcmVzcG9uc2VUZXh0IGlzIGFjY2Vzc2libGUgb25seSBpZiByZXNwb25zZVR5cGUgaXMgJycgb3IgJ3RleHQnIGFuZCBvbiBvbGRlciBicm93c2Vyc1xuICAgIHRoaXMudGV4dCA9ICgodGhpcy5yZXEubWV0aG9kICE9ICdIRUFEJyAmJiAodGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAnJyB8fCB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd0ZXh0JykpIHx8IHR5cGVvZiB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd1bmRlZmluZWQnKVxuICAgICAgICA/IHRoaXMueGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICA6IG51bGw7XG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gdGhpcy5yZXEueGhyLnN0YXR1c1RleHQ7XG4gICAgdmFyIHN0YXR1cyA9IHRoaXMueGhyLnN0YXR1cztcbiAgICAvLyBoYW5kbGUgSUU5IGJ1ZzogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gICAgaWYgKHN0YXR1cyA9PT0gMTIyMykge1xuICAgICAgICBzdGF0dXMgPSAyMDQ7XG4gICAgfVxuICAgIHRoaXMuX3NldFN0YXR1c1Byb3BlcnRpZXMoc3RhdHVzKTtcbiAgICB0aGlzLmhlYWRlciA9IHRoaXMuaGVhZGVycyA9IHBhcnNlSGVhZGVyKHRoaXMueGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKTtcbiAgICAvLyBnZXRBbGxSZXNwb25zZUhlYWRlcnMgc29tZXRpbWVzIGZhbHNlbHkgcmV0dXJucyBcIlwiIGZvciBDT1JTIHJlcXVlc3RzLCBidXRcbiAgICAvLyBnZXRSZXNwb25zZUhlYWRlciBzdGlsbCB3b3Jrcy4gc28gd2UgZ2V0IGNvbnRlbnQtdHlwZSBldmVuIGlmIGdldHRpbmdcbiAgICAvLyBvdGhlciBoZWFkZXJzIGZhaWxzLlxuICAgIHRoaXMuaGVhZGVyWydjb250ZW50LXR5cGUnXSA9IHRoaXMueGhyLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKTtcbiAgICB0aGlzLl9zZXRIZWFkZXJQcm9wZXJ0aWVzKHRoaXMuaGVhZGVyKTtcblxuICAgIGlmIChudWxsID09PSB0aGlzLnRleHQgJiYgcmVxLl9yZXNwb25zZVR5cGUpIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gdGhpcy54aHIucmVzcG9uc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gdGhpcy5yZXEubWV0aG9kICE9ICdIRUFEJ1xuICAgICAgICAgICAgPyB0aGlzLl9wYXJzZUJvZHkodGhpcy50ZXh0ID8gdGhpcy50ZXh0IDogdGhpcy54aHIucmVzcG9uc2UpXG4gICAgICAgICAgICA6IG51bGw7XG4gICAgfVxufVxuXG5SZXNwb25zZUJhc2UoUmVzcG9uc2UucHJvdG90eXBlKTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gYm9keSBgc3RyYC5cbiAqXG4gKiBVc2VkIGZvciBhdXRvLXBhcnNpbmcgb2YgYm9kaWVzLiBQYXJzZXJzXG4gKiBhcmUgZGVmaW5lZCBvbiB0aGUgYHN1cGVyYWdlbnQucGFyc2VgIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS5fcGFyc2VCb2R5ID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciBwYXJzZSA9IHJlcXVlc3QucGFyc2VbdGhpcy50eXBlXTtcbiAgICBpZiAodGhpcy5yZXEuX3BhcnNlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXEuX3BhcnNlcih0aGlzLCBzdHIpO1xuICAgIH1cbiAgICBpZiAoIXBhcnNlICYmIGlzSlNPTih0aGlzLnR5cGUpKSB7XG4gICAgICAgIHBhcnNlID0gcmVxdWVzdC5wYXJzZVsnYXBwbGljYXRpb24vanNvbiddO1xuICAgIH1cbiAgICByZXR1cm4gcGFyc2UgJiYgc3RyICYmIChzdHIubGVuZ3RoIHx8IHN0ciBpbnN0YW5jZW9mIE9iamVjdClcbiAgICAgICAgPyBwYXJzZShzdHIpXG4gICAgICAgIDogbnVsbDtcbn07XG5cbi8qKlxuICogUmV0dXJuIGFuIGBFcnJvcmAgcmVwcmVzZW50YXRpdmUgb2YgdGhpcyByZXNwb25zZS5cbiAqXG4gKiBAcmV0dXJuIHtFcnJvcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLnRvRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlcSA9IHRoaXMucmVxO1xuICAgIHZhciBtZXRob2QgPSByZXEubWV0aG9kO1xuICAgIHZhciB1cmwgPSByZXEudXJsO1xuXG4gICAgdmFyIG1zZyA9ICdjYW5ub3QgJyArIG1ldGhvZCArICcgJyArIHVybCArICcgKCcgKyB0aGlzLnN0YXR1cyArICcpJztcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKG1zZyk7XG4gICAgZXJyLnN0YXR1cyA9IHRoaXMuc3RhdHVzO1xuICAgIGVyci5tZXRob2QgPSBtZXRob2Q7XG4gICAgZXJyLnVybCA9IHVybDtcblxuICAgIHJldHVybiBlcnI7XG59O1xuXG4vKipcbiAqIEV4cG9zZSBgUmVzcG9uc2VgLlxuICovXG5cbnJlcXVlc3QuUmVzcG9uc2UgPSBSZXNwb25zZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXF1ZXN0YCB3aXRoIHRoZSBnaXZlbiBgbWV0aG9kYCBhbmQgYHVybGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXF1ZXN0KG1ldGhvZCwgdXJsKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkgfHwgW107XG4gICAgdGhpcy5tZXRob2QgPSBtZXRob2Q7XG4gICAgdGhpcy51cmwgPSB1cmw7XG4gICAgdGhpcy5oZWFkZXIgPSB7fTsgLy8gcHJlc2VydmVzIGhlYWRlciBuYW1lIGNhc2VcbiAgICB0aGlzLl9oZWFkZXIgPSB7fTsgLy8gY29lcmNlcyBoZWFkZXIgbmFtZXMgdG8gbG93ZXJjYXNlXG4gICAgdGhpcy5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZXJyID0gbnVsbDtcbiAgICAgICAgdmFyIHJlcyA9IG51bGw7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlcyA9IG5ldyBSZXNwb25zZShzZWxmKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgZXJyID0gbmV3IEVycm9yKCdQYXJzZXIgaXMgdW5hYmxlIHRvIHBhcnNlIHRoZSByZXNwb25zZScpO1xuICAgICAgICAgICAgZXJyLnBhcnNlID0gdHJ1ZTtcbiAgICAgICAgICAgIGVyci5vcmlnaW5hbCA9IGU7XG4gICAgICAgICAgICAvLyBpc3N1ZSAjNjc1OiByZXR1cm4gdGhlIHJhdyByZXNwb25zZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xuICAgICAgICAgICAgaWYgKHNlbGYueGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gaWU5IGRvZXNuJ3QgaGF2ZSAncmVzcG9uc2UnIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgZXJyLnJhd1Jlc3BvbnNlID0gdHlwZW9mIHNlbGYueGhyLnJlc3BvbnNlVHlwZSA9PSAndW5kZWZpbmVkJyA/IHNlbGYueGhyLnJlc3BvbnNlVGV4dCA6IHNlbGYueGhyLnJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIC8vIGlzc3VlICM4NzY6IHJldHVybiB0aGUgaHR0cCBzdGF0dXMgY29kZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xuICAgICAgICAgICAgICAgIGVyci5zdGF0dXMgPSBzZWxmLnhoci5zdGF0dXMgPyBzZWxmLnhoci5zdGF0dXMgOiBudWxsO1xuICAgICAgICAgICAgICAgIGVyci5zdGF0dXNDb2RlID0gZXJyLnN0YXR1czsgLy8gYmFja3dhcmRzLWNvbXBhdCBvbmx5XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVyci5yYXdSZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgZXJyLnN0YXR1cyA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzZWxmLmNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLmVtaXQoJ3Jlc3BvbnNlJywgcmVzKTtcblxuICAgICAgICB2YXIgbmV3X2VycjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghc2VsZi5faXNSZXNwb25zZU9LKHJlcykpIHtcbiAgICAgICAgICAgICAgICBuZXdfZXJyID0gbmV3IEVycm9yKHJlcy5zdGF0dXNUZXh0IHx8ICdVbnN1Y2Nlc3NmdWwgSFRUUCByZXNwb25zZScpO1xuICAgICAgICAgICAgICAgIG5ld19lcnIub3JpZ2luYWwgPSBlcnI7XG4gICAgICAgICAgICAgICAgbmV3X2Vyci5yZXNwb25zZSA9IHJlcztcbiAgICAgICAgICAgICAgICBuZXdfZXJyLnN0YXR1cyA9IHJlcy5zdGF0dXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG5ld19lcnIgPSBlOyAvLyAjOTg1IHRvdWNoaW5nIHJlcyBtYXkgY2F1c2UgSU5WQUxJRF9TVEFURV9FUlIgb24gb2xkIEFuZHJvaWRcbiAgICAgICAgfVxuXG4gICAgICAgIC8vICMxMDAwIGRvbid0IGNhdGNoIGVycm9ycyBmcm9tIHRoZSBjYWxsYmFjayB0byBhdm9pZCBkb3VibGUgY2FsbGluZyBpdFxuICAgICAgICBpZiAobmV3X2Vycikge1xuICAgICAgICAgICAgc2VsZi5jYWxsYmFjayhuZXdfZXJyLCByZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5jYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbi8qKlxuICogTWl4aW4gYEVtaXR0ZXJgIGFuZCBgUmVxdWVzdEJhc2VgLlxuICovXG5cbkVtaXR0ZXIoUmVxdWVzdC5wcm90b3R5cGUpO1xuUmVxdWVzdEJhc2UoUmVxdWVzdC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFNldCBDb250ZW50LVR5cGUgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCd4bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2FwcGxpY2F0aW9uL3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdGhpcy5zZXQoJ0NvbnRlbnQtVHlwZScsIHJlcXVlc3QudHlwZXNbdHlwZV0gfHwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBY2NlcHQgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdGhpcy5zZXQoJ0FjY2VwdCcsIHJlcXVlc3QudHlwZXNbdHlwZV0gfHwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFzc10gb3B0aW9uYWwgaW4gY2FzZSBvZiB1c2luZyAnYmVhcmVyJyBhcyB0eXBlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB3aXRoICd0eXBlJyBwcm9wZXJ0eSAnYXV0bycsICdiYXNpYycgb3IgJ2JlYXJlcicgKGRlZmF1bHQgJ2Jhc2ljJylcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24gKHVzZXIsIHBhc3MsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIHBhc3MgPT09ICdvYmplY3QnICYmIHBhc3MgIT09IG51bGwpIHsgLy8gcGFzcyBpcyBvcHRpb25hbCBhbmQgY2FuIHN1YnN0aXR1dGUgZm9yIG9wdGlvbnNcbiAgICAgICAgb3B0aW9ucyA9IHBhc3M7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGJ0b2EgPyAnYmFzaWMnIDogJ2F1dG8nLFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3dpdGNoIChvcHRpb25zLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnYmFzaWMnOlxuICAgICAgICAgICAgdGhpcy5zZXQoJ0F1dGhvcml6YXRpb24nLCAnQmFzaWMgJyArIGJ0b2EodXNlciArICc6JyArIHBhc3MpKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2F1dG8nOlxuICAgICAgICAgICAgdGhpcy51c2VybmFtZSA9IHVzZXI7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkID0gcGFzcztcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2JlYXJlcic6IC8vIHVzYWdlIHdvdWxkIGJlIC5hdXRoKGFjY2Vzc1Rva2VuLCB7IHR5cGU6ICdiZWFyZXInIH0pXG4gICAgICAgICAgICB0aGlzLnNldCgnQXV0aG9yaXphdGlvbicsICdCZWFyZXIgJyArIHVzZXIpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgcXVlcnktc3RyaW5nIGB2YWxgLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgcmVxdWVzdC5nZXQoJy9zaG9lcycpXG4gKiAgICAgLnF1ZXJ5KCdzaXplPTEwJylcbiAqICAgICAucXVlcnkoeyBjb2xvcjogJ2JsdWUnIH0pXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gc2VyaWFsaXplKHZhbCk7XG4gICAgaWYgKHZhbCkgdGhpcy5fcXVlcnkucHVzaCh2YWwpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBRdWV1ZSB0aGUgZ2l2ZW4gYGZpbGVgIGFzIGFuIGF0dGFjaG1lbnQgdG8gdGhlIHNwZWNpZmllZCBgZmllbGRgLFxuICogd2l0aCBvcHRpb25hbCBgb3B0aW9uc2AgKG9yIGZpbGVuYW1lKS5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5hdHRhY2goJ2NvbnRlbnQnLCBuZXcgQmxvYihbJzxhIGlkPVwiYVwiPjxiIGlkPVwiYlwiPmhleSE8L2I+PC9hPiddLCB7IHR5cGU6IFwidGV4dC9odG1sXCJ9KSlcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEBwYXJhbSB7QmxvYnxGaWxlfSBmaWxlXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdHRhY2ggPSBmdW5jdGlvbiAoZmllbGQsIGZpbGUsIG9wdGlvbnMpIHtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJzdXBlcmFnZW50IGNhbid0IG1peCAuc2VuZCgpIGFuZCAuYXR0YWNoKClcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9nZXRGb3JtRGF0YSgpLmFwcGVuZChmaWVsZCwgZmlsZSwgb3B0aW9ucyB8fCBmaWxlLm5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9nZXRGb3JtRGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuX2Zvcm1EYXRhKSB7XG4gICAgICAgIHRoaXMuX2Zvcm1EYXRhID0gbmV3IHJvb3QuRm9ybURhdGEoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2Zvcm1EYXRhO1xufTtcblxuLyoqXG4gKiBJbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggYGVycmAgYW5kIGByZXNgXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYWxsYmFjayA9IGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuX3JldHJpZXMsIHRoaXMuX21heFJldHJpZXMpXG4gICAgaWYgKHRoaXMuX21heFJldHJpZXMgJiYgdGhpcy5fcmV0cmllcysrIDwgdGhpcy5fbWF4UmV0cmllcyAmJiBzaG91bGRSZXRyeShlcnIsIHJlcykpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JldHJ5KCk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gdGhpcy5fY2FsbGJhY2s7XG4gICAgdGhpcy5jbGVhclRpbWVvdXQoKTtcblxuICAgIGlmIChlcnIpIHtcbiAgICAgICAgaWYgKHRoaXMuX21heFJldHJpZXMpIGVyci5yZXRyaWVzID0gdGhpcy5fcmV0cmllcyAtIDE7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cblxuICAgIGZuKGVyciwgcmVzKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggeC1kb21haW4gZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY3Jvc3NEb21haW5FcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdSZXF1ZXN0IGhhcyBiZWVuIHRlcm1pbmF0ZWRcXG5Qb3NzaWJsZSBjYXVzZXM6IHRoZSBuZXR3b3JrIGlzIG9mZmxpbmUsIE9yaWdpbiBpcyBub3QgYWxsb3dlZCBieSBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4sIHRoZSBwYWdlIGlzIGJlaW5nIHVubG9hZGVkLCBldGMuJyk7XG4gICAgZXJyLmNyb3NzRG9tYWluID0gdHJ1ZTtcblxuICAgIGVyci5zdGF0dXMgPSB0aGlzLnN0YXR1cztcbiAgICBlcnIubWV0aG9kID0gdGhpcy5tZXRob2Q7XG4gICAgZXJyLnVybCA9IHRoaXMudXJsO1xuXG4gICAgdGhpcy5jYWxsYmFjayhlcnIpO1xufTtcblxuLy8gVGhpcyBvbmx5IHdhcm5zLCBiZWNhdXNlIHRoZSByZXF1ZXN0IGlzIHN0aWxsIGxpa2VseSB0byB3b3JrXG5SZXF1ZXN0LnByb3RvdHlwZS5idWZmZXIgPSBSZXF1ZXN0LnByb3RvdHlwZS5jYSA9IFJlcXVlc3QucHJvdG90eXBlLmFnZW50ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUud2FybihcIlRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIFRoaXMgdGhyb3dzLCBiZWNhdXNlIGl0IGNhbid0IHNlbmQvcmVjZWl2ZSBkYXRhIGFzIGV4cGVjdGVkXG5SZXF1ZXN0LnByb3RvdHlwZS5waXBlID0gUmVxdWVzdC5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJTdHJlYW1pbmcgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbn07XG5cbi8qKlxuICogQ29tcG9zZSBxdWVyeXN0cmluZyB0byBhcHBlbmQgdG8gcmVxLnVybFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9hcHBlbmRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcXVlcnkgPSB0aGlzLl9xdWVyeS5qb2luKCcmJyk7XG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHRoaXMudXJsICs9ICh0aGlzLnVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKyBxdWVyeTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fc29ydCkge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnVybC5pbmRleE9mKCc/Jyk7XG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgICAgICB2YXIgcXVlcnlBcnIgPSB0aGlzLnVybC5zdWJzdHJpbmcoaW5kZXggKyAxKS5zcGxpdCgnJicpO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24odGhpcy5fc29ydCkpIHtcbiAgICAgICAgICAgICAgICBxdWVyeUFyci5zb3J0KHRoaXMuX3NvcnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdWVyeUFyci5zb3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnVybCA9IHRoaXMudXJsLnN1YnN0cmluZygwLCBpbmRleCkgKyAnPycgKyBxdWVyeUFyci5qb2luKCcmJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGEgaG9zdCBvYmplY3QsXG4gKiB3ZSBkb24ndCB3YW50IHRvIHNlcmlhbGl6ZSB0aGVzZSA6KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuUmVxdWVzdC5wcm90b3R5cGUuX2lzSG9zdCA9IGZ1bmN0aW9uIF9pc0hvc3Qob2JqKSB7XG4gICAgLy8gTmF0aXZlIG9iamVjdHMgc3RyaW5naWZ5IHRvIFtvYmplY3QgRmlsZV0sIFtvYmplY3QgQmxvYl0sIFtvYmplY3QgRm9ybURhdGFdLCBldGMuXG4gICAgcmV0dXJuIG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iaiAmJiAhQXJyYXkuaXNBcnJheShvYmopICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJztcbn1cblxuLyoqXG4gKiBJbml0aWF0ZSByZXF1ZXN0LCBpbnZva2luZyBjYWxsYmFjayBgZm4ocmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJXYXJuaW5nOiAuZW5kKCkgd2FzIGNhbGxlZCB0d2ljZS4gVGhpcyBpcyBub3Qgc3VwcG9ydGVkIGluIHN1cGVyYWdlbnRcIik7XG4gICAgfVxuICAgIHRoaXMuX2VuZENhbGxlZCA9IHRydWU7XG5cbiAgICAvLyBzdG9yZSBjYWxsYmFja1xuICAgIHRoaXMuX2NhbGxiYWNrID0gZm4gfHwgbm9vcDtcblxuICAgIC8vIHF1ZXJ5c3RyaW5nXG4gICAgdGhpcy5fYXBwZW5kUXVlcnlTdHJpbmcoKTtcblxuICAgIHJldHVybiB0aGlzLl9lbmQoKTtcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB4aHIgPSB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XG4gICAgdmFyIGRhdGEgPSB0aGlzLl9mb3JtRGF0YSB8fCB0aGlzLl9kYXRhO1xuXG4gICAgdGhpcy5fc2V0VGltZW91dHMoKTtcblxuICAgIC8vIHN0YXRlIGNoYW5nZVxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZWFkeVN0YXRlID0geGhyLnJlYWR5U3RhdGU7XG4gICAgICAgIGlmIChyZWFkeVN0YXRlID49IDIgJiYgc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWxmLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDQgIT0gcmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW4gSUU5LCByZWFkcyB0byBhbnkgcHJvcGVydHkgKGUuZy4gc3RhdHVzKSBvZmYgb2YgYW4gYWJvcnRlZCBYSFIgd2lsbFxuICAgICAgICAvLyByZXN1bHQgaW4gdGhlIGVycm9yIFwiQ291bGQgbm90IGNvbXBsZXRlIHRoZSBvcGVyYXRpb24gZHVlIHRvIGVycm9yIGMwMGMwMjNmXCJcbiAgICAgICAgdmFyIHN0YXR1cztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHhoci5zdGF0dXNcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgc3RhdHVzID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3RhdHVzKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi50aW1lZG91dCB8fCBzZWxmLl9hYm9ydGVkKSByZXR1cm47XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5jcm9zc0RvbWFpbkVycm9yKCk7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5lbWl0KCdlbmQnKTtcbiAgICB9O1xuXG4gICAgLy8gcHJvZ3Jlc3NcbiAgICB2YXIgaGFuZGxlUHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZGlyZWN0aW9uLCBlKSB7XG4gICAgICAgIGlmIChlLnRvdGFsID4gMCkge1xuICAgICAgICAgICAgZS5wZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsICogMTAwO1xuICAgICAgICB9XG4gICAgICAgIGUuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgICAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmhhc0xpc3RlbmVycygncHJvZ3Jlc3MnKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgeGhyLm9ucHJvZ3Jlc3MgPSBoYW5kbGVQcm9ncmVzcy5iaW5kKG51bGwsICdkb3dubG9hZCcpO1xuICAgICAgICAgICAgaWYgKHhoci51cGxvYWQpIHtcbiAgICAgICAgICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBoYW5kbGVQcm9ncmVzcy5iaW5kKG51bGwsICd1cGxvYWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gQWNjZXNzaW5nIHhoci51cGxvYWQgZmFpbHMgaW4gSUUgZnJvbSBhIHdlYiB3b3JrZXIsIHNvIGp1c3QgcHJldGVuZCBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgICAgICAgLy8gUmVwb3J0ZWQgaGVyZTpcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vY29ubmVjdC5taWNyb3NvZnQuY29tL0lFL2ZlZWRiYWNrL2RldGFpbHMvODM3MjQ1L3htbGh0dHByZXF1ZXN0LXVwbG9hZC10aHJvd3MtaW52YWxpZC1hcmd1bWVudC13aGVuLXVzZWQtZnJvbS13ZWItd29ya2VyLWNvbnRleHRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGluaXRpYXRlIHJlcXVlc3RcbiAgICB0cnkge1xuICAgICAgICBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICB4aHIub3Blbih0aGlzLm1ldGhvZCwgdGhpcy51cmwsIHRydWUsIHRoaXMudXNlcm5hbWUsIHRoaXMucGFzc3dvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBzZWUgIzExNDlcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbGJhY2soZXJyKTtcbiAgICB9XG5cbiAgICAvLyBDT1JTXG4gICAgaWYgKHRoaXMuX3dpdGhDcmVkZW50aWFscykgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgICAvLyBib2R5XG4gICAgaWYgKCF0aGlzLl9mb3JtRGF0YSAmJiAnR0VUJyAhPSB0aGlzLm1ldGhvZCAmJiAnSEVBRCcgIT0gdGhpcy5tZXRob2QgJiYgJ3N0cmluZycgIT0gdHlwZW9mIGRhdGEgJiYgIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgICAgICAvLyBzZXJpYWxpemUgc3R1ZmZcbiAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX3NlcmlhbGl6ZXIgfHwgcmVxdWVzdC5zZXJpYWxpemVbY29udGVudFR5cGUgPyBjb250ZW50VHlwZS5zcGxpdCgnOycpWzBdIDogJyddO1xuICAgICAgICBpZiAoIXNlcmlhbGl6ZSAmJiBpc0pTT04oY29udGVudFR5cGUpKSB7XG4gICAgICAgICAgICBzZXJpYWxpemUgPSByZXF1ZXN0LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXJpYWxpemUpIGRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IGhlYWRlciBmaWVsZHNcbiAgICBmb3IgKHZhciBmaWVsZCBpbiB0aGlzLmhlYWRlcikge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLmhlYWRlcltmaWVsZF0pIGNvbnRpbnVlO1xuXG4gICAgICAgIGlmICh0aGlzLmhlYWRlci5oYXNPd25Qcm9wZXJ0eShmaWVsZCkpXG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihmaWVsZCwgdGhpcy5oZWFkZXJbZmllbGRdKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVzcG9uc2VUeXBlKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSB0aGlzLl9yZXNwb25zZVR5cGU7XG4gICAgfVxuXG4gICAgLy8gc2VuZCBzdHVmZlxuICAgIHRoaXMuZW1pdCgncmVxdWVzdCcsIHRoaXMpO1xuXG4gICAgLy8gSUUxMSB4aHIuc2VuZCh1bmRlZmluZWQpIHNlbmRzICd1bmRlZmluZWQnIHN0cmluZyBhcyBQT1NUIHBheWxvYWQgKGluc3RlYWQgb2Ygbm90aGluZylcbiAgICAvLyBXZSBuZWVkIG51bGwgaGVyZSBpZiBkYXRhIGlzIHVuZGVmaW5lZFxuICAgIHhoci5zZW5kKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJyA/IGRhdGEgOiBudWxsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR0VUIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5nZXQgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBmbikge1xuICAgIHZhciByZXEgPSByZXF1ZXN0KCdHRVQnLCB1cmwpO1xuICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICAgIGlmIChkYXRhKSByZXEucXVlcnkoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5oZWFkID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnSEVBRCcsIHVybCk7XG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gICAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICAgIGlmIChmbikgcmVxLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogT1BUSU9OUyBxdWVyeSB0byBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3Qub3B0aW9ucyA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGZuKSB7XG4gICAgdmFyIHJlcSA9IHJlcXVlc3QoJ09QVElPTlMnLCB1cmwpO1xuICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICAgIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICAgIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIERFTEVURSBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVsKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnREVMRVRFJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxucmVxdWVzdFsnZGVsJ10gPSBkZWw7XG5yZXF1ZXN0WydkZWxldGUnXSA9IGRlbDtcblxuLyoqXG4gKiBQQVRDSCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wYXRjaCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGZuKSB7XG4gICAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BBVENIJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBQT1NUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZH0gW2RhdGFdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBmbikge1xuICAgIHZhciByZXEgPSByZXF1ZXN0KCdQT1NUJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBQVVQgYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucHV0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnUFVUJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcbiIsIi8qKlxuICogQ2hlY2sgaWYgYGZuYCBpcyBhIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vaXMtb2JqZWN0Jyk7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgdGFnID0gaXNPYmplY3QoZm4pID8gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGZuKSA6ICcnO1xuICAgIHJldHVybiB0YWcgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvbjtcbiIsIi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYW4gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgICByZXR1cm4gbnVsbCAhPT0gb2JqICYmICdvYmplY3QnID09PSB0eXBlb2Ygb2JqO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0O1xuIiwiLyoqXG4gKiBNb2R1bGUgb2YgbWl4ZWQtaW4gZnVuY3Rpb25zIHNoYXJlZCBiZXR3ZWVuIG5vZGUgYW5kIGNsaWVudCBjb2RlXG4gKi9cbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vaXMtb2JqZWN0Jyk7XG5cbi8qKlxuICogRXhwb3NlIGBSZXF1ZXN0QmFzZWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0QmFzZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXF1ZXN0QmFzZWAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXF1ZXN0QmFzZShvYmopIHtcbiAgICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgcHJvdG90eXBlIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gICAgZm9yICh2YXIga2V5IGluIFJlcXVlc3RCYXNlLnByb3RvdHlwZSkge1xuICAgICAgICBvYmpba2V5XSA9IFJlcXVlc3RCYXNlLnByb3RvdHlwZVtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIENsZWFyIHByZXZpb3VzIHRpbWVvdXQuXG4gKlxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5jbGVhclRpbWVvdXQgPSBmdW5jdGlvbiBfY2xlYXJUaW1lb3V0KCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lcik7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKTtcbiAgICBkZWxldGUgdGhpcy5fdGltZXI7XG4gICAgZGVsZXRlIHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSBkZWZhdWx0IHJlc3BvbnNlIGJvZHkgcGFyc2VyXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB0byBjb252ZXJ0IGluY29taW5nIGRhdGEgaW50byByZXF1ZXN0LmJvZHlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZShmbikge1xuICAgIHRoaXMuX3BhcnNlciA9IGZuO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgZm9ybWF0IG9mIGJpbmFyeSByZXNwb25zZSBib2R5LlxuICogSW4gYnJvd3NlciB2YWxpZCBmb3JtYXRzIGFyZSAnYmxvYicgYW5kICdhcnJheWJ1ZmZlcicsXG4gKiB3aGljaCByZXR1cm4gQmxvYiBhbmQgQXJyYXlCdWZmZXIsIHJlc3BlY3RpdmVseS5cbiAqXG4gKiBJbiBOb2RlIGFsbCB2YWx1ZXMgcmVzdWx0IGluIEJ1ZmZlci5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5yZXNwb25zZVR5cGUoJ2Jsb2InKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVzcG9uc2VUeXBlID0gZnVuY3Rpb24gKHZhbCkge1xuICAgIHRoaXMuX3Jlc3BvbnNlVHlwZSA9IHZhbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgZGVmYXVsdCByZXF1ZXN0IGJvZHkgc2VyaWFsaXplclxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBkYXRhIHNldCB2aWEgLnNlbmQgb3IgLmF0dGFjaCBpbnRvIHBheWxvYWQgdG8gc2VuZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZm4pIHtcbiAgICB0aGlzLl9zZXJpYWxpemVyID0gZm47XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aW1lb3V0cy5cbiAqXG4gKiAtIHJlc3BvbnNlIHRpbWVvdXQgaXMgdGltZSBiZXR3ZWVuIHNlbmRpbmcgcmVxdWVzdCBhbmQgcmVjZWl2aW5nIHRoZSBmaXJzdCBieXRlIG9mIHRoZSByZXNwb25zZS4gSW5jbHVkZXMgRE5TIGFuZCBjb25uZWN0aW9uIHRpbWUuXG4gKiAtIGRlYWRsaW5lIGlzIHRoZSB0aW1lIGZyb20gc3RhcnQgb2YgdGhlIHJlcXVlc3QgdG8gcmVjZWl2aW5nIHJlc3BvbnNlIGJvZHkgaW4gZnVsbC4gSWYgdGhlIGRlYWRsaW5lIGlzIHRvbyBzaG9ydCBsYXJnZSBmaWxlcyBtYXkgbm90IGxvYWQgYXQgYWxsIG9uIHNsb3cgY29ubmVjdGlvbnMuXG4gKlxuICogVmFsdWUgb2YgMCBvciBmYWxzZSBtZWFucyBubyB0aW1lb3V0LlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gbXMgb3Ige3Jlc3BvbnNlLCByZWFkLCBkZWFkbGluZX1cbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uIHRpbWVvdXQob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucyB8fCAnb2JqZWN0JyAhPT0gdHlwZW9mIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnM7XG4gICAgICAgIHRoaXMuX3Jlc3BvbnNlVGltZW91dCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGZvciAodmFyIG9wdGlvbiBpbiBvcHRpb25zKSB7XG4gICAgICAgIHN3aXRjaCAob3B0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdkZWFkbGluZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnMuZGVhZGxpbmU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZXNwb25zZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gb3B0aW9ucy5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiVW5rbm93biB0aW1lb3V0IG9wdGlvblwiLCBvcHRpb24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgbnVtYmVyIG9mIHJldHJ5IGF0dGVtcHRzIG9uIGVycm9yLlxuICpcbiAqIEZhaWxlZCByZXF1ZXN0cyB3aWxsIGJlIHJldHJpZWQgJ2NvdW50JyB0aW1lcyBpZiB0aW1lb3V0IG9yIGVyci5jb2RlID49IDUwMC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmV0cnkgPSBmdW5jdGlvbiByZXRyeShjb3VudCkge1xuICAgIC8vIERlZmF1bHQgdG8gMSBpZiBubyBjb3VudCBwYXNzZWQgb3IgdHJ1ZVxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwIHx8IGNvdW50ID09PSB0cnVlKSBjb3VudCA9IDE7XG4gICAgaWYgKGNvdW50IDw9IDApIGNvdW50ID0gMDtcbiAgICB0aGlzLl9tYXhSZXRyaWVzID0gY291bnQ7XG4gICAgdGhpcy5fcmV0cmllcyA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHJ5IHJlcXVlc3RcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fcmV0cnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jbGVhclRpbWVvdXQoKTtcblxuICAgIC8vIG5vZGVcbiAgICBpZiAodGhpcy5yZXEpIHtcbiAgICAgICAgdGhpcy5yZXEgPSBudWxsO1xuICAgICAgICB0aGlzLnJlcSA9IHRoaXMucmVxdWVzdCgpO1xuICAgIH1cblxuICAgIHRoaXMuX2Fib3J0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnRpbWVkb3V0ID0gZmFsc2U7XG5cbiAgICByZXR1cm4gdGhpcy5fZW5kKCk7XG59O1xuXG4vKipcbiAqIFByb21pc2Ugc3VwcG9ydFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZWplY3RdXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gdGhlbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAoIXRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiV2FybmluZzogc3VwZXJhZ2VudCByZXF1ZXN0IHdhcyBzZW50IHR3aWNlLCBiZWNhdXNlIGJvdGggLmVuZCgpIGFuZCAudGhlbigpIHdlcmUgY2FsbGVkLiBOZXZlciBjYWxsIC5lbmQoKSBpZiB5b3UgdXNlIHByb21pc2VzXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKGlubmVyUmVzb2x2ZSwgaW5uZXJSZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYuZW5kKGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIGlubmVyUmVqZWN0KGVycik7IGVsc2UgaW5uZXJSZXNvbHZlKHJlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG59XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIChjYikge1xuICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBjYik7XG59O1xuXG4vKipcbiAqIEFsbG93IGZvciBleHRlbnNpb25cbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGZuKSB7XG4gICAgZm4odGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5vayA9IGZ1bmN0aW9uIChjYikge1xuICAgIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgY2IpIHRocm93IEVycm9yKFwiQ2FsbGJhY2sgcmVxdWlyZWRcIik7XG4gICAgdGhpcy5fb2tDYWxsYmFjayA9IGNiO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9pc1Jlc3BvbnNlT0sgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9va0NhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9va0NhbGxiYWNrKHJlcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcy5zdGF0dXMgPj0gMjAwICYmIHJlcy5zdGF0dXMgPCAzMDA7XG59O1xuXG5cbi8qKlxuICogR2V0IHJlcXVlc3QgaGVhZGVyIGBmaWVsZGAuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZpZWxkKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogR2V0IGNhc2UtaW5zZW5zaXRpdmUgaGVhZGVyIGBmaWVsZGAgdmFsdWUuXG4gKiBUaGlzIGlzIGEgZGVwcmVjYXRlZCBpbnRlcm5hbCBBUEkuIFVzZSBgLmdldChmaWVsZClgIGluc3RlYWQuXG4gKlxuICogKGdldEhlYWRlciBpcyBubyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoZSBzdXBlcmFnZW50IGNvZGUgYmFzZSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQGRlcHJlY2F0ZWRcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0SGVhZGVyID0gUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldDtcblxuLyoqXG4gKiBTZXQgaGVhZGVyIGBmaWVsZGAgdG8gYHZhbGAsIG9yIG11bHRpcGxlIGZpZWxkcyB3aXRoIG9uZSBvYmplY3QuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCgnQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5zZXQoJ1gtQVBJLUtleScsICdmb29iYXInKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCh7IEFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLCAnWC1BUEktS2V5JzogJ2Zvb2JhcicgfSlcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGZpZWxkXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmaWVsZCwgdmFsKSB7XG4gICAgaWYgKGlzT2JqZWN0KGZpZWxkKSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZmllbGQpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KGtleSwgZmllbGRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXSA9IHZhbDtcbiAgICB0aGlzLmhlYWRlcltmaWVsZF0gPSB2YWw7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC51bnNldCgnVXNlci1BZ2VudCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS51bnNldCA9IGZ1bmN0aW9uIChmaWVsZCkge1xuICAgIGRlbGV0ZSB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG4gICAgZGVsZXRlIHRoaXMuaGVhZGVyW2ZpZWxkXTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogV3JpdGUgdGhlIGZpZWxkIGBuYW1lYCBhbmQgYHZhbGAsIG9yIG11bHRpcGxlIGZpZWxkcyB3aXRoIG9uZSBvYmplY3RcbiAqIGZvciBcIm11bHRpcGFydC9mb3JtLWRhdGFcIiByZXF1ZXN0IGJvZGllcy5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5maWVsZCgnZm9vJywgJ2JhcicpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5maWVsZCh7IGZvbzogJ2JhcicsIGJhejogJ3F1eCcgfSlcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfEJsb2J8RmlsZXxCdWZmZXJ8ZnMuUmVhZFN0cmVhbX0gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5maWVsZCA9IGZ1bmN0aW9uIChuYW1lLCB2YWwpIHtcblxuICAgIC8vIG5hbWUgc2hvdWxkIGJlIGVpdGhlciBhIHN0cmluZyBvciBhbiBvYmplY3QuXG4gICAgaWYgKG51bGwgPT09IG5hbWUgfHwgdW5kZWZpbmVkID09PSBuYW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgbmFtZSBjYW4gbm90IGJlIGVtcHR5Jyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIi5maWVsZCgpIGNhbid0IGJlIHVzZWQgaWYgLnNlbmQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICAgIH1cblxuICAgIGlmIChpc09iamVjdChuYW1lKSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gbmFtZSkge1xuICAgICAgICAgICAgdGhpcy5maWVsZChrZXksIG5hbWVba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbCkge1xuICAgICAgICAgICAgdGhpcy5maWVsZChuYW1lLCB2YWxbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHZhbCBzaG91bGQgYmUgZGVmaW5lZCBub3dcbiAgICBpZiAobnVsbCA9PT0gdmFsIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgdmFsIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgICB9XG4gICAgaWYgKCdib29sZWFuJyA9PT0gdHlwZW9mIHZhbCkge1xuICAgICAgICB2YWwgPSAnJyArIHZhbDtcbiAgICB9XG4gICAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQobmFtZSwgdmFsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWJvcnQgdGhlIHJlcXVlc3QsIGFuZCBjbGVhciBwb3RlbnRpYWwgdGltZW91dC5cbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuUmVxdWVzdEJhc2UucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB0aGlzLl9hYm9ydGVkID0gdHJ1ZTtcbiAgICB0aGlzLnhociAmJiB0aGlzLnhoci5hYm9ydCgpOyAvLyBicm93c2VyXG4gICAgdGhpcy5yZXEgJiYgdGhpcy5yZXEuYWJvcnQoKTsgLy8gbm9kZVxuICAgIHRoaXMuY2xlYXJUaW1lb3V0KCk7XG4gICAgdGhpcy5lbWl0KCdhYm9ydCcpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbmFibGUgdHJhbnNtaXNzaW9uIG9mIGNvb2tpZXMgd2l0aCB4LWRvbWFpbiByZXF1ZXN0cy5cbiAqXG4gKiBOb3RlIHRoYXQgZm9yIHRoaXMgdG8gd29yayB0aGUgb3JpZ2luIG11c3Qgbm90IGJlXG4gKiB1c2luZyBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiIHdpdGggYSB3aWxkY2FyZCxcbiAqIGFuZCBhbHNvIG11c3Qgc2V0IFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHNcIlxuICogdG8gXCJ0cnVlXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUud2l0aENyZWRlbnRpYWxzID0gZnVuY3Rpb24gKG9uKSB7XG4gICAgLy8gVGhpcyBpcyBicm93c2VyLW9ubHkgZnVuY3Rpb25hbGl0eS4gTm9kZSBzaWRlIGlzIG5vLW9wLlxuICAgIGlmIChvbiA9PSB1bmRlZmluZWQpIG9uID0gdHJ1ZTtcbiAgICB0aGlzLl93aXRoQ3JlZGVudGlhbHMgPSBvbjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBtYXggcmVkaXJlY3RzIHRvIGBuYC4gRG9lcyBub3RpbmcgaW4gYnJvd3NlciBYSFIgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG5cbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVkaXJlY3RzID0gZnVuY3Rpb24gKG4pIHtcbiAgICB0aGlzLl9tYXhSZWRpcmVjdHMgPSBuO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0IHRvIGEgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QgKG5vdCBKU09OIHN0cmluZykgb2Ygc2NhbGFyIHByb3BlcnRpZXMuXG4gKiBOb3RlIGFzIHRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHJldHVybiBhIHVzZWZ1bCBub24tdGhpcyB2YWx1ZSxcbiAqIGl0IGNhbm5vdCBiZSBjaGFpbmVkLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gZGVzY3JpYmluZyBtZXRob2QsIHVybCwgYW5kIGRhdGEgb2YgdGhpcyByZXF1ZXN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbWV0aG9kOiB0aGlzLm1ldGhvZCxcbiAgICAgICAgdXJsOiB0aGlzLnVybCxcbiAgICAgICAgZGF0YTogdGhpcy5fZGF0YSxcbiAgICAgICAgaGVhZGVyczogdGhpcy5faGVhZGVyXG4gICAgfTtcbn07XG5cblxuLyoqXG4gKiBTZW5kIGBkYXRhYCBhcyB0aGUgcmVxdWVzdCBib2R5LCBkZWZhdWx0aW5nIHRoZSBgLnR5cGUoKWAgdG8gXCJqc29uXCIgd2hlblxuICogYW4gb2JqZWN0IGlzIGdpdmVuLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgIC8vIG1hbnVhbCBqc29uXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2pzb24nKVxuICogICAgICAgICAuc2VuZCgne1wibmFtZVwiOlwidGpcIn0nKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGF1dG8ganNvblxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIG1hbnVhbCB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnZm9ybScpXG4gKiAgICAgICAgIC5zZW5kKCduYW1lPXRqJylcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBhdXRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdmb3JtJylcbiAqICAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gZGVmYXVsdHMgdG8geC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgIC5zZW5kKCduYW1lPXRvYmknKVxuICogICAgICAgIC5zZW5kKCdzcGVjaWVzPWZlcnJldCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGRhdGFcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGlzT2JqID0gaXNPYmplY3QoZGF0YSk7XG4gICAgdmFyIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuXG4gICAgaWYgKHRoaXMuX2Zvcm1EYXRhKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCIuc2VuZCgpIGNhbid0IGJlIHVzZWQgaWYgLmF0dGFjaCgpIG9yIC5maWVsZCgpIGlzIHVzZWQuIFBsZWFzZSB1c2Ugb25seSAuc2VuZCgpIG9yIG9ubHkgLmZpZWxkKCkgJiAuYXR0YWNoKClcIik7XG4gICAgfVxuXG4gICAgaWYgKGlzT2JqICYmICF0aGlzLl9kYXRhKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChkYXRhICYmIHRoaXMuX2RhdGEgJiYgdGhpcy5faXNIb3N0KHRoaXMuX2RhdGEpKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiQ2FuJ3QgbWVyZ2UgdGhlc2Ugc2VuZCBjYWxsc1wiKTtcbiAgICB9XG5cbiAgICAvLyBtZXJnZVxuICAgIGlmIChpc09iaiAmJiBpc09iamVjdCh0aGlzLl9kYXRhKSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YVtrZXldID0gZGF0YVtrZXldO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgZGF0YSkge1xuICAgICAgICAvLyBkZWZhdWx0IHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICAgICAgICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnZm9ybScpO1xuICAgICAgICB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgaWYgKCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnID09IHR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAgICAgICAgICAgPyB0aGlzLl9kYXRhICsgJyYnICsgZGF0YVxuICAgICAgICAgICAgICAgIDogZGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEgPSAodGhpcy5fZGF0YSB8fCAnJykgKyBkYXRhO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgfVxuXG4gICAgaWYgKCFpc09iaiB8fCB0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gZGVmYXVsdCB0byBqc29uXG4gICAgaWYgKCF0eXBlKSB0aGlzLnR5cGUoJ2pzb24nKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTb3J0IGBxdWVyeXN0cmluZ2AgYnkgdGhlIHNvcnQgZnVuY3Rpb25cbiAqXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICAgLy8gZGVmYXVsdCBvcmRlclxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGN1c3RvbWl6ZWQgc29ydCBmdW5jdGlvblxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoZnVuY3Rpb24oYSwgYil7XG4gKiAgICAgICAgICAgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gKiAgICAgICAgIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHNvcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc29ydFF1ZXJ5ID0gZnVuY3Rpb24gKHNvcnQpIHtcbiAgICAvLyBfc29ydCBkZWZhdWx0IHRvIHRydWUgYnV0IG90aGVyd2lzZSBjYW4gYmUgYSBmdW5jdGlvbiBvciBib29sZWFuXG4gICAgdGhpcy5fc29ydCA9IHR5cGVvZiBzb3J0ID09PSAndW5kZWZpbmVkJyA/IHRydWUgOiBzb3J0O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbnZva2UgY2FsbGJhY2sgd2l0aCB0aW1lb3V0IGVycm9yLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fdGltZW91dEVycm9yID0gZnVuY3Rpb24gKHJlYXNvbiwgdGltZW91dCwgZXJybm8pIHtcbiAgICBpZiAodGhpcy5fYWJvcnRlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IocmVhc29uICsgdGltZW91dCArICdtcyBleGNlZWRlZCcpO1xuICAgIGVyci50aW1lb3V0ID0gdGltZW91dDtcbiAgICBlcnIuY29kZSA9ICdFQ09OTkFCT1JURUQnO1xuICAgIGVyci5lcnJubyA9IGVycm5vO1xuICAgIHRoaXMudGltZWRvdXQgPSB0cnVlO1xuICAgIHRoaXMuYWJvcnQoKTtcbiAgICB0aGlzLmNhbGxiYWNrKGVycik7XG59O1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX3NldFRpbWVvdXRzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIGRlYWRsaW5lXG4gICAgaWYgKHRoaXMuX3RpbWVvdXQgJiYgIXRoaXMuX3RpbWVyKSB7XG4gICAgICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl90aW1lb3V0RXJyb3IoJ1RpbWVvdXQgb2YgJywgc2VsZi5fdGltZW91dCwgJ0VUSU1FJyk7XG4gICAgICAgIH0sIHRoaXMuX3RpbWVvdXQpO1xuICAgIH1cbiAgICAvLyByZXNwb25zZSB0aW1lb3V0XG4gICAgaWYgKHRoaXMuX3Jlc3BvbnNlVGltZW91dCAmJiAhdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcignUmVzcG9uc2UgdGltZW91dCBvZiAnLCBzZWxmLl9yZXNwb25zZVRpbWVvdXQsICdFVElNRURPVVQnKTtcbiAgICAgICAgfSwgdGhpcy5fcmVzcG9uc2VUaW1lb3V0KTtcbiAgICB9XG59XG4iLCIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG4vKipcbiAqIEV4cG9zZSBgUmVzcG9uc2VCYXNlYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc3BvbnNlQmFzZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZUJhc2VgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2VCYXNlKG9iaikge1xuICAgIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gUmVzcG9uc2VCYXNlLnByb3RvdHlwZSkge1xuICAgICAgICBvYmpba2V5XSA9IFJlc3BvbnNlQmFzZS5wcm90b3R5cGVba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBHZXQgY2FzZS1pbnNlbnNpdGl2ZSBgZmllbGRgIHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmaWVsZCkge1xuICAgIHJldHVybiB0aGlzLmhlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogU2V0IGhlYWRlciByZWxhdGVkIHByb3BlcnRpZXM6XG4gKlxuICogICAtIGAudHlwZWAgdGhlIGNvbnRlbnQgdHlwZSB3aXRob3V0IHBhcmFtc1xuICpcbiAqIEEgcmVzcG9uc2Ugb2YgXCJDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIlxuICogd2lsbCBwcm92aWRlIHlvdSB3aXRoIGEgYC50eXBlYCBvZiBcInRleHQvcGxhaW5cIi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRIZWFkZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKGhlYWRlcikge1xuICAgIC8vIFRPRE86IG1vYXIhXG4gICAgLy8gVE9ETzogbWFrZSB0aGlzIGEgdXRpbFxuXG4gICAgLy8gY29udGVudC10eXBlXG4gICAgdmFyIGN0ID0gaGVhZGVyWydjb250ZW50LXR5cGUnXSB8fCAnJztcbiAgICB0aGlzLnR5cGUgPSB1dGlscy50eXBlKGN0KTtcblxuICAgIC8vIHBhcmFtc1xuICAgIHZhciBwYXJhbXMgPSB1dGlscy5wYXJhbXMoY3QpO1xuICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHRoaXNba2V5XSA9IHBhcmFtc1trZXldO1xuXG4gICAgdGhpcy5saW5rcyA9IHt9O1xuXG4gICAgLy8gbGlua3NcbiAgICB0cnkge1xuICAgICAgICBpZiAoaGVhZGVyLmxpbmspIHtcbiAgICAgICAgICAgIHRoaXMubGlua3MgPSB1dGlscy5wYXJzZUxpbmtzKGhlYWRlci5saW5rKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBpZ25vcmVcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldCBmbGFncyBzdWNoIGFzIGAub2tgIGJhc2VkIG9uIGBzdGF0dXNgLlxuICpcbiAqIEZvciBleGFtcGxlIGEgMnh4IHJlc3BvbnNlIHdpbGwgZ2l2ZSB5b3UgYSBgLm9rYCBvZiBfX3RydWVfX1xuICogd2hlcmVhcyA1eHggd2lsbCBiZSBfX2ZhbHNlX18gYW5kIGAuZXJyb3JgIHdpbGwgYmUgX190cnVlX18uIFRoZVxuICogYC5jbGllbnRFcnJvcmAgYW5kIGAuc2VydmVyRXJyb3JgIGFyZSBhbHNvIGF2YWlsYWJsZSB0byBiZSBtb3JlXG4gKiBzcGVjaWZpYywgYW5kIGAuc3RhdHVzVHlwZWAgaXMgdGhlIGNsYXNzIG9mIGVycm9yIHJhbmdpbmcgZnJvbSAxLi41XG4gKiBzb21ldGltZXMgdXNlZnVsIGZvciBtYXBwaW5nIHJlc3BvbmQgY29sb3JzIGV0Yy5cbiAqXG4gKiBcInN1Z2FyXCIgcHJvcGVydGllcyBhcmUgYWxzbyBkZWZpbmVkIGZvciBjb21tb24gY2FzZXMuIEN1cnJlbnRseSBwcm92aWRpbmc6XG4gKlxuICogICAtIC5ub0NvbnRlbnRcbiAqICAgLSAuYmFkUmVxdWVzdFxuICogICAtIC51bmF1dGhvcml6ZWRcbiAqICAgLSAubm90QWNjZXB0YWJsZVxuICogICAtIC5ub3RGb3VuZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBzdGF0dXNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuX3NldFN0YXR1c1Byb3BlcnRpZXMgPSBmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgdmFyIHR5cGUgPSBzdGF0dXMgLyAxMDAgfCAwO1xuXG4gICAgLy8gc3RhdHVzIC8gY2xhc3NcbiAgICB0aGlzLnN0YXR1cyA9IHRoaXMuc3RhdHVzQ29kZSA9IHN0YXR1cztcbiAgICB0aGlzLnN0YXR1c1R5cGUgPSB0eXBlO1xuXG4gICAgLy8gYmFzaWNzXG4gICAgdGhpcy5pbmZvID0gMSA9PSB0eXBlO1xuICAgIHRoaXMub2sgPSAyID09IHR5cGU7XG4gICAgdGhpcy5yZWRpcmVjdCA9IDMgPT0gdHlwZTtcbiAgICB0aGlzLmNsaWVudEVycm9yID0gNCA9PSB0eXBlO1xuICAgIHRoaXMuc2VydmVyRXJyb3IgPSA1ID09IHR5cGU7XG4gICAgdGhpcy5lcnJvciA9ICg0ID09IHR5cGUgfHwgNSA9PSB0eXBlKVxuICAgICAgICA/IHRoaXMudG9FcnJvcigpXG4gICAgICAgIDogZmFsc2U7XG5cbiAgICAvLyBzdWdhclxuICAgIHRoaXMuYWNjZXB0ZWQgPSAyMDIgPT0gc3RhdHVzO1xuICAgIHRoaXMubm9Db250ZW50ID0gMjA0ID09IHN0YXR1cztcbiAgICB0aGlzLmJhZFJlcXVlc3QgPSA0MDAgPT0gc3RhdHVzO1xuICAgIHRoaXMudW5hdXRob3JpemVkID0gNDAxID09IHN0YXR1cztcbiAgICB0aGlzLm5vdEFjY2VwdGFibGUgPSA0MDYgPT0gc3RhdHVzO1xuICAgIHRoaXMuZm9yYmlkZGVuID0gNDAzID09IHN0YXR1cztcbiAgICB0aGlzLm5vdEZvdW5kID0gNDA0ID09IHN0YXR1cztcbn07XG4iLCJ2YXIgRVJST1JfQ09ERVMgPSBbXG4gICAgJ0VDT05OUkVTRVQnLFxuICAgICdFVElNRURPVVQnLFxuICAgICdFQUREUklORk8nLFxuICAgICdFU09DS0VUVElNRURPVVQnXG5dO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHJlcXVlc3Qgc2hvdWxkIGJlIHJldHJpZWQuXG4gKiAoQm9ycm93ZWQgZnJvbSBzZWdtZW50aW8vc3VwZXJhZ2VudC1yZXRyeSlcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IFtyZXNdXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaG91bGRSZXRyeShlcnIsIHJlcykge1xuICAgIGlmIChlcnIgJiYgZXJyLmNvZGUgJiYgfkVSUk9SX0NPREVTLmluZGV4T2YoZXJyLmNvZGUpKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAocmVzICYmIHJlcy5zdGF0dXMgJiYgcmVzLnN0YXR1cyA+PSA1MDApIHJldHVybiB0cnVlO1xuICAgIC8vIFN1cGVyYWdlbnQgdGltZW91dFxuICAgIGlmIChlcnIgJiYgJ3RpbWVvdXQnIGluIGVyciAmJiBlcnIuY29kZSA9PSAnRUNPTk5BQk9SVEVEJykgcmV0dXJuIHRydWU7XG4gICAgaWYgKGVyciAmJiAnY3Jvc3NEb21haW4nIGluIGVycikgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcbiIsIi8qKlxuICogUmV0dXJuIHRoZSBtaW1lIHR5cGUgZm9yIHRoZSBnaXZlbiBgc3RyYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnR5cGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5zaGlmdCgpO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gaGVhZGVyIGZpZWxkIHBhcmFtZXRlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5wYXJhbXMgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo9ICovKTtcbiAgICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHZhciB2YWwgPSBwYXJ0cy5zaGlmdCgpO1xuXG4gICAgICAgIGlmIChrZXkgJiYgdmFsKSBvYmpba2V5XSA9IHZhbDtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFBhcnNlIExpbmsgaGVhZGVyIGZpZWxkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnBhcnNlTGlua3MgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5zcGxpdCgvICosICovKS5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo7ICovKTtcbiAgICAgICAgdmFyIHVybCA9IHBhcnRzWzBdLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgdmFyIHJlbCA9IHBhcnRzWzFdLnNwbGl0KC8gKj0gKi8pWzFdLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgb2JqW3JlbF0gPSB1cmw7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30pO1xufTtcblxuLyoqXG4gKiBTdHJpcCBjb250ZW50IHJlbGF0ZWQgZmllbGRzIGZyb20gYGhlYWRlcmAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGhlYWRlclxuICogQHJldHVybiB7T2JqZWN0fSBoZWFkZXJcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMuY2xlYW5IZWFkZXIgPSBmdW5jdGlvbiAoaGVhZGVyLCBzaG91bGRTdHJpcENvb2tpZSkge1xuICAgIGRlbGV0ZSBoZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGRlbGV0ZSBoZWFkZXJbJ2NvbnRlbnQtbGVuZ3RoJ107XG4gICAgZGVsZXRlIGhlYWRlclsndHJhbnNmZXItZW5jb2RpbmcnXTtcbiAgICBkZWxldGUgaGVhZGVyWydob3N0J107XG4gICAgaWYgKHNob3VsZFN0cmlwQ29va2llKSB7XG4gICAgICAgIGRlbGV0ZSBoZWFkZXJbJ2Nvb2tpZSddO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVyO1xufTsiLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ3N1cGVyYWdlbnQnLCAncXVlcnlzdHJpbmcnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJ3N1cGVyYWdlbnQnKSwgcmVxdWlyZSgncXVlcnlzdHJpbmcnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICAgICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQgPSBmYWN0b3J5KHJvb3Quc3VwZXJhZ2VudCwgcm9vdC5xdWVyeXN0cmluZyk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoc3VwZXJhZ2VudCwgcXVlcnlzdHJpbmcpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKipcbiAgICAgKiBAbW9kdWxlIEFwaUNsaWVudFxuICAgICAqIEB2ZXJzaW9uIDEuMC43XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBNYW5hZ2VzIGxvdyBsZXZlbCBjbGllbnQtc2VydmVyIGNvbW11bmljYXRpb25zLCBwYXJhbWV0ZXIgbWFyc2hhbGxpbmcsIGV0Yy4gVGhlcmUgc2hvdWxkIG5vdCBiZSBhbnkgbmVlZCBmb3IgYW5cbiAgICAgKiBhcHBsaWNhdGlvbiB0byB1c2UgdGhpcyBjbGFzcyBkaXJlY3RseSAtIHRoZSAqQXBpIGFuZCBtb2RlbCBjbGFzc2VzIHByb3ZpZGUgdGhlIHB1YmxpYyBBUEkgZm9yIHRoZSBzZXJ2aWNlLiBUaGVcbiAgICAgKiBjb250ZW50cyBvZiB0aGlzIGZpbGUgc2hvdWxkIGJlIHJlZ2FyZGVkIGFzIGludGVybmFsIGJ1dCBhcmUgZG9jdW1lbnRlZCBmb3IgY29tcGxldGVuZXNzLlxuICAgICAqIEBhbGlhcyBtb2R1bGU6QXBpQ2xpZW50XG4gICAgICogQGNsYXNzXG4gICAgICovXG4gICAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgYmFzZSBVUkwgYWdhaW5zdCB3aGljaCB0byByZXNvbHZlIGV2ZXJ5IEFQSSBjYWxsJ3MgKHJlbGF0aXZlKSBwYXRoLlxuICAgICAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAgICAgKiBAZGVmYXVsdCBodHRwOi8vbG9jYWxob3N0OjgwODAvdjJcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYmFzZVBhdGggPSAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3YyJy5yZXBsYWNlKC9cXC8rJC8sICcnKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGF1dGhlbnRpY2F0aW9uIG1ldGhvZHMgdG8gYmUgaW5jbHVkZWQgZm9yIGFsbCBBUEkgY2FsbHMuXG4gICAgICAgICAqIEB0eXBlIHtBcnJheS48U3RyaW5nPn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuYXV0aGVudGljYXRpb25zID0ge307XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgZGVmYXVsdCBIVFRQIGhlYWRlcnMgdG8gYmUgaW5jbHVkZWQgZm9yIGFsbCBBUEkgY2FsbHMuXG4gICAgICAgICAqIEB0eXBlIHtBcnJheS48U3RyaW5nPn1cbiAgICAgICAgICogQGRlZmF1bHQge31cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZGVmYXVsdEhlYWRlcnMgPSB7fTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGRlZmF1bHQgSFRUUCB0aW1lb3V0IGZvciBhbGwgQVBJIGNhbGxzLlxuICAgICAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAgICAgKiBAZGVmYXVsdCA2MDAwMFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50aW1lb3V0ID0gNjAwMDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIElmIHNldCB0byBmYWxzZSBhbiBhZGRpdGlvbmFsIHRpbWVzdGFtcCBwYXJhbWV0ZXIgaXMgYWRkZWQgdG8gYWxsIEFQSSBHRVQgY2FsbHMgdG9cbiAgICAgICAgICogcHJldmVudCBicm93c2VyIGNhY2hpbmdcbiAgICAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY2FjaGUgPSB0cnVlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGNsaWVudCB3aWxsIHNhdmUgdGhlIGNvb2tpZXMgZnJvbSBlYWNoIHNlcnZlclxuICAgICAgICAgKiByZXNwb25zZSwgYW5kIHJldHVybiB0aGVtIGluIHRoZSBuZXh0IHJlcXVlc3QuXG4gICAgICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVuYWJsZUNvb2tpZXMgPSBmYWxzZTtcblxuICAgICAgICAvKlxuICAgICAgICAgKiBVc2VkIHRvIHNhdmUgYW5kIHJldHVybiBjb29raWVzIGluIGEgbm9kZS5qcyAobm9uLWJyb3dzZXIpIHNldHRpbmcsXG4gICAgICAgICAqIGlmIHRoaXMuZW5hYmxlQ29va2llcyBpcyBzZXQgdG8gdHJ1ZS5cbiAgICAgICAgICovXG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhpcy5hZ2VudCA9IG5ldyBzdXBlcmFnZW50LmFnZW50KCk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIGZvciBhbiBhY3R1YWwgcGFyYW1ldGVyLlxuICAgICAqIEBwYXJhbSBwYXJhbSBUaGUgYWN0dWFsIHBhcmFtZXRlci5cbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIDxjb2RlPnBhcmFtPC9jb2RlPi5cbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZS5wYXJhbVRvU3RyaW5nID0gZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgICAgIGlmIChwYXJhbSA9PSB1bmRlZmluZWQgfHwgcGFyYW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJhbS50b0pTT04oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcGFyYW0udG9TdHJpbmcoKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQnVpbGRzIGZ1bGwgVVJMIGJ5IGFwcGVuZGluZyB0aGUgZ2l2ZW4gcGF0aCB0byB0aGUgYmFzZSBVUkwgYW5kIHJlcGxhY2luZyBwYXRoIHBhcmFtZXRlciBwbGFjZS1ob2xkZXJzIHdpdGggcGFyYW1ldGVyIHZhbHVlcy5cbiAgICAgKiBOT1RFOiBxdWVyeSBwYXJhbWV0ZXJzIGFyZSBub3QgaGFuZGxlZCBoZXJlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgYmFzZSBVUkwuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhdGhQYXJhbXMgVGhlIHBhcmFtZXRlciB2YWx1ZXMgdG8gYXBwZW5kLlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBlbmNvZGVkIHBhdGggd2l0aCBwYXJhbWV0ZXIgdmFsdWVzIHN1YnN0aXR1dGVkLlxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlLmJ1aWxkVXJsID0gZnVuY3Rpb24gKHBhdGgsIHBhdGhQYXJhbXMpIHtcbiAgICAgICAgaWYgKCFwYXRoLm1hdGNoKC9eXFwvLykpIHtcbiAgICAgICAgICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICAgICAgICB9XG4gICAgICAgIHZhciB1cmwgPSB0aGlzLmJhc2VQYXRoICsgcGF0aDtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoL1xceyhbXFx3LV0rKVxcfS9nLCBmdW5jdGlvbiAoZnVsbE1hdGNoLCBrZXkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZTtcbiAgICAgICAgICAgIGlmIChwYXRoUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IF90aGlzLnBhcmFtVG9TdHJpbmcocGF0aFBhcmFtc1trZXldKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBmdWxsTWF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB1cmw7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBjb250ZW50IHR5cGUgcmVwcmVzZW50cyBKU09OLjxicj5cbiAgICAgKiBKU09OIGNvbnRlbnQgdHlwZSBleGFtcGxlczo8YnI+XG4gICAgICogPHVsPlxuICAgICAqIDxsaT5hcHBsaWNhdGlvbi9qc29uPC9saT5cbiAgICAgKiA8bGk+YXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEY4PC9saT5cbiAgICAgKiA8bGk+QVBQTElDQVRJT04vSlNPTjwvbGk+XG4gICAgICogPC91bD5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gY29udGVudFR5cGUgVGhlIE1JTUUgY29udGVudCB0eXBlIHRvIGNoZWNrLlxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiA8Y29kZT5jb250ZW50VHlwZTwvY29kZT4gcmVwcmVzZW50cyBKU09OLCBvdGhlcndpc2UgPGNvZGU+ZmFsc2U8L2NvZGU+LlxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlLmlzSnNvbk1pbWUgPSBmdW5jdGlvbiAoY29udGVudFR5cGUpIHtcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4oY29udGVudFR5cGUgIT0gbnVsbCAmJiBjb250ZW50VHlwZS5tYXRjaCgvXmFwcGxpY2F0aW9uXFwvanNvbig7LiopPyQvaSkpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaG9vc2VzIGEgY29udGVudCB0eXBlIGZyb20gdGhlIGdpdmVuIGFycmF5LCB3aXRoIEpTT04gcHJlZmVycmVkOyBpLmUuIHJldHVybiBKU09OIGlmIGluY2x1ZGVkLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBmaXJzdC5cbiAgICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBjb250ZW50VHlwZXNcbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgY2hvc2VuIGNvbnRlbnQgdHlwZSwgcHJlZmVycmluZyBKU09OLlxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlLmpzb25QcmVmZXJyZWRNaW1lID0gZnVuY3Rpb24gKGNvbnRlbnRUeXBlcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnRlbnRUeXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuaXNKc29uTWltZShjb250ZW50VHlwZXNbaV0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbnRlbnRUeXBlc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29udGVudFR5cGVzWzBdO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gcGFyYW1ldGVyIHZhbHVlIHJlcHJlc2VudHMgZmlsZS1saWtlIGNvbnRlbnQuXG4gICAgICogQHBhcmFtIHBhcmFtIFRoZSBwYXJhbWV0ZXIgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIDxjb2RlPnBhcmFtPC9jb2RlPiByZXByZXNlbnRzIGEgZmlsZS5cbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZS5pc0ZpbGVQYXJhbSA9IGZ1bmN0aW9uIChwYXJhbSkge1xuICAgICAgICAvLyBmcy5SZWFkU3RyZWFtIGluIE5vZGUuanMgYW5kIEVsZWN0cm9uIChidXQgbm90IGluIHJ1bnRpbWUgbGlrZSBicm93c2VyaWZ5KVxuICAgICAgICBpZiAodHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhciBmcztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZnMgJiYgZnMuUmVhZFN0cmVhbSAmJiBwYXJhbSBpbnN0YW5jZW9mIGZzLlJlYWRTdHJlYW0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBCdWZmZXIgaW4gTm9kZS5qc1xuICAgICAgICBpZiAodHlwZW9mIEJ1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBwYXJhbSBpbnN0YW5jZW9mIEJ1ZmZlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQmxvYiBpbiBicm93c2VyXG4gICAgICAgIGlmICh0eXBlb2YgQmxvYiA9PT0gJ2Z1bmN0aW9uJyAmJiBwYXJhbSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZpbGUgaW4gYnJvd3NlciAoaXQgc2VlbXMgRmlsZSBvYmplY3QgaXMgYWxzbyBpbnN0YW5jZSBvZiBCbG9iLCBidXQga2VlcCB0aGlzIGZvciBzYWZlKVxuICAgICAgICBpZiAodHlwZW9mIEZpbGUgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBGaWxlKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIE5vcm1hbGl6ZXMgcGFyYW1ldGVyIHZhbHVlczpcbiAgICAgKiA8dWw+XG4gICAgICogPGxpPnJlbW92ZSBuaWxzPC9saT5cbiAgICAgKiA8bGk+a2VlcCBmaWxlcyBhbmQgYXJyYXlzPC9saT5cbiAgICAgKiA8bGk+Zm9ybWF0IHRvIHN0cmluZyB3aXRoIGBwYXJhbVRvU3RyaW5nYCBmb3Igb3RoZXIgY2FzZXM8L2xpPlxuICAgICAqIDwvdWw+XG4gICAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gcGFyYW1zIFRoZSBwYXJhbWV0ZXJzIGFzIG9iamVjdCBwcm9wZXJ0aWVzLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gbm9ybWFsaXplZCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlLm5vcm1hbGl6ZVBhcmFtcyA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgdmFyIG5ld1BhcmFtcyA9IHt9O1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KGtleSkgJiYgcGFyYW1zW2tleV0gIT0gdW5kZWZpbmVkICYmIHBhcmFtc1trZXldICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbXNba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc0ZpbGVQYXJhbSh2YWx1ZSkgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXdQYXJhbXNba2V5XSA9IHRoaXMucGFyYW1Ub1N0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdQYXJhbXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEVudW1lcmF0aW9uIG9mIGNvbGxlY3Rpb24gZm9ybWF0IHNlcGFyYXRvciBzdHJhdGVnaWVzLlxuICAgICAqIEBlbnVtIHtTdHJpbmd9XG4gICAgICogQHJlYWRvbmx5XG4gICAgICovXG4gICAgZXhwb3J0cy5Db2xsZWN0aW9uRm9ybWF0RW51bSA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbW1hLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5jc3Y8L2NvZGU+XG4gICAgICAgICAqIEBjb25zdFxuICAgICAgICAgKi9cbiAgICAgICAgQ1NWOiAnLCcsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTcGFjZS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+c3N2PC9jb2RlPlxuICAgICAgICAgKiBAY29uc3RcbiAgICAgICAgICovXG4gICAgICAgIFNTVjogJyAnLFxuICAgICAgICAvKipcbiAgICAgICAgICogVGFiLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT50c3Y8L2NvZGU+XG4gICAgICAgICAqIEBjb25zdFxuICAgICAgICAgKi9cbiAgICAgICAgVFNWOiAnXFx0JyxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFBpcGUofCktc2VwYXJhdGVkIHZhbHVlcy4gVmFsdWU6IDxjb2RlPnBpcGVzPC9jb2RlPlxuICAgICAgICAgKiBAY29uc3RcbiAgICAgICAgICovXG4gICAgICAgIFBJUEVTOiAnfCcsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBOYXRpdmUgYXJyYXkuIFZhbHVlOiA8Y29kZT5tdWx0aTwvY29kZT5cbiAgICAgICAgICogQGNvbnN0XG4gICAgICAgICAqL1xuICAgICAgICBNVUxUSTogJ211bHRpJ1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gYXJyYXktdHlwZSBhY3R1YWwgcGFyYW1ldGVyLCBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIGNvbGxlY3Rpb24gZm9ybWF0LlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtIEFuIGFycmF5IHBhcmFtZXRlci5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnQuQ29sbGVjdGlvbkZvcm1hdEVudW19IGNvbGxlY3Rpb25Gb3JtYXQgVGhlIGFycmF5IGVsZW1lbnQgc2VwYXJhdG9yIHN0cmF0ZWd5LlxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd8QXJyYXl9IEEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBzdXBwbGllZCBjb2xsZWN0aW9uLCB1c2luZyB0aGUgc3BlY2lmaWVkIGRlbGltaXRlci4gUmV0dXJuc1xuICAgICAqIDxjb2RlPnBhcmFtPC9jb2RlPiBhcyBpcyBpZiA8Y29kZT5jb2xsZWN0aW9uRm9ybWF0PC9jb2RlPiBpcyA8Y29kZT5tdWx0aTwvY29kZT4uXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGUuYnVpbGRDb2xsZWN0aW9uUGFyYW0gPSBmdW5jdGlvbiBidWlsZENvbGxlY3Rpb25QYXJhbShwYXJhbSwgY29sbGVjdGlvbkZvcm1hdCkge1xuICAgICAgICBpZiAocGFyYW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChjb2xsZWN0aW9uRm9ybWF0KSB7XG4gICAgICAgICAgICBjYXNlICdjc3YnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCcsJyk7XG4gICAgICAgICAgICBjYXNlICdzc3YnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCcgJyk7XG4gICAgICAgICAgICBjYXNlICd0c3YnOlxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCdcXHQnKTtcbiAgICAgICAgICAgIGNhc2UgJ3BpcGVzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignfCcpO1xuICAgICAgICAgICAgY2FzZSAnbXVsdGknOlxuICAgICAgICAgICAgICAgIC8vIHJldHVybiB0aGUgYXJyYXkgZGlyZWN0bHkgYXMgU3VwZXJBZ2VudCB3aWxsIGhhbmRsZSBpdCBhcyBleHBlY3RlZFxuICAgICAgICAgICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNvbGxlY3Rpb24gZm9ybWF0OiAnICsgY29sbGVjdGlvbkZvcm1hdCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQXBwbGllcyBhdXRoZW50aWNhdGlvbiBoZWFkZXJzIHRvIHRoZSByZXF1ZXN0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IFRoZSByZXF1ZXN0IG9iamVjdCBjcmVhdGVkIGJ5IGEgPGNvZGU+c3VwZXJhZ2VudCgpPC9jb2RlPiBjYWxsLlxuICAgICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGF1dGhOYW1lcyBBbiBhcnJheSBvZiBhdXRoZW50aWNhdGlvbiBtZXRob2QgbmFtZXMuXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGUuYXBwbHlBdXRoVG9SZXF1ZXN0ID0gZnVuY3Rpb24gKHJlcXVlc3QsIGF1dGhOYW1lcykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBhdXRoTmFtZXMuZm9yRWFjaChmdW5jdGlvbiAoYXV0aE5hbWUpIHtcbiAgICAgICAgICAgIHZhciBhdXRoID0gX3RoaXMuYXV0aGVudGljYXRpb25zW2F1dGhOYW1lXTtcbiAgICAgICAgICAgIHN3aXRjaCAoYXV0aC50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnYmFzaWMnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoYXV0aC51c2VybmFtZSB8fCBhdXRoLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LmF1dGgoYXV0aC51c2VybmFtZSB8fCAnJywgYXV0aC5wYXNzd29yZCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYXBpS2V5JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF1dGguYXBpS2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF1dGguYXBpS2V5UHJlZml4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVthdXRoLm5hbWVdID0gYXV0aC5hcGlLZXlQcmVmaXggKyAnICcgKyBhdXRoLmFwaUtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YVthdXRoLm5hbWVdID0gYXV0aC5hcGlLZXk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXV0aFsnaW4nXSA9PT0gJ2hlYWRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnNldChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5xdWVyeShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdvYXV0aDInOlxuICAgICAgICAgICAgICAgICAgICBpZiAoYXV0aC5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5zZXQoeydBdXRob3JpemF0aW9uJzogJ0JlYXJlciAnICsgYXV0aC5hY2Nlc3NUb2tlbn0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBhdXRoZW50aWNhdGlvbiB0eXBlOiAnICsgYXV0aC50eXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlc2VyaWFsaXplcyBhbiBIVFRQIHJlc3BvbnNlIGJvZHkgaW50byBhIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgQSBTdXBlckFnZW50IHJlc3BvbnNlIG9iamVjdC5cbiAgICAgKiBAcGFyYW0geyhTdHJpbmd8QXJyYXkuPFN0cmluZz58T2JqZWN0LjxTdHJpbmcsIE9iamVjdD58RnVuY3Rpb24pfSByZXR1cm5UeXBlIFRoZSB0eXBlIHRvIHJldHVybi4gUGFzcyBhIHN0cmluZyBmb3Igc2ltcGxlIHR5cGVzXG4gICAgICogb3IgdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBhIGNvbXBsZXggdHlwZS4gUGFzcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSB0eXBlIG5hbWUgdG8gcmV0dXJuIGFuIGFycmF5IG9mIHRoYXQgdHlwZS4gVG9cbiAgICAgKiByZXR1cm4gYW4gb2JqZWN0LCBwYXNzIGFuIG9iamVjdCB3aXRoIG9uZSBwcm9wZXJ0eSB3aG9zZSBuYW1lIGlzIHRoZSBrZXkgdHlwZSBhbmQgd2hvc2UgdmFsdWUgaXMgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWUgdHlwZTpcbiAgICAgKiBhbGwgcHJvcGVydGllcyBvbiA8Y29kZT5kYXRhPGNvZGU+IHdpbGwgYmUgY29udmVydGVkIHRvIHRoaXMgdHlwZS5cbiAgICAgKiBAcmV0dXJucyBBIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZS5kZXNlcmlhbGl6ZSA9IGZ1bmN0aW9uIGRlc2VyaWFsaXplKHJlc3BvbnNlLCByZXR1cm5UeXBlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PSBudWxsIHx8IHJldHVyblR5cGUgPT0gbnVsbCB8fCByZXNwb25zZS5zdGF0dXMgPT0gMjA0KSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZWx5IG9uIFN1cGVyQWdlbnQgZm9yIHBhcnNpbmcgcmVzcG9uc2UgYm9keS5cbiAgICAgICAgLy8gU2VlIGh0dHA6Ly92aXNpb25tZWRpYS5naXRodWIuaW8vc3VwZXJhZ2VudC8jcGFyc2luZy1yZXNwb25zZS1ib2RpZXNcbiAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5ib2R5O1xuICAgICAgICBpZiAoZGF0YSA9PSBudWxsIHx8ICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGRhdGEubGVuZ3RoID09PSAndW5kZWZpbmVkJyAmJiAhT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoKSkge1xuICAgICAgICAgICAgLy8gU3VwZXJBZ2VudCBkb2VzIG5vdCBhbHdheXMgcHJvZHVjZSBhIGJvZHk7IHVzZSB0aGUgdW5wYXJzZWQgcmVzcG9uc2UgYXMgYSBmYWxsYmFja1xuICAgICAgICAgICAgZGF0YSA9IHJlc3BvbnNlLnRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhLCByZXR1cm5UeXBlKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIEludm9rZXMgdGhlIFJFU1Qgc2VydmljZSB1c2luZyB0aGUgc3VwcGxpZWQgc2V0dGluZ3MgYW5kIHBhcmFtZXRlcnMuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIGJhc2UgVVJMIHRvIGludm9rZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gaHR0cE1ldGhvZCBUaGUgSFRUUCBtZXRob2QgdG8gdXNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIFN0cmluZz59IHBhdGhQYXJhbXMgQSBtYXAgb2YgcGF0aCBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gcXVlcnlQYXJhbXMgQSBtYXAgb2YgcXVlcnkgcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IGhlYWRlclBhcmFtcyBBIG1hcCBvZiBoZWFkZXIgcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IGZvcm1QYXJhbXMgQSBtYXAgb2YgZm9ybSBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGJvZHlQYXJhbSBUaGUgdmFsdWUgdG8gcGFzcyBhcyB0aGUgcmVxdWVzdCBib2R5LlxuICAgICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGF1dGhOYW1lcyBBbiBhcnJheSBvZiBhdXRoZW50aWNhdGlvbiB0eXBlIG5hbWVzLlxuICAgICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGNvbnRlbnRUeXBlcyBBbiBhcnJheSBvZiByZXF1ZXN0IE1JTUUgdHlwZXMuXG4gICAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYWNjZXB0cyBBbiBhcnJheSBvZiBhY2NlcHRhYmxlIHJlc3BvbnNlIE1JTUUgdHlwZXMuXG4gICAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5fE9iamVjdEZ1bmN0aW9uKX0gcmV0dXJuVHlwZSBUaGUgcmVxdWlyZWQgdHlwZSB0byByZXR1cm47IGNhbiBiZSBhIHN0cmluZyBmb3Igc2ltcGxlIHR5cGVzIG9yIHRoZVxuICAgICAqIGNvbnN0cnVjdG9yIGZvciBhIGNvbXBsZXggdHlwZS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHJldHVybnMge09iamVjdH0gVGhlIFN1cGVyQWdlbnQgcmVxdWVzdCBvYmplY3QuXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGUuY2FsbEFwaSA9IGZ1bmN0aW9uIGNhbGxBcGkocGF0aCwgaHR0cE1ldGhvZCwgcGF0aFBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBib2R5UGFyYW0sIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblR5cGUsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgdmFyIHVybCA9IHRoaXMuYnVpbGRVcmwocGF0aCwgcGF0aFBhcmFtcyk7XG4gICAgICAgIHZhciByZXF1ZXN0ID0gc3VwZXJhZ2VudChodHRwTWV0aG9kLCB1cmwpO1xuXG4gICAgICAgIC8vIGFwcGx5IGF1dGhlbnRpY2F0aW9uc1xuICAgICAgICB0aGlzLmFwcGx5QXV0aFRvUmVxdWVzdChyZXF1ZXN0LCBhdXRoTmFtZXMpO1xuXG4gICAgICAgIC8vIHNldCBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICAgIGlmIChodHRwTWV0aG9kLnRvVXBwZXJDYXNlKCkgPT09ICdHRVQnICYmIHRoaXMuY2FjaGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBxdWVyeVBhcmFtc1snXyddID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVxdWVzdC5xdWVyeSh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhxdWVyeVBhcmFtcykpO1xuXG4gICAgICAgIC8vIHNldCBoZWFkZXIgcGFyYW1ldGVyc1xuICAgICAgICByZXF1ZXN0LnNldCh0aGlzLmRlZmF1bHRIZWFkZXJzKS5zZXQodGhpcy5ub3JtYWxpemVQYXJhbXMoaGVhZGVyUGFyYW1zKSk7XG5cbiAgICAgICAgLy8gc2V0IHJlcXVlc3QgdGltZW91dFxuICAgICAgICByZXF1ZXN0LnRpbWVvdXQodGhpcy50aW1lb3V0KTtcblxuICAgICAgICB2YXIgY29udGVudFR5cGUgPSB0aGlzLmpzb25QcmVmZXJyZWRNaW1lKGNvbnRlbnRUeXBlcyk7XG4gICAgICAgIGlmIChjb250ZW50VHlwZSkge1xuICAgICAgICAgICAgLy8gSXNzdWUgd2l0aCBzdXBlcmFnZW50IGFuZCBtdWx0aXBhcnQvZm9ybS1kYXRhIChodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvc3VwZXJhZ2VudC9pc3N1ZXMvNzQ2KVxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlICE9ICdtdWx0aXBhcnQvZm9ybS1kYXRhJykge1xuICAgICAgICAgICAgICAgIHJlcXVlc3QudHlwZShjb250ZW50VHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXJlcXVlc3QuaGVhZGVyWydDb250ZW50LVR5cGUnXSkge1xuICAgICAgICAgICAgcmVxdWVzdC50eXBlKCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKSB7XG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQocXVlcnlzdHJpbmcuc3RyaW5naWZ5KHRoaXMubm9ybWFsaXplUGFyYW1zKGZvcm1QYXJhbXMpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29udGVudFR5cGUgPT0gJ211bHRpcGFydC9mb3JtLWRhdGEnKSB7XG4gICAgICAgICAgICB2YXIgX2Zvcm1QYXJhbXMgPSB0aGlzLm5vcm1hbGl6ZVBhcmFtcyhmb3JtUGFyYW1zKTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBfZm9ybVBhcmFtcykge1xuICAgICAgICAgICAgICAgIGlmIChfZm9ybVBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzRmlsZVBhcmFtKF9mb3JtUGFyYW1zW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBmaWxlIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LmF0dGFjaChrZXksIF9mb3JtUGFyYW1zW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5maWVsZChrZXksIF9mb3JtUGFyYW1zW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGJvZHlQYXJhbSkge1xuICAgICAgICAgICAgcmVxdWVzdC5zZW5kKGJvZHlQYXJhbSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYWNjZXB0ID0gdGhpcy5qc29uUHJlZmVycmVkTWltZShhY2NlcHRzKTtcbiAgICAgICAgaWYgKGFjY2VwdCkge1xuICAgICAgICAgICAgcmVxdWVzdC5hY2NlcHQoYWNjZXB0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXR1cm5UeXBlID09PSAnQmxvYicpIHtcbiAgICAgICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlKCdibG9iJyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmV0dXJuVHlwZSA9PT0gJ1N0cmluZycpIHtcbiAgICAgICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlKCdzdHJpbmcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF0dGFjaCBwcmV2aW91c2x5IHNhdmVkIGNvb2tpZXMsIGlmIGVuYWJsZWRcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlQ29va2llcykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZ2VudC5hdHRhY2hDb29raWVzKHJlcXVlc3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC53aXRoQ3JlZGVudGlhbHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG5cbiAgICAgICAgcmVxdWVzdC5lbmQoZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBfdGhpcy5kZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMuZW5hYmxlQ29va2llcyAmJiB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmFnZW50LnNhdmVDb29raWVzKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvciA9IGVycjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUGFyc2VzIGFuIElTTy04NjAxIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGRhdGUgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgZGF0ZSB2YWx1ZSBhcyBhIHN0cmluZy5cbiAgICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIHBhcnNlZCBkYXRlIG9iamVjdC5cbiAgICAgKi9cbiAgICBleHBvcnRzLnBhcnNlRGF0ZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKHN0ci5yZXBsYWNlKC9UL2ksICcgJykpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhIHZhbHVlIHRvIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAgICAgKiBAcGFyYW0geyhTdHJpbmd8T2JqZWN0KX0gZGF0YSBUaGUgZGF0YSB0byBjb252ZXJ0LCBhcyBhIHN0cmluZyBvciBvYmplY3QuXG4gICAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5LjxTdHJpbmc+fE9iamVjdC48U3RyaW5nLCBPYmplY3Q+fEZ1bmN0aW9uKX0gdHlwZSBUaGUgdHlwZSB0byByZXR1cm4uIFBhc3MgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlc1xuICAgICAqIG9yIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgYSBjb21wbGV4IHR5cGUuIFBhc3MgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgdHlwZSBuYW1lIHRvIHJldHVybiBhbiBhcnJheSBvZiB0aGF0IHR5cGUuIFRvXG4gICAgICogcmV0dXJuIGFuIG9iamVjdCwgcGFzcyBhbiBvYmplY3Qgd2l0aCBvbmUgcHJvcGVydHkgd2hvc2UgbmFtZSBpcyB0aGUga2V5IHR5cGUgYW5kIHdob3NlIHZhbHVlIGlzIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlIHR5cGU6XG4gICAgICogYWxsIHByb3BlcnRpZXMgb24gPGNvZGU+ZGF0YTxjb2RlPiB3aWxsIGJlIGNvbnZlcnRlZCB0byB0aGlzIHR5cGUuXG4gICAgICogQHJldHVybnMgQW4gaW5zdGFuY2Ugb2YgdGhlIHNwZWNpZmllZCB0eXBlIG9yIG51bGwgb3IgdW5kZWZpbmVkIGlmIGRhdGEgaXMgbnVsbCBvciB1bmRlZmluZWQuXG4gICAgICovXG4gICAgZXhwb3J0cy5jb252ZXJ0VG9UeXBlID0gZnVuY3Rpb24gKGRhdGEsIHR5cGUpIHtcbiAgICAgICAgaWYgKGRhdGEgPT09IG51bGwgfHwgZGF0YSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIGRhdGFcblxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ0Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgIHJldHVybiBCb29sZWFuKGRhdGEpO1xuICAgICAgICAgICAgY2FzZSAnSW50ZWdlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlSW50KGRhdGEsIDEwKTtcbiAgICAgICAgICAgIGNhc2UgJ051bWJlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoZGF0YSk7XG4gICAgICAgICAgICBjYXNlICdTdHJpbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgICAgICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURhdGUoU3RyaW5nKGRhdGEpKTtcbiAgICAgICAgICAgIGNhc2UgJ0Jsb2InOlxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGdlbmVyaWMgb2JqZWN0LCByZXR1cm4gZGlyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBmb3IgbW9kZWwgdHlwZSBsaWtlOiBVc2VyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlLmNvbnN0cnVjdEZyb21PYmplY3QoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciBhcnJheSB0eXBlIGxpa2U6IFsnU3RyaW5nJ11cbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW1UeXBlID0gdHlwZVswXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGl0ZW0sIGl0ZW1UeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yIHBsYWluIG9iamVjdCB0eXBlIGxpa2U6IHsnU3RyaW5nJzogJ0ludGVnZXInfVxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5VHlwZSwgdmFsdWVUeXBlO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrIGluIHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5VHlwZSA9IGs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVUeXBlID0gdHlwZVtrXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGsgaW4gZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGssIGtleVR5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2tdLCB2YWx1ZVR5cGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBmb3IgdW5rbm93biB0eXBlLCByZXR1cm4gdGhlIGRhdGEgZGlyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgbWFwIG9yIGFycmF5IG1vZGVsIGZyb20gUkVTVCBkYXRhLlxuICAgICAqIEBwYXJhbSBkYXRhIHtPYmplY3R8QXJyYXl9IFRoZSBSRVNUIGRhdGEuXG4gICAgICogQHBhcmFtIG9iaiB7T2JqZWN0fEFycmF5fSBUaGUgdGFyZ2V0IG9iamVjdCBvciBhcnJheS5cbiAgICAgKi9cbiAgICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbiAoZGF0YSwgb2JqLCBpdGVtVHlwZSkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaSkpXG4gICAgICAgICAgICAgICAgICAgIG9ialtpXSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2ldLCBpdGVtVHlwZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrIGluIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrKSlcbiAgICAgICAgICAgICAgICAgICAgb2JqW2tdID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGFba10sIGl0ZW1UeXBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGVmYXVsdCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uLlxuICAgICAqIEB0eXBlIHttb2R1bGU6QXBpQ2xpZW50fVxuICAgICAqL1xuICAgIGV4cG9ydHMuaW5zdGFuY2UgPSBuZXcgZXhwb3J0cygpO1xuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9QYXJhbWV0ZXJMaXN0J10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgICAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICAgICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkJ1aWxkQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBhcmFtZXRlckxpc3QpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKEFwaUNsaWVudCwgUGFyYW1ldGVyTGlzdCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNlcnZpY2UuXG4gICAgICogQG1vZHVsZSBhcGkvQnVpbGRBcGlcbiAgICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBCdWlsZEFwaS5cbiAgICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9CdWlsZEFwaVxuICAgICAqIEBjbGFzc1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gYXBpQ2xpZW50IE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxuICAgICAqL1xuICAgIHZhciBleHBvcnRzID0gZnVuY3Rpb24gKGFwaUNsaWVudCkge1xuICAgICAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBidWlsZEFOTiBvcGVyYXRpb24uXG4gICAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0J1aWxkQXBpfmJ1aWxkQU5OQ2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHBhc3NlcyBhbGwgbGVhcm5pbmcgYW5kIEFOTiBwYXJhbWV0ZXJzIHRvIHRoZSBzZXJ2ZXJcbiAgICAgICAgICogSW5jbHVkZXMgbGVhcm5pbmcgcGFyYW1ldGVycyBhbmQgQU5OIHRvcG9sb2d5XG4gICAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGlucHV0UGFyYW1ldGVycyBvYmplY3Qgd2l0aCBhbGwgdHVuYWJsZSBwYXJhbWV0ZXJzXG4gICAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9CdWlsZEFwaX5idWlsZEFOTkNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5idWlsZEFOTiA9IGZ1bmN0aW9uIChpbnB1dFBhcmFtZXRlcnMsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBpbnB1dFBhcmFtZXRlcnM7XG5cbiAgICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlcnMnIGlzIHNldFxuICAgICAgICAgICAgaWYgKGlucHV0UGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkIHx8IGlucHV0UGFyYW1ldGVycyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJzJyB3aGVuIGNhbGxpbmcgYnVpbGRBTk5cIik7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICAgICAgICAgJy9idWlsZC9idWlsZEFOTicsICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbnB1dFNoYXBlIG9wZXJhdGlvbi5cbiAgICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvQnVpbGRBcGl+Z2V0SW5wdXRTaGFwZUNhbGxiYWNrXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICAgICAqIEBwYXJhbSB7QXJyYXkuPCdOdW1iZXInPn0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiByZXR1cm5zIHRoZSBpbnB1dCBzaGFwZSBvZiB0aGUgdHJhaW4gZGF0YVxuICAgICAgICAgKiByZXR1cm5zIHRoZSBpbnB1dCBzaGFwZSBvZiB0aGUgdHJhaW4gZGF0YVxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgb2YgdGhlIGRhdGFzZXQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0J1aWxkQXBpfmdldElucHV0U2hhcGVDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgQXJyYXkuPCdOdW1iZXInPn1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0SW5wdXRTaGFwZSA9IGZ1bmN0aW9uIChvcHRzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgJ2RhdGFzZXRfbmFtZSc6IG9wdHNbJ2RhdGFzZXROYW1lJ11cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuXG4gICAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ051bWJlciddO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgICAnL2J1aWxkL2dldElucHV0U2hhcGUnLCAnR0VUJyxcbiAgICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZURhdGEnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9JbWFnZURhdGEnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICAgICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Mb2FkQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlRGF0YSk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50LCBJbWFnZURhdGEpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHNlcnZpY2UuXG4gICAgICogQG1vZHVsZSBhcGkvTG9hZEFwaVxuICAgICAqIEB2ZXJzaW9uIDEuMC43XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IExvYWRBcGkuXG4gICAgICogQGFsaWFzIG1vZHVsZTphcGkvTG9hZEFwaVxuICAgICAqIEBjbGFzc1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gYXBpQ2xpZW50IE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxuICAgICAqL1xuICAgIHZhciBleHBvcnRzID0gZnVuY3Rpb24gKGFwaUNsaWVudCkge1xuICAgICAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZUJhdGNoIG9wZXJhdGlvbi5cbiAgICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJhdGNoQ2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2YgaW5wdXQvb3V0cHV0IGltYWdlc1xuICAgICAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmJhdGNoU2l6ZSBkZWZpbmVzIHRoZSBudW1iZXIgb2YgcmV0dXJuIGltYWdlcyAoZGVmYXVsdCB0byAxMDApXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJhdGNoQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldEltYWdlQmF0Y2ggPSBmdW5jdGlvbiAob3B0cywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICdiYXRjaF9zaXplJzogb3B0c1snYmF0Y2hTaXplJ10sXG4gICAgICAgICAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgICAgICAgICAnc29ydF9ieSc6IG9wdHNbJ3NvcnRCeSddLFxuICAgICAgICAgICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcbiAgICAgICAgICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J11cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuXG4gICAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvbG9hZC9nZXRJbWFnZUJhdGNoJywgJ0dFVCcsXG4gICAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW1hZ2VCeUlkIG9wZXJhdGlvbi5cbiAgICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJ5SWRDYWxsYmFja1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogcmV0dXJucyBhIHNpbmdsZSBpbnB1dC9vdXRwdXQgaW1hZ2VcbiAgICAgICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkIGRlZmluZXMgdGhlIGlkIG9mIHRoZSBpbWFnZXNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuc29ydEJ5IGRlZmluZXMgdGhlIHNvcnRpbmcgb2YgdGhlIGlucHV0IGltYWdlc1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VCeUlkQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldEltYWdlQnlJZCA9IGZ1bmN0aW9uIChpZCwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyBpcyBzZXRcbiAgICAgICAgICAgIGlmIChpZCA9PT0gdW5kZWZpbmVkIHx8IGlkID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpZCcgd2hlbiBjYWxsaW5nIGdldEltYWdlQnlJZFwiKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICdpZCc6IGlkLFxuICAgICAgICAgICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgICAnL2xvYWQvZ2V0SW1hZ2VCeUlkJywgJ0dFVCcsXG4gICAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW1hZ2VzIG9wZXJhdGlvbi5cbiAgICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZXNDYWxsYmFja1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogcmV0dXJucyBhIHN1YnNldCBvZiBpbnB1dC9vdXRwdXQgaW1hZ2VzXG4gICAgICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzdGFydElkeCBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXJcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IGVuZElkeCBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXJcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuc29ydEJ5IGRlZmluZXMgdGhlIHNvcnRpbmcgb2YgdGhlIGlucHV0IGltYWdlc1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcbiAgICAgICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldEltYWdlcyA9IGZ1bmN0aW9uIChzdGFydElkeCwgZW5kSWR4LCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc3RhcnRJZHgnIGlzIHNldFxuICAgICAgICAgICAgaWYgKHN0YXJ0SWR4ID09PSB1bmRlZmluZWQgfHwgc3RhcnRJZHggPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3N0YXJ0SWR4JyB3aGVuIGNhbGxpbmcgZ2V0SW1hZ2VzXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZW5kSWR4JyBpcyBzZXRcbiAgICAgICAgICAgIGlmIChlbmRJZHggPT09IHVuZGVmaW5lZCB8fCBlbmRJZHggPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2VuZElkeCcgd2hlbiBjYWxsaW5nIGdldEltYWdlc1wiKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICdzdGFydF9pZHgnOiBzdGFydElkeCxcbiAgICAgICAgICAgICAgICAnZW5kX2lkeCc6IGVuZElkeCxcbiAgICAgICAgICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgICAgICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXG4gICAgICAgICAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxuICAgICAgICAgICAgICAgICdvdXRwdXQnOiBvcHRzWydvdXRwdXQnXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XG5cbiAgICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICAgICAgICAgJy9sb2FkL2dldEltYWdlcycsICdHRVQnLFxuICAgICAgICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFJhbmRvbUltYWdlcyBvcGVyYXRpb24uXG4gICAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0UmFuZG9tSW1hZ2VzQ2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2YgaW5wdXQvb3V0cHV0IGltYWdlc1xuICAgICAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmJhdGNoU2l6ZSBkZWZpbmVzIHRoZSBudW1iZXIgb2YgcmV0dXJuIGltYWdlcyAoZGVmYXVsdCB0byAxMDApXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxuICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0UmFuZG9tSW1hZ2VzID0gZnVuY3Rpb24gKG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICAnYmF0Y2hfc2l6ZSc6IG9wdHNbJ2JhdGNoU2l6ZSddLFxuICAgICAgICAgICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgICAnL2xvYWQvZ2V0UmFuZG9tSW1hZ2VzJywgJ0dFVCcsXG4gICAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgbG9hZEZpbGUgb3BlcmF0aW9uLlxuICAgICAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIExvYWQgYSB0cmFpbi90ZXN0IGRhdGEgZmlsZVxuICAgICAgICAgKiBMb2FkIGEgZGF0YSBmaWxlIGluIGRpZmZlcmVudCBkYXRhIGZvcm1hdHNcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGZpbGVuYW1lXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5yZWFkTGFiZWxzIHRydWUgdG8gcmVhZCBsYWJlbHMgKGRlZmF1bHQgdG8gZmFsc2UpXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFUeXBlIGRldGVybWluZXMgdGhlIGRhdGEgZm9ybWF0IG9mIHRoZSBpbnB1dCBmaWxlIChkZWZhdWx0IHRvIGF1dG8pXG4gICAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmxvYWRGaWxlID0gZnVuY3Rpb24gKGZpbGVuYW1lLCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZmlsZW5hbWUnIGlzIHNldFxuICAgICAgICAgICAgaWYgKGZpbGVuYW1lID09PSB1bmRlZmluZWQgfHwgZmlsZW5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2ZpbGVuYW1lJyB3aGVuIGNhbGxpbmcgbG9hZEZpbGVcIik7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICAnZmlsZW5hbWUnOiBmaWxlbmFtZSxcbiAgICAgICAgICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgICAgICAgICAgICdyZWFkX2xhYmVscyc6IG9wdHNbJ3JlYWRMYWJlbHMnXSxcbiAgICAgICAgICAgICAgICAnZGF0YV90eXBlJzogb3B0c1snZGF0YVR5cGUnXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XG5cbiAgICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvbG9hZC9sb2FkRmlsZScsICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblN0YXR1cyddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblBlcmZvcm1hbmNlJyksIHJlcXVpcmUoJy4uL21vZGVsL1RyYWluU3RhdHVzJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5BcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50LCBQcm9jZXNzZWRJbWFnZURhdGEsIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluU3RhdHVzKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogVHJhaW4gc2VydmljZS5cbiAgICAgKiBAbW9kdWxlIGFwaS9UcmFpbkFwaVxuICAgICAqIEB2ZXJzaW9uIDEuMC43XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFRyYWluQXBpLlxuICAgICAqIEBhbGlhcyBtb2R1bGU6YXBpL1RyYWluQXBpXG4gICAgICogQGNsYXNzXG4gICAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBhcGlDbGllbnQgT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXG4gICAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAgICovXG4gICAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbiAoYXBpQ2xpZW50KSB7XG4gICAgICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUcmFpbmluZyBvcGVyYXRpb24uXG4gICAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1RyYWluQXBpfmNvbnRyb2xUcmFpbmluZ0NhbGxiYWNrXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHRyYWluaW5nXG4gICAgICAgICAqIHVzZXMgYSBzdHJpbmcgZW51bVxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gdHJhaW5TdGF0dXMgbmV3IHN0YXR1cyBmb3IgdHJhaW5pbmdcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1RyYWluQXBpfmNvbnRyb2xUcmFpbmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb250cm9sVHJhaW5pbmcgPSBmdW5jdGlvbiAodHJhaW5TdGF0dXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSB0cmFpblN0YXR1cztcblxuICAgICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyBpcyBzZXRcbiAgICAgICAgICAgIGlmICh0cmFpblN0YXR1cyA9PT0gdW5kZWZpbmVkIHx8IHRyYWluU3RhdHVzID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgd2hlbiBjYWxsaW5nIGNvbnRyb2xUcmFpbmluZ1wiKTtcbiAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuXG4gICAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgICAnL3RyYWluL2NvbnRyb2xUcmFpbmluZycsICdQT1NUJyxcbiAgICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRQcm9jZXNzZWRJbWFnZURhdGEgb3BlcmF0aW9uLlxuICAgICAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFDYWxsYmFja1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YSA9IGZ1bmN0aW9uIChzZXRTaXplLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIGlzIHNldFxuICAgICAgICAgICAgaWYgKHNldFNpemUgPT09IHVuZGVmaW5lZCB8fCBzZXRTaXplID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyB3aGVuIGNhbGxpbmcgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhXCIpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgJ3NldFNpemUnOiBzZXRTaXplXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gUHJvY2Vzc2VkSW1hZ2VEYXRhO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgICAnL3RyYWluL2dldFByb2Nlc3NlZEltYWdlRGF0YScsICdHRVQnLFxuICAgICAgICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2Ugb3BlcmF0aW9uLlxuICAgICAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRUcmFpblBlcmZvcm1hbmNlQ2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIHNjYWxhciB0cmFpbiB2YXJpYWJsZXNcbiAgICAgICAgICogYXMgbGlzdCBvZiBkaWN0c1xuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuXG4gICAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBUcmFpblBlcmZvcm1hbmNlO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgICAnL3RyYWluL2dldFRyYWluUGVyZm9ybWFuY2UnLCAnR0VUJyxcbiAgICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9QYXJhbWV0ZXJMaXN0JywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluU3RhdHVzJ10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgICAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICAgICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlR1bmVBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50LCBQYXJhbWV0ZXJMaXN0LCBQcm9jZXNzZWRJbWFnZURhdGEsIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluU3RhdHVzKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogVHVuZSBzZXJ2aWNlLlxuICAgICAqIEBtb2R1bGUgYXBpL1R1bmVBcGlcbiAgICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBUdW5lQXBpLlxuICAgICAqIEBhbGlhcyBtb2R1bGU6YXBpL1R1bmVBcGlcbiAgICAgKiBAY2xhc3NcbiAgICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IGFwaUNsaWVudCBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICAgKi9cbiAgICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uIChhcGlDbGllbnQpIHtcbiAgICAgICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgY29udHJvbFR1bmluZyBvcGVyYXRpb24uXG4gICAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Y29udHJvbFR1bmluZ0NhbGxiYWNrXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHR1bmluZ1xuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gdHJhaW5TdGF0dXMgbmV3IHN0YXR1cyBmb3IgdHJhaW5pbmdcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Y29udHJvbFR1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jb250cm9sVHVuaW5nID0gZnVuY3Rpb24gKHRyYWluU3RhdHVzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHBvc3RCb2R5ID0gdHJhaW5TdGF0dXM7XG5cbiAgICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgaXMgc2V0XG4gICAgICAgICAgICBpZiAodHJhaW5TdGF0dXMgPT09IHVuZGVmaW5lZCB8fCB0cmFpblN0YXR1cyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndHJhaW5TdGF0dXMnIHdoZW4gY2FsbGluZyBjb250cm9sVHVuaW5nXCIpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XG5cbiAgICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvdHVuZS9jb250cm9sVHVuaW5nJywgJ1BVVCcsXG4gICAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nIG9wZXJhdGlvbi5cbiAgICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmdDYWxsYmFja1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nID0gZnVuY3Rpb24gKHNldFNpemUsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XG4gICAgICAgICAgICBpZiAoc2V0U2l6ZSA9PT0gdW5kZWZpbmVkIHx8IHNldFNpemUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmdcIik7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemVcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuXG4gICAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBQcm9jZXNzZWRJbWFnZURhdGE7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvdHVuZS9nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmcnLCAnR0VUJyxcbiAgICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nIG9wZXJhdGlvbi5cbiAgICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIHNjYWxhciB0cmFpbiB2YXJpYWJsZXNcbiAgICAgICAgICogYXMgbGlzdCBvZiBkaWN0c1xuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XG5cbiAgICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFRyYWluUGVyZm9ybWFuY2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvdHVuZS9nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXG4gICAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgcGFzc0FOTlBhcmFtZXRlckxpc3RzIG9wZXJhdGlvbi5cbiAgICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5wYXNzQU5OUGFyYW1ldGVyTGlzdHNDYWxsYmFja1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogcGFzc2VzIGFsbCBsZWFybmluZyBhbmQgQU5OIHBhcmFtZXRlcnMgdG8gdGhlIHNlcnZlclxuICAgICAgICAgKiBJbmNsdWRlcyBsZWFybmluZyBwYXJhbWV0ZXJzIGFuZCBBTk4gdG9wb2xvZ3kgYXMgbGlzdHNcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gaW5wdXRQYXJhbWV0ZXJMaXN0cyBvYmplY3Qgd2l0aCBhbGwgdHVuYWJsZSBwYXJhbWV0ZXIgbGlzdHNcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+cGFzc0FOTlBhcmFtZXRlckxpc3RzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnBhc3NBTk5QYXJhbWV0ZXJMaXN0cyA9IGZ1bmN0aW9uIChpbnB1dFBhcmFtZXRlckxpc3RzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHBvc3RCb2R5ID0gaW5wdXRQYXJhbWV0ZXJMaXN0cztcblxuICAgICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVyTGlzdHMnIGlzIHNldFxuICAgICAgICAgICAgaWYgKGlucHV0UGFyYW1ldGVyTGlzdHMgPT09IHVuZGVmaW5lZCB8fCBpbnB1dFBhcmFtZXRlckxpc3RzID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlckxpc3RzJyB3aGVuIGNhbGxpbmcgcGFzc0FOTlBhcmFtZXRlckxpc3RzXCIpO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XG5cbiAgICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvdHVuZS9idWlsZEdyaWRTZWFyY2hBTk4nLCAnUE9TVCcsXG4gICAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnLCAnbW9kZWwvQ2x1c3RlcmluZycsICdtb2RlbC9JbWFnZScsICdtb2RlbC9Qb2ludDJEJ10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnKSwgcmVxdWlyZSgnLi4vbW9kZWwvQ2x1c3RlcmluZycpLCByZXF1aXJlKCcuLi9tb2RlbC9JbWFnZScpLCByZXF1aXJlKCcuLi9tb2RlbC9Qb2ludDJEJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVmlzdWFsaXplQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNsdXN0ZXJQYXJhbWV0ZXJzLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyaW5nLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50LCBDbHVzdGVyUGFyYW1ldGVycywgQ2x1c3RlcmluZywgSW1hZ2UsIFBvaW50MkQpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvKipcbiAgICAgKiBWaXN1YWxpemUgc2VydmljZS5cbiAgICAgKiBAbW9kdWxlIGFwaS9WaXN1YWxpemVBcGlcbiAgICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyBWaXN1YWxpemVBcGkuXG4gICAgICogQGFsaWFzIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpXG4gICAgICogQGNsYXNzXG4gICAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBhcGlDbGllbnQgT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXG4gICAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAgICovXG4gICAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbiAoYXBpQ2xpZW50KSB7XG4gICAgICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgb3BlcmF0aW9uLlxuICAgICAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludENhbGxiYWNrXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIGdlbmVyYXRlcyB0aGUgQUUgb3V0cHV0IGZyb20gYSBnaXZlbiBwb2ludCBvZiB0aGUgc2FtcGxlIGRpc3RyaWJ1dGlvblxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBwb2ludDJEIDJEIFBvaW50IG9mIHRoZSBzYW1wbGUgZGlzdHJpYnV0aW9uXG4gICAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2V9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgPSBmdW5jdGlvbiAocG9pbnQyRCwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBwb3N0Qm9keSA9IHBvaW50MkQ7XG5cbiAgICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdwb2ludDJEJyBpcyBzZXRcbiAgICAgICAgICAgIGlmIChwb2ludDJEID09PSB1bmRlZmluZWQgfHwgcG9pbnQyRCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAncG9pbnQyRCcgd2hlbiBjYWxsaW5nIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRcIik7XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2U7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvdmlzdWFsaXplL2dlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQnLCAnR0VUJyxcbiAgICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcgb3BlcmF0aW9uLlxuICAgICAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nQ2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ30gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiByZXR1cm5zIHRoZSBjbHVzdGVyaW5nIG9mIHRoZSBsYXRlbnQgcmVwcmVzZW50YXRpb24gb2YgYSBoaWRkZW4gbGF5ZXJcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5hbGdvcml0aG0gZGV0ZXJtaW5lcyB0aGUgY2x1dGVyaW5nIGFsZ29yaXRobVxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBkZXRlcm1pbmVzIHRoZSBkYXRhc2V0IHdoaWNoIHNob3VsZCBiZSBjbHVzdGVyZWQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGltZW5zaW9uUmVkdWN0aW9uIGRldGVybWluZXMgdGhlIGFsZ29yaXRobSBmb3IgZGltIHJlZHVjdGlvblxuICAgICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gb3B0cy5jbHVzdGVyUGFyYW1ldGVycyBkZXRlcm1pbmVzIHRoZSBjbHV0ZXJpbmcgcGFyYW1ldGVyc1xuICAgICAgICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5sYXllciBkZXRlcm1pbmVzIHRoZSBoaWRkZW4gbGF5ZXJcbiAgICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZyA9IGZ1bmN0aW9uIChvcHRzLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBvcHRzWydjbHVzdGVyUGFyYW1ldGVycyddO1xuXG5cbiAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgJ2FsZ29yaXRobSc6IG9wdHNbJ2FsZ29yaXRobSddLFxuICAgICAgICAgICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxuICAgICAgICAgICAgICAgICdkaW1lbnNpb25fcmVkdWN0aW9uJzogb3B0c1snZGltZW5zaW9uUmVkdWN0aW9uJ10sXG4gICAgICAgICAgICAgICAgJ2xheWVyJzogb3B0c1snbGF5ZXInXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XG5cbiAgICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IENsdXN0ZXJpbmc7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAgICcvdmlzdWFsaXplL2dldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZycsICdHRVQnLFxuICAgICAgICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMi4zXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICAgICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJywgJ21vZGVsL0NsdXN0ZXJpbmcnLCAnbW9kZWwvSW1hZ2UnLCAnbW9kZWwvSW1hZ2VEYXRhJywgJ21vZGVsL1BhcmFtZXRlckxpc3QnLCAnbW9kZWwvUG9pbnQyRCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblN0YXR1cycsICdhcGkvQnVpbGRBcGknLCAnYXBpL0xvYWRBcGknLCAnYXBpL1RyYWluQXBpJywgJ2FwaS9UdW5lQXBpJywgJ2FwaS9WaXN1YWxpemVBcGknXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnKSwgcmVxdWlyZSgnLi9tb2RlbC9DbHVzdGVyaW5nJyksIHJlcXVpcmUoJy4vbW9kZWwvSW1hZ2UnKSwgcmVxdWlyZSgnLi9tb2RlbC9JbWFnZURhdGEnKSwgcmVxdWlyZSgnLi9tb2RlbC9QYXJhbWV0ZXJMaXN0JyksIHJlcXVpcmUoJy4vbW9kZWwvUG9pbnQyRCcpLCByZXF1aXJlKCcuL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScpLCByZXF1aXJlKCcuL21vZGVsL1RyYWluUGVyZm9ybWFuY2UnKSwgcmVxdWlyZSgnLi9tb2RlbC9UcmFpblN0YXR1cycpLCByZXF1aXJlKCcuL2FwaS9CdWlsZEFwaScpLCByZXF1aXJlKCcuL2FwaS9Mb2FkQXBpJyksIHJlcXVpcmUoJy4vYXBpL1RyYWluQXBpJyksIHJlcXVpcmUoJy4vYXBpL1R1bmVBcGknKSwgcmVxdWlyZSgnLi9hcGkvVmlzdWFsaXplQXBpJykpO1xuICAgIH1cbn0oZnVuY3Rpb24gKEFwaUNsaWVudCwgQ2x1c3RlclBhcmFtZXRlcnMsIENsdXN0ZXJpbmcsIEltYWdlLCBJbWFnZURhdGEsIFBhcmFtZXRlckxpc3QsIFBvaW50MkQsIFByb2Nlc3NlZEltYWdlRGF0YSwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMsIEJ1aWxkQXBpLCBMb2FkQXBpLCBUcmFpbkFwaSwgVHVuZUFwaSwgVmlzdWFsaXplQXBpKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLyoqXG4gICAgICogV2ViVUlfdG9fYnVpbGRfdHJhaW5fYW5kX3R1bmVfYV9Db252b2x1dGlvbmFsX0F1dG9lbmNvZGVyLjxicj5cbiAgICAgKiBUaGUgPGNvZGU+aW5kZXg8L2NvZGU+IG1vZHVsZSBwcm92aWRlcyBhY2Nlc3MgdG8gY29uc3RydWN0b3JzIGZvciBhbGwgdGhlIGNsYXNzZXMgd2hpY2ggY29tcHJpc2UgdGhlIHB1YmxpYyBBUEkuXG4gICAgICogPHA+XG4gICAgICogQW4gQU1EIChyZWNvbW1lbmRlZCEpIG9yIENvbW1vbkpTIGFwcGxpY2F0aW9uIHdpbGwgZ2VuZXJhbGx5IGRvIHNvbWV0aGluZyBlcXVpdmFsZW50IHRvIHRoZSBmb2xsb3dpbmc6XG4gICAgICogPHByZT5cbiAgICAgKiB2YXIgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0gcmVxdWlyZSgnaW5kZXgnKTsgLy8gU2VlIG5vdGUgYmVsb3cqLlxuICAgICAqIHZhciB4eHhTdmMgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlh4eEFwaSgpOyAvLyBBbGxvY2F0ZSB0aGUgQVBJIGNsYXNzIHdlJ3JlIGdvaW5nIHRvIHVzZS5cbiAgICAgKiB2YXIgeXl5TW9kZWwgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLll5eSgpOyAvLyBDb25zdHJ1Y3QgYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcbiAgICAgKiAuLi5cbiAgICAgKiB2YXIgenp6ID0geHh4U3ZjLmRvU29tZXRoaW5nKHl5eU1vZGVsKTsgLy8gSW52b2tlIHRoZSBzZXJ2aWNlLlxuICAgICAqIC4uLlxuICAgICAqIDwvcHJlPlxuICAgICAqIDxlbT4qTk9URTogRm9yIGEgdG9wLWxldmVsIEFNRCBzY3JpcHQsIHVzZSByZXF1aXJlKFsnaW5kZXgnXSwgZnVuY3Rpb24oKXsuLi59KVxuICAgICAqIGFuZCBwdXQgdGhlIGFwcGxpY2F0aW9uIGxvZ2ljIHdpdGhpbiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uPC9lbT5cbiAgICAgKiA8L3A+XG4gICAgICogPHA+XG4gICAgICogQSBub24tQU1EIGJyb3dzZXIgYXBwbGljYXRpb24gKGRpc2NvdXJhZ2VkKSBtaWdodCBkbyBzb21ldGhpbmcgbGlrZSB0aGlzOlxuICAgICAqIDxwcmU+XG4gICAgICogdmFyIHh4eFN2YyA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWHh4QXBpKCk7IC8vIEFsbG9jYXRlIHRoZSBBUEkgY2xhc3Mgd2UncmUgZ29pbmcgdG8gdXNlLlxuICAgICAqIHZhciB5eXkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLll5eSgpOyAvLyBDb25zdHJ1Y3QgYSBtb2RlbCBpbnN0YW5jZS5cbiAgICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcbiAgICAgKiAuLi5cbiAgICAgKiB2YXIgenp6ID0geHh4U3ZjLmRvU29tZXRoaW5nKHl5eU1vZGVsKTsgLy8gSW52b2tlIHRoZSBzZXJ2aWNlLlxuICAgICAqIC4uLlxuICAgICAqIDwvcHJlPlxuICAgICAqIDwvcD5cbiAgICAgKiBAbW9kdWxlIGluZGV4XG4gICAgICogQHZlcnNpb24gMS4wLjdcbiAgICAgKi9cbiAgICB2YXIgZXhwb3J0cyA9IHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBBcGlDbGllbnQgY29uc3RydWN0b3IuXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOkFwaUNsaWVudH1cbiAgICAgICAgICovXG4gICAgICAgIEFwaUNsaWVudDogQXBpQ2xpZW50LFxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIENsdXN0ZXJQYXJhbWV0ZXJzIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc31cbiAgICAgICAgICovXG4gICAgICAgIENsdXN0ZXJQYXJhbWV0ZXJzOiBDbHVzdGVyUGFyYW1ldGVycyxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBDbHVzdGVyaW5nIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfVxuICAgICAgICAgKi9cbiAgICAgICAgQ2x1c3RlcmluZzogQ2x1c3RlcmluZyxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBJbWFnZSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvSW1hZ2V9XG4gICAgICAgICAqL1xuICAgICAgICBJbWFnZTogSW1hZ2UsXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgSW1hZ2VEYXRhIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICAgICAqL1xuICAgICAgICBJbWFnZURhdGE6IEltYWdlRGF0YSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBQYXJhbWV0ZXJMaXN0IG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fVxuICAgICAgICAgKi9cbiAgICAgICAgUGFyYW1ldGVyTGlzdDogUGFyYW1ldGVyTGlzdCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBQb2ludDJEIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9Qb2ludDJEfVxuICAgICAgICAgKi9cbiAgICAgICAgUG9pbnQyRDogUG9pbnQyRCxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBQcm9jZXNzZWRJbWFnZURhdGEgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cbiAgICAgICAgICovXG4gICAgICAgIFByb2Nlc3NlZEltYWdlRGF0YTogUHJvY2Vzc2VkSW1hZ2VEYXRhLFxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFRyYWluUGVyZm9ybWFuY2UgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9XG4gICAgICAgICAqL1xuICAgICAgICBUcmFpblBlcmZvcm1hbmNlOiBUcmFpblBlcmZvcm1hbmNlLFxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFRyYWluU3RhdHVzIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c31cbiAgICAgICAgICovXG4gICAgICAgIFRyYWluU3RhdHVzOiBUcmFpblN0YXR1cyxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBCdWlsZEFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvQnVpbGRBcGl9XG4gICAgICAgICAqL1xuICAgICAgICBCdWlsZEFwaTogQnVpbGRBcGksXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgTG9hZEFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvTG9hZEFwaX1cbiAgICAgICAgICovXG4gICAgICAgIExvYWRBcGk6IExvYWRBcGksXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgVHJhaW5BcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1RyYWluQXBpfVxuICAgICAgICAgKi9cbiAgICAgICAgVHJhaW5BcGk6IFRyYWluQXBpLFxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFR1bmVBcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cbiAgICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1R1bmVBcGl9XG4gICAgICAgICAqL1xuICAgICAgICBUdW5lQXBpOiBUdW5lQXBpLFxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIFZpc3VhbGl6ZUFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvVmlzdWFsaXplQXBpfVxuICAgICAgICAgKi9cbiAgICAgICAgVmlzdWFsaXplQXBpOiBWaXN1YWxpemVBcGlcbiAgICB9O1xuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ2x1c3RlclBhcmFtZXRlcnMgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG5cbiAgICAvKipcbiAgICAgKiBUaGUgQ2x1c3RlclBhcmFtZXRlcnMgbW9kZWwgbW9kdWxlLlxuICAgICAqIEBtb2R1bGUgbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnNcbiAgICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5DbHVzdGVyUGFyYW1ldGVyczwvY29kZT4uXG4gICAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc1xuICAgICAqIEBjbGFzc1xuICAgICAqL1xuICAgIHZhciBleHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gVGhlIHBvcHVsYXRlZCA8Y29kZT5DbHVzdGVyUGFyYW1ldGVyczwvY29kZT4gaW5zdGFuY2UuXG4gICAgICovXG4gICAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24gKGRhdGEsIG9iaikge1xuICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2NsdXN0ZXJzJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ25fY2x1c3RlcnMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fY2x1c3RlcnMnXSwgJ051bWJlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2luaXQnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnaW5pdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5pdCddLCAnU3RyaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9pbml0JykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ25faW5pdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9pbml0J10sICdOdW1iZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXhfaXRlcicpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydtYXhfaXRlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4X2l0ZXInXSwgJ051bWJlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3RvbCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWyd0b2wnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3RvbCddLCAnTnVtYmVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncHJlY29tcHV0ZV9kaXN0YW5jZXMnKSkge1xuICAgICAgICAgICAgICAgIG9ialsncHJlY29tcHV0ZV9kaXN0YW5jZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10sICdTdHJpbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd2ZXJib3NlJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ3ZlcmJvc2UnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3ZlcmJvc2UnXSwgJ051bWJlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV9zdGF0ZScpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyYW5kb21fc3RhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9zdGF0ZSddLCAnTnVtYmVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29weV94JykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ2NvcHlfeCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29weV94J10sICdCb29sZWFuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9qb2JzJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ25fam9icyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9qb2JzJ10sICdOdW1iZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhbGdvcml0aG0nKSkge1xuICAgICAgICAgICAgICAgIG9ialsnYWxnb3JpdGhtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhbGdvcml0aG0nXSwgJ1N0cmluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7TnVtYmVyfSBuX2NsdXN0ZXJzXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ25fY2x1c3RlcnMnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtTdHJpbmd9IGluaXRcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnaW5pdCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0gbl9pbml0XG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ25faW5pdCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0gbWF4X2l0ZXJcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbWF4X2l0ZXInXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHRvbFxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWyd0b2wnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtTdHJpbmd9IHByZWNvbXB1dGVfZGlzdGFuY2VzXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7TnVtYmVyfSB2ZXJib3NlXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJhbmRvbV9zdGF0ZVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fc3RhdGUnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtCb29sZWFufSBjb3B5X3hcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnY29weV94J10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7TnVtYmVyfSBuX2pvYnNcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbl9qb2JzJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7U3RyaW5nfSBhbGdvcml0aG1cbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnYWxnb3JpdGhtJ10gPSB1bmRlZmluZWQ7XG5cblxuICAgIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMi4zXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICAgICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1BvaW50MkQnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL1BvaW50MkQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICAgICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyaW5nID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBvaW50MkQpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKEFwaUNsaWVudCwgUG9pbnQyRCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuXG4gICAgLyoqXG4gICAgICogVGhlIENsdXN0ZXJpbmcgbW9kZWwgbW9kdWxlLlxuICAgICAqIEBtb2R1bGUgbW9kZWwvQ2x1c3RlcmluZ1xuICAgICAqIEB2ZXJzaW9uIDEuMC43XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+LlxuICAgICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ1xuICAgICAqIEBjbGFzc1xuICAgICAqL1xuICAgIHZhciBleHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ30gVGhlIHBvcHVsYXRlZCA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPiBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbiAoZGF0YSwgb2JqKSB7XG4gICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pblgnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbWluWCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWluWCddLCAnTnVtYmVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4WCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydtYXhYJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhYJ10sICdOdW1iZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtaW5ZJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ21pblknXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21pblknXSwgJ051bWJlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heFknKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbWF4WSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4WSddLCAnTnVtYmVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbkNsdXN0ZXJzJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ25DbHVzdGVycyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbkNsdXN0ZXJzJ10sICdOdW1iZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdwb2ludHMnKSkge1xuICAgICAgICAgICAgICAgIG9ialsncG9pbnRzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydwb2ludHMnXSwgW1BvaW50MkRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0gbWluWFxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydtaW5YJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7TnVtYmVyfSBtYXhYXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ21heFgnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1pbllcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbWluWSddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0gbWF4WVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydtYXhZJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7TnVtYmVyfSBuQ2x1c3RlcnNcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbkNsdXN0ZXJzJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9Qb2ludDJEPn0gcG9pbnRzXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3BvaW50cyddID0gdW5kZWZpbmVkO1xuXG5cbiAgICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG5cbiAgICAvKipcbiAgICAgKiBUaGUgSW1hZ2UgbW9kZWwgbW9kdWxlLlxuICAgICAqIEBtb2R1bGUgbW9kZWwvSW1hZ2VcbiAgICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5JbWFnZTwvY29kZT4uXG4gICAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9JbWFnZVxuICAgICAqIEBjbGFzc1xuICAgICAqL1xuICAgIHZhciBleHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIDxjb2RlPkltYWdlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9JbWFnZX0gVGhlIHBvcHVsYXRlZCA8Y29kZT5JbWFnZTwvY29kZT4gaW5zdGFuY2UuXG4gICAgICovXG4gICAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24gKGRhdGEsIG9iaikge1xuICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdieXRlc3RyaW5nJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ2J5dGVzdHJpbmcnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2J5dGVzdHJpbmcnXSwgJ1N0cmluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lkJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ2lkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpZCddLCAnTnVtYmVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtTdHJpbmd9IGJ5dGVzdHJpbmdcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnYnl0ZXN0cmluZyddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0gaWRcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnaWQnXSA9IHVuZGVmaW5lZDtcblxuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvSW1hZ2UnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL0ltYWdlJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2VEYXRhID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlKTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uIChBcGlDbGllbnQsIEltYWdlKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG5cbiAgICAvKipcbiAgICAgKiBUaGUgSW1hZ2VEYXRhIG1vZGVsIG1vZHVsZS5cbiAgICAgKiBAbW9kdWxlIG1vZGVsL0ltYWdlRGF0YVxuICAgICAqIEB2ZXJzaW9uIDEuMC43XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkltYWdlRGF0YTwvY29kZT4uXG4gICAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9JbWFnZURhdGFcbiAgICAgKiBAY2xhc3NcbiAgICAgKi9cbiAgICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSA8Y29kZT5JbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+SW1hZ2VEYXRhPC9jb2RlPiBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbiAoZGF0YSwgb2JqKSB7XG4gICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ251bUltYWdlcycpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydudW1JbWFnZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bUltYWdlcyddLCAnTnVtYmVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmVzWCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyZXNYJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyZXNYJ10sICdOdW1iZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNZJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ3Jlc1knXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Jlc1knXSwgJ051bWJlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2ltYWdlcycpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydpbWFnZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2ltYWdlcyddLCBbSW1hZ2VdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0gbnVtSW1hZ2VzXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ251bUltYWdlcyddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0gcmVzWFxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydyZXNYJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7TnVtYmVyfSByZXNZXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3Jlc1knXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW1hZ2VzXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2ltYWdlcyddID0gdW5kZWZpbmVkO1xuXG5cbiAgICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uIChBcGlDbGllbnQpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cblxuICAgIC8qKlxuICAgICAqIFRoZSBQYXJhbWV0ZXJMaXN0IG1vZGVsIG1vZHVsZS5cbiAgICAgKiBAbW9kdWxlIG1vZGVsL1BhcmFtZXRlckxpc3RcbiAgICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPi5cbiAgICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3RcbiAgICAgKiBAY2xhc3NcbiAgICAgKi9cbiAgICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4gaW5zdGFuY2UuXG4gICAgICovXG4gICAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24gKGRhdGEsIG9iaikge1xuICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbnB1dF9zaGFwZScpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydpbnB1dF9zaGFwZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5wdXRfc2hhcGUnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1iZXJfb2Zfc3RhY2tzJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ251bWJlcl9vZl9zdGFja3MnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bWJlcl9vZl9zdGFja3MnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdmaWx0ZXJfc2l6ZXMnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnZmlsdGVyX3NpemVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydmaWx0ZXJfc2l6ZXMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtaXJyb3Jfd2VpZ2h0cycpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydtaXJyb3Jfd2VpZ2h0cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWlycm9yX3dlaWdodHMnXSwgWydCb29sZWFuJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2FjdGl2YXRpb25fZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIG9ialsnYWN0aXZhdGlvbl9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYWN0aXZhdGlvbl9mdW5jdGlvbiddLCBbJ1N0cmluZyddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdiYXRjaF9zaXplJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ2JhdGNoX3NpemUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2JhdGNoX3NpemUnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9lcG9jaHMnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbl9lcG9jaHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fZXBvY2hzJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3VzZV90ZW5zb3Jib2FyZCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWyd1c2VfdGVuc29yYm9hcmQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3VzZV90ZW5zb3Jib2FyZCddLCAnQm9vbGVhbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3ZlcmJvc2UnKSkge1xuICAgICAgICAgICAgICAgIG9ialsndmVyYm9zZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndmVyYm9zZSddLCAnQm9vbGVhbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiddLCBbJ1N0cmluZyddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZGVjYXlfc3RlcHMnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbHJfZGVjYXlfc3RlcHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2RlY2F5X3N0ZXBzJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2RlY2F5X3JhdGUnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbHJfZGVjYXlfcmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfZGVjYXlfcmF0ZSddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9zdGFpcmNhc2UnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbHJfc3RhaXJjYXNlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9zdGFpcmNhc2UnXSwgWydCb29sZWFuJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2JvdW5kYXJpZXMnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbHJfYm91bmRhcmllcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfYm91bmRhcmllcyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3ZhbHVlcycpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydscl92YWx1ZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX3ZhbHVlcyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2VuZF9sZWFybmluZ19yYXRlJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ2xyX2VuZF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9wb3dlcicpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydscl9wb3dlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfcG93ZXInXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfY3ljbGUnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbHJfY3ljbGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2N5Y2xlJ10sIFsnQm9vbGVhbiddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdvcHRpbWl6ZXInKSkge1xuICAgICAgICAgICAgICAgIG9ialsnb3B0aW1pemVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydvcHRpbWl6ZXInXSwgWydTdHJpbmcnXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbW9tZW50dW0nKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbW9tZW50dW0nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21vbWVudHVtJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV9mdW5jdGlvbl9mb3Jfd2VpZ2h0cycpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyYW5kb21fZnVuY3Rpb25fZm9yX3dlaWdodHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9mdW5jdGlvbl9mb3Jfd2VpZ2h0cyddLCBbJ1N0cmluZyddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyd19hbHBoYScpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyd19hbHBoYSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncndfYWxwaGEnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncndfYmV0YScpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyd19iZXRhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyd19iZXRhJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3J3X21lYW4nKSkge1xuICAgICAgICAgICAgICAgIG9ialsncndfbWVhbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncndfbWVhbiddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyd19zdGRkZXYnKSkge1xuICAgICAgICAgICAgICAgIG9ialsncndfc3RkZGV2J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyd19zdGRkZXYnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncndfbGFtJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ3J3X2xhbSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncndfbGFtJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3J3X21pbnZhbCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyd19taW52YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3J3X21pbnZhbCddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyd19tYXh2YWwnKSkge1xuICAgICAgICAgICAgICAgIG9ialsncndfbWF4dmFsJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyd19tYXh2YWwnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncndfc2VlZCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyd19zZWVkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyd19zZWVkJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV9mdW5jdGlvbl9mb3JfYmlhc2VzJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ3JhbmRvbV9mdW5jdGlvbl9mb3JfYmlhc2VzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fZnVuY3Rpb25fZm9yX2JpYXNlcyddLCBbJ1N0cmluZyddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYl9hbHBoYScpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyYl9hbHBoYSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmJfYWxwaGEnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmJfYmV0YScpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyYl9iZXRhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYl9iZXRhJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JiX21lYW4nKSkge1xuICAgICAgICAgICAgICAgIG9ialsncmJfbWVhbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmJfbWVhbiddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYl9zdGRkZXYnKSkge1xuICAgICAgICAgICAgICAgIG9ialsncmJfc3RkZGV2J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYl9zdGRkZXYnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmJfbGFtJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ3JiX2xhbSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmJfbGFtJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JiX21pbnZhbCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyYl9taW52YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JiX21pbnZhbCddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYl9tYXh2YWwnKSkge1xuICAgICAgICAgICAgICAgIG9ialsncmJfbWF4dmFsJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYl9tYXh2YWwnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmJfc2VlZCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydyYl9zZWVkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYl9zZWVkJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3Nlc3Npb25fc2F2ZXJfcGF0aCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydzZXNzaW9uX3NhdmVyX3BhdGgnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddLCAnU3RyaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbG9hZF9wcmV2X3Nlc3Npb24nKSkge1xuICAgICAgICAgICAgICAgIG9ialsnbG9hZF9wcmV2X3Nlc3Npb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xvYWRfcHJldl9zZXNzaW9uJ10sICdCb29sZWFuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ251bV90ZXN0X3BpY3R1cmVzJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ251bV90ZXN0X3BpY3R1cmVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydudW1fdGVzdF9waWN0dXJlcyddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGlucHV0X3NoYXBlXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2lucHV0X3NoYXBlJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbnVtYmVyX29mX3N0YWNrc1xuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydudW1iZXJfb2Zfc3RhY2tzJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gZmlsdGVyX3NpemVzXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2ZpbHRlcl9zaXplcyddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbWlycm9yX3dlaWdodHNcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbWlycm9yX3dlaWdodHMnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gYWN0aXZhdGlvbl9mdW5jdGlvblxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGJhdGNoX3NpemVcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnYmF0Y2hfc2l6ZSddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBuX2Vwb2Noc1xuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWyduX2Vwb2NocyddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0Jvb2xlYW59IHVzZV90ZW5zb3Jib2FyZFxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWyd1c2VfdGVuc29yYm9hcmQnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtCb29sZWFufSB2ZXJib3NlXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gbGVhcm5pbmdfcmF0ZV9mdW5jdGlvblxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydsZWFybmluZ19yYXRlX2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZGVjYXlfc3RlcHNcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZGVjYXlfc3RlcHMnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZGVjYXlfcmF0ZVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydscl9kZWNheV9yYXRlJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPEJvb2xlYW4+fSBscl9zdGFpcmNhc2VcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbHJfc3RhaXJjYXNlJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbHJfYm91bmRhcmllc1xuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydscl9ib3VuZGFyaWVzJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbHJfdmFsdWVzXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX3ZhbHVlcyddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9lbmRfbGVhcm5pbmdfcmF0ZVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9wb3dlclxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydscl9wb3dlciddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbHJfY3ljbGVcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbHJfY3ljbGUnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gb3B0aW1pemVyXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ29wdGltaXplciddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtb21lbnR1bVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydtb21lbnR1bSddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxTdHJpbmc+fSByYW5kb21fZnVuY3Rpb25fZm9yX3dlaWdodHNcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX2Z1bmN0aW9uX2Zvcl93ZWlnaHRzJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHJ3X2FscGhhXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3J3X2FscGhhJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHJ3X2JldGFcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncndfYmV0YSddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSByd19tZWFuXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3J3X21lYW4nXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gcndfc3RkZGV2XG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3J3X3N0ZGRldiddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSByd19sYW1cbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncndfbGFtJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHJ3X21pbnZhbFxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydyd19taW52YWwnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gcndfbWF4dmFsXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3J3X21heHZhbCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSByd19zZWVkXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3J3X3NlZWQnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gcmFuZG9tX2Z1bmN0aW9uX2Zvcl9iaWFzZXNcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX2Z1bmN0aW9uX2Zvcl9iaWFzZXMnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gcmJfYWxwaGFcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncmJfYWxwaGEnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gcmJfYmV0YVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydyYl9iZXRhJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHJiX21lYW5cbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncmJfbWVhbiddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSByYl9zdGRkZXZcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncmJfc3RkZGV2J10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHJiX2xhbVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydyYl9sYW0nXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gcmJfbWludmFsXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3JiX21pbnZhbCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSByYl9tYXh2YWxcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncmJfbWF4dmFsJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHJiX3NlZWRcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsncmJfc2VlZCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge1N0cmluZ30gc2Vzc2lvbl9zYXZlcl9wYXRoXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0Jvb2xlYW59IGxvYWRfcHJldl9zZXNzaW9uXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2xvYWRfcHJldl9zZXNzaW9uJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHNlc3Npb25fc2F2ZV9kdXJhdGlvblxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydzZXNzaW9uX3NhdmVfZHVyYXRpb24nXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbnVtX3Rlc3RfcGljdHVyZXNcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnbnVtX3Rlc3RfcGljdHVyZXMnXSA9IHVuZGVmaW5lZDtcblxuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgICAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICAgICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBvaW50MkQgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gICAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50KSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG5cbiAgICAvKipcbiAgICAgKiBUaGUgUG9pbnQyRCBtb2RlbCBtb2R1bGUuXG4gICAgICogQG1vZHVsZSBtb2RlbC9Qb2ludDJEXG4gICAgICogQHZlcnNpb24gMS4wLjdcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UG9pbnQyRDwvY29kZT4uXG4gICAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Qb2ludDJEXG4gICAgICogQGNsYXNzXG4gICAgICovXG4gICAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UG9pbnQyRDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlBvaW50MkQ8L2NvZGU+IGluc3RhbmNlLlxuICAgICAqL1xuICAgIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uIChkYXRhLCBvYmopIHtcbiAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWyd4J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd4J10sICdOdW1iZXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd5JykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ3knXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3knXSwgJ051bWJlcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NsdXN0ZXInKSkge1xuICAgICAgICAgICAgICAgIG9ialsnY2x1c3RlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2x1c3RlciddLCAnTnVtYmVyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHhcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsneCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge051bWJlcn0geVxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWyd5J10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7TnVtYmVyfSBjbHVzdGVyXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2NsdXN0ZXInXSA9IHVuZGVmaW5lZDtcblxuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvSW1hZ2UnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL0ltYWdlJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlKTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uIChBcGlDbGllbnQsIEltYWdlKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG5cbiAgICAvKipcbiAgICAgKiBUaGUgUHJvY2Vzc2VkSW1hZ2VEYXRhIG1vZGVsIG1vZHVsZS5cbiAgICAgKiBAbW9kdWxlIG1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YVxuICAgICAqIEB2ZXJzaW9uIDEuMC43XG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4uXG4gICAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGFcbiAgICAgKiBAY2xhc3NcbiAgICAgKi9cbiAgICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSA8Y29kZT5Qcm9jZXNzZWRJbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UHJvY2Vzc2VkSW1hZ2VEYXRhPC9jb2RlPiBpbnN0YW5jZS5cbiAgICAgKi9cbiAgICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbiAoZGF0YSwgb2JqKSB7XG4gICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lucHV0TGF5ZXInKSkge1xuICAgICAgICAgICAgICAgIG9ialsnaW5wdXRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5wdXRMYXllciddLCBbSW1hZ2VdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsYXRlbnRMYXllcicpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydsYXRlbnRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGF0ZW50TGF5ZXInXSwgW0ltYWdlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnb3V0cHV0TGF5ZXInKSkge1xuICAgICAgICAgICAgICAgIG9ialsnb3V0cHV0TGF5ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ291dHB1dExheWVyJ10sIFtJbWFnZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9JbWFnZT59IGlucHV0TGF5ZXJcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnaW5wdXRMYXllciddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+fSBsYXRlbnRMYXllclxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydsYXRlbnRMYXllciddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+fSBvdXRwdXRMYXllclxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydvdXRwdXRMYXllciddID0gdW5kZWZpbmVkO1xuXG5cbiAgICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgICAgIH1cbiAgICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgICB9XG59KHRoaXMsIGZ1bmN0aW9uIChBcGlDbGllbnQpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cblxuICAgIC8qKlxuICAgICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlIG1vZGVsIG1vZHVsZS5cbiAgICAgKiBAbW9kdWxlIG1vZGVsL1RyYWluUGVyZm9ybWFuY2VcbiAgICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPi5cbiAgICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2VcbiAgICAgKiBAY2xhc3NcbiAgICAgKi9cbiAgICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZTwvY29kZT4gaW5zdGFuY2UuXG4gICAgICovXG4gICAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24gKGRhdGEsIG9iaikge1xuICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtb2RlbF9pZCcpKSB7XG4gICAgICAgICAgICAgICAgb2JqWydtb2RlbF9pZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbW9kZWxfaWQnXSwgJ1N0cmluZycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Nvc3QnKSkge1xuICAgICAgICAgICAgICAgIG9ialsnY29zdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdCddLCBbJ051bWJlciddKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjdXJyZW50TGVhcm5pbmdSYXRlJykpIHtcbiAgICAgICAgICAgICAgICBvYmpbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSwgWydOdW1iZXInXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtTdHJpbmd9IG1vZGVsX2lkXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ21vZGVsX2lkJ10gPSB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNvc3RcbiAgICAgKi9cbiAgICBleHBvcnRzLnByb3RvdHlwZVsnY29zdCddID0gdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjdXJyZW50TGVhcm5pbmdSYXRlXG4gICAgICovXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSA9IHVuZGVmaW5lZDtcblxuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgICAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICAgICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluU3RhdHVzID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICAgIH1cbn0odGhpcywgZnVuY3Rpb24gKEFwaUNsaWVudCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuXG4gICAgLyoqXG4gICAgICogRW51bSBjbGFzcyBUcmFpblN0YXR1cy5cbiAgICAgKiBAZW51bSB7fVxuICAgICAqIEByZWFkb25seVxuICAgICAqL1xuICAgIHZhciBleHBvcnRzID0ge1xuICAgICAgICAvKipcbiAgICAgICAgICogdmFsdWU6IFwic3RhcnRcIlxuICAgICAgICAgKiBAY29uc3RcbiAgICAgICAgICovXG4gICAgICAgIFwic3RhcnRcIjogXCJzdGFydFwiLFxuICAgICAgICAvKipcbiAgICAgICAgICogdmFsdWU6IFwicGF1c2VcIlxuICAgICAgICAgKiBAY29uc3RcbiAgICAgICAgICovXG4gICAgICAgIFwicGF1c2VcIjogXCJwYXVzZVwiLFxuICAgICAgICAvKipcbiAgICAgICAgICogdmFsdWU6IFwic3RvcFwiXG4gICAgICAgICAqIEBjb25zdFxuICAgICAgICAgKi9cbiAgICAgICAgXCJzdG9wXCI6IFwic3RvcFwiLFxuICAgICAgICAvKipcbiAgICAgICAgICogdmFsdWU6IFwicmVzdW1lXCJcbiAgICAgICAgICogQGNvbnN0XG4gICAgICAgICAqL1xuICAgICAgICBcInJlc3VtZVwiOiBcInJlc3VtZVwiXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYSA8Y29kZT5UcmFpblN0YXR1czwvY29kZT4gZW51bSB2YWx1ZSBmcm9tIGEgSmF2YXNjcmlwdCBvYmplY3QgbmFtZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB0aGUgbmFtZSBvZiB0aGUgZW51bSB2YWx1ZS5cbiAgICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9IFRoZSBlbnVtIDxjb2RlPlRyYWluU3RhdHVzPC9jb2RlPiB2YWx1ZS5cbiAgICAgKi9cbiAgICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfVxuXG4gICAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLypcbkluY2x1ZGVzXG4gKi9cbnZhciBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSByZXF1aXJlKCdjb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyJyk7XG5cbi8qXG5HbG9iYWwgdmFyaWFibGVzXG4gKi9cbnZhciB0cmFpbkFwaSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5BcGkoKTtcbnZhciB0cmFpblRpbWVyO1xuXG4vKlxuQ2hhcnRzXG4gKi9cblxudmFyIGNvc3RDaGFydCA9IG5ldyBMaW5lQ2hhcnQoXCJjaGFydHNcIiwgNTAwLCA1MDAsIFwiY29zdFwiKTtcbnZhciBsZWFybmluZ1JhdGVDaGFydCA9IG5ldyBMaW5lQ2hhcnQoXCJjaGFydHNcIiwgNTAwLCA1MDAsIFwibGVhcm5pbmcgcmF0ZVwiKTtcblxuY29uc29sZS5sb2coY29zdENoYXJ0LnBhcmVudE5vZGVJRCk7XG5cbmZ1bmN0aW9uIHVwZGF0ZVRyYWluSW1hZ2VzKCkge1xuICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uIChlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhkYXRhKTtcblxuICAgICAgICAgICAgLy9nZXQgaW1hZ2UgcGFuZVxuICAgICAgICAgICAgdmFyIGltYWdlR3JpZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW1hZ2VHcmlkXCIpO1xuXG4gICAgICAgICAgICAvLyByZW1vdmUgYWxsIHByZXZpb3VzIGVsZW1lbnRzOlxuICAgICAgICAgICAgaW1hZ2VHcmlkLmlubmVySFRNTCA9IFwiXCI7XG5cbiAgICAgICAgICAgIC8vIGFkZCBpbWFnZSBwYWlyc1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmlucHV0TGF5ZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgbmV3IGlucHV0IGltYWdlIG9iamVjdFxuICAgICAgICAgICAgICAgIHZhciBuZXdJbnB1dEltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcbiAgICAgICAgICAgICAgICBuZXdJbnB1dEltYWdlLmlkID0gXCJJbnB1dEltYWdlX1wiICsgZGF0YS5pbnB1dExheWVyW2ldLmlkO1xuICAgICAgICAgICAgICAgIG5ld0lucHV0SW1hZ2Uuc3JjID0gXCJkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBkYXRhLmlucHV0TGF5ZXJbaV0uYnl0ZXN0cmluZy5zdWJzdHJpbmcoMiwgZGF0YS5pbnB1dExheWVyW2ldLmJ5dGVzdHJpbmcubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgICAgbmV3SW5wdXRJbWFnZS5zdHlsZS53aWR0aCA9IFwiODBweFwiO1xuICAgICAgICAgICAgICAgIG5ld0lucHV0SW1hZ2UuY2xhc3MgPSBcImltYWdlVGh1bWJuYWlsXCI7XG5cbiAgICAgICAgICAgICAgICAvLyBhcHBlbmQgbmV3IGltYWdlIHRvIGltYWdlIGdyaWRcbiAgICAgICAgICAgICAgICBpbWFnZUdyaWQuYXBwZW5kQ2hpbGQobmV3SW5wdXRJbWFnZSk7XG5cbiAgICAgICAgICAgICAgICAvKi8vIGFkZCBldmVudExpc3RlbmVyXG4gICAgICAgICAgICAgICAgLy8gY2hhbmdlIHByZXZpZXcgdmlld1xuICAgICAgICAgICAgICAgIG5ld0lucHV0SW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5pZCk7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW1hZ2VQcmV2aWV3XCIpLnNyYyA9IHRoaXMuc3JjO1xuICAgICAgICAgICAgICAgIH0pOyovXG5cbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgbmV3IG91dHB1dCBpbWFnZSBvYmplY3RcbiAgICAgICAgICAgICAgICB2YXIgbmV3T3V0cHV0SW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xuICAgICAgICAgICAgICAgIG5ld091dHB1dEltYWdlLmlkID0gXCJPdXRwdXRJbWFnZV9cIiArIGRhdGEub3V0cHV0TGF5ZXJbaV0uaWQ7XG4gICAgICAgICAgICAgICAgbmV3T3V0cHV0SW1hZ2Uuc3JjID0gXCJkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBkYXRhLm91dHB1dExheWVyW2ldLmJ5dGVzdHJpbmcuc3Vic3RyaW5nKDIsIGRhdGEub3V0cHV0TGF5ZXJbaV0uYnl0ZXN0cmluZy5sZW5ndGggLSAxKTtcbiAgICAgICAgICAgICAgICBuZXdPdXRwdXRJbWFnZS5zdHlsZS53aWR0aCA9IFwiODBweFwiO1xuICAgICAgICAgICAgICAgIG5ld091dHB1dEltYWdlLmNsYXNzID0gXCJpbWFnZVRodW1ibmFpbFwiO1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobmV3T3V0cHV0SW1hZ2UuaWQpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEub3V0cHV0TGF5ZXJbaV0uYnl0ZXN0cmluZy5zdWJzdHJpbmcoMiwgZGF0YS5vdXRwdXRMYXllcltpXS5ieXRlc3RyaW5nLmxlbmd0aCAtIDEpKTtcblxuICAgICAgICAgICAgICAgIC8vIGFwcGVuZCBuZXcgaW1hZ2UgdG8gaW1hZ2UgZ3JpZFxuICAgICAgICAgICAgICAgIGltYWdlR3JpZC5hcHBlbmRDaGlsZChuZXdPdXRwdXRJbWFnZSk7XG5cbiAgICAgICAgICAgICAgICAvL2FwcGVuZCBsaW5lIGJyZWFrOlxuICAgICAgICAgICAgICAgIGltYWdlR3JpZC5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpKTtcblxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgfVxuICAgIH07XG4gICAgdHJhaW5BcGkuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhKDksIGNhbGxiYWNrKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHJhaW5TdGF0aXN0aWNzKCkge1xuICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uIChlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuXG4gICAgICAgICAgICAvL3VwZGF0ZSBjb3N0IGRpYWdyYW1cbiAgICAgICAgICAgIGlmIChkYXRhLmNvc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvc3RDaGFydC5hcHBlbmREYXRhKGRhdGEuY29zdCk7XG4gICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlQ2hhcnQuYXBwZW5kRGF0YShkYXRhLmN1cnJlbnRMZWFybmluZ1JhdGUpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuXG5cbiAgICB9O1xuXG4gICAgdHJhaW5BcGkuZ2V0VHJhaW5QZXJmb3JtYW5jZShjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XG4gICAgY29uc29sZS5sb2coXCJ0aWNrXCIpO1xuICAgIC8vIHVwZGF0ZSB0cmFpbiBpbWFnZXM6XG4gICAgdXBkYXRlVHJhaW5JbWFnZXMoKTtcblxuICAgIC8vIHVwZGF0ZSBjaGFydHM6XG4gICAgdXBkYXRlVHJhaW5TdGF0aXN0aWNzKCk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0VHJhaW5pbmcoKSB7XG5cbiAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNwb25zZUxhYmVsXCIpLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGV4dDtcblxuICAgICAgICAgICAgLy8gc3RhcnQgdXBkYXRlIHRpbWVyXG4gICAgICAgICAgICB0cmFpblRpbWVyID0gc2V0SW50ZXJ2YWwodXBkYXRlVmlldywgNTAwMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0cmFpbkFwaS5jb250cm9sVHJhaW5pbmcoJ1wic3RhcnRcIicsIGNhbGxiYWNrKTtcbn1cblxuXG5mdW5jdGlvbiBzdG9wVHJhaW5pbmcoKSB7XG5cbiAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNwb25zZUxhYmVsXCIpLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGV4dDtcblxuICAgICAgICAgICAgLy8gc3RvcCB1cGRhdGUgdGltZXJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodHJhaW5UaW1lcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0cmFpbkFwaS5jb250cm9sVHJhaW5pbmcoJ1wic3RvcFwiJywgY2FsbGJhY2spO1xufVxuXG5cbi8qXG5hdHRhY2ggRXZlbnQgTGlzdGVuZXJcbiAqL1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXJ0VHJhaW5pbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN0YXJ0VHJhaW5pbmcpO1xuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdG9wVHJhaW5pbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN0b3BUcmFpbmluZyk7XG5cblxuXG4iLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBwbGFjZUhvbGRlcnNDb3VudCAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICByZXR1cm4gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIHJldHVybiAoYjY0Lmxlbmd0aCAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0NvdW50KGI2NClcbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBwbGFjZUhvbGRlcnMgPSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG5cbiAgYXJyID0gbmV3IEFycigobGVuICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMDsgaSA8IGw7IGkgKz0gNCkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0ge19fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfX1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHR5cGVkIGFycmF5IGxlbmd0aCcpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0lmIGVuY29kaW5nIGlzIHNwZWNpZmllZCB0aGVuIHRoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlcicpXG4gIH1cblxuICBpZiAoaXNBcnJheUJ1ZmZlcih2YWx1ZSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgcmV0dXJuIGZyb21PYmplY3QodmFsdWUpXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20odmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gTm90ZTogQ2hhbmdlIHByb3RvdHlwZSAqYWZ0ZXIqIEJ1ZmZlci5mcm9tIGlzIGRlZmluZWQgdG8gd29ya2Fyb3VuZCBDaHJvbWUgYnVnOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC8xNDhcbkJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbkJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG5lZ2F0aXZlJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2Moc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlIChzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZW5jb2RpbmdcIiBtdXN0IGJlIGEgdmFsaWQgc3RyaW5nIGVuY29kaW5nJylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcblxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnb2Zmc2V0XFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdsZW5ndGhcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKG9iaikge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iaikpIHtcbiAgICB2YXIgbGVuID0gY2hlY2tlZChvYmoubGVuZ3RoKSB8IDBcbiAgICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbilcblxuICAgIGlmIChidWYubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYnVmXG4gICAgfVxuXG4gICAgb2JqLmNvcHkoYnVmLCAwLCAwLCBsZW4pXG4gICAgcmV0dXJuIGJ1ZlxuICB9XG5cbiAgaWYgKG9iaikge1xuICAgIGlmIChpc0FycmF5QnVmZmVyVmlldyhvYmopIHx8ICdsZW5ndGgnIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKDApXG4gICAgICB9XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gICAgfVxuXG4gICAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBBcnJheS5pc0FycmF5KG9iai5kYXRhKSkge1xuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignRmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksIG9yIGFycmF5LWxpa2Ugb2JqZWN0LicpXG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBLX01BWF9MRU5HVEhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIEtfTUFYX0xFTkdUSC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuIGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlciA9PT0gdHJ1ZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgICB9XG4gICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpXG4gICAgcG9zICs9IGJ1Zi5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmZmVyXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgfVxuICBpZiAoaXNBcnJheUJ1ZmZlclZpZXcoc3RyaW5nKSB8fCBpc0FycmF5QnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICBzdHJpbmcgPSAnJyArIHN0cmluZ1xuICB9XG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGggLy8gYXNzdW1lIHV0ZjhcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgKGFuZCB0aGUgYGlzLWJ1ZmZlcmAgbnBtIHBhY2thZ2UpXG4vLyB0byBkZXRlY3QgYSBCdWZmZXIgaW5zdGFuY2UuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHVzZSBgaW5zdGFuY2VvZiBCdWZmZXJgXG4vLyByZWxpYWJseSBpbiBhIGJyb3dzZXJpZnkgY29udGV4dCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIGRpZmZlcmVudFxuLy8gY29waWVzIG9mIHRoZSAnYnVmZmVyJyBwYWNrYWdlIGluIHVzZS4gVGhpcyBtZXRob2Qgd29ya3MgZXZlbiBmb3IgQnVmZmVyXG4vLyBpbnN0YW5jZXMgdGhhdCB3ZXJlIGNyZWF0ZWQgZnJvbSBhbm90aGVyIGNvcHkgb2YgdGhlIGBidWZmZXJgIHBhY2thZ2UuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNTRcbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDY0ID0gZnVuY3Rpb24gc3dhcDY0ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA4ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NC1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgNylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgNilcbiAgICBzd2FwKHRoaXMsIGkgKyAyLCBpICsgNSlcbiAgICBzd2FwKHRoaXMsIGkgKyAzLCBpICsgNClcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0ICAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmICh0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbIHZhbCBdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgKGJ5dGVzW2kgKyAxXSAqIDI1NikpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG4gIHZhciBpXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2UgaWYgKGxlbiA8IDEwMDApIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmIChjb2RlIDwgMjU2KSB7XG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiBuZXcgQnVmZmVyKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teKy8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXJzIGZyb20gYW5vdGhlciBjb250ZXh0IChpLmUuIGFuIGlmcmFtZSkgZG8gbm90IHBhc3MgdGhlIGBpbnN0YW5jZW9mYCBjaGVja1xuLy8gYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgdmFsaWQuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE2NlxuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlciAob2JqKSB7XG4gIHJldHVybiBvYmogaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fFxuICAgIChvYmogIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IgIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IubmFtZSA9PT0gJ0FycmF5QnVmZmVyJyAmJlxuICAgICAgdHlwZW9mIG9iai5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJylcbn1cblxuLy8gTm9kZSAwLjEwIHN1cHBvcnRzIGBBcnJheUJ1ZmZlcmAgYnV0IGxhY2tzIGBBcnJheUJ1ZmZlci5pc1ZpZXdgXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyAob2JqKSB7XG4gIHJldHVybiAodHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJykgJiYgQXJyYXlCdWZmZXIuaXNWaWV3KG9iailcbn1cblxuZnVuY3Rpb24gbnVtYmVySXNOYU4gKG9iaikge1xuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gSWYgb2JqLmhhc093blByb3BlcnR5IGhhcyBiZWVuIG92ZXJyaWRkZW4sIHRoZW4gY2FsbGluZ1xuLy8gb2JqLmhhc093blByb3BlcnR5KHByb3ApIHdpbGwgYnJlYWsuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMTcwN1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxcywgc2VwLCBlcSwgb3B0aW9ucykge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgdmFyIG9iaiA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcXMgIT09ICdzdHJpbmcnIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgcmVnZXhwID0gL1xcKy9nO1xuICBxcyA9IHFzLnNwbGl0KHNlcCk7XG5cbiAgdmFyIG1heEtleXMgPSAxMDAwO1xuICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5tYXhLZXlzID09PSAnbnVtYmVyJykge1xuICAgIG1heEtleXMgPSBvcHRpb25zLm1heEtleXM7XG4gIH1cblxuICB2YXIgbGVuID0gcXMubGVuZ3RoO1xuICAvLyBtYXhLZXlzIDw9IDAgbWVhbnMgdGhhdCB3ZSBzaG91bGQgbm90IGxpbWl0IGtleXMgY291bnRcbiAgaWYgKG1heEtleXMgPiAwICYmIGxlbiA+IG1heEtleXMpIHtcbiAgICBsZW4gPSBtYXhLZXlzO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIHZhciB4ID0gcXNbaV0ucmVwbGFjZShyZWdleHAsICclMjAnKSxcbiAgICAgICAgaWR4ID0geC5pbmRleE9mKGVxKSxcbiAgICAgICAga3N0ciwgdnN0ciwgaywgdjtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAga3N0ciA9IHguc3Vic3RyKDAsIGlkeCk7XG4gICAgICB2c3RyID0geC5zdWJzdHIoaWR4ICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtzdHIgPSB4O1xuICAgICAgdnN0ciA9ICcnO1xuICAgIH1cblxuICAgIGsgPSBkZWNvZGVVUklDb21wb25lbnQoa3N0cik7XG4gICAgdiA9IGRlY29kZVVSSUNvbXBvbmVudCh2c3RyKTtcblxuICAgIGlmICghaGFzT3duUHJvcGVydHkob2JqLCBrKSkge1xuICAgICAgb2JqW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgb2JqW2tdLnB1c2godik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtrXSA9IFtvYmpba10sIHZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnlQcmltaXRpdmUgPSBmdW5jdGlvbih2KSB7XG4gIHN3aXRjaCAodHlwZW9mIHYpIHtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcmV0dXJuIHY7XG5cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIHJldHVybiB2ID8gJ3RydWUnIDogJ2ZhbHNlJztcblxuICAgIGNhc2UgJ251bWJlcic6XG4gICAgICByZXR1cm4gaXNGaW5pdGUodikgPyB2IDogJyc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaiwgc2VwLCBlcSwgbmFtZSkge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIG9iaiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBtYXAob2JqZWN0S2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICB2YXIga3MgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKGspKSArIGVxO1xuICAgICAgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgICByZXR1cm4gbWFwKG9ialtrXSwgZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUodikpO1xuICAgICAgICB9KS5qb2luKHNlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9ialtrXSkpO1xuICAgICAgfVxuICAgIH0pLmpvaW4oc2VwKTtcblxuICB9XG5cbiAgaWYgKCFuYW1lKSByZXR1cm4gJyc7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG5hbWUpKSArIGVxICtcbiAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqKSk7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGYpO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSByZXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmRlY29kZSA9IGV4cG9ydHMucGFyc2UgPSByZXF1aXJlKCcuL2RlY29kZScpO1xuZXhwb3J0cy5lbmNvZGUgPSBleHBvcnRzLnN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vZW5jb2RlJyk7XG4iXX0=
