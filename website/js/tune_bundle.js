(function () {
    function r(e, n, t) {
        function o(i, f) {
            if (!n[i]) {
                if (!e[i]) {
                    var c = "function" == typeof require && require;
                    if (!f && c) return c(i, !0);
                    if (u) return u(i, !0);
                    var a = new Error("Cannot find module '" + i + "'");
                    throw a.code = "MODULE_NOT_FOUND", a
                }
                var p = n[i] = {exports: {}};
                e[i][0].call(p.exports, function (r) {
                    var n = e[i][1][r];
                    return o(n || r)
                }, p, p.exports, r, e, n, t)
            }
            return n[i].exports
        }

        for (var u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
        return o
    }

    return r
})()({
    1: [function (require, module, exports) {
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

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
        revLookup['-'.charCodeAt(0)] = 62
        revLookup['_'.charCodeAt(0)] = 63

        function placeHoldersCount(b64) {
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

        function byteLength(b64) {
            // base64 is 4/3 + up to two characters of the original data
            return (b64.length * 3 / 4) - placeHoldersCount(b64)
        }

        function toByteArray(b64) {
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

        function tripletToBase64(num) {
            return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
        }

        function encodeChunk(uint8, start, end) {
            var tmp
            var output = []
            for (var i = start; i < end; i += 3) {
                tmp = ((uint8[i] << 16) & 0xFF0000) + ((uint8[i + 1] << 8) & 0xFF00) + (uint8[i + 2] & 0xFF)
                output.push(tripletToBase64(tmp))
            }
            return output.join('')
        }

        function fromByteArray(uint8) {
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

    }, {}],
    2: [function (require, module, exports) {

    }, {}],
    3: [function (require, module, exports) {
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

        function typedArraySupport() {
            // Can typed array instances can be augmented?
            try {
                var arr = new Uint8Array(1)
                arr.__proto__ = {
                    __proto__: Uint8Array.prototype, foo: function () {
                        return 42
                    }
                }
                return arr.foo() === 42
            } catch (e) {
                return false
            }
        }

        Object.defineProperty(Buffer.prototype, 'parent', {
            get: function () {
                if (!(this instanceof Buffer)) {
                    return undefined
                }
                return this.buffer
            }
        })

        Object.defineProperty(Buffer.prototype, 'offset', {
            get: function () {
                if (!(this instanceof Buffer)) {
                    return undefined
                }
                return this.byteOffset
            }
        })

        function createBuffer(length) {
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

        function Buffer(arg, encodingOrOffset, length) {
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

        function from(value, encodingOrOffset, length) {
            if (typeof value === 'number') {
                throw new TypeError('"value" argument must not be a number')
            }

            if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
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

        function assertSize(size) {
            if (typeof size !== 'number') {
                throw new TypeError('"size" argument must be of type number')
            } else if (size < 0) {
                throw new RangeError('"size" argument must not be negative')
            }
        }

        function alloc(size, fill, encoding) {
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

        function allocUnsafe(size) {
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

        function fromString(string, encoding) {
            if (typeof encoding !== 'string' || encoding === '') {
                encoding = 'utf8'
            }

            if (!Buffer.isEncoding(encoding)) {
                throw new TypeError('Unknown encoding: ' + encoding)
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

        function fromArrayLike(array) {
            var length = array.length < 0 ? 0 : checked(array.length) | 0
            var buf = createBuffer(length)
            for (var i = 0; i < length; i += 1) {
                buf[i] = array[i] & 255
            }
            return buf
        }

        function fromArrayBuffer(array, byteOffset, length) {
            if (byteOffset < 0 || array.byteLength < byteOffset) {
                throw new RangeError('"offset" is outside of buffer bounds')
            }

            if (array.byteLength < byteOffset + (length || 0)) {
                throw new RangeError('"length" is outside of buffer bounds')
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

        function fromObject(obj) {
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
                if (ArrayBuffer.isView(obj) || 'length' in obj) {
                    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
                        return createBuffer(0)
                    }
                    return fromArrayLike(obj)
                }

                if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
                    return fromArrayLike(obj.data)
                }
            }

            throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
        }

        function checked(length) {
            // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
            // length is NaN (which is otherwise coerced to zero.)
            if (length >= K_MAX_LENGTH) {
                throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                    'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
            }
            return length | 0
        }

        function SlowBuffer(length) {
            if (+length != length) { // eslint-disable-line eqeqeq
                length = 0
            }
            return Buffer.alloc(+length)
        }

        Buffer.isBuffer = function isBuffer(b) {
            return b != null && b._isBuffer === true
        }

        Buffer.compare = function compare(a, b) {
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

        Buffer.isEncoding = function isEncoding(encoding) {
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

        Buffer.concat = function concat(list, length) {
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
                if (ArrayBuffer.isView(buf)) {
                    buf = Buffer.from(buf)
                }
                if (!Buffer.isBuffer(buf)) {
                    throw new TypeError('"list" argument must be an Array of Buffers')
                }
                buf.copy(buffer, pos)
                pos += buf.length
            }
            return buffer
        }

        function byteLength(string, encoding) {
            if (Buffer.isBuffer(string)) {
                return string.length
            }
            if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
                return string.byteLength
            }
            if (typeof string !== 'string') {
                string = '' + string
            }

            var len = string.length
            if (len === 0) return 0

            // Use a for loop to avoid recursion
            var loweredCase = false
            for (; ;) {
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

        function slowToString(encoding, start, end) {
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

        function swap(b, n, m) {
            var i = b[n]
            b[n] = b[m]
            b[m] = i
        }

        Buffer.prototype.swap16 = function swap16() {
            var len = this.length
            if (len % 2 !== 0) {
                throw new RangeError('Buffer size must be a multiple of 16-bits')
            }
            for (var i = 0; i < len; i += 2) {
                swap(this, i, i + 1)
            }
            return this
        }

        Buffer.prototype.swap32 = function swap32() {
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

        Buffer.prototype.swap64 = function swap64() {
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

        Buffer.prototype.toString = function toString() {
            var length = this.length
            if (length === 0) return ''
            if (arguments.length === 0) return utf8Slice(this, 0, length)
            return slowToString.apply(this, arguments)
        }

        Buffer.prototype.toLocaleString = Buffer.prototype.toString

        Buffer.prototype.equals = function equals(b) {
            if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
            if (this === b) return true
            return Buffer.compare(this, b) === 0
        }

        Buffer.prototype.inspect = function inspect() {
            var str = ''
            var max = exports.INSPECT_MAX_BYTES
            if (this.length > 0) {
                str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
                if (this.length > max) str += ' ... '
            }
            return '<Buffer ' + str + '>'
        }

        Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
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
        function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
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
                return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
            }

            throw new TypeError('val must be string, number or Buffer')
        }

        function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
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

            function read(buf, i) {
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

        Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
            return this.indexOf(val, byteOffset, encoding) !== -1
        }

        Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
            return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
        }

        Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
            return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
        }

        function hexWrite(buf, string, offset, length) {
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

            var strLen = string.length

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

        function utf8Write(buf, string, offset, length) {
            return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
        }

        function asciiWrite(buf, string, offset, length) {
            return blitBuffer(asciiToBytes(string), buf, offset, length)
        }

        function latin1Write(buf, string, offset, length) {
            return asciiWrite(buf, string, offset, length)
        }

        function base64Write(buf, string, offset, length) {
            return blitBuffer(base64ToBytes(string), buf, offset, length)
        }

        function ucs2Write(buf, string, offset, length) {
            return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
        }

        Buffer.prototype.write = function write(string, offset, length, encoding) {
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
            for (; ;) {
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

        Buffer.prototype.toJSON = function toJSON() {
            return {
                type: 'Buffer',
                data: Array.prototype.slice.call(this._arr || this, 0)
            }
        }

        function base64Slice(buf, start, end) {
            if (start === 0 && end === buf.length) {
                return base64.fromByteArray(buf)
            } else {
                return base64.fromByteArray(buf.slice(start, end))
            }
        }

        function utf8Slice(buf, start, end) {
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

        function decodeCodePointsArray(codePoints) {
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

        function asciiSlice(buf, start, end) {
            var ret = ''
            end = Math.min(buf.length, end)

            for (var i = start; i < end; ++i) {
                ret += String.fromCharCode(buf[i] & 0x7F)
            }
            return ret
        }

        function latin1Slice(buf, start, end) {
            var ret = ''
            end = Math.min(buf.length, end)

            for (var i = start; i < end; ++i) {
                ret += String.fromCharCode(buf[i])
            }
            return ret
        }

        function hexSlice(buf, start, end) {
            var len = buf.length

            if (!start || start < 0) start = 0
            if (!end || end < 0 || end > len) end = len

            var out = ''
            for (var i = start; i < end; ++i) {
                out += toHex(buf[i])
            }
            return out
        }

        function utf16leSlice(buf, start, end) {
            var bytes = buf.slice(start, end)
            var res = ''
            for (var i = 0; i < bytes.length; i += 2) {
                res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
            }
            return res
        }

        Buffer.prototype.slice = function slice(start, end) {
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
        function checkOffset(offset, ext, length) {
            if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
            if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
        }

        Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
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

        Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
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

        Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 1, this.length)
            return this[offset]
        }

        Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 2, this.length)
            return this[offset] | (this[offset + 1] << 8)
        }

        Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 2, this.length)
            return (this[offset] << 8) | this[offset + 1]
        }

        Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 4, this.length)

            return ((this[offset]) |
                (this[offset + 1] << 8) |
                (this[offset + 2] << 16)) +
                (this[offset + 3] * 0x1000000)
        }

        Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 4, this.length)

            return (this[offset] * 0x1000000) +
                ((this[offset + 1] << 16) |
                    (this[offset + 2] << 8) |
                    this[offset + 3])
        }

        Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
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

        Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
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

        Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 1, this.length)
            if (!(this[offset] & 0x80)) return (this[offset])
            return ((0xff - this[offset] + 1) * -1)
        }

        Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 2, this.length)
            var val = this[offset] | (this[offset + 1] << 8)
            return (val & 0x8000) ? val | 0xFFFF0000 : val
        }

        Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 2, this.length)
            var val = this[offset + 1] | (this[offset] << 8)
            return (val & 0x8000) ? val | 0xFFFF0000 : val
        }

        Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 4, this.length)

            return (this[offset]) |
                (this[offset + 1] << 8) |
                (this[offset + 2] << 16) |
                (this[offset + 3] << 24)
        }

        Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 4, this.length)

            return (this[offset] << 24) |
                (this[offset + 1] << 16) |
                (this[offset + 2] << 8) |
                (this[offset + 3])
        }

        Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 4, this.length)
            return ieee754.read(this, offset, true, 23, 4)
        }

        Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 4, this.length)
            return ieee754.read(this, offset, false, 23, 4)
        }

        Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 8, this.length)
            return ieee754.read(this, offset, true, 52, 8)
        }

        Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
            offset = offset >>> 0
            if (!noAssert) checkOffset(offset, 8, this.length)
            return ieee754.read(this, offset, false, 52, 8)
        }

        function checkInt(buf, value, offset, ext, max, min) {
            if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
            if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
            if (offset + ext > buf.length) throw new RangeError('Index out of range')
        }

        Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
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

        Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
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

        Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
            this[offset] = (value & 0xff)
            return offset + 1
        }

        Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
            this[offset] = (value & 0xff)
            this[offset + 1] = (value >>> 8)
            return offset + 2
        }

        Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
            this[offset] = (value >>> 8)
            this[offset + 1] = (value & 0xff)
            return offset + 2
        }

        Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
            this[offset + 3] = (value >>> 24)
            this[offset + 2] = (value >>> 16)
            this[offset + 1] = (value >>> 8)
            this[offset] = (value & 0xff)
            return offset + 4
        }

        Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
            this[offset] = (value >>> 24)
            this[offset + 1] = (value >>> 16)
            this[offset + 2] = (value >>> 8)
            this[offset + 3] = (value & 0xff)
            return offset + 4
        }

        Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
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

        Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
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

        Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
            if (value < 0) value = 0xff + value + 1
            this[offset] = (value & 0xff)
            return offset + 1
        }

        Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
            this[offset] = (value & 0xff)
            this[offset + 1] = (value >>> 8)
            return offset + 2
        }

        Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
            this[offset] = (value >>> 8)
            this[offset + 1] = (value & 0xff)
            return offset + 2
        }

        Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
            this[offset] = (value & 0xff)
            this[offset + 1] = (value >>> 8)
            this[offset + 2] = (value >>> 16)
            this[offset + 3] = (value >>> 24)
            return offset + 4
        }

        Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
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

        function checkIEEE754(buf, value, offset, ext, max, min) {
            if (offset + ext > buf.length) throw new RangeError('Index out of range')
            if (offset < 0) throw new RangeError('Index out of range')
        }

        function writeFloat(buf, value, offset, littleEndian, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) {
                checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
            }
            ieee754.write(buf, value, offset, littleEndian, 23, 4)
            return offset + 4
        }

        Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
            return writeFloat(this, value, offset, true, noAssert)
        }

        Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
            return writeFloat(this, value, offset, false, noAssert)
        }

        function writeDouble(buf, value, offset, littleEndian, noAssert) {
            value = +value
            offset = offset >>> 0
            if (!noAssert) {
                checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
            }
            ieee754.write(buf, value, offset, littleEndian, 52, 8)
            return offset + 8
        }

        Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
            return writeDouble(this, value, offset, true, noAssert)
        }

        Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
            return writeDouble(this, value, offset, false, noAssert)
        }

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
        Buffer.prototype.copy = function copy(target, targetStart, start, end) {
            if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
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
            if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
            if (end < 0) throw new RangeError('sourceEnd out of bounds')

            // Are we oob?
            if (end > this.length) end = this.length
            if (target.length - targetStart < end - start) {
                end = target.length - targetStart + start
            }

            var len = end - start

            if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
                // Use built-in when available, missing from IE11
                this.copyWithin(targetStart, start, end)
            } else if (this === target && start < targetStart && targetStart < end) {
                // descending copy from end
                for (var i = len - 1; i >= 0; --i) {
                    target[i + targetStart] = this[i + start]
                }
            } else {
                Uint8Array.prototype.set.call(
                    target,
                    this.subarray(start, end),
                    targetStart
                )
            }

            return len
        }

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
        Buffer.prototype.fill = function fill(val, start, end, encoding) {
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
                if (encoding !== undefined && typeof encoding !== 'string') {
                    throw new TypeError('encoding must be a string')
                }
                if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
                    throw new TypeError('Unknown encoding: ' + encoding)
                }
                if (val.length === 1) {
                    var code = val.charCodeAt(0)
                    if ((encoding === 'utf8' && code < 128) ||
                        encoding === 'latin1') {
                        // Fast path: If `val` fits into a single byte, use that numeric value.
                        val = code
                    }
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
                if (len === 0) {
                    throw new TypeError('The value "' + val +
                        '" is invalid for argument "value"')
                }
                for (i = 0; i < end - start; ++i) {
                    this[i + start] = bytes[i % len]
                }
            }

            return this
        }

// HELPER FUNCTIONS
// ================

        var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

        function base64clean(str) {
            // Node takes equal signs as end of the Base64 encoding
            str = str.split('=')[0]
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

        function toHex(n) {
            if (n < 16) return '0' + n.toString(16)
            return n.toString(16)
        }

        function utf8ToBytes(string, units) {
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

        function asciiToBytes(str) {
            var byteArray = []
            for (var i = 0; i < str.length; ++i) {
                // Node's code seems to be doing this and not & 0x7F..
                byteArray.push(str.charCodeAt(i) & 0xFF)
            }
            return byteArray
        }

        function utf16leToBytes(str, units) {
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

        function base64ToBytes(str) {
            return base64.toByteArray(base64clean(str))
        }

        function blitBuffer(src, dst, offset, length) {
            for (var i = 0; i < length; ++i) {
                if ((i + offset >= dst.length) || (i >= src.length)) break
                dst[i + offset] = src[i]
            }
            return i
        }

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
        function isArrayBuffer(obj) {
            return obj instanceof ArrayBuffer ||
                (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
                    typeof obj.byteLength === 'number')
        }

        function numberIsNaN(obj) {
            return obj !== obj // eslint-disable-line no-self-compare
        }

    }, {"base64-js": 1, "ieee754": 4}],
    4: [function (require, module, exports) {
        exports.read = function (buffer, offset, isLE, mLen, nBytes) {
            var e, m
            var eLen = (nBytes * 8) - mLen - 1
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
            for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {
            }

            m = e & ((1 << (-nBits)) - 1)
            e >>= (-nBits)
            nBits += mLen
            for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {
            }

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
            var eLen = (nBytes * 8) - mLen - 1
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
                    m = ((value * c) - 1) * Math.pow(2, mLen)
                    e = e + eBias
                } else {
                    m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
                    e = 0
                }
            }

            for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {
            }

            e = (e << mLen) | m
            eLen += mLen
            for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {
            }

            buffer[offset + i - d] |= s * 128
        }

    }, {}],
    5: [function (require, module, exports) {
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

        module.exports = function (qs, sep, eq, options) {
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

    }, {}],
    6: [function (require, module, exports) {
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

        var stringifyPrimitive = function (v) {
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

        module.exports = function (obj, sep, eq, name) {
            sep = sep || '&';
            eq = eq || '=';
            if (obj === null) {
                obj = undefined;
            }

            if (typeof obj === 'object') {
                return map(objectKeys(obj), function (k) {
                    var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
                    if (isArray(obj[k])) {
                        return map(obj[k], function (v) {
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

        function map(xs, f) {
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

    }, {}],
    7: [function (require, module, exports) {
        'use strict';

        exports.decode = exports.parse = require('./decode');
        exports.encode = exports.stringify = require('./encode');

    }, {"./decode": 5, "./encode": 6}],
    8: [function (require, module, exports) {
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

    }, {}],
    9: [function (require, module, exports) {
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

    }, {
        "./is-function": 10,
        "./is-object": 11,
        "./request-base": 12,
        "./response-base": 13,
        "./should-retry": 14,
        "component-emitter": 8
    }],
    10: [function (require, module, exports) {
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

    }, {"./is-object": 11}],
    11: [function (require, module, exports) {
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

    }, {}],
    12: [function (require, module, exports) {
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

    }, {"./is-object": 11}],
    13: [function (require, module, exports) {
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

    }, {"./utils": 15}],
    14: [function (require, module, exports) {
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

    }, {}],
    15: [function (require, module, exports) {
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
    }, {}],
    16: [function (require, module, exports) {
        (function (Buffer) {
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
             * Swagger Codegen version: 2.3.1
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

                    /*
       * Allow user to override superagent agent
       */
                    this.requestAgent = null;
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
                 * @param {Object.<String, Object>} collectionQueryParams A map of collection query parameters and their values.
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
                                                             queryParams, collectionQueryParams, headerParams, formParams, bodyParam, authNames, contentTypes, accepts,
                                                             returnType, callback) {

                    var _this = this;
                    var url = this.buildUrl(path, pathParams);
                    var request = superagent(httpMethod, url);

                    // apply authentications
                    this.applyAuthToRequest(request, authNames);

                    // set collection query parameters
                    for (var key in collectionQueryParams) {
                        if (collectionQueryParams.hasOwnProperty(key)) {
                            var param = collectionQueryParams[key];
                            if (param.collectionFormat === 'csv') {
                                // SuperAgent normally percent-encodes all reserved characters in a query parameter. However,
                                // commas are used as delimiters for the 'csv' collectionFormat so they must not be encoded. We
                                // must therefore construct and encode 'csv' collection query parameters manually.
                                if (param.value != null) {
                                    var value = param.value.map(this.paramToString).map(encodeURIComponent).join(',');
                                    request.query(encodeURIComponent(key) + "=" + value);
                                }
                            } else {
                                // All other collection query parameters should be treated as ordinary query parameters.
                                queryParams[key] = this.buildCollectionParam(param.value, param.collectionFormat);
                            }
                        }
                    }

                    // set query parameters
                    if (httpMethod.toUpperCase() === 'GET' && this.cache === false) {
                        queryParams['_'] = new Date().getTime();
                    }
                    request.query(this.normalizeParams(queryParams));

                    // set header parameters
                    request.set(this.defaultHeaders).set(this.normalizeParams(headerParams));


                    // set requestAgent if it is set by user
                    if (this.requestAgent) {
                        request.agent(this.requestAgent);
                    }

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

        }).call(this, require("buffer").Buffer)

    }, {"buffer": 3, "fs": 2, "querystring": 7, "superagent": 9}],
    17: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
             * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
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
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/build/buildANN', 'POST',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }

                /**
                 * Callback function to receive the result of the getANNParameter operation.
                 * @callback module:api/BuildApi~getANNParameterCallback
                 * @param {String} error Error message, if any.
                 * @param {module:model/ParameterList} data The data returned by the service call.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * returns the parameter set of the created ANN
                 * returns a object of type ParameterList
                 * @param {module:api/BuildApi~getANNParameterCallback} callback The callback function, accepting three arguments: error, data, response
                 * data is of type: {@link module:model/ParameterList}
                 */
                this.getANNParameter = function (callback) {
                    var postBody = null;


                    var pathParams = {};
                    var queryParams = {};
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ParameterList;

                    return this.apiClient.callApi(
                        '/build/getANNParameter', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                        'dataset_name': opts['datasetName'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ['Number'];

                    return this.apiClient.callApi(
                        '/build/getInputShape', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }
            };

            return exports;
        }));

    }, {"../ApiClient": 16, "../model/ParameterList": 29}],
    18: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
             * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
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
                        'output': opts['output'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ImageData;

                    return this.apiClient.callApi(
                        '/load/getImageBatch', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                        'output': opts['output'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ImageData;

                    return this.apiClient.callApi(
                        '/load/getImageById', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                        'output': opts['output'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ImageData;

                    return this.apiClient.callApi(
                        '/load/getImages', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                        'output': opts['output'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ImageData;

                    return this.apiClient.callApi(
                        '/load/getRandomImages', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                        'data_type': opts['dataType'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/load/loadFile', 'POST',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }

                /**
                 * Callback function to receive the result of the resetAllBatchIndices operation.
                 * @callback module:api/LoadApi~resetAllBatchIndicesCallback
                 * @param {String} error Error message, if any.
                 * @param data This operation does not return a value.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * resets all batch indices of all image sets
                 * resets all batch indices of all image sets
                 * @param {module:api/LoadApi~resetAllBatchIndicesCallback} callback The callback function, accepting three arguments: error, data, response
                 */
                this.resetAllBatchIndices = function (callback) {
                    var postBody = null;


                    var pathParams = {};
                    var queryParams = {};
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/load/resetAllBatchIndices', 'POST',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }

                /**
                 * Callback function to receive the result of the resetBatchIndex operation.
                 * @callback module:api/LoadApi~resetBatchIndexCallback
                 * @param {String} error Error message, if any.
                 * @param data This operation does not return a value.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * resets the batch index of the image set
                 * resets the batch index of the image set
                 * @param {Object} opts Optional parameters
                 * @param {String} opts.datasetName name for dataset on the server (default to train_data)
                 * @param {Boolean} opts.output reset output image batch index instead of input images (default to false)
                 * @param {module:api/LoadApi~resetBatchIndexCallback} callback The callback function, accepting three arguments: error, data, response
                 */
                this.resetBatchIndex = function (opts, callback) {
                    opts = opts || {};
                    var postBody = null;


                    var pathParams = {};
                    var queryParams = {
                        'dataset_name': opts['datasetName'],
                        'output': opts['output'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/load/resetBatchIndex', 'POST',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }
            };

            return exports;
        }));

    }, {"../ApiClient": 16, "../model/ImageData": 27}],
    19: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
             * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
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
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/train/controlTraining', 'POST',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                        'setSize': setSize,
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ProcessedImageData;

                    return this.apiClient.callApi(
                        '/train/getProcessedImageData', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = TrainPerformance;

                    return this.apiClient.callApi(
                        '/train/getTrainPerformance', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }
            };

            return exports;
        }));

    }, {
        "../ApiClient": 16,
        "../model/ProcessedImageData": 31,
        "../model/TrainPerformance": 33,
        "../model/TrainStatus": 34
    }],
    20: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
             * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
             * default to {@link module:ApiClient#instance} if unspecified.
             */
            var exports = function (apiClient) {
                this.apiClient = apiClient || ApiClient.instance;


                /**
                 * Callback function to receive the result of the buildGridSearchANN operation.
                 * @callback module:api/TuneApi~buildGridSearchANNCallback
                 * @param {String} error Error message, if any.
                 * @param data This operation does not return a value.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * passes all learning and ANN parameters to the server
                 * Includes learning parameters and ANN topology as lists
                 * @param {module:model/ParameterList} inputParameterLists object with all tunable parameter lists
                 * @param {module:api/TuneApi~buildGridSearchANNCallback} callback The callback function, accepting three arguments: error, data, response
                 */
                this.buildGridSearchANN = function (inputParameterLists, callback) {
                    var postBody = inputParameterLists;

                    // verify the required parameter 'inputParameterLists' is set
                    if (inputParameterLists === undefined || inputParameterLists === null) {
                        throw new Error("Missing the required parameter 'inputParameterLists' when calling buildGridSearchANN");
                    }


                    var pathParams = {};
                    var queryParams = {};
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/tune/buildGridSearchANN', 'POST',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }

                /**
                 * Callback function to receive the result of the controlTuning operation.
                 * @callback module:api/TuneApi~controlTuningCallback
                 * @param {String} error Error message, if any.
                 * @param data This operation does not return a value.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * starts, pauses and stops the tuning
                 * uses a string enum
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
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/tune/controlTuning', 'POST',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                        'setSize': setSize,
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ProcessedImageData;

                    return this.apiClient.callApi(
                        '/tune/getProcessedImageDataOfCurrentTuning', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }

                /**
                 * Callback function to receive the result of the getProcessedImageDataOfSpecificTuning operation.
                 * @callback module:api/TuneApi~getProcessedImageDataOfSpecificTuningCallback
                 * @param {String} error Error message, if any.
                 * @param {module:model/ProcessedImageData} data The data returned by the service call.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * returns a subset of the current train images and the corresponding latent representation and output
                 *
                 * @param {Number} setSize size of the image subset
                 * @param {String} modelId model id of the exspected parameter set
                 * @param {module:api/TuneApi~getProcessedImageDataOfSpecificTuningCallback} callback The callback function, accepting three arguments: error, data, response
                 * data is of type: {@link module:model/ProcessedImageData}
                 */
                this.getProcessedImageDataOfSpecificTuning = function (setSize, modelId, callback) {
                    var postBody = null;

                    // verify the required parameter 'setSize' is set
                    if (setSize === undefined || setSize === null) {
                        throw new Error("Missing the required parameter 'setSize' when calling getProcessedImageDataOfSpecificTuning");
                    }

                    // verify the required parameter 'modelId' is set
                    if (modelId === undefined || modelId === null) {
                        throw new Error("Missing the required parameter 'modelId' when calling getProcessedImageDataOfSpecificTuning");
                    }


                    var pathParams = {};
                    var queryParams = {
                        'setSize': setSize,
                        'modelId': modelId,
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ProcessedImageData;

                    return this.apiClient.callApi(
                        '/tune/getProcessedImageDataOfSpecificTuning', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = TrainPerformance;

                    return this.apiClient.callApi(
                        '/tune/getTrainPerformanceOfCurrentTuning', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }

                /**
                 * Callback function to receive the result of the getTrainPerformanceOfSpecificTuning operation.
                 * @callback module:api/TuneApi~getTrainPerformanceOfSpecificTuningCallback
                 * @param {String} error Error message, if any.
                 * @param {module:model/TrainPerformance} data The data returned by the service call.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * returns the complete set of scalar train variables to a given model
                 * as list of dicts
                 * @param {String} modelId model id of the exspected parameter set
                 * @param {module:api/TuneApi~getTrainPerformanceOfSpecificTuningCallback} callback The callback function, accepting three arguments: error, data, response
                 * data is of type: {@link module:model/TrainPerformance}
                 */
                this.getTrainPerformanceOfSpecificTuning = function (modelId, callback) {
                    var postBody = null;

                    // verify the required parameter 'modelId' is set
                    if (modelId === undefined || modelId === null) {
                        throw new Error("Missing the required parameter 'modelId' when calling getTrainPerformanceOfSpecificTuning");
                    }


                    var pathParams = {};
                    var queryParams = {
                        'modelId': modelId,
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = TrainPerformance;

                    return this.apiClient.callApi(
                        '/tune/getTrainPerformanceOfSpecificTuning', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }

                /**
                 * Callback function to receive the result of the getTuneParameter operation.
                 * @callback module:api/TuneApi~getTuneParameterCallback
                 * @param {String} error Error message, if any.
                 * @param {module:model/ParameterList} data The data returned by the service call.
                 * @param {String} response The complete HTTP response.
                 */

                /**
                 * returns the parameter set of the ANN with the given model id
                 * returns a object of type ParameterList
                 * @param {String} modelId model id of the exspected parameter set
                 * @param {module:api/TuneApi~getTuneParameterCallback} callback The callback function, accepting three arguments: error, data, response
                 * data is of type: {@link module:model/ParameterList}
                 */
                this.getTuneParameter = function (modelId, callback) {
                    var postBody = null;

                    // verify the required parameter 'modelId' is set
                    if (modelId === undefined || modelId === null) {
                        throw new Error("Missing the required parameter 'modelId' when calling getTuneParameter");
                    }


                    var pathParams = {};
                    var queryParams = {
                        'modelId': modelId,
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = ParameterList;

                    return this.apiClient.callApi(
                        '/tune/getTuneParameter', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }
            };

            return exports;
        }));

    }, {
        "../ApiClient": 16,
        "../model/ParameterList": 29,
        "../model/ProcessedImageData": 31,
        "../model/TrainPerformance": 33,
        "../model/TrainStatus": 34
    }],
    21: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
         *
         * Do not edit the class manually.
         *
         */

        (function (root, factory) {
            if (typeof define === 'function' && define.amd) {
                // AMD. Register as an anonymous module.
                define(['ApiClient', 'model/Clustering', 'model/Image', 'model/Point2D'], factory);
            } else if (typeof module === 'object' && module.exports) {
                // CommonJS-like environments that support module.exports, like Node.
                module.exports = factory(require('../ApiClient'), require('../model/Clustering'), require('../model/Image'), require('../model/Point2D'));
            } else {
                // Browser globals (root is window)
                if (!root.ConvolutionalAutoencoder) {
                    root.ConvolutionalAutoencoder = {};
                }
                root.ConvolutionalAutoencoder.VisualizeApi = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.Clustering, root.ConvolutionalAutoencoder.Image, root.ConvolutionalAutoencoder.Point2D);
            }
        }(this, function (ApiClient, Clustering, Image, Point2D) {
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
             * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
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
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = Image;

                    return this.apiClient.callApi(
                        '/visualize/generateImageFromSinglePoint', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
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
                 * returns the clustering of the latent representation of a hidden layer
                 * @param {Object} opts Optional parameters
                 * @param {String} opts.algorithm determines the clutering algorithm
                 * @param {String} opts.datasetName determines the dataset which should be clustered (default to train_data)
                 * @param {String} opts.dimensionReduction determines the algorithm for dim reduction
                 * @param {Number} opts.layer determines the hidden layer
                 * @param {module:api/VisualizeApi~getHiddenLayerLatentClusteringCallback} callback The callback function, accepting three arguments: error, data, response
                 * data is of type: {@link module:model/Clustering}
                 */
                this.getHiddenLayerLatentClustering = function (opts, callback) {
                    opts = opts || {};
                    var postBody = null;


                    var pathParams = {};
                    var queryParams = {
                        'algorithm': opts['algorithm'],
                        'dataset_name': opts['datasetName'],
                        'dimension_reduction': opts['dimensionReduction'],
                        'layer': opts['layer'],
                    };
                    var collectionQueryParams = {};
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = Clustering;

                    return this.apiClient.callApi(
                        '/visualize/getHiddenLayerLatentClustering', 'GET',
                        pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
                        authNames, contentTypes, accepts, returnType, callback
                    );
                }
            };

            return exports;
        }));

    }, {"../ApiClient": 16, "../model/Clustering": 24, "../model/Image": 26, "../model/Point2D": 30}],
    22: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
         *
         * Do not edit the class manually.
         *
         */

        (function (factory) {
            if (typeof define === 'function' && define.amd) {
                // AMD. Register as an anonymous module.
                define(['ApiClient', 'model/ClusterParameters', 'model/Clustering', 'model/CostFunction', 'model/Image', 'model/ImageData', 'model/LearningRate', 'model/ParameterList', 'model/Point2D', 'model/ProcessedImageData', 'model/RandomFunction', 'model/TrainPerformance', 'model/TrainStatus', 'api/BuildApi', 'api/LoadApi', 'api/TrainApi', 'api/TuneApi', 'api/VisualizeApi'], factory);
            } else if (typeof module === 'object' && module.exports) {
                // CommonJS-like environments that support module.exports, like Node.
                module.exports = factory(require('./ApiClient'), require('./model/ClusterParameters'), require('./model/Clustering'), require('./model/CostFunction'), require('./model/Image'), require('./model/ImageData'), require('./model/LearningRate'), require('./model/ParameterList'), require('./model/Point2D'), require('./model/ProcessedImageData'), require('./model/RandomFunction'), require('./model/TrainPerformance'), require('./model/TrainStatus'), require('./api/BuildApi'), require('./api/LoadApi'), require('./api/TrainApi'), require('./api/TuneApi'), require('./api/VisualizeApi'));
            }
        }(function (ApiClient, ClusterParameters, Clustering, CostFunction, Image, ImageData, LearningRate, ParameterList, Point2D, ProcessedImageData, RandomFunction, TrainPerformance, TrainStatus, BuildApi, LoadApi, TrainApi, TuneApi, VisualizeApi) {
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
                 * The CostFunction model constructor.
                 * @property {module:model/CostFunction}
                 */
                CostFunction: CostFunction,
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
                 * The LearningRate model constructor.
                 * @property {module:model/LearningRate}
                 */
                LearningRate: LearningRate,
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
                 * The RandomFunction model constructor.
                 * @property {module:model/RandomFunction}
                 */
                RandomFunction: RandomFunction,
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

    }, {
        "./ApiClient": 16,
        "./api/BuildApi": 17,
        "./api/LoadApi": 18,
        "./api/TrainApi": 19,
        "./api/TuneApi": 20,
        "./api/VisualizeApi": 21,
        "./model/ClusterParameters": 23,
        "./model/Clustering": 24,
        "./model/CostFunction": 25,
        "./model/Image": 26,
        "./model/ImageData": 27,
        "./model/LearningRate": 28,
        "./model/ParameterList": 29,
        "./model/Point2D": 30,
        "./model/ProcessedImageData": 31,
        "./model/RandomFunction": 32,
        "./model/TrainPerformance": 33,
        "./model/TrainStatus": 34
    }],
    23: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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


    }, {"../ApiClient": 16}],
    24: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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


    }, {"../ApiClient": 16, "./Point2D": 30}],
    25: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
                root.ConvolutionalAutoencoder.CostFunction = factory(root.ConvolutionalAutoencoder.ApiClient);
            }
        }(this, function (ApiClient) {
            'use strict';


            /**
             * The CostFunction model module.
             * @module model/CostFunction
             * @version 1.0.7
             */

            /**
             * Constructs a new <code>CostFunction</code>.
             * @alias module:model/CostFunction
             * @class
             */
            var exports = function () {
                var _this = this;


            };

            /**
             * Constructs a <code>CostFunction</code> from a plain JavaScript object, optionally creating a new instance.
             * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
             * @param {Object} data The plain JavaScript object bearing properties of interest.
             * @param {module:model/CostFunction} obj Optional instance to populate.
             * @return {module:model/CostFunction} The populated <code>CostFunction</code> instance.
             */
            exports.constructFromObject = function (data, obj) {
                if (data) {
                    obj = obj || new exports();

                    if (data.hasOwnProperty('cf_cost_function')) {
                        obj['cf_cost_function'] = ApiClient.convertToType(data['cf_cost_function'], 'String');
                    }
                    if (data.hasOwnProperty('cf_max_val')) {
                        obj['cf_max_val'] = ApiClient.convertToType(data['cf_max_val'], ['Number']);
                    }
                    if (data.hasOwnProperty('cf_filter_size')) {
                        obj['cf_filter_size'] = ApiClient.convertToType(data['cf_filter_size'], ['Number']);
                    }
                    if (data.hasOwnProperty('cf_filter_sigma')) {
                        obj['cf_filter_sigma'] = ApiClient.convertToType(data['cf_filter_sigma'], ['Number']);
                    }
                    if (data.hasOwnProperty('cf_k1')) {
                        obj['cf_k1'] = ApiClient.convertToType(data['cf_k1'], ['Number']);
                    }
                    if (data.hasOwnProperty('cf_k2')) {
                        obj['cf_k2'] = ApiClient.convertToType(data['cf_k2'], ['Number']);
                    }
                    if (data.hasOwnProperty('cf_weights')) {
                        obj['cf_weights'] = ApiClient.convertToType(data['cf_weights'], [['Number']]);
                    }
                }
                return obj;
            }

            /**
             * @member {String} cf_cost_function
             * @default 'squared_pixel_distance'
             */
            exports.prototype['cf_cost_function'] = 'squared_pixel_distance';
            /**
             * @member {Array.<Number>} cf_max_val
             */
            exports.prototype['cf_max_val'] = undefined;
            /**
             * @member {Array.<Number>} cf_filter_size
             */
            exports.prototype['cf_filter_size'] = undefined;
            /**
             * @member {Array.<Number>} cf_filter_sigma
             */
            exports.prototype['cf_filter_sigma'] = undefined;
            /**
             * @member {Array.<Number>} cf_k1
             */
            exports.prototype['cf_k1'] = undefined;
            /**
             * @member {Array.<Number>} cf_k2
             */
            exports.prototype['cf_k2'] = undefined;
            /**
             * @member {Array.<Array.<Number>>} cf_weights
             */
            exports.prototype['cf_weights'] = undefined;


            return exports;
        }));


    }, {"../ApiClient": 16}],
    26: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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


    }, {"../ApiClient": 16}],
    27: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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


    }, {"../ApiClient": 16, "./Image": 26}],
    28: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
                root.ConvolutionalAutoencoder.LearningRate = factory(root.ConvolutionalAutoencoder.ApiClient);
            }
        }(this, function (ApiClient) {
            'use strict';


            /**
             * The LearningRate model module.
             * @module model/LearningRate
             * @version 1.0.7
             */

            /**
             * Constructs a new <code>LearningRate</code>.
             * @alias module:model/LearningRate
             * @class
             */
            var exports = function () {
                var _this = this;


            };

            /**
             * Constructs a <code>LearningRate</code> from a plain JavaScript object, optionally creating a new instance.
             * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
             * @param {Object} data The plain JavaScript object bearing properties of interest.
             * @param {module:model/LearningRate} obj Optional instance to populate.
             * @return {module:model/LearningRate} The populated <code>LearningRate</code> instance.
             */
            exports.constructFromObject = function (data, obj) {
                if (data) {
                    obj = obj || new exports();

                    if (data.hasOwnProperty('learning_rate_function')) {
                        obj['learning_rate_function'] = ApiClient.convertToType(data['learning_rate_function'], 'String');
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
                }
                return obj;
            }

            /**
             * @member {String} learning_rate_function
             * @default 'static'
             */
            exports.prototype['learning_rate_function'] = 'static';
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


            return exports;
        }));


    }, {"../ApiClient": 16}],
    29: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
         *
         * Do not edit the class manually.
         *
         */

        (function (root, factory) {
            if (typeof define === 'function' && define.amd) {
                // AMD. Register as an anonymous module.
                define(['ApiClient', 'model/CostFunction', 'model/LearningRate', 'model/RandomFunction'], factory);
            } else if (typeof module === 'object' && module.exports) {
                // CommonJS-like environments that support module.exports, like Node.
                module.exports = factory(require('../ApiClient'), require('./CostFunction'), require('./LearningRate'), require('./RandomFunction'));
            } else {
                // Browser globals (root is window)
                if (!root.ConvolutionalAutoencoder) {
                    root.ConvolutionalAutoencoder = {};
                }
                root.ConvolutionalAutoencoder.ParameterList = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.CostFunction, root.ConvolutionalAutoencoder.LearningRate, root.ConvolutionalAutoencoder.RandomFunction);
            }
        }(this, function (ApiClient, CostFunction, LearningRate, RandomFunction) {
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
                    if (data.hasOwnProperty('learning_rate_dict')) {
                        obj['learning_rate_dict'] = ApiClient.convertToType(data['learning_rate_dict'], [LearningRate]);
                    }
                    if (data.hasOwnProperty('cost_function_dict')) {
                        obj['cost_function_dict'] = ApiClient.convertToType(data['cost_function_dict'], [CostFunction]);
                    }
                    if (data.hasOwnProperty('optimizer')) {
                        obj['optimizer'] = ApiClient.convertToType(data['optimizer'], ['String']);
                    }
                    if (data.hasOwnProperty('momentum')) {
                        obj['momentum'] = ApiClient.convertToType(data['momentum'], ['Number']);
                    }
                    if (data.hasOwnProperty('random_weights_dict')) {
                        obj['random_weights_dict'] = ApiClient.convertToType(data['random_weights_dict'], [RandomFunction]);
                    }
                    if (data.hasOwnProperty('random_biases_dict')) {
                        obj['random_biases_dict'] = ApiClient.convertToType(data['random_biases_dict'], [RandomFunction]);
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
             * @default true
             */
            exports.prototype['use_tensorboard'] = true;
            /**
             * @member {Boolean} verbose
             * @default true
             */
            exports.prototype['verbose'] = true;
            /**
             * @member {Array.<module:model/LearningRate>} learning_rate_dict
             */
            exports.prototype['learning_rate_dict'] = undefined;
            /**
             * @member {Array.<module:model/CostFunction>} cost_function_dict
             */
            exports.prototype['cost_function_dict'] = undefined;
            /**
             * @member {Array.<String>} optimizer
             */
            exports.prototype['optimizer'] = undefined;
            /**
             * @member {Array.<Number>} momentum
             */
            exports.prototype['momentum'] = undefined;
            /**
             * @member {Array.<module:model/RandomFunction>} random_weights_dict
             */
            exports.prototype['random_weights_dict'] = undefined;
            /**
             * @member {Array.<module:model/RandomFunction>} random_biases_dict
             */
            exports.prototype['random_biases_dict'] = undefined;
            /**
             * @member {String} session_saver_path
             * @default './save/'
             */
            exports.prototype['session_saver_path'] = './save/';
            /**
             * @member {Boolean} load_prev_session
             * @default false
             */
            exports.prototype['load_prev_session'] = false;
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


    }, {"../ApiClient": 16, "./CostFunction": 25, "./LearningRate": 28, "./RandomFunction": 32}],
    30: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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


    }, {"../ApiClient": 16}],
    31: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
                        obj['latentLayer'] = ApiClient.convertToType(data['latentLayer'], [[Image]]);
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
             * @member {Array.<Array.<module:model/Image>>} latentLayer
             */
            exports.prototype['latentLayer'] = undefined;
            /**
             * @member {Array.<module:model/Image>} outputLayer
             */
            exports.prototype['outputLayer'] = undefined;


            return exports;
        }));


    }, {"../ApiClient": 16, "./Image": 26}],
    32: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
                root.ConvolutionalAutoencoder.RandomFunction = factory(root.ConvolutionalAutoencoder.ApiClient);
            }
        }(this, function (ApiClient) {
            'use strict';


            /**
             * The RandomFunction model module.
             * @module model/RandomFunction
             * @version 1.0.7
             */

            /**
             * Constructs a new <code>RandomFunction</code>.
             * @alias module:model/RandomFunction
             * @class
             */
            var exports = function () {
                var _this = this;


            };

            /**
             * Constructs a <code>RandomFunction</code> from a plain JavaScript object, optionally creating a new instance.
             * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
             * @param {Object} data The plain JavaScript object bearing properties of interest.
             * @param {module:model/RandomFunction} obj Optional instance to populate.
             * @return {module:model/RandomFunction} The populated <code>RandomFunction</code> instance.
             */
            exports.constructFromObject = function (data, obj) {
                if (data) {
                    obj = obj || new exports();

                    if (data.hasOwnProperty('random_function')) {
                        obj['random_function'] = ApiClient.convertToType(data['random_function'], 'String');
                    }
                    if (data.hasOwnProperty('alpha')) {
                        obj['alpha'] = ApiClient.convertToType(data['alpha'], ['Number']);
                    }
                    if (data.hasOwnProperty('beta')) {
                        obj['beta'] = ApiClient.convertToType(data['beta'], ['Number']);
                    }
                    if (data.hasOwnProperty('mean')) {
                        obj['mean'] = ApiClient.convertToType(data['mean'], ['Number']);
                    }
                    if (data.hasOwnProperty('stddev')) {
                        obj['stddev'] = ApiClient.convertToType(data['stddev'], ['Number']);
                    }
                    if (data.hasOwnProperty('lam')) {
                        obj['lam'] = ApiClient.convertToType(data['lam'], ['Number']);
                    }
                    if (data.hasOwnProperty('minval')) {
                        obj['minval'] = ApiClient.convertToType(data['minval'], ['Number']);
                    }
                    if (data.hasOwnProperty('maxval')) {
                        obj['maxval'] = ApiClient.convertToType(data['maxval'], ['Number']);
                    }
                    if (data.hasOwnProperty('seed')) {
                        obj['seed'] = ApiClient.convertToType(data['seed'], ['Number']);
                    }
                }
                return obj;
            }

            /**
             * @member {String} random_function
             */
            exports.prototype['random_function'] = undefined;
            /**
             * @member {Array.<Number>} alpha
             */
            exports.prototype['alpha'] = undefined;
            /**
             * @member {Array.<Number>} beta
             */
            exports.prototype['beta'] = undefined;
            /**
             * @member {Array.<Number>} mean
             */
            exports.prototype['mean'] = undefined;
            /**
             * @member {Array.<Number>} stddev
             */
            exports.prototype['stddev'] = undefined;
            /**
             * @member {Array.<Number>} lam
             */
            exports.prototype['lam'] = undefined;
            /**
             * @member {Array.<Number>} minval
             */
            exports.prototype['minval'] = undefined;
            /**
             * @member {Array.<Number>} maxval
             */
            exports.prototype['maxval'] = undefined;
            /**
             * @member {Array.<Number>} seed
             */
            exports.prototype['seed'] = undefined;


            return exports;
        }));


    }, {"../ApiClient": 16}],
    33: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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
                    if (data.hasOwnProperty('train_status')) {
                        obj['train_status'] = ApiClient.convertToType(data['train_status'], 'String');
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
             * @member {String} train_status
             */
            exports.prototype['train_status'] = undefined;
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


    }, {"../ApiClient": 16}],
    34: [function (require, module, exports) {
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
         * Swagger Codegen version: 2.3.1
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


    }, {"../ApiClient": 16}],
    35: [function (require, module, exports) {
        /*
check if client and server are running correctly
 */
        var ConvolutionalAutoencoder = require('convolutional_autoencoder');

        var tuneApi = new ConvolutionalAutoencoder.TuneApi();
        var buildApi = new ConvolutionalAutoencoder.BuildApi();

// check API functionality
        function callback(error, data, response) {
            if (error) {
                console.error(error);
            } else {
                console.log('API called successfully.');
            }
        }


        /*
Convolutional Auto Encoder topology
 */

        /*
Global variables
 */
        var updateTimer;
        var currentTile = null;
        var previousTiles = [];

        /*
Helper functions
 */
        function convertToCamelCase(inputString) {
            String.prototype.capitalize = function () {
                return this.charAt(0).toUpperCase() + this.slice(1);
            };
            var outputString = "";
            var array = inputString.split(' ');
            for (var i = 0; i < array.length; i++) {
                outputString += array[i].capitalize();
            }
            console.log(outputString);
            return outputString;
        }

        function read3OptionList(id) {
            var selection = document.getElementById(id).options[document.getElementById(id).selectedIndex].value;
            switch (selection) {
                case "true":
                    return [true];
                case "false":
                    return [false];
                default:
                    return [true, false]
            }
        }

        function parseInputList(id, convertToNumber) {
            var inputText = document.getElementById(id).value.trim();
            if (inputText.startsWith('[')) {
                // parse as list
                return JSON.parse(inputText);
            } else if (inputText.startsWith('(')) {
                // parse as tuple:
                // code from
                // https://stackoverflow.com/questions/31232952/how-to-extract-tuples-string-into-data-structure
                var tuple = JSON.parse("[" + inputText.replace(/\(/g, "[").replace(/\)/g, "]") + "]");
                console.log(tuple);
                // iterate over range
                var range = [];
                for (var i = tuple[0][0]; i < tuple[0][1]; i += tuple[0][2]) {
                    range.push(i);
                }
                return range;
            } else {
                //parse as single entry
                if (convertToNumber) {
                    return [Number(inputText)];
                } else {
                    return [inputText]
                }
            }

        }

        function readActivationFunctions() {
            var selectedFunctions = [];
            var table = document.getElementById("activationFunctionTable");
            // iterate over all checkboxes:
            for (var i = 0; i < table.rows[2].cells.length; i++) {
                if (table.rows[2].cells[i].children[0].checked) {
                    selectedFunctions.push(table.rows[0].cells[i].textContent);
                }
            }
            console.log(selectedFunctions);
            return selectedFunctions;
        }

        function readLearningRateFunctions() {
            var selectedFunctions = [];
            var table = document.getElementById("learningRateFunctionTable");
            // iterate over all checkboxes:
            for (var i = 0; i < table.rows[2].cells.length; i++) {
                if (table.rows[2].cells[i].children[0].checked) {
                    // create new dict:
                    var learningRateDict = new ConvolutionalAutoencoder.LearningRate();
                    var functionName = table.rows[0].cells[i].textContent;

                    // add additional parameters:
                    switch (functionName) {
                        case "static":
                            learningRateDict.learning_rate_function = "static";
                            learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateStatic", true);
                            break;
                        case "exponential decay":
                            learningRateDict.learning_rate_function = "exponential_decay";
                            learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateExpDecay", true);
                            learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsExpDecay", true);
                            learningRateDict.lr_decay_rate = parseInputList("lrDecayRateExpDecay", true);
                            learningRateDict.lr_staircase = read3OptionList("lrStaircaseExpDecay");
                            break;
                        case "inverse time decay":
                            learningRateDict.learning_rate_function = "inverse_time_decay";
                            learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateInvTimeDecay", true);
                            learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsInvTimeDecay", true);
                            learningRateDict.lr_decay_rate = parseInputList("lrDecayRateInvTimeDecay", true);
                            learningRateDict.lr_staircase = read3OptionList("lrStaircaseInvTimeDecay");
                            break;
                        case "natural exp decay":
                            learningRateDict.learning_rate_function = "natural_exp_decay";
                            learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRateNatExpDecay", true);
                            learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsNatExpDecay", true);
                            learningRateDict.lr_decay_rate = parseInputList("lrDecayRateNatExpDecay", true);
                            learningRateDict.lr_staircase = read3OptionList("lrStaircaseNatExpDecay");
                            break;
                        case "piecewise constant":
                            learningRateDict.learning_rate_function = "piecewise_constant";
                            learningRateDict.lr_boundaries = parseInputList("lrBoundariesPiecewiseConstant", true);
                            learningRateDict.lr_values = parseInputList("lrValuesPiecewiseConstant", true);
                            break;
                        case "polynomial decay":
                            learningRateDict.learning_rate_function = "polynomial_decay";
                            learningRateDict.lr_initial_learning_rate = parseInputList("lrInitialLearningRatePolynomDecay", true);
                            learningRateDict.lr_decay_steps = parseInputList("lrDecayStepsPolynomDecay", true);
                            learningRateDict.lr_end_learning_rate = parseInputList("lrEndLearningRatePolynomDecay", true);
                            learningRateDict.lr_power = parseInputList("lrPowerPolynomDecay", true);
                            learningRateDict.lr_cycle = read3OptionList("lrCyclePolynomDecay");
                            break;
                    }

                    // add dict to list
                    selectedFunctions.push(learningRateDict);
                }
            }
            console.log(selectedFunctions);
            return selectedFunctions;
        }

        function readOptimizerFunctions() {
            var selectedFunctions = [];
            var table = document.getElementById("optimizerTable");
            // iterate over all checkboxes:
            for (var i = 0; i < table.rows[2].cells.length; i++) {
                if (table.rows[2].cells[i].children[0].checked) {
                    selectedFunctions.push(convertToCamelCase(table.rows[0].cells[i].textContent));
                }
            }
            console.log(selectedFunctions);
            return selectedFunctions;
        }

        function readCostFunctions() {
            var selectedFunctions = [];
            var table = document.getElementById("costFunctionTable");
            // iterate over all checkboxes:
            for (var i = 0; i < table.rows[2].cells.length; i++) {
                if (table.rows[2].cells[i].children[0].checked) {
                    // create new dict:
                    var costFunctionDict = new ConvolutionalAutoencoder.CostFunction();
                    var functionName = table.rows[0].cells[i].textContent;

                    // add additional parameters:
                    switch (functionName) {
                        case "squared pixel distance":
                            costFunctionDict.cf_cost_function = "squared_pixel_distance";
                            break;
                        case "pixel distance":
                            costFunctionDict.cf_cost_function = "pixel_distance";
                            break;
                        // to be continued...
                    }

                    // add dict to list
                    selectedFunctions.push(costFunctionDict);
                }
            }
            console.log(selectedFunctions);
            return selectedFunctions;
        }

        function readRandomFunctions(id, prefix) {
            var selectedFunctions = [];
            var table = document.getElementById(id);
            // iterate over all checkboxes:
            for (var i = 0; i < table.rows[2].cells.length; i++) {
                if (table.rows[2].cells[i].children[0].checked) {
                    // create new dict:
                    var randomFunction = new ConvolutionalAutoencoder.RandomFunction();
                    var functionName = table.rows[0].cells[i].textContent;

                    // add additional parameters:
                    randomFunction.random_function = functionName;
                    switch (functionName) {
                        case "zeros":
                            break;
                        case "gamma":
                            randomFunction.alpha = parseInputList(prefix + "GammaAlpha", true);
                            randomFunction.beta = parseInputList(prefix + "GammaBeta", true);
                            randomFunction.seed = parseInputList(prefix + "GammaSeed", true);
                            break;
                        case "normal":
                            randomFunction.mean = parseInputList(prefix + "NormalMean", true);
                            randomFunction.stddev = parseInputList(prefix + "NormalStddev", true);
                            randomFunction.seed = parseInputList(prefix + "NormalSeed", true);
                            break;
                        case "poisson":
                            randomFunction.lam = parseInputList(prefix + "PoissonLam", true);
                            randomFunction.seed = parseInputList(prefix + "PoissonSeed", true);
                            break;
                        case "uniform":
                            randomFunction.minval = parseInputList(prefix + "UniformMinval", true);
                            randomFunction.maxval = parseInputList(prefix + "UniformMaxval", true);
                            randomFunction.seed = parseInputList(prefix + "UniformSeed", true);
                            break;
                    }

                    // add dict to list
                    selectedFunctions.push(randomFunction);
                }
            }
            console.log(selectedFunctions);
            return selectedFunctions;
        }

        function finishSummaryTile(currentTile) {
            var callback = function (error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log(response);
                    console.log(data);

                    // finish old summary tile:

                    // update charts:
                    currentTile.costChart.replaceData({'cost': data.cost});
                    currentTile.learningRateChart.replaceData({'learning rate': data.currentLearningRate});

                    //mark tile as completely trained
                    currentTile.markAsFinished(!(data.train_status === "finished" || data.train_status === "running"));
                }


            };

            tuneApi.getTrainPerformanceOfSpecificTuning(currentTile.uuid, callback);
        }


        /*
Main building functions
 */

// get input (output) dimensions
        function getInputDimensions() {


            function inputShapeCallback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    //console.log('API called successfully.');
                    //console.log(response);
                    console.log(data);


                    //update input shape:
                    var inputShape = data;

                    // add placeholder for first dim:
                    inputShape[0] = -1;

                    // update topology input output layers:
                    console.log(inputShape);
                    document.getElementById("InputShape").value = JSON.stringify([inputShape], null, 1);

                }
            }

            console.log("test");
            buildApi.getInputShape([], inputShapeCallback)
        }

        function readLearningParameter() {

            var inputParameterList = new ConvolutionalAutoencoder.ParameterList();
            // read general parameters:
            inputParameterList.use_tensorboard = document.getElementById("useTensorboard").checked;
            inputParameterList.verbose = document.getElementById("verbose").checked;
            inputParameterList.session_saver_path = document.getElementById("sessionSaverPath").value;
            inputParameterList.session_save_duration = [Number(document.getElementById("sessionSaveDuration").value)];
            inputParameterList.num_test_pictures = [Number(document.getElementById("numTestPictures").value)];

            //read network topology:
            inputParameterList.input_shape = JSON.parse(document.getElementById("InputShape").value.trim());
            inputParameterList.number_of_stacks = JSON.parse(document.getElementById("NumberOfStacks").value.trim());
            inputParameterList.filter_sizes = JSON.parse(document.getElementById("FilterSizes").value.trim());


            inputParameterList.mirror_weights = read3OptionList("mirrorWeights");
            inputParameterList.batch_size = parseInputList("batchSize", true);
            inputParameterList.n_epochs = parseInputList("nEpochs", true);

            // read functions:
            inputParameterList.activation_function = readActivationFunctions();
            inputParameterList.learning_rate_dict = readLearningRateFunctions();
            inputParameterList.optimizer = readOptimizerFunctions();
            inputParameterList.momentum = parseInputList("Momentum", true);
            inputParameterList.cost_function_dict = readCostFunctions();
            inputParameterList.random_weights_dict = readRandomFunctions("randomFunctionsForWeightsTable", "rw");
            inputParameterList.random_biases_dict = readRandomFunctions("randomFunctionsForBiasesTable", "rb");

            console.log(inputParameterList);
            return inputParameterList;
        }

        function buildANN() {

            // get learning parameters (sidebar):
            var inputParameters = readLearningParameter();

            console.log(inputParameters);


            /*
        initialize API call
     */
            function callback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log(response);
                    console.log(data);
                    document.getElementById("responseLabel").textContent = response.text;
                }
            }

            console.log(tuneApi);
            tuneApi.buildGridSearchANN(inputParameters, callback);


        }


        /*
Main tuning functions
 */

        function updateTrainImages() {
            var callback = function (error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    //console.log(response);
                    //console.log(data);

                    //get image pane
                    var imageGrid = currentTile.imageGrid;

                    // remove all previous elements:
                    imageGrid.innerHTML = "";

                    // add image pairs
                    for (var i = 0; i < data.inputLayer.length; i++) {
                        // create new table row:
                        var tableRow = document.createElement("tr");


                        // create cell for input image
                        var inputCell = document.createElement("td");
                        // create new input image object
                        var newInputImage = document.createElement("img");
                        newInputImage.id = "InputImage_" + data.inputLayer[i].id;
                        newInputImage.src = "data:image/png;base64," + data.inputLayer[i].bytestring.substring(2,
                            data.inputLayer[i].bytestring.length - 1);
                        newInputImage.style.width = "160px";
                        newInputImage.class = "imageThumbnail";

                        // append new image to image grid
                        inputCell.appendChild(newInputImage);
                        tableRow.appendChild(inputCell);

                        // create new latent image object
                        var latentCell = document.createElement("td");
                        for (var j = 0; j < data.latentLayer[i].length; j++) {
                            var newLatentImage = document.createElement("img");
                            newLatentImage.id = "LatentImage_" + data.latentLayer[i][j].id + "_" + j;
                            newLatentImage.src = "data:image/png;base64," + data.latentLayer[i][j].bytestring.substring(2,
                                data.latentLayer[i][j].bytestring.length - 1);
                            newLatentImage.style.width = "40px";
                            newLatentImage.class = "imageThumbnail";
                            // append new image div to image grid
                            latentCell.appendChild(newLatentImage);
                            if ((j + 1) % 4 === 0) { //Math.ceil(Math.sqrt(data.latentLayer[i].length))
                                latentCell.appendChild(document.createElement('br'));
                            }

                        }
                        // append new image div to image grid
                        tableRow.appendChild(latentCell);


                        /*// add eventListener
                // change preview view
                newInputImage.addEventListener("click", function () {
                    console.log(this.id);
                    document.getElementById("imagePreview").src = this.src;
                });*/

                        // create cell for input image
                        var outputCell = document.createElement("td");
                        // create new output image object
                        var newOutputImage = document.createElement("img");
                        newOutputImage.id = "OutputImage_" + data.outputLayer[i].id;
                        newOutputImage.src = "data:image/png;base64," + data.outputLayer[i].bytestring.substring(2,
                            data.outputLayer[i].bytestring.length - 1);
                        newOutputImage.style.width = "160px";
                        newOutputImage.class = "imageThumbnail";

                        // append new image to image grid
                        outputCell.appendChild(newOutputImage);
                        tableRow.appendChild(outputCell);

                        imageGrid.appendChild(tableRow);

                    }


                }
            };
            tuneApi.getProcessedImageDataOfCurrentTuning(3, callback);
        }


        function updateTrainStatistics() {
            var callback = function (error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    // console.log(response);
                    console.log(data.train_status);

                    //update tiles
                    // special case: first tile:
                    if (currentTile === null) {
                        // create new tile:
                        currentTile = new SummaryTile("summaryTiles", data.model_id);
                    } else if (currentTile.uuid !== data.model_id) {
                        // finish old summary tile:
                        finishSummaryTile(currentTile);

                        // store old tile in array:
                        previousTiles.push(currentTile);

                        // create new tile:
                        currentTile = new SummaryTile("summaryTiles", data.model_id);
                    }

                    //update diagrams
                    if (data.cost.length > 0) {
                        currentTile.costChart.appendData({'cost': data.cost});
                        currentTile.learningRateChart.appendData({'learning rate': data.currentLearningRate})
                    }

                    if (data.train_status === "finished" || data.train_status === "aborted" || data.train_status === "aborting") {
                        // stop update timer
                        clearInterval(updateTimer);
                        // finish summary tile
                        finishSummaryTile(currentTile);
                    }

                }


            };

            tuneApi.getTrainPerformanceOfCurrentTuning(callback);
        }

        function updateView() {
            console.log("tick");

            // update charts:
            updateTrainStatistics();

            // update train images:
            updateTrainImages();
        }

        function startTuning() {

            function callback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log(response);
                    console.log(data);
                    document.getElementById("responseLabel").textContent = response.text;

                    // start update timer
                    updateTimer = setInterval(updateView, 5000);
                }
            }

            // hide learning parameters:
            document.getElementById("LearningParameters").open = false;
            tuneApi.controlTuning('"start"', callback);
        }

        function stopTuning() {

            function callback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log(response);
                    console.log(data);
                    document.getElementById("responseLabel").textContent = response.text;

                    // stop update timer
                    clearInterval(updateTimer);
                }
            }

            // show learning parameters:
            document.getElementById("LearningParameters").open = true;
            tuneApi.controlTuning('"stop"', callback);
        }


        /*
Event Listener
 */
        document.getElementById("buildANN").addEventListener("click", buildANN);
        document.getElementById("startGridSearch").addEventListener("click", startTuning);
        document.getElementById("stopGridSearch").addEventListener("click", stopTuning);
//

        /*
on load
 */
// get input shape
        getInputDimensions();

// show parameters
        document.getElementById("LearningParameters").open = true;


// // get input (output) dimensions
// function getInputDimensions() {
//
//
//     function inputShapeCallback(error, data, response) {
//         if (error) {
//             console.error(error);
//         } else {
//             //console.log('API called successfully.');
//             //console.log(response);
//             console.log(data);
//
//
//             //update input shape:
//             inputShape = data;
//
//             // add placeholder for first dim:
//             inputShape[0] = -1;
//
//             // update topology input output layers:
//             updateInputOutputLayer(inputShape[1], inputShape[2], inputShape[3]);
//
//         }
//     }
//
//     console.log("test");
//     buildApi.getInputShape([], inputShapeCallback)
// }
//
// function updateInputOutputLayer(resX, resY, channels) {
//     //update view:
//     document.getElementById("resXLabel").textContent = resX;
//     document.getElementById("resXLabel2").textContent = resX;
//     document.getElementById("resYLabel").textContent = resY;
//     document.getElementById("resYLabel2").textContent = resY;
//     document.getElementById("channelLabel").textContent = channels;
//     document.getElementById("channelLabel2").textContent = channels;
//
// }

//
// function addLayer(event, filtersize, numStacks) {
//     //read parameters:
//     filtersize = filtersize || 2;
//     numStacks = numStacks || 4;
//     /*
//     get current ANN topology information
//      */
//
//     // get encoder count
//     var encoderCount = document.getElementById("encoder").children.length - 1; // one child is input layer
//
//     /*
//     append Encoder layer
//     */
//     console.log("add encoder");
//
//     // generate div
//     var encoderDiv = document.createElement("div");
//     encoderDiv.id = "encoderLayer_" + (encoderCount + 1);
//     encoderDiv.className = "ANNLayer";
//
//     // generate input fields:
//     var filtersizeInput = document.createElement("input");
//     filtersizeInput.type = "number";
//     filtersizeInput.value = filtersize;
//     filtersizeInput.style.width = "30px";
//     filtersizeInput.id = "filtersizeEL" + (encoderCount + 1);
//
//     var numStacksInput = document.createElement("input");
//     numStacksInput.type = "number";
//     numStacksInput.value = numStacks;
//     numStacksInput.style.width = "30px";
//     numStacksInput.id = "numStacksEL" + (encoderCount + 1);
//
//     // generate remove button:
//     var removeButton = document.createElement("button");
//     removeButton.id = "removeEL" + (encoderCount + 1);
//     removeButton.textContent = "-";
//
//     // append elements to div:
//     encoderDiv.append("Encoder Layer " + (encoderCount + 1) + ": ");
//     encoderDiv.appendChild(document.createElement('br'));
//     encoderDiv.appendChild(document.createElement('br'));
//     encoderDiv.append("Filtersize: ");
//     encoderDiv.appendChild(filtersizeInput);
//     encoderDiv.append(" Number of Stacks: ");
//     encoderDiv.appendChild(numStacksInput);
//     encoderDiv.appendChild(removeButton);
//
//     //append to DOM
//     document.getElementById("encoder").appendChild(encoderDiv);
//
//
//     /*
//     append decoder layer
//     */
//     console.log("add decoder");
//
//     // generate div
//     var decoderDiv = document.createElement("div");
//     decoderDiv.id = "decoderLayer_" + (encoderCount + 1);
//     decoderDiv.className = "ANNLayer";
//
//     // generate labels:
//     var filtersizeLabel = document.createElement("label");
//     filtersizeLabel.textContent = filtersize;
//     filtersizeLabel.id = "filtersizeDL" + (encoderCount + 1);
//
//     var numStacksLabel = document.createElement("label");
//     numStacksLabel.textContent = numStacks;
//     numStacksLabel.id = "numStacksDL" + (encoderCount + 1);
//
//     // append elements to div:
//     decoderDiv.append("Decoder Layer " + (encoderCount + 1) + ": ");
//     decoderDiv.appendChild(document.createElement('br'));
//     decoderDiv.appendChild(document.createElement('br'));
//     decoderDiv.append("Filtersize: ");
//     decoderDiv.appendChild(filtersizeLabel);
//     decoderDiv.append(" Number of Stacks: ");
//     decoderDiv.appendChild(numStacksLabel);
//
//     //append to DOM
//     document.getElementById("decoder").insertBefore(decoderDiv, document.getElementById("decoder").firstChild);
//
//     /*
//     link input fields
//      */
//     filtersizeInput.addEventListener("change", function () {
//         filtersizeLabel.textContent = filtersizeInput.value;
//     });
//     numStacksInput.addEventListener("change", function () {
//         numStacksLabel.textContent = numStacksInput.value;
//     });
//
//     /*
//     attach remove button
//      */
//     removeButton.addEventListener("click", function () {
//         document.getElementById("encoder").removeChild(encoderDiv);
//         document.getElementById("decoder").removeChild(decoderDiv);
//         console.log("layer removed");
//     })
// }
//
// function buildANN() {
//     // get ANN topology:
//     var filterSizes = [];
//     var numStacks = [];
//     var numEncoderLayers = document.getElementById("encoder").childElementCount;
//     console.log(numEncoderLayers);
//     for (var i = 1; i < numEncoderLayers; i++) {
//         // get filtersize of current layer:
//         filterSizes.push(Number(document.getElementById("filtersizeEL" + i).value));
//         // get number of Stacks of current layer
//         numStacks.push(Number(document.getElementById("numStacksEL" + i).value));
//     }
//
//     console.log(inputShape);
//     console.log(filterSizes);
//     console.log(numStacks);
//     // get learning parameters (sidebar):
//     var inputParameters = readLearningParameter();
//
//     // save topology information
//     inputParameters.input_shape = [inputShape];
//     inputParameters.filter_sizes = [filterSizes];
//     inputParameters.number_of_stacks = [numStacks];
//
//     console.log(inputParameters);
//
//
//     /*
//         initialize API call
//      */
//
//     var buildApi = new ConvolutionalAutoencoder.BuildApi();
//
//
//     function callback(error, data, response) {
//         if (error) {
//             console.error(error);
//         } else {
//             console.log(response);
//             console.log(data);
//             document.getElementById("responseLabel").textContent = response.text;
//         }
//     }
//
//     buildApi.buildANN(inputParameters, callback);
//
//
// }
//
//
// /*
// Global variables
//  */
//
// var inputShape = [-1, -1, -1, -1];
//
//

// getInputDimensions();
//
// // add sample ANN
// addLayer(null, 3, 12);
// addLayer(null, 3, 10);
// addLayer(null, 2, 10);
// addLayer(null, 2, 6);


    }, {"convolutional_autoencoder": 22}]
}, {}, [35])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2VuY29kZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9jb21wb25lbnQtZW1pdHRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9jbGllbnQuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvaXMtZnVuY3Rpb24uanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvaXMtb2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3JlcXVlc3QtYmFzZS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9yZXNwb25zZS1iYXNlLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3Nob3VsZC1yZXRyeS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9BcGlDbGllbnQuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvYXBpL0J1aWxkQXBpLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL2FwaS9Mb2FkQXBpLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL2FwaS9UcmFpbkFwaS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9hcGkvVHVuZUFwaS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9hcGkvVmlzdWFsaXplQXBpLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL0NsdXN0ZXJpbmcuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvbW9kZWwvQ29zdEZ1bmN0aW9uLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL0ltYWdlLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL0ltYWdlRGF0YS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9tb2RlbC9MZWFybmluZ1JhdGUuanMiLCJub2RlX21vZHVsZXMvY29udm9sdXRpb25hbF9hdXRvZW5jb2Rlci9zcmMvbW9kZWwvUGFyYW1ldGVyTGlzdC5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9tb2RlbC9Qb2ludDJELmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YS5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9tb2RlbC9SYW5kb21GdW5jdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9jb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyL3NyYy9tb2RlbC9UcmFpblBlcmZvcm1hbmNlLmpzIiwibm9kZV9tb2R1bGVzL2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXIvc3JjL21vZGVsL1RyYWluU3RhdHVzLmpzIiwidHVuZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2tCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcmxCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG4vLyBTdXBwb3J0IGRlY29kaW5nIFVSTC1zYWZlIGJhc2U2NCBzdHJpbmdzLCBhcyBOb2RlLmpzIGRvZXMuXG4vLyBTZWU6IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Jhc2U2NCNVUkxfYXBwbGljYXRpb25zXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBwbGFjZUhvbGRlcnNDb3VudCAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICByZXR1cm4gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIHJldHVybiAoYjY0Lmxlbmd0aCAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0NvdW50KGI2NClcbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBwbGFjZUhvbGRlcnMgPSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG5cbiAgYXJyID0gbmV3IEFycigobGVuICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMDsgaSA8IGw7IGkgKz0gNCkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKCh1aW50OFtpXSA8PCAxNikgJiAweEZGMDAwMCkgKyAoKHVpbnQ4W2kgKyAxXSA8PCA4KSAmIDB4RkYwMCkgKyAodWludDhbaSArIDJdICYgMHhGRilcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIG91dHB1dCA9ICcnXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAyXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9PSdcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgKHVpbnQ4W2xlbiAtIDFdKVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDEwXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz0nXG4gIH1cblxuICBwYXJ0cy5wdXNoKG91dHB1dClcblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG52YXIgS19NQVhfTEVOR1RIID0gMHg3ZmZmZmZmZlxuZXhwb3J0cy5rTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHtfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH19XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDJcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIucHJvdG90eXBlLCAncGFyZW50Jywge1xuICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5idWZmZXJcbiAgfVxufSlcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdvZmZzZXQnLCB7XG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgfVxuICAgIHJldHVybiB0aGlzLmJ5dGVPZmZzZXRcbiAgfVxufSlcblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHR5cGVkIGFycmF5IGxlbmd0aCcpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0lmIGVuY29kaW5nIGlzIHNwZWNpZmllZCB0aGVuIHRoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlcicpXG4gIH1cblxuICBpZiAoaXNBcnJheUJ1ZmZlcih2YWx1ZSkgfHwgKHZhbHVlICYmIGlzQXJyYXlCdWZmZXIodmFsdWUuYnVmZmVyKSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgcmV0dXJuIGZyb21PYmplY3QodmFsdWUpXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20odmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gTm90ZTogQ2hhbmdlIHByb3RvdHlwZSAqYWZ0ZXIqIEJ1ZmZlci5mcm9tIGlzIGRlZmluZWQgdG8gd29ya2Fyb3VuZCBDaHJvbWUgYnVnOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC8xNDhcbkJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbkJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgb2YgdHlwZSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG5lZ2F0aXZlJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2Moc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlIChzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcblxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJvZmZzZXRcIiBpcyBvdXRzaWRlIG9mIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcImxlbmd0aFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKG9iaikge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iaikpIHtcbiAgICB2YXIgbGVuID0gY2hlY2tlZChvYmoubGVuZ3RoKSB8IDBcbiAgICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbilcblxuICAgIGlmIChidWYubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYnVmXG4gICAgfVxuXG4gICAgb2JqLmNvcHkoYnVmLCAwLCAwLCBsZW4pXG4gICAgcmV0dXJuIGJ1ZlxuICB9XG5cbiAgaWYgKG9iaikge1xuICAgIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKSB8fCAnbGVuZ3RoJyBpbiBvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKVxuICAgIH1cblxuICAgIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iai5kYXRhKVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiB0eXBlIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksIG9yIEFycmF5LWxpa2UgT2JqZWN0LicpXG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBLX01BWF9MRU5HVEhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIEtfTUFYX0xFTkdUSC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuIGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlciA9PT0gdHJ1ZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhidWYpKSB7XG4gICAgICBidWYgPSBCdWZmZXIuZnJvbShidWYpXG4gICAgfVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhzdHJpbmcpIHx8IGlzQXJyYXlCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoaXMgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCAoYW5kIHRoZSBgaXMtYnVmZmVyYCBucG0gcGFja2FnZSlcbi8vIHRvIGRldGVjdCBhIEJ1ZmZlciBpbnN0YW5jZS4gSXQncyBub3QgcG9zc2libGUgdG8gdXNlIGBpbnN0YW5jZW9mIEJ1ZmZlcmBcbi8vIHJlbGlhYmx5IGluIGEgYnJvd3NlcmlmeSBjb250ZXh0IGJlY2F1c2UgdGhlcmUgY291bGQgYmUgbXVsdGlwbGUgZGlmZmVyZW50XG4vLyBjb3BpZXMgb2YgdGhlICdidWZmZXInIHBhY2thZ2UgaW4gdXNlLiBUaGlzIG1ldGhvZCB3b3JrcyBldmVuIGZvciBCdWZmZXJcbi8vIGluc3RhbmNlcyB0aGF0IHdlcmUgY3JlYXRlZCBmcm9tIGFub3RoZXIgY29weSBvZiB0aGUgYGJ1ZmZlcmAgcGFja2FnZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE1NFxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0xvY2FsZVN0cmluZyA9IEJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmdcblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG4vLyBGaW5kcyBlaXRoZXIgdGhlIGZpcnN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA+PSBgYnl0ZU9mZnNldGAsXG4vLyBPUiB0aGUgbGFzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPD0gYGJ5dGVPZmZzZXRgLlxuLy9cbi8vIEFyZ3VtZW50czpcbi8vIC0gYnVmZmVyIC0gYSBCdWZmZXIgdG8gc2VhcmNoXG4vLyAtIHZhbCAtIGEgc3RyaW5nLCBCdWZmZXIsIG9yIG51bWJlclxuLy8gLSBieXRlT2Zmc2V0IC0gYW4gaW5kZXggaW50byBgYnVmZmVyYDsgd2lsbCBiZSBjbGFtcGVkIHRvIGFuIGludDMyXG4vLyAtIGVuY29kaW5nIC0gYW4gb3B0aW9uYWwgZW5jb2RpbmcsIHJlbGV2YW50IGlzIHZhbCBpcyBhIHN0cmluZ1xuLy8gLSBkaXIgLSB0cnVlIGZvciBpbmRleE9mLCBmYWxzZSBmb3IgbGFzdEluZGV4T2ZcbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mIChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICAvLyBFbXB0eSBidWZmZXIgbWVhbnMgbm8gbWF0Y2hcbiAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHJldHVybiAtMVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID0gK2J5dGVPZmZzZXQgIC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChudW1iZXJJc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gbGF0aW4xV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCA+Pj4gMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBzaG91bGQgYmUgYSBCdWZmZXInKVxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiB0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuY29weVdpdGhpbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFVzZSBidWlsdC1pbiB3aGVuIGF2YWlsYWJsZSwgbWlzc2luZyBmcm9tIElFMTFcbiAgICB0aGlzLmNvcHlXaXRoaW4odGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpXG4gIH0gZWxzZSBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKHZhciBpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmICgoZW5jb2RpbmcgPT09ICd1dGY4JyAmJiBjb2RlIDwgMTI4KSB8fFxuICAgICAgICAgIGVuY29kaW5nID09PSAnbGF0aW4xJykge1xuICAgICAgICAvLyBGYXN0IHBhdGg6IElmIGB2YWxgIGZpdHMgaW50byBhIHNpbmdsZSBieXRlLCB1c2UgdGhhdCBudW1lcmljIHZhbHVlLlxuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogbmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgdmFsdWUgXCInICsgdmFsICtcbiAgICAgICAgJ1wiIGlzIGludmFsaWQgZm9yIGFyZ3VtZW50IFwidmFsdWVcIicpXG4gICAgfVxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teKy8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgdGFrZXMgZXF1YWwgc2lnbnMgYXMgZW5kIG9mIHRoZSBCYXNlNjQgZW5jb2RpbmdcbiAgc3RyID0gc3RyLnNwbGl0KCc9JylbMF1cbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG4vLyBBcnJheUJ1ZmZlcnMgZnJvbSBhbm90aGVyIGNvbnRleHQgKGkuZS4gYW4gaWZyYW1lKSBkbyBub3QgcGFzcyB0aGUgYGluc3RhbmNlb2ZgIGNoZWNrXG4vLyBidXQgdGhleSBzaG91bGQgYmUgdHJlYXRlZCBhcyB2YWxpZC4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8XG4gICAgKG9iaiAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3RvciAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lID09PSAnQXJyYXlCdWZmZXInICYmXG4gICAgICB0eXBlb2Ygb2JqLmJ5dGVMZW5ndGggPT09ICdudW1iZXInKVxufVxuXG5mdW5jdGlvbiBudW1iZXJJc05hTiAob2JqKSB7XG4gIHJldHVybiBvYmogIT09IG9iaiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSAoZSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSAobSAqIDI1NikgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gKG5CeXRlcyAqIDgpIC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICgodmFsdWUgKiBjKSAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gSWYgb2JqLmhhc093blByb3BlcnR5IGhhcyBiZWVuIG92ZXJyaWRkZW4sIHRoZW4gY2FsbGluZ1xuLy8gb2JqLmhhc093blByb3BlcnR5KHByb3ApIHdpbGwgYnJlYWsuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMTcwN1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxcywgc2VwLCBlcSwgb3B0aW9ucykge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgdmFyIG9iaiA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcXMgIT09ICdzdHJpbmcnIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgcmVnZXhwID0gL1xcKy9nO1xuICBxcyA9IHFzLnNwbGl0KHNlcCk7XG5cbiAgdmFyIG1heEtleXMgPSAxMDAwO1xuICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5tYXhLZXlzID09PSAnbnVtYmVyJykge1xuICAgIG1heEtleXMgPSBvcHRpb25zLm1heEtleXM7XG4gIH1cblxuICB2YXIgbGVuID0gcXMubGVuZ3RoO1xuICAvLyBtYXhLZXlzIDw9IDAgbWVhbnMgdGhhdCB3ZSBzaG91bGQgbm90IGxpbWl0IGtleXMgY291bnRcbiAgaWYgKG1heEtleXMgPiAwICYmIGxlbiA+IG1heEtleXMpIHtcbiAgICBsZW4gPSBtYXhLZXlzO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIHZhciB4ID0gcXNbaV0ucmVwbGFjZShyZWdleHAsICclMjAnKSxcbiAgICAgICAgaWR4ID0geC5pbmRleE9mKGVxKSxcbiAgICAgICAga3N0ciwgdnN0ciwgaywgdjtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAga3N0ciA9IHguc3Vic3RyKDAsIGlkeCk7XG4gICAgICB2c3RyID0geC5zdWJzdHIoaWR4ICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtzdHIgPSB4O1xuICAgICAgdnN0ciA9ICcnO1xuICAgIH1cblxuICAgIGsgPSBkZWNvZGVVUklDb21wb25lbnQoa3N0cik7XG4gICAgdiA9IGRlY29kZVVSSUNvbXBvbmVudCh2c3RyKTtcblxuICAgIGlmICghaGFzT3duUHJvcGVydHkob2JqLCBrKSkge1xuICAgICAgb2JqW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgb2JqW2tdLnB1c2godik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtrXSA9IFtvYmpba10sIHZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnlQcmltaXRpdmUgPSBmdW5jdGlvbih2KSB7XG4gIHN3aXRjaCAodHlwZW9mIHYpIHtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcmV0dXJuIHY7XG5cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIHJldHVybiB2ID8gJ3RydWUnIDogJ2ZhbHNlJztcblxuICAgIGNhc2UgJ251bWJlcic6XG4gICAgICByZXR1cm4gaXNGaW5pdGUodikgPyB2IDogJyc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaiwgc2VwLCBlcSwgbmFtZSkge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIG9iaiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBtYXAob2JqZWN0S2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICB2YXIga3MgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKGspKSArIGVxO1xuICAgICAgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgICByZXR1cm4gbWFwKG9ialtrXSwgZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUodikpO1xuICAgICAgICB9KS5qb2luKHNlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9ialtrXSkpO1xuICAgICAgfVxuICAgIH0pLmpvaW4oc2VwKTtcblxuICB9XG5cbiAgaWYgKCFuYW1lKSByZXR1cm4gJyc7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG5hbWUpKSArIGVxICtcbiAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqKSk7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGYpO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSByZXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmRlY29kZSA9IGV4cG9ydHMucGFyc2UgPSByZXF1aXJlKCcuL2RlY29kZScpO1xuZXhwb3J0cy5lbmNvZGUgPSBleHBvcnRzLnN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vZW5jb2RlJyk7XG4iLCIvKipcclxuICogRXhwb3NlIGBFbWl0dGVyYC5cclxuICovXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIG1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgYSBuZXcgYEVtaXR0ZXJgLlxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XHJcbiAgICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXHJcbiAqIEByZXR1cm4ge09iamVjdH1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcclxuICAgICAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb2JqO1xyXG59XHJcblxyXG4vKipcclxuICogTGlzdGVuIG9uIHRoZSBnaXZlbiBgZXZlbnRgIHdpdGggYGZuYC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUub24gPVxyXG4gICAgRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudCwgZm4pIHtcclxuICAgICAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcbiAgICAgICAgKHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdKVxyXG4gICAgICAgICAgICAucHVzaChmbik7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYW4gYGV2ZW50YCBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgaW52b2tlZCBhIHNpbmdsZVxyXG4gKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xyXG4gICAgZnVuY3Rpb24gb24oKSB7XHJcbiAgICAgICAgdGhpcy5vZmYoZXZlbnQsIG9uKTtcclxuICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG5cclxuICAgIG9uLmZuID0gZm47XHJcbiAgICB0aGlzLm9uKGV2ZW50LCBvbik7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxyXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUub2ZmID1cclxuICAgIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cclxuICAgICAgICBFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxyXG4gICAgICAgICAgICBFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIGFsbFxyXG4gICAgICAgICAgICAgICAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNwZWNpZmljIGV2ZW50XHJcbiAgICAgICAgICAgICAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcclxuICAgICAgICAgICAgICAgIGlmICghY2FsbGJhY2tzKSByZXR1cm4gdGhpcztcclxuXHJcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXHJcbiAgICAgICAgICAgICAgICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgIHZhciBjYjtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2IgPSBjYWxsYmFja3NbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4vKipcclxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge01peGVkfSAuLi5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxyXG4gICAgICAgICwgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcclxuXHJcbiAgICBpZiAoY2FsbGJhY2tzKSB7XHJcbiAgICAgICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm4gYXJyYXkgb2YgY2FsbGJhY2tzIGZvciBgZXZlbnRgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHJldHVybiB7QXJyYXl9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcbiAgICByZXR1cm4gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgcmV0dXJuICEhdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcclxufTtcclxuIiwiLyoqXG4gKiBSb290IHJlZmVyZW5jZSBmb3IgaWZyYW1lcy5cbiAqL1xuXG52YXIgcm9vdDtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgeyAvLyBCcm93c2VyIHdpbmRvd1xuICAgIHJvb3QgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykgeyAvLyBXZWIgV29ya2VyXG4gICAgcm9vdCA9IHNlbGY7XG59IGVsc2UgeyAvLyBPdGhlciBlbnZpcm9ubWVudHNcbiAgICBjb25zb2xlLndhcm4oXCJVc2luZyBicm93c2VyLW9ubHkgdmVyc2lvbiBvZiBzdXBlcmFnZW50IGluIG5vbi1icm93c2VyIGVudmlyb25tZW50XCIpO1xuICAgIHJvb3QgPSB0aGlzO1xufVxuXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2NvbXBvbmVudC1lbWl0dGVyJyk7XG52YXIgUmVxdWVzdEJhc2UgPSByZXF1aXJlKCcuL3JlcXVlc3QtYmFzZScpO1xudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnLi9pcy1mdW5jdGlvbicpO1xudmFyIFJlc3BvbnNlQmFzZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UtYmFzZScpO1xudmFyIHNob3VsZFJldHJ5ID0gcmVxdWlyZSgnLi9zaG91bGQtcmV0cnknKTtcblxuLyoqXG4gKiBOb29wLlxuICovXG5cbmZ1bmN0aW9uIG5vb3AoKSB7XG59O1xuXG4vKipcbiAqIEV4cG9zZSBgcmVxdWVzdGAuXG4gKi9cblxudmFyIHJlcXVlc3QgPSBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobWV0aG9kLCB1cmwpIHtcbiAgICAvLyBjYWxsYmFja1xuICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiB1cmwpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCkuZW5kKHVybCk7XG4gICAgfVxuXG4gICAgLy8gdXJsIGZpcnN0XG4gICAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdCgnR0VUJywgbWV0aG9kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdChtZXRob2QsIHVybCk7XG59XG5cbmV4cG9ydHMuUmVxdWVzdCA9IFJlcXVlc3Q7XG5cbi8qKlxuICogRGV0ZXJtaW5lIFhIUi5cbiAqL1xuXG5yZXF1ZXN0LmdldFhIUiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAocm9vdC5YTUxIdHRwUmVxdWVzdFxuICAgICAgICAmJiAoIXJvb3QubG9jYXRpb24gfHwgJ2ZpbGU6JyAhPSByb290LmxvY2F0aW9uLnByb3RvY29sXG4gICAgICAgICAgICB8fCAhcm9vdC5BY3RpdmVYT2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gbmV3IFhNTEh0dHBSZXF1ZXN0O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01pY3Jvc29mdC5YTUxIVFRQJyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUC42LjAnKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjMuMCcpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAnKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB9XG4gICAgfVxuICAgIHRocm93IEVycm9yKFwiQnJvd3Nlci1vbmx5IHZlcmlzb24gb2Ygc3VwZXJhZ2VudCBjb3VsZCBub3QgZmluZCBYSFJcIik7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZSwgYWRkZWQgdG8gc3VwcG9ydCBJRS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxudmFyIHRyaW0gPSAnJy50cmltXG4gICAgPyBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gcy50cmltKCk7XG4gICAgfVxuICAgIDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZSgvKF5cXHMqfFxccyokKS9nLCAnJyk7XG4gICAgfTtcblxuLyoqXG4gKiBTZXJpYWxpemUgdGhlIGdpdmVuIGBvYmpgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZShvYmopIHtcbiAgICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgdmFyIHBhaXJzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCBvYmpba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiBwYWlycy5qb2luKCcmJyk7XG59XG5cbi8qKlxuICogSGVscHMgJ3NlcmlhbGl6ZScgd2l0aCBzZXJpYWxpemluZyBhcnJheXMuXG4gKiBNdXRhdGVzIHRoZSBwYWlycyBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBwYWlyc1xuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKi9cblxuZnVuY3Rpb24gcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgdmFsKSB7XG4gICAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgdik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdCh2YWwpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBzdWJrZXkgaW4gdmFsKSB7XG4gICAgICAgICAgICAgICAgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSArICdbJyArIHN1YmtleSArICddJywgdmFsW3N1YmtleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KVxuICAgICAgICAgICAgICAgICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbCkpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICAgICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEV4cG9zZSBzZXJpYWxpemF0aW9uIG1ldGhvZC5cbiAqL1xuXG5yZXF1ZXN0LnNlcmlhbGl6ZU9iamVjdCA9IHNlcmlhbGl6ZTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4geC13d3ctZm9ybS11cmxlbmNvZGVkIGBzdHJgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlU3RyaW5nKHN0cikge1xuICAgIHZhciBvYmogPSB7fTtcbiAgICB2YXIgcGFpcnMgPSBzdHIuc3BsaXQoJyYnKTtcbiAgICB2YXIgcGFpcjtcbiAgICB2YXIgcG9zO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhaXJzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIHBhaXIgPSBwYWlyc1tpXTtcbiAgICAgICAgcG9zID0gcGFpci5pbmRleE9mKCc9Jyk7XG4gICAgICAgIGlmIChwb3MgPT0gLTEpIHtcbiAgICAgICAgICAgIG9ialtkZWNvZGVVUklDb21wb25lbnQocGFpcildID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvYmpbZGVjb2RlVVJJQ29tcG9uZW50KHBhaXIuc2xpY2UoMCwgcG9zKSldID1cbiAgICAgICAgICAgICAgICBkZWNvZGVVUklDb21wb25lbnQocGFpci5zbGljZShwb3MgKyAxKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEV4cG9zZSBwYXJzZXIuXG4gKi9cblxucmVxdWVzdC5wYXJzZVN0cmluZyA9IHBhcnNlU3RyaW5nO1xuXG4vKipcbiAqIERlZmF1bHQgTUlNRSB0eXBlIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC50eXBlcy54bWwgPSAnYXBwbGljYXRpb24veG1sJztcbiAqXG4gKi9cblxucmVxdWVzdC50eXBlcyA9IHtcbiAgICBodG1sOiAndGV4dC9odG1sJyxcbiAgICBqc29uOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgeG1sOiAnYXBwbGljYXRpb24veG1sJyxcbiAgICB1cmxlbmNvZGVkOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyxcbiAgICAnZm9ybSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAgICdmb3JtLWRhdGEnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IHNlcmlhbGl6YXRpb24gbWFwLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihvYmope1xuICogICAgICAgcmV0dXJuICdnZW5lcmF0ZWQgeG1sIGhlcmUnO1xuICogICAgIH07XG4gKlxuICovXG5cbnJlcXVlc3Quc2VyaWFsaXplID0ge1xuICAgICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBzZXJpYWxpemUsXG4gICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeVxufTtcblxuLyoqXG4gKiBEZWZhdWx0IHBhcnNlcnMuXG4gKlxuICogICAgIHN1cGVyYWdlbnQucGFyc2VbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24oc3RyKXtcbiAgKiAgICAgICByZXR1cm4geyBvYmplY3QgcGFyc2VkIGZyb20gc3RyIH07XG4gICogICAgIH07XG4gKlxuICovXG5cbnJlcXVlc3QucGFyc2UgPSB7XG4gICAgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc6IHBhcnNlU3RyaW5nLFxuICAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5wYXJzZVxufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gaGVhZGVyIGBzdHJgIGludG9cbiAqIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtYXBwZWQgZmllbGRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlSGVhZGVyKHN0cikge1xuICAgIHZhciBsaW5lcyA9IHN0ci5zcGxpdCgvXFxyP1xcbi8pO1xuICAgIHZhciBmaWVsZHMgPSB7fTtcbiAgICB2YXIgaW5kZXg7XG4gICAgdmFyIGxpbmU7XG4gICAgdmFyIGZpZWxkO1xuICAgIHZhciB2YWw7XG5cbiAgICBsaW5lcy5wb3AoKTsgLy8gdHJhaWxpbmcgQ1JMRlxuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGxpbmVzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICAgICAgaW5kZXggPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICAgICAgZmllbGQgPSBsaW5lLnNsaWNlKDAsIGluZGV4KS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB2YWwgPSB0cmltKGxpbmUuc2xpY2UoaW5kZXggKyAxKSk7XG4gICAgICAgIGZpZWxkc1tmaWVsZF0gPSB2YWw7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpZWxkcztcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBgbWltZWAgaXMganNvbiBvciBoYXMgK2pzb24gc3RydWN0dXJlZCBzeW50YXggc3VmZml4LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtaW1lXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gaXNKU09OKG1pbWUpIHtcbiAgICByZXR1cm4gL1tcXC8rXWpzb25cXGIvLnRlc3QobWltZSk7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVzcG9uc2VgIHdpdGggdGhlIGdpdmVuIGB4aHJgLlxuICpcbiAqICAtIHNldCBmbGFncyAoLm9rLCAuZXJyb3IsIGV0YylcbiAqICAtIHBhcnNlIGhlYWRlclxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICBBbGlhc2luZyBgc3VwZXJhZ2VudGAgYXMgYHJlcXVlc3RgIGlzIG5pY2U6XG4gKlxuICogICAgICByZXF1ZXN0ID0gc3VwZXJhZ2VudDtcbiAqXG4gKiAgV2UgY2FuIHVzZSB0aGUgcHJvbWlzZS1saWtlIEFQSSwgb3IgcGFzcyBjYWxsYmFja3M6XG4gKlxuICogICAgICByZXF1ZXN0LmdldCgnLycpLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICogICAgICByZXF1ZXN0LmdldCgnLycsIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIFNlbmRpbmcgZGF0YSBjYW4gYmUgY2hhaW5lZDpcbiAqXG4gKiAgICAgIHJlcXVlc3RcbiAqICAgICAgICAucG9zdCgnL3VzZXInKVxuICogICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgIC5lbmQoZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgT3IgcGFzc2VkIHRvIGAuc2VuZCgpYDpcbiAqXG4gKiAgICAgIHJlcXVlc3RcbiAqICAgICAgICAucG9zdCgnL3VzZXInKVxuICogICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9LCBmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5wb3N0KClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicsIHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgIC5lbmQoZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiBPciBmdXJ0aGVyIHJlZHVjZWQgdG8gYSBzaW5nbGUgY2FsbCBmb3Igc2ltcGxlIGNhc2VzOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicsIHsgbmFtZTogJ3RqJyB9LCBmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIEBwYXJhbSB7WE1MSFRUUFJlcXVlc3R9IHhoclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFJlc3BvbnNlKHJlcSkge1xuICAgIHRoaXMucmVxID0gcmVxO1xuICAgIHRoaXMueGhyID0gdGhpcy5yZXEueGhyO1xuICAgIC8vIHJlc3BvbnNlVGV4dCBpcyBhY2Nlc3NpYmxlIG9ubHkgaWYgcmVzcG9uc2VUeXBlIGlzICcnIG9yICd0ZXh0JyBhbmQgb24gb2xkZXIgYnJvd3NlcnNcbiAgICB0aGlzLnRleHQgPSAoKHRoaXMucmVxLm1ldGhvZCAhPSAnSEVBRCcgJiYgKHRoaXMueGhyLnJlc3BvbnNlVHlwZSA9PT0gJycgfHwgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndGV4dCcpKSB8fCB0eXBlb2YgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndW5kZWZpbmVkJylcbiAgICAgICAgPyB0aGlzLnhoci5yZXNwb25zZVRleHRcbiAgICAgICAgOiBudWxsO1xuICAgIHRoaXMuc3RhdHVzVGV4dCA9IHRoaXMucmVxLnhoci5zdGF0dXNUZXh0O1xuICAgIHZhciBzdGF0dXMgPSB0aGlzLnhoci5zdGF0dXM7XG4gICAgLy8gaGFuZGxlIElFOSBidWc6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTAwNDY5NzIvbXNpZS1yZXR1cm5zLXN0YXR1cy1jb2RlLW9mLTEyMjMtZm9yLWFqYXgtcmVxdWVzdFxuICAgIGlmIChzdGF0dXMgPT09IDEyMjMpIHtcbiAgICAgICAgc3RhdHVzID0gMjA0O1xuICAgIH1cbiAgICB0aGlzLl9zZXRTdGF0dXNQcm9wZXJ0aWVzKHN0YXR1cyk7XG4gICAgdGhpcy5oZWFkZXIgPSB0aGlzLmhlYWRlcnMgPSBwYXJzZUhlYWRlcih0aGlzLnhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSk7XG4gICAgLy8gZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIHNvbWV0aW1lcyBmYWxzZWx5IHJldHVybnMgXCJcIiBmb3IgQ09SUyByZXF1ZXN0cywgYnV0XG4gICAgLy8gZ2V0UmVzcG9uc2VIZWFkZXIgc3RpbGwgd29ya3MuIHNvIHdlIGdldCBjb250ZW50LXR5cGUgZXZlbiBpZiBnZXR0aW5nXG4gICAgLy8gb3RoZXIgaGVhZGVycyBmYWlscy5cbiAgICB0aGlzLmhlYWRlclsnY29udGVudC10eXBlJ10gPSB0aGlzLnhoci5nZXRSZXNwb25zZUhlYWRlcignY29udGVudC10eXBlJyk7XG4gICAgdGhpcy5fc2V0SGVhZGVyUHJvcGVydGllcyh0aGlzLmhlYWRlcik7XG5cbiAgICBpZiAobnVsbCA9PT0gdGhpcy50ZXh0ICYmIHJlcS5fcmVzcG9uc2VUeXBlKSB7XG4gICAgICAgIHRoaXMuYm9keSA9IHRoaXMueGhyLnJlc3BvbnNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYm9keSA9IHRoaXMucmVxLm1ldGhvZCAhPSAnSEVBRCdcbiAgICAgICAgICAgID8gdGhpcy5fcGFyc2VCb2R5KHRoaXMudGV4dCA/IHRoaXMudGV4dCA6IHRoaXMueGhyLnJlc3BvbnNlKVxuICAgICAgICAgICAgOiBudWxsO1xuICAgIH1cbn1cblxuUmVzcG9uc2VCYXNlKFJlc3BvbnNlLnByb3RvdHlwZSk7XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGJvZHkgYHN0cmAuXG4gKlxuICogVXNlZCBmb3IgYXV0by1wYXJzaW5nIG9mIGJvZGllcy4gUGFyc2Vyc1xuICogYXJlIGRlZmluZWQgb24gdGhlIGBzdXBlcmFnZW50LnBhcnNlYCBvYmplY3QuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7TWl4ZWR9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZS5wcm90b3R5cGUuX3BhcnNlQm9keSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICB2YXIgcGFyc2UgPSByZXF1ZXN0LnBhcnNlW3RoaXMudHlwZV07XG4gICAgaWYgKHRoaXMucmVxLl9wYXJzZXIpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVxLl9wYXJzZXIodGhpcywgc3RyKTtcbiAgICB9XG4gICAgaWYgKCFwYXJzZSAmJiBpc0pTT04odGhpcy50eXBlKSkge1xuICAgICAgICBwYXJzZSA9IHJlcXVlc3QucGFyc2VbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcnNlICYmIHN0ciAmJiAoc3RyLmxlbmd0aCB8fCBzdHIgaW5zdGFuY2VvZiBPYmplY3QpXG4gICAgICAgID8gcGFyc2Uoc3RyKVxuICAgICAgICA6IG51bGw7XG59O1xuXG4vKipcbiAqIFJldHVybiBhbiBgRXJyb3JgIHJlcHJlc2VudGF0aXZlIG9mIHRoaXMgcmVzcG9uc2UuXG4gKlxuICogQHJldHVybiB7RXJyb3J9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS50b0Vycm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXEgPSB0aGlzLnJlcTtcbiAgICB2YXIgbWV0aG9kID0gcmVxLm1ldGhvZDtcbiAgICB2YXIgdXJsID0gcmVxLnVybDtcblxuICAgIHZhciBtc2cgPSAnY2Fubm90ICcgKyBtZXRob2QgKyAnICcgKyB1cmwgKyAnICgnICsgdGhpcy5zdGF0dXMgKyAnKSc7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcihtc2cpO1xuICAgIGVyci5zdGF0dXMgPSB0aGlzLnN0YXR1cztcbiAgICBlcnIubWV0aG9kID0gbWV0aG9kO1xuICAgIGVyci51cmwgPSB1cmw7XG5cbiAgICByZXR1cm4gZXJyO1xufTtcblxuLyoqXG4gKiBFeHBvc2UgYFJlc3BvbnNlYC5cbiAqL1xuXG5yZXF1ZXN0LlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdGAgd2l0aCB0aGUgZ2l2ZW4gYG1ldGhvZGAgYW5kIGB1cmxgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVxdWVzdChtZXRob2QsIHVybCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9xdWVyeSA9IHRoaXMuX3F1ZXJ5IHx8IFtdO1xuICAgIHRoaXMubWV0aG9kID0gbWV0aG9kO1xuICAgIHRoaXMudXJsID0gdXJsO1xuICAgIHRoaXMuaGVhZGVyID0ge307IC8vIHByZXNlcnZlcyBoZWFkZXIgbmFtZSBjYXNlXG4gICAgdGhpcy5faGVhZGVyID0ge307IC8vIGNvZXJjZXMgaGVhZGVyIG5hbWVzIHRvIGxvd2VyY2FzZVxuICAgIHRoaXMub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVyciA9IG51bGw7XG4gICAgICAgIHZhciByZXMgPSBudWxsO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXMgPSBuZXcgUmVzcG9uc2Uoc2VsZik7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGVyciA9IG5ldyBFcnJvcignUGFyc2VyIGlzIHVuYWJsZSB0byBwYXJzZSB0aGUgcmVzcG9uc2UnKTtcbiAgICAgICAgICAgIGVyci5wYXJzZSA9IHRydWU7XG4gICAgICAgICAgICBlcnIub3JpZ2luYWwgPSBlO1xuICAgICAgICAgICAgLy8gaXNzdWUgIzY3NTogcmV0dXJuIHRoZSByYXcgcmVzcG9uc2UgaWYgdGhlIHJlc3BvbnNlIHBhcnNpbmcgZmFpbHNcbiAgICAgICAgICAgIGlmIChzZWxmLnhocikge1xuICAgICAgICAgICAgICAgIC8vIGllOSBkb2Vzbid0IGhhdmUgJ3Jlc3BvbnNlJyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgIGVyci5yYXdSZXNwb25zZSA9IHR5cGVvZiBzZWxmLnhoci5yZXNwb25zZVR5cGUgPT0gJ3VuZGVmaW5lZCcgPyBzZWxmLnhoci5yZXNwb25zZVRleHQgOiBzZWxmLnhoci5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICAvLyBpc3N1ZSAjODc2OiByZXR1cm4gdGhlIGh0dHAgc3RhdHVzIGNvZGUgaWYgdGhlIHJlc3BvbnNlIHBhcnNpbmcgZmFpbHNcbiAgICAgICAgICAgICAgICBlcnIuc3RhdHVzID0gc2VsZi54aHIuc3RhdHVzID8gc2VsZi54aHIuc3RhdHVzIDogbnVsbDtcbiAgICAgICAgICAgICAgICBlcnIuc3RhdHVzQ29kZSA9IGVyci5zdGF0dXM7IC8vIGJhY2t3YXJkcy1jb21wYXQgb25seVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnIucmF3UmVzcG9uc2UgPSBudWxsO1xuICAgICAgICAgICAgICAgIGVyci5zdGF0dXMgPSBudWxsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5jYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG5cbiAgICAgICAgdmFyIG5ld19lcnI7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIXNlbGYuX2lzUmVzcG9uc2VPSyhyZXMpKSB7XG4gICAgICAgICAgICAgICAgbmV3X2VyciA9IG5ldyBFcnJvcihyZXMuc3RhdHVzVGV4dCB8fCAnVW5zdWNjZXNzZnVsIEhUVFAgcmVzcG9uc2UnKTtcbiAgICAgICAgICAgICAgICBuZXdfZXJyLm9yaWdpbmFsID0gZXJyO1xuICAgICAgICAgICAgICAgIG5ld19lcnIucmVzcG9uc2UgPSByZXM7XG4gICAgICAgICAgICAgICAgbmV3X2Vyci5zdGF0dXMgPSByZXMuc3RhdHVzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBuZXdfZXJyID0gZTsgLy8gIzk4NSB0b3VjaGluZyByZXMgbWF5IGNhdXNlIElOVkFMSURfU1RBVEVfRVJSIG9uIG9sZCBBbmRyb2lkXG4gICAgICAgIH1cblxuICAgICAgICAvLyAjMTAwMCBkb24ndCBjYXRjaCBlcnJvcnMgZnJvbSB0aGUgY2FsbGJhY2sgdG8gYXZvaWQgZG91YmxlIGNhbGxpbmcgaXRcbiAgICAgICAgaWYgKG5ld19lcnIpIHtcbiAgICAgICAgICAgIHNlbGYuY2FsbGJhY2sobmV3X2VyciwgcmVzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbGYuY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG4vKipcbiAqIE1peGluIGBFbWl0dGVyYCBhbmQgYFJlcXVlc3RCYXNlYC5cbiAqL1xuXG5FbWl0dGVyKFJlcXVlc3QucHJvdG90eXBlKTtcblJlcXVlc3RCYXNlKFJlcXVlc3QucHJvdG90eXBlKTtcblxuLyoqXG4gKiBTZXQgQ29udGVudC1UeXBlIHRvIGB0eXBlYCwgbWFwcGluZyB2YWx1ZXMgZnJvbSBgcmVxdWVzdC50eXBlc2AuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICBzdXBlcmFnZW50LnR5cGVzLnhtbCA9ICdhcHBsaWNhdGlvbi94bWwnO1xuICpcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvJylcbiAqICAgICAgICAudHlwZSgneG1sJylcbiAqICAgICAgICAuc2VuZCh4bWxzdHJpbmcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCdhcHBsaWNhdGlvbi94bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnR5cGUgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHRoaXMuc2V0KCdDb250ZW50LVR5cGUnLCByZXF1ZXN0LnR5cGVzW3R5cGVdIHx8IHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgQWNjZXB0IHRvIGB0eXBlYCwgbWFwcGluZyB2YWx1ZXMgZnJvbSBgcmVxdWVzdC50eXBlc2AuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICBzdXBlcmFnZW50LnR5cGVzLmpzb24gPSAnYXBwbGljYXRpb24vanNvbic7XG4gKlxuICogICAgICByZXF1ZXN0LmdldCgnL2FnZW50JylcbiAqICAgICAgICAuYWNjZXB0KCdqc29uJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBhY2NlcHRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hY2NlcHQgPSBmdW5jdGlvbiAodHlwZSkge1xuICAgIHRoaXMuc2V0KCdBY2NlcHQnLCByZXF1ZXN0LnR5cGVzW3R5cGVdIHx8IHR5cGUpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgQXV0aG9yaXphdGlvbiBmaWVsZCB2YWx1ZSB3aXRoIGB1c2VyYCBhbmQgYHBhc3NgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3Bhc3NdIG9wdGlvbmFsIGluIGNhc2Ugb2YgdXNpbmcgJ2JlYXJlcicgYXMgdHlwZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgd2l0aCAndHlwZScgcHJvcGVydHkgJ2F1dG8nLCAnYmFzaWMnIG9yICdiZWFyZXInIChkZWZhdWx0ICdiYXNpYycpXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYXV0aCA9IGZ1bmN0aW9uICh1c2VyLCBwYXNzLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBwYXNzID09PSAnb2JqZWN0JyAmJiBwYXNzICE9PSBudWxsKSB7IC8vIHBhc3MgaXMgb3B0aW9uYWwgYW5kIGNhbiBzdWJzdGl0dXRlIGZvciBvcHRpb25zXG4gICAgICAgIG9wdGlvbnMgPSBwYXNzO1xuICAgIH1cbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgIHR5cGU6ICdmdW5jdGlvbicgPT09IHR5cGVvZiBidG9hID8gJ2Jhc2ljJyA6ICdhdXRvJyxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN3aXRjaCAob3B0aW9ucy50eXBlKSB7XG4gICAgICAgIGNhc2UgJ2Jhc2ljJzpcbiAgICAgICAgICAgIHRoaXMuc2V0KCdBdXRob3JpemF0aW9uJywgJ0Jhc2ljICcgKyBidG9hKHVzZXIgKyAnOicgKyBwYXNzKSk7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdhdXRvJzpcbiAgICAgICAgICAgIHRoaXMudXNlcm5hbWUgPSB1c2VyO1xuICAgICAgICAgICAgdGhpcy5wYXNzd29yZCA9IHBhc3M7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdiZWFyZXInOiAvLyB1c2FnZSB3b3VsZCBiZSAuYXV0aChhY2Nlc3NUb2tlbiwgeyB0eXBlOiAnYmVhcmVyJyB9KVxuICAgICAgICAgICAgdGhpcy5zZXQoJ0F1dGhvcml6YXRpb24nLCAnQmVhcmVyICcgKyB1c2VyKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIHF1ZXJ5LXN0cmluZyBgdmFsYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgIHJlcXVlc3QuZ2V0KCcvc2hvZXMnKVxuICogICAgIC5xdWVyeSgnc2l6ZT0xMCcpXG4gKiAgICAgLnF1ZXJ5KHsgY29sb3I6ICdibHVlJyB9KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAodmFsKSB7XG4gICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2YWwpIHZhbCA9IHNlcmlhbGl6ZSh2YWwpO1xuICAgIGlmICh2YWwpIHRoaXMuX3F1ZXJ5LnB1c2godmFsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUXVldWUgdGhlIGdpdmVuIGBmaWxlYCBhcyBhbiBhdHRhY2htZW50IHRvIHRoZSBzcGVjaWZpZWQgYGZpZWxkYCxcbiAqIHdpdGggb3B0aW9uYWwgYG9wdGlvbnNgIChvciBmaWxlbmFtZSkuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuYXR0YWNoKCdjb250ZW50JywgbmV3IEJsb2IoWyc8YSBpZD1cImFcIj48YiBpZD1cImJcIj5oZXkhPC9iPjwvYT4nXSwgeyB0eXBlOiBcInRleHQvaHRtbFwifSkpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcGFyYW0ge0Jsb2J8RmlsZX0gZmlsZVxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24gKGZpZWxkLCBmaWxlLCBvcHRpb25zKSB7XG4gICAgaWYgKGZpbGUpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwic3VwZXJhZ2VudCBjYW4ndCBtaXggLnNlbmQoKSBhbmQgLmF0dGFjaCgpXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQoZmllbGQsIGZpbGUsIG9wdGlvbnMgfHwgZmlsZS5uYW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fZ2V0Rm9ybURhdGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9mb3JtRGF0YSkge1xuICAgICAgICB0aGlzLl9mb3JtRGF0YSA9IG5ldyByb290LkZvcm1EYXRhKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9mb3JtRGF0YTtcbn07XG5cbi8qKlxuICogSW52b2tlIHRoZSBjYWxsYmFjayB3aXRoIGBlcnJgIGFuZCBgcmVzYFxuICogYW5kIGhhbmRsZSBhcml0eSBjaGVjay5cbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IHJlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY2FsbGJhY2sgPSBmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLl9yZXRyaWVzLCB0aGlzLl9tYXhSZXRyaWVzKVxuICAgIGlmICh0aGlzLl9tYXhSZXRyaWVzICYmIHRoaXMuX3JldHJpZXMrKyA8IHRoaXMuX21heFJldHJpZXMgJiYgc2hvdWxkUmV0cnkoZXJyLCByZXMpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yZXRyeSgpO1xuICAgIH1cblxuICAgIHZhciBmbiA9IHRoaXMuX2NhbGxiYWNrO1xuICAgIHRoaXMuY2xlYXJUaW1lb3V0KCk7XG5cbiAgICBpZiAoZXJyKSB7XG4gICAgICAgIGlmICh0aGlzLl9tYXhSZXRyaWVzKSBlcnIucmV0cmllcyA9IHRoaXMuX3JldHJpZXMgLSAxO1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICB9XG5cbiAgICBmbihlcnIsIHJlcyk7XG59O1xuXG4vKipcbiAqIEludm9rZSBjYWxsYmFjayB3aXRoIHgtZG9tYWluIGVycm9yLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmNyb3NzRG9tYWluRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcignUmVxdWVzdCBoYXMgYmVlbiB0ZXJtaW5hdGVkXFxuUG9zc2libGUgY2F1c2VzOiB0aGUgbmV0d29yayBpcyBvZmZsaW5lLCBPcmlnaW4gaXMgbm90IGFsbG93ZWQgYnkgQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luLCB0aGUgcGFnZSBpcyBiZWluZyB1bmxvYWRlZCwgZXRjLicpO1xuICAgIGVyci5jcm9zc0RvbWFpbiA9IHRydWU7XG5cbiAgICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gICAgZXJyLm1ldGhvZCA9IHRoaXMubWV0aG9kO1xuICAgIGVyci51cmwgPSB0aGlzLnVybDtcblxuICAgIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cbi8vIFRoaXMgb25seSB3YXJucywgYmVjYXVzZSB0aGUgcmVxdWVzdCBpcyBzdGlsbCBsaWtlbHkgdG8gd29ya1xuUmVxdWVzdC5wcm90b3R5cGUuYnVmZmVyID0gUmVxdWVzdC5wcm90b3R5cGUuY2EgPSBSZXF1ZXN0LnByb3RvdHlwZS5hZ2VudCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLndhcm4oXCJUaGlzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gYnJvd3NlciB2ZXJzaW9uIG9mIHN1cGVyYWdlbnRcIik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBUaGlzIHRocm93cywgYmVjYXVzZSBpdCBjYW4ndCBzZW5kL3JlY2VpdmUgZGF0YSBhcyBleHBlY3RlZFxuUmVxdWVzdC5wcm90b3R5cGUucGlwZSA9IFJlcXVlc3QucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRocm93IEVycm9yKFwiU3RyZWFtaW5nIGlzIG5vdCBzdXBwb3J0ZWQgaW4gYnJvd3NlciB2ZXJzaW9uIG9mIHN1cGVyYWdlbnRcIik7XG59O1xuXG4vKipcbiAqIENvbXBvc2UgcXVlcnlzdHJpbmcgdG8gYXBwZW5kIHRvIHJlcS51cmxcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fYXBwZW5kUXVlcnlTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHF1ZXJ5ID0gdGhpcy5fcXVlcnkuam9pbignJicpO1xuICAgIGlmIChxdWVyeSkge1xuICAgICAgICB0aGlzLnVybCArPSAodGhpcy51cmwuaW5kZXhPZignPycpID49IDAgPyAnJicgOiAnPycpICsgcXVlcnk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3NvcnQpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy51cmwuaW5kZXhPZignPycpO1xuICAgICAgICBpZiAoaW5kZXggPj0gMCkge1xuICAgICAgICAgICAgdmFyIHF1ZXJ5QXJyID0gdGhpcy51cmwuc3Vic3RyaW5nKGluZGV4ICsgMSkuc3BsaXQoJyYnKTtcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKHRoaXMuX3NvcnQpKSB7XG4gICAgICAgICAgICAgICAgcXVlcnlBcnIuc29ydCh0aGlzLl9zb3J0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcXVlcnlBcnIuc29ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy51cmwgPSB0aGlzLnVybC5zdWJzdHJpbmcoMCwgaW5kZXgpICsgJz8nICsgcXVlcnlBcnIuam9pbignJicpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBDaGVjayBpZiBgb2JqYCBpcyBhIGhvc3Qgb2JqZWN0LFxuICogd2UgZG9uJ3Qgd2FudCB0byBzZXJpYWxpemUgdGhlc2UgOilcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblJlcXVlc3QucHJvdG90eXBlLl9pc0hvc3QgPSBmdW5jdGlvbiBfaXNIb3N0KG9iaikge1xuICAgIC8vIE5hdGl2ZSBvYmplY3RzIHN0cmluZ2lmeSB0byBbb2JqZWN0IEZpbGVdLCBbb2JqZWN0IEJsb2JdLCBbb2JqZWN0IEZvcm1EYXRhXSwgZXRjLlxuICAgIHJldHVybiBvYmogJiYgJ29iamVjdCcgPT09IHR5cGVvZiBvYmogJiYgIUFycmF5LmlzQXJyYXkob2JqKSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XSc7XG59XG5cbi8qKlxuICogSW5pdGlhdGUgcmVxdWVzdCwgaW52b2tpbmcgY2FsbGJhY2sgYGZuKHJlcylgXG4gKiB3aXRoIGFuIGluc3RhbmNlb2YgYFJlc3BvbnNlYC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChmbikge1xuICAgIGlmICh0aGlzLl9lbmRDYWxsZWQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiV2FybmluZzogLmVuZCgpIHdhcyBjYWxsZWQgdHdpY2UuIFRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBzdXBlcmFnZW50XCIpO1xuICAgIH1cbiAgICB0aGlzLl9lbmRDYWxsZWQgPSB0cnVlO1xuXG4gICAgLy8gc3RvcmUgY2FsbGJhY2tcbiAgICB0aGlzLl9jYWxsYmFjayA9IGZuIHx8IG5vb3A7XG5cbiAgICAvLyBxdWVyeXN0cmluZ1xuICAgIHRoaXMuX2FwcGVuZFF1ZXJ5U3RyaW5nKCk7XG5cbiAgICByZXR1cm4gdGhpcy5fZW5kKCk7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fZW5kID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgeGhyID0gdGhpcy54aHIgPSByZXF1ZXN0LmdldFhIUigpO1xuICAgIHZhciBkYXRhID0gdGhpcy5fZm9ybURhdGEgfHwgdGhpcy5fZGF0YTtcblxuICAgIHRoaXMuX3NldFRpbWVvdXRzKCk7XG5cbiAgICAvLyBzdGF0ZSBjaGFuZ2VcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmVhZHlTdGF0ZSA9IHhoci5yZWFkeVN0YXRlO1xuICAgICAgICBpZiAocmVhZHlTdGF0ZSA+PSAyICYmIHNlbGYuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICg0ICE9IHJlYWR5U3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluIElFOSwgcmVhZHMgdG8gYW55IHByb3BlcnR5IChlLmcuIHN0YXR1cykgb2ZmIG9mIGFuIGFib3J0ZWQgWEhSIHdpbGxcbiAgICAgICAgLy8gcmVzdWx0IGluIHRoZSBlcnJvciBcIkNvdWxkIG5vdCBjb21wbGV0ZSB0aGUgb3BlcmF0aW9uIGR1ZSB0byBlcnJvciBjMDBjMDIzZlwiXG4gICAgICAgIHZhciBzdGF0dXM7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBzdGF0dXMgPSB4aHIuc3RhdHVzXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHN0YXR1cyA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXN0YXR1cykge1xuICAgICAgICAgICAgaWYgKHNlbGYudGltZWRvdXQgfHwgc2VsZi5fYWJvcnRlZCkgcmV0dXJuO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuY3Jvc3NEb21haW5FcnJvcigpO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYuZW1pdCgnZW5kJyk7XG4gICAgfTtcblxuICAgIC8vIHByb2dyZXNzXG4gICAgdmFyIGhhbmRsZVByb2dyZXNzID0gZnVuY3Rpb24gKGRpcmVjdGlvbiwgZSkge1xuICAgICAgICBpZiAoZS50b3RhbCA+IDApIHtcbiAgICAgICAgICAgIGUucGVyY2VudCA9IGUubG9hZGVkIC8gZS50b3RhbCAqIDEwMDtcbiAgICAgICAgfVxuICAgICAgICBlLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICAgICAgc2VsZi5lbWl0KCdwcm9ncmVzcycsIGUpO1xuICAgIH1cbiAgICBpZiAodGhpcy5oYXNMaXN0ZW5lcnMoJ3Byb2dyZXNzJykpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHhoci5vbnByb2dyZXNzID0gaGFuZGxlUHJvZ3Jlc3MuYmluZChudWxsLCAnZG93bmxvYWQnKTtcbiAgICAgICAgICAgIGlmICh4aHIudXBsb2FkKSB7XG4gICAgICAgICAgICAgICAgeGhyLnVwbG9hZC5vbnByb2dyZXNzID0gaGFuZGxlUHJvZ3Jlc3MuYmluZChudWxsLCAndXBsb2FkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEFjY2Vzc2luZyB4aHIudXBsb2FkIGZhaWxzIGluIElFIGZyb20gYSB3ZWIgd29ya2VyLCBzbyBqdXN0IHByZXRlbmQgaXQgZG9lc24ndCBleGlzdC5cbiAgICAgICAgICAgIC8vIFJlcG9ydGVkIGhlcmU6XG4gICAgICAgICAgICAvLyBodHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFjay9kZXRhaWxzLzgzNzI0NS94bWxodHRwcmVxdWVzdC11cGxvYWQtdGhyb3dzLWludmFsaWQtYXJndW1lbnQtd2hlbi11c2VkLWZyb20td2ViLXdvcmtlci1jb250ZXh0XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpbml0aWF0ZSByZXF1ZXN0XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHRoaXMudXNlcm5hbWUgJiYgdGhpcy5wYXNzd29yZCkge1xuICAgICAgICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlLCB0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHhoci5vcGVuKHRoaXMubWV0aG9kLCB0aGlzLnVybCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gc2VlICMxMTQ5XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKGVycik7XG4gICAgfVxuXG4gICAgLy8gQ09SU1xuICAgIGlmICh0aGlzLl93aXRoQ3JlZGVudGlhbHMpIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gICAgLy8gYm9keVxuICAgIGlmICghdGhpcy5fZm9ybURhdGEgJiYgJ0dFVCcgIT0gdGhpcy5tZXRob2QgJiYgJ0hFQUQnICE9IHRoaXMubWV0aG9kICYmICdzdHJpbmcnICE9IHR5cGVvZiBkYXRhICYmICF0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAgICAgLy8gc2VyaWFsaXplIHN0dWZmXG4gICAgICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG4gICAgICAgIHZhciBzZXJpYWxpemUgPSB0aGlzLl9zZXJpYWxpemVyIHx8IHJlcXVlc3Quc2VyaWFsaXplW2NvbnRlbnRUeXBlID8gY29udGVudFR5cGUuc3BsaXQoJzsnKVswXSA6ICcnXTtcbiAgICAgICAgaWYgKCFzZXJpYWxpemUgJiYgaXNKU09OKGNvbnRlbnRUeXBlKSkge1xuICAgICAgICAgICAgc2VyaWFsaXplID0gcmVxdWVzdC5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VyaWFsaXplKSBkYXRhID0gc2VyaWFsaXplKGRhdGEpO1xuICAgIH1cblxuICAgIC8vIHNldCBoZWFkZXIgZmllbGRzXG4gICAgZm9yICh2YXIgZmllbGQgaW4gdGhpcy5oZWFkZXIpIHtcbiAgICAgICAgaWYgKG51bGwgPT0gdGhpcy5oZWFkZXJbZmllbGRdKSBjb250aW51ZTtcblxuICAgICAgICBpZiAodGhpcy5oZWFkZXIuaGFzT3duUHJvcGVydHkoZmllbGQpKVxuICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoZmllbGQsIHRoaXMuaGVhZGVyW2ZpZWxkXSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3Jlc3BvbnNlVHlwZSkge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gdGhpcy5fcmVzcG9uc2VUeXBlO1xuICAgIH1cblxuICAgIC8vIHNlbmQgc3R1ZmZcbiAgICB0aGlzLmVtaXQoJ3JlcXVlc3QnLCB0aGlzKTtcblxuICAgIC8vIElFMTEgeGhyLnNlbmQodW5kZWZpbmVkKSBzZW5kcyAndW5kZWZpbmVkJyBzdHJpbmcgYXMgUE9TVCBwYXlsb2FkIChpbnN0ZWFkIG9mIG5vdGhpbmcpXG4gICAgLy8gV2UgbmVlZCBudWxsIGhlcmUgaWYgZGF0YSBpcyB1bmRlZmluZWRcbiAgICB4aHIuc2VuZCh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcgPyBkYXRhIDogbnVsbCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdFVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QuZ2V0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnR0VUJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnF1ZXJ5KGRhdGEpO1xuICAgIGlmIChmbikgcmVxLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogSEVBRCBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QuaGVhZCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGZuKSB7XG4gICAgdmFyIHJlcSA9IHJlcXVlc3QoJ0hFQUQnLCB1cmwpO1xuICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICAgIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICAgIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIE9QVElPTlMgcXVlcnkgdG8gYHVybGAgd2l0aCBvcHRpb25hbCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0Lm9wdGlvbnMgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBmbikge1xuICAgIHZhciByZXEgPSByZXF1ZXN0KCdPUFRJT05TJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBERUxFVEUgYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRlbCh1cmwsIGRhdGEsIGZuKSB7XG4gICAgdmFyIHJlcSA9IHJlcXVlc3QoJ0RFTEVURScsIHVybCk7XG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gICAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICAgIGlmIChmbikgcmVxLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbnJlcXVlc3RbJ2RlbCddID0gZGVsO1xucmVxdWVzdFsnZGVsZXRlJ10gPSBkZWw7XG5cbi8qKlxuICogUEFUQ0ggYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucGF0Y2ggPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBmbikge1xuICAgIHZhciByZXEgPSByZXF1ZXN0KCdQQVRDSCcsIHVybCk7XG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gICAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICAgIGlmIChmbikgcmVxLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUE9TVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wb3N0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnUE9TVCcsIHVybCk7XG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gICAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICAgIGlmIChmbikgcmVxLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUFVUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnB1dCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGZuKSB7XG4gICAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BVVCcsIHVybCk7XG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gICAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICAgIGlmIChmbikgcmVxLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG4iLCIvKipcbiAqIENoZWNrIGlmIGBmbmAgaXMgYSBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGZuKSB7XG4gICAgdmFyIHRhZyA9IGlzT2JqZWN0KGZuKSA/IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChmbikgOiAnJztcbiAgICByZXR1cm4gdGFnID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzRnVuY3Rpb247XG4iLCIvKipcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGFuIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gaXNPYmplY3Qob2JqKSB7XG4gICAgcmV0dXJuIG51bGwgIT09IG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iajtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdDtcbiIsIi8qKlxuICogTW9kdWxlIG9mIG1peGVkLWluIGZ1bmN0aW9ucyBzaGFyZWQgYmV0d2VlbiBub2RlIGFuZCBjbGllbnQgY29kZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG4vKipcbiAqIEV4cG9zZSBgUmVxdWVzdEJhc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEJhc2U7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdEJhc2VgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVxdWVzdEJhc2Uob2JqKSB7XG4gICAgaWYgKG9iaikgcmV0dXJuIG1peGluKG9iaik7XG59XG5cbi8qKlxuICogTWl4aW4gdGhlIHByb3RvdHlwZSBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICAgIGZvciAodmFyIGtleSBpbiBSZXF1ZXN0QmFzZS5wcm90b3R5cGUpIHtcbiAgICAgICAgb2JqW2tleV0gPSBSZXF1ZXN0QmFzZS5wcm90b3R5cGVba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBDbGVhciBwcmV2aW91cyB0aW1lb3V0LlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gX2NsZWFyVGltZW91dCgpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZXIpO1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XG4gICAgZGVsZXRlIHRoaXMuX3RpbWVyO1xuICAgIGRlbGV0ZSB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lcjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgZGVmYXVsdCByZXNwb25zZSBib2R5IHBhcnNlclxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBpbmNvbWluZyBkYXRhIGludG8gcmVxdWVzdC5ib2R5XG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UoZm4pIHtcbiAgICB0aGlzLl9wYXJzZXIgPSBmbjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IGZvcm1hdCBvZiBiaW5hcnkgcmVzcG9uc2UgYm9keS5cbiAqIEluIGJyb3dzZXIgdmFsaWQgZm9ybWF0cyBhcmUgJ2Jsb2InIGFuZCAnYXJyYXlidWZmZXInLFxuICogd2hpY2ggcmV0dXJuIEJsb2IgYW5kIEFycmF5QnVmZmVyLCByZXNwZWN0aXZlbHkuXG4gKlxuICogSW4gTm9kZSBhbGwgdmFsdWVzIHJlc3VsdCBpbiBCdWZmZXIuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICByZXEuZ2V0KCcvJylcbiAqICAgICAgICAucmVzcG9uc2VUeXBlKCdibG9iJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnJlc3BvbnNlVHlwZSA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICB0aGlzLl9yZXNwb25zZVR5cGUgPSB2YWw7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIGRlZmF1bHQgcmVxdWVzdCBib2R5IHNlcmlhbGl6ZXJcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHRvIGNvbnZlcnQgZGF0YSBzZXQgdmlhIC5zZW5kIG9yIC5hdHRhY2ggaW50byBwYXlsb2FkIHRvIHNlbmRcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24gc2VyaWFsaXplKGZuKSB7XG4gICAgdGhpcy5fc2VyaWFsaXplciA9IGZuO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGltZW91dHMuXG4gKlxuICogLSByZXNwb25zZSB0aW1lb3V0IGlzIHRpbWUgYmV0d2VlbiBzZW5kaW5nIHJlcXVlc3QgYW5kIHJlY2VpdmluZyB0aGUgZmlyc3QgYnl0ZSBvZiB0aGUgcmVzcG9uc2UuIEluY2x1ZGVzIEROUyBhbmQgY29ubmVjdGlvbiB0aW1lLlxuICogLSBkZWFkbGluZSBpcyB0aGUgdGltZSBmcm9tIHN0YXJ0IG9mIHRoZSByZXF1ZXN0IHRvIHJlY2VpdmluZyByZXNwb25zZSBib2R5IGluIGZ1bGwuIElmIHRoZSBkZWFkbGluZSBpcyB0b28gc2hvcnQgbGFyZ2UgZmlsZXMgbWF5IG5vdCBsb2FkIGF0IGFsbCBvbiBzbG93IGNvbm5lY3Rpb25zLlxuICpcbiAqIFZhbHVlIG9mIDAgb3IgZmFsc2UgbWVhbnMgbm8gdGltZW91dC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IG1zIG9yIHtyZXNwb25zZSwgcmVhZCwgZGVhZGxpbmV9XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiB0aW1lb3V0KG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMgfHwgJ29iamVjdCcgIT09IHR5cGVvZiBvcHRpb25zKSB7XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSBvcHRpb25zO1xuICAgICAgICB0aGlzLl9yZXNwb25zZVRpbWVvdXQgPSAwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBmb3IgKHZhciBvcHRpb24gaW4gb3B0aW9ucykge1xuICAgICAgICBzd2l0Y2ggKG9wdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZGVhZGxpbmUnOlxuICAgICAgICAgICAgICAgIHRoaXMuX3RpbWVvdXQgPSBvcHRpb25zLmRlYWRsaW5lO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncmVzcG9uc2UnOlxuICAgICAgICAgICAgICAgIHRoaXMuX3Jlc3BvbnNlVGltZW91dCA9IG9wdGlvbnMucmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlVua25vd24gdGltZW91dCBvcHRpb25cIiwgb3B0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IG51bWJlciBvZiByZXRyeSBhdHRlbXB0cyBvbiBlcnJvci5cbiAqXG4gKiBGYWlsZWQgcmVxdWVzdHMgd2lsbCBiZSByZXRyaWVkICdjb3VudCcgdGltZXMgaWYgdGltZW91dCBvciBlcnIuY29kZSA+PSA1MDAuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGNvdW50XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnJldHJ5ID0gZnVuY3Rpb24gcmV0cnkoY291bnQpIHtcbiAgICAvLyBEZWZhdWx0IHRvIDEgaWYgbm8gY291bnQgcGFzc2VkIG9yIHRydWVcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCBjb3VudCA9PT0gdHJ1ZSkgY291bnQgPSAxO1xuICAgIGlmIChjb3VudCA8PSAwKSBjb3VudCA9IDA7XG4gICAgdGhpcy5fbWF4UmV0cmllcyA9IGNvdW50O1xuICAgIHRoaXMuX3JldHJpZXMgPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXRyeSByZXF1ZXN0XG4gKlxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX3JldHJ5ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuY2xlYXJUaW1lb3V0KCk7XG5cbiAgICAvLyBub2RlXG4gICAgaWYgKHRoaXMucmVxKSB7XG4gICAgICAgIHRoaXMucmVxID0gbnVsbDtcbiAgICAgICAgdGhpcy5yZXEgPSB0aGlzLnJlcXVlc3QoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9hYm9ydGVkID0gZmFsc2U7XG4gICAgdGhpcy50aW1lZG91dCA9IGZhbHNlO1xuXG4gICAgcmV0dXJuIHRoaXMuX2VuZCgpO1xufTtcblxuLyoqXG4gKiBQcm9taXNlIHN1cHBvcnRcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVqZWN0XVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIHRoZW4ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgaWYgKCF0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIGlmICh0aGlzLl9lbmRDYWxsZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIldhcm5pbmc6IHN1cGVyYWdlbnQgcmVxdWVzdCB3YXMgc2VudCB0d2ljZSwgYmVjYXVzZSBib3RoIC5lbmQoKSBhbmQgLnRoZW4oKSB3ZXJlIGNhbGxlZC4gTmV2ZXIgY2FsbCAuZW5kKCkgaWYgeW91IHVzZSBwcm9taXNlc1wiKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChpbm5lclJlc29sdmUsIGlubmVyUmVqZWN0KSB7XG4gICAgICAgICAgICBzZWxmLmVuZChmdW5jdGlvbiAoZXJyLCByZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSBpbm5lclJlamVjdChlcnIpOyBlbHNlIGlubmVyUmVzb2x2ZShyZXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZnVsbGZpbGxlZFByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xufVxuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2F0Y2ggPSBmdW5jdGlvbiAoY2IpIHtcbiAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgY2IpO1xufTtcblxuLyoqXG4gKiBBbGxvdyBmb3IgZXh0ZW5zaW9uXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmbikge1xuICAgIGZuKHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xufVxuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUub2sgPSBmdW5jdGlvbiAoY2IpIHtcbiAgICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGNiKSB0aHJvdyBFcnJvcihcIkNhbGxiYWNrIHJlcXVpcmVkXCIpO1xuICAgIHRoaXMuX29rQ2FsbGJhY2sgPSBjYjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5faXNSZXNwb25zZU9LID0gZnVuY3Rpb24gKHJlcykge1xuICAgIGlmICghcmVzKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fb2tDYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5fb2tDYWxsYmFjayhyZXMpO1xuICAgIH1cblxuICAgIHJldHVybiByZXMuc3RhdHVzID49IDIwMCAmJiByZXMuc3RhdHVzIDwgMzAwO1xufTtcblxuXG4vKipcbiAqIEdldCByZXF1ZXN0IGhlYWRlciBgZmllbGRgLlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmaWVsZCkge1xuICAgIHJldHVybiB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG59O1xuXG4vKipcbiAqIEdldCBjYXNlLWluc2Vuc2l0aXZlIGhlYWRlciBgZmllbGRgIHZhbHVlLlxuICogVGhpcyBpcyBhIGRlcHJlY2F0ZWQgaW50ZXJuYWwgQVBJLiBVc2UgYC5nZXQoZmllbGQpYCBpbnN0ZWFkLlxuICpcbiAqIChnZXRIZWFkZXIgaXMgbm8gbG9uZ2VyIHVzZWQgaW50ZXJuYWxseSBieSB0aGUgc3VwZXJhZ2VudCBjb2RlIGJhc2UpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBkZXByZWNhdGVkXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldEhlYWRlciA9IFJlcXVlc3RCYXNlLnByb3RvdHlwZS5nZXQ7XG5cbi8qKlxuICogU2V0IGhlYWRlciBgZmllbGRgIHRvIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0LlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJylcbiAqICAgICAgICAuc2V0KCdYLUFQSS1LZXknLCAnZm9vYmFyJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoeyBBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJywgJ1gtQVBJLUtleSc6ICdmb29iYXInIH0pXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBmaWVsZFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoZmllbGQsIHZhbCkge1xuICAgIGlmIChpc09iamVjdChmaWVsZCkpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGZpZWxkKSB7XG4gICAgICAgICAgICB0aGlzLnNldChrZXksIGZpZWxkW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV0gPSB2YWw7XG4gICAgdGhpcy5oZWFkZXJbZmllbGRdID0gdmFsO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGVhZGVyIGBmaWVsZGAuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogICAgICByZXEuZ2V0KCcvJylcbiAqICAgICAgICAudW5zZXQoJ1VzZXItQWdlbnQnKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudW5zZXQgPSBmdW5jdGlvbiAoZmllbGQpIHtcbiAgICBkZWxldGUgdGhpcy5faGVhZGVyW2ZpZWxkLnRvTG93ZXJDYXNlKCldO1xuICAgIGRlbGV0ZSB0aGlzLmhlYWRlcltmaWVsZF07XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyaXRlIHRoZSBmaWVsZCBgbmFtZWAgYW5kIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0XG4gKiBmb3IgXCJtdWx0aXBhcnQvZm9ybS1kYXRhXCIgcmVxdWVzdCBib2RpZXMuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoJ2ZvbycsICdiYXInKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoeyBmb286ICdiYXInLCBiYXo6ICdxdXgnIH0pXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xCbG9ifEZpbGV8QnVmZmVyfGZzLlJlYWRTdHJlYW19IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZmllbGQgPSBmdW5jdGlvbiAobmFtZSwgdmFsKSB7XG5cbiAgICAvLyBuYW1lIHNob3VsZCBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgYW4gb2JqZWN0LlxuICAgIGlmIChudWxsID09PSBuYW1lIHx8IHVuZGVmaW5lZCA9PT0gbmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJy5maWVsZChuYW1lLCB2YWwpIG5hbWUgY2FuIG5vdCBiZSBlbXB0eScpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9kYXRhKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCIuZmllbGQoKSBjYW4ndCBiZSB1c2VkIGlmIC5zZW5kKCkgaXMgdXNlZC4gUGxlYXNlIHVzZSBvbmx5IC5zZW5kKCkgb3Igb25seSAuZmllbGQoKSAmIC5hdHRhY2goKVwiKTtcbiAgICB9XG5cbiAgICBpZiAoaXNPYmplY3QobmFtZSkpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgICAgICAgIHRoaXMuZmllbGQoa2V5LCBuYW1lW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB2YWwpIHtcbiAgICAgICAgICAgIHRoaXMuZmllbGQobmFtZSwgdmFsW2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyB2YWwgc2hvdWxkIGJlIGRlZmluZWQgbm93XG4gICAgaWYgKG51bGwgPT09IHZhbCB8fCB1bmRlZmluZWQgPT09IHZhbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJy5maWVsZChuYW1lLCB2YWwpIHZhbCBjYW4gbm90IGJlIGVtcHR5Jyk7XG4gICAgfVxuICAgIGlmICgnYm9vbGVhbicgPT09IHR5cGVvZiB2YWwpIHtcbiAgICAgICAgdmFsID0gJycgKyB2YWw7XG4gICAgfVxuICAgIHRoaXMuX2dldEZvcm1EYXRhKCkuYXBwZW5kKG5hbWUsIHZhbCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFib3J0IHRoZSByZXF1ZXN0LCBhbmQgY2xlYXIgcG90ZW50aWFsIHRpbWVvdXQuXG4gKlxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5fYWJvcnRlZCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgdGhpcy5fYWJvcnRlZCA9IHRydWU7XG4gICAgdGhpcy54aHIgJiYgdGhpcy54aHIuYWJvcnQoKTsgLy8gYnJvd3NlclxuICAgIHRoaXMucmVxICYmIHRoaXMucmVxLmFib3J0KCk7IC8vIG5vZGVcbiAgICB0aGlzLmNsZWFyVGltZW91dCgpO1xuICAgIHRoaXMuZW1pdCgnYWJvcnQnKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW5hYmxlIHRyYW5zbWlzc2lvbiBvZiBjb29raWVzIHdpdGggeC1kb21haW4gcmVxdWVzdHMuXG4gKlxuICogTm90ZSB0aGF0IGZvciB0aGlzIHRvIHdvcmsgdGhlIG9yaWdpbiBtdXN0IG5vdCBiZVxuICogdXNpbmcgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIiB3aXRoIGEgd2lsZGNhcmQsXG4gKiBhbmQgYWxzbyBtdXN0IHNldCBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzXCJcbiAqIHRvIFwidHJ1ZVwiLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLndpdGhDcmVkZW50aWFscyA9IGZ1bmN0aW9uIChvbikge1xuICAgIC8vIFRoaXMgaXMgYnJvd3Nlci1vbmx5IGZ1bmN0aW9uYWxpdHkuIE5vZGUgc2lkZSBpcyBuby1vcC5cbiAgICBpZiAob24gPT0gdW5kZWZpbmVkKSBvbiA9IHRydWU7XG4gICAgdGhpcy5fd2l0aENyZWRlbnRpYWxzID0gb247XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgbWF4IHJlZGlyZWN0cyB0byBgbmAuIERvZXMgbm90aW5nIGluIGJyb3dzZXIgWEhSIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnJlZGlyZWN0cyA9IGZ1bmN0aW9uIChuKSB7XG4gICAgdGhpcy5fbWF4UmVkaXJlY3RzID0gbjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ29udmVydCB0byBhIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0IChub3QgSlNPTiBzdHJpbmcpIG9mIHNjYWxhciBwcm9wZXJ0aWVzLlxuICogTm90ZSBhcyB0aGlzIG1ldGhvZCBpcyBkZXNpZ25lZCB0byByZXR1cm4gYSB1c2VmdWwgbm9uLXRoaXMgdmFsdWUsXG4gKiBpdCBjYW5ub3QgYmUgY2hhaW5lZC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IGRlc2NyaWJpbmcgbWV0aG9kLCB1cmwsIGFuZCBkYXRhIG9mIHRoaXMgcmVxdWVzdFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIG1ldGhvZDogdGhpcy5tZXRob2QsXG4gICAgICAgIHVybDogdGhpcy51cmwsXG4gICAgICAgIGRhdGE6IHRoaXMuX2RhdGEsXG4gICAgICAgIGhlYWRlcnM6IHRoaXMuX2hlYWRlclxuICAgIH07XG59O1xuXG5cbi8qKlxuICogU2VuZCBgZGF0YWAgYXMgdGhlIHJlcXVlc3QgYm9keSwgZGVmYXVsdGluZyB0aGUgYC50eXBlKClgIHRvIFwianNvblwiIHdoZW5cbiAqIGFuIG9iamVjdCBpcyBnaXZlbi5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgICAvLyBtYW51YWwganNvblxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdqc29uJylcbiAqICAgICAgICAgLnNlbmQoJ3tcIm5hbWVcIjpcInRqXCJ9JylcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBhdXRvIGpzb25cbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBtYW51YWwgeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxuICogICAgICAgICAuc2VuZCgnbmFtZT10aicpXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gYXV0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnZm9ybScpXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGRlZmF1bHRzIHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAuc2VuZCgnbmFtZT10b2JpJylcbiAqICAgICAgICAuc2VuZCgnc3BlY2llcz1mZXJyZXQnKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgIHZhciBpc09iaiA9IGlzT2JqZWN0KGRhdGEpO1xuICAgIHZhciB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcblxuICAgIGlmICh0aGlzLl9mb3JtRGF0YSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiLnNlbmQoKSBjYW4ndCBiZSB1c2VkIGlmIC5hdHRhY2goKSBvciAuZmllbGQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICAgIH1cblxuICAgIGlmIChpc09iaiAmJiAhdGhpcy5fZGF0YSkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YSA9IFtdO1xuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZGF0YSAmJiB0aGlzLl9kYXRhICYmIHRoaXMuX2lzSG9zdCh0aGlzLl9kYXRhKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihcIkNhbid0IG1lcmdlIHRoZXNlIHNlbmQgY2FsbHNcIik7XG4gICAgfVxuXG4gICAgLy8gbWVyZ2VcbiAgICBpZiAoaXNPYmogJiYgaXNPYmplY3QodGhpcy5fZGF0YSkpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGRhdGEpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGFba2V5XSA9IGRhdGFba2V5XTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIGRhdGEpIHtcbiAgICAgICAgLy8gZGVmYXVsdCB0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAgICAgICAgaWYgKCF0eXBlKSB0aGlzLnR5cGUoJ2Zvcm0nKTtcbiAgICAgICAgdHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG4gICAgICAgIGlmICgnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyA9PSB0eXBlKSB7XG4gICAgICAgICAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YVxuICAgICAgICAgICAgICAgID8gdGhpcy5fZGF0YSArICcmJyArIGRhdGFcbiAgICAgICAgICAgICAgICA6IGRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9kYXRhID0gKHRoaXMuX2RhdGEgfHwgJycpICsgZGF0YTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgIH1cblxuICAgIGlmICghaXNPYmogfHwgdGhpcy5faXNIb3N0KGRhdGEpKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIGRlZmF1bHQgdG8ganNvblxuICAgIGlmICghdHlwZSkgdGhpcy50eXBlKCdqc29uJyk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogU29ydCBgcXVlcnlzdHJpbmdgIGJ5IHRoZSBzb3J0IGZ1bmN0aW9uXG4gKlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgIC8vIGRlZmF1bHQgb3JkZXJcbiAqICAgICAgIHJlcXVlc3QuZ2V0KCcvdXNlcicpXG4gKiAgICAgICAgIC5xdWVyeSgnbmFtZT1OaWNrJylcbiAqICAgICAgICAgLnF1ZXJ5KCdzZWFyY2g9TWFubnknKVxuICogICAgICAgICAuc29ydFF1ZXJ5KClcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBjdXN0b21pemVkIHNvcnQgZnVuY3Rpb25cbiAqICAgICAgIHJlcXVlc3QuZ2V0KCcvdXNlcicpXG4gKiAgICAgICAgIC5xdWVyeSgnbmFtZT1OaWNrJylcbiAqICAgICAgICAgLnF1ZXJ5KCdzZWFyY2g9TWFubnknKVxuICogICAgICAgICAuc29ydFF1ZXJ5KGZ1bmN0aW9uKGEsIGIpe1xuICogICAgICAgICAgIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuICogICAgICAgICB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzb3J0XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNvcnRRdWVyeSA9IGZ1bmN0aW9uIChzb3J0KSB7XG4gICAgLy8gX3NvcnQgZGVmYXVsdCB0byB0cnVlIGJ1dCBvdGhlcndpc2UgY2FuIGJlIGEgZnVuY3Rpb24gb3IgYm9vbGVhblxuICAgIHRoaXMuX3NvcnQgPSB0eXBlb2Ygc29ydCA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogc29ydDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggdGltZW91dCBlcnJvci5cbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX3RpbWVvdXRFcnJvciA9IGZ1bmN0aW9uIChyZWFzb24sIHRpbWVvdXQsIGVycm5vKSB7XG4gICAgaWYgKHRoaXMuX2Fib3J0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKHJlYXNvbiArIHRpbWVvdXQgKyAnbXMgZXhjZWVkZWQnKTtcbiAgICBlcnIudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgZXJyLmNvZGUgPSAnRUNPTk5BQk9SVEVEJztcbiAgICBlcnIuZXJybm8gPSBlcnJubztcbiAgICB0aGlzLnRpbWVkb3V0ID0gdHJ1ZTtcbiAgICB0aGlzLmFib3J0KCk7XG4gICAgdGhpcy5jYWxsYmFjayhlcnIpO1xufTtcblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9zZXRUaW1lb3V0cyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBkZWFkbGluZVxuICAgIGlmICh0aGlzLl90aW1lb3V0ICYmICF0aGlzLl90aW1lcikge1xuICAgICAgICB0aGlzLl90aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5fdGltZW91dEVycm9yKCdUaW1lb3V0IG9mICcsIHNlbGYuX3RpbWVvdXQsICdFVElNRScpO1xuICAgICAgICB9LCB0aGlzLl90aW1lb3V0KTtcbiAgICB9XG4gICAgLy8gcmVzcG9uc2UgdGltZW91dFxuICAgIGlmICh0aGlzLl9yZXNwb25zZVRpbWVvdXQgJiYgIXRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XG4gICAgICAgIHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl90aW1lb3V0RXJyb3IoJ1Jlc3BvbnNlIHRpbWVvdXQgb2YgJywgc2VsZi5fcmVzcG9uc2VUaW1lb3V0LCAnRVRJTUVET1VUJyk7XG4gICAgICAgIH0sIHRoaXMuX3Jlc3BvbnNlVGltZW91dCk7XG4gICAgfVxufVxuIiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuLyoqXG4gKiBFeHBvc2UgYFJlc3BvbnNlQmFzZWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBSZXNwb25zZUJhc2U7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVzcG9uc2VCYXNlYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlc3BvbnNlQmFzZShvYmopIHtcbiAgICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgcHJvdG90eXBlIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gICAgZm9yICh2YXIga2V5IGluIFJlc3BvbnNlQmFzZS5wcm90b3R5cGUpIHtcbiAgICAgICAgb2JqW2tleV0gPSBSZXNwb25zZUJhc2UucHJvdG90eXBlW2tleV07XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogR2V0IGNhc2UtaW5zZW5zaXRpdmUgYGZpZWxkYCB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVzcG9uc2VCYXNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoZmllbGQpIHtcbiAgICByZXR1cm4gdGhpcy5oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG59O1xuXG4vKipcbiAqIFNldCBoZWFkZXIgcmVsYXRlZCBwcm9wZXJ0aWVzOlxuICpcbiAqICAgLSBgLnR5cGVgIHRoZSBjb250ZW50IHR5cGUgd2l0aG91dCBwYXJhbXNcbiAqXG4gKiBBIHJlc3BvbnNlIG9mIFwiQ29udGVudC1UeXBlOiB0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCJcbiAqIHdpbGwgcHJvdmlkZSB5b3Ugd2l0aCBhIGAudHlwZWAgb2YgXCJ0ZXh0L3BsYWluXCIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGhlYWRlclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2VCYXNlLnByb3RvdHlwZS5fc2V0SGVhZGVyUHJvcGVydGllcyA9IGZ1bmN0aW9uIChoZWFkZXIpIHtcbiAgICAvLyBUT0RPOiBtb2FyIVxuICAgIC8vIFRPRE86IG1ha2UgdGhpcyBhIHV0aWxcblxuICAgIC8vIGNvbnRlbnQtdHlwZVxuICAgIHZhciBjdCA9IGhlYWRlclsnY29udGVudC10eXBlJ10gfHwgJyc7XG4gICAgdGhpcy50eXBlID0gdXRpbHMudHlwZShjdCk7XG5cbiAgICAvLyBwYXJhbXNcbiAgICB2YXIgcGFyYW1zID0gdXRpbHMucGFyYW1zKGN0KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB0aGlzW2tleV0gPSBwYXJhbXNba2V5XTtcblxuICAgIHRoaXMubGlua3MgPSB7fTtcblxuICAgIC8vIGxpbmtzXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKGhlYWRlci5saW5rKSB7XG4gICAgICAgICAgICB0aGlzLmxpbmtzID0gdXRpbHMucGFyc2VMaW5rcyhoZWFkZXIubGluayk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gaWdub3JlXG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXQgZmxhZ3Mgc3VjaCBhcyBgLm9rYCBiYXNlZCBvbiBgc3RhdHVzYC5cbiAqXG4gKiBGb3IgZXhhbXBsZSBhIDJ4eCByZXNwb25zZSB3aWxsIGdpdmUgeW91IGEgYC5va2Agb2YgX190cnVlX19cbiAqIHdoZXJlYXMgNXh4IHdpbGwgYmUgX19mYWxzZV9fIGFuZCBgLmVycm9yYCB3aWxsIGJlIF9fdHJ1ZV9fLiBUaGVcbiAqIGAuY2xpZW50RXJyb3JgIGFuZCBgLnNlcnZlckVycm9yYCBhcmUgYWxzbyBhdmFpbGFibGUgdG8gYmUgbW9yZVxuICogc3BlY2lmaWMsIGFuZCBgLnN0YXR1c1R5cGVgIGlzIHRoZSBjbGFzcyBvZiBlcnJvciByYW5naW5nIGZyb20gMS4uNVxuICogc29tZXRpbWVzIHVzZWZ1bCBmb3IgbWFwcGluZyByZXNwb25kIGNvbG9ycyBldGMuXG4gKlxuICogXCJzdWdhclwiIHByb3BlcnRpZXMgYXJlIGFsc28gZGVmaW5lZCBmb3IgY29tbW9uIGNhc2VzLiBDdXJyZW50bHkgcHJvdmlkaW5nOlxuICpcbiAqICAgLSAubm9Db250ZW50XG4gKiAgIC0gLmJhZFJlcXVlc3RcbiAqICAgLSAudW5hdXRob3JpemVkXG4gKiAgIC0gLm5vdEFjY2VwdGFibGVcbiAqICAgLSAubm90Rm91bmRcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gc3RhdHVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRTdGF0dXNQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKHN0YXR1cykge1xuICAgIHZhciB0eXBlID0gc3RhdHVzIC8gMTAwIHwgMDtcblxuICAgIC8vIHN0YXR1cyAvIGNsYXNzXG4gICAgdGhpcy5zdGF0dXMgPSB0aGlzLnN0YXR1c0NvZGUgPSBzdGF0dXM7XG4gICAgdGhpcy5zdGF0dXNUeXBlID0gdHlwZTtcblxuICAgIC8vIGJhc2ljc1xuICAgIHRoaXMuaW5mbyA9IDEgPT0gdHlwZTtcbiAgICB0aGlzLm9rID0gMiA9PSB0eXBlO1xuICAgIHRoaXMucmVkaXJlY3QgPSAzID09IHR5cGU7XG4gICAgdGhpcy5jbGllbnRFcnJvciA9IDQgPT0gdHlwZTtcbiAgICB0aGlzLnNlcnZlckVycm9yID0gNSA9PSB0eXBlO1xuICAgIHRoaXMuZXJyb3IgPSAoNCA9PSB0eXBlIHx8IDUgPT0gdHlwZSlcbiAgICAgICAgPyB0aGlzLnRvRXJyb3IoKVxuICAgICAgICA6IGZhbHNlO1xuXG4gICAgLy8gc3VnYXJcbiAgICB0aGlzLmFjY2VwdGVkID0gMjAyID09IHN0YXR1cztcbiAgICB0aGlzLm5vQ29udGVudCA9IDIwNCA9PSBzdGF0dXM7XG4gICAgdGhpcy5iYWRSZXF1ZXN0ID0gNDAwID09IHN0YXR1cztcbiAgICB0aGlzLnVuYXV0aG9yaXplZCA9IDQwMSA9PSBzdGF0dXM7XG4gICAgdGhpcy5ub3RBY2NlcHRhYmxlID0gNDA2ID09IHN0YXR1cztcbiAgICB0aGlzLmZvcmJpZGRlbiA9IDQwMyA9PSBzdGF0dXM7XG4gICAgdGhpcy5ub3RGb3VuZCA9IDQwNCA9PSBzdGF0dXM7XG59O1xuIiwidmFyIEVSUk9SX0NPREVTID0gW1xuICAgICdFQ09OTlJFU0VUJyxcbiAgICAnRVRJTUVET1VUJyxcbiAgICAnRUFERFJJTkZPJyxcbiAgICAnRVNPQ0tFVFRJTUVET1VUJ1xuXTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSByZXF1ZXN0IHNob3VsZCBiZSByZXRyaWVkLlxuICogKEJvcnJvd2VkIGZyb20gc2VnbWVudGlvL3N1cGVyYWdlbnQtcmV0cnkpXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyXG4gKiBAcGFyYW0ge1Jlc3BvbnNlfSBbcmVzXVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2hvdWxkUmV0cnkoZXJyLCByZXMpIHtcbiAgICBpZiAoZXJyICYmIGVyci5jb2RlICYmIH5FUlJPUl9DT0RFUy5pbmRleE9mKGVyci5jb2RlKSkgcmV0dXJuIHRydWU7XG4gICAgaWYgKHJlcyAmJiByZXMuc3RhdHVzICYmIHJlcy5zdGF0dXMgPj0gNTAwKSByZXR1cm4gdHJ1ZTtcbiAgICAvLyBTdXBlcmFnZW50IHRpbWVvdXRcbiAgICBpZiAoZXJyICYmICd0aW1lb3V0JyBpbiBlcnIgJiYgZXJyLmNvZGUgPT0gJ0VDT05OQUJPUlRFRCcpIHJldHVybiB0cnVlO1xuICAgIGlmIChlcnIgJiYgJ2Nyb3NzRG9tYWluJyBpbiBlcnIpIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbn07XG4iLCIvKipcbiAqIFJldHVybiB0aGUgbWltZSB0eXBlIGZvciB0aGUgZ2l2ZW4gYHN0cmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy50eXBlID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykuc2hpZnQoKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGhlYWRlciBmaWVsZCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGFyYW1zID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykucmVkdWNlKGZ1bmN0aW9uIChvYmosIHN0cikge1xuICAgICAgICB2YXIgcGFydHMgPSBzdHIuc3BsaXQoLyAqPSAqLyk7XG4gICAgICAgIHZhciBrZXkgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgICB2YXIgdmFsID0gcGFydHMuc2hpZnQoKTtcblxuICAgICAgICBpZiAoa2V5ICYmIHZhbCkgb2JqW2tleV0gPSB2YWw7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30pO1xufTtcblxuLyoqXG4gKiBQYXJzZSBMaW5rIGhlYWRlciBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5wYXJzZUxpbmtzID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHJldHVybiBzdHIuc3BsaXQoLyAqLCAqLykucmVkdWNlKGZ1bmN0aW9uIChvYmosIHN0cikge1xuICAgICAgICB2YXIgcGFydHMgPSBzdHIuc3BsaXQoLyAqOyAqLyk7XG4gICAgICAgIHZhciB1cmwgPSBwYXJ0c1swXS5zbGljZSgxLCAtMSk7XG4gICAgICAgIHZhciByZWwgPSBwYXJ0c1sxXS5zcGxpdCgvICo9ICovKVsxXS5zbGljZSgxLCAtMSk7XG4gICAgICAgIG9ialtyZWxdID0gdXJsO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH0sIHt9KTtcbn07XG5cbi8qKlxuICogU3RyaXAgY29udGVudCByZWxhdGVkIGZpZWxkcyBmcm9tIGBoZWFkZXJgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBoZWFkZXJcbiAqIEByZXR1cm4ge09iamVjdH0gaGVhZGVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLmNsZWFuSGVhZGVyID0gZnVuY3Rpb24gKGhlYWRlciwgc2hvdWxkU3RyaXBDb29raWUpIHtcbiAgICBkZWxldGUgaGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgICBkZWxldGUgaGVhZGVyWydjb250ZW50LWxlbmd0aCddO1xuICAgIGRlbGV0ZSBoZWFkZXJbJ3RyYW5zZmVyLWVuY29kaW5nJ107XG4gICAgZGVsZXRlIGhlYWRlclsnaG9zdCddO1xuICAgIGlmIChzaG91bGRTdHJpcENvb2tpZSkge1xuICAgICAgICBkZWxldGUgaGVhZGVyWydjb29raWUnXTtcbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcjtcbn07IiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnc3VwZXJhZ2VudCcsICdxdWVyeXN0cmluZyddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdzdXBlcmFnZW50JyksIHJlcXVpcmUoJ3F1ZXJ5c3RyaW5nJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50ID0gZmFjdG9yeShyb290LnN1cGVyYWdlbnQsIHJvb3QucXVlcnlzdHJpbmcpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKHN1cGVyYWdlbnQsIHF1ZXJ5c3RyaW5nKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogQG1vZHVsZSBBcGlDbGllbnRcbiAgICogQHZlcnNpb24gMS4wLjdcbiAgICovXG5cbiAgLyoqXG4gICAqIE1hbmFnZXMgbG93IGxldmVsIGNsaWVudC1zZXJ2ZXIgY29tbXVuaWNhdGlvbnMsIHBhcmFtZXRlciBtYXJzaGFsbGluZywgZXRjLiBUaGVyZSBzaG91bGQgbm90IGJlIGFueSBuZWVkIGZvciBhblxuICAgKiBhcHBsaWNhdGlvbiB0byB1c2UgdGhpcyBjbGFzcyBkaXJlY3RseSAtIHRoZSAqQXBpIGFuZCBtb2RlbCBjbGFzc2VzIHByb3ZpZGUgdGhlIHB1YmxpYyBBUEkgZm9yIHRoZSBzZXJ2aWNlLiBUaGVcbiAgICogY29udGVudHMgb2YgdGhpcyBmaWxlIHNob3VsZCBiZSByZWdhcmRlZCBhcyBpbnRlcm5hbCBidXQgYXJlIGRvY3VtZW50ZWQgZm9yIGNvbXBsZXRlbmVzcy5cbiAgICogQGFsaWFzIG1vZHVsZTpBcGlDbGllbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIFVSTCBhZ2FpbnN0IHdoaWNoIHRvIHJlc29sdmUgZXZlcnkgQVBJIGNhbGwncyAocmVsYXRpdmUpIHBhdGguXG4gICAgICogQHR5cGUge1N0cmluZ31cbiAgICAgKiBAZGVmYXVsdCBodHRwOi8vbG9jYWxob3N0OjgwODAvdjJcbiAgICAgKi9cbiAgICB0aGlzLmJhc2VQYXRoID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC92MicucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYXV0aGVudGljYXRpb24gbWV0aG9kcyB0byBiZSBpbmNsdWRlZCBmb3IgYWxsIEFQSSBjYWxscy5cbiAgICAgKiBAdHlwZSB7QXJyYXkuPFN0cmluZz59XG4gICAgICovXG4gICAgdGhpcy5hdXRoZW50aWNhdGlvbnMgPSB7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGUgZGVmYXVsdCBIVFRQIGhlYWRlcnMgdG8gYmUgaW5jbHVkZWQgZm9yIGFsbCBBUEkgY2FsbHMuXG4gICAgICogQHR5cGUge0FycmF5LjxTdHJpbmc+fVxuICAgICAqIEBkZWZhdWx0IHt9XG4gICAgICovXG4gICAgdGhpcy5kZWZhdWx0SGVhZGVycyA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogVGhlIGRlZmF1bHQgSFRUUCB0aW1lb3V0IGZvciBhbGwgQVBJIGNhbGxzLlxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICogQGRlZmF1bHQgNjAwMDBcbiAgICAgKi9cbiAgICB0aGlzLnRpbWVvdXQgPSA2MDAwMDtcblxuICAgIC8qKlxuICAgICAqIElmIHNldCB0byBmYWxzZSBhbiBhZGRpdGlvbmFsIHRpbWVzdGFtcCBwYXJhbWV0ZXIgaXMgYWRkZWQgdG8gYWxsIEFQSSBHRVQgY2FsbHMgdG9cbiAgICAgKiBwcmV2ZW50IGJyb3dzZXIgY2FjaGluZ1xuICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgKi9cbiAgICB0aGlzLmNhY2hlID0gdHJ1ZTtcblxuICAgIC8qKlxuICAgICAqIElmIHNldCB0byB0cnVlLCB0aGUgY2xpZW50IHdpbGwgc2F2ZSB0aGUgY29va2llcyBmcm9tIGVhY2ggc2VydmVyXG4gICAgICogcmVzcG9uc2UsIGFuZCByZXR1cm4gdGhlbSBpbiB0aGUgbmV4dCByZXF1ZXN0LlxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG4gICAgdGhpcy5lbmFibGVDb29raWVzID0gZmFsc2U7XG5cbiAgICAvKlxuICAgICAqIFVzZWQgdG8gc2F2ZSBhbmQgcmV0dXJuIGNvb2tpZXMgaW4gYSBub2RlLmpzIChub24tYnJvd3Nlcikgc2V0dGluZyxcbiAgICAgKiBpZiB0aGlzLmVuYWJsZUNvb2tpZXMgaXMgc2V0IHRvIHRydWUuXG4gICAgICovXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLmFnZW50ID0gbmV3IHN1cGVyYWdlbnQuYWdlbnQoKTtcbiAgICB9XG5cbiAgICAgIC8qXG4gICAgICAgKiBBbGxvdyB1c2VyIHRvIG92ZXJyaWRlIHN1cGVyYWdlbnQgYWdlbnRcbiAgICAgICAqL1xuICAgICAgdGhpcy5yZXF1ZXN0QWdlbnQgPSBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIGZvciBhbiBhY3R1YWwgcGFyYW1ldGVyLlxuICAgKiBAcGFyYW0gcGFyYW0gVGhlIGFjdHVhbCBwYXJhbWV0ZXIuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgPGNvZGU+cGFyYW08L2NvZGU+LlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUucGFyYW1Ub1N0cmluZyA9IGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgaWYgKHBhcmFtID09IHVuZGVmaW5lZCB8fCBwYXJhbSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgIHJldHVybiBwYXJhbS50b0pTT04oKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtLnRvU3RyaW5nKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBmdWxsIFVSTCBieSBhcHBlbmRpbmcgdGhlIGdpdmVuIHBhdGggdG8gdGhlIGJhc2UgVVJMIGFuZCByZXBsYWNpbmcgcGF0aCBwYXJhbWV0ZXIgcGxhY2UtaG9sZGVycyB3aXRoIHBhcmFtZXRlciB2YWx1ZXMuXG4gICAqIE5PVEU6IHF1ZXJ5IHBhcmFtZXRlcnMgYXJlIG5vdCBoYW5kbGVkIGhlcmUuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgYmFzZSBVUkwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwYXRoUGFyYW1zIFRoZSBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFwcGVuZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGVuY29kZWQgcGF0aCB3aXRoIHBhcmFtZXRlciB2YWx1ZXMgc3Vic3RpdHV0ZWQuXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5idWlsZFVybCA9IGZ1bmN0aW9uKHBhdGgsIHBhdGhQYXJhbXMpIHtcbiAgICBpZiAoIXBhdGgubWF0Y2goL15cXC8vKSkge1xuICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHZhciB1cmwgPSB0aGlzLmJhc2VQYXRoICsgcGF0aDtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHVybCA9IHVybC5yZXBsYWNlKC9cXHsoW1xcdy1dKylcXH0vZywgZnVuY3Rpb24oZnVsbE1hdGNoLCBrZXkpIHtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIGlmIChwYXRoUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdmFsdWUgPSBfdGhpcy5wYXJhbVRvU3RyaW5nKHBhdGhQYXJhbXNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGZ1bGxNYXRjaDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiB1cmw7XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBjb250ZW50IHR5cGUgcmVwcmVzZW50cyBKU09OLjxicj5cbiAgICogSlNPTiBjb250ZW50IHR5cGUgZXhhbXBsZXM6PGJyPlxuICAgKiA8dWw+XG4gICAqIDxsaT5hcHBsaWNhdGlvbi9qc29uPC9saT5cbiAgICogPGxpPmFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGODwvbGk+XG4gICAqIDxsaT5BUFBMSUNBVElPTi9KU09OPC9saT5cbiAgICogPC91bD5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnRUeXBlIFRoZSBNSU1FIGNvbnRlbnQgdHlwZSB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIDxjb2RlPmNvbnRlbnRUeXBlPC9jb2RlPiByZXByZXNlbnRzIEpTT04sIG90aGVyd2lzZSA8Y29kZT5mYWxzZTwvY29kZT4uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5pc0pzb25NaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGUpIHtcbiAgICByZXR1cm4gQm9vbGVhbihjb250ZW50VHlwZSAhPSBudWxsICYmIGNvbnRlbnRUeXBlLm1hdGNoKC9eYXBwbGljYXRpb25cXC9qc29uKDsuKik/JC9pKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENob29zZXMgYSBjb250ZW50IHR5cGUgZnJvbSB0aGUgZ2l2ZW4gYXJyYXksIHdpdGggSlNPTiBwcmVmZXJyZWQ7IGkuZS4gcmV0dXJuIEpTT04gaWYgaW5jbHVkZWQsIG90aGVyd2lzZSByZXR1cm4gdGhlIGZpcnN0LlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBjb250ZW50VHlwZXNcbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGNob3NlbiBjb250ZW50IHR5cGUsIHByZWZlcnJpbmcgSlNPTi5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmpzb25QcmVmZXJyZWRNaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGVzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250ZW50VHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmlzSnNvbk1pbWUoY29udGVudFR5cGVzW2ldKSkge1xuICAgICAgICByZXR1cm4gY29udGVudFR5cGVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29udGVudFR5cGVzWzBdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gcGFyYW1ldGVyIHZhbHVlIHJlcHJlc2VudHMgZmlsZS1saWtlIGNvbnRlbnQuXG4gICAqIEBwYXJhbSBwYXJhbSBUaGUgcGFyYW1ldGVyIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgPGNvZGU+cGFyYW08L2NvZGU+IHJlcHJlc2VudHMgYSBmaWxlLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuaXNGaWxlUGFyYW0gPSBmdW5jdGlvbihwYXJhbSkge1xuICAgIC8vIGZzLlJlYWRTdHJlYW0gaW4gTm9kZS5qcyBhbmQgRWxlY3Ryb24gKGJ1dCBub3QgaW4gcnVudGltZSBsaWtlIGJyb3dzZXJpZnkpXG4gICAgaWYgKHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgZnM7XG4gICAgICB0cnkge1xuICAgICAgICBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHt9XG4gICAgICBpZiAoZnMgJiYgZnMuUmVhZFN0cmVhbSAmJiBwYXJhbSBpbnN0YW5jZW9mIGZzLlJlYWRTdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEJ1ZmZlciBpbiBOb2RlLmpzXG4gICAgaWYgKHR5cGVvZiBCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCdWZmZXIpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLyBCbG9iIGluIGJyb3dzZXJcbiAgICBpZiAodHlwZW9mIEJsb2IgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRmlsZSBpbiBicm93c2VyIChpdCBzZWVtcyBGaWxlIG9iamVjdCBpcyBhbHNvIGluc3RhbmNlIG9mIEJsb2IsIGJ1dCBrZWVwIHRoaXMgZm9yIHNhZmUpXG4gICAgaWYgKHR5cGVvZiBGaWxlID09PSAnZnVuY3Rpb24nICYmIHBhcmFtIGluc3RhbmNlb2YgRmlsZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvKipcbiAgICogTm9ybWFsaXplcyBwYXJhbWV0ZXIgdmFsdWVzOlxuICAgKiA8dWw+XG4gICAqIDxsaT5yZW1vdmUgbmlsczwvbGk+XG4gICAqIDxsaT5rZWVwIGZpbGVzIGFuZCBhcnJheXM8L2xpPlxuICAgKiA8bGk+Zm9ybWF0IHRvIHN0cmluZyB3aXRoIGBwYXJhbVRvU3RyaW5nYCBmb3Igb3RoZXIgY2FzZXM8L2xpPlxuICAgKiA8L3VsPlxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBwYXJhbXMgVGhlIHBhcmFtZXRlcnMgYXMgb2JqZWN0IHByb3BlcnRpZXMuXG4gICAqIEByZXR1cm5zIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gbm9ybWFsaXplZCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUubm9ybWFsaXplUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIG5ld1BhcmFtcyA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHtcbiAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBwYXJhbXNba2V5XSAhPSB1bmRlZmluZWQgJiYgcGFyYW1zW2tleV0gIT0gbnVsbCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbXNba2V5XTtcbiAgICAgICAgaWYgKHRoaXMuaXNGaWxlUGFyYW0odmFsdWUpIHx8IEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgbmV3UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdQYXJhbXNba2V5XSA9IHRoaXMucGFyYW1Ub1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld1BhcmFtcztcbiAgfTtcblxuICAvKipcbiAgICogRW51bWVyYXRpb24gb2YgY29sbGVjdGlvbiBmb3JtYXQgc2VwYXJhdG9yIHN0cmF0ZWdpZXMuXG4gICAqIEBlbnVtIHtTdHJpbmd9XG4gICAqIEByZWFkb25seVxuICAgKi9cbiAgZXhwb3J0cy5Db2xsZWN0aW9uRm9ybWF0RW51bSA9IHtcbiAgICAvKipcbiAgICAgKiBDb21tYS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+Y3N2PC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIENTVjogJywnLFxuICAgIC8qKlxuICAgICAqIFNwYWNlLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5zc3Y8L2NvZGU+XG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgU1NWOiAnICcsXG4gICAgLyoqXG4gICAgICogVGFiLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT50c3Y8L2NvZGU+XG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgVFNWOiAnXFx0JyxcbiAgICAvKipcbiAgICAgKiBQaXBlKHwpLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5waXBlczwvY29kZT5cbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBQSVBFUzogJ3wnLFxuICAgIC8qKlxuICAgICAqIE5hdGl2ZSBhcnJheS4gVmFsdWU6IDxjb2RlPm11bHRpPC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIE1VTFRJOiAnbXVsdGknXG4gIH07XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBhcnJheS10eXBlIGFjdHVhbCBwYXJhbWV0ZXIsIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gY29sbGVjdGlvbiBmb3JtYXQuXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtIEFuIGFycmF5IHBhcmFtZXRlci5cbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50LkNvbGxlY3Rpb25Gb3JtYXRFbnVtfSBjb2xsZWN0aW9uRm9ybWF0IFRoZSBhcnJheSBlbGVtZW50IHNlcGFyYXRvciBzdHJhdGVneS5cbiAgICogQHJldHVybnMge1N0cmluZ3xBcnJheX0gQSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHN1cHBsaWVkIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBzcGVjaWZpZWQgZGVsaW1pdGVyLiBSZXR1cm5zXG4gICAqIDxjb2RlPnBhcmFtPC9jb2RlPiBhcyBpcyBpZiA8Y29kZT5jb2xsZWN0aW9uRm9ybWF0PC9jb2RlPiBpcyA8Y29kZT5tdWx0aTwvY29kZT4uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5idWlsZENvbGxlY3Rpb25QYXJhbSA9IGZ1bmN0aW9uIGJ1aWxkQ29sbGVjdGlvblBhcmFtKHBhcmFtLCBjb2xsZWN0aW9uRm9ybWF0KSB7XG4gICAgaWYgKHBhcmFtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBzd2l0Y2ggKGNvbGxlY3Rpb25Gb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2Nzdic6XG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCcsJyk7XG4gICAgICBjYXNlICdzc3YnOlxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignICcpO1xuICAgICAgY2FzZSAndHN2JzpcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpLmpvaW4oJ1xcdCcpO1xuICAgICAgY2FzZSAncGlwZXMnOlxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignfCcpO1xuICAgICAgY2FzZSAnbXVsdGknOlxuICAgICAgICAvLyByZXR1cm4gdGhlIGFycmF5IGRpcmVjdGx5IGFzIFN1cGVyQWdlbnQgd2lsbCBoYW5kbGUgaXQgYXMgZXhwZWN0ZWRcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNvbGxlY3Rpb24gZm9ybWF0OiAnICsgY29sbGVjdGlvbkZvcm1hdCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBsaWVzIGF1dGhlbnRpY2F0aW9uIGhlYWRlcnMgdG8gdGhlIHJlcXVlc3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IFRoZSByZXF1ZXN0IG9iamVjdCBjcmVhdGVkIGJ5IGEgPGNvZGU+c3VwZXJhZ2VudCgpPC9jb2RlPiBjYWxsLlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBhdXRoTmFtZXMgQW4gYXJyYXkgb2YgYXV0aGVudGljYXRpb24gbWV0aG9kIG5hbWVzLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuYXBwbHlBdXRoVG9SZXF1ZXN0ID0gZnVuY3Rpb24ocmVxdWVzdCwgYXV0aE5hbWVzKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBhdXRoTmFtZXMuZm9yRWFjaChmdW5jdGlvbihhdXRoTmFtZSkge1xuICAgICAgdmFyIGF1dGggPSBfdGhpcy5hdXRoZW50aWNhdGlvbnNbYXV0aE5hbWVdO1xuICAgICAgc3dpdGNoIChhdXRoLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnYmFzaWMnOlxuICAgICAgICAgIGlmIChhdXRoLnVzZXJuYW1lIHx8IGF1dGgucGFzc3dvcmQpIHtcbiAgICAgICAgICAgIHJlcXVlc3QuYXV0aChhdXRoLnVzZXJuYW1lIHx8ICcnLCBhdXRoLnBhc3N3b3JkIHx8ICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2FwaUtleSc6XG4gICAgICAgICAgaWYgKGF1dGguYXBpS2V5KSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICAgICAgaWYgKGF1dGguYXBpS2V5UHJlZml4KSB7XG4gICAgICAgICAgICAgIGRhdGFbYXV0aC5uYW1lXSA9IGF1dGguYXBpS2V5UHJlZml4ICsgJyAnICsgYXV0aC5hcGlLZXk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkYXRhW2F1dGgubmFtZV0gPSBhdXRoLmFwaUtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdXRoWydpbiddID09PSAnaGVhZGVyJykge1xuICAgICAgICAgICAgICByZXF1ZXN0LnNldChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlcXVlc3QucXVlcnkoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdvYXV0aDInOlxuICAgICAgICAgIGlmIChhdXRoLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICByZXF1ZXN0LnNldCh7J0F1dGhvcml6YXRpb24nOiAnQmVhcmVyICcgKyBhdXRoLmFjY2Vzc1Rva2VufSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBhdXRoZW50aWNhdGlvbiB0eXBlOiAnICsgYXV0aC50eXBlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogRGVzZXJpYWxpemVzIGFuIEhUVFAgcmVzcG9uc2UgYm9keSBpbnRvIGEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgQSBTdXBlckFnZW50IHJlc3BvbnNlIG9iamVjdC5cbiAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5LjxTdHJpbmc+fE9iamVjdC48U3RyaW5nLCBPYmplY3Q+fEZ1bmN0aW9uKX0gcmV0dXJuVHlwZSBUaGUgdHlwZSB0byByZXR1cm4uIFBhc3MgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlc1xuICAgKiBvciB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIGEgY29tcGxleCB0eXBlLiBQYXNzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHR5cGUgbmFtZSB0byByZXR1cm4gYW4gYXJyYXkgb2YgdGhhdCB0eXBlLiBUb1xuICAgKiByZXR1cm4gYW4gb2JqZWN0LCBwYXNzIGFuIG9iamVjdCB3aXRoIG9uZSBwcm9wZXJ0eSB3aG9zZSBuYW1lIGlzIHRoZSBrZXkgdHlwZSBhbmQgd2hvc2UgdmFsdWUgaXMgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWUgdHlwZTpcbiAgICogYWxsIHByb3BlcnRpZXMgb24gPGNvZGU+ZGF0YTxjb2RlPiB3aWxsIGJlIGNvbnZlcnRlZCB0byB0aGlzIHR5cGUuXG4gICAqIEByZXR1cm5zIEEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiBkZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSkge1xuICAgIGlmIChyZXNwb25zZSA9PSBudWxsIHx8IHJldHVyblR5cGUgPT0gbnVsbCB8fCByZXNwb25zZS5zdGF0dXMgPT0gMjA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gUmVseSBvbiBTdXBlckFnZW50IGZvciBwYXJzaW5nIHJlc3BvbnNlIGJvZHkuXG4gICAgLy8gU2VlIGh0dHA6Ly92aXNpb25tZWRpYS5naXRodWIuaW8vc3VwZXJhZ2VudC8jcGFyc2luZy1yZXNwb25zZS1ib2RpZXNcbiAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmJvZHk7XG4gICAgaWYgKGRhdGEgPT0gbnVsbCB8fCAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIHR5cGVvZiBkYXRhLmxlbmd0aCA9PT0gJ3VuZGVmaW5lZCcgJiYgIU9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCkpIHtcbiAgICAgIC8vIFN1cGVyQWdlbnQgZG9lcyBub3QgYWx3YXlzIHByb2R1Y2UgYSBib2R5OyB1c2UgdGhlIHVucGFyc2VkIHJlc3BvbnNlIGFzIGEgZmFsbGJhY2tcbiAgICAgIGRhdGEgPSByZXNwb25zZS50ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGEsIHJldHVyblR5cGUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICogQGNhbGxiYWNrIG1vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAqIEBwYXJhbSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICovXG5cbiAgLyoqXG4gICAqIEludm9rZXMgdGhlIFJFU1Qgc2VydmljZSB1c2luZyB0aGUgc3VwcGxpZWQgc2V0dGluZ3MgYW5kIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBiYXNlIFVSTCB0byBpbnZva2UuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodHRwTWV0aG9kIFRoZSBIVFRQIG1ldGhvZCB0byB1c2UuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIFN0cmluZz59IHBhdGhQYXJhbXMgQSBtYXAgb2YgcGF0aCBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IHF1ZXJ5UGFyYW1zIEEgbWFwIG9mIHF1ZXJ5IHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gY29sbGVjdGlvblF1ZXJ5UGFyYW1zIEEgbWFwIG9mIGNvbGxlY3Rpb24gcXVlcnkgcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBoZWFkZXJQYXJhbXMgQSBtYXAgb2YgaGVhZGVyIHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gZm9ybVBhcmFtcyBBIG1hcCBvZiBmb3JtIHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3R9IGJvZHlQYXJhbSBUaGUgdmFsdWUgdG8gcGFzcyBhcyB0aGUgcmVxdWVzdCBib2R5LlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBhdXRoTmFtZXMgQW4gYXJyYXkgb2YgYXV0aGVudGljYXRpb24gdHlwZSBuYW1lcy5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gY29udGVudFR5cGVzIEFuIGFycmF5IG9mIHJlcXVlc3QgTUlNRSB0eXBlcy5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYWNjZXB0cyBBbiBhcnJheSBvZiBhY2NlcHRhYmxlIHJlc3BvbnNlIE1JTUUgdHlwZXMuXG4gICAqIEBwYXJhbSB7KFN0cmluZ3xBcnJheXxPYmplY3RGdW5jdGlvbil9IHJldHVyblR5cGUgVGhlIHJlcXVpcmVkIHR5cGUgdG8gcmV0dXJuOyBjYW4gYmUgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlcyBvciB0aGVcbiAgICogY29uc3RydWN0b3IgZm9yIGEgY29tcGxleCB0eXBlLlxuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBTdXBlckFnZW50IHJlcXVlc3Qgb2JqZWN0LlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuY2FsbEFwaSA9IGZ1bmN0aW9uIGNhbGxBcGkocGF0aCwgaHR0cE1ldGhvZCwgcGF0aFBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBib2R5UGFyYW0sIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5UeXBlLCBjYWxsYmFjaykge1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgdXJsID0gdGhpcy5idWlsZFVybChwYXRoLCBwYXRoUGFyYW1zKTtcbiAgICB2YXIgcmVxdWVzdCA9IHN1cGVyYWdlbnQoaHR0cE1ldGhvZCwgdXJsKTtcblxuICAgIC8vIGFwcGx5IGF1dGhlbnRpY2F0aW9uc1xuICAgIHRoaXMuYXBwbHlBdXRoVG9SZXF1ZXN0KHJlcXVlc3QsIGF1dGhOYW1lcyk7XG5cbiAgICAgIC8vIHNldCBjb2xsZWN0aW9uIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgIGZvciAodmFyIGtleSBpbiBjb2xsZWN0aW9uUXVlcnlQYXJhbXMpIHtcbiAgICAgICAgICBpZiAoY29sbGVjdGlvblF1ZXJ5UGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgdmFyIHBhcmFtID0gY29sbGVjdGlvblF1ZXJ5UGFyYW1zW2tleV07XG4gICAgICAgICAgICAgIGlmIChwYXJhbS5jb2xsZWN0aW9uRm9ybWF0ID09PSAnY3N2Jykge1xuICAgICAgICAgICAgICAgICAgLy8gU3VwZXJBZ2VudCBub3JtYWxseSBwZXJjZW50LWVuY29kZXMgYWxsIHJlc2VydmVkIGNoYXJhY3RlcnMgaW4gYSBxdWVyeSBwYXJhbWV0ZXIuIEhvd2V2ZXIsXG4gICAgICAgICAgICAgICAgICAvLyBjb21tYXMgYXJlIHVzZWQgYXMgZGVsaW1pdGVycyBmb3IgdGhlICdjc3YnIGNvbGxlY3Rpb25Gb3JtYXQgc28gdGhleSBtdXN0IG5vdCBiZSBlbmNvZGVkLiBXZVxuICAgICAgICAgICAgICAgICAgLy8gbXVzdCB0aGVyZWZvcmUgY29uc3RydWN0IGFuZCBlbmNvZGUgJ2NzdicgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzIG1hbnVhbGx5LlxuICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtLnZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbS52YWx1ZS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKCcsJyk7XG4gICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdC5xdWVyeShlbmNvZGVVUklDb21wb25lbnQoa2V5KSArIFwiPVwiICsgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gQWxsIG90aGVyIGNvbGxlY3Rpb24gcXVlcnkgcGFyYW1ldGVycyBzaG91bGQgYmUgdHJlYXRlZCBhcyBvcmRpbmFyeSBxdWVyeSBwYXJhbWV0ZXJzLlxuICAgICAgICAgICAgICAgICAgcXVlcnlQYXJhbXNba2V5XSA9IHRoaXMuYnVpbGRDb2xsZWN0aW9uUGFyYW0ocGFyYW0udmFsdWUsIHBhcmFtLmNvbGxlY3Rpb25Gb3JtYXQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgLy8gc2V0IHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICBpZiAoaHR0cE1ldGhvZC50b1VwcGVyQ2FzZSgpID09PSAnR0VUJyAmJiB0aGlzLmNhY2hlID09PSBmYWxzZSkge1xuICAgICAgICBxdWVyeVBhcmFtc1snXyddID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuICAgIHJlcXVlc3QucXVlcnkodGhpcy5ub3JtYWxpemVQYXJhbXMocXVlcnlQYXJhbXMpKTtcblxuICAgIC8vIHNldCBoZWFkZXIgcGFyYW1ldGVyc1xuICAgIHJlcXVlc3Quc2V0KHRoaXMuZGVmYXVsdEhlYWRlcnMpLnNldCh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhoZWFkZXJQYXJhbXMpKTtcblxuXG4gICAgICAvLyBzZXQgcmVxdWVzdEFnZW50IGlmIGl0IGlzIHNldCBieSB1c2VyXG4gICAgICBpZiAodGhpcy5yZXF1ZXN0QWdlbnQpIHtcbiAgICAgICAgICByZXF1ZXN0LmFnZW50KHRoaXMucmVxdWVzdEFnZW50KTtcbiAgICAgIH1cblxuICAgIC8vIHNldCByZXF1ZXN0IHRpbWVvdXRcbiAgICByZXF1ZXN0LnRpbWVvdXQodGhpcy50aW1lb3V0KTtcblxuICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuanNvblByZWZlcnJlZE1pbWUoY29udGVudFR5cGVzKTtcbiAgICBpZiAoY29udGVudFR5cGUpIHtcbiAgICAgIC8vIElzc3VlIHdpdGggc3VwZXJhZ2VudCBhbmQgbXVsdGlwYXJ0L2Zvcm0tZGF0YSAoaHR0cHM6Ly9naXRodWIuY29tL3Zpc2lvbm1lZGlhL3N1cGVyYWdlbnQvaXNzdWVzLzc0NilcbiAgICAgIGlmKGNvbnRlbnRUeXBlICE9ICdtdWx0aXBhcnQvZm9ybS1kYXRhJykge1xuICAgICAgICByZXF1ZXN0LnR5cGUoY29udGVudFR5cGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXJlcXVlc3QuaGVhZGVyWydDb250ZW50LVR5cGUnXSkge1xuICAgICAgcmVxdWVzdC50eXBlKCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRlbnRUeXBlID09PSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykge1xuICAgICAgcmVxdWVzdC5zZW5kKHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeSh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhmb3JtUGFyYW1zKSkpO1xuICAgIH0gZWxzZSBpZiAoY29udGVudFR5cGUgPT0gJ211bHRpcGFydC9mb3JtLWRhdGEnKSB7XG4gICAgICB2YXIgX2Zvcm1QYXJhbXMgPSB0aGlzLm5vcm1hbGl6ZVBhcmFtcyhmb3JtUGFyYW1zKTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBfZm9ybVBhcmFtcykge1xuICAgICAgICBpZiAoX2Zvcm1QYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0aGlzLmlzRmlsZVBhcmFtKF9mb3JtUGFyYW1zW2tleV0pKSB7XG4gICAgICAgICAgICAvLyBmaWxlIGZpZWxkXG4gICAgICAgICAgICByZXF1ZXN0LmF0dGFjaChrZXksIF9mb3JtUGFyYW1zW2tleV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXF1ZXN0LmZpZWxkKGtleSwgX2Zvcm1QYXJhbXNba2V5XSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChib2R5UGFyYW0pIHtcbiAgICAgIHJlcXVlc3Quc2VuZChib2R5UGFyYW0pO1xuICAgIH1cblxuICAgIHZhciBhY2NlcHQgPSB0aGlzLmpzb25QcmVmZXJyZWRNaW1lKGFjY2VwdHMpO1xuICAgIGlmIChhY2NlcHQpIHtcbiAgICAgIHJlcXVlc3QuYWNjZXB0KGFjY2VwdCk7XG4gICAgfVxuXG4gICAgaWYgKHJldHVyblR5cGUgPT09ICdCbG9iJykge1xuICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUoJ2Jsb2InKTtcbiAgICB9IGVsc2UgaWYgKHJldHVyblR5cGUgPT09ICdTdHJpbmcnKSB7XG4gICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSgnc3RyaW5nJyk7XG4gICAgfVxuXG4gICAgLy8gQXR0YWNoIHByZXZpb3VzbHkgc2F2ZWQgY29va2llcywgaWYgZW5hYmxlZFxuICAgIGlmICh0aGlzLmVuYWJsZUNvb2tpZXMpe1xuICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRoaXMuYWdlbnQuYXR0YWNoQ29va2llcyhyZXF1ZXN0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXF1ZXN0LndpdGhDcmVkZW50aWFscygpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgcmVxdWVzdC5lbmQoZnVuY3Rpb24oZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGRhdGEgPSBudWxsO1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRhdGEgPSBfdGhpcy5kZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSk7XG4gICAgICAgICAgICBpZiAoX3RoaXMuZW5hYmxlQ29va2llcyAmJiB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICAgIF90aGlzLmFnZW50LnNhdmVDb29raWVzKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlcXVlc3Q7XG4gIH07XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbiBJU08tODYwMSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBkYXRlIHZhbHVlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSBkYXRlIHZhbHVlIGFzIGEgc3RyaW5nLlxuICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIHBhcnNlZCBkYXRlIG9iamVjdC5cbiAgICovXG4gIGV4cG9ydHMucGFyc2VEYXRlID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHN0ci5yZXBsYWNlKC9UL2ksICcgJykpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHZhbHVlIHRvIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAgICogQHBhcmFtIHsoU3RyaW5nfE9iamVjdCl9IGRhdGEgVGhlIGRhdGEgdG8gY29udmVydCwgYXMgYSBzdHJpbmcgb3Igb2JqZWN0LlxuICAgKiBAcGFyYW0geyhTdHJpbmd8QXJyYXkuPFN0cmluZz58T2JqZWN0LjxTdHJpbmcsIE9iamVjdD58RnVuY3Rpb24pfSB0eXBlIFRoZSB0eXBlIHRvIHJldHVybi4gUGFzcyBhIHN0cmluZyBmb3Igc2ltcGxlIHR5cGVzXG4gICAqIG9yIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgYSBjb21wbGV4IHR5cGUuIFBhc3MgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgdHlwZSBuYW1lIHRvIHJldHVybiBhbiBhcnJheSBvZiB0aGF0IHR5cGUuIFRvXG4gICAqIHJldHVybiBhbiBvYmplY3QsIHBhc3MgYW4gb2JqZWN0IHdpdGggb25lIHByb3BlcnR5IHdob3NlIG5hbWUgaXMgdGhlIGtleSB0eXBlIGFuZCB3aG9zZSB2YWx1ZSBpcyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSB0eXBlOlxuICAgKiBhbGwgcHJvcGVydGllcyBvbiA8Y29kZT5kYXRhPGNvZGU+IHdpbGwgYmUgY29udmVydGVkIHRvIHRoaXMgdHlwZS5cbiAgICogQHJldHVybnMgQW4gaW5zdGFuY2Ugb2YgdGhlIHNwZWNpZmllZCB0eXBlIG9yIG51bGwgb3IgdW5kZWZpbmVkIGlmIGRhdGEgaXMgbnVsbCBvciB1bmRlZmluZWQuXG4gICAqL1xuICBleHBvcnRzLmNvbnZlcnRUb1R5cGUgPSBmdW5jdGlvbihkYXRhLCB0eXBlKSB7XG4gICAgaWYgKGRhdGEgPT09IG51bGwgfHwgZGF0YSA9PT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIGRhdGFcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnQm9vbGVhbic6XG4gICAgICAgIHJldHVybiBCb29sZWFuKGRhdGEpO1xuICAgICAgY2FzZSAnSW50ZWdlcic6XG4gICAgICAgIHJldHVybiBwYXJzZUludChkYXRhLCAxMCk7XG4gICAgICBjYXNlICdOdW1iZXInOlxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChkYXRhKTtcbiAgICAgIGNhc2UgJ1N0cmluZyc6XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEYXRlKFN0cmluZyhkYXRhKSk7XG4gICAgICBjYXNlICdCbG9iJzpcbiAgICAgIFx0cmV0dXJuIGRhdGE7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAodHlwZSA9PT0gT2JqZWN0KSB7XG4gICAgICAgICAgLy8gZ2VuZXJpYyBvYmplY3QsIHJldHVybiBkaXJlY3RseVxuICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gZm9yIG1vZGVsIHR5cGUgbGlrZTogVXNlclxuICAgICAgICAgIHJldHVybiB0eXBlLmNvbnN0cnVjdEZyb21PYmplY3QoZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0eXBlKSkge1xuICAgICAgICAgIC8vIGZvciBhcnJheSB0eXBlIGxpa2U6IFsnU3RyaW5nJ11cbiAgICAgICAgICB2YXIgaXRlbVR5cGUgPSB0eXBlWzBdO1xuICAgICAgICAgIHJldHVybiBkYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGl0ZW0sIGl0ZW1UeXBlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAvLyBmb3IgcGxhaW4gb2JqZWN0IHR5cGUgbGlrZTogeydTdHJpbmcnOiAnSW50ZWdlcid9XG4gICAgICAgICAgdmFyIGtleVR5cGUsIHZhbHVlVHlwZTtcbiAgICAgICAgICBmb3IgKHZhciBrIGluIHR5cGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgIGtleVR5cGUgPSBrO1xuICAgICAgICAgICAgICB2YWx1ZVR5cGUgPSB0eXBlW2tdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgICAgIGZvciAodmFyIGsgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgdmFyIGtleSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShrLCBrZXlUeXBlKTtcbiAgICAgICAgICAgICAgdmFyIHZhbHVlID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGFba10sIHZhbHVlVHlwZSk7XG4gICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZm9yIHVua25vd24gdHlwZSwgcmV0dXJuIHRoZSBkYXRhIGRpcmVjdGx5XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgbWFwIG9yIGFycmF5IG1vZGVsIGZyb20gUkVTVCBkYXRhLlxuICAgKiBAcGFyYW0gZGF0YSB7T2JqZWN0fEFycmF5fSBUaGUgUkVTVCBkYXRhLlxuICAgKiBAcGFyYW0gb2JqIHtPYmplY3R8QXJyYXl9IFRoZSB0YXJnZXQgb2JqZWN0IG9yIGFycmF5LlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqLCBpdGVtVHlwZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaSkpXG4gICAgICAgICAgb2JqW2ldID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGFbaV0sIGl0ZW1UeXBlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgayBpbiBkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGspKVxuICAgICAgICAgIG9ialtrXSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2tdLCBpdGVtVHlwZSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uLlxuICAgKiBAdHlwZSB7bW9kdWxlOkFwaUNsaWVudH1cbiAgICovXG4gIGV4cG9ydHMuaW5zdGFuY2UgPSBuZXcgZXhwb3J0cygpO1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1BhcmFtZXRlckxpc3QnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL1BhcmFtZXRlckxpc3QnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5CdWlsZEFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5QYXJhbWV0ZXJMaXN0KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBhcmFtZXRlckxpc3QpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBCdWlsZCBzZXJ2aWNlLlxuICAgKiBAbW9kdWxlIGFwaS9CdWlsZEFwaVxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBCdWlsZEFwaS4gXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL0J1aWxkQXBpXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGJ1aWxkQU5OIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9CdWlsZEFwaX5idWlsZEFOTkNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBwYXNzZXMgYWxsIGxlYXJuaW5nIGFuZCBBTk4gcGFyYW1ldGVycyB0byB0aGUgc2VydmVyXG4gICAgICogSW5jbHVkZXMgbGVhcm5pbmcgcGFyYW1ldGVycyBhbmQgQU5OIHRvcG9sb2d5XG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gaW5wdXRQYXJhbWV0ZXJzIG9iamVjdCB3aXRoIGFsbCB0dW5hYmxlIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+YnVpbGRBTk5DYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLmJ1aWxkQU5OID0gZnVuY3Rpb24oaW5wdXRQYXJhbWV0ZXJzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gaW5wdXRQYXJhbWV0ZXJzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJzJyBpcyBzZXRcbiAgICAgIGlmIChpbnB1dFBhcmFtZXRlcnMgPT09IHVuZGVmaW5lZCB8fCBpbnB1dFBhcmFtZXRlcnMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlcnMnIHdoZW4gY2FsbGluZyBidWlsZEFOTlwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvYnVpbGQvYnVpbGRBTk4nLCAnUE9TVCcsXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgICAvKipcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0QU5OUGFyYW1ldGVyIG9wZXJhdGlvbi5cbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0J1aWxkQXBpfmdldEFOTlBhcmFtZXRlckNhbGxiYWNrXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAgICovXG5cbiAgICAgIC8qKlxuICAgICAgICogcmV0dXJucyB0aGUgcGFyYW1ldGVyIHNldCBvZiB0aGUgY3JlYXRlZCBBTk5cbiAgICAgICAqIHJldHVybnMgYSBvYmplY3Qgb2YgdHlwZSBQYXJhbWV0ZXJMaXN0XG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+Z2V0QU5OUGFyYW1ldGVyQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH1cbiAgICAgICAqL1xuICAgICAgdGhpcy5nZXRBTk5QYXJhbWV0ZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFBhcmFtZXRlckxpc3Q7XG5cbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgJy9idWlsZC9nZXRBTk5QYXJhbWV0ZXInLCAnR0VUJyxcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgKTtcbiAgICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW5wdXRTaGFwZSBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvQnVpbGRBcGl+Z2V0SW5wdXRTaGFwZUNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge0FycmF5LjwnTnVtYmVyJz59IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHRoZSBpbnB1dCBzaGFwZSBvZiB0aGUgdHJhaW4gZGF0YVxuICAgICAqIHJldHVybnMgdGhlIGlucHV0IHNoYXBlIG9mIHRoZSB0cmFpbiBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgb2YgdGhlIGRhdGFzZXQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+Z2V0SW5wdXRTaGFwZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIEFycmF5LjwnTnVtYmVyJz59XG4gICAgICovXG4gICAgdGhpcy5nZXRJbnB1dFNoYXBlID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICAgJ2RhdGFzZXRfbmFtZSc6IG9wdHNbJ2RhdGFzZXROYW1lJ10sXG4gICAgICB9O1xuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ051bWJlciddO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9idWlsZC9nZXRJbnB1dFNoYXBlJywgJ0dFVCcsXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZURhdGEnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL0ltYWdlRGF0YScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxvYWRBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2VEYXRhKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIEltYWdlRGF0YSkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIExvYWQgc2VydmljZS5cbiAgICogQG1vZHVsZSBhcGkvTG9hZEFwaVxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBMb2FkQXBpLiBcbiAgICogQGFsaWFzIG1vZHVsZTphcGkvTG9hZEFwaVxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZUJhdGNoIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQmF0Y2hDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgbmV4dCBiYXRjaCBvZiBpbnB1dC9vdXRwdXQgaW1hZ2VzXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuYmF0Y2hTaXplIGRlZmluZXMgdGhlIG51bWJlciBvZiByZXR1cm4gaW1hZ2VzIChkZWZhdWx0IHRvIDEwMClcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJhdGNoQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEltYWdlQmF0Y2ggPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2JhdGNoX3NpemUnOiBvcHRzWydiYXRjaFNpemUnXSxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxuICAgICAgICAgICdvdXRwdXQnOiBvcHRzWydvdXRwdXQnXSxcbiAgICAgIH07XG4gICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRJbWFnZUJhdGNoJywgJ0dFVCcsXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW1hZ2VCeUlkIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQnlJZENhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgc2luZ2xlIGlucHV0L291dHB1dCBpbWFnZVxuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkIGRlZmluZXMgdGhlIGlkIG9mIHRoZSBpbWFnZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuc29ydEJ5IGRlZmluZXMgdGhlIHNvcnRpbmcgb2YgdGhlIGlucHV0IGltYWdlc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VCeUlkQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEltYWdlQnlJZCA9IGZ1bmN0aW9uKGlkLCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaWQnIGlzIHNldFxuICAgICAgaWYgKGlkID09PSB1bmRlZmluZWQgfHwgaWQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpZCcgd2hlbiBjYWxsaW5nIGdldEltYWdlQnlJZFwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdpZCc6IGlkLFxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgICAnc29ydF9ieSc6IG9wdHNbJ3NvcnRCeSddLFxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXG4gICAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldEltYWdlQnlJZCcsICdHRVQnLFxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEltYWdlcyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZXNDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiBpbnB1dC9vdXRwdXQgaW1hZ2VzXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gc3RhcnRJZHggbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGVuZElkeCBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuc29ydEJ5IGRlZmluZXMgdGhlIHNvcnRpbmcgb2YgdGhlIGlucHV0IGltYWdlc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEltYWdlcyA9IGZ1bmN0aW9uKHN0YXJ0SWR4LCBlbmRJZHgsIG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzdGFydElkeCcgaXMgc2V0XG4gICAgICBpZiAoc3RhcnRJZHggPT09IHVuZGVmaW5lZCB8fCBzdGFydElkeCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3N0YXJ0SWR4JyB3aGVuIGNhbGxpbmcgZ2V0SW1hZ2VzXCIpO1xuICAgICAgfVxuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZW5kSWR4JyBpcyBzZXRcbiAgICAgIGlmIChlbmRJZHggPT09IHVuZGVmaW5lZCB8fCBlbmRJZHggPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdlbmRJZHgnIHdoZW4gY2FsbGluZyBnZXRJbWFnZXNcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnc3RhcnRfaWR4Jzogc3RhcnRJZHgsXG4gICAgICAgICdlbmRfaWR4JzogZW5kSWR4LFxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgICAnc29ydF9ieSc6IG9wdHNbJ3NvcnRCeSddLFxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXG4gICAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldEltYWdlcycsICdHRVQnLFxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFJhbmRvbUltYWdlcyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgbmV4dCBiYXRjaCBvZiBpbnB1dC9vdXRwdXQgaW1hZ2VzXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuYmF0Y2hTaXplIGRlZmluZXMgdGhlIG51bWJlciBvZiByZXR1cm4gaW1hZ2VzIChkZWZhdWx0IHRvIDEwMClcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0UmFuZG9tSW1hZ2VzID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdiYXRjaF9zaXplJzogb3B0c1snYmF0Y2hTaXplJ10sXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcbiAgICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXG4gICAgICB9O1xuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvZ2V0UmFuZG9tSW1hZ2VzJywgJ0dFVCcsXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgbG9hZEZpbGUgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+bG9hZEZpbGVDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogTG9hZCBhIHRyYWluL3Rlc3QgZGF0YSBmaWxlXG4gICAgICogTG9hZCBhIGRhdGEgZmlsZSBpbiBkaWZmZXJlbnQgZGF0YSBmb3JtYXRzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGZpbGVuYW1lIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMucmVhZExhYmVscyB0cnVlIHRvIHJlYWQgbGFiZWxzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFUeXBlIGRldGVybWluZXMgdGhlIGRhdGEgZm9ybWF0IG9mIHRoZSBpbnB1dCBmaWxlIChkZWZhdWx0IHRvIGF1dG8pXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+bG9hZEZpbGVDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLmxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZW5hbWUsIG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdmaWxlbmFtZScgaXMgc2V0XG4gICAgICBpZiAoZmlsZW5hbWUgPT09IHVuZGVmaW5lZCB8fCBmaWxlbmFtZSA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2ZpbGVuYW1lJyB3aGVuIGNhbGxpbmcgbG9hZEZpbGVcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnZmlsZW5hbWUnOiBmaWxlbmFtZSxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgJ3JlYWRfbGFiZWxzJzogb3B0c1sncmVhZExhYmVscyddLFxuICAgICAgICAgICdkYXRhX3R5cGUnOiBvcHRzWydkYXRhVHlwZSddLFxuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9sb2FkRmlsZScsICdQT1NUJyxcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSByZXNldEFsbEJhdGNoSW5kaWNlcyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5yZXNldEFsbEJhdGNoSW5kaWNlc0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXNldHMgYWxsIGJhdGNoIGluZGljZXMgb2YgYWxsIGltYWdlIHNldHNcbiAgICAgKiByZXNldHMgYWxsIGJhdGNoIGluZGljZXMgb2YgYWxsIGltYWdlIHNldHNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5yZXNldEFsbEJhdGNoSW5kaWNlc0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMucmVzZXRBbGxCYXRjaEluZGljZXMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9yZXNldEFsbEJhdGNoSW5kaWNlcycsICdQT1NUJyxcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSByZXNldEJhdGNoSW5kZXggb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+cmVzZXRCYXRjaEluZGV4Q2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJlc2V0cyB0aGUgYmF0Y2ggaW5kZXggb2YgdGhlIGltYWdlIHNldFxuICAgICAqIHJlc2V0cyB0aGUgYmF0Y2ggaW5kZXggb2YgdGhlIGltYWdlIHNldFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IHJlc2V0IG91dHB1dCBpbWFnZSBiYXRjaCBpbmRleCBpbnN0ZWFkIG9mIGlucHV0IGltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5yZXNldEJhdGNoSW5kZXhDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLnJlc2V0QmF0Y2hJbmRleCA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcbiAgICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXG4gICAgICB9O1xuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL3Jlc2V0QmF0Y2hJbmRleCcsICdQT1NUJyxcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluU3RhdHVzJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlByb2Nlc3NlZEltYWdlRGF0YSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5TdGF0dXMpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgUHJvY2Vzc2VkSW1hZ2VEYXRhLCBUcmFpblBlcmZvcm1hbmNlLCBUcmFpblN0YXR1cykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIFRyYWluIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL1RyYWluQXBpXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFRyYWluQXBpLiBcbiAgICogQGFsaWFzIG1vZHVsZTphcGkvVHJhaW5BcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgY29udHJvbFRyYWluaW5nIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5jb250cm9sVHJhaW5pbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogc3RhcnRzLCBwYXVzZXMgYW5kIHN0b3BzIHRoZSB0cmFpbmluZ1xuICAgICAqIHVzZXMgYSBzdHJpbmcgZW51bVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfSB0cmFpblN0YXR1cyBuZXcgc3RhdHVzIGZvciB0cmFpbmluZ1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UcmFpbkFwaX5jb250cm9sVHJhaW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLmNvbnRyb2xUcmFpbmluZyA9IGZ1bmN0aW9uKHRyYWluU3RhdHVzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gdHJhaW5TdGF0dXM7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgaXMgc2V0XG4gICAgICBpZiAodHJhaW5TdGF0dXMgPT09IHVuZGVmaW5lZCB8fCB0cmFpblN0YXR1cyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyB3aGVuIGNhbGxpbmcgY29udHJvbFRyYWluaW5nXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90cmFpbi9jb250cm9sVHJhaW5pbmcnLCAnUE9TVCcsXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHNldFNpemUgc2l6ZSBvZiB0aGUgaW1hZ2Ugc3Vic2V0XG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1RyYWluQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRQcm9jZXNzZWRJbWFnZURhdGEgPSBmdW5jdGlvbihzZXRTaXplLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIGlzIHNldFxuICAgICAgaWYgKHNldFNpemUgPT09IHVuZGVmaW5lZCB8fCBzZXRTaXplID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YVwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICAgJ3NldFNpemUnOiBzZXRTaXplLFxuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gUHJvY2Vzc2VkSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90cmFpbi9nZXRQcm9jZXNzZWRJbWFnZURhdGEnLCAnR0VUJyxcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUcmFpblBlcmZvcm1hbmNlIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRUcmFpblBlcmZvcm1hbmNlQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIHNjYWxhciB0cmFpbiB2YXJpYWJsZXNcbiAgICAgKiBhcyBsaXN0IG9mIGRpY3RzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1RyYWluQXBpfmdldFRyYWluUGVyZm9ybWFuY2VDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWluUGVyZm9ybWFuY2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHJhaW4vZ2V0VHJhaW5QZXJmb3JtYW5jZScsICdHRVQnLFxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUGFyYW1ldGVyTGlzdCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblN0YXR1cyddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlR1bmVBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBQYXJhbWV0ZXJMaXN0LCBQcm9jZXNzZWRJbWFnZURhdGEsIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluU3RhdHVzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogVHVuZSBzZXJ2aWNlLlxuICAgKiBAbW9kdWxlIGFwaS9UdW5lQXBpXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFR1bmVBcGkuIFxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9UdW5lQXBpXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAgIC8qKlxuICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBidWlsZEdyaWRTZWFyY2hBTk4gb3BlcmF0aW9uLlxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5idWlsZEdyaWRTZWFyY2hBTk5DYWxsYmFja1xuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAgICovXG5cbiAgICAgIC8qKlxuICAgICAgICogcGFzc2VzIGFsbCBsZWFybmluZyBhbmQgQU5OIHBhcmFtZXRlcnMgdG8gdGhlIHNlcnZlclxuICAgICAgICogSW5jbHVkZXMgbGVhcm5pbmcgcGFyYW1ldGVycyBhbmQgQU5OIHRvcG9sb2d5IGFzIGxpc3RzXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBpbnB1dFBhcmFtZXRlckxpc3RzIG9iamVjdCB3aXRoIGFsbCB0dW5hYmxlIHBhcmFtZXRlciBsaXN0c1xuICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+YnVpbGRHcmlkU2VhcmNoQU5OQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgKi9cbiAgICAgIHRoaXMuYnVpbGRHcmlkU2VhcmNoQU5OID0gZnVuY3Rpb24gKGlucHV0UGFyYW1ldGVyTGlzdHMsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gaW5wdXRQYXJhbWV0ZXJMaXN0cztcblxuICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlckxpc3RzJyBpcyBzZXRcbiAgICAgICAgICBpZiAoaW5wdXRQYXJhbWV0ZXJMaXN0cyA9PT0gdW5kZWZpbmVkIHx8IGlucHV0UGFyYW1ldGVyTGlzdHMgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlckxpc3RzJyB3aGVuIGNhbGxpbmcgYnVpbGRHcmlkU2VhcmNoQU5OXCIpO1xuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XG4gICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xuICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XG5cbiAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICAgICAgICcvdHVuZS9idWlsZEdyaWRTZWFyY2hBTk4nLCAnUE9TVCcsXG4gICAgICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgICAgICk7XG4gICAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Y29udHJvbFR1bmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHR1bmluZ1xuICAgICAqIHVzZXMgYSBzdHJpbmcgZW51bVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfSB0cmFpblN0YXR1cyBuZXcgc3RhdHVzIGZvciB0cmFpbmluZ1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmNvbnRyb2xUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLmNvbnRyb2xUdW5pbmcgPSBmdW5jdGlvbih0cmFpblN0YXR1cywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndHJhaW5TdGF0dXMnIGlzIHNldFxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgd2hlbiBjYWxsaW5nIGNvbnRyb2xUdW5pbmdcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICcvdHVuZS9jb250cm9sVHVuaW5nJywgJ1BPU1QnLFxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHNldFNpemUgc2l6ZSBvZiB0aGUgaW1hZ2Ugc3Vic2V0XG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZyA9IGZ1bmN0aW9uKHNldFNpemUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XG4gICAgICBpZiAoc2V0U2l6ZSA9PT0gdW5kZWZpbmVkIHx8IHNldFNpemUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyB3aGVuIGNhbGxpbmcgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemUsXG4gICAgICB9O1xuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBQcm9jZXNzZWRJbWFnZURhdGE7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3R1bmUvZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nQ2FsbGJhY2tcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgICAqL1xuXG4gICAgICAvKipcbiAgICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgdGhlIGN1cnJlbnQgdHJhaW4gaW1hZ2VzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBsYXRlbnQgcmVwcmVzZW50YXRpb24gYW5kIG91dHB1dFxuICAgICAgICpcbiAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxuICAgICAgICovXG4gICAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmcgPSBmdW5jdGlvbiAoc2V0U2l6ZSwgbW9kZWxJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIGlzIHNldFxuICAgICAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nXCIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcbiAgICAgICAgICBpZiAobW9kZWxJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZ1wiKTtcbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemUsXG4gICAgICAgICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFByb2Nlc3NlZEltYWdlRGF0YTtcblxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAnL3R1bmUvZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZycsICdHRVQnLFxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICAgICApO1xuICAgICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2Ygc2NhbGFyIHRyYWluIHZhcmlhYmxlc1xuICAgICAqIGFzIGxpc3Qgb2YgZGljdHNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9XG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFRyYWluUGVyZm9ybWFuY2U7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3R1bmUvZ2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZycsICdHRVQnLFxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2VPZlNwZWNpZmljVHVuaW5nIG9wZXJhdGlvbi5cbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja1xuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgICAqL1xuXG4gICAgICAvKipcbiAgICAgICAqIHJldHVybnMgdGhlIGNvbXBsZXRlIHNldCBvZiBzY2FsYXIgdHJhaW4gdmFyaWFibGVzIHRvIGEgZ2l2ZW4gbW9kZWxcbiAgICAgICAqIGFzIGxpc3Qgb2YgZGljdHNcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtb2RlbElkIG1vZGVsIGlkIG9mIHRoZSBleHNwZWN0ZWQgcGFyYW1ldGVyIHNldFxuICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxuICAgICAgICovXG4gICAgICB0aGlzLmdldFRyYWluUGVyZm9ybWFuY2VPZlNwZWNpZmljVHVuaW5nID0gZnVuY3Rpb24gKG1vZGVsSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcbiAgICAgICAgICBpZiAobW9kZWxJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdcIik7XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgJ21vZGVsSWQnOiBtb2RlbElkLFxuICAgICAgICAgIH07XG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcbiAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xuXG4gICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcblxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAgICAgICAnL3R1bmUvZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmcnLCAnR0VUJyxcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLyoqXG4gICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFR1bmVQYXJhbWV0ZXIgb3BlcmF0aW9uLlxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRUdW5lUGFyYW1ldGVyQ2FsbGJhY2tcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICAgKi9cblxuICAgICAgLyoqXG4gICAgICAgKiByZXR1cm5zIHRoZSBwYXJhbWV0ZXIgc2V0IG9mIHRoZSBBTk4gd2l0aCB0aGUgZ2l2ZW4gbW9kZWwgaWRcbiAgICAgICAqIHJldHVybnMgYSBvYmplY3Qgb2YgdHlwZSBQYXJhbWV0ZXJMaXN0XG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbW9kZWxJZCBtb2RlbCBpZCBvZiB0aGUgZXhzcGVjdGVkIHBhcmFtZXRlciBzZXRcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFR1bmVQYXJhbWV0ZXJDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fVxuICAgICAgICovXG4gICAgICB0aGlzLmdldFR1bmVQYXJhbWV0ZXIgPSBmdW5jdGlvbiAobW9kZWxJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIGlzIHNldFxuICAgICAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIHdoZW4gY2FsbGluZyBnZXRUdW5lUGFyYW1ldGVyXCIpO1xuICAgICAgICAgIH1cblxuXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcblxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFBhcmFtZXRlckxpc3Q7XG5cbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgICAgICAgJy90dW5lL2dldFR1bmVQYXJhbWV0ZXInLCAnR0VUJyxcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICAgICAgKTtcbiAgICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9DbHVzdGVyaW5nJywgJ21vZGVsL0ltYWdlJywgJ21vZGVsL1BvaW50MkQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL0NsdXN0ZXJpbmcnKSwgcmVxdWlyZSgnLi4vbW9kZWwvSW1hZ2UnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUG9pbnQyRCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlZpc3VhbGl6ZUFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyaW5nLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBDbHVzdGVyaW5nLCBJbWFnZSwgUG9pbnQyRCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIFZpc3VhbGl6ZSBzZXJ2aWNlLlxuICAgKiBAbW9kdWxlIGFwaS9WaXN1YWxpemVBcGlcbiAgICogQHZlcnNpb24gMS4wLjdcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgVmlzdWFsaXplQXBpLiBcbiAgICogQGFsaWFzIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50Q2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogZ2VuZXJhdGVzIHRoZSBBRSBvdXRwdXQgZnJvbSBhIGdpdmVuIHBvaW50IG9mIHRoZSBzYW1wbGUgZGlzdHJpYnV0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gcG9pbnQyRCAyRCBQb2ludCBvZiB0aGUgc2FtcGxlIGRpc3RyaWJ1dGlvblxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZX1cbiAgICAgKi9cbiAgICB0aGlzLmdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgPSBmdW5jdGlvbihwb2ludDJELCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gcG9pbnQyRDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3BvaW50MkQnIGlzIHNldFxuICAgICAgaWYgKHBvaW50MkQgPT09IHVuZGVmaW5lZCB8fCBwb2ludDJEID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAncG9pbnQyRCcgd2hlbiBjYWxsaW5nIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy92aXN1YWxpemUvZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludCcsICdHRVQnLFxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmFsZ29yaXRobSBkZXRlcm1pbmVzIHRoZSBjbHV0ZXJpbmcgYWxnb3JpdGhtXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldE5hbWUgZGV0ZXJtaW5lcyB0aGUgZGF0YXNldCB3aGljaCBzaG91bGQgYmUgY2x1c3RlcmVkIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGltZW5zaW9uUmVkdWN0aW9uIGRldGVybWluZXMgdGhlIGFsZ29yaXRobSBmb3IgZGltIHJlZHVjdGlvblxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmxheWVyIGRldGVybWluZXMgdGhlIGhpZGRlbiBsYXllclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9XG4gICAgICovXG4gICAgdGhpcy5nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcgPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2FsZ29yaXRobSc6IG9wdHNbJ2FsZ29yaXRobSddLFxuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcbiAgICAgICAgJ2RpbWVuc2lvbl9yZWR1Y3Rpb24nOiBvcHRzWydkaW1lbnNpb25SZWR1Y3Rpb24nXSxcbiAgICAgICAgICAnbGF5ZXInOiBvcHRzWydsYXllciddLFxuICAgICAgfTtcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gQ2x1c3RlcmluZztcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdmlzdWFsaXplL2dldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZycsICdHRVQnLFxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9DbHVzdGVyUGFyYW1ldGVycycsICdtb2RlbC9DbHVzdGVyaW5nJywgJ21vZGVsL0Nvc3RGdW5jdGlvbicsICdtb2RlbC9JbWFnZScsICdtb2RlbC9JbWFnZURhdGEnLCAnbW9kZWwvTGVhcm5pbmdSYXRlJywgJ21vZGVsL1BhcmFtZXRlckxpc3QnLCAnbW9kZWwvUG9pbnQyRCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvUmFuZG9tRnVuY3Rpb24nLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblN0YXR1cycsICdhcGkvQnVpbGRBcGknLCAnYXBpL0xvYWRBcGknLCAnYXBpL1RyYWluQXBpJywgJ2FwaS9UdW5lQXBpJywgJ2FwaS9WaXN1YWxpemVBcGknXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJyksIHJlcXVpcmUoJy4vbW9kZWwvQ2x1c3RlcmluZycpLCByZXF1aXJlKCcuL21vZGVsL0Nvc3RGdW5jdGlvbicpLCByZXF1aXJlKCcuL21vZGVsL0ltYWdlJyksIHJlcXVpcmUoJy4vbW9kZWwvSW1hZ2VEYXRhJyksIHJlcXVpcmUoJy4vbW9kZWwvTGVhcm5pbmdSYXRlJyksIHJlcXVpcmUoJy4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpLCByZXF1aXJlKCcuL21vZGVsL1BvaW50MkQnKSwgcmVxdWlyZSgnLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi9tb2RlbC9SYW5kb21GdW5jdGlvbicpLCByZXF1aXJlKCcuL21vZGVsL1RyYWluUGVyZm9ybWFuY2UnKSwgcmVxdWlyZSgnLi9tb2RlbC9UcmFpblN0YXR1cycpLCByZXF1aXJlKCcuL2FwaS9CdWlsZEFwaScpLCByZXF1aXJlKCcuL2FwaS9Mb2FkQXBpJyksIHJlcXVpcmUoJy4vYXBpL1RyYWluQXBpJyksIHJlcXVpcmUoJy4vYXBpL1R1bmVBcGknKSwgcmVxdWlyZSgnLi9hcGkvVmlzdWFsaXplQXBpJykpO1xuICB9XG59KGZ1bmN0aW9uIChBcGlDbGllbnQsIENsdXN0ZXJQYXJhbWV0ZXJzLCBDbHVzdGVyaW5nLCBDb3N0RnVuY3Rpb24sIEltYWdlLCBJbWFnZURhdGEsIExlYXJuaW5nUmF0ZSwgUGFyYW1ldGVyTGlzdCwgUG9pbnQyRCwgUHJvY2Vzc2VkSW1hZ2VEYXRhLCBSYW5kb21GdW5jdGlvbiwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMsIEJ1aWxkQXBpLCBMb2FkQXBpLCBUcmFpbkFwaSwgVHVuZUFwaSwgVmlzdWFsaXplQXBpKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogV2ViVUlfdG9fYnVpbGRfdHJhaW5fYW5kX3R1bmVfYV9Db252b2x1dGlvbmFsX0F1dG9lbmNvZGVyLjxicj5cbiAgICogVGhlIDxjb2RlPmluZGV4PC9jb2RlPiBtb2R1bGUgcHJvdmlkZXMgYWNjZXNzIHRvIGNvbnN0cnVjdG9ycyBmb3IgYWxsIHRoZSBjbGFzc2VzIHdoaWNoIGNvbXByaXNlIHRoZSBwdWJsaWMgQVBJLlxuICAgKiA8cD5cbiAgICogQW4gQU1EIChyZWNvbW1lbmRlZCEpIG9yIENvbW1vbkpTIGFwcGxpY2F0aW9uIHdpbGwgZ2VuZXJhbGx5IGRvIHNvbWV0aGluZyBlcXVpdmFsZW50IHRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIDxwcmU+XG4gICAqIHZhciBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSByZXF1aXJlKCdpbmRleCcpOyAvLyBTZWUgbm90ZSBiZWxvdyouXG4gICAqIHZhciB4eHhTdmMgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlh4eEFwaSgpOyAvLyBBbGxvY2F0ZSB0aGUgQVBJIGNsYXNzIHdlJ3JlIGdvaW5nIHRvIHVzZS5cbiAgICogdmFyIHl5eU1vZGVsID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5ZeXkoKTsgLy8gQ29uc3RydWN0IGEgbW9kZWwgaW5zdGFuY2UuXG4gICAqIHl5eU1vZGVsLnNvbWVQcm9wZXJ0eSA9ICdzb21lVmFsdWUnO1xuICAgKiAuLi5cbiAgICogdmFyIHp6eiA9IHh4eFN2Yy5kb1NvbWV0aGluZyh5eXlNb2RlbCk7IC8vIEludm9rZSB0aGUgc2VydmljZS5cbiAgICogLi4uXG4gICAqIDwvcHJlPlxuICAgKiA8ZW0+Kk5PVEU6IEZvciBhIHRvcC1sZXZlbCBBTUQgc2NyaXB0LCB1c2UgcmVxdWlyZShbJ2luZGV4J10sIGZ1bmN0aW9uKCl7Li4ufSlcbiAgICogYW5kIHB1dCB0aGUgYXBwbGljYXRpb24gbG9naWMgd2l0aGluIHRoZSBjYWxsYmFjayBmdW5jdGlvbi48L2VtPlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBBIG5vbi1BTUQgYnJvd3NlciBhcHBsaWNhdGlvbiAoZGlzY291cmFnZWQpIG1pZ2h0IGRvIHNvbWV0aGluZyBsaWtlIHRoaXM6XG4gICAqIDxwcmU+XG4gICAqIHZhciB4eHhTdmMgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlh4eEFwaSgpOyAvLyBBbGxvY2F0ZSB0aGUgQVBJIGNsYXNzIHdlJ3JlIGdvaW5nIHRvIHVzZS5cbiAgICogdmFyIHl5eSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWXl5KCk7IC8vIENvbnN0cnVjdCBhIG1vZGVsIGluc3RhbmNlLlxuICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcbiAgICogLi4uXG4gICAqIHZhciB6enogPSB4eHhTdmMuZG9Tb21ldGhpbmcoeXl5TW9kZWwpOyAvLyBJbnZva2UgdGhlIHNlcnZpY2UuXG4gICAqIC4uLlxuICAgKiA8L3ByZT5cbiAgICogPC9wPlxuICAgKiBAbW9kdWxlIGluZGV4XG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgQXBpQ2xpZW50IGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOkFwaUNsaWVudH1cbiAgICAgKi9cbiAgICBBcGlDbGllbnQ6IEFwaUNsaWVudCxcbiAgICAvKipcbiAgICAgKiBUaGUgQ2x1c3RlclBhcmFtZXRlcnMgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9XG4gICAgICovXG4gICAgQ2x1c3RlclBhcmFtZXRlcnM6IENsdXN0ZXJQYXJhbWV0ZXJzLFxuICAgIC8qKlxuICAgICAqIFRoZSBDbHVzdGVyaW5nIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9XG4gICAgICovXG4gICAgQ2x1c3RlcmluZzogQ2x1c3RlcmluZyxcbiAgICAvKipcbiAgICAgKiBUaGUgQ29zdEZ1bmN0aW9uIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbn1cbiAgICAgKi9cbiAgICBDb3N0RnVuY3Rpb246IENvc3RGdW5jdGlvbixcbiAgICAgIC8qKlxuICAgICAgICogVGhlIEltYWdlIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvSW1hZ2V9XG4gICAgICAgKi9cbiAgICAgIEltYWdlOiBJbWFnZSxcbiAgICAvKipcbiAgICAgKiBUaGUgSW1hZ2VEYXRhIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICBJbWFnZURhdGE6IEltYWdlRGF0YSxcbiAgICAvKipcbiAgICAgKiBUaGUgTGVhcm5pbmdSYXRlIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZX1cbiAgICAgKi9cbiAgICBMZWFybmluZ1JhdGU6IExlYXJuaW5nUmF0ZSxcbiAgICAgIC8qKlxuICAgICAgICogVGhlIFBhcmFtZXRlckxpc3QgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fVxuICAgICAgICovXG4gICAgICBQYXJhbWV0ZXJMaXN0OiBQYXJhbWV0ZXJMaXN0LFxuICAgIC8qKlxuICAgICAqIFRoZSBQb2ludDJEIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1BvaW50MkR9XG4gICAgICovXG4gICAgUG9pbnQyRDogUG9pbnQyRCxcbiAgICAvKipcbiAgICAgKiBUaGUgUHJvY2Vzc2VkSW1hZ2VEYXRhIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cbiAgICAgKi9cbiAgICBQcm9jZXNzZWRJbWFnZURhdGE6IFByb2Nlc3NlZEltYWdlRGF0YSxcbiAgICAvKipcbiAgICAgKiBUaGUgUmFuZG9tRnVuY3Rpb24gbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb259XG4gICAgICovXG4gICAgUmFuZG9tRnVuY3Rpb246IFJhbmRvbUZ1bmN0aW9uLFxuICAgICAgLyoqXG4gICAgICAgKiBUaGUgVHJhaW5QZXJmb3JtYW5jZSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9XG4gICAgICAgKi9cbiAgICAgIFRyYWluUGVyZm9ybWFuY2U6IFRyYWluUGVyZm9ybWFuY2UsXG4gICAgLyoqXG4gICAgICogVGhlIFRyYWluU3RhdHVzIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfVxuICAgICAqL1xuICAgIFRyYWluU3RhdHVzOiBUcmFpblN0YXR1cyxcbiAgICAvKipcbiAgICAgKiBUaGUgQnVpbGRBcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvQnVpbGRBcGl9XG4gICAgICovXG4gICAgQnVpbGRBcGk6IEJ1aWxkQXBpLFxuICAgIC8qKlxuICAgICAqIFRoZSBMb2FkQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL0xvYWRBcGl9XG4gICAgICovXG4gICAgTG9hZEFwaTogTG9hZEFwaSxcbiAgICAvKipcbiAgICAgKiBUaGUgVHJhaW5BcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvVHJhaW5BcGl9XG4gICAgICovXG4gICAgVHJhaW5BcGk6IFRyYWluQXBpLFxuICAgIC8qKlxuICAgICAqIFRoZSBUdW5lQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1R1bmVBcGl9XG4gICAgICovXG4gICAgVHVuZUFwaTogVHVuZUFwaSxcbiAgICAvKipcbiAgICAgKiBUaGUgVmlzdWFsaXplQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX1cbiAgICAgKi9cbiAgICBWaXN1YWxpemVBcGk6IFZpc3VhbGl6ZUFwaVxuICB9O1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNsdXN0ZXJQYXJhbWV0ZXJzID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBDbHVzdGVyUGFyYW1ldGVycyBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnNcbiAgICogQHZlcnNpb24gMS4wLjdcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+Q2x1c3RlclBhcmFtZXRlcnM8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+Q2x1c3RlclBhcmFtZXRlcnM8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gVGhlIHBvcHVsYXRlZCA8Y29kZT5DbHVzdGVyUGFyYW1ldGVyczwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2NsdXN0ZXJzJykpIHtcbiAgICAgICAgb2JqWyduX2NsdXN0ZXJzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2NsdXN0ZXJzJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbml0JykpIHtcbiAgICAgICAgb2JqWydpbml0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpbml0J10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2luaXQnKSkge1xuICAgICAgICBvYmpbJ25faW5pdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9pbml0J10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXhfaXRlcicpKSB7XG4gICAgICAgIG9ialsnbWF4X2l0ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21heF9pdGVyJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd0b2wnKSkge1xuICAgICAgICBvYmpbJ3RvbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndG9sJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdwcmVjb21wdXRlX2Rpc3RhbmNlcycpKSB7XG4gICAgICAgIG9ialsncHJlY29tcHV0ZV9kaXN0YW5jZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd2ZXJib3NlJykpIHtcbiAgICAgICAgb2JqWyd2ZXJib3NlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd2ZXJib3NlJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fc3RhdGUnKSkge1xuICAgICAgICBvYmpbJ3JhbmRvbV9zdGF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmFuZG9tX3N0YXRlJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjb3B5X3gnKSkge1xuICAgICAgICBvYmpbJ2NvcHlfeCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29weV94J10sICdCb29sZWFuJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9qb2JzJykpIHtcbiAgICAgICAgb2JqWyduX2pvYnMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fam9icyddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYWxnb3JpdGhtJykpIHtcbiAgICAgICAgb2JqWydhbGdvcml0aG0nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2FsZ29yaXRobSddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBuX2NsdXN0ZXJzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbl9jbHVzdGVycyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBpbml0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnaW5pdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBuX2luaXRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyduX2luaXQnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWF4X2l0ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtYXhfaXRlciddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSB0b2xcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyd0b2wnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gcHJlY29tcHV0ZV9kaXN0YW5jZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydwcmVjb21wdXRlX2Rpc3RhbmNlcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSB2ZXJib3NlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsndmVyYm9zZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSByYW5kb21fc3RhdGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fc3RhdGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0Jvb2xlYW59IGNvcHlfeFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NvcHlfeCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBuX2pvYnNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyduX2pvYnMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gYWxnb3JpdGhtXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYWxnb3JpdGhtJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Qb2ludDJEJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL1BvaW50MkQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyaW5nID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBvaW50MkQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgUG9pbnQyRCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBDbHVzdGVyaW5nIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9DbHVzdGVyaW5nXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmdcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+Q2x1c3RlcmluZzwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtaW5YJykpIHtcbiAgICAgICAgb2JqWydtaW5YJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtaW5YJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXhYJykpIHtcbiAgICAgICAgb2JqWydtYXhYJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhYJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtaW5ZJykpIHtcbiAgICAgICAgb2JqWydtaW5ZJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtaW5ZJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXhZJykpIHtcbiAgICAgICAgb2JqWydtYXhZJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhZJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduQ2x1c3RlcnMnKSkge1xuICAgICAgICBvYmpbJ25DbHVzdGVycyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbkNsdXN0ZXJzJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdwb2ludHMnKSkge1xuICAgICAgICBvYmpbJ3BvaW50cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncG9pbnRzJ10sIFtQb2ludDJEXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtaW5YXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWluWCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtYXhYXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4WCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtaW5ZXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWluWSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtYXhZXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4WSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBuQ2x1c3RlcnNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyduQ2x1c3RlcnMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvUG9pbnQyRD59IHBvaW50c1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3BvaW50cyddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ29zdEZ1bmN0aW9uID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBDb3N0RnVuY3Rpb24gbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0Nvc3RGdW5jdGlvblxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5Db3N0RnVuY3Rpb248L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvblxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5Db3N0RnVuY3Rpb248L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbn0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvQ29zdEZ1bmN0aW9ufSBUaGUgcG9wdWxhdGVkIDxjb2RlPkNvc3RGdW5jdGlvbjwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9jb3N0X2Z1bmN0aW9uJykpIHtcbiAgICAgICAgb2JqWydjZl9jb3N0X2Z1bmN0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9jb3N0X2Z1bmN0aW9uJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9tYXhfdmFsJykpIHtcbiAgICAgICAgb2JqWydjZl9tYXhfdmFsJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9tYXhfdmFsJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2ZpbHRlcl9zaXplJykpIHtcbiAgICAgICAgb2JqWydjZl9maWx0ZXJfc2l6ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfZmlsdGVyX3NpemUnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfZmlsdGVyX3NpZ21hJykpIHtcbiAgICAgICAgb2JqWydjZl9maWx0ZXJfc2lnbWEnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2ZpbHRlcl9zaWdtYSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9rMScpKSB7XG4gICAgICAgIG9ialsnY2ZfazEnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2sxJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2syJykpIHtcbiAgICAgICAgb2JqWydjZl9rMiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfazInXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2Zfd2VpZ2h0cycpKSB7XG4gICAgICAgIG9ialsnY2Zfd2VpZ2h0cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2Zfd2VpZ2h0cyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gY2ZfY29zdF9mdW5jdGlvblxuICAgKiBAZGVmYXVsdCAnc3F1YXJlZF9waXhlbF9kaXN0YW5jZSdcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9jb3N0X2Z1bmN0aW9uJ10gPSAnc3F1YXJlZF9waXhlbF9kaXN0YW5jZSc7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfbWF4X3ZhbFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX21heF92YWwnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9maWx0ZXJfc2l6ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2ZpbHRlcl9zaXplJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfZmlsdGVyX3NpZ21hXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfZmlsdGVyX3NpZ21hJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfazFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9rMSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2syXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfazInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGNmX3dlaWdodHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl93ZWlnaHRzJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgSW1hZ2UgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0ltYWdlXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkltYWdlPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9JbWFnZVxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkltYWdlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2V9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+SW1hZ2U8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYnl0ZXN0cmluZycpKSB7XG4gICAgICAgIG9ialsnYnl0ZXN0cmluZyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYnl0ZXN0cmluZyddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaWQnKSkge1xuICAgICAgICBvYmpbJ2lkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpZCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBieXRlc3RyaW5nXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYnl0ZXN0cmluZyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBpZFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lkJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9JbWFnZScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlRGF0YSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZSkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBJbWFnZURhdGEgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0ltYWdlRGF0YVxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5JbWFnZURhdGE8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YVxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5JbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkltYWdlRGF0YTwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1JbWFnZXMnKSkge1xuICAgICAgICBvYmpbJ251bUltYWdlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbnVtSW1hZ2VzJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNYJykpIHtcbiAgICAgICAgb2JqWydyZXNYJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyZXNYJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNZJykpIHtcbiAgICAgICAgb2JqWydyZXNZJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyZXNZJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbWFnZXMnKSkge1xuICAgICAgICBvYmpbJ2ltYWdlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW1hZ2VzJ10sIFtJbWFnZV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbnVtSW1hZ2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbnVtSW1hZ2VzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJlc1hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNYJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJlc1lcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNZJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW1hZ2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnaW1hZ2VzJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5MZWFybmluZ1JhdGUgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIExlYXJuaW5nUmF0ZSBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvTGVhcm5pbmdSYXRlXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9MZWFybmluZ1JhdGV9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+TGVhcm5pbmdSYXRlPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZScpKSB7XG4gICAgICAgIG9ialsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZGVjYXlfc3RlcHMnKSkge1xuICAgICAgICBvYmpbJ2xyX2RlY2F5X3N0ZXBzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9kZWNheV9zdGVwcyddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9kZWNheV9yYXRlJykpIHtcbiAgICAgICAgb2JqWydscl9kZWNheV9yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9kZWNheV9yYXRlJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3N0YWlyY2FzZScpKSB7XG4gICAgICAgIG9ialsnbHJfc3RhaXJjYXNlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9zdGFpcmNhc2UnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2JvdW5kYXJpZXMnKSkge1xuICAgICAgICBvYmpbJ2xyX2JvdW5kYXJpZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2JvdW5kYXJpZXMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl92YWx1ZXMnKSkge1xuICAgICAgICBvYmpbJ2xyX3ZhbHVlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfdmFsdWVzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZW5kX2xlYXJuaW5nX3JhdGUnKSkge1xuICAgICAgICBvYmpbJ2xyX2VuZF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9wb3dlcicpKSB7XG4gICAgICAgIG9ialsnbHJfcG93ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX3Bvd2VyJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2N5Y2xlJykpIHtcbiAgICAgICAgb2JqWydscl9jeWNsZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfY3ljbGUnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbGVhcm5pbmdfcmF0ZV9mdW5jdGlvblxuICAgKiBAZGVmYXVsdCAnc3RhdGljJ1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSA9ICdzdGF0aWMnO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2RlY2F5X3N0ZXBzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZGVjYXlfc3RlcHMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9kZWNheV9yYXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZGVjYXlfcmF0ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEJvb2xlYW4+fSBscl9zdGFpcmNhc2VcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9zdGFpcmNhc2UnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGxyX2JvdW5kYXJpZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9ib3VuZGFyaWVzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBscl92YWx1ZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl92YWx1ZXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9lbmRfbGVhcm5pbmdfcmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2VuZF9sZWFybmluZ19yYXRlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfcG93ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9wb3dlciddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEJvb2xlYW4+fSBscl9jeWNsZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2N5Y2xlJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0Nvc3RGdW5jdGlvbicsICdtb2RlbC9MZWFybmluZ1JhdGUnLCAnbW9kZWwvUmFuZG9tRnVuY3Rpb24nXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9Db3N0RnVuY3Rpb24nKSwgcmVxdWlyZSgnLi9MZWFybmluZ1JhdGUnKSwgcmVxdWlyZSgnLi9SYW5kb21GdW5jdGlvbicpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Db3N0RnVuY3Rpb24sIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxlYXJuaW5nUmF0ZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUmFuZG9tRnVuY3Rpb24pO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uIChBcGlDbGllbnQsIENvc3RGdW5jdGlvbiwgTGVhcm5pbmdSYXRlLCBSYW5kb21GdW5jdGlvbikge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBQYXJhbWV0ZXJMaXN0IG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9QYXJhbWV0ZXJMaXN0XG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlBhcmFtZXRlckxpc3Q8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3RcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gVGhlIHBvcHVsYXRlZCA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lucHV0X3NoYXBlJykpIHtcbiAgICAgICAgb2JqWydpbnB1dF9zaGFwZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5wdXRfc2hhcGUnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1iZXJfb2Zfc3RhY2tzJykpIHtcbiAgICAgICAgb2JqWydudW1iZXJfb2Zfc3RhY2tzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydudW1iZXJfb2Zfc3RhY2tzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZmlsdGVyX3NpemVzJykpIHtcbiAgICAgICAgb2JqWydmaWx0ZXJfc2l6ZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2ZpbHRlcl9zaXplcyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pcnJvcl93ZWlnaHRzJykpIHtcbiAgICAgICAgb2JqWydtaXJyb3Jfd2VpZ2h0cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWlycm9yX3dlaWdodHMnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2FjdGl2YXRpb25fZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSwgWydTdHJpbmcnXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYmF0Y2hfc2l6ZScpKSB7XG4gICAgICAgIG9ialsnYmF0Y2hfc2l6ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYmF0Y2hfc2l6ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2Vwb2NocycpKSB7XG4gICAgICAgIG9ialsnbl9lcG9jaHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fZXBvY2hzJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3VzZV90ZW5zb3Jib2FyZCcpKSB7XG4gICAgICAgIG9ialsndXNlX3RlbnNvcmJvYXJkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd1c2VfdGVuc29yYm9hcmQnXSwgJ0Jvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd2ZXJib3NlJykpIHtcbiAgICAgICAgb2JqWyd2ZXJib3NlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd2ZXJib3NlJ10sICdCb29sZWFuJyk7XG4gICAgICB9XG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsZWFybmluZ19yYXRlX2RpY3QnKSkge1xuICAgICAgICAgICAgb2JqWydsZWFybmluZ19yYXRlX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xlYXJuaW5nX3JhdGVfZGljdCddLCBbTGVhcm5pbmdSYXRlXSk7XG4gICAgICB9XG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjb3N0X2Z1bmN0aW9uX2RpY3QnKSkge1xuICAgICAgICAgICAgb2JqWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Nvc3RfZnVuY3Rpb25fZGljdCddLCBbQ29zdEZ1bmN0aW9uXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnb3B0aW1pemVyJykpIHtcbiAgICAgICAgb2JqWydvcHRpbWl6ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ29wdGltaXplciddLCBbJ1N0cmluZyddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtb21lbnR1bScpKSB7XG4gICAgICAgIG9ialsnbW9tZW50dW0nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21vbWVudHVtJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX3dlaWdodHNfZGljdCcpKSB7XG4gICAgICAgICAgICBvYmpbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSwgW1JhbmRvbUZ1bmN0aW9uXSk7XG4gICAgICB9XG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fYmlhc2VzX2RpY3QnKSkge1xuICAgICAgICAgICAgb2JqWydyYW5kb21fYmlhc2VzX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9iaWFzZXNfZGljdCddLCBbUmFuZG9tRnVuY3Rpb25dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzZXNzaW9uX3NhdmVyX3BhdGgnKSkge1xuICAgICAgICBvYmpbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc2Vzc2lvbl9zYXZlcl9wYXRoJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsb2FkX3ByZXZfc2Vzc2lvbicpKSB7XG4gICAgICAgIG9ialsnbG9hZF9wcmV2X3Nlc3Npb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xvYWRfcHJldl9zZXNzaW9uJ10sICdCb29sZWFuJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJykpIHtcbiAgICAgICAgb2JqWydzZXNzaW9uX3NhdmVfZHVyYXRpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1fdGVzdF9waWN0dXJlcycpKSB7XG4gICAgICAgIG9ialsnbnVtX3Rlc3RfcGljdHVyZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bV90ZXN0X3BpY3R1cmVzJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGlucHV0X3NoYXBlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnaW5wdXRfc2hhcGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IG51bWJlcl9vZl9zdGFja3NcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydudW1iZXJfb2Zfc3RhY2tzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBmaWx0ZXJfc2l6ZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydmaWx0ZXJfc2l6ZXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbWlycm9yX3dlaWdodHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaXJyb3Jfd2VpZ2h0cyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPFN0cmluZz59IGFjdGl2YXRpb25fZnVuY3Rpb25cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gYmF0Y2hfc2l6ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2JhdGNoX3NpemUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBuX2Vwb2Noc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fZXBvY2hzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtCb29sZWFufSB1c2VfdGVuc29yYm9hcmRcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3VzZV90ZW5zb3Jib2FyZCddID0gdHJ1ZTtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0Jvb2xlYW59IHZlcmJvc2VcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHRydWU7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZT59IGxlYXJuaW5nX3JhdGVfZGljdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xlYXJuaW5nX3JhdGVfZGljdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb24+fSBjb3N0X2Z1bmN0aW9uX2RpY3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxTdHJpbmc+fSBvcHRpbWl6ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydvcHRpbWl6ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtb21lbnR1bVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21vbWVudHVtJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9uPn0gcmFuZG9tX3dlaWdodHNfZGljdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb24+fSByYW5kb21fYmlhc2VzX2RpY3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fYmlhc2VzX2RpY3QnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gc2Vzc2lvbl9zYXZlcl9wYXRoXG4gICAqIEBkZWZhdWx0ICcuL3NhdmUvJ1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gJy4vc2F2ZS8nO1xuICAvKipcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gbG9hZF9wcmV2X3Nlc3Npb25cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydsb2FkX3ByZXZfc2Vzc2lvbiddID0gZmFsc2U7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gc2Vzc2lvbl9zYXZlX2R1cmF0aW9uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbnVtX3Rlc3RfcGljdHVyZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydudW1fdGVzdF9waWN0dXJlcyddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgUG9pbnQyRCBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvUG9pbnQyRFxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5Qb2ludDJEPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Qb2ludDJEXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5Qb2ludDJEPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlBvaW50MkQ8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneCcpKSB7XG4gICAgICAgIG9ialsneCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsneCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneScpKSB7XG4gICAgICAgIG9ialsneSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsneSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2x1c3RlcicpKSB7XG4gICAgICAgIG9ialsnY2x1c3RlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2x1c3RlciddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSB4XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsneCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSB5XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsneSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjbHVzdGVyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2x1c3RlciddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvSW1hZ2UnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vSW1hZ2UnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qcm9jZXNzZWRJbWFnZURhdGEgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgSW1hZ2UpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgUHJvY2Vzc2VkSW1hZ2VEYXRhIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGFcbiAgICogQHZlcnNpb24gMS4wLjdcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UHJvY2Vzc2VkSW1hZ2VEYXRhPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGFcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UHJvY2Vzc2VkSW1hZ2VEYXRhPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lucHV0TGF5ZXInKSkge1xuICAgICAgICBvYmpbJ2lucHV0TGF5ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2lucHV0TGF5ZXInXSwgW0ltYWdlXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGF0ZW50TGF5ZXInKSkge1xuICAgICAgICAgIG9ialsnbGF0ZW50TGF5ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xhdGVudExheWVyJ10sIFtbSW1hZ2VdXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnb3V0cHV0TGF5ZXInKSkge1xuICAgICAgICBvYmpbJ291dHB1dExheWVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydvdXRwdXRMYXllciddLCBbSW1hZ2VdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW5wdXRMYXllclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lucHV0TGF5ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPj59IGxhdGVudExheWVyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbGF0ZW50TGF5ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+fSBvdXRwdXRMYXllclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ291dHB1dExheWVyJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5SYW5kb21GdW5jdGlvbiA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgUmFuZG9tRnVuY3Rpb24gbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL1JhbmRvbUZ1bmN0aW9uXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlJhbmRvbUZ1bmN0aW9uPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvblxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UmFuZG9tRnVuY3Rpb248L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9ufSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbn0gVGhlIHBvcHVsYXRlZCA8Y29kZT5SYW5kb21GdW5jdGlvbjwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ3JhbmRvbV9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmFuZG9tX2Z1bmN0aW9uJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhbHBoYScpKSB7XG4gICAgICAgIG9ialsnYWxwaGEnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2FscGhhJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2JldGEnKSkge1xuICAgICAgICBvYmpbJ2JldGEnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2JldGEnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWVhbicpKSB7XG4gICAgICAgIG9ialsnbWVhbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWVhbiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzdGRkZXYnKSkge1xuICAgICAgICBvYmpbJ3N0ZGRldiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc3RkZGV2J10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xhbScpKSB7XG4gICAgICAgIG9ialsnbGFtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsYW0nXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWludmFsJykpIHtcbiAgICAgICAgb2JqWydtaW52YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21pbnZhbCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXh2YWwnKSkge1xuICAgICAgICBvYmpbJ21heHZhbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4dmFsJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3NlZWQnKSkge1xuICAgICAgICBvYmpbJ3NlZWQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3NlZWQnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSByYW5kb21fZnVuY3Rpb25cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fZnVuY3Rpb24nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBhbHBoYVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2FscGhhJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gYmV0YVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2JldGEnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtZWFuXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWVhbiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHN0ZGRldlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3N0ZGRldiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxhbVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xhbSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG1pbnZhbFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pbnZhbCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG1heHZhbFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heHZhbCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHNlZWRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydzZWVkJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9UcmFpblBlcmZvcm1hbmNlXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlRyYWluUGVyZm9ybWFuY2U8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2VcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gVGhlIHBvcHVsYXRlZCA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21vZGVsX2lkJykpIHtcbiAgICAgICAgb2JqWydtb2RlbF9pZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbW9kZWxfaWQnXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndHJhaW5fc3RhdHVzJykpIHtcbiAgICAgICAgICAgIG9ialsndHJhaW5fc3RhdHVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd0cmFpbl9zdGF0dXMnXSwgJ1N0cmluZycpO1xuICAgICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdCcpKSB7XG4gICAgICAgIG9ialsnY29zdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjdXJyZW50TGVhcm5pbmdSYXRlJykpIHtcbiAgICAgICAgb2JqWydjdXJyZW50TGVhcm5pbmdSYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjdXJyZW50TGVhcm5pbmdSYXRlJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbW9kZWxfaWRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtb2RlbF9pZCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSB0cmFpbl9zdGF0dXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyd0cmFpbl9zdGF0dXMnXSA9IHVuZGVmaW5lZDtcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY29zdFxuICAgICAqL1xuICAgIGV4cG9ydHMucHJvdG90eXBlWydjb3N0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY3VycmVudExlYXJuaW5nUmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluU3RhdHVzID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuICAvKipcbiAgICogRW51bSBjbGFzcyBUcmFpblN0YXR1cy5cbiAgICogQGVudW0ge31cbiAgICogQHJlYWRvbmx5XG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiB2YWx1ZTogXCJzdGFydFwiXG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgXCJzdGFydFwiOiBcInN0YXJ0XCIsXG4gICAgLyoqXG4gICAgICogdmFsdWU6IFwicGF1c2VcIlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFwicGF1c2VcIjogXCJwYXVzZVwiLFxuICAgIC8qKlxuICAgICAqIHZhbHVlOiBcInN0b3BcIlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFwic3RvcFwiOiBcInN0b3BcIixcbiAgICAvKipcbiAgICAgKiB2YWx1ZTogXCJyZXN1bWVcIlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFwicmVzdW1lXCI6IFwicmVzdW1lXCIgIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSA8Y29kZT5UcmFpblN0YXR1czwvY29kZT4gZW51bSB2YWx1ZSBmcm9tIGEgSmF2YXNjcmlwdCBvYmplY3QgbmFtZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5hbWUgb2YgdGhlIGVudW0gdmFsdWUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gVGhlIGVudW0gPGNvZGU+VHJhaW5TdGF0dXM8L2NvZGU+IHZhbHVlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qXHJcbmNoZWNrIGlmIGNsaWVudCBhbmQgc2VydmVyIGFyZSBydW5uaW5nIGNvcnJlY3RseVxyXG4gKi9cclxudmFyIENvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHJlcXVpcmUoJ2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXInKTtcclxuXHJcbnZhciB0dW5lQXBpID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UdW5lQXBpKCk7XHJcbnZhciBidWlsZEFwaSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuQnVpbGRBcGkoKTtcclxuXHJcbi8vIGNoZWNrIEFQSSBmdW5jdGlvbmFsaXR5XHJcbmZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBUEkgY2FsbGVkIHN1Y2Nlc3NmdWxseS4nKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbi8qXHJcbkNvbnZvbHV0aW9uYWwgQXV0byBFbmNvZGVyIHRvcG9sb2d5XHJcbiAqL1xyXG5cclxuLypcclxuR2xvYmFsIHZhcmlhYmxlc1xyXG4gKi9cclxudmFyIHVwZGF0ZVRpbWVyO1xyXG52YXIgY3VycmVudFRpbGUgPSBudWxsO1xyXG52YXIgcHJldmlvdXNUaWxlcyA9IFtdO1xyXG5cclxuLypcclxuSGVscGVyIGZ1bmN0aW9uc1xyXG4gKi9cclxuZnVuY3Rpb24gY29udmVydFRvQ2FtZWxDYXNlKGlucHV0U3RyaW5nKSB7XHJcbiAgICBTdHJpbmcucHJvdG90eXBlLmNhcGl0YWxpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0aGlzLnNsaWNlKDEpO1xyXG4gICAgfTtcclxuICAgIHZhciBvdXRwdXRTdHJpbmcgPSBcIlwiO1xyXG4gICAgdmFyIGFycmF5ID0gaW5wdXRTdHJpbmcuc3BsaXQoJyAnKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBvdXRwdXRTdHJpbmcgKz0gYXJyYXlbaV0uY2FwaXRhbGl6ZSgpO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2cob3V0cHV0U3RyaW5nKTtcclxuICAgIHJldHVybiBvdXRwdXRTdHJpbmc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWQzT3B0aW9uTGlzdChpZCkge1xyXG4gICAgdmFyIHNlbGVjdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKS5vcHRpb25zW2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKS5zZWxlY3RlZEluZGV4XS52YWx1ZTtcclxuICAgIHN3aXRjaCAoc2VsZWN0aW9uKSB7XHJcbiAgICAgICAgY2FzZSBcInRydWVcIjpcclxuICAgICAgICAgICAgcmV0dXJuIFt0cnVlXTtcclxuICAgICAgICBjYXNlIFwiZmFsc2VcIjpcclxuICAgICAgICAgICAgcmV0dXJuIFtmYWxzZV07XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgcmV0dXJuIFt0cnVlLCBmYWxzZV1cclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcGFyc2VJbnB1dExpc3QoaWQsIGNvbnZlcnRUb051bWJlcikge1xyXG4gICAgdmFyIGlucHV0VGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKS52YWx1ZS50cmltKCk7XHJcbiAgICBpZiAoaW5wdXRUZXh0LnN0YXJ0c1dpdGgoJ1snKSkge1xyXG4gICAgICAgIC8vIHBhcnNlIGFzIGxpc3RcclxuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShpbnB1dFRleHQpO1xyXG4gICAgfSBlbHNlIGlmIChpbnB1dFRleHQuc3RhcnRzV2l0aCgnKCcpKSB7XHJcbiAgICAgICAgLy8gcGFyc2UgYXMgdHVwbGU6XHJcbiAgICAgICAgLy8gY29kZSBmcm9tXHJcbiAgICAgICAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzEyMzI5NTIvaG93LXRvLWV4dHJhY3QtdHVwbGVzLXN0cmluZy1pbnRvLWRhdGEtc3RydWN0dXJlXHJcbiAgICAgICAgdmFyIHR1cGxlID0gSlNPTi5wYXJzZShcIltcIiArIGlucHV0VGV4dC5yZXBsYWNlKC9cXCgvZywgXCJbXCIpLnJlcGxhY2UoL1xcKS9nLCBcIl1cIikgKyBcIl1cIik7XHJcbiAgICAgICAgY29uc29sZS5sb2codHVwbGUpO1xyXG4gICAgICAgIC8vIGl0ZXJhdGUgb3ZlciByYW5nZVxyXG4gICAgICAgIHZhciByYW5nZSA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSB0dXBsZVswXVswXTsgaSA8IHR1cGxlWzBdWzFdOyBpICs9IHR1cGxlWzBdWzJdKSB7XHJcbiAgICAgICAgICAgIHJhbmdlLnB1c2goaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByYW5nZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy9wYXJzZSBhcyBzaW5nbGUgZW50cnlcclxuICAgICAgICBpZiAoY29udmVydFRvTnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbTnVtYmVyKGlucHV0VGV4dCldO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBbaW5wdXRUZXh0XVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRBY3RpdmF0aW9uRnVuY3Rpb25zKCkge1xyXG4gICAgdmFyIHNlbGVjdGVkRnVuY3Rpb25zID0gW107XHJcbiAgICB2YXIgdGFibGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFjdGl2YXRpb25GdW5jdGlvblRhYmxlXCIpO1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBjaGVja2JveGVzOlxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWJsZS5yb3dzWzJdLmNlbGxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRhYmxlLnJvd3NbMl0uY2VsbHNbaV0uY2hpbGRyZW5bMF0uY2hlY2tlZCkge1xyXG4gICAgICAgICAgICBzZWxlY3RlZEZ1bmN0aW9ucy5wdXNoKHRhYmxlLnJvd3NbMF0uY2VsbHNbaV0udGV4dENvbnRlbnQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKHNlbGVjdGVkRnVuY3Rpb25zKTtcclxuICAgIHJldHVybiBzZWxlY3RlZEZ1bmN0aW9ucztcclxufVxyXG5cclxuZnVuY3Rpb24gcmVhZExlYXJuaW5nUmF0ZUZ1bmN0aW9ucygpIHtcclxuICAgIHZhciBzZWxlY3RlZEZ1bmN0aW9ucyA9IFtdO1xyXG4gICAgdmFyIHRhYmxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFybmluZ1JhdGVGdW5jdGlvblRhYmxlXCIpO1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBjaGVja2JveGVzOlxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWJsZS5yb3dzWzJdLmNlbGxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRhYmxlLnJvd3NbMl0uY2VsbHNbaV0uY2hpbGRyZW5bMF0uY2hlY2tlZCkge1xyXG4gICAgICAgICAgICAvLyBjcmVhdGUgbmV3IGRpY3Q6XHJcbiAgICAgICAgICAgIHZhciBsZWFybmluZ1JhdGVEaWN0ID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5MZWFybmluZ1JhdGUoKTtcclxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IHRhYmxlLnJvd3NbMF0uY2VsbHNbaV0udGV4dENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAvLyBhZGQgYWRkaXRpb25hbCBwYXJhbWV0ZXJzOlxyXG4gICAgICAgICAgICBzd2l0Y2ggKGZ1bmN0aW9uTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInN0YXRpY1wiOlxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiA9IFwic3RhdGljXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9pbml0aWFsX2xlYXJuaW5nX3JhdGUgPSBwYXJzZUlucHV0TGlzdChcImxySW5pdGlhbExlYXJuaW5nUmF0ZVN0YXRpY1wiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJleHBvbmVudGlhbCBkZWNheVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiA9IFwiZXhwb25lbnRpYWxfZGVjYXlcIjtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSA9IHBhcnNlSW5wdXRMaXN0KFwibHJJbml0aWFsTGVhcm5pbmdSYXRlRXhwRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9kZWNheV9zdGVwcyA9IHBhcnNlSW5wdXRMaXN0KFwibHJEZWNheVN0ZXBzRXhwRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9kZWNheV9yYXRlID0gcGFyc2VJbnB1dExpc3QoXCJsckRlY2F5UmF0ZUV4cERlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfc3RhaXJjYXNlID0gcmVhZDNPcHRpb25MaXN0KFwibHJTdGFpcmNhc2VFeHBEZWNheVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJpbnZlcnNlIHRpbWUgZGVjYXlcIjpcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxlYXJuaW5nX3JhdGVfZnVuY3Rpb24gPSBcImludmVyc2VfdGltZV9kZWNheVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfaW5pdGlhbF9sZWFybmluZ19yYXRlID0gcGFyc2VJbnB1dExpc3QoXCJsckluaXRpYWxMZWFybmluZ1JhdGVJbnZUaW1lRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9kZWNheV9zdGVwcyA9IHBhcnNlSW5wdXRMaXN0KFwibHJEZWNheVN0ZXBzSW52VGltZURlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfcmF0ZSA9IHBhcnNlSW5wdXRMaXN0KFwibHJEZWNheVJhdGVJbnZUaW1lRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9zdGFpcmNhc2UgPSByZWFkM09wdGlvbkxpc3QoXCJsclN0YWlyY2FzZUludlRpbWVEZWNheVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJuYXR1cmFsIGV4cCBkZWNheVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiA9IFwibmF0dXJhbF9leHBfZGVjYXlcIjtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSA9IHBhcnNlSW5wdXRMaXN0KFwibHJJbml0aWFsTGVhcm5pbmdSYXRlTmF0RXhwRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9kZWNheV9zdGVwcyA9IHBhcnNlSW5wdXRMaXN0KFwibHJEZWNheVN0ZXBzTmF0RXhwRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9kZWNheV9yYXRlID0gcGFyc2VJbnB1dExpc3QoXCJsckRlY2F5UmF0ZU5hdEV4cERlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfc3RhaXJjYXNlID0gcmVhZDNPcHRpb25MaXN0KFwibHJTdGFpcmNhc2VOYXRFeHBEZWNheVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJwaWVjZXdpc2UgY29uc3RhbnRcIjpcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxlYXJuaW5nX3JhdGVfZnVuY3Rpb24gPSBcInBpZWNld2lzZV9jb25zdGFudFwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfYm91bmRhcmllcyA9IHBhcnNlSW5wdXRMaXN0KFwibHJCb3VuZGFyaWVzUGllY2V3aXNlQ29uc3RhbnRcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl92YWx1ZXMgPSBwYXJzZUlucHV0TGlzdChcImxyVmFsdWVzUGllY2V3aXNlQ29uc3RhbnRcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicG9seW5vbWlhbCBkZWNheVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiA9IFwicG9seW5vbWlhbF9kZWNheVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfaW5pdGlhbF9sZWFybmluZ19yYXRlID0gcGFyc2VJbnB1dExpc3QoXCJsckluaXRpYWxMZWFybmluZ1JhdGVQb2x5bm9tRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9kZWNheV9zdGVwcyA9IHBhcnNlSW5wdXRMaXN0KFwibHJEZWNheVN0ZXBzUG9seW5vbURlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZW5kX2xlYXJuaW5nX3JhdGUgPSBwYXJzZUlucHV0TGlzdChcImxyRW5kTGVhcm5pbmdSYXRlUG9seW5vbURlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfcG93ZXIgPSBwYXJzZUlucHV0TGlzdChcImxyUG93ZXJQb2x5bm9tRGVjYXlcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9jeWNsZSA9IHJlYWQzT3B0aW9uTGlzdChcImxyQ3ljbGVQb2x5bm9tRGVjYXlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGFkZCBkaWN0IHRvIGxpc3RcclxuICAgICAgICAgICAgc2VsZWN0ZWRGdW5jdGlvbnMucHVzaChsZWFybmluZ1JhdGVEaWN0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhzZWxlY3RlZEZ1bmN0aW9ucyk7XHJcbiAgICByZXR1cm4gc2VsZWN0ZWRGdW5jdGlvbnM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRPcHRpbWl6ZXJGdW5jdGlvbnMoKSB7XHJcbiAgICB2YXIgc2VsZWN0ZWRGdW5jdGlvbnMgPSBbXTtcclxuICAgIHZhciB0YWJsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwib3B0aW1pemVyVGFibGVcIik7XHJcbiAgICAvLyBpdGVyYXRlIG92ZXIgYWxsIGNoZWNrYm94ZXM6XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhYmxlLnJvd3NbMl0uY2VsbHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAodGFibGUucm93c1syXS5jZWxsc1tpXS5jaGlsZHJlblswXS5jaGVja2VkKSB7XHJcbiAgICAgICAgICAgIHNlbGVjdGVkRnVuY3Rpb25zLnB1c2goY29udmVydFRvQ2FtZWxDYXNlKHRhYmxlLnJvd3NbMF0uY2VsbHNbaV0udGV4dENvbnRlbnQpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhzZWxlY3RlZEZ1bmN0aW9ucyk7XHJcbiAgICByZXR1cm4gc2VsZWN0ZWRGdW5jdGlvbnM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRDb3N0RnVuY3Rpb25zKCkge1xyXG4gICAgdmFyIHNlbGVjdGVkRnVuY3Rpb25zID0gW107XHJcbiAgICB2YXIgdGFibGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvc3RGdW5jdGlvblRhYmxlXCIpO1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBjaGVja2JveGVzOlxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWJsZS5yb3dzWzJdLmNlbGxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRhYmxlLnJvd3NbMl0uY2VsbHNbaV0uY2hpbGRyZW5bMF0uY2hlY2tlZCkge1xyXG4gICAgICAgICAgICAvLyBjcmVhdGUgbmV3IGRpY3Q6XHJcbiAgICAgICAgICAgIHZhciBjb3N0RnVuY3Rpb25EaWN0ID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Db3N0RnVuY3Rpb24oKTtcclxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IHRhYmxlLnJvd3NbMF0uY2VsbHNbaV0udGV4dENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAvLyBhZGQgYWRkaXRpb25hbCBwYXJhbWV0ZXJzOlxyXG4gICAgICAgICAgICBzd2l0Y2ggKGZ1bmN0aW9uTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInNxdWFyZWQgcGl4ZWwgZGlzdGFuY2VcIjpcclxuICAgICAgICAgICAgICAgICAgICBjb3N0RnVuY3Rpb25EaWN0LmNmX2Nvc3RfZnVuY3Rpb24gPSBcInNxdWFyZWRfcGl4ZWxfZGlzdGFuY2VcIjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJwaXhlbCBkaXN0YW5jZVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIGNvc3RGdW5jdGlvbkRpY3QuY2ZfY29zdF9mdW5jdGlvbiA9IFwicGl4ZWxfZGlzdGFuY2VcIjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIHRvIGJlIGNvbnRpbnVlZC4uLlxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBhZGQgZGljdCB0byBsaXN0XHJcbiAgICAgICAgICAgIHNlbGVjdGVkRnVuY3Rpb25zLnB1c2goY29zdEZ1bmN0aW9uRGljdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coc2VsZWN0ZWRGdW5jdGlvbnMpO1xyXG4gICAgcmV0dXJuIHNlbGVjdGVkRnVuY3Rpb25zO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkUmFuZG9tRnVuY3Rpb25zKGlkLCBwcmVmaXgpIHtcclxuICAgIHZhciBzZWxlY3RlZEZ1bmN0aW9ucyA9IFtdO1xyXG4gICAgdmFyIHRhYmxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBjaGVja2JveGVzOlxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWJsZS5yb3dzWzJdLmNlbGxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRhYmxlLnJvd3NbMl0uY2VsbHNbaV0uY2hpbGRyZW5bMF0uY2hlY2tlZCkge1xyXG4gICAgICAgICAgICAvLyBjcmVhdGUgbmV3IGRpY3Q6XHJcbiAgICAgICAgICAgIHZhciByYW5kb21GdW5jdGlvbiA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuUmFuZG9tRnVuY3Rpb24oKTtcclxuICAgICAgICAgICAgdmFyIGZ1bmN0aW9uTmFtZSA9IHRhYmxlLnJvd3NbMF0uY2VsbHNbaV0udGV4dENvbnRlbnQ7XHJcblxyXG4gICAgICAgICAgICAvLyBhZGQgYWRkaXRpb25hbCBwYXJhbWV0ZXJzOlxyXG4gICAgICAgICAgICByYW5kb21GdW5jdGlvbi5yYW5kb21fZnVuY3Rpb24gPSBmdW5jdGlvbk5hbWU7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoZnVuY3Rpb25OYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiemVyb3NcIjpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJnYW1tYVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbUZ1bmN0aW9uLmFscGhhID0gcGFyc2VJbnB1dExpc3QocHJlZml4ICsgXCJHYW1tYUFscGhhXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbUZ1bmN0aW9uLmJldGEgPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIkdhbW1hQmV0YVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5zZWVkID0gcGFyc2VJbnB1dExpc3QocHJlZml4ICsgXCJHYW1tYVNlZWRcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwibm9ybWFsXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24ubWVhbiA9IHBhcnNlSW5wdXRMaXN0KHByZWZpeCArIFwiTm9ybWFsTWVhblwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5zdGRkZXYgPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIk5vcm1hbFN0ZGRldlwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5zZWVkID0gcGFyc2VJbnB1dExpc3QocHJlZml4ICsgXCJOb3JtYWxTZWVkXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInBvaXNzb25cIjpcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5sYW0gPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIlBvaXNzb25MYW1cIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24uc2VlZCA9IHBhcnNlSW5wdXRMaXN0KHByZWZpeCArIFwiUG9pc3NvblNlZWRcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwidW5pZm9ybVwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbUZ1bmN0aW9uLm1pbnZhbCA9IHBhcnNlSW5wdXRMaXN0KHByZWZpeCArIFwiVW5pZm9ybU1pbnZhbFwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5tYXh2YWwgPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIlVuaWZvcm1NYXh2YWxcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24uc2VlZCA9IHBhcnNlSW5wdXRMaXN0KHByZWZpeCArIFwiVW5pZm9ybVNlZWRcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGFkZCBkaWN0IHRvIGxpc3RcclxuICAgICAgICAgICAgc2VsZWN0ZWRGdW5jdGlvbnMucHVzaChyYW5kb21GdW5jdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coc2VsZWN0ZWRGdW5jdGlvbnMpO1xyXG4gICAgcmV0dXJuIHNlbGVjdGVkRnVuY3Rpb25zO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5pc2hTdW1tYXJ5VGlsZShjdXJyZW50VGlsZSkge1xyXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgLy8gZmluaXNoIG9sZCBzdW1tYXJ5IHRpbGU6XHJcblxyXG4gICAgICAgICAgICAvLyB1cGRhdGUgY2hhcnRzOlxyXG4gICAgICAgICAgICBjdXJyZW50VGlsZS5jb3N0Q2hhcnQucmVwbGFjZURhdGEoeydjb3N0JzogZGF0YS5jb3N0fSk7XHJcbiAgICAgICAgICAgIGN1cnJlbnRUaWxlLmxlYXJuaW5nUmF0ZUNoYXJ0LnJlcGxhY2VEYXRhKHsnbGVhcm5pbmcgcmF0ZSc6IGRhdGEuY3VycmVudExlYXJuaW5nUmF0ZX0pO1xyXG5cclxuICAgICAgICAgICAgLy9tYXJrIHRpbGUgYXMgY29tcGxldGVseSB0cmFpbmVkXHJcbiAgICAgICAgICAgIGN1cnJlbnRUaWxlLm1hcmtBc0ZpbmlzaGVkKCEoZGF0YS50cmFpbl9zdGF0dXMgPT09IFwiZmluaXNoZWRcIiB8fCBkYXRhLnRyYWluX3N0YXR1cyA9PT0gXCJydW5uaW5nXCIpKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH07XHJcblxyXG4gICAgdHVuZUFwaS5nZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZyhjdXJyZW50VGlsZS51dWlkLCBjYWxsYmFjayk7XHJcbn1cclxuXHJcblxyXG4vKlxyXG5NYWluIGJ1aWxkaW5nIGZ1bmN0aW9uc1xyXG4gKi9cclxuXHJcbi8vIGdldCBpbnB1dCAob3V0cHV0KSBkaW1lbnNpb25zXHJcbmZ1bmN0aW9uIGdldElucHV0RGltZW5zaW9ucygpIHtcclxuXHJcblxyXG4gICAgZnVuY3Rpb24gaW5wdXRTaGFwZUNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKCdBUEkgY2FsbGVkIHN1Y2Nlc3NmdWxseS4nKTtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIC8vdXBkYXRlIGlucHV0IHNoYXBlOlxyXG4gICAgICAgICAgICB2YXIgaW5wdXRTaGFwZSA9IGRhdGE7XHJcblxyXG4gICAgICAgICAgICAvLyBhZGQgcGxhY2Vob2xkZXIgZm9yIGZpcnN0IGRpbTpcclxuICAgICAgICAgICAgaW5wdXRTaGFwZVswXSA9IC0xO1xyXG5cclxuICAgICAgICAgICAgLy8gdXBkYXRlIHRvcG9sb2d5IGlucHV0IG91dHB1dCBsYXllcnM6XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGlucHV0U2hhcGUpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklucHV0U2hhcGVcIikudmFsdWUgPSBKU09OLnN0cmluZ2lmeShbaW5wdXRTaGFwZV0sIG51bGwsIDEpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coXCJ0ZXN0XCIpO1xyXG4gICAgYnVpbGRBcGkuZ2V0SW5wdXRTaGFwZShbXSwgaW5wdXRTaGFwZUNhbGxiYWNrKVxyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkTGVhcm5pbmdQYXJhbWV0ZXIoKSB7XHJcblxyXG4gICAgdmFyIGlucHV0UGFyYW1ldGVyTGlzdCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCgpO1xyXG4gICAgLy8gcmVhZCBnZW5lcmFsIHBhcmFtZXRlcnM6XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QudXNlX3RlbnNvcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1c2VUZW5zb3Jib2FyZFwiKS5jaGVja2VkO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LnZlcmJvc2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInZlcmJvc2VcIikuY2hlY2tlZDtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5zZXNzaW9uX3NhdmVyX3BhdGggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNlc3Npb25TYXZlclBhdGhcIikudmFsdWU7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3Quc2Vzc2lvbl9zYXZlX2R1cmF0aW9uID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNlc3Npb25TYXZlRHVyYXRpb25cIikudmFsdWUpXTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5udW1fdGVzdF9waWN0dXJlcyA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJudW1UZXN0UGljdHVyZXNcIikudmFsdWUpXTtcclxuXHJcbiAgICAvL3JlYWQgbmV0d29yayB0b3BvbG9neTpcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5pbnB1dF9zaGFwZSA9IEpTT04ucGFyc2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJbnB1dFNoYXBlXCIpLnZhbHVlLnRyaW0oKSk7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QubnVtYmVyX29mX3N0YWNrcyA9IEpTT04ucGFyc2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJOdW1iZXJPZlN0YWNrc1wiKS52YWx1ZS50cmltKCkpO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LmZpbHRlcl9zaXplcyA9IEpTT04ucGFyc2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJGaWx0ZXJTaXplc1wiKS52YWx1ZS50cmltKCkpO1xyXG5cclxuXHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QubWlycm9yX3dlaWdodHMgPSByZWFkM09wdGlvbkxpc3QoXCJtaXJyb3JXZWlnaHRzXCIpO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LmJhdGNoX3NpemUgPSBwYXJzZUlucHV0TGlzdChcImJhdGNoU2l6ZVwiLCB0cnVlKTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5uX2Vwb2NocyA9IHBhcnNlSW5wdXRMaXN0KFwibkVwb2Noc1wiLCB0cnVlKTtcclxuXHJcbiAgICAvLyByZWFkIGZ1bmN0aW9uczpcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5hY3RpdmF0aW9uX2Z1bmN0aW9uID0gcmVhZEFjdGl2YXRpb25GdW5jdGlvbnMoKTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5sZWFybmluZ19yYXRlX2RpY3QgPSByZWFkTGVhcm5pbmdSYXRlRnVuY3Rpb25zKCk7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3Qub3B0aW1pemVyID0gcmVhZE9wdGltaXplckZ1bmN0aW9ucygpO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0Lm1vbWVudHVtID0gcGFyc2VJbnB1dExpc3QoXCJNb21lbnR1bVwiLCB0cnVlKTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5jb3N0X2Z1bmN0aW9uX2RpY3QgPSByZWFkQ29zdEZ1bmN0aW9ucygpO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LnJhbmRvbV93ZWlnaHRzX2RpY3QgPSByZWFkUmFuZG9tRnVuY3Rpb25zKFwicmFuZG9tRnVuY3Rpb25zRm9yV2VpZ2h0c1RhYmxlXCIsIFwicndcIik7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QucmFuZG9tX2JpYXNlc19kaWN0ID0gcmVhZFJhbmRvbUZ1bmN0aW9ucyhcInJhbmRvbUZ1bmN0aW9uc0ZvckJpYXNlc1RhYmxlXCIsIFwicmJcIik7XHJcblxyXG4gICAgY29uc29sZS5sb2coaW5wdXRQYXJhbWV0ZXJMaXN0KTtcclxuICAgIHJldHVybiBpbnB1dFBhcmFtZXRlckxpc3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJ1aWxkQU5OKCkge1xyXG5cclxuICAgIC8vIGdldCBsZWFybmluZyBwYXJhbWV0ZXJzIChzaWRlYmFyKTpcclxuICAgIHZhciBpbnB1dFBhcmFtZXRlcnMgPSByZWFkTGVhcm5pbmdQYXJhbWV0ZXIoKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhpbnB1dFBhcmFtZXRlcnMpO1xyXG5cclxuXHJcbiAgICAvKlxyXG4gICAgICAgIGluaXRpYWxpemUgQVBJIGNhbGxcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzcG9uc2VMYWJlbFwiKS50ZXh0Q29udGVudCA9IHJlc3BvbnNlLnRleHQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKHR1bmVBcGkpO1xyXG4gICAgdHVuZUFwaS5idWlsZEdyaWRTZWFyY2hBTk4oaW5wdXRQYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcblxyXG5cclxufVxyXG5cclxuXHJcbi8qXHJcbk1haW4gdHVuaW5nIGZ1bmN0aW9uc1xyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRyYWluSW1hZ2VzKCkge1xyXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIC8vZ2V0IGltYWdlIHBhbmVcclxuICAgICAgICAgICAgdmFyIGltYWdlR3JpZCA9IGN1cnJlbnRUaWxlLmltYWdlR3JpZDtcclxuXHJcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhbGwgcHJldmlvdXMgZWxlbWVudHM6XHJcbiAgICAgICAgICAgIGltYWdlR3JpZC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuICAgICAgICAgICAgLy8gYWRkIGltYWdlIHBhaXJzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5pbnB1dExheWVyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgbmV3IHRhYmxlIHJvdzpcclxuICAgICAgICAgICAgICAgIHZhciB0YWJsZVJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0clwiKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGNlbGwgZm9yIGlucHV0IGltYWdlXHJcbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRDZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBpbnB1dCBpbWFnZSBvYmplY3RcclxuICAgICAgICAgICAgICAgIHZhciBuZXdJbnB1dEltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgICAgICAgICAgICAgIG5ld0lucHV0SW1hZ2UuaWQgPSBcIklucHV0SW1hZ2VfXCIgKyBkYXRhLmlucHV0TGF5ZXJbaV0uaWQ7XHJcbiAgICAgICAgICAgICAgICBuZXdJbnB1dEltYWdlLnNyYyA9IFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgZGF0YS5pbnB1dExheWVyW2ldLmJ5dGVzdHJpbmcuc3Vic3RyaW5nKDIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5pbnB1dExheWVyW2ldLmJ5dGVzdHJpbmcubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgICAgICAgICBuZXdJbnB1dEltYWdlLnN0eWxlLndpZHRoID0gXCIxNjBweFwiO1xyXG4gICAgICAgICAgICAgICAgbmV3SW5wdXRJbWFnZS5jbGFzcyA9IFwiaW1hZ2VUaHVtYm5haWxcIjtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhcHBlbmQgbmV3IGltYWdlIHRvIGltYWdlIGdyaWRcclxuICAgICAgICAgICAgICAgIGlucHV0Q2VsbC5hcHBlbmRDaGlsZChuZXdJbnB1dEltYWdlKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlUm93LmFwcGVuZENoaWxkKGlucHV0Q2VsbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBsYXRlbnQgaW1hZ2Ugb2JqZWN0XHJcbiAgICAgICAgICAgICAgICB2YXIgbGF0ZW50Q2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZFwiKTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZGF0YS5sYXRlbnRMYXllcltpXS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdMYXRlbnRJbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3TGF0ZW50SW1hZ2UuaWQgPSBcIkxhdGVudEltYWdlX1wiICsgZGF0YS5sYXRlbnRMYXllcltpXVtqXS5pZCArIFwiX1wiICsgajtcclxuICAgICAgICAgICAgICAgICAgICBuZXdMYXRlbnRJbWFnZS5zcmMgPSBcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxcIiArIGRhdGEubGF0ZW50TGF5ZXJbaV1bal0uYnl0ZXN0cmluZy5zdWJzdHJpbmcoMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5sYXRlbnRMYXllcltpXVtqXS5ieXRlc3RyaW5nLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xhdGVudEltYWdlLnN0eWxlLndpZHRoID0gXCI0MHB4XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3TGF0ZW50SW1hZ2UuY2xhc3MgPSBcImltYWdlVGh1bWJuYWlsXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYXBwZW5kIG5ldyBpbWFnZSBkaXYgdG8gaW1hZ2UgZ3JpZFxyXG4gICAgICAgICAgICAgICAgICAgIGxhdGVudENlbGwuYXBwZW5kQ2hpbGQobmV3TGF0ZW50SW1hZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoaisxKSAlIDQgPT09IDApeyAvL01hdGguY2VpbChNYXRoLnNxcnQoZGF0YS5sYXRlbnRMYXllcltpXS5sZW5ndGgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRlbnRDZWxsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBhcHBlbmQgbmV3IGltYWdlIGRpdiB0byBpbWFnZSBncmlkXHJcbiAgICAgICAgICAgICAgICB0YWJsZVJvdy5hcHBlbmRDaGlsZChsYXRlbnRDZWxsKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLyovLyBhZGQgZXZlbnRMaXN0ZW5lclxyXG4gICAgICAgICAgICAgICAgLy8gY2hhbmdlIHByZXZpZXcgdmlld1xyXG4gICAgICAgICAgICAgICAgbmV3SW5wdXRJbWFnZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW1hZ2VQcmV2aWV3XCIpLnNyYyA9IHRoaXMuc3JjO1xyXG4gICAgICAgICAgICAgICAgfSk7Ki9cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgY2VsbCBmb3IgaW5wdXQgaW1hZ2VcclxuICAgICAgICAgICAgICAgIHZhciBvdXRwdXRDZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBvdXRwdXQgaW1hZ2Ugb2JqZWN0XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3T3V0cHV0SW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3T3V0cHV0SW1hZ2UuaWQgPSBcIk91dHB1dEltYWdlX1wiICsgZGF0YS5vdXRwdXRMYXllcltpXS5pZDtcclxuICAgICAgICAgICAgICAgIG5ld091dHB1dEltYWdlLnNyYyA9IFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgZGF0YS5vdXRwdXRMYXllcltpXS5ieXRlc3RyaW5nLnN1YnN0cmluZygyLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEub3V0cHV0TGF5ZXJbaV0uYnl0ZXN0cmluZy5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgIG5ld091dHB1dEltYWdlLnN0eWxlLndpZHRoID0gXCIxNjBweFwiO1xyXG4gICAgICAgICAgICAgICAgbmV3T3V0cHV0SW1hZ2UuY2xhc3MgPSBcImltYWdlVGh1bWJuYWlsXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYXBwZW5kIG5ldyBpbWFnZSB0byBpbWFnZSBncmlkXHJcbiAgICAgICAgICAgICAgICBvdXRwdXRDZWxsLmFwcGVuZENoaWxkKG5ld091dHB1dEltYWdlKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlUm93LmFwcGVuZENoaWxkKG91dHB1dENlbGwpO1xyXG5cclxuICAgICAgICAgICAgICAgIGltYWdlR3JpZC5hcHBlbmRDaGlsZCh0YWJsZVJvdyk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdHVuZUFwaS5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmcoMywgY2FsbGJhY2spO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVHJhaW5TdGF0aXN0aWNzKCkge1xyXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEudHJhaW5fc3RhdHVzKTtcclxuXHJcbiAgICAgICAgICAgIC8vdXBkYXRlIHRpbGVzXHJcbiAgICAgICAgICAgIC8vIHNwZWNpYWwgY2FzZTogZmlyc3QgdGlsZTpcclxuICAgICAgICAgICAgaWYgKGN1cnJlbnRUaWxlID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgbmV3IHRpbGU6XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VGlsZSA9IG5ldyBTdW1tYXJ5VGlsZShcInN1bW1hcnlUaWxlc1wiLCBkYXRhLm1vZGVsX2lkKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50VGlsZS51dWlkICE9PSBkYXRhLm1vZGVsX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBmaW5pc2ggb2xkIHN1bW1hcnkgdGlsZTpcclxuICAgICAgICAgICAgICAgIGZpbmlzaFN1bW1hcnlUaWxlKGN1cnJlbnRUaWxlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBzdG9yZSBvbGQgdGlsZSBpbiBhcnJheTpcclxuICAgICAgICAgICAgICAgIHByZXZpb3VzVGlsZXMucHVzaChjdXJyZW50VGlsZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyB0aWxlOlxyXG4gICAgICAgICAgICAgICAgY3VycmVudFRpbGUgPSBuZXcgU3VtbWFyeVRpbGUoXCJzdW1tYXJ5VGlsZXNcIiwgZGF0YS5tb2RlbF9pZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vdXBkYXRlIGRpYWdyYW1zXHJcbiAgICAgICAgICAgIGlmIChkYXRhLmNvc3QubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY3VycmVudFRpbGUuY29zdENoYXJ0LmFwcGVuZERhdGEoeydjb3N0JzogZGF0YS5jb3N0fSk7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VGlsZS5sZWFybmluZ1JhdGVDaGFydC5hcHBlbmREYXRhKHsnbGVhcm5pbmcgcmF0ZSc6IGRhdGEuY3VycmVudExlYXJuaW5nUmF0ZX0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChkYXRhLnRyYWluX3N0YXR1cyA9PT0gXCJmaW5pc2hlZFwiIHx8IGRhdGEudHJhaW5fc3RhdHVzID09PSBcImFib3J0ZWRcIiB8fCBkYXRhLnRyYWluX3N0YXR1cyA9PT0gXCJhYm9ydGluZ1wiKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzdG9wIHVwZGF0ZSB0aW1lclxyXG4gICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh1cGRhdGVUaW1lcik7XHJcbiAgICAgICAgICAgICAgICAvLyBmaW5pc2ggc3VtbWFyeSB0aWxlXHJcbiAgICAgICAgICAgICAgICBmaW5pc2hTdW1tYXJ5VGlsZShjdXJyZW50VGlsZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9O1xyXG5cclxuICAgIHR1bmVBcGkuZ2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZyhjYWxsYmFjayk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcInRpY2tcIik7XHJcblxyXG4gICAgLy8gdXBkYXRlIGNoYXJ0czpcclxuICAgIHVwZGF0ZVRyYWluU3RhdGlzdGljcygpO1xyXG5cclxuICAgIC8vIHVwZGF0ZSB0cmFpbiBpbWFnZXM6XHJcbiAgICB1cGRhdGVUcmFpbkltYWdlcygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzdGFydFR1bmluZygpIHtcclxuXHJcbiAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNwb25zZUxhYmVsXCIpLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGV4dDtcclxuXHJcbiAgICAgICAgICAgIC8vIHN0YXJ0IHVwZGF0ZSB0aW1lclxyXG4gICAgICAgICAgICB1cGRhdGVUaW1lciA9IHNldEludGVydmFsKHVwZGF0ZVZpZXcsIDUwMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBoaWRlIGxlYXJuaW5nIHBhcmFtZXRlcnM6XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxlYXJuaW5nUGFyYW1ldGVyc1wiKS5vcGVuID0gZmFsc2U7XHJcbiAgICB0dW5lQXBpLmNvbnRyb2xUdW5pbmcoJ1wic3RhcnRcIicsIGNhbGxiYWNrKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3RvcFR1bmluZygpIHtcclxuXHJcbiAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNwb25zZUxhYmVsXCIpLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGV4dDtcclxuXHJcbiAgICAgICAgICAgIC8vIHN0b3AgdXBkYXRlIHRpbWVyXHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodXBkYXRlVGltZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBzaG93IGxlYXJuaW5nIHBhcmFtZXRlcnM6XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxlYXJuaW5nUGFyYW1ldGVyc1wiKS5vcGVuID0gdHJ1ZTtcclxuICAgIHR1bmVBcGkuY29udHJvbFR1bmluZygnXCJzdG9wXCInLCBjYWxsYmFjayk7XHJcbn1cclxuXHJcblxyXG4vKlxyXG5FdmVudCBMaXN0ZW5lclxyXG4gKi9cclxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJidWlsZEFOTlwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYnVpbGRBTk4pO1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXJ0R3JpZFNlYXJjaFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3RhcnRUdW5pbmcpO1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0b3BHcmlkU2VhcmNoXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzdG9wVHVuaW5nKTtcclxuLy9cclxuXHJcbi8qXHJcbm9uIGxvYWRcclxuICovXHJcbi8vIGdldCBpbnB1dCBzaGFwZVxyXG5nZXRJbnB1dERpbWVuc2lvbnMoKTtcclxuXHJcbi8vIHNob3cgcGFyYW1ldGVyc1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxlYXJuaW5nUGFyYW1ldGVyc1wiKS5vcGVuID0gdHJ1ZTtcclxuXHJcblxyXG4vLyAvLyBnZXQgaW5wdXQgKG91dHB1dCkgZGltZW5zaW9uc1xyXG4vLyBmdW5jdGlvbiBnZXRJbnB1dERpbWVuc2lvbnMoKSB7XHJcbi8vXHJcbi8vXHJcbi8vICAgICBmdW5jdGlvbiBpbnB1dFNoYXBlQ2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbi8vICAgICAgICAgaWYgKGVycm9yKSB7XHJcbi8vICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4vLyAgICAgICAgIH0gZWxzZSB7XHJcbi8vICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0FQSSBjYWxsZWQgc3VjY2Vzc2Z1bGx5LicpO1xyXG4vLyAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbi8vXHJcbi8vXHJcbi8vICAgICAgICAgICAgIC8vdXBkYXRlIGlucHV0IHNoYXBlOlxyXG4vLyAgICAgICAgICAgICBpbnB1dFNoYXBlID0gZGF0YTtcclxuLy9cclxuLy8gICAgICAgICAgICAgLy8gYWRkIHBsYWNlaG9sZGVyIGZvciBmaXJzdCBkaW06XHJcbi8vICAgICAgICAgICAgIGlucHV0U2hhcGVbMF0gPSAtMTtcclxuLy9cclxuLy8gICAgICAgICAgICAgLy8gdXBkYXRlIHRvcG9sb2d5IGlucHV0IG91dHB1dCBsYXllcnM6XHJcbi8vICAgICAgICAgICAgIHVwZGF0ZUlucHV0T3V0cHV0TGF5ZXIoaW5wdXRTaGFwZVsxXSwgaW5wdXRTaGFwZVsyXSwgaW5wdXRTaGFwZVszXSk7XHJcbi8vXHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgfVxyXG4vL1xyXG4vLyAgICAgY29uc29sZS5sb2coXCJ0ZXN0XCIpO1xyXG4vLyAgICAgYnVpbGRBcGkuZ2V0SW5wdXRTaGFwZShbXSwgaW5wdXRTaGFwZUNhbGxiYWNrKVxyXG4vLyB9XHJcbi8vXHJcbi8vIGZ1bmN0aW9uIHVwZGF0ZUlucHV0T3V0cHV0TGF5ZXIocmVzWCwgcmVzWSwgY2hhbm5lbHMpIHtcclxuLy8gICAgIC8vdXBkYXRlIHZpZXc6XHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc1hMYWJlbFwiKS50ZXh0Q29udGVudCA9IHJlc1g7XHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc1hMYWJlbDJcIikudGV4dENvbnRlbnQgPSByZXNYO1xyXG4vLyAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNZTGFiZWxcIikudGV4dENvbnRlbnQgPSByZXNZO1xyXG4vLyAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNZTGFiZWwyXCIpLnRleHRDb250ZW50ID0gcmVzWTtcclxuLy8gICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhbm5lbExhYmVsXCIpLnRleHRDb250ZW50ID0gY2hhbm5lbHM7XHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYW5uZWxMYWJlbDJcIikudGV4dENvbnRlbnQgPSBjaGFubmVscztcclxuLy9cclxuLy8gfVxyXG5cclxuLy9cclxuLy8gZnVuY3Rpb24gYWRkTGF5ZXIoZXZlbnQsIGZpbHRlcnNpemUsIG51bVN0YWNrcykge1xyXG4vLyAgICAgLy9yZWFkIHBhcmFtZXRlcnM6XHJcbi8vICAgICBmaWx0ZXJzaXplID0gZmlsdGVyc2l6ZSB8fCAyO1xyXG4vLyAgICAgbnVtU3RhY2tzID0gbnVtU3RhY2tzIHx8IDQ7XHJcbi8vICAgICAvKlxyXG4vLyAgICAgZ2V0IGN1cnJlbnQgQU5OIHRvcG9sb2d5IGluZm9ybWF0aW9uXHJcbi8vICAgICAgKi9cclxuLy9cclxuLy8gICAgIC8vIGdldCBlbmNvZGVyIGNvdW50XHJcbi8vICAgICB2YXIgZW5jb2RlckNvdW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlbmNvZGVyXCIpLmNoaWxkcmVuLmxlbmd0aCAtIDE7IC8vIG9uZSBjaGlsZCBpcyBpbnB1dCBsYXllclxyXG4vL1xyXG4vLyAgICAgLypcclxuLy8gICAgIGFwcGVuZCBFbmNvZGVyIGxheWVyXHJcbi8vICAgICAqL1xyXG4vLyAgICAgY29uc29sZS5sb2coXCJhZGQgZW5jb2RlclwiKTtcclxuLy9cclxuLy8gICAgIC8vIGdlbmVyYXRlIGRpdlxyXG4vLyAgICAgdmFyIGVuY29kZXJEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5pZCA9IFwiZW5jb2RlckxheWVyX1wiICsgKGVuY29kZXJDb3VudCArIDEpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5jbGFzc05hbWUgPSBcIkFOTkxheWVyXCI7XHJcbi8vXHJcbi8vICAgICAvLyBnZW5lcmF0ZSBpbnB1dCBmaWVsZHM6XHJcbi8vICAgICB2YXIgZmlsdGVyc2l6ZUlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LnR5cGUgPSBcIm51bWJlclwiO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LnZhbHVlID0gZmlsdGVyc2l6ZTtcclxuLy8gICAgIGZpbHRlcnNpemVJbnB1dC5zdHlsZS53aWR0aCA9IFwiMzBweFwiO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LmlkID0gXCJmaWx0ZXJzaXplRUxcIiArIChlbmNvZGVyQ291bnQgKyAxKTtcclxuLy9cclxuLy8gICAgIHZhciBudW1TdGFja3NJbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuLy8gICAgIG51bVN0YWNrc0lucHV0LnR5cGUgPSBcIm51bWJlclwiO1xyXG4vLyAgICAgbnVtU3RhY2tzSW5wdXQudmFsdWUgPSBudW1TdGFja3M7XHJcbi8vICAgICBudW1TdGFja3NJbnB1dC5zdHlsZS53aWR0aCA9IFwiMzBweFwiO1xyXG4vLyAgICAgbnVtU3RhY2tzSW5wdXQuaWQgPSBcIm51bVN0YWNrc0VMXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vXHJcbi8vICAgICAvLyBnZW5lcmF0ZSByZW1vdmUgYnV0dG9uOlxyXG4vLyAgICAgdmFyIHJlbW92ZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbi8vICAgICByZW1vdmVCdXR0b24uaWQgPSBcInJlbW92ZUVMXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vICAgICByZW1vdmVCdXR0b24udGV4dENvbnRlbnQgPSBcIi1cIjtcclxuLy9cclxuLy8gICAgIC8vIGFwcGVuZCBlbGVtZW50cyB0byBkaXY6XHJcbi8vICAgICBlbmNvZGVyRGl2LmFwcGVuZChcIkVuY29kZXIgTGF5ZXIgXCIgKyAoZW5jb2RlckNvdW50ICsgMSkgKyBcIjogXCIpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpKTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKSk7XHJcbi8vICAgICBlbmNvZGVyRGl2LmFwcGVuZChcIkZpbHRlcnNpemU6IFwiKTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kQ2hpbGQoZmlsdGVyc2l6ZUlucHV0KTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kKFwiIE51bWJlciBvZiBTdGFja3M6IFwiKTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kQ2hpbGQobnVtU3RhY2tzSW5wdXQpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5hcHBlbmRDaGlsZChyZW1vdmVCdXR0b24pO1xyXG4vL1xyXG4vLyAgICAgLy9hcHBlbmQgdG8gRE9NXHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVuY29kZXJcIikuYXBwZW5kQ2hpbGQoZW5jb2RlckRpdik7XHJcbi8vXHJcbi8vXHJcbi8vICAgICAvKlxyXG4vLyAgICAgYXBwZW5kIGRlY29kZXIgbGF5ZXJcclxuLy8gICAgICovXHJcbi8vICAgICBjb25zb2xlLmxvZyhcImFkZCBkZWNvZGVyXCIpO1xyXG4vL1xyXG4vLyAgICAgLy8gZ2VuZXJhdGUgZGl2XHJcbi8vICAgICB2YXIgZGVjb2RlckRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbi8vICAgICBkZWNvZGVyRGl2LmlkID0gXCJkZWNvZGVyTGF5ZXJfXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vICAgICBkZWNvZGVyRGl2LmNsYXNzTmFtZSA9IFwiQU5OTGF5ZXJcIjtcclxuLy9cclxuLy8gICAgIC8vIGdlbmVyYXRlIGxhYmVsczpcclxuLy8gICAgIHZhciBmaWx0ZXJzaXplTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIik7XHJcbi8vICAgICBmaWx0ZXJzaXplTGFiZWwudGV4dENvbnRlbnQgPSBmaWx0ZXJzaXplO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUxhYmVsLmlkID0gXCJmaWx0ZXJzaXplRExcIiArIChlbmNvZGVyQ291bnQgKyAxKTtcclxuLy9cclxuLy8gICAgIHZhciBudW1TdGFja3NMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiKTtcclxuLy8gICAgIG51bVN0YWNrc0xhYmVsLnRleHRDb250ZW50ID0gbnVtU3RhY2tzO1xyXG4vLyAgICAgbnVtU3RhY2tzTGFiZWwuaWQgPSBcIm51bVN0YWNrc0RMXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vXHJcbi8vICAgICAvLyBhcHBlbmQgZWxlbWVudHMgdG8gZGl2OlxyXG4vLyAgICAgZGVjb2RlckRpdi5hcHBlbmQoXCJEZWNvZGVyIExheWVyIFwiICsgKGVuY29kZXJDb3VudCArIDEpICsgXCI6IFwiKTtcclxuLy8gICAgIGRlY29kZXJEaXYuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKSk7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xyXG4vLyAgICAgZGVjb2RlckRpdi5hcHBlbmQoXCJGaWx0ZXJzaXplOiBcIik7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZENoaWxkKGZpbHRlcnNpemVMYWJlbCk7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZChcIiBOdW1iZXIgb2YgU3RhY2tzOiBcIik7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZENoaWxkKG51bVN0YWNrc0xhYmVsKTtcclxuLy9cclxuLy8gICAgIC8vYXBwZW5kIHRvIERPTVxyXG4vLyAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZWNvZGVyXCIpLmluc2VydEJlZm9yZShkZWNvZGVyRGl2LCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlY29kZXJcIikuZmlyc3RDaGlsZCk7XHJcbi8vXHJcbi8vICAgICAvKlxyXG4vLyAgICAgbGluayBpbnB1dCBmaWVsZHNcclxuLy8gICAgICAqL1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKCkge1xyXG4vLyAgICAgICAgIGZpbHRlcnNpemVMYWJlbC50ZXh0Q29udGVudCA9IGZpbHRlcnNpemVJbnB1dC52YWx1ZTtcclxuLy8gICAgIH0pO1xyXG4vLyAgICAgbnVtU3RhY2tzSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XHJcbi8vICAgICAgICAgbnVtU3RhY2tzTGFiZWwudGV4dENvbnRlbnQgPSBudW1TdGFja3NJbnB1dC52YWx1ZTtcclxuLy8gICAgIH0pO1xyXG4vL1xyXG4vLyAgICAgLypcclxuLy8gICAgIGF0dGFjaCByZW1vdmUgYnV0dG9uXHJcbi8vICAgICAgKi9cclxuLy8gICAgIHJlbW92ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4vLyAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZW5jb2RlclwiKS5yZW1vdmVDaGlsZChlbmNvZGVyRGl2KTtcclxuLy8gICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlY29kZXJcIikucmVtb3ZlQ2hpbGQoZGVjb2RlckRpdik7XHJcbi8vICAgICAgICAgY29uc29sZS5sb2coXCJsYXllciByZW1vdmVkXCIpO1xyXG4vLyAgICAgfSlcclxuLy8gfVxyXG4vL1xyXG4vLyBmdW5jdGlvbiBidWlsZEFOTigpIHtcclxuLy8gICAgIC8vIGdldCBBTk4gdG9wb2xvZ3k6XHJcbi8vICAgICB2YXIgZmlsdGVyU2l6ZXMgPSBbXTtcclxuLy8gICAgIHZhciBudW1TdGFja3MgPSBbXTtcclxuLy8gICAgIHZhciBudW1FbmNvZGVyTGF5ZXJzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlbmNvZGVyXCIpLmNoaWxkRWxlbWVudENvdW50O1xyXG4vLyAgICAgY29uc29sZS5sb2cobnVtRW5jb2RlckxheWVycyk7XHJcbi8vICAgICBmb3IgKHZhciBpID0gMTsgaSA8IG51bUVuY29kZXJMYXllcnM7IGkrKykge1xyXG4vLyAgICAgICAgIC8vIGdldCBmaWx0ZXJzaXplIG9mIGN1cnJlbnQgbGF5ZXI6XHJcbi8vICAgICAgICAgZmlsdGVyU2l6ZXMucHVzaChOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmaWx0ZXJzaXplRUxcIiArIGkpLnZhbHVlKSk7XHJcbi8vICAgICAgICAgLy8gZ2V0IG51bWJlciBvZiBTdGFja3Mgb2YgY3VycmVudCBsYXllclxyXG4vLyAgICAgICAgIG51bVN0YWNrcy5wdXNoKE51bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm51bVN0YWNrc0VMXCIgKyBpKS52YWx1ZSkpO1xyXG4vLyAgICAgfVxyXG4vL1xyXG4vLyAgICAgY29uc29sZS5sb2coaW5wdXRTaGFwZSk7XHJcbi8vICAgICBjb25zb2xlLmxvZyhmaWx0ZXJTaXplcyk7XHJcbi8vICAgICBjb25zb2xlLmxvZyhudW1TdGFja3MpO1xyXG4vLyAgICAgLy8gZ2V0IGxlYXJuaW5nIHBhcmFtZXRlcnMgKHNpZGViYXIpOlxyXG4vLyAgICAgdmFyIGlucHV0UGFyYW1ldGVycyA9IHJlYWRMZWFybmluZ1BhcmFtZXRlcigpO1xyXG4vL1xyXG4vLyAgICAgLy8gc2F2ZSB0b3BvbG9neSBpbmZvcm1hdGlvblxyXG4vLyAgICAgaW5wdXRQYXJhbWV0ZXJzLmlucHV0X3NoYXBlID0gW2lucHV0U2hhcGVdO1xyXG4vLyAgICAgaW5wdXRQYXJhbWV0ZXJzLmZpbHRlcl9zaXplcyA9IFtmaWx0ZXJTaXplc107XHJcbi8vICAgICBpbnB1dFBhcmFtZXRlcnMubnVtYmVyX29mX3N0YWNrcyA9IFtudW1TdGFja3NdO1xyXG4vL1xyXG4vLyAgICAgY29uc29sZS5sb2coaW5wdXRQYXJhbWV0ZXJzKTtcclxuLy9cclxuLy9cclxuLy8gICAgIC8qXHJcbi8vICAgICAgICAgaW5pdGlhbGl6ZSBBUEkgY2FsbFxyXG4vLyAgICAgICovXHJcbi8vXHJcbi8vICAgICB2YXIgYnVpbGRBcGkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkJ1aWxkQXBpKCk7XHJcbi8vXHJcbi8vXHJcbi8vICAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuLy8gICAgICAgICBpZiAoZXJyb3IpIHtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbi8vICAgICAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG4vLyAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuLy8gICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNwb25zZUxhYmVsXCIpLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGV4dDtcclxuLy8gICAgICAgICB9XHJcbi8vICAgICB9XHJcbi8vXHJcbi8vICAgICBidWlsZEFwaS5idWlsZEFOTihpbnB1dFBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuLy9cclxuLy9cclxuLy8gfVxyXG4vL1xyXG4vL1xyXG4vLyAvKlxyXG4vLyBHbG9iYWwgdmFyaWFibGVzXHJcbi8vICAqL1xyXG4vL1xyXG4vLyB2YXIgaW5wdXRTaGFwZSA9IFstMSwgLTEsIC0xLCAtMV07XHJcbi8vXHJcbi8vXHJcblxyXG4vLyBnZXRJbnB1dERpbWVuc2lvbnMoKTtcclxuLy9cclxuLy8gLy8gYWRkIHNhbXBsZSBBTk5cclxuLy8gYWRkTGF5ZXIobnVsbCwgMywgMTIpO1xyXG4vLyBhZGRMYXllcihudWxsLCAzLCAxMCk7XHJcbi8vIGFkZExheWVyKG51bGwsIDIsIDEwKTtcclxuLy8gYWRkTGF5ZXIobnVsbCwgMiwgNik7XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbiJdfQ==
