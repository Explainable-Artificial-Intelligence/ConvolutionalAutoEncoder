(function () {
    function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof require == "function" && require;
                    if (!u && a) return a(o, !0);
                    if (i) return i(o, !0);
                    var f = new Error("Cannot find module '" + o + "'");
                    throw f.code = "MODULE_NOT_FOUND", f
                }
                var l = n[o] = {exports: {}};
                t[o][0].call(l.exports, function (e) {
                    var n = t[o][1][e];
                    return s(n ? n : e)
                }, l, l.exports, e, t, n, r)
            }
            return n[o].exports
        }

        var i = typeof require == "function" && require;
        for (var o = 0; o < r.length; o++) s(r[o]);
        return s
    }

    return e
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
                tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
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

        function assertSize(size) {
            if (typeof size !== 'number') {
                throw new TypeError('"size" argument must be a number')
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

        function base64clean(str) {
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

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
        function isArrayBufferView(obj) {
            return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
        }

        function numberIsNaN(obj) {
            return obj !== obj // eslint-disable-line no-self-compare
        }

    }, {"base64-js": 1, "ieee754": 4}],
    4: [function (require, module, exports) {
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
            for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
            }

            m = e & ((1 << (-nBits)) - 1)
            e >>= (-nBits)
            nBits += mLen
            for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
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
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/load/resetAllBatchIndices', 'POST',
                        pathParams, queryParams, headerParams, formParams, postBody,
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
                        'output': opts['output']
                    };
                    var headerParams = {};
                    var formParams = {};

                    var authNames = [];
                    var contentTypes = ['application/json'];
                    var accepts = ['application/json'];
                    var returnType = null;

                    return this.apiClient.callApi(
                        '/load/resetBatchIndex', 'POST',
                        pathParams, queryParams, headerParams, formParams, postBody,
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
         * Swagger Codegen version: 2.2.3
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
         * Swagger Codegen version: 2.2.3
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
             */
            exports.prototype['cf_cost_function'] = undefined;
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
         * Swagger Codegen version: 2.2.3
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
             */
            exports.prototype['use_tensorboard'] = undefined;
            /**
             * @member {Boolean} verbose
             */
            exports.prototype['verbose'] = undefined;
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


    }, {"../ApiClient": 16}],
    35: [function (require, module, exports) {
        /*
check if client and server are running correctly
 */
        var ConvolutionalAutoencoder = require('convolutional_autoencoder');

        var buildApi = new ConvolutionalAutoencoder.BuildApi();

// check API functionality
        function callback(error, data, response) {
            if (error) {
                console.error(error);
            } else {
                console.log('API called successfully.');
            }
        }

        buildApi.getInputShape([], callback);


        /*
Convolutional Auto Encoder topology
 */


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

        function readLearningParameter() {

            var inputParameterList = new ConvolutionalAutoencoder.ParameterList();
            // read general parameters:
            inputParameterList.use_tensorboard = document.getElementById("useTensorboard").checked;
            inputParameterList.verbose = document.getElementById("verbose").checked;
            inputParameterList.session_saver_path = document.getElementById("sessionSaverPath").value;
            inputParameterList.session_save_duration = [Number(document.getElementById("sessionSaveDuration").value)];
            inputParameterList.num_test_pictures = [Number(document.getElementById("numTestPictures").value)];


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

            return inputParameterList;
        }

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
        /*
Event Listener
 */
        document.getElementById("addLayer").addEventListener("click", addLayer);
        document.getElementById("buildANN").addEventListener("click", readLearningParameter);
//

        /*
on load
 */

        console.log(readLearningParameter());

// getInputDimensions();
//
// // add sample ANN
// addLayer(null, 3, 12);
// addLayer(null, 3, 10);
// addLayer(null, 2, 10);
// addLayer(null, 2, 6);


    }, {"convolutional_autoencoder": 22}]
}, {}, [35])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9iYXNlNjQtanMvaW5kZXguanMiLCJDOi9Vc2Vycy9MZW9uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZW5jb2RlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvaW5kZXguanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvY29tcG9uZW50LWVtaXR0ZXIvaW5kZXguanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvY2xpZW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2lzLWZ1bmN0aW9uLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2lzLW9iamVjdC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9yZXF1ZXN0LWJhc2UuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvcmVzcG9uc2UtYmFzZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9zaG91bGQtcmV0cnkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvdXRpbHMuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvQXBpQ2xpZW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2FwaS9CdWlsZEFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvTG9hZEFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvVHJhaW5BcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL1R1bmVBcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL1Zpc3VhbGl6ZUFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9pbmRleC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9DbHVzdGVyUGFyYW1ldGVycy5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9DbHVzdGVyaW5nLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0Nvc3RGdW5jdGlvbi5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9JbWFnZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9JbWFnZURhdGEuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvTGVhcm5pbmdSYXRlLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1BhcmFtZXRlckxpc3QuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUG9pbnQyRC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUmFuZG9tRnVuY3Rpb24uanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvVHJhaW5QZXJmb3JtYW5jZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9UcmFpblN0YXR1cy5qcyIsInR1bmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMTdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9rQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3paQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIHBsYWNlSG9sZGVyc0NvdW50IChiNjQpIHtcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG4gIC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcbiAgLy8gcmVwcmVzZW50IG9uZSBieXRlXG4gIC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuICAvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG4gIHJldHVybiBiNjRbbGVuIC0gMl0gPT09ICc9JyA/IDIgOiBiNjRbbGVuIC0gMV0gPT09ICc9JyA/IDEgOiAwXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICAvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbiAgcmV0dXJuIChiNjQubGVuZ3RoICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzQ291bnQoYjY0KVxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciBpLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIHBsYWNlSG9sZGVycyA9IHBsYWNlSG9sZGVyc0NvdW50KGI2NClcblxuICBhcnIgPSBuZXcgQXJyKChsZW4gKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnMpXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICBsID0gcGxhY2VIb2xkZXJzID4gMCA/IGxlbiAtIDQgOiBsZW5cblxuICB2YXIgTCA9IDBcblxuICBmb3IgKGkgPSAwOyBpIDwgbDsgaSArPSA0KSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8IHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBvdXRwdXQgPSAnJ1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPT0nXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArICh1aW50OFtsZW4gLSAxXSlcbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAxMF1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9J1xuICB9XG5cbiAgcGFydHMucHVzaChvdXRwdXQpXG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIiLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxudmFyIEtfTUFYX0xFTkdUSCA9IDB4N2ZmZmZmZmZcbmV4cG9ydHMua01heExlbmd0aCA9IEtfTUFYX0xFTkdUSFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBQcmludCB3YXJuaW5nIGFuZCByZWNvbW1lbmQgdXNpbmcgYGJ1ZmZlcmAgdjQueCB3aGljaCBoYXMgYW4gT2JqZWN0XG4gKiAgICAgICAgICAgICAgIGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBXZSByZXBvcnQgdGhhdCB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBpZiB0aGUgYXJlIG5vdCBzdWJjbGFzc2FibGVcbiAqIHVzaW5nIF9fcHJvdG9fXy4gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWBcbiAqIChTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOCkuIElFIDEwIGxhY2tzIHN1cHBvcnRcbiAqIGZvciBfX3Byb3RvX18gYW5kIGhhcyBhIGJ1Z2d5IHR5cGVkIGFycmF5IGltcGxlbWVudGF0aW9uLlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgY29uc29sZS5lcnJvciA9PT0gJ2Z1bmN0aW9uJykge1xuICBjb25zb2xlLmVycm9yKFxuICAgICdUaGlzIGJyb3dzZXIgbGFja3MgdHlwZWQgYXJyYXkgKFVpbnQ4QXJyYXkpIHN1cHBvcnQgd2hpY2ggaXMgcmVxdWlyZWQgYnkgJyArXG4gICAgJ2BidWZmZXJgIHY1LnguIFVzZSBgYnVmZmVyYCB2NC54IGlmIHlvdSByZXF1aXJlIG9sZCBicm93c2VyIHN1cHBvcnQuJ1xuICApXG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgLy8gQ2FuIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkP1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIGFyci5fX3Byb3RvX18gPSB7X19wcm90b19fOiBVaW50OEFycmF5LnByb3RvdHlwZSwgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9fVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnSWYgZW5jb2RpbmcgaXMgc3BlY2lmaWVkIHRoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZShhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20oYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIGEgbnVtYmVyJylcbiAgfVxuXG4gIGlmIChpc0FycmF5QnVmZmVyKHZhbHVlKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICByZXR1cm4gZnJvbU9iamVjdCh2YWx1ZSlcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBhIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgbmVnYXRpdmUnKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJlbmNvZGluZ1wiIG11c3QgYmUgYSB2YWxpZCBzdHJpbmcgZW5jb2RpbmcnKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdvZmZzZXRcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ2xlbmd0aFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKGlzQXJyYXlCdWZmZXJWaWV3KG9iaikgfHwgJ2xlbmd0aCcgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFOKG9iai5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIoMClcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iailcbiAgICB9XG5cbiAgICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSlcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgYXJyYXktbGlrZSBvYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIG11c3QgYmUgQnVmZmVycycpXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChpc0FycmF5QnVmZmVyVmlldyhzdHJpbmcpIHx8IGlzQXJyYXlCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoaXMgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCAoYW5kIHRoZSBgaXMtYnVmZmVyYCBucG0gcGFja2FnZSlcbi8vIHRvIGRldGVjdCBhIEJ1ZmZlciBpbnN0YW5jZS4gSXQncyBub3QgcG9zc2libGUgdG8gdXNlIGBpbnN0YW5jZW9mIEJ1ZmZlcmBcbi8vIHJlbGlhYmx5IGluIGEgYnJvd3NlcmlmeSBjb250ZXh0IGJlY2F1c2UgdGhlcmUgY291bGQgYmUgbXVsdGlwbGUgZGlmZmVyZW50XG4vLyBjb3BpZXMgb2YgdGhlICdidWZmZXInIHBhY2thZ2UgaW4gdXNlLiBUaGlzIG1ldGhvZCB3b3JrcyBldmVuIGZvciBCdWZmZXJcbi8vIGluc3RhbmNlcyB0aGF0IHdlcmUgY3JlYXRlZCBmcm9tIGFub3RoZXIgY29weSBvZiB0aGUgYGJ1ZmZlcmAgcGFja2FnZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE1NFxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG4vLyBGaW5kcyBlaXRoZXIgdGhlIGZpcnN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA+PSBgYnl0ZU9mZnNldGAsXG4vLyBPUiB0aGUgbGFzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPD0gYGJ5dGVPZmZzZXRgLlxuLy9cbi8vIEFyZ3VtZW50czpcbi8vIC0gYnVmZmVyIC0gYSBCdWZmZXIgdG8gc2VhcmNoXG4vLyAtIHZhbCAtIGEgc3RyaW5nLCBCdWZmZXIsIG9yIG51bWJlclxuLy8gLSBieXRlT2Zmc2V0IC0gYW4gaW5kZXggaW50byBgYnVmZmVyYDsgd2lsbCBiZSBjbGFtcGVkIHRvIGFuIGludDMyXG4vLyAtIGVuY29kaW5nIC0gYW4gb3B0aW9uYWwgZW5jb2RpbmcsIHJlbGV2YW50IGlzIHZhbCBpcyBhIHN0cmluZ1xuLy8gLSBkaXIgLSB0cnVlIGZvciBpbmRleE9mLCBmYWxzZSBmb3IgbGFzdEluZGV4T2ZcbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mIChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICAvLyBFbXB0eSBidWZmZXIgbWVhbnMgbm8gbWF0Y2hcbiAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHJldHVybiAtMVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID0gK2J5dGVPZmZzZXQgIC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAobnVtYmVySXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggPj4+IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpIC0gMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCkge1xuICAgIC8vIGFzY2VuZGluZyBjb3B5IGZyb20gc3RhcnRcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKGNvZGUgPCAyNTYpIHtcbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IG5ldyBCdWZmZXIodmFsLCBlbmNvZGluZylcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG4vLyBBcnJheUJ1ZmZlcnMgZnJvbSBhbm90aGVyIGNvbnRleHQgKGkuZS4gYW4gaWZyYW1lKSBkbyBub3QgcGFzcyB0aGUgYGluc3RhbmNlb2ZgIGNoZWNrXG4vLyBidXQgdGhleSBzaG91bGQgYmUgdHJlYXRlZCBhcyB2YWxpZC4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8XG4gICAgKG9iaiAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3RvciAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lID09PSAnQXJyYXlCdWZmZXInICYmXG4gICAgICB0eXBlb2Ygb2JqLmJ5dGVMZW5ndGggPT09ICdudW1iZXInKVxufVxuXG4vLyBOb2RlIDAuMTAgc3VwcG9ydHMgYEFycmF5QnVmZmVyYCBidXQgbGFja3MgYEFycmF5QnVmZmVyLmlzVmlld2BcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3IChvYmopIHtcbiAgcmV0dXJuICh0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSAnZnVuY3Rpb24nKSAmJiBBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKVxufVxuXG5mdW5jdGlvbiBudW1iZXJJc05hTiAob2JqKSB7XG4gIHJldHVybiBvYmogIT09IG9iaiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBJZiBvYmouaGFzT3duUHJvcGVydHkgaGFzIGJlZW4gb3ZlcnJpZGRlbiwgdGhlbiBjYWxsaW5nXG4vLyBvYmouaGFzT3duUHJvcGVydHkocHJvcCkgd2lsbCBicmVhay5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy8xNzA3XG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHFzLCBzZXAsIGVxLCBvcHRpb25zKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICB2YXIgb2JqID0ge307XG5cbiAgaWYgKHR5cGVvZiBxcyAhPT0gJ3N0cmluZycgfHwgcXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHZhciByZWdleHAgPSAvXFwrL2c7XG4gIHFzID0gcXMuc3BsaXQoc2VwKTtcblxuICB2YXIgbWF4S2V5cyA9IDEwMDA7XG4gIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLm1heEtleXMgPT09ICdudW1iZXInKSB7XG4gICAgbWF4S2V5cyA9IG9wdGlvbnMubWF4S2V5cztcbiAgfVxuXG4gIHZhciBsZW4gPSBxcy5sZW5ndGg7XG4gIC8vIG1heEtleXMgPD0gMCBtZWFucyB0aGF0IHdlIHNob3VsZCBub3QgbGltaXQga2V5cyBjb3VudFxuICBpZiAobWF4S2V5cyA+IDAgJiYgbGVuID4gbWF4S2V5cykge1xuICAgIGxlbiA9IG1heEtleXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgdmFyIHggPSBxc1tpXS5yZXBsYWNlKHJlZ2V4cCwgJyUyMCcpLFxuICAgICAgICBpZHggPSB4LmluZGV4T2YoZXEpLFxuICAgICAgICBrc3RyLCB2c3RyLCBrLCB2O1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBrc3RyID0geC5zdWJzdHIoMCwgaWR4KTtcbiAgICAgIHZzdHIgPSB4LnN1YnN0cihpZHggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAga3N0ciA9IHg7XG4gICAgICB2c3RyID0gJyc7XG4gICAgfVxuXG4gICAgayA9IGRlY29kZVVSSUNvbXBvbmVudChrc3RyKTtcbiAgICB2ID0gZGVjb2RlVVJJQ29tcG9uZW50KHZzdHIpO1xuXG4gICAgaWYgKCFoYXNPd25Qcm9wZXJ0eShvYmosIGspKSB7XG4gICAgICBvYmpba10gPSB2O1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICBvYmpba10ucHVzaCh2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tdID0gW29ialtrXSwgdl07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0cmluZ2lmeVByaW1pdGl2ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgc3dpdGNoICh0eXBlb2Ygdikge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gdjtcblxuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIHYgPyAndHJ1ZScgOiAnZmFsc2UnO1xuXG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBpc0Zpbml0ZSh2KSA/IHYgOiAnJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqLCBzZXAsIGVxLCBuYW1lKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG1hcChvYmplY3RLZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBrcyA9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUoaykpICsgZXE7XG4gICAgICBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICAgIHJldHVybiBtYXAob2JqW2tdLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZSh2KSk7XG4gICAgICAgIH0pLmpvaW4oc2VwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqW2tdKSk7XG4gICAgICB9XG4gICAgfSkuam9pbihzZXApO1xuXG4gIH1cblxuICBpZiAoIW5hbWUpIHJldHVybiAnJztcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUobmFtZSkpICsgZXEgK1xuICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmopKTtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG5mdW5jdGlvbiBtYXAgKHhzLCBmKSB7XG4gIGlmICh4cy5tYXApIHJldHVybiB4cy5tYXAoZik7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIHJlcy5wdXNoKGYoeHNbaV0sIGkpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuZGVjb2RlID0gZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vZGVjb2RlJyk7XG5leHBvcnRzLmVuY29kZSA9IGV4cG9ydHMuc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9lbmNvZGUnKTtcbiIsIi8qKlxyXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxyXG4gKi9cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xyXG59XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcclxuICAgIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcclxuICAgIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xyXG4gICAgICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XHJcbiAgICBFbWl0dGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xyXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAgICAgICAodGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW10pXHJcbiAgICAgICAgICAgIC5wdXNoKGZuKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4vKipcclxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXHJcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XHJcbiAgICBmdW5jdGlvbiBvbigpIHtcclxuICAgICAgICB0aGlzLm9mZihldmVudCwgb24pO1xyXG4gICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcblxyXG4gICAgb24uZm4gPSBmbjtcclxuICAgIHRoaXMub24oZXZlbnQsIG9uKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXHJcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxyXG4gICAgRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxyXG4gICAgICAgIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XHJcbiAgICAgICAgICAgIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWxsXHJcbiAgICAgICAgICAgICAgICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWMgZXZlbnRcclxuICAgICAgICAgICAgICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBhbGwgaGFuZGxlcnNcclxuICAgICAgICAgICAgICAgIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgdmFyIGNiO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjYiA9IGNhbGxiYWNrc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgfTtcclxuXHJcbi8qKlxyXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXHJcbiAgICAgICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG5cclxuICAgIGlmIChjYWxsYmFja3MpIHtcclxuICAgICAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICAgICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcmV0dXJuIHtBcnJheX1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAgIHJldHVybiB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICByZXR1cm4gISF0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xyXG59O1xyXG4iLCIvKipcbiAqIFJvb3QgcmVmZXJlbmNlIGZvciBpZnJhbWVzLlxuICovXG5cbnZhciByb290O1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IC8vIEJyb3dzZXIgd2luZG93XG4gICAgcm9vdCA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7IC8vIFdlYiBXb3JrZXJcbiAgICByb290ID0gc2VsZjtcbn0gZWxzZSB7IC8vIE90aGVyIGVudmlyb25tZW50c1xuICAgIGNvbnNvbGUud2FybihcIlVzaW5nIGJyb3dzZXItb25seSB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQgaW4gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRcIik7XG4gICAgcm9vdCA9IHRoaXM7XG59XG5cbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnY29tcG9uZW50LWVtaXR0ZXInKTtcbnZhciBSZXF1ZXN0QmFzZSA9IHJlcXVpcmUoJy4vcmVxdWVzdC1iYXNlJyk7XG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKCcuL2lzLWZ1bmN0aW9uJyk7XG52YXIgUmVzcG9uc2VCYXNlID0gcmVxdWlyZSgnLi9yZXNwb25zZS1iYXNlJyk7XG52YXIgc2hvdWxkUmV0cnkgPSByZXF1aXJlKCcuL3Nob3VsZC1yZXRyeScpO1xuXG4vKipcbiAqIE5vb3AuXG4gKi9cblxuZnVuY3Rpb24gbm9vcCgpIHtcbn07XG5cbi8qKlxuICogRXhwb3NlIGByZXF1ZXN0YC5cbiAqL1xuXG52YXIgcmVxdWVzdCA9IGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChtZXRob2QsIHVybCkge1xuICAgIC8vIGNhbGxiYWNrXG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHVybCkge1xuICAgICAgICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdCgnR0VUJywgbWV0aG9kKS5lbmQodXJsKTtcbiAgICB9XG5cbiAgICAvLyB1cmwgZmlyc3RcbiAgICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KG1ldGhvZCwgdXJsKTtcbn1cblxuZXhwb3J0cy5SZXF1ZXN0ID0gUmVxdWVzdDtcblxuLyoqXG4gKiBEZXRlcm1pbmUgWEhSLlxuICovXG5cbnJlcXVlc3QuZ2V0WEhSID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChyb290LlhNTEh0dHBSZXF1ZXN0XG4gICAgICAgICYmICghcm9vdC5sb2NhdGlvbiB8fCAnZmlsZTonICE9IHJvb3QubG9jYXRpb24ucHJvdG9jb2xcbiAgICAgICAgICAgIHx8ICFyb290LkFjdGl2ZVhPYmplY3QpKSB7XG4gICAgICAgIHJldHVybiBuZXcgWE1MSHR0cFJlcXVlc3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTWljcm9zb2Z0LlhNTEhUVFAnKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjYuMCcpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAuMy4wJyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUCcpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhyb3cgRXJyb3IoXCJCcm93c2VyLW9ubHkgdmVyaXNvbiBvZiBzdXBlcmFnZW50IGNvdWxkIG5vdCBmaW5kIFhIUlwiKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLCBhZGRlZCB0byBzdXBwb3J0IElFLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgdHJpbSA9ICcnLnRyaW1cbiAgICA/IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgIHJldHVybiBzLnRyaW0oKTtcbiAgICB9XG4gICAgOiBmdW5jdGlvbiAocykge1xuICAgICAgICByZXR1cm4gcy5yZXBsYWNlKC8oXlxccyp8XFxzKiQpL2csICcnKTtcbiAgICB9O1xuXG4vKipcbiAqIFNlcmlhbGl6ZSB0aGUgZ2l2ZW4gYG9iamAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VyaWFsaXplKG9iaikge1xuICAgIGlmICghaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICB2YXIgcGFpcnMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXksIG9ialtrZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzLmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBIZWxwcyAnc2VyaWFsaXplJyB3aXRoIHNlcmlhbGl6aW5nIGFycmF5cy5cbiAqIE11dGF0ZXMgdGhlIHBhaXJzIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhaXJzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2YWwpIHtcbiAgICBpZiAodmFsICE9IG51bGwpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbCkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHN1YmtleSBpbiB2YWwpIHtcbiAgICAgICAgICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5ICsgJ1snICsgc3Via2V5ICsgJ10nLCB2YWxbc3Via2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYWlycy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpXG4gICAgICAgICAgICAgICAgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgICAgICBwYWlycy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpKTtcbiAgICB9XG59XG5cbi8qKlxuICogRXhwb3NlIHNlcmlhbGl6YXRpb24gbWV0aG9kLlxuICovXG5cbnJlcXVlc3Quc2VyaWFsaXplT2JqZWN0ID0gc2VyaWFsaXplO1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiB4LXd3dy1mb3JtLXVybGVuY29kZWQgYHN0cmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VTdHJpbmcoc3RyKSB7XG4gICAgdmFyIG9iaiA9IHt9O1xuICAgIHZhciBwYWlycyA9IHN0ci5zcGxpdCgnJicpO1xuICAgIHZhciBwYWlyO1xuICAgIHZhciBwb3M7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFpcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgcGFpciA9IHBhaXJzW2ldO1xuICAgICAgICBwb3MgPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICAgICAgaWYgKHBvcyA9PSAtMSkge1xuICAgICAgICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyKV0gPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9ialtkZWNvZGVVUklDb21wb25lbnQocGFpci5zbGljZSgwLCBwb3MpKV0gPVxuICAgICAgICAgICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKHBvcyArIDEpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogRXhwb3NlIHBhcnNlci5cbiAqL1xuXG5yZXF1ZXN0LnBhcnNlU3RyaW5nID0gcGFyc2VTdHJpbmc7XG5cbi8qKlxuICogRGVmYXVsdCBNSU1FIHR5cGUgbWFwLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnR5cGVzLnhtbCA9ICdhcHBsaWNhdGlvbi94bWwnO1xuICpcbiAqL1xuXG5yZXF1ZXN0LnR5cGVzID0ge1xuICAgIGh0bWw6ICd0ZXh0L2h0bWwnLFxuICAgIGpzb246ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB4bWw6ICdhcHBsaWNhdGlvbi94bWwnLFxuICAgIHVybGVuY29kZWQ6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAgICdmb3JtJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICAgJ2Zvcm0tZGF0YSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXG59O1xuXG4vKipcbiAqIERlZmF1bHQgc2VyaWFsaXphdGlvbiBtYXAuXG4gKlxuICogICAgIHN1cGVyYWdlbnQuc2VyaWFsaXplWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKG9iail7XG4gKiAgICAgICByZXR1cm4gJ2dlbmVyYXRlZCB4bWwgaGVyZSc7XG4gKiAgICAgfTtcbiAqXG4gKi9cblxucmVxdWVzdC5zZXJpYWxpemUgPSB7XG4gICAgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCc6IHNlcmlhbGl6ZSxcbiAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5XG59O1xuXG4vKipcbiAqIERlZmF1bHQgcGFyc2Vycy5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC5wYXJzZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihzdHIpe1xuICAqICAgICAgIHJldHVybiB7IG9iamVjdCBwYXJzZWQgZnJvbSBzdHIgfTtcbiAgKiAgICAgfTtcbiAqXG4gKi9cblxucmVxdWVzdC5wYXJzZSA9IHtcbiAgICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogcGFyc2VTdHJpbmcsXG4gICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnBhcnNlXG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBoZWFkZXIgYHN0cmAgaW50b1xuICogYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1hcHBlZCBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VIZWFkZXIoc3RyKSB7XG4gICAgdmFyIGxpbmVzID0gc3RyLnNwbGl0KC9cXHI/XFxuLyk7XG4gICAgdmFyIGZpZWxkcyA9IHt9O1xuICAgIHZhciBpbmRleDtcbiAgICB2YXIgbGluZTtcbiAgICB2YXIgZmllbGQ7XG4gICAgdmFyIHZhbDtcblxuICAgIGxpbmVzLnBvcCgpOyAvLyB0cmFpbGluZyBDUkxGXG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gbGluZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgbGluZSA9IGxpbmVzW2ldO1xuICAgICAgICBpbmRleCA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgICAgICBmaWVsZCA9IGxpbmUuc2xpY2UoMCwgaW5kZXgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHZhbCA9IHRyaW0obGluZS5zbGljZShpbmRleCArIDEpKTtcbiAgICAgICAgZmllbGRzW2ZpZWxkXSA9IHZhbDtcbiAgICB9XG5cbiAgICByZXR1cm4gZmllbGRzO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBtaW1lYCBpcyBqc29uIG9yIGhhcyAranNvbiBzdHJ1Y3R1cmVkIHN5bnRheCBzdWZmaXguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1pbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc0pTT04obWltZSkge1xuICAgIHJldHVybiAvW1xcLytdanNvblxcYi8udGVzdChtaW1lKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZWAgd2l0aCB0aGUgZ2l2ZW4gYHhocmAuXG4gKlxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxuICogIC0gcGFyc2UgaGVhZGVyXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogIEFsaWFzaW5nIGBzdXBlcmFnZW50YCBhcyBgcmVxdWVzdGAgaXMgbmljZTpcbiAqXG4gKiAgICAgIHJlcXVlc3QgPSBzdXBlcmFnZW50O1xuICpcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJykuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgU2VuZGluZyBkYXRhIGNhbiBiZSBjaGFpbmVkOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogQHBhcmFtIHtYTUxIVFRQUmVxdWVzdH0geGhyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxKSB7XG4gICAgdGhpcy5yZXEgPSByZXE7XG4gICAgdGhpcy54aHIgPSB0aGlzLnJlcS54aHI7XG4gICAgLy8gcmVzcG9uc2VUZXh0IGlzIGFjY2Vzc2libGUgb25seSBpZiByZXNwb25zZVR5cGUgaXMgJycgb3IgJ3RleHQnIGFuZCBvbiBvbGRlciBicm93c2Vyc1xuICAgIHRoaXMudGV4dCA9ICgodGhpcy5yZXEubWV0aG9kICE9ICdIRUFEJyAmJiAodGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAnJyB8fCB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd0ZXh0JykpIHx8IHR5cGVvZiB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd1bmRlZmluZWQnKVxuICAgICAgICA/IHRoaXMueGhyLnJlc3BvbnNlVGV4dFxuICAgICAgICA6IG51bGw7XG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gdGhpcy5yZXEueGhyLnN0YXR1c1RleHQ7XG4gICAgdmFyIHN0YXR1cyA9IHRoaXMueGhyLnN0YXR1cztcbiAgICAvLyBoYW5kbGUgSUU5IGJ1ZzogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gICAgaWYgKHN0YXR1cyA9PT0gMTIyMykge1xuICAgICAgICBzdGF0dXMgPSAyMDQ7XG4gICAgfVxuICAgIHRoaXMuX3NldFN0YXR1c1Byb3BlcnRpZXMoc3RhdHVzKTtcbiAgICB0aGlzLmhlYWRlciA9IHRoaXMuaGVhZGVycyA9IHBhcnNlSGVhZGVyKHRoaXMueGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKTtcbiAgICAvLyBnZXRBbGxSZXNwb25zZUhlYWRlcnMgc29tZXRpbWVzIGZhbHNlbHkgcmV0dXJucyBcIlwiIGZvciBDT1JTIHJlcXVlc3RzLCBidXRcbiAgICAvLyBnZXRSZXNwb25zZUhlYWRlciBzdGlsbCB3b3Jrcy4gc28gd2UgZ2V0IGNvbnRlbnQtdHlwZSBldmVuIGlmIGdldHRpbmdcbiAgICAvLyBvdGhlciBoZWFkZXJzIGZhaWxzLlxuICAgIHRoaXMuaGVhZGVyWydjb250ZW50LXR5cGUnXSA9IHRoaXMueGhyLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKTtcbiAgICB0aGlzLl9zZXRIZWFkZXJQcm9wZXJ0aWVzKHRoaXMuaGVhZGVyKTtcblxuICAgIGlmIChudWxsID09PSB0aGlzLnRleHQgJiYgcmVxLl9yZXNwb25zZVR5cGUpIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gdGhpcy54aHIucmVzcG9uc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gdGhpcy5yZXEubWV0aG9kICE9ICdIRUFEJ1xuICAgICAgICAgICAgPyB0aGlzLl9wYXJzZUJvZHkodGhpcy50ZXh0ID8gdGhpcy50ZXh0IDogdGhpcy54aHIucmVzcG9uc2UpXG4gICAgICAgICAgICA6IG51bGw7XG4gICAgfVxufVxuXG5SZXNwb25zZUJhc2UoUmVzcG9uc2UucHJvdG90eXBlKTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gYm9keSBgc3RyYC5cbiAqXG4gKiBVc2VkIGZvciBhdXRvLXBhcnNpbmcgb2YgYm9kaWVzLiBQYXJzZXJzXG4gKiBhcmUgZGVmaW5lZCBvbiB0aGUgYHN1cGVyYWdlbnQucGFyc2VgIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS5fcGFyc2VCb2R5ID0gZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciBwYXJzZSA9IHJlcXVlc3QucGFyc2VbdGhpcy50eXBlXTtcbiAgICBpZiAodGhpcy5yZXEuX3BhcnNlcikge1xuICAgICAgICByZXR1cm4gdGhpcy5yZXEuX3BhcnNlcih0aGlzLCBzdHIpO1xuICAgIH1cbiAgICBpZiAoIXBhcnNlICYmIGlzSlNPTih0aGlzLnR5cGUpKSB7XG4gICAgICAgIHBhcnNlID0gcmVxdWVzdC5wYXJzZVsnYXBwbGljYXRpb24vanNvbiddO1xuICAgIH1cbiAgICByZXR1cm4gcGFyc2UgJiYgc3RyICYmIChzdHIubGVuZ3RoIHx8IHN0ciBpbnN0YW5jZW9mIE9iamVjdClcbiAgICAgICAgPyBwYXJzZShzdHIpXG4gICAgICAgIDogbnVsbDtcbn07XG5cbi8qKlxuICogUmV0dXJuIGFuIGBFcnJvcmAgcmVwcmVzZW50YXRpdmUgb2YgdGhpcyByZXNwb25zZS5cbiAqXG4gKiBAcmV0dXJuIHtFcnJvcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLnRvRXJyb3IgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHJlcSA9IHRoaXMucmVxO1xuICAgIHZhciBtZXRob2QgPSByZXEubWV0aG9kO1xuICAgIHZhciB1cmwgPSByZXEudXJsO1xuXG4gICAgdmFyIG1zZyA9ICdjYW5ub3QgJyArIG1ldGhvZCArICcgJyArIHVybCArICcgKCcgKyB0aGlzLnN0YXR1cyArICcpJztcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKG1zZyk7XG4gICAgZXJyLnN0YXR1cyA9IHRoaXMuc3RhdHVzO1xuICAgIGVyci5tZXRob2QgPSBtZXRob2Q7XG4gICAgZXJyLnVybCA9IHVybDtcblxuICAgIHJldHVybiBlcnI7XG59O1xuXG4vKipcbiAqIEV4cG9zZSBgUmVzcG9uc2VgLlxuICovXG5cbnJlcXVlc3QuUmVzcG9uc2UgPSBSZXNwb25zZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXF1ZXN0YCB3aXRoIHRoZSBnaXZlbiBgbWV0aG9kYCBhbmQgYHVybGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXF1ZXN0KG1ldGhvZCwgdXJsKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkgfHwgW107XG4gICAgdGhpcy5tZXRob2QgPSBtZXRob2Q7XG4gICAgdGhpcy51cmwgPSB1cmw7XG4gICAgdGhpcy5oZWFkZXIgPSB7fTsgLy8gcHJlc2VydmVzIGhlYWRlciBuYW1lIGNhc2VcbiAgICB0aGlzLl9oZWFkZXIgPSB7fTsgLy8gY29lcmNlcyBoZWFkZXIgbmFtZXMgdG8gbG93ZXJjYXNlXG4gICAgdGhpcy5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZXJyID0gbnVsbDtcbiAgICAgICAgdmFyIHJlcyA9IG51bGw7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlcyA9IG5ldyBSZXNwb25zZShzZWxmKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgZXJyID0gbmV3IEVycm9yKCdQYXJzZXIgaXMgdW5hYmxlIHRvIHBhcnNlIHRoZSByZXNwb25zZScpO1xuICAgICAgICAgICAgZXJyLnBhcnNlID0gdHJ1ZTtcbiAgICAgICAgICAgIGVyci5vcmlnaW5hbCA9IGU7XG4gICAgICAgICAgICAvLyBpc3N1ZSAjNjc1OiByZXR1cm4gdGhlIHJhdyByZXNwb25zZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xuICAgICAgICAgICAgaWYgKHNlbGYueGhyKSB7XG4gICAgICAgICAgICAgICAgLy8gaWU5IGRvZXNuJ3QgaGF2ZSAncmVzcG9uc2UnIHByb3BlcnR5XG4gICAgICAgICAgICAgICAgZXJyLnJhd1Jlc3BvbnNlID0gdHlwZW9mIHNlbGYueGhyLnJlc3BvbnNlVHlwZSA9PSAndW5kZWZpbmVkJyA/IHNlbGYueGhyLnJlc3BvbnNlVGV4dCA6IHNlbGYueGhyLnJlc3BvbnNlO1xuICAgICAgICAgICAgICAgIC8vIGlzc3VlICM4NzY6IHJldHVybiB0aGUgaHR0cCBzdGF0dXMgY29kZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xuICAgICAgICAgICAgICAgIGVyci5zdGF0dXMgPSBzZWxmLnhoci5zdGF0dXMgPyBzZWxmLnhoci5zdGF0dXMgOiBudWxsO1xuICAgICAgICAgICAgICAgIGVyci5zdGF0dXNDb2RlID0gZXJyLnN0YXR1czsgLy8gYmFja3dhcmRzLWNvbXBhdCBvbmx5XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVyci5yYXdSZXNwb25zZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgZXJyLnN0YXR1cyA9IG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBzZWxmLmNhbGxiYWNrKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLmVtaXQoJ3Jlc3BvbnNlJywgcmVzKTtcblxuICAgICAgICB2YXIgbmV3X2VycjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghc2VsZi5faXNSZXNwb25zZU9LKHJlcykpIHtcbiAgICAgICAgICAgICAgICBuZXdfZXJyID0gbmV3IEVycm9yKHJlcy5zdGF0dXNUZXh0IHx8ICdVbnN1Y2Nlc3NmdWwgSFRUUCByZXNwb25zZScpO1xuICAgICAgICAgICAgICAgIG5ld19lcnIub3JpZ2luYWwgPSBlcnI7XG4gICAgICAgICAgICAgICAgbmV3X2Vyci5yZXNwb25zZSA9IHJlcztcbiAgICAgICAgICAgICAgICBuZXdfZXJyLnN0YXR1cyA9IHJlcy5zdGF0dXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIG5ld19lcnIgPSBlOyAvLyAjOTg1IHRvdWNoaW5nIHJlcyBtYXkgY2F1c2UgSU5WQUxJRF9TVEFURV9FUlIgb24gb2xkIEFuZHJvaWRcbiAgICAgICAgfVxuXG4gICAgICAgIC8vICMxMDAwIGRvbid0IGNhdGNoIGVycm9ycyBmcm9tIHRoZSBjYWxsYmFjayB0byBhdm9pZCBkb3VibGUgY2FsbGluZyBpdFxuICAgICAgICBpZiAobmV3X2Vycikge1xuICAgICAgICAgICAgc2VsZi5jYWxsYmFjayhuZXdfZXJyLCByZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VsZi5jYWxsYmFjayhudWxsLCByZXMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbi8qKlxuICogTWl4aW4gYEVtaXR0ZXJgIGFuZCBgUmVxdWVzdEJhc2VgLlxuICovXG5cbkVtaXR0ZXIoUmVxdWVzdC5wcm90b3R5cGUpO1xuUmVxdWVzdEJhc2UoUmVxdWVzdC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFNldCBDb250ZW50LVR5cGUgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCd4bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2FwcGxpY2F0aW9uL3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdGhpcy5zZXQoJ0NvbnRlbnQtVHlwZScsIHJlcXVlc3QudHlwZXNbdHlwZV0gfHwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBY2NlcHQgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgdGhpcy5zZXQoJ0FjY2VwdCcsIHJlcXVlc3QudHlwZXNbdHlwZV0gfHwgdHlwZSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFzc10gb3B0aW9uYWwgaW4gY2FzZSBvZiB1c2luZyAnYmVhcmVyJyBhcyB0eXBlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB3aXRoICd0eXBlJyBwcm9wZXJ0eSAnYXV0bycsICdiYXNpYycgb3IgJ2JlYXJlcicgKGRlZmF1bHQgJ2Jhc2ljJylcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24gKHVzZXIsIHBhc3MsIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIHBhc3MgPT09ICdvYmplY3QnICYmIHBhc3MgIT09IG51bGwpIHsgLy8gcGFzcyBpcyBvcHRpb25hbCBhbmQgY2FuIHN1YnN0aXR1dGUgZm9yIG9wdGlvbnNcbiAgICAgICAgb3B0aW9ucyA9IHBhc3M7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgdHlwZTogJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGJ0b2EgPyAnYmFzaWMnIDogJ2F1dG8nLFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3dpdGNoIChvcHRpb25zLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnYmFzaWMnOlxuICAgICAgICAgICAgdGhpcy5zZXQoJ0F1dGhvcml6YXRpb24nLCAnQmFzaWMgJyArIGJ0b2EodXNlciArICc6JyArIHBhc3MpKTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2F1dG8nOlxuICAgICAgICAgICAgdGhpcy51c2VybmFtZSA9IHVzZXI7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkID0gcGFzcztcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2JlYXJlcic6IC8vIHVzYWdlIHdvdWxkIGJlIC5hdXRoKGFjY2Vzc1Rva2VuLCB7IHR5cGU6ICdiZWFyZXInIH0pXG4gICAgICAgICAgICB0aGlzLnNldCgnQXV0aG9yaXphdGlvbicsICdCZWFyZXIgJyArIHVzZXIpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgcXVlcnktc3RyaW5nIGB2YWxgLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgcmVxdWVzdC5nZXQoJy9zaG9lcycpXG4gKiAgICAgLnF1ZXJ5KCdzaXplPTEwJylcbiAqICAgICAucXVlcnkoeyBjb2xvcjogJ2JsdWUnIH0pXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gc2VyaWFsaXplKHZhbCk7XG4gICAgaWYgKHZhbCkgdGhpcy5fcXVlcnkucHVzaCh2YWwpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBRdWV1ZSB0aGUgZ2l2ZW4gYGZpbGVgIGFzIGFuIGF0dGFjaG1lbnQgdG8gdGhlIHNwZWNpZmllZCBgZmllbGRgLFxuICogd2l0aCBvcHRpb25hbCBgb3B0aW9uc2AgKG9yIGZpbGVuYW1lKS5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5hdHRhY2goJ2NvbnRlbnQnLCBuZXcgQmxvYihbJzxhIGlkPVwiYVwiPjxiIGlkPVwiYlwiPmhleSE8L2I+PC9hPiddLCB7IHR5cGU6IFwidGV4dC9odG1sXCJ9KSlcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEBwYXJhbSB7QmxvYnxGaWxlfSBmaWxlXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdHRhY2ggPSBmdW5jdGlvbiAoZmllbGQsIGZpbGUsIG9wdGlvbnMpIHtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJzdXBlcmFnZW50IGNhbid0IG1peCAuc2VuZCgpIGFuZCAuYXR0YWNoKClcIik7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9nZXRGb3JtRGF0YSgpLmFwcGVuZChmaWVsZCwgZmlsZSwgb3B0aW9ucyB8fCBmaWxlLm5hbWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9nZXRGb3JtRGF0YSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuX2Zvcm1EYXRhKSB7XG4gICAgICAgIHRoaXMuX2Zvcm1EYXRhID0gbmV3IHJvb3QuRm9ybURhdGEoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2Zvcm1EYXRhO1xufTtcblxuLyoqXG4gKiBJbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggYGVycmAgYW5kIGByZXNgXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYWxsYmFjayA9IGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuX3JldHJpZXMsIHRoaXMuX21heFJldHJpZXMpXG4gICAgaWYgKHRoaXMuX21heFJldHJpZXMgJiYgdGhpcy5fcmV0cmllcysrIDwgdGhpcy5fbWF4UmV0cmllcyAmJiBzaG91bGRSZXRyeShlcnIsIHJlcykpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JldHJ5KCk7XG4gICAgfVxuXG4gICAgdmFyIGZuID0gdGhpcy5fY2FsbGJhY2s7XG4gICAgdGhpcy5jbGVhclRpbWVvdXQoKTtcblxuICAgIGlmIChlcnIpIHtcbiAgICAgICAgaWYgKHRoaXMuX21heFJldHJpZXMpIGVyci5yZXRyaWVzID0gdGhpcy5fcmV0cmllcyAtIDE7XG4gICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBlcnIpO1xuICAgIH1cblxuICAgIGZuKGVyciwgcmVzKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggeC1kb21haW4gZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY3Jvc3NEb21haW5FcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdSZXF1ZXN0IGhhcyBiZWVuIHRlcm1pbmF0ZWRcXG5Qb3NzaWJsZSBjYXVzZXM6IHRoZSBuZXR3b3JrIGlzIG9mZmxpbmUsIE9yaWdpbiBpcyBub3QgYWxsb3dlZCBieSBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4sIHRoZSBwYWdlIGlzIGJlaW5nIHVubG9hZGVkLCBldGMuJyk7XG4gICAgZXJyLmNyb3NzRG9tYWluID0gdHJ1ZTtcblxuICAgIGVyci5zdGF0dXMgPSB0aGlzLnN0YXR1cztcbiAgICBlcnIubWV0aG9kID0gdGhpcy5tZXRob2Q7XG4gICAgZXJyLnVybCA9IHRoaXMudXJsO1xuXG4gICAgdGhpcy5jYWxsYmFjayhlcnIpO1xufTtcblxuLy8gVGhpcyBvbmx5IHdhcm5zLCBiZWNhdXNlIHRoZSByZXF1ZXN0IGlzIHN0aWxsIGxpa2VseSB0byB3b3JrXG5SZXF1ZXN0LnByb3RvdHlwZS5idWZmZXIgPSBSZXF1ZXN0LnByb3RvdHlwZS5jYSA9IFJlcXVlc3QucHJvdG90eXBlLmFnZW50ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUud2FybihcIlRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8vIFRoaXMgdGhyb3dzLCBiZWNhdXNlIGl0IGNhbid0IHNlbmQvcmVjZWl2ZSBkYXRhIGFzIGV4cGVjdGVkXG5SZXF1ZXN0LnByb3RvdHlwZS5waXBlID0gUmVxdWVzdC5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJTdHJlYW1pbmcgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbn07XG5cbi8qKlxuICogQ29tcG9zZSBxdWVyeXN0cmluZyB0byBhcHBlbmQgdG8gcmVxLnVybFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9hcHBlbmRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcXVlcnkgPSB0aGlzLl9xdWVyeS5qb2luKCcmJyk7XG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICAgIHRoaXMudXJsICs9ICh0aGlzLnVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKyBxdWVyeTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fc29ydCkge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnVybC5pbmRleE9mKCc/Jyk7XG4gICAgICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICAgICAgICB2YXIgcXVlcnlBcnIgPSB0aGlzLnVybC5zdWJzdHJpbmcoaW5kZXggKyAxKS5zcGxpdCgnJicpO1xuICAgICAgICAgICAgaWYgKGlzRnVuY3Rpb24odGhpcy5fc29ydCkpIHtcbiAgICAgICAgICAgICAgICBxdWVyeUFyci5zb3J0KHRoaXMuX3NvcnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBxdWVyeUFyci5zb3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnVybCA9IHRoaXMudXJsLnN1YnN0cmluZygwLCBpbmRleCkgKyAnPycgKyBxdWVyeUFyci5qb2luKCcmJyk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGEgaG9zdCBvYmplY3QsXG4gKiB3ZSBkb24ndCB3YW50IHRvIHNlcmlhbGl6ZSB0aGVzZSA6KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuUmVxdWVzdC5wcm90b3R5cGUuX2lzSG9zdCA9IGZ1bmN0aW9uIF9pc0hvc3Qob2JqKSB7XG4gICAgLy8gTmF0aXZlIG9iamVjdHMgc3RyaW5naWZ5IHRvIFtvYmplY3QgRmlsZV0sIFtvYmplY3QgQmxvYl0sIFtvYmplY3QgRm9ybURhdGFdLCBldGMuXG4gICAgcmV0dXJuIG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iaiAmJiAhQXJyYXkuaXNBcnJheShvYmopICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJztcbn1cblxuLyoqXG4gKiBJbml0aWF0ZSByZXF1ZXN0LCBpbnZva2luZyBjYWxsYmFjayBgZm4ocmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJXYXJuaW5nOiAuZW5kKCkgd2FzIGNhbGxlZCB0d2ljZS4gVGhpcyBpcyBub3Qgc3VwcG9ydGVkIGluIHN1cGVyYWdlbnRcIik7XG4gICAgfVxuICAgIHRoaXMuX2VuZENhbGxlZCA9IHRydWU7XG5cbiAgICAvLyBzdG9yZSBjYWxsYmFja1xuICAgIHRoaXMuX2NhbGxiYWNrID0gZm4gfHwgbm9vcDtcblxuICAgIC8vIHF1ZXJ5c3RyaW5nXG4gICAgdGhpcy5fYXBwZW5kUXVlcnlTdHJpbmcoKTtcblxuICAgIHJldHVybiB0aGlzLl9lbmQoKTtcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9lbmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB4aHIgPSB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XG4gICAgdmFyIGRhdGEgPSB0aGlzLl9mb3JtRGF0YSB8fCB0aGlzLl9kYXRhO1xuXG4gICAgdGhpcy5fc2V0VGltZW91dHMoKTtcblxuICAgIC8vIHN0YXRlIGNoYW5nZVxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZWFkeVN0YXRlID0geGhyLnJlYWR5U3RhdGU7XG4gICAgICAgIGlmIChyZWFkeVN0YXRlID49IDIgJiYgc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChzZWxmLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDQgIT0gcmVhZHlTdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW4gSUU5LCByZWFkcyB0byBhbnkgcHJvcGVydHkgKGUuZy4gc3RhdHVzKSBvZmYgb2YgYW4gYWJvcnRlZCBYSFIgd2lsbFxuICAgICAgICAvLyByZXN1bHQgaW4gdGhlIGVycm9yIFwiQ291bGQgbm90IGNvbXBsZXRlIHRoZSBvcGVyYXRpb24gZHVlIHRvIGVycm9yIGMwMGMwMjNmXCJcbiAgICAgICAgdmFyIHN0YXR1cztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHN0YXR1cyA9IHhoci5zdGF0dXNcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgc3RhdHVzID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3RhdHVzKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi50aW1lZG91dCB8fCBzZWxmLl9hYm9ydGVkKSByZXR1cm47XG4gICAgICAgICAgICByZXR1cm4gc2VsZi5jcm9zc0RvbWFpbkVycm9yKCk7XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5lbWl0KCdlbmQnKTtcbiAgICB9O1xuXG4gICAgLy8gcHJvZ3Jlc3NcbiAgICB2YXIgaGFuZGxlUHJvZ3Jlc3MgPSBmdW5jdGlvbiAoZGlyZWN0aW9uLCBlKSB7XG4gICAgICAgIGlmIChlLnRvdGFsID4gMCkge1xuICAgICAgICAgICAgZS5wZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsICogMTAwO1xuICAgICAgICB9XG4gICAgICAgIGUuZGlyZWN0aW9uID0gZGlyZWN0aW9uO1xuICAgICAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmhhc0xpc3RlbmVycygncHJvZ3Jlc3MnKSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgeGhyLm9ucHJvZ3Jlc3MgPSBoYW5kbGVQcm9ncmVzcy5iaW5kKG51bGwsICdkb3dubG9hZCcpO1xuICAgICAgICAgICAgaWYgKHhoci51cGxvYWQpIHtcbiAgICAgICAgICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBoYW5kbGVQcm9ncmVzcy5iaW5kKG51bGwsICd1cGxvYWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gQWNjZXNzaW5nIHhoci51cGxvYWQgZmFpbHMgaW4gSUUgZnJvbSBhIHdlYiB3b3JrZXIsIHNvIGp1c3QgcHJldGVuZCBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgICAgICAgLy8gUmVwb3J0ZWQgaGVyZTpcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vY29ubmVjdC5taWNyb3NvZnQuY29tL0lFL2ZlZWRiYWNrL2RldGFpbHMvODM3MjQ1L3htbGh0dHByZXF1ZXN0LXVwbG9hZC10aHJvd3MtaW52YWxpZC1hcmd1bWVudC13aGVuLXVzZWQtZnJvbS13ZWItd29ya2VyLWNvbnRleHRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGluaXRpYXRlIHJlcXVlc3RcbiAgICB0cnkge1xuICAgICAgICBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICB4aHIub3Blbih0aGlzLm1ldGhvZCwgdGhpcy51cmwsIHRydWUsIHRoaXMudXNlcm5hbWUsIHRoaXMucGFzc3dvcmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBzZWUgIzExNDlcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbGJhY2soZXJyKTtcbiAgICB9XG5cbiAgICAvLyBDT1JTXG4gICAgaWYgKHRoaXMuX3dpdGhDcmVkZW50aWFscykgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG5cbiAgICAvLyBib2R5XG4gICAgaWYgKCF0aGlzLl9mb3JtRGF0YSAmJiAnR0VUJyAhPSB0aGlzLm1ldGhvZCAmJiAnSEVBRCcgIT0gdGhpcy5tZXRob2QgJiYgJ3N0cmluZycgIT0gdHlwZW9mIGRhdGEgJiYgIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgICAgICAvLyBzZXJpYWxpemUgc3R1ZmZcbiAgICAgICAgdmFyIGNvbnRlbnRUeXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX3NlcmlhbGl6ZXIgfHwgcmVxdWVzdC5zZXJpYWxpemVbY29udGVudFR5cGUgPyBjb250ZW50VHlwZS5zcGxpdCgnOycpWzBdIDogJyddO1xuICAgICAgICBpZiAoIXNlcmlhbGl6ZSAmJiBpc0pTT04oY29udGVudFR5cGUpKSB7XG4gICAgICAgICAgICBzZXJpYWxpemUgPSByZXF1ZXN0LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXJpYWxpemUpIGRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IGhlYWRlciBmaWVsZHNcbiAgICBmb3IgKHZhciBmaWVsZCBpbiB0aGlzLmhlYWRlcikge1xuICAgICAgICBpZiAobnVsbCA9PSB0aGlzLmhlYWRlcltmaWVsZF0pIGNvbnRpbnVlO1xuXG4gICAgICAgIGlmICh0aGlzLmhlYWRlci5oYXNPd25Qcm9wZXJ0eShmaWVsZCkpXG4gICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihmaWVsZCwgdGhpcy5oZWFkZXJbZmllbGRdKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVzcG9uc2VUeXBlKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSB0aGlzLl9yZXNwb25zZVR5cGU7XG4gICAgfVxuXG4gICAgLy8gc2VuZCBzdHVmZlxuICAgIHRoaXMuZW1pdCgncmVxdWVzdCcsIHRoaXMpO1xuXG4gICAgLy8gSUUxMSB4aHIuc2VuZCh1bmRlZmluZWQpIHNlbmRzICd1bmRlZmluZWQnIHN0cmluZyBhcyBQT1NUIHBheWxvYWQgKGluc3RlYWQgb2Ygbm90aGluZylcbiAgICAvLyBXZSBuZWVkIG51bGwgaGVyZSBpZiBkYXRhIGlzIHVuZGVmaW5lZFxuICAgIHhoci5zZW5kKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJyA/IGRhdGEgOiBudWxsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR0VUIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5nZXQgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBmbikge1xuICAgIHZhciByZXEgPSByZXF1ZXN0KCdHRVQnLCB1cmwpO1xuICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICAgIGlmIChkYXRhKSByZXEucXVlcnkoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5oZWFkID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnSEVBRCcsIHVybCk7XG4gICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gICAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICAgIGlmIChmbikgcmVxLmVuZChmbik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogT1BUSU9OUyBxdWVyeSB0byBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3Qub3B0aW9ucyA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGZuKSB7XG4gICAgdmFyIHJlcSA9IHJlcXVlc3QoJ09QVElPTlMnLCB1cmwpO1xuICAgIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICAgIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICAgIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIERFTEVURSBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVsKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnREVMRVRFJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxucmVxdWVzdFsnZGVsJ10gPSBkZWw7XG5yZXF1ZXN0WydkZWxldGUnXSA9IGRlbDtcblxuLyoqXG4gKiBQQVRDSCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wYXRjaCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIGZuKSB7XG4gICAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BBVENIJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBQT1NUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZH0gW2RhdGFdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBmbikge1xuICAgIHZhciByZXEgPSByZXF1ZXN0KCdQT1NUJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBQVVQgYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucHV0ID0gZnVuY3Rpb24gKHVybCwgZGF0YSwgZm4pIHtcbiAgICB2YXIgcmVxID0gcmVxdWVzdCgnUFVUJywgdXJsKTtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gICAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgICByZXR1cm4gcmVxO1xufTtcbiIsIi8qKlxuICogQ2hlY2sgaWYgYGZuYCBpcyBhIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vaXMtb2JqZWN0Jyk7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oZm4pIHtcbiAgICB2YXIgdGFnID0gaXNPYmplY3QoZm4pID8gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGZuKSA6ICcnO1xuICAgIHJldHVybiB0YWcgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvbjtcbiIsIi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYW4gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgICByZXR1cm4gbnVsbCAhPT0gb2JqICYmICdvYmplY3QnID09PSB0eXBlb2Ygb2JqO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0O1xuIiwiLyoqXG4gKiBNb2R1bGUgb2YgbWl4ZWQtaW4gZnVuY3Rpb25zIHNoYXJlZCBiZXR3ZWVuIG5vZGUgYW5kIGNsaWVudCBjb2RlXG4gKi9cbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vaXMtb2JqZWN0Jyk7XG5cbi8qKlxuICogRXhwb3NlIGBSZXF1ZXN0QmFzZWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0QmFzZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXF1ZXN0QmFzZWAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXF1ZXN0QmFzZShvYmopIHtcbiAgICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgcHJvdG90eXBlIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gICAgZm9yICh2YXIga2V5IGluIFJlcXVlc3RCYXNlLnByb3RvdHlwZSkge1xuICAgICAgICBvYmpba2V5XSA9IFJlcXVlc3RCYXNlLnByb3RvdHlwZVtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIENsZWFyIHByZXZpb3VzIHRpbWVvdXQuXG4gKlxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5jbGVhclRpbWVvdXQgPSBmdW5jdGlvbiBfY2xlYXJUaW1lb3V0KCkge1xuICAgIGNsZWFyVGltZW91dCh0aGlzLl90aW1lcik7XG4gICAgY2xlYXJUaW1lb3V0KHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKTtcbiAgICBkZWxldGUgdGhpcy5fdGltZXI7XG4gICAgZGVsZXRlIHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSBkZWZhdWx0IHJlc3BvbnNlIGJvZHkgcGFyc2VyXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB0byBjb252ZXJ0IGluY29taW5nIGRhdGEgaW50byByZXF1ZXN0LmJvZHlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZShmbikge1xuICAgIHRoaXMuX3BhcnNlciA9IGZuO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgZm9ybWF0IG9mIGJpbmFyeSByZXNwb25zZSBib2R5LlxuICogSW4gYnJvd3NlciB2YWxpZCBmb3JtYXRzIGFyZSAnYmxvYicgYW5kICdhcnJheWJ1ZmZlcicsXG4gKiB3aGljaCByZXR1cm4gQmxvYiBhbmQgQXJyYXlCdWZmZXIsIHJlc3BlY3RpdmVseS5cbiAqXG4gKiBJbiBOb2RlIGFsbCB2YWx1ZXMgcmVzdWx0IGluIEJ1ZmZlci5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5yZXNwb25zZVR5cGUoJ2Jsb2InKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVzcG9uc2VUeXBlID0gZnVuY3Rpb24gKHZhbCkge1xuICAgIHRoaXMuX3Jlc3BvbnNlVHlwZSA9IHZhbDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgZGVmYXVsdCByZXF1ZXN0IGJvZHkgc2VyaWFsaXplclxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBkYXRhIHNldCB2aWEgLnNlbmQgb3IgLmF0dGFjaCBpbnRvIHBheWxvYWQgdG8gc2VuZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZm4pIHtcbiAgICB0aGlzLl9zZXJpYWxpemVyID0gZm47XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aW1lb3V0cy5cbiAqXG4gKiAtIHJlc3BvbnNlIHRpbWVvdXQgaXMgdGltZSBiZXR3ZWVuIHNlbmRpbmcgcmVxdWVzdCBhbmQgcmVjZWl2aW5nIHRoZSBmaXJzdCBieXRlIG9mIHRoZSByZXNwb25zZS4gSW5jbHVkZXMgRE5TIGFuZCBjb25uZWN0aW9uIHRpbWUuXG4gKiAtIGRlYWRsaW5lIGlzIHRoZSB0aW1lIGZyb20gc3RhcnQgb2YgdGhlIHJlcXVlc3QgdG8gcmVjZWl2aW5nIHJlc3BvbnNlIGJvZHkgaW4gZnVsbC4gSWYgdGhlIGRlYWRsaW5lIGlzIHRvbyBzaG9ydCBsYXJnZSBmaWxlcyBtYXkgbm90IGxvYWQgYXQgYWxsIG9uIHNsb3cgY29ubmVjdGlvbnMuXG4gKlxuICogVmFsdWUgb2YgMCBvciBmYWxzZSBtZWFucyBubyB0aW1lb3V0LlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gbXMgb3Ige3Jlc3BvbnNlLCByZWFkLCBkZWFkbGluZX1cbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudGltZW91dCA9IGZ1bmN0aW9uIHRpbWVvdXQob3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucyB8fCAnb2JqZWN0JyAhPT0gdHlwZW9mIG9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnM7XG4gICAgICAgIHRoaXMuX3Jlc3BvbnNlVGltZW91dCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGZvciAodmFyIG9wdGlvbiBpbiBvcHRpb25zKSB7XG4gICAgICAgIHN3aXRjaCAob3B0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdkZWFkbGluZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnMuZGVhZGxpbmU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdyZXNwb25zZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gb3B0aW9ucy5yZXNwb25zZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiVW5rbm93biB0aW1lb3V0IG9wdGlvblwiLCBvcHRpb24pO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgbnVtYmVyIG9mIHJldHJ5IGF0dGVtcHRzIG9uIGVycm9yLlxuICpcbiAqIEZhaWxlZCByZXF1ZXN0cyB3aWxsIGJlIHJldHJpZWQgJ2NvdW50JyB0aW1lcyBpZiB0aW1lb3V0IG9yIGVyci5jb2RlID49IDUwMC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmV0cnkgPSBmdW5jdGlvbiByZXRyeShjb3VudCkge1xuICAgIC8vIERlZmF1bHQgdG8gMSBpZiBubyBjb3VudCBwYXNzZWQgb3IgdHJ1ZVxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwIHx8IGNvdW50ID09PSB0cnVlKSBjb3VudCA9IDE7XG4gICAgaWYgKGNvdW50IDw9IDApIGNvdW50ID0gMDtcbiAgICB0aGlzLl9tYXhSZXRyaWVzID0gY291bnQ7XG4gICAgdGhpcy5fcmV0cmllcyA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHJ5IHJlcXVlc3RcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fcmV0cnkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jbGVhclRpbWVvdXQoKTtcblxuICAgIC8vIG5vZGVcbiAgICBpZiAodGhpcy5yZXEpIHtcbiAgICAgICAgdGhpcy5yZXEgPSBudWxsO1xuICAgICAgICB0aGlzLnJlcSA9IHRoaXMucmVxdWVzdCgpO1xuICAgIH1cblxuICAgIHRoaXMuX2Fib3J0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLnRpbWVkb3V0ID0gZmFsc2U7XG5cbiAgICByZXR1cm4gdGhpcy5fZW5kKCk7XG59O1xuXG4vKipcbiAqIFByb21pc2Ugc3VwcG9ydFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZWplY3RdXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gdGhlbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAoIXRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFwiV2FybmluZzogc3VwZXJhZ2VudCByZXF1ZXN0IHdhcyBzZW50IHR3aWNlLCBiZWNhdXNlIGJvdGggLmVuZCgpIGFuZCAudGhlbigpIHdlcmUgY2FsbGVkLiBOZXZlciBjYWxsIC5lbmQoKSBpZiB5b3UgdXNlIHByb21pc2VzXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKGlubmVyUmVzb2x2ZSwgaW5uZXJSZWplY3QpIHtcbiAgICAgICAgICAgIHNlbGYuZW5kKGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIGlubmVyUmVqZWN0KGVycik7IGVsc2UgaW5uZXJSZXNvbHZlKHJlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG59XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5jYXRjaCA9IGZ1bmN0aW9uIChjYikge1xuICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBjYik7XG59O1xuXG4vKipcbiAqIEFsbG93IGZvciBleHRlbnNpb25cbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGZuKSB7XG4gICAgZm4odGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG59XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5vayA9IGZ1bmN0aW9uIChjYikge1xuICAgIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgY2IpIHRocm93IEVycm9yKFwiQ2FsbGJhY2sgcmVxdWlyZWRcIik7XG4gICAgdGhpcy5fb2tDYWxsYmFjayA9IGNiO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9pc1Jlc3BvbnNlT0sgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9va0NhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9va0NhbGxiYWNrKHJlcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcy5zdGF0dXMgPj0gMjAwICYmIHJlcy5zdGF0dXMgPCAzMDA7XG59O1xuXG5cbi8qKlxuICogR2V0IHJlcXVlc3QgaGVhZGVyIGBmaWVsZGAuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGZpZWxkKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogR2V0IGNhc2UtaW5zZW5zaXRpdmUgaGVhZGVyIGBmaWVsZGAgdmFsdWUuXG4gKiBUaGlzIGlzIGEgZGVwcmVjYXRlZCBpbnRlcm5hbCBBUEkuIFVzZSBgLmdldChmaWVsZClgIGluc3RlYWQuXG4gKlxuICogKGdldEhlYWRlciBpcyBubyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoZSBzdXBlcmFnZW50IGNvZGUgYmFzZSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQGRlcHJlY2F0ZWRcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0SGVhZGVyID0gUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldDtcblxuLyoqXG4gKiBTZXQgaGVhZGVyIGBmaWVsZGAgdG8gYHZhbGAsIG9yIG11bHRpcGxlIGZpZWxkcyB3aXRoIG9uZSBvYmplY3QuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCgnQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5zZXQoJ1gtQVBJLUtleScsICdmb29iYXInKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCh7IEFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLCAnWC1BUEktS2V5JzogJ2Zvb2JhcicgfSlcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGZpZWxkXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChmaWVsZCwgdmFsKSB7XG4gICAgaWYgKGlzT2JqZWN0KGZpZWxkKSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZmllbGQpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0KGtleSwgZmllbGRba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXSA9IHZhbDtcbiAgICB0aGlzLmhlYWRlcltmaWVsZF0gPSB2YWw7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC51bnNldCgnVXNlci1BZ2VudCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS51bnNldCA9IGZ1bmN0aW9uIChmaWVsZCkge1xuICAgIGRlbGV0ZSB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG4gICAgZGVsZXRlIHRoaXMuaGVhZGVyW2ZpZWxkXTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogV3JpdGUgdGhlIGZpZWxkIGBuYW1lYCBhbmQgYHZhbGAsIG9yIG11bHRpcGxlIGZpZWxkcyB3aXRoIG9uZSBvYmplY3RcbiAqIGZvciBcIm11bHRpcGFydC9mb3JtLWRhdGFcIiByZXF1ZXN0IGJvZGllcy5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5maWVsZCgnZm9vJywgJ2JhcicpXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5maWVsZCh7IGZvbzogJ2JhcicsIGJhejogJ3F1eCcgfSlcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfEJsb2J8RmlsZXxCdWZmZXJ8ZnMuUmVhZFN0cmVhbX0gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5maWVsZCA9IGZ1bmN0aW9uIChuYW1lLCB2YWwpIHtcblxuICAgIC8vIG5hbWUgc2hvdWxkIGJlIGVpdGhlciBhIHN0cmluZyBvciBhbiBvYmplY3QuXG4gICAgaWYgKG51bGwgPT09IG5hbWUgfHwgdW5kZWZpbmVkID09PSBuYW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgbmFtZSBjYW4gbm90IGJlIGVtcHR5Jyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIi5maWVsZCgpIGNhbid0IGJlIHVzZWQgaWYgLnNlbmQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICAgIH1cblxuICAgIGlmIChpc09iamVjdChuYW1lKSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gbmFtZSkge1xuICAgICAgICAgICAgdGhpcy5maWVsZChrZXksIG5hbWVba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICBmb3IgKHZhciBpIGluIHZhbCkge1xuICAgICAgICAgICAgdGhpcy5maWVsZChuYW1lLCB2YWxbaV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHZhbCBzaG91bGQgYmUgZGVmaW5lZCBub3dcbiAgICBpZiAobnVsbCA9PT0gdmFsIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgdmFsIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgICB9XG4gICAgaWYgKCdib29sZWFuJyA9PT0gdHlwZW9mIHZhbCkge1xuICAgICAgICB2YWwgPSAnJyArIHZhbDtcbiAgICB9XG4gICAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQobmFtZSwgdmFsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWJvcnQgdGhlIHJlcXVlc3QsIGFuZCBjbGVhciBwb3RlbnRpYWwgdGltZW91dC5cbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuUmVxdWVzdEJhc2UucHJvdG90eXBlLmFib3J0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICB0aGlzLl9hYm9ydGVkID0gdHJ1ZTtcbiAgICB0aGlzLnhociAmJiB0aGlzLnhoci5hYm9ydCgpOyAvLyBicm93c2VyXG4gICAgdGhpcy5yZXEgJiYgdGhpcy5yZXEuYWJvcnQoKTsgLy8gbm9kZVxuICAgIHRoaXMuY2xlYXJUaW1lb3V0KCk7XG4gICAgdGhpcy5lbWl0KCdhYm9ydCcpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbmFibGUgdHJhbnNtaXNzaW9uIG9mIGNvb2tpZXMgd2l0aCB4LWRvbWFpbiByZXF1ZXN0cy5cbiAqXG4gKiBOb3RlIHRoYXQgZm9yIHRoaXMgdG8gd29yayB0aGUgb3JpZ2luIG11c3Qgbm90IGJlXG4gKiB1c2luZyBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiIHdpdGggYSB3aWxkY2FyZCxcbiAqIGFuZCBhbHNvIG11c3Qgc2V0IFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHNcIlxuICogdG8gXCJ0cnVlXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUud2l0aENyZWRlbnRpYWxzID0gZnVuY3Rpb24gKG9uKSB7XG4gICAgLy8gVGhpcyBpcyBicm93c2VyLW9ubHkgZnVuY3Rpb25hbGl0eS4gTm9kZSBzaWRlIGlzIG5vLW9wLlxuICAgIGlmIChvbiA9PSB1bmRlZmluZWQpIG9uID0gdHJ1ZTtcbiAgICB0aGlzLl93aXRoQ3JlZGVudGlhbHMgPSBvbjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBtYXggcmVkaXJlY3RzIHRvIGBuYC4gRG9lcyBub3RpbmcgaW4gYnJvd3NlciBYSFIgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG5cbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVkaXJlY3RzID0gZnVuY3Rpb24gKG4pIHtcbiAgICB0aGlzLl9tYXhSZWRpcmVjdHMgPSBuO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0IHRvIGEgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QgKG5vdCBKU09OIHN0cmluZykgb2Ygc2NhbGFyIHByb3BlcnRpZXMuXG4gKiBOb3RlIGFzIHRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHJldHVybiBhIHVzZWZ1bCBub24tdGhpcyB2YWx1ZSxcbiAqIGl0IGNhbm5vdCBiZSBjaGFpbmVkLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gZGVzY3JpYmluZyBtZXRob2QsIHVybCwgYW5kIGRhdGEgb2YgdGhpcyByZXF1ZXN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbWV0aG9kOiB0aGlzLm1ldGhvZCxcbiAgICAgICAgdXJsOiB0aGlzLnVybCxcbiAgICAgICAgZGF0YTogdGhpcy5fZGF0YSxcbiAgICAgICAgaGVhZGVyczogdGhpcy5faGVhZGVyXG4gICAgfTtcbn07XG5cblxuLyoqXG4gKiBTZW5kIGBkYXRhYCBhcyB0aGUgcmVxdWVzdCBib2R5LCBkZWZhdWx0aW5nIHRoZSBgLnR5cGUoKWAgdG8gXCJqc29uXCIgd2hlblxuICogYW4gb2JqZWN0IGlzIGdpdmVuLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgIC8vIG1hbnVhbCBqc29uXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2pzb24nKVxuICogICAgICAgICAuc2VuZCgne1wibmFtZVwiOlwidGpcIn0nKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGF1dG8ganNvblxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIG1hbnVhbCB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnZm9ybScpXG4gKiAgICAgICAgIC5zZW5kKCduYW1lPXRqJylcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBhdXRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdmb3JtJylcbiAqICAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gZGVmYXVsdHMgdG8geC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgIC5zZW5kKCduYW1lPXRvYmknKVxuICogICAgICAgIC5zZW5kKCdzcGVjaWVzPWZlcnJldCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGRhdGFcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc2VuZCA9IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgdmFyIGlzT2JqID0gaXNPYmplY3QoZGF0YSk7XG4gICAgdmFyIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuXG4gICAgaWYgKHRoaXMuX2Zvcm1EYXRhKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCIuc2VuZCgpIGNhbid0IGJlIHVzZWQgaWYgLmF0dGFjaCgpIG9yIC5maWVsZCgpIGlzIHVzZWQuIFBsZWFzZSB1c2Ugb25seSAuc2VuZCgpIG9yIG9ubHkgLmZpZWxkKCkgJiAuYXR0YWNoKClcIik7XG4gICAgfVxuXG4gICAgaWYgKGlzT2JqICYmICF0aGlzLl9kYXRhKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YSA9IHt9O1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChkYXRhICYmIHRoaXMuX2RhdGEgJiYgdGhpcy5faXNIb3N0KHRoaXMuX2RhdGEpKSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiQ2FuJ3QgbWVyZ2UgdGhlc2Ugc2VuZCBjYWxsc1wiKTtcbiAgICB9XG5cbiAgICAvLyBtZXJnZVxuICAgIGlmIChpc09iaiAmJiBpc09iamVjdCh0aGlzLl9kYXRhKSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgICAgICAgdGhpcy5fZGF0YVtrZXldID0gZGF0YVtrZXldO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgZGF0YSkge1xuICAgICAgICAvLyBkZWZhdWx0IHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICAgICAgICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnZm9ybScpO1xuICAgICAgICB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgaWYgKCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnID09IHR5cGUpIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEgPSB0aGlzLl9kYXRhXG4gICAgICAgICAgICAgICAgPyB0aGlzLl9kYXRhICsgJyYnICsgZGF0YVxuICAgICAgICAgICAgICAgIDogZGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2RhdGEgPSAodGhpcy5fZGF0YSB8fCAnJykgKyBkYXRhO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZGF0YSA9IGRhdGE7XG4gICAgfVxuXG4gICAgaWYgKCFpc09iaiB8fCB0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gZGVmYXVsdCB0byBqc29uXG4gICAgaWYgKCF0eXBlKSB0aGlzLnR5cGUoJ2pzb24nKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTb3J0IGBxdWVyeXN0cmluZ2AgYnkgdGhlIHNvcnQgZnVuY3Rpb25cbiAqXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICAgLy8gZGVmYXVsdCBvcmRlclxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGN1c3RvbWl6ZWQgc29ydCBmdW5jdGlvblxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoZnVuY3Rpb24oYSwgYil7XG4gKiAgICAgICAgICAgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gKiAgICAgICAgIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHNvcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc29ydFF1ZXJ5ID0gZnVuY3Rpb24gKHNvcnQpIHtcbiAgICAvLyBfc29ydCBkZWZhdWx0IHRvIHRydWUgYnV0IG90aGVyd2lzZSBjYW4gYmUgYSBmdW5jdGlvbiBvciBib29sZWFuXG4gICAgdGhpcy5fc29ydCA9IHR5cGVvZiBzb3J0ID09PSAndW5kZWZpbmVkJyA/IHRydWUgOiBzb3J0O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbnZva2UgY2FsbGJhY2sgd2l0aCB0aW1lb3V0IGVycm9yLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fdGltZW91dEVycm9yID0gZnVuY3Rpb24gKHJlYXNvbiwgdGltZW91dCwgZXJybm8pIHtcbiAgICBpZiAodGhpcy5fYWJvcnRlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IocmVhc29uICsgdGltZW91dCArICdtcyBleGNlZWRlZCcpO1xuICAgIGVyci50aW1lb3V0ID0gdGltZW91dDtcbiAgICBlcnIuY29kZSA9ICdFQ09OTkFCT1JURUQnO1xuICAgIGVyci5lcnJubyA9IGVycm5vO1xuICAgIHRoaXMudGltZWRvdXQgPSB0cnVlO1xuICAgIHRoaXMuYWJvcnQoKTtcbiAgICB0aGlzLmNhbGxiYWNrKGVycik7XG59O1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX3NldFRpbWVvdXRzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIGRlYWRsaW5lXG4gICAgaWYgKHRoaXMuX3RpbWVvdXQgJiYgIXRoaXMuX3RpbWVyKSB7XG4gICAgICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl90aW1lb3V0RXJyb3IoJ1RpbWVvdXQgb2YgJywgc2VsZi5fdGltZW91dCwgJ0VUSU1FJyk7XG4gICAgICAgIH0sIHRoaXMuX3RpbWVvdXQpO1xuICAgIH1cbiAgICAvLyByZXNwb25zZSB0aW1lb3V0XG4gICAgaWYgKHRoaXMuX3Jlc3BvbnNlVGltZW91dCAmJiAhdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcignUmVzcG9uc2UgdGltZW91dCBvZiAnLCBzZWxmLl9yZXNwb25zZVRpbWVvdXQsICdFVElNRURPVVQnKTtcbiAgICAgICAgfSwgdGhpcy5fcmVzcG9uc2VUaW1lb3V0KTtcbiAgICB9XG59XG4iLCIvKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG4vKipcbiAqIEV4cG9zZSBgUmVzcG9uc2VCYXNlYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc3BvbnNlQmFzZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZUJhc2VgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2VCYXNlKG9iaikge1xuICAgIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gUmVzcG9uc2VCYXNlLnByb3RvdHlwZSkge1xuICAgICAgICBvYmpba2V5XSA9IFJlc3BvbnNlQmFzZS5wcm90b3R5cGVba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBHZXQgY2FzZS1pbnNlbnNpdGl2ZSBgZmllbGRgIHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChmaWVsZCkge1xuICAgIHJldHVybiB0aGlzLmhlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogU2V0IGhlYWRlciByZWxhdGVkIHByb3BlcnRpZXM6XG4gKlxuICogICAtIGAudHlwZWAgdGhlIGNvbnRlbnQgdHlwZSB3aXRob3V0IHBhcmFtc1xuICpcbiAqIEEgcmVzcG9uc2Ugb2YgXCJDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIlxuICogd2lsbCBwcm92aWRlIHlvdSB3aXRoIGEgYC50eXBlYCBvZiBcInRleHQvcGxhaW5cIi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRIZWFkZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24gKGhlYWRlcikge1xuICAgIC8vIFRPRE86IG1vYXIhXG4gICAgLy8gVE9ETzogbWFrZSB0aGlzIGEgdXRpbFxuXG4gICAgLy8gY29udGVudC10eXBlXG4gICAgdmFyIGN0ID0gaGVhZGVyWydjb250ZW50LXR5cGUnXSB8fCAnJztcbiAgICB0aGlzLnR5cGUgPSB1dGlscy50eXBlKGN0KTtcblxuICAgIC8vIHBhcmFtc1xuICAgIHZhciBwYXJhbXMgPSB1dGlscy5wYXJhbXMoY3QpO1xuICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHRoaXNba2V5XSA9IHBhcmFtc1trZXldO1xuXG4gICAgdGhpcy5saW5rcyA9IHt9O1xuXG4gICAgLy8gbGlua3NcbiAgICB0cnkge1xuICAgICAgICBpZiAoaGVhZGVyLmxpbmspIHtcbiAgICAgICAgICAgIHRoaXMubGlua3MgPSB1dGlscy5wYXJzZUxpbmtzKGhlYWRlci5saW5rKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBpZ25vcmVcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldCBmbGFncyBzdWNoIGFzIGAub2tgIGJhc2VkIG9uIGBzdGF0dXNgLlxuICpcbiAqIEZvciBleGFtcGxlIGEgMnh4IHJlc3BvbnNlIHdpbGwgZ2l2ZSB5b3UgYSBgLm9rYCBvZiBfX3RydWVfX1xuICogd2hlcmVhcyA1eHggd2lsbCBiZSBfX2ZhbHNlX18gYW5kIGAuZXJyb3JgIHdpbGwgYmUgX190cnVlX18uIFRoZVxuICogYC5jbGllbnRFcnJvcmAgYW5kIGAuc2VydmVyRXJyb3JgIGFyZSBhbHNvIGF2YWlsYWJsZSB0byBiZSBtb3JlXG4gKiBzcGVjaWZpYywgYW5kIGAuc3RhdHVzVHlwZWAgaXMgdGhlIGNsYXNzIG9mIGVycm9yIHJhbmdpbmcgZnJvbSAxLi41XG4gKiBzb21ldGltZXMgdXNlZnVsIGZvciBtYXBwaW5nIHJlc3BvbmQgY29sb3JzIGV0Yy5cbiAqXG4gKiBcInN1Z2FyXCIgcHJvcGVydGllcyBhcmUgYWxzbyBkZWZpbmVkIGZvciBjb21tb24gY2FzZXMuIEN1cnJlbnRseSBwcm92aWRpbmc6XG4gKlxuICogICAtIC5ub0NvbnRlbnRcbiAqICAgLSAuYmFkUmVxdWVzdFxuICogICAtIC51bmF1dGhvcml6ZWRcbiAqICAgLSAubm90QWNjZXB0YWJsZVxuICogICAtIC5ub3RGb3VuZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBzdGF0dXNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuX3NldFN0YXR1c1Byb3BlcnRpZXMgPSBmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgdmFyIHR5cGUgPSBzdGF0dXMgLyAxMDAgfCAwO1xuXG4gICAgLy8gc3RhdHVzIC8gY2xhc3NcbiAgICB0aGlzLnN0YXR1cyA9IHRoaXMuc3RhdHVzQ29kZSA9IHN0YXR1cztcbiAgICB0aGlzLnN0YXR1c1R5cGUgPSB0eXBlO1xuXG4gICAgLy8gYmFzaWNzXG4gICAgdGhpcy5pbmZvID0gMSA9PSB0eXBlO1xuICAgIHRoaXMub2sgPSAyID09IHR5cGU7XG4gICAgdGhpcy5yZWRpcmVjdCA9IDMgPT0gdHlwZTtcbiAgICB0aGlzLmNsaWVudEVycm9yID0gNCA9PSB0eXBlO1xuICAgIHRoaXMuc2VydmVyRXJyb3IgPSA1ID09IHR5cGU7XG4gICAgdGhpcy5lcnJvciA9ICg0ID09IHR5cGUgfHwgNSA9PSB0eXBlKVxuICAgICAgICA/IHRoaXMudG9FcnJvcigpXG4gICAgICAgIDogZmFsc2U7XG5cbiAgICAvLyBzdWdhclxuICAgIHRoaXMuYWNjZXB0ZWQgPSAyMDIgPT0gc3RhdHVzO1xuICAgIHRoaXMubm9Db250ZW50ID0gMjA0ID09IHN0YXR1cztcbiAgICB0aGlzLmJhZFJlcXVlc3QgPSA0MDAgPT0gc3RhdHVzO1xuICAgIHRoaXMudW5hdXRob3JpemVkID0gNDAxID09IHN0YXR1cztcbiAgICB0aGlzLm5vdEFjY2VwdGFibGUgPSA0MDYgPT0gc3RhdHVzO1xuICAgIHRoaXMuZm9yYmlkZGVuID0gNDAzID09IHN0YXR1cztcbiAgICB0aGlzLm5vdEZvdW5kID0gNDA0ID09IHN0YXR1cztcbn07XG4iLCJ2YXIgRVJST1JfQ09ERVMgPSBbXG4gICAgJ0VDT05OUkVTRVQnLFxuICAgICdFVElNRURPVVQnLFxuICAgICdFQUREUklORk8nLFxuICAgICdFU09DS0VUVElNRURPVVQnXG5dO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHJlcXVlc3Qgc2hvdWxkIGJlIHJldHJpZWQuXG4gKiAoQm9ycm93ZWQgZnJvbSBzZWdtZW50aW8vc3VwZXJhZ2VudC1yZXRyeSlcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IFtyZXNdXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaG91bGRSZXRyeShlcnIsIHJlcykge1xuICAgIGlmIChlcnIgJiYgZXJyLmNvZGUgJiYgfkVSUk9SX0NPREVTLmluZGV4T2YoZXJyLmNvZGUpKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAocmVzICYmIHJlcy5zdGF0dXMgJiYgcmVzLnN0YXR1cyA+PSA1MDApIHJldHVybiB0cnVlO1xuICAgIC8vIFN1cGVyYWdlbnQgdGltZW91dFxuICAgIGlmIChlcnIgJiYgJ3RpbWVvdXQnIGluIGVyciAmJiBlcnIuY29kZSA9PSAnRUNPTk5BQk9SVEVEJykgcmV0dXJuIHRydWU7XG4gICAgaWYgKGVyciAmJiAnY3Jvc3NEb21haW4nIGluIGVycikgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcbiIsIi8qKlxuICogUmV0dXJuIHRoZSBtaW1lIHR5cGUgZm9yIHRoZSBnaXZlbiBgc3RyYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnR5cGUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5zaGlmdCgpO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gaGVhZGVyIGZpZWxkIHBhcmFtZXRlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5wYXJhbXMgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo9ICovKTtcbiAgICAgICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICAgIHZhciB2YWwgPSBwYXJ0cy5zaGlmdCgpO1xuXG4gICAgICAgIGlmIChrZXkgJiYgdmFsKSBvYmpba2V5XSA9IHZhbDtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFBhcnNlIExpbmsgaGVhZGVyIGZpZWxkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnBhcnNlTGlua3MgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgcmV0dXJuIHN0ci5zcGxpdCgvICosICovKS5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgc3RyKSB7XG4gICAgICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo7ICovKTtcbiAgICAgICAgdmFyIHVybCA9IHBhcnRzWzBdLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgdmFyIHJlbCA9IHBhcnRzWzFdLnNwbGl0KC8gKj0gKi8pWzFdLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgb2JqW3JlbF0gPSB1cmw7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30pO1xufTtcblxuLyoqXG4gKiBTdHJpcCBjb250ZW50IHJlbGF0ZWQgZmllbGRzIGZyb20gYGhlYWRlcmAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGhlYWRlclxuICogQHJldHVybiB7T2JqZWN0fSBoZWFkZXJcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMuY2xlYW5IZWFkZXIgPSBmdW5jdGlvbiAoaGVhZGVyLCBzaG91bGRTdHJpcENvb2tpZSkge1xuICAgIGRlbGV0ZSBoZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGRlbGV0ZSBoZWFkZXJbJ2NvbnRlbnQtbGVuZ3RoJ107XG4gICAgZGVsZXRlIGhlYWRlclsndHJhbnNmZXItZW5jb2RpbmcnXTtcbiAgICBkZWxldGUgaGVhZGVyWydob3N0J107XG4gICAgaWYgKHNob3VsZFN0cmlwQ29va2llKSB7XG4gICAgICAgIGRlbGV0ZSBoZWFkZXJbJ2Nvb2tpZSddO1xuICAgIH1cbiAgICByZXR1cm4gaGVhZGVyO1xufTsiLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydzdXBlcmFnZW50JywgJ3F1ZXJ5c3RyaW5nJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJ3N1cGVyYWdlbnQnKSwgcmVxdWlyZSgncXVlcnlzdHJpbmcnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQgPSBmYWN0b3J5KHJvb3Quc3VwZXJhZ2VudCwgcm9vdC5xdWVyeXN0cmluZyk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oc3VwZXJhZ2VudCwgcXVlcnlzdHJpbmcpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBAbW9kdWxlIEFwaUNsaWVudFxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogTWFuYWdlcyBsb3cgbGV2ZWwgY2xpZW50LXNlcnZlciBjb21tdW5pY2F0aW9ucywgcGFyYW1ldGVyIG1hcnNoYWxsaW5nLCBldGMuIFRoZXJlIHNob3VsZCBub3QgYmUgYW55IG5lZWQgZm9yIGFuXG4gICAqIGFwcGxpY2F0aW9uIHRvIHVzZSB0aGlzIGNsYXNzIGRpcmVjdGx5IC0gdGhlICpBcGkgYW5kIG1vZGVsIGNsYXNzZXMgcHJvdmlkZSB0aGUgcHVibGljIEFQSSBmb3IgdGhlIHNlcnZpY2UuIFRoZVxuICAgKiBjb250ZW50cyBvZiB0aGlzIGZpbGUgc2hvdWxkIGJlIHJlZ2FyZGVkIGFzIGludGVybmFsIGJ1dCBhcmUgZG9jdW1lbnRlZCBmb3IgY29tcGxldGVuZXNzLlxuICAgKiBAYWxpYXMgbW9kdWxlOkFwaUNsaWVudFxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgVVJMIGFnYWluc3Qgd2hpY2ggdG8gcmVzb2x2ZSBldmVyeSBBUEkgY2FsbCdzIChyZWxhdGl2ZSkgcGF0aC5cbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAqIEBkZWZhdWx0IGh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC92MlxuICAgICAqL1xuICAgIHRoaXMuYmFzZVBhdGggPSAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3YyJy5yZXBsYWNlKC9cXC8rJC8sICcnKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2RzIHRvIGJlIGluY2x1ZGVkIGZvciBhbGwgQVBJIGNhbGxzLlxuICAgICAqIEB0eXBlIHtBcnJheS48U3RyaW5nPn1cbiAgICAgKi9cbiAgICB0aGlzLmF1dGhlbnRpY2F0aW9ucyA9IHtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoZSBkZWZhdWx0IEhUVFAgaGVhZGVycyB0byBiZSBpbmNsdWRlZCBmb3IgYWxsIEFQSSBjYWxscy5cbiAgICAgKiBAdHlwZSB7QXJyYXkuPFN0cmluZz59XG4gICAgICogQGRlZmF1bHQge31cbiAgICAgKi9cbiAgICB0aGlzLmRlZmF1bHRIZWFkZXJzID0ge307XG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGVmYXVsdCBIVFRQIHRpbWVvdXQgZm9yIGFsbCBBUEkgY2FsbHMuXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKiBAZGVmYXVsdCA2MDAwMFxuICAgICAqL1xuICAgIHRoaXMudGltZW91dCA9IDYwMDAwO1xuXG4gICAgLyoqXG4gICAgICogSWYgc2V0IHRvIGZhbHNlIGFuIGFkZGl0aW9uYWwgdGltZXN0YW1wIHBhcmFtZXRlciBpcyBhZGRlZCB0byBhbGwgQVBJIEdFVCBjYWxscyB0b1xuICAgICAqIHByZXZlbnQgYnJvd3NlciBjYWNoaW5nXG4gICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICogQGRlZmF1bHQgdHJ1ZVxuICAgICAqL1xuICAgIHRoaXMuY2FjaGUgPSB0cnVlO1xuXG4gICAgLyoqXG4gICAgICogSWYgc2V0IHRvIHRydWUsIHRoZSBjbGllbnQgd2lsbCBzYXZlIHRoZSBjb29raWVzIGZyb20gZWFjaCBzZXJ2ZXJcbiAgICAgKiByZXNwb25zZSwgYW5kIHJldHVybiB0aGVtIGluIHRoZSBuZXh0IHJlcXVlc3QuXG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cbiAgICB0aGlzLmVuYWJsZUNvb2tpZXMgPSBmYWxzZTtcblxuICAgIC8qXG4gICAgICogVXNlZCB0byBzYXZlIGFuZCByZXR1cm4gY29va2llcyBpbiBhIG5vZGUuanMgKG5vbi1icm93c2VyKSBzZXR0aW5nLFxuICAgICAqIGlmIHRoaXMuZW5hYmxlQ29va2llcyBpcyBzZXQgdG8gdHJ1ZS5cbiAgICAgKi9cbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMuYWdlbnQgPSBuZXcgc3VwZXJhZ2VudC5hZ2VudCgpO1xuICAgIH1cblxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIGZvciBhbiBhY3R1YWwgcGFyYW1ldGVyLlxuICAgKiBAcGFyYW0gcGFyYW0gVGhlIGFjdHVhbCBwYXJhbWV0ZXIuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgPGNvZGU+cGFyYW08L2NvZGU+LlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUucGFyYW1Ub1N0cmluZyA9IGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgaWYgKHBhcmFtID09IHVuZGVmaW5lZCB8fCBwYXJhbSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgIHJldHVybiBwYXJhbS50b0pTT04oKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtLnRvU3RyaW5nKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBmdWxsIFVSTCBieSBhcHBlbmRpbmcgdGhlIGdpdmVuIHBhdGggdG8gdGhlIGJhc2UgVVJMIGFuZCByZXBsYWNpbmcgcGF0aCBwYXJhbWV0ZXIgcGxhY2UtaG9sZGVycyB3aXRoIHBhcmFtZXRlciB2YWx1ZXMuXG4gICAqIE5PVEU6IHF1ZXJ5IHBhcmFtZXRlcnMgYXJlIG5vdCBoYW5kbGVkIGhlcmUuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgYmFzZSBVUkwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwYXRoUGFyYW1zIFRoZSBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFwcGVuZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGVuY29kZWQgcGF0aCB3aXRoIHBhcmFtZXRlciB2YWx1ZXMgc3Vic3RpdHV0ZWQuXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5idWlsZFVybCA9IGZ1bmN0aW9uKHBhdGgsIHBhdGhQYXJhbXMpIHtcbiAgICBpZiAoIXBhdGgubWF0Y2goL15cXC8vKSkge1xuICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHZhciB1cmwgPSB0aGlzLmJhc2VQYXRoICsgcGF0aDtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHVybCA9IHVybC5yZXBsYWNlKC9cXHsoW1xcdy1dKylcXH0vZywgZnVuY3Rpb24oZnVsbE1hdGNoLCBrZXkpIHtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIGlmIChwYXRoUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdmFsdWUgPSBfdGhpcy5wYXJhbVRvU3RyaW5nKHBhdGhQYXJhbXNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGZ1bGxNYXRjaDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiB1cmw7XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBjb250ZW50IHR5cGUgcmVwcmVzZW50cyBKU09OLjxicj5cbiAgICogSlNPTiBjb250ZW50IHR5cGUgZXhhbXBsZXM6PGJyPlxuICAgKiA8dWw+XG4gICAqIDxsaT5hcHBsaWNhdGlvbi9qc29uPC9saT5cbiAgICogPGxpPmFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGODwvbGk+XG4gICAqIDxsaT5BUFBMSUNBVElPTi9KU09OPC9saT5cbiAgICogPC91bD5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnRUeXBlIFRoZSBNSU1FIGNvbnRlbnQgdHlwZSB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIDxjb2RlPmNvbnRlbnRUeXBlPC9jb2RlPiByZXByZXNlbnRzIEpTT04sIG90aGVyd2lzZSA8Y29kZT5mYWxzZTwvY29kZT4uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5pc0pzb25NaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGUpIHtcbiAgICByZXR1cm4gQm9vbGVhbihjb250ZW50VHlwZSAhPSBudWxsICYmIGNvbnRlbnRUeXBlLm1hdGNoKC9eYXBwbGljYXRpb25cXC9qc29uKDsuKik/JC9pKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENob29zZXMgYSBjb250ZW50IHR5cGUgZnJvbSB0aGUgZ2l2ZW4gYXJyYXksIHdpdGggSlNPTiBwcmVmZXJyZWQ7IGkuZS4gcmV0dXJuIEpTT04gaWYgaW5jbHVkZWQsIG90aGVyd2lzZSByZXR1cm4gdGhlIGZpcnN0LlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBjb250ZW50VHlwZXNcbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGNob3NlbiBjb250ZW50IHR5cGUsIHByZWZlcnJpbmcgSlNPTi5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmpzb25QcmVmZXJyZWRNaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGVzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250ZW50VHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmlzSnNvbk1pbWUoY29udGVudFR5cGVzW2ldKSkge1xuICAgICAgICByZXR1cm4gY29udGVudFR5cGVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29udGVudFR5cGVzWzBdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gcGFyYW1ldGVyIHZhbHVlIHJlcHJlc2VudHMgZmlsZS1saWtlIGNvbnRlbnQuXG4gICAqIEBwYXJhbSBwYXJhbSBUaGUgcGFyYW1ldGVyIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgPGNvZGU+cGFyYW08L2NvZGU+IHJlcHJlc2VudHMgYSBmaWxlLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuaXNGaWxlUGFyYW0gPSBmdW5jdGlvbihwYXJhbSkge1xuICAgIC8vIGZzLlJlYWRTdHJlYW0gaW4gTm9kZS5qcyBhbmQgRWxlY3Ryb24gKGJ1dCBub3QgaW4gcnVudGltZSBsaWtlIGJyb3dzZXJpZnkpXG4gICAgaWYgKHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgZnM7XG4gICAgICB0cnkge1xuICAgICAgICBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHt9XG4gICAgICBpZiAoZnMgJiYgZnMuUmVhZFN0cmVhbSAmJiBwYXJhbSBpbnN0YW5jZW9mIGZzLlJlYWRTdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEJ1ZmZlciBpbiBOb2RlLmpzXG4gICAgaWYgKHR5cGVvZiBCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCdWZmZXIpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLyBCbG9iIGluIGJyb3dzZXJcbiAgICBpZiAodHlwZW9mIEJsb2IgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRmlsZSBpbiBicm93c2VyIChpdCBzZWVtcyBGaWxlIG9iamVjdCBpcyBhbHNvIGluc3RhbmNlIG9mIEJsb2IsIGJ1dCBrZWVwIHRoaXMgZm9yIHNhZmUpXG4gICAgaWYgKHR5cGVvZiBGaWxlID09PSAnZnVuY3Rpb24nICYmIHBhcmFtIGluc3RhbmNlb2YgRmlsZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvKipcbiAgICogTm9ybWFsaXplcyBwYXJhbWV0ZXIgdmFsdWVzOlxuICAgKiA8dWw+XG4gICAqIDxsaT5yZW1vdmUgbmlsczwvbGk+XG4gICAqIDxsaT5rZWVwIGZpbGVzIGFuZCBhcnJheXM8L2xpPlxuICAgKiA8bGk+Zm9ybWF0IHRvIHN0cmluZyB3aXRoIGBwYXJhbVRvU3RyaW5nYCBmb3Igb3RoZXIgY2FzZXM8L2xpPlxuICAgKiA8L3VsPlxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBwYXJhbXMgVGhlIHBhcmFtZXRlcnMgYXMgb2JqZWN0IHByb3BlcnRpZXMuXG4gICAqIEByZXR1cm5zIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gbm9ybWFsaXplZCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUubm9ybWFsaXplUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIG5ld1BhcmFtcyA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHtcbiAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBwYXJhbXNba2V5XSAhPSB1bmRlZmluZWQgJiYgcGFyYW1zW2tleV0gIT0gbnVsbCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbXNba2V5XTtcbiAgICAgICAgaWYgKHRoaXMuaXNGaWxlUGFyYW0odmFsdWUpIHx8IEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgbmV3UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdQYXJhbXNba2V5XSA9IHRoaXMucGFyYW1Ub1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld1BhcmFtcztcbiAgfTtcblxuICAvKipcbiAgICogRW51bWVyYXRpb24gb2YgY29sbGVjdGlvbiBmb3JtYXQgc2VwYXJhdG9yIHN0cmF0ZWdpZXMuXG4gICAqIEBlbnVtIHtTdHJpbmd9XG4gICAqIEByZWFkb25seVxuICAgKi9cbiAgZXhwb3J0cy5Db2xsZWN0aW9uRm9ybWF0RW51bSA9IHtcbiAgICAvKipcbiAgICAgKiBDb21tYS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+Y3N2PC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIENTVjogJywnLFxuICAgIC8qKlxuICAgICAqIFNwYWNlLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5zc3Y8L2NvZGU+XG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgU1NWOiAnICcsXG4gICAgLyoqXG4gICAgICogVGFiLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT50c3Y8L2NvZGU+XG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgVFNWOiAnXFx0JyxcbiAgICAvKipcbiAgICAgKiBQaXBlKHwpLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5waXBlczwvY29kZT5cbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBQSVBFUzogJ3wnLFxuICAgIC8qKlxuICAgICAqIE5hdGl2ZSBhcnJheS4gVmFsdWU6IDxjb2RlPm11bHRpPC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIE1VTFRJOiAnbXVsdGknXG4gIH07XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBhcnJheS10eXBlIGFjdHVhbCBwYXJhbWV0ZXIsIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gY29sbGVjdGlvbiBmb3JtYXQuXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtIEFuIGFycmF5IHBhcmFtZXRlci5cbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50LkNvbGxlY3Rpb25Gb3JtYXRFbnVtfSBjb2xsZWN0aW9uRm9ybWF0IFRoZSBhcnJheSBlbGVtZW50IHNlcGFyYXRvciBzdHJhdGVneS5cbiAgICogQHJldHVybnMge1N0cmluZ3xBcnJheX0gQSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHN1cHBsaWVkIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBzcGVjaWZpZWQgZGVsaW1pdGVyLiBSZXR1cm5zXG4gICAqIDxjb2RlPnBhcmFtPC9jb2RlPiBhcyBpcyBpZiA8Y29kZT5jb2xsZWN0aW9uRm9ybWF0PC9jb2RlPiBpcyA8Y29kZT5tdWx0aTwvY29kZT4uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5idWlsZENvbGxlY3Rpb25QYXJhbSA9IGZ1bmN0aW9uIGJ1aWxkQ29sbGVjdGlvblBhcmFtKHBhcmFtLCBjb2xsZWN0aW9uRm9ybWF0KSB7XG4gICAgaWYgKHBhcmFtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBzd2l0Y2ggKGNvbGxlY3Rpb25Gb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2Nzdic6XG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCcsJyk7XG4gICAgICBjYXNlICdzc3YnOlxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignICcpO1xuICAgICAgY2FzZSAndHN2JzpcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpLmpvaW4oJ1xcdCcpO1xuICAgICAgY2FzZSAncGlwZXMnOlxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignfCcpO1xuICAgICAgY2FzZSAnbXVsdGknOlxuICAgICAgICAvLyByZXR1cm4gdGhlIGFycmF5IGRpcmVjdGx5IGFzIFN1cGVyQWdlbnQgd2lsbCBoYW5kbGUgaXQgYXMgZXhwZWN0ZWRcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNvbGxlY3Rpb24gZm9ybWF0OiAnICsgY29sbGVjdGlvbkZvcm1hdCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBsaWVzIGF1dGhlbnRpY2F0aW9uIGhlYWRlcnMgdG8gdGhlIHJlcXVlc3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IFRoZSByZXF1ZXN0IG9iamVjdCBjcmVhdGVkIGJ5IGEgPGNvZGU+c3VwZXJhZ2VudCgpPC9jb2RlPiBjYWxsLlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBhdXRoTmFtZXMgQW4gYXJyYXkgb2YgYXV0aGVudGljYXRpb24gbWV0aG9kIG5hbWVzLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuYXBwbHlBdXRoVG9SZXF1ZXN0ID0gZnVuY3Rpb24ocmVxdWVzdCwgYXV0aE5hbWVzKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBhdXRoTmFtZXMuZm9yRWFjaChmdW5jdGlvbihhdXRoTmFtZSkge1xuICAgICAgdmFyIGF1dGggPSBfdGhpcy5hdXRoZW50aWNhdGlvbnNbYXV0aE5hbWVdO1xuICAgICAgc3dpdGNoIChhdXRoLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnYmFzaWMnOlxuICAgICAgICAgIGlmIChhdXRoLnVzZXJuYW1lIHx8IGF1dGgucGFzc3dvcmQpIHtcbiAgICAgICAgICAgIHJlcXVlc3QuYXV0aChhdXRoLnVzZXJuYW1lIHx8ICcnLCBhdXRoLnBhc3N3b3JkIHx8ICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2FwaUtleSc6XG4gICAgICAgICAgaWYgKGF1dGguYXBpS2V5KSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICAgICAgaWYgKGF1dGguYXBpS2V5UHJlZml4KSB7XG4gICAgICAgICAgICAgIGRhdGFbYXV0aC5uYW1lXSA9IGF1dGguYXBpS2V5UHJlZml4ICsgJyAnICsgYXV0aC5hcGlLZXk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkYXRhW2F1dGgubmFtZV0gPSBhdXRoLmFwaUtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdXRoWydpbiddID09PSAnaGVhZGVyJykge1xuICAgICAgICAgICAgICByZXF1ZXN0LnNldChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlcXVlc3QucXVlcnkoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdvYXV0aDInOlxuICAgICAgICAgIGlmIChhdXRoLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICByZXF1ZXN0LnNldCh7J0F1dGhvcml6YXRpb24nOiAnQmVhcmVyICcgKyBhdXRoLmFjY2Vzc1Rva2VufSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBhdXRoZW50aWNhdGlvbiB0eXBlOiAnICsgYXV0aC50eXBlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogRGVzZXJpYWxpemVzIGFuIEhUVFAgcmVzcG9uc2UgYm9keSBpbnRvIGEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgQSBTdXBlckFnZW50IHJlc3BvbnNlIG9iamVjdC5cbiAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5LjxTdHJpbmc+fE9iamVjdC48U3RyaW5nLCBPYmplY3Q+fEZ1bmN0aW9uKX0gcmV0dXJuVHlwZSBUaGUgdHlwZSB0byByZXR1cm4uIFBhc3MgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlc1xuICAgKiBvciB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIGEgY29tcGxleCB0eXBlLiBQYXNzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHR5cGUgbmFtZSB0byByZXR1cm4gYW4gYXJyYXkgb2YgdGhhdCB0eXBlLiBUb1xuICAgKiByZXR1cm4gYW4gb2JqZWN0LCBwYXNzIGFuIG9iamVjdCB3aXRoIG9uZSBwcm9wZXJ0eSB3aG9zZSBuYW1lIGlzIHRoZSBrZXkgdHlwZSBhbmQgd2hvc2UgdmFsdWUgaXMgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWUgdHlwZTpcbiAgICogYWxsIHByb3BlcnRpZXMgb24gPGNvZGU+ZGF0YTxjb2RlPiB3aWxsIGJlIGNvbnZlcnRlZCB0byB0aGlzIHR5cGUuXG4gICAqIEByZXR1cm5zIEEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiBkZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSkge1xuICAgIGlmIChyZXNwb25zZSA9PSBudWxsIHx8IHJldHVyblR5cGUgPT0gbnVsbCB8fCByZXNwb25zZS5zdGF0dXMgPT0gMjA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gUmVseSBvbiBTdXBlckFnZW50IGZvciBwYXJzaW5nIHJlc3BvbnNlIGJvZHkuXG4gICAgLy8gU2VlIGh0dHA6Ly92aXNpb25tZWRpYS5naXRodWIuaW8vc3VwZXJhZ2VudC8jcGFyc2luZy1yZXNwb25zZS1ib2RpZXNcbiAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmJvZHk7XG4gICAgaWYgKGRhdGEgPT0gbnVsbCB8fCAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIHR5cGVvZiBkYXRhLmxlbmd0aCA9PT0gJ3VuZGVmaW5lZCcgJiYgIU9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCkpIHtcbiAgICAgIC8vIFN1cGVyQWdlbnQgZG9lcyBub3QgYWx3YXlzIHByb2R1Y2UgYSBib2R5OyB1c2UgdGhlIHVucGFyc2VkIHJlc3BvbnNlIGFzIGEgZmFsbGJhY2tcbiAgICAgIGRhdGEgPSByZXNwb25zZS50ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGEsIHJldHVyblR5cGUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICogQGNhbGxiYWNrIG1vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAqIEBwYXJhbSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICovXG5cbiAgLyoqXG4gICAqIEludm9rZXMgdGhlIFJFU1Qgc2VydmljZSB1c2luZyB0aGUgc3VwcGxpZWQgc2V0dGluZ3MgYW5kIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBiYXNlIFVSTCB0byBpbnZva2UuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodHRwTWV0aG9kIFRoZSBIVFRQIG1ldGhvZCB0byB1c2UuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIFN0cmluZz59IHBhdGhQYXJhbXMgQSBtYXAgb2YgcGF0aCBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IHF1ZXJ5UGFyYW1zIEEgbWFwIG9mIHF1ZXJ5IHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gaGVhZGVyUGFyYW1zIEEgbWFwIG9mIGhlYWRlciBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IGZvcm1QYXJhbXMgQSBtYXAgb2YgZm9ybSBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBib2R5UGFyYW0gVGhlIHZhbHVlIHRvIHBhc3MgYXMgdGhlIHJlcXVlc3QgYm9keS5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYXV0aE5hbWVzIEFuIGFycmF5IG9mIGF1dGhlbnRpY2F0aW9uIHR5cGUgbmFtZXMuXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGNvbnRlbnRUeXBlcyBBbiBhcnJheSBvZiByZXF1ZXN0IE1JTUUgdHlwZXMuXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGFjY2VwdHMgQW4gYXJyYXkgb2YgYWNjZXB0YWJsZSByZXNwb25zZSBNSU1FIHR5cGVzLlxuICAgKiBAcGFyYW0geyhTdHJpbmd8QXJyYXl8T2JqZWN0RnVuY3Rpb24pfSByZXR1cm5UeXBlIFRoZSByZXF1aXJlZCB0eXBlIHRvIHJldHVybjsgY2FuIGJlIGEgc3RyaW5nIGZvciBzaW1wbGUgdHlwZXMgb3IgdGhlXG4gICAqIGNvbnN0cnVjdG9yIGZvciBhIGNvbXBsZXggdHlwZS5cbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fmNhbGxBcGlDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgU3VwZXJBZ2VudCByZXF1ZXN0IG9iamVjdC5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmNhbGxBcGkgPSBmdW5jdGlvbiBjYWxsQXBpKHBhdGgsIGh0dHBNZXRob2QsIHBhdGhQYXJhbXMsXG4gICAgICBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBib2R5UGFyYW0sIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLFxuICAgICAgcmV0dXJuVHlwZSwgY2FsbGJhY2spIHtcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdmFyIHVybCA9IHRoaXMuYnVpbGRVcmwocGF0aCwgcGF0aFBhcmFtcyk7XG4gICAgdmFyIHJlcXVlc3QgPSBzdXBlcmFnZW50KGh0dHBNZXRob2QsIHVybCk7XG5cbiAgICAvLyBhcHBseSBhdXRoZW50aWNhdGlvbnNcbiAgICB0aGlzLmFwcGx5QXV0aFRvUmVxdWVzdChyZXF1ZXN0LCBhdXRoTmFtZXMpO1xuXG4gICAgLy8gc2V0IHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICBpZiAoaHR0cE1ldGhvZC50b1VwcGVyQ2FzZSgpID09PSAnR0VUJyAmJiB0aGlzLmNhY2hlID09PSBmYWxzZSkge1xuICAgICAgICBxdWVyeVBhcmFtc1snXyddID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuICAgIHJlcXVlc3QucXVlcnkodGhpcy5ub3JtYWxpemVQYXJhbXMocXVlcnlQYXJhbXMpKTtcblxuICAgIC8vIHNldCBoZWFkZXIgcGFyYW1ldGVyc1xuICAgIHJlcXVlc3Quc2V0KHRoaXMuZGVmYXVsdEhlYWRlcnMpLnNldCh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhoZWFkZXJQYXJhbXMpKTtcblxuICAgIC8vIHNldCByZXF1ZXN0IHRpbWVvdXRcbiAgICByZXF1ZXN0LnRpbWVvdXQodGhpcy50aW1lb3V0KTtcblxuICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuanNvblByZWZlcnJlZE1pbWUoY29udGVudFR5cGVzKTtcbiAgICBpZiAoY29udGVudFR5cGUpIHtcbiAgICAgIC8vIElzc3VlIHdpdGggc3VwZXJhZ2VudCBhbmQgbXVsdGlwYXJ0L2Zvcm0tZGF0YSAoaHR0cHM6Ly9naXRodWIuY29tL3Zpc2lvbm1lZGlhL3N1cGVyYWdlbnQvaXNzdWVzLzc0NilcbiAgICAgIGlmKGNvbnRlbnRUeXBlICE9ICdtdWx0aXBhcnQvZm9ybS1kYXRhJykge1xuICAgICAgICByZXF1ZXN0LnR5cGUoY29udGVudFR5cGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXJlcXVlc3QuaGVhZGVyWydDb250ZW50LVR5cGUnXSkge1xuICAgICAgcmVxdWVzdC50eXBlKCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgfVxuXG4gICAgaWYgKGNvbnRlbnRUeXBlID09PSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykge1xuICAgICAgcmVxdWVzdC5zZW5kKHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeSh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhmb3JtUGFyYW1zKSkpO1xuICAgIH0gZWxzZSBpZiAoY29udGVudFR5cGUgPT0gJ211bHRpcGFydC9mb3JtLWRhdGEnKSB7XG4gICAgICB2YXIgX2Zvcm1QYXJhbXMgPSB0aGlzLm5vcm1hbGl6ZVBhcmFtcyhmb3JtUGFyYW1zKTtcbiAgICAgIGZvciAodmFyIGtleSBpbiBfZm9ybVBhcmFtcykge1xuICAgICAgICBpZiAoX2Zvcm1QYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmICh0aGlzLmlzRmlsZVBhcmFtKF9mb3JtUGFyYW1zW2tleV0pKSB7XG4gICAgICAgICAgICAvLyBmaWxlIGZpZWxkXG4gICAgICAgICAgICByZXF1ZXN0LmF0dGFjaChrZXksIF9mb3JtUGFyYW1zW2tleV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXF1ZXN0LmZpZWxkKGtleSwgX2Zvcm1QYXJhbXNba2V5XSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChib2R5UGFyYW0pIHtcbiAgICAgIHJlcXVlc3Quc2VuZChib2R5UGFyYW0pO1xuICAgIH1cblxuICAgIHZhciBhY2NlcHQgPSB0aGlzLmpzb25QcmVmZXJyZWRNaW1lKGFjY2VwdHMpO1xuICAgIGlmIChhY2NlcHQpIHtcbiAgICAgIHJlcXVlc3QuYWNjZXB0KGFjY2VwdCk7XG4gICAgfVxuXG4gICAgaWYgKHJldHVyblR5cGUgPT09ICdCbG9iJykge1xuICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUoJ2Jsb2InKTtcbiAgICB9IGVsc2UgaWYgKHJldHVyblR5cGUgPT09ICdTdHJpbmcnKSB7XG4gICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSgnc3RyaW5nJyk7XG4gICAgfVxuXG4gICAgLy8gQXR0YWNoIHByZXZpb3VzbHkgc2F2ZWQgY29va2llcywgaWYgZW5hYmxlZFxuICAgIGlmICh0aGlzLmVuYWJsZUNvb2tpZXMpe1xuICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRoaXMuYWdlbnQuYXR0YWNoQ29va2llcyhyZXF1ZXN0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICByZXF1ZXN0LndpdGhDcmVkZW50aWFscygpO1xuICAgICAgfVxuICAgIH1cblxuXG4gICAgcmVxdWVzdC5lbmQoZnVuY3Rpb24oZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGRhdGEgPSBudWxsO1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRhdGEgPSBfdGhpcy5kZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSk7XG4gICAgICAgICAgICBpZiAoX3RoaXMuZW5hYmxlQ29va2llcyAmJiB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyl7XG4gICAgICAgICAgICAgIF90aGlzLmFnZW50LnNhdmVDb29raWVzKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGVycm9yID0gZXJyO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlcXVlc3Q7XG4gIH07XG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbiBJU08tODYwMSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBkYXRlIHZhbHVlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSBkYXRlIHZhbHVlIGFzIGEgc3RyaW5nLlxuICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIHBhcnNlZCBkYXRlIG9iamVjdC5cbiAgICovXG4gIGV4cG9ydHMucGFyc2VEYXRlID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHN0ci5yZXBsYWNlKC9UL2ksICcgJykpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBhIHZhbHVlIHRvIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAgICogQHBhcmFtIHsoU3RyaW5nfE9iamVjdCl9IGRhdGEgVGhlIGRhdGEgdG8gY29udmVydCwgYXMgYSBzdHJpbmcgb3Igb2JqZWN0LlxuICAgKiBAcGFyYW0geyhTdHJpbmd8QXJyYXkuPFN0cmluZz58T2JqZWN0LjxTdHJpbmcsIE9iamVjdD58RnVuY3Rpb24pfSB0eXBlIFRoZSB0eXBlIHRvIHJldHVybi4gUGFzcyBhIHN0cmluZyBmb3Igc2ltcGxlIHR5cGVzXG4gICAqIG9yIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgYSBjb21wbGV4IHR5cGUuIFBhc3MgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgdHlwZSBuYW1lIHRvIHJldHVybiBhbiBhcnJheSBvZiB0aGF0IHR5cGUuIFRvXG4gICAqIHJldHVybiBhbiBvYmplY3QsIHBhc3MgYW4gb2JqZWN0IHdpdGggb25lIHByb3BlcnR5IHdob3NlIG5hbWUgaXMgdGhlIGtleSB0eXBlIGFuZCB3aG9zZSB2YWx1ZSBpcyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSB0eXBlOlxuICAgKiBhbGwgcHJvcGVydGllcyBvbiA8Y29kZT5kYXRhPGNvZGU+IHdpbGwgYmUgY29udmVydGVkIHRvIHRoaXMgdHlwZS5cbiAgICogQHJldHVybnMgQW4gaW5zdGFuY2Ugb2YgdGhlIHNwZWNpZmllZCB0eXBlIG9yIG51bGwgb3IgdW5kZWZpbmVkIGlmIGRhdGEgaXMgbnVsbCBvciB1bmRlZmluZWQuXG4gICAqL1xuICBleHBvcnRzLmNvbnZlcnRUb1R5cGUgPSBmdW5jdGlvbihkYXRhLCB0eXBlKSB7XG4gICAgaWYgKGRhdGEgPT09IG51bGwgfHwgZGF0YSA9PT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIGRhdGFcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSAnQm9vbGVhbic6XG4gICAgICAgIHJldHVybiBCb29sZWFuKGRhdGEpO1xuICAgICAgY2FzZSAnSW50ZWdlcic6XG4gICAgICAgIHJldHVybiBwYXJzZUludChkYXRhLCAxMCk7XG4gICAgICBjYXNlICdOdW1iZXInOlxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChkYXRhKTtcbiAgICAgIGNhc2UgJ1N0cmluZyc6XG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XG4gICAgICBjYXNlICdEYXRlJzpcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyc2VEYXRlKFN0cmluZyhkYXRhKSk7XG4gICAgICBjYXNlICdCbG9iJzpcbiAgICAgIFx0cmV0dXJuIGRhdGE7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAodHlwZSA9PT0gT2JqZWN0KSB7XG4gICAgICAgICAgLy8gZ2VuZXJpYyBvYmplY3QsIHJldHVybiBkaXJlY3RseVxuICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gZm9yIG1vZGVsIHR5cGUgbGlrZTogVXNlclxuICAgICAgICAgIHJldHVybiB0eXBlLmNvbnN0cnVjdEZyb21PYmplY3QoZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0eXBlKSkge1xuICAgICAgICAgIC8vIGZvciBhcnJheSB0eXBlIGxpa2U6IFsnU3RyaW5nJ11cbiAgICAgICAgICB2YXIgaXRlbVR5cGUgPSB0eXBlWzBdO1xuICAgICAgICAgIHJldHVybiBkYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGl0ZW0sIGl0ZW1UeXBlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAvLyBmb3IgcGxhaW4gb2JqZWN0IHR5cGUgbGlrZTogeydTdHJpbmcnOiAnSW50ZWdlcid9XG4gICAgICAgICAgdmFyIGtleVR5cGUsIHZhbHVlVHlwZTtcbiAgICAgICAgICBmb3IgKHZhciBrIGluIHR5cGUpIHtcbiAgICAgICAgICAgIGlmICh0eXBlLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgIGtleVR5cGUgPSBrO1xuICAgICAgICAgICAgICB2YWx1ZVR5cGUgPSB0eXBlW2tdO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgICAgIGZvciAodmFyIGsgaW4gZGF0YSkge1xuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAgdmFyIGtleSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShrLCBrZXlUeXBlKTtcbiAgICAgICAgICAgICAgdmFyIHZhbHVlID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGFba10sIHZhbHVlVHlwZSk7XG4gICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gZm9yIHVua25vd24gdHlwZSwgcmV0dXJuIHRoZSBkYXRhIGRpcmVjdGx5XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgbWFwIG9yIGFycmF5IG1vZGVsIGZyb20gUkVTVCBkYXRhLlxuICAgKiBAcGFyYW0gZGF0YSB7T2JqZWN0fEFycmF5fSBUaGUgUkVTVCBkYXRhLlxuICAgKiBAcGFyYW0gb2JqIHtPYmplY3R8QXJyYXl9IFRoZSB0YXJnZXQgb2JqZWN0IG9yIGFycmF5LlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqLCBpdGVtVHlwZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaSkpXG4gICAgICAgICAgb2JqW2ldID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGFbaV0sIGl0ZW1UeXBlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgayBpbiBkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGspKVxuICAgICAgICAgIG9ialtrXSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2tdLCBpdGVtVHlwZSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uLlxuICAgKiBAdHlwZSB7bW9kdWxlOkFwaUNsaWVudH1cbiAgICovXG4gIGV4cG9ydHMuaW5zdGFuY2UgPSBuZXcgZXhwb3J0cygpO1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1BhcmFtZXRlckxpc3QnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL1BhcmFtZXRlckxpc3QnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5CdWlsZEFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5QYXJhbWV0ZXJMaXN0KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBhcmFtZXRlckxpc3QpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBCdWlsZCBzZXJ2aWNlLlxuICAgKiBAbW9kdWxlIGFwaS9CdWlsZEFwaVxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBCdWlsZEFwaS4gXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL0J1aWxkQXBpXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IGFwaUNsaWVudCBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBidWlsZEFOTiBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvQnVpbGRBcGl+YnVpbGRBTk5DYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcGFzc2VzIGFsbCBsZWFybmluZyBhbmQgQU5OIHBhcmFtZXRlcnMgdG8gdGhlIHNlcnZlclxuICAgICAqIEluY2x1ZGVzIGxlYXJuaW5nIHBhcmFtZXRlcnMgYW5kIEFOTiB0b3BvbG9neVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGlucHV0UGFyYW1ldGVycyBvYmplY3Qgd2l0aCBhbGwgdHVuYWJsZSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0J1aWxkQXBpfmJ1aWxkQU5OQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5idWlsZEFOTiA9IGZ1bmN0aW9uKGlucHV0UGFyYW1ldGVycywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IGlucHV0UGFyYW1ldGVycztcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVycycgaXMgc2V0XG4gICAgICBpZiAoaW5wdXRQYXJhbWV0ZXJzID09PSB1bmRlZmluZWQgfHwgaW5wdXRQYXJhbWV0ZXJzID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJzJyB3aGVuIGNhbGxpbmcgYnVpbGRBTk5cIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9idWlsZC9idWlsZEFOTicsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldElucHV0U2hhcGUgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0J1aWxkQXBpfmdldElucHV0U2hhcGVDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHtBcnJheS48J051bWJlcic+fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgaW5wdXQgc2hhcGUgb2YgdGhlIHRyYWluIGRhdGFcbiAgICAgKiByZXR1cm5zIHRoZSBpbnB1dCBzaGFwZSBvZiB0aGUgdHJhaW4gZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBuYW1lIG9mIHRoZSBkYXRhc2V0IChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0J1aWxkQXBpfmdldElucHV0U2hhcGVDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBBcnJheS48J051bWJlcic+fVxuICAgICAqL1xuICAgIHRoaXMuZ2V0SW5wdXRTaGFwZSA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXVxuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ051bWJlciddO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9idWlsZC9nZXRJbnB1dFNoYXBlJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0ltYWdlRGF0YSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvSW1hZ2VEYXRhJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuTG9hZEFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZURhdGEpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgSW1hZ2VEYXRhKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogTG9hZCBzZXJ2aWNlLlxuICAgKiBAbW9kdWxlIGFwaS9Mb2FkQXBpXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IExvYWRBcGkuIFxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9Mb2FkQXBpXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IGFwaUNsaWVudCBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZUJhdGNoIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQmF0Y2hDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgbmV4dCBiYXRjaCBvZiBpbnB1dC9vdXRwdXQgaW1hZ2VzXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuYmF0Y2hTaXplIGRlZmluZXMgdGhlIG51bWJlciBvZiByZXR1cm4gaW1hZ2VzIChkZWZhdWx0IHRvIDEwMClcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJhdGNoQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldEltYWdlQmF0Y2ggPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2JhdGNoX3NpemUnOiBvcHRzWydiYXRjaFNpemUnXSxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J11cbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldEltYWdlQmF0Y2gnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEltYWdlQnlJZCBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJ5SWRDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHNpbmdsZSBpbnB1dC9vdXRwdXQgaW1hZ2VcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBkZWZpbmVzIHRoZSBpZCBvZiB0aGUgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQnlJZENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRJbWFnZUJ5SWQgPSBmdW5jdGlvbihpZCwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyBpcyBzZXRcbiAgICAgIGlmIChpZCA9PT0gdW5kZWZpbmVkIHx8IGlkID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaWQnIHdoZW4gY2FsbGluZyBnZXRJbWFnZUJ5SWRcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnaWQnOiBpZCxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J11cbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldEltYWdlQnlJZCcsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW1hZ2VzIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlc0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgc3Vic2V0IG9mIGlucHV0L291dHB1dCBpbWFnZXNcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzdGFydElkeCBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZW5kSWR4IG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0SW1hZ2VzID0gZnVuY3Rpb24oc3RhcnRJZHgsIGVuZElkeCwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3N0YXJ0SWR4JyBpcyBzZXRcbiAgICAgIGlmIChzdGFydElkeCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0SWR4ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc3RhcnRJZHgnIHdoZW4gY2FsbGluZyBnZXRJbWFnZXNcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdlbmRJZHgnIGlzIHNldFxuICAgICAgaWYgKGVuZElkeCA9PT0gdW5kZWZpbmVkIHx8IGVuZElkeCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2VuZElkeCcgd2hlbiBjYWxsaW5nIGdldEltYWdlc1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdzdGFydF9pZHgnOiBzdGFydElkeCxcbiAgICAgICAgJ2VuZF9pZHgnOiBlbmRJZHgsXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddXG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRJbWFnZXMnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFJhbmRvbUltYWdlcyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgbmV4dCBiYXRjaCBvZiBpbnB1dC9vdXRwdXQgaW1hZ2VzXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMuYmF0Y2hTaXplIGRlZmluZXMgdGhlIG51bWJlciBvZiByZXR1cm4gaW1hZ2VzIChkZWZhdWx0IHRvIDEwMClcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0UmFuZG9tSW1hZ2VzID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdiYXRjaF9zaXplJzogb3B0c1snYmF0Y2hTaXplJ10sXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddXG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRSYW5kb21JbWFnZXMnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGxvYWRGaWxlIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIExvYWQgYSB0cmFpbi90ZXN0IGRhdGEgZmlsZVxuICAgICAqIExvYWQgYSBkYXRhIGZpbGUgaW4gZGlmZmVyZW50IGRhdGEgZm9ybWF0c1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlbmFtZSBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLnJlYWRMYWJlbHMgdHJ1ZSB0byByZWFkIGxhYmVscyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhVHlwZSBkZXRlcm1pbmVzIHRoZSBkYXRhIGZvcm1hdCBvZiB0aGUgaW5wdXQgZmlsZSAoZGVmYXVsdCB0byBhdXRvKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5sb2FkRmlsZSA9IGZ1bmN0aW9uKGZpbGVuYW1lLCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZmlsZW5hbWUnIGlzIHNldFxuICAgICAgaWYgKGZpbGVuYW1lID09PSB1bmRlZmluZWQgfHwgZmlsZW5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdmaWxlbmFtZScgd2hlbiBjYWxsaW5nIGxvYWRGaWxlXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2ZpbGVuYW1lJzogZmlsZW5hbWUsXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdyZWFkX2xhYmVscyc6IG9wdHNbJ3JlYWRMYWJlbHMnXSxcbiAgICAgICAgJ2RhdGFfdHlwZSc6IG9wdHNbJ2RhdGFUeXBlJ11cbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9sb2FkRmlsZScsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIHJlc2V0QWxsQmF0Y2hJbmRpY2VzIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfnJlc2V0QWxsQmF0Y2hJbmRpY2VzQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJlc2V0cyBhbGwgYmF0Y2ggaW5kaWNlcyBvZiBhbGwgaW1hZ2Ugc2V0c1xuICAgICAqIHJlc2V0cyBhbGwgYmF0Y2ggaW5kaWNlcyBvZiBhbGwgaW1hZ2Ugc2V0c1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfnJlc2V0QWxsQmF0Y2hJbmRpY2VzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5yZXNldEFsbEJhdGNoSW5kaWNlcyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9yZXNldEFsbEJhdGNoSW5kaWNlcycsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIHJlc2V0QmF0Y2hJbmRleCBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5yZXNldEJhdGNoSW5kZXhDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmVzZXRzIHRoZSBiYXRjaCBpbmRleCBvZiB0aGUgaW1hZ2Ugc2V0XG4gICAgICogcmVzZXRzIHRoZSBiYXRjaCBpbmRleCBvZiB0aGUgaW1hZ2Ugc2V0XG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgcmVzZXQgb3V0cHV0IGltYWdlIGJhdGNoIGluZGV4IGluc3RlYWQgb2YgaW5wdXQgaW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfnJlc2V0QmF0Y2hJbmRleENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMucmVzZXRCYXRjaEluZGV4ID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J11cbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9yZXNldEJhdGNoSW5kZXgnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluU3RhdHVzJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlByb2Nlc3NlZEltYWdlRGF0YSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5TdGF0dXMpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgUHJvY2Vzc2VkSW1hZ2VEYXRhLCBUcmFpblBlcmZvcm1hbmNlLCBUcmFpblN0YXR1cykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIFRyYWluIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL1RyYWluQXBpXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFRyYWluQXBpLiBcbiAgICogQGFsaWFzIG1vZHVsZTphcGkvVHJhaW5BcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gYXBpQ2xpZW50IE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUcmFpbmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHJhaW5BcGl+Y29udHJvbFRyYWluaW5nQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHN0YXJ0cywgcGF1c2VzIGFuZCBzdG9wcyB0aGUgdHJhaW5pbmdcbiAgICAgKiB1c2VzIGEgc3RyaW5nIGVudW1cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gdHJhaW5TdGF0dXMgbmV3IHN0YXR1cyBmb3IgdHJhaW5pbmdcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Y29udHJvbFRyYWluaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5jb250cm9sVHJhaW5pbmcgPSBmdW5jdGlvbih0cmFpblN0YXR1cywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndHJhaW5TdGF0dXMnIGlzIHNldFxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgd2hlbiBjYWxsaW5nIGNvbnRyb2xUcmFpbmluZ1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3RyYWluL2NvbnRyb2xUcmFpbmluZycsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByb2Nlc3NlZEltYWdlRGF0YSBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHJhaW5BcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgdGhlIGN1cnJlbnQgdHJhaW4gaW1hZ2VzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBsYXRlbnQgcmVwcmVzZW50YXRpb24gYW5kIG91dHB1dFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhID0gZnVuY3Rpb24oc2V0U2l6ZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyBpcyBzZXRcbiAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemVcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gUHJvY2Vzc2VkSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90cmFpbi9nZXRQcm9jZXNzZWRJbWFnZURhdGEnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2Ugb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1RyYWluQXBpfmdldFRyYWluUGVyZm9ybWFuY2VDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2Ygc2NhbGFyIHRyYWluIHZhcmlhYmxlc1xuICAgICAqIGFzIGxpc3Qgb2YgZGljdHNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHJhaW4vZ2V0VHJhaW5QZXJmb3JtYW5jZScsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMi4zXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9QYXJhbWV0ZXJMaXN0JywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluU3RhdHVzJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9QYXJhbWV0ZXJMaXN0JyksIHJlcXVpcmUoJy4uL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblBlcmZvcm1hbmNlJyksIHJlcXVpcmUoJy4uL21vZGVsL1RyYWluU3RhdHVzJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHVuZUFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5QYXJhbWV0ZXJMaXN0LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qcm9jZXNzZWRJbWFnZURhdGEsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluUGVyZm9ybWFuY2UsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluU3RhdHVzKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBhcmFtZXRlckxpc3QsIFByb2Nlc3NlZEltYWdlRGF0YSwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBUdW5lIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL1R1bmVBcGlcbiAgICogQHZlcnNpb24gMS4wLjdcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgVHVuZUFwaS4gXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL1R1bmVBcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gYXBpQ2xpZW50IE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Y29udHJvbFR1bmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHR1bmluZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfSB0cmFpblN0YXR1cyBuZXcgc3RhdHVzIGZvciB0cmFpbmluZ1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmNvbnRyb2xUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLmNvbnRyb2xUdW5pbmcgPSBmdW5jdGlvbih0cmFpblN0YXR1cywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndHJhaW5TdGF0dXMnIGlzIHNldFxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgd2hlbiBjYWxsaW5nIGNvbnRyb2xUdW5pbmdcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2NvbnRyb2xUdW5pbmcnLCAnUFVUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHNldFNpemUgc2l6ZSBvZiB0aGUgaW1hZ2Ugc3Vic2V0XG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZyA9IGZ1bmN0aW9uKHNldFNpemUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XG4gICAgICBpZiAoc2V0U2l6ZSA9PT0gdW5kZWZpbmVkIHx8IHNldFNpemUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyB3aGVuIGNhbGxpbmcgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ3NldFNpemUnOiBzZXRTaXplXG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFByb2Nlc3NlZEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmcnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgbmV4dCBiYXRjaCBvZiBzY2FsYXIgdHJhaW4gdmFyaWFibGVzXG4gICAgICogYXMgbGlzdCBvZiBkaWN0c1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmcgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFRyYWluUGVyZm9ybWFuY2U7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3R1bmUvZ2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZycsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgcGFzc0FOTlBhcmFtZXRlckxpc3RzIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfnBhc3NBTk5QYXJhbWV0ZXJMaXN0c0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBwYXNzZXMgYWxsIGxlYXJuaW5nIGFuZCBBTk4gcGFyYW1ldGVycyB0byB0aGUgc2VydmVyXG4gICAgICogSW5jbHVkZXMgbGVhcm5pbmcgcGFyYW1ldGVycyBhbmQgQU5OIHRvcG9sb2d5IGFzIGxpc3RzXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gaW5wdXRQYXJhbWV0ZXJMaXN0cyBvYmplY3Qgd2l0aCBhbGwgdHVuYWJsZSBwYXJhbWV0ZXIgbGlzdHNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5wYXNzQU5OUGFyYW1ldGVyTGlzdHNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLnBhc3NBTk5QYXJhbWV0ZXJMaXN0cyA9IGZ1bmN0aW9uKGlucHV0UGFyYW1ldGVyTGlzdHMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBpbnB1dFBhcmFtZXRlckxpc3RzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJMaXN0cycgaXMgc2V0XG4gICAgICBpZiAoaW5wdXRQYXJhbWV0ZXJMaXN0cyA9PT0gdW5kZWZpbmVkIHx8IGlucHV0UGFyYW1ldGVyTGlzdHMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlckxpc3RzJyB3aGVuIGNhbGxpbmcgcGFzc0FOTlBhcmFtZXRlckxpc3RzXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9idWlsZEdyaWRTZWFyY2hBTk4nLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0NsdXN0ZXJpbmcnLCAnbW9kZWwvSW1hZ2UnLCAnbW9kZWwvUG9pbnQyRCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvQ2x1c3RlcmluZycpLCByZXF1aXJlKCcuLi9tb2RlbC9JbWFnZScpLCByZXF1aXJlKCcuLi9tb2RlbC9Qb2ludDJEJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVmlzdWFsaXplQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNsdXN0ZXJpbmcsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qb2ludDJEKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIENsdXN0ZXJpbmcsIEltYWdlLCBQb2ludDJEKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogVmlzdWFsaXplIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL1Zpc3VhbGl6ZUFwaVxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBWaXN1YWxpemVBcGkuIFxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gYXBpQ2xpZW50IE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50Q2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogZ2VuZXJhdGVzIHRoZSBBRSBvdXRwdXQgZnJvbSBhIGdpdmVuIHBvaW50IG9mIHRoZSBzYW1wbGUgZGlzdHJpYnV0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gcG9pbnQyRCAyRCBQb2ludCBvZiB0aGUgc2FtcGxlIGRpc3RyaWJ1dGlvblxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZX1cbiAgICAgKi9cbiAgICB0aGlzLmdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgPSBmdW5jdGlvbihwb2ludDJELCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gcG9pbnQyRDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3BvaW50MkQnIGlzIHNldFxuICAgICAgaWYgKHBvaW50MkQgPT09IHVuZGVmaW5lZCB8fCBwb2ludDJEID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAncG9pbnQyRCcgd2hlbiBjYWxsaW5nIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdmlzdWFsaXplL2dlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmFsZ29yaXRobSBkZXRlcm1pbmVzIHRoZSBjbHV0ZXJpbmcgYWxnb3JpdGhtXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldE5hbWUgZGV0ZXJtaW5lcyB0aGUgZGF0YXNldCB3aGljaCBzaG91bGQgYmUgY2x1c3RlcmVkIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGltZW5zaW9uUmVkdWN0aW9uIGRldGVybWluZXMgdGhlIGFsZ29yaXRobSBmb3IgZGltIHJlZHVjdGlvblxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmxheWVyIGRldGVybWluZXMgdGhlIGhpZGRlbiBsYXllclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9XG4gICAgICovXG4gICAgdGhpcy5nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcgPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2FsZ29yaXRobSc6IG9wdHNbJ2FsZ29yaXRobSddLFxuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcbiAgICAgICAgJ2RpbWVuc2lvbl9yZWR1Y3Rpb24nOiBvcHRzWydkaW1lbnNpb25SZWR1Y3Rpb24nXSxcbiAgICAgICAgJ2xheWVyJzogb3B0c1snbGF5ZXInXVxuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBDbHVzdGVyaW5nO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy92aXN1YWxpemUvZ2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnLCAnbW9kZWwvQ2x1c3RlcmluZycsICdtb2RlbC9Db3N0RnVuY3Rpb24nLCAnbW9kZWwvSW1hZ2UnLCAnbW9kZWwvSW1hZ2VEYXRhJywgJ21vZGVsL0xlYXJuaW5nUmF0ZScsICdtb2RlbC9QYXJhbWV0ZXJMaXN0JywgJ21vZGVsL1BvaW50MkQnLCAnbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJywgJ21vZGVsL1JhbmRvbUZ1bmN0aW9uJywgJ21vZGVsL1RyYWluUGVyZm9ybWFuY2UnLCAnbW9kZWwvVHJhaW5TdGF0dXMnLCAnYXBpL0J1aWxkQXBpJywgJ2FwaS9Mb2FkQXBpJywgJ2FwaS9UcmFpbkFwaScsICdhcGkvVHVuZUFwaScsICdhcGkvVmlzdWFsaXplQXBpJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9tb2RlbC9DbHVzdGVyUGFyYW1ldGVycycpLCByZXF1aXJlKCcuL21vZGVsL0NsdXN0ZXJpbmcnKSwgcmVxdWlyZSgnLi9tb2RlbC9Db3N0RnVuY3Rpb24nKSwgcmVxdWlyZSgnLi9tb2RlbC9JbWFnZScpLCByZXF1aXJlKCcuL21vZGVsL0ltYWdlRGF0YScpLCByZXF1aXJlKCcuL21vZGVsL0xlYXJuaW5nUmF0ZScpLCByZXF1aXJlKCcuL21vZGVsL1BhcmFtZXRlckxpc3QnKSwgcmVxdWlyZSgnLi9tb2RlbC9Qb2ludDJEJyksIHJlcXVpcmUoJy4vbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJyksIHJlcXVpcmUoJy4vbW9kZWwvUmFuZG9tRnVuY3Rpb24nKSwgcmVxdWlyZSgnLi9tb2RlbC9UcmFpblBlcmZvcm1hbmNlJyksIHJlcXVpcmUoJy4vbW9kZWwvVHJhaW5TdGF0dXMnKSwgcmVxdWlyZSgnLi9hcGkvQnVpbGRBcGknKSwgcmVxdWlyZSgnLi9hcGkvTG9hZEFwaScpLCByZXF1aXJlKCcuL2FwaS9UcmFpbkFwaScpLCByZXF1aXJlKCcuL2FwaS9UdW5lQXBpJyksIHJlcXVpcmUoJy4vYXBpL1Zpc3VhbGl6ZUFwaScpKTtcbiAgfVxufShmdW5jdGlvbiAoQXBpQ2xpZW50LCBDbHVzdGVyUGFyYW1ldGVycywgQ2x1c3RlcmluZywgQ29zdEZ1bmN0aW9uLCBJbWFnZSwgSW1hZ2VEYXRhLCBMZWFybmluZ1JhdGUsIFBhcmFtZXRlckxpc3QsIFBvaW50MkQsIFByb2Nlc3NlZEltYWdlRGF0YSwgUmFuZG9tRnVuY3Rpb24sIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluU3RhdHVzLCBCdWlsZEFwaSwgTG9hZEFwaSwgVHJhaW5BcGksIFR1bmVBcGksIFZpc3VhbGl6ZUFwaSkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIFdlYlVJX3RvX2J1aWxkX3RyYWluX2FuZF90dW5lX2FfQ29udm9sdXRpb25hbF9BdXRvZW5jb2Rlci48YnI+XG4gICAqIFRoZSA8Y29kZT5pbmRleDwvY29kZT4gbW9kdWxlIHByb3ZpZGVzIGFjY2VzcyB0byBjb25zdHJ1Y3RvcnMgZm9yIGFsbCB0aGUgY2xhc3NlcyB3aGljaCBjb21wcmlzZSB0aGUgcHVibGljIEFQSS5cbiAgICogPHA+XG4gICAqIEFuIEFNRCAocmVjb21tZW5kZWQhKSBvciBDb21tb25KUyBhcHBsaWNhdGlvbiB3aWxsIGdlbmVyYWxseSBkbyBzb21ldGhpbmcgZXF1aXZhbGVudCB0byB0aGUgZm9sbG93aW5nOlxuICAgKiA8cHJlPlxuICAgKiB2YXIgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0gcmVxdWlyZSgnaW5kZXgnKTsgLy8gU2VlIG5vdGUgYmVsb3cqLlxuICAgKiB2YXIgeHh4U3ZjID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5YeHhBcGkoKTsgLy8gQWxsb2NhdGUgdGhlIEFQSSBjbGFzcyB3ZSdyZSBnb2luZyB0byB1c2UuXG4gICAqIHZhciB5eXlNb2RlbCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWXl5KCk7IC8vIENvbnN0cnVjdCBhIG1vZGVsIGluc3RhbmNlLlxuICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcbiAgICogLi4uXG4gICAqIHZhciB6enogPSB4eHhTdmMuZG9Tb21ldGhpbmcoeXl5TW9kZWwpOyAvLyBJbnZva2UgdGhlIHNlcnZpY2UuXG4gICAqIC4uLlxuICAgKiA8L3ByZT5cbiAgICogPGVtPipOT1RFOiBGb3IgYSB0b3AtbGV2ZWwgQU1EIHNjcmlwdCwgdXNlIHJlcXVpcmUoWydpbmRleCddLCBmdW5jdGlvbigpey4uLn0pXG4gICAqIGFuZCBwdXQgdGhlIGFwcGxpY2F0aW9uIGxvZ2ljIHdpdGhpbiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uPC9lbT5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogQSBub24tQU1EIGJyb3dzZXIgYXBwbGljYXRpb24gKGRpc2NvdXJhZ2VkKSBtaWdodCBkbyBzb21ldGhpbmcgbGlrZSB0aGlzOlxuICAgKiA8cHJlPlxuICAgKiB2YXIgeHh4U3ZjID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5YeHhBcGkoKTsgLy8gQWxsb2NhdGUgdGhlIEFQSSBjbGFzcyB3ZSdyZSBnb2luZyB0byB1c2UuXG4gICAqIHZhciB5eXkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLll5eSgpOyAvLyBDb25zdHJ1Y3QgYSBtb2RlbCBpbnN0YW5jZS5cbiAgICogeXl5TW9kZWwuc29tZVByb3BlcnR5ID0gJ3NvbWVWYWx1ZSc7XG4gICAqIC4uLlxuICAgKiB2YXIgenp6ID0geHh4U3ZjLmRvU29tZXRoaW5nKHl5eU1vZGVsKTsgLy8gSW52b2tlIHRoZSBzZXJ2aWNlLlxuICAgKiAuLi5cbiAgICogPC9wcmU+XG4gICAqIDwvcD5cbiAgICogQG1vZHVsZSBpbmRleFxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIEFwaUNsaWVudCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTpBcGlDbGllbnR9XG4gICAgICovXG4gICAgQXBpQ2xpZW50OiBBcGlDbGllbnQsXG4gICAgLyoqXG4gICAgICogVGhlIENsdXN0ZXJQYXJhbWV0ZXJzIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfVxuICAgICAqL1xuICAgIENsdXN0ZXJQYXJhbWV0ZXJzOiBDbHVzdGVyUGFyYW1ldGVycyxcbiAgICAvKipcbiAgICAgKiBUaGUgQ2x1c3RlcmluZyBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfVxuICAgICAqL1xuICAgIENsdXN0ZXJpbmc6IENsdXN0ZXJpbmcsXG4gICAgLyoqXG4gICAgICogVGhlIENvc3RGdW5jdGlvbiBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb259XG4gICAgICovXG4gICAgQ29zdEZ1bmN0aW9uOiBDb3N0RnVuY3Rpb24sXG4gICAgICAvKipcbiAgICAgICAqIFRoZSBJbWFnZSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0ltYWdlfVxuICAgICAgICovXG4gICAgICBJbWFnZTogSW1hZ2UsXG4gICAgLyoqXG4gICAgICogVGhlIEltYWdlRGF0YSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICovXG4gICAgSW1hZ2VEYXRhOiBJbWFnZURhdGEsXG4gICAgLyoqXG4gICAgICogVGhlIExlYXJuaW5nUmF0ZSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9MZWFybmluZ1JhdGV9XG4gICAgICovXG4gICAgTGVhcm5pbmdSYXRlOiBMZWFybmluZ1JhdGUsXG4gICAgICAvKipcbiAgICAgICAqIFRoZSBQYXJhbWV0ZXJMaXN0IG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH1cbiAgICAgICAqL1xuICAgICAgUGFyYW1ldGVyTGlzdDogUGFyYW1ldGVyTGlzdCxcbiAgICAvKipcbiAgICAgKiBUaGUgUG9pbnQyRCBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9Qb2ludDJEfVxuICAgICAqL1xuICAgIFBvaW50MkQ6IFBvaW50MkQsXG4gICAgLyoqXG4gICAgICogVGhlIFByb2Nlc3NlZEltYWdlRGF0YSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9XG4gICAgICovXG4gICAgUHJvY2Vzc2VkSW1hZ2VEYXRhOiBQcm9jZXNzZWRJbWFnZURhdGEsXG4gICAgLyoqXG4gICAgICogVGhlIFJhbmRvbUZ1bmN0aW9uIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9ufVxuICAgICAqL1xuICAgIFJhbmRvbUZ1bmN0aW9uOiBSYW5kb21GdW5jdGlvbixcbiAgICAgIC8qKlxuICAgICAgICogVGhlIFRyYWluUGVyZm9ybWFuY2UgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxuICAgICAgICovXG4gICAgICBUcmFpblBlcmZvcm1hbmNlOiBUcmFpblBlcmZvcm1hbmNlLFxuICAgIC8qKlxuICAgICAqIFRoZSBUcmFpblN0YXR1cyBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c31cbiAgICAgKi9cbiAgICBUcmFpblN0YXR1czogVHJhaW5TdGF0dXMsXG4gICAgLyoqXG4gICAgICogVGhlIEJ1aWxkQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL0J1aWxkQXBpfVxuICAgICAqL1xuICAgIEJ1aWxkQXBpOiBCdWlsZEFwaSxcbiAgICAvKipcbiAgICAgKiBUaGUgTG9hZEFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9Mb2FkQXBpfVxuICAgICAqL1xuICAgIExvYWRBcGk6IExvYWRBcGksXG4gICAgLyoqXG4gICAgICogVGhlIFRyYWluQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1RyYWluQXBpfVxuICAgICAqL1xuICAgIFRyYWluQXBpOiBUcmFpbkFwaSxcbiAgICAvKipcbiAgICAgKiBUaGUgVHVuZUFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9UdW5lQXBpfVxuICAgICAqL1xuICAgIFR1bmVBcGk6IFR1bmVBcGksXG4gICAgLyoqXG4gICAgICogVGhlIFZpc3VhbGl6ZUFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl9XG4gICAgICovXG4gICAgVmlzdWFsaXplQXBpOiBWaXN1YWxpemVBcGlcbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMi4zXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyUGFyYW1ldGVycyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgQ2x1c3RlclBhcmFtZXRlcnMgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc1xuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+Q2x1c3RlclBhcmFtZXRlcnM8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9jbHVzdGVycycpKSB7XG4gICAgICAgIG9ialsnbl9jbHVzdGVycyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9jbHVzdGVycyddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaW5pdCcpKSB7XG4gICAgICAgIG9ialsnaW5pdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5pdCddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9pbml0JykpIHtcbiAgICAgICAgb2JqWyduX2luaXQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25faW5pdCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4X2l0ZXInKSkge1xuICAgICAgICBvYmpbJ21heF9pdGVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhfaXRlciddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndG9sJykpIHtcbiAgICAgICAgb2JqWyd0b2wnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3RvbCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncHJlY29tcHV0ZV9kaXN0YW5jZXMnKSkge1xuICAgICAgICBvYmpbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydwcmVjb21wdXRlX2Rpc3RhbmNlcyddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndmVyYm9zZScpKSB7XG4gICAgICAgIG9ialsndmVyYm9zZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndmVyYm9zZSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX3N0YXRlJykpIHtcbiAgICAgICAgb2JqWydyYW5kb21fc3RhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9zdGF0ZSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29weV94JykpIHtcbiAgICAgICAgb2JqWydjb3B5X3gnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NvcHlfeCddLCAnQm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25fam9icycpKSB7XG4gICAgICAgIG9ialsnbl9qb2JzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2pvYnMnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2FsZ29yaXRobScpKSB7XG4gICAgICAgIG9ialsnYWxnb3JpdGhtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhbGdvcml0aG0nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9jbHVzdGVyc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fY2x1c3RlcnMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gaW5pdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2luaXQnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9pbml0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbl9pbml0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1heF9pdGVyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4X2l0ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gdG9sXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsndG9sJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHByZWNvbXB1dGVfZGlzdGFuY2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncHJlY29tcHV0ZV9kaXN0YW5jZXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gdmVyYm9zZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gcmFuZG9tX3N0YXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX3N0YXRlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtCb29sZWFufSBjb3B5X3hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3B5X3gnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9qb2JzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbl9qb2JzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IGFsZ29yaXRobVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2FsZ29yaXRobSddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUG9pbnQyRCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9Qb2ludDJEJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ2x1c3RlcmluZyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qb2ludDJEKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBvaW50MkQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgQ2x1c3RlcmluZyBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvQ2x1c3RlcmluZ1xuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9DbHVzdGVyaW5nXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWluWCcpKSB7XG4gICAgICAgIG9ialsnbWluWCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWluWCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4WCcpKSB7XG4gICAgICAgIG9ialsnbWF4WCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4WCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWluWScpKSB7XG4gICAgICAgIG9ialsnbWluWSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWluWSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4WScpKSB7XG4gICAgICAgIG9ialsnbWF4WSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4WSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbkNsdXN0ZXJzJykpIHtcbiAgICAgICAgb2JqWyduQ2x1c3RlcnMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25DbHVzdGVycyddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncG9pbnRzJykpIHtcbiAgICAgICAgb2JqWydwb2ludHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3BvaW50cyddLCBbUG9pbnQyRF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWluWFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pblgnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWF4WFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heFgnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWluWVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pblknXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWF4WVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heFknXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbkNsdXN0ZXJzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbkNsdXN0ZXJzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1BvaW50MkQ+fSBwb2ludHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydwb2ludHMnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNvc3RGdW5jdGlvbiA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgQ29zdEZ1bmN0aW9uIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9Db3N0RnVuY3Rpb25cbiAgICogQHZlcnNpb24gMS4wLjdcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+Q29zdEZ1bmN0aW9uPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb25cbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+Q29zdEZ1bmN0aW9uPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb259IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbn0gVGhlIHBvcHVsYXRlZCA8Y29kZT5Db3N0RnVuY3Rpb248L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfY29zdF9mdW5jdGlvbicpKSB7XG4gICAgICAgIG9ialsnY2ZfY29zdF9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfY29zdF9mdW5jdGlvbiddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfbWF4X3ZhbCcpKSB7XG4gICAgICAgIG9ialsnY2ZfbWF4X3ZhbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfbWF4X3ZhbCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9maWx0ZXJfc2l6ZScpKSB7XG4gICAgICAgIG9ialsnY2ZfZmlsdGVyX3NpemUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2ZpbHRlcl9zaXplJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2ZpbHRlcl9zaWdtYScpKSB7XG4gICAgICAgIG9ialsnY2ZfZmlsdGVyX3NpZ21hJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9maWx0ZXJfc2lnbWEnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfazEnKSkge1xuICAgICAgICBvYmpbJ2NmX2sxJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9rMSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9rMicpKSB7XG4gICAgICAgIG9ialsnY2ZfazInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2syJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX3dlaWdodHMnKSkge1xuICAgICAgICBvYmpbJ2NmX3dlaWdodHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX3dlaWdodHMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IGNmX2Nvc3RfZnVuY3Rpb25cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9jb3N0X2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfbWF4X3ZhbFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX21heF92YWwnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9maWx0ZXJfc2l6ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2ZpbHRlcl9zaXplJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfZmlsdGVyX3NpZ21hXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfZmlsdGVyX3NpZ21hJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfazFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9rMSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2syXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfazInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGNmX3dlaWdodHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl93ZWlnaHRzJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMi4zXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgSW1hZ2UgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0ltYWdlXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkltYWdlPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9JbWFnZVxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkltYWdlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2V9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+SW1hZ2U8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYnl0ZXN0cmluZycpKSB7XG4gICAgICAgIG9ialsnYnl0ZXN0cmluZyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYnl0ZXN0cmluZyddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaWQnKSkge1xuICAgICAgICBvYmpbJ2lkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpZCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBieXRlc3RyaW5nXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYnl0ZXN0cmluZyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBpZFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lkJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMi4zXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9JbWFnZScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlRGF0YSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZSkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBJbWFnZURhdGEgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0ltYWdlRGF0YVxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5JbWFnZURhdGE8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YVxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5JbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkltYWdlRGF0YTwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1JbWFnZXMnKSkge1xuICAgICAgICBvYmpbJ251bUltYWdlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbnVtSW1hZ2VzJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNYJykpIHtcbiAgICAgICAgb2JqWydyZXNYJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyZXNYJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNZJykpIHtcbiAgICAgICAgb2JqWydyZXNZJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyZXNZJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbWFnZXMnKSkge1xuICAgICAgICBvYmpbJ2ltYWdlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW1hZ2VzJ10sIFtJbWFnZV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbnVtSW1hZ2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbnVtSW1hZ2VzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJlc1hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNYJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJlc1lcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNZJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW1hZ2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnaW1hZ2VzJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjAuN1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMi4zXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5MZWFybmluZ1JhdGUgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIExlYXJuaW5nUmF0ZSBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvTGVhcm5pbmdSYXRlXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9MZWFybmluZ1JhdGV9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+TGVhcm5pbmdSYXRlPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZScpKSB7XG4gICAgICAgIG9ialsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZGVjYXlfc3RlcHMnKSkge1xuICAgICAgICBvYmpbJ2xyX2RlY2F5X3N0ZXBzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9kZWNheV9zdGVwcyddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9kZWNheV9yYXRlJykpIHtcbiAgICAgICAgb2JqWydscl9kZWNheV9yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9kZWNheV9yYXRlJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3N0YWlyY2FzZScpKSB7XG4gICAgICAgIG9ialsnbHJfc3RhaXJjYXNlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9zdGFpcmNhc2UnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2JvdW5kYXJpZXMnKSkge1xuICAgICAgICBvYmpbJ2xyX2JvdW5kYXJpZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2JvdW5kYXJpZXMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl92YWx1ZXMnKSkge1xuICAgICAgICBvYmpbJ2xyX3ZhbHVlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfdmFsdWVzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZW5kX2xlYXJuaW5nX3JhdGUnKSkge1xuICAgICAgICBvYmpbJ2xyX2VuZF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9wb3dlcicpKSB7XG4gICAgICAgIG9ialsnbHJfcG93ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX3Bvd2VyJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2N5Y2xlJykpIHtcbiAgICAgICAgb2JqWydscl9jeWNsZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfY3ljbGUnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbGVhcm5pbmdfcmF0ZV9mdW5jdGlvblxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9pbml0aWFsX2xlYXJuaW5nX3JhdGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9kZWNheV9zdGVwc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2RlY2F5X3N0ZXBzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZGVjYXlfcmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2RlY2F5X3JhdGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbHJfc3RhaXJjYXNlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfc3RhaXJjYXNlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBscl9ib3VuZGFyaWVzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfYm91bmRhcmllcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbHJfdmFsdWVzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfdmFsdWVzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZW5kX2xlYXJuaW5nX3JhdGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX3Bvd2VyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfcG93ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbHJfY3ljbGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9jeWNsZSddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Db3N0RnVuY3Rpb24nLCAnbW9kZWwvTGVhcm5pbmdSYXRlJywgJ21vZGVsL1JhbmRvbUZ1bmN0aW9uJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vQ29zdEZ1bmN0aW9uJyksIHJlcXVpcmUoJy4vTGVhcm5pbmdSYXRlJyksIHJlcXVpcmUoJy4vUmFuZG9tRnVuY3Rpb24nKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBhcmFtZXRlckxpc3QgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ29zdEZ1bmN0aW9uLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5MZWFybmluZ1JhdGUsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlJhbmRvbUZ1bmN0aW9uKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50LCBDb3N0RnVuY3Rpb24sIExlYXJuaW5nUmF0ZSwgUmFuZG9tRnVuY3Rpb24pIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgUGFyYW1ldGVyTGlzdCBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvUGFyYW1ldGVyTGlzdFxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0XG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlBhcmFtZXRlckxpc3Q8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbnB1dF9zaGFwZScpKSB7XG4gICAgICAgIG9ialsnaW5wdXRfc2hhcGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2lucHV0X3NoYXBlJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbnVtYmVyX29mX3N0YWNrcycpKSB7XG4gICAgICAgIG9ialsnbnVtYmVyX29mX3N0YWNrcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbnVtYmVyX29mX3N0YWNrcyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2ZpbHRlcl9zaXplcycpKSB7XG4gICAgICAgIG9ialsnZmlsdGVyX3NpemVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydmaWx0ZXJfc2l6ZXMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtaXJyb3Jfd2VpZ2h0cycpKSB7XG4gICAgICAgIG9ialsnbWlycm9yX3dlaWdodHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21pcnJvcl93ZWlnaHRzJ10sIFsnQm9vbGVhbiddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhY3RpdmF0aW9uX2Z1bmN0aW9uJykpIHtcbiAgICAgICAgb2JqWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10sIFsnU3RyaW5nJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2JhdGNoX3NpemUnKSkge1xuICAgICAgICBvYmpbJ2JhdGNoX3NpemUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2JhdGNoX3NpemUnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9lcG9jaHMnKSkge1xuICAgICAgICBvYmpbJ25fZXBvY2hzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2Vwb2NocyddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd1c2VfdGVuc29yYm9hcmQnKSkge1xuICAgICAgICBvYmpbJ3VzZV90ZW5zb3Jib2FyZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndXNlX3RlbnNvcmJvYXJkJ10sICdCb29sZWFuJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndmVyYm9zZScpKSB7XG4gICAgICAgIG9ialsndmVyYm9zZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndmVyYm9zZSddLCAnQm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGVhcm5pbmdfcmF0ZV9kaWN0JykpIHtcbiAgICAgICAgICAgIG9ialsnbGVhcm5pbmdfcmF0ZV9kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsZWFybmluZ19yYXRlX2RpY3QnXSwgW0xlYXJuaW5nUmF0ZV0pO1xuICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdF9mdW5jdGlvbl9kaWN0JykpIHtcbiAgICAgICAgICAgIG9ialsnY29zdF9mdW5jdGlvbl9kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSwgW0Nvc3RGdW5jdGlvbl0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ29wdGltaXplcicpKSB7XG4gICAgICAgIG9ialsnb3B0aW1pemVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydvcHRpbWl6ZXInXSwgWydTdHJpbmcnXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbW9tZW50dW0nKSkge1xuICAgICAgICBvYmpbJ21vbWVudHVtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtb21lbnR1bSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV93ZWlnaHRzX2RpY3QnKSkge1xuICAgICAgICAgICAgb2JqWydyYW5kb21fd2VpZ2h0c19kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fd2VpZ2h0c19kaWN0J10sIFtSYW5kb21GdW5jdGlvbl0pO1xuICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX2JpYXNlc19kaWN0JykpIHtcbiAgICAgICAgICAgIG9ialsncmFuZG9tX2JpYXNlc19kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fYmlhc2VzX2RpY3QnXSwgW1JhbmRvbUZ1bmN0aW9uXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2Vzc2lvbl9zYXZlcl9wYXRoJykpIHtcbiAgICAgICAgb2JqWydzZXNzaW9uX3NhdmVyX3BhdGgnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbG9hZF9wcmV2X3Nlc3Npb24nKSkge1xuICAgICAgICBvYmpbJ2xvYWRfcHJldl9zZXNzaW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsb2FkX3ByZXZfc2Vzc2lvbiddLCAnQm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbicpKSB7XG4gICAgICAgIG9ialsnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzZXNzaW9uX3NhdmVfZHVyYXRpb24nXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbnVtX3Rlc3RfcGljdHVyZXMnKSkge1xuICAgICAgICBvYmpbJ251bV90ZXN0X3BpY3R1cmVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydudW1fdGVzdF9waWN0dXJlcyddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBpbnB1dF9zaGFwZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lucHV0X3NoYXBlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBudW1iZXJfb2Zfc3RhY2tzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbnVtYmVyX29mX3N0YWNrcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gZmlsdGVyX3NpemVzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnZmlsdGVyX3NpemVzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48Qm9vbGVhbj59IG1pcnJvcl93ZWlnaHRzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWlycm9yX3dlaWdodHMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxTdHJpbmc+fSBhY3RpdmF0aW9uX2Z1bmN0aW9uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYWN0aXZhdGlvbl9mdW5jdGlvbiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGJhdGNoX3NpemVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydiYXRjaF9zaXplJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbl9lcG9jaHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyduX2Vwb2NocyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gdXNlX3RlbnNvcmJvYXJkXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsndXNlX3RlbnNvcmJvYXJkJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtCb29sZWFufSB2ZXJib3NlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsndmVyYm9zZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9MZWFybmluZ1JhdGU+fSBsZWFybmluZ19yYXRlX2RpY3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydsZWFybmluZ19yYXRlX2RpY3QnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvQ29zdEZ1bmN0aW9uPn0gY29zdF9mdW5jdGlvbl9kaWN0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY29zdF9mdW5jdGlvbl9kaWN0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gb3B0aW1pemVyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnb3B0aW1pemVyJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbW9tZW50dW1cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtb21lbnR1bSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbj59IHJhbmRvbV93ZWlnaHRzX2RpY3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fd2VpZ2h0c19kaWN0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9uPn0gcmFuZG9tX2JpYXNlc19kaWN0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX2JpYXNlc19kaWN0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHNlc3Npb25fc2F2ZXJfcGF0aFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gbG9hZF9wcmV2X3Nlc3Npb25cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydsb2FkX3ByZXZfc2Vzc2lvbiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHNlc3Npb25fc2F2ZV9kdXJhdGlvblxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG51bV90ZXN0X3BpY3R1cmVzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbnVtX3Rlc3RfcGljdHVyZXMnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBvaW50MkQgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIFBvaW50MkQgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL1BvaW50MkRcbiAgICogQHZlcnNpb24gMS4wLjdcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UG9pbnQyRDwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvUG9pbnQyRFxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UG9pbnQyRDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gVGhlIHBvcHVsYXRlZCA8Y29kZT5Qb2ludDJEPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3gnKSkge1xuICAgICAgICBvYmpbJ3gnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3gnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3knKSkge1xuICAgICAgICBvYmpbJ3knXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3knXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NsdXN0ZXInKSkge1xuICAgICAgICBvYmpbJ2NsdXN0ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NsdXN0ZXInXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0geFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3gnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0geVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3knXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gY2x1c3RlclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NsdXN0ZXInXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0ltYWdlJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL0ltYWdlJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIEltYWdlKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIFByb2Nlc3NlZEltYWdlRGF0YSBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhXG4gICAqIEB2ZXJzaW9uIDEuMC43XG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5Qcm9jZXNzZWRJbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbnB1dExheWVyJykpIHtcbiAgICAgICAgb2JqWydpbnB1dExheWVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpbnB1dExheWVyJ10sIFtJbWFnZV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xhdGVudExheWVyJykpIHtcbiAgICAgICAgb2JqWydsYXRlbnRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGF0ZW50TGF5ZXInXSwgW0ltYWdlXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnb3V0cHV0TGF5ZXInKSkge1xuICAgICAgICBvYmpbJ291dHB1dExheWVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydvdXRwdXRMYXllciddLCBbSW1hZ2VdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW5wdXRMYXllclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lucHV0TGF5ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+fSBsYXRlbnRMYXllclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xhdGVudExheWVyJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gb3V0cHV0TGF5ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydvdXRwdXRMYXllciddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUmFuZG9tRnVuY3Rpb24gPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIFJhbmRvbUZ1bmN0aW9uIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9SYW5kb21GdW5jdGlvblxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5SYW5kb21GdW5jdGlvbjwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb25cbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlJhbmRvbUZ1bmN0aW9uPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbn0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb259IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UmFuZG9tRnVuY3Rpb248L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX2Z1bmN0aW9uJykpIHtcbiAgICAgICAgb2JqWydyYW5kb21fZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9mdW5jdGlvbiddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYWxwaGEnKSkge1xuICAgICAgICBvYmpbJ2FscGhhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhbHBoYSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdiZXRhJykpIHtcbiAgICAgICAgb2JqWydiZXRhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydiZXRhJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21lYW4nKSkge1xuICAgICAgICBvYmpbJ21lYW4nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21lYW4nXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc3RkZGV2JykpIHtcbiAgICAgICAgb2JqWydzdGRkZXYnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3N0ZGRldiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsYW0nKSkge1xuICAgICAgICBvYmpbJ2xhbSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGFtJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pbnZhbCcpKSB7XG4gICAgICAgIG9ialsnbWludmFsJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtaW52YWwnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4dmFsJykpIHtcbiAgICAgICAgb2JqWydtYXh2YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21heHZhbCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzZWVkJykpIHtcbiAgICAgICAgb2JqWydzZWVkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzZWVkJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gcmFuZG9tX2Z1bmN0aW9uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gYWxwaGFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydhbHBoYSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGJldGFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydiZXRhJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbWVhblxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21lYW4nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBzdGRkZXZcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydzdGRkZXYnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBsYW1cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydsYW0nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtaW52YWxcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaW52YWwnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtYXh2YWxcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtYXh2YWwnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBzZWVkXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc2VlZCddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4wLjdcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjIuM1xuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgVHJhaW5QZXJmb3JtYW5jZSBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvVHJhaW5QZXJmb3JtYW5jZVxuICAgKiBAdmVyc2lvbiAxLjAuN1xuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlRyYWluUGVyZm9ybWFuY2U8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbW9kZWxfaWQnKSkge1xuICAgICAgICBvYmpbJ21vZGVsX2lkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtb2RlbF9pZCddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdCcpKSB7XG4gICAgICAgIG9ialsnY29zdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjdXJyZW50TGVhcm5pbmdSYXRlJykpIHtcbiAgICAgICAgb2JqWydjdXJyZW50TGVhcm5pbmdSYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjdXJyZW50TGVhcm5pbmdSYXRlJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbW9kZWxfaWRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtb2RlbF9pZCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNvc3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3N0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY3VycmVudExlYXJuaW5nUmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMC43XG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4yLjNcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluU3RhdHVzID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuICAvKipcbiAgICogRW51bSBjbGFzcyBUcmFpblN0YXR1cy5cbiAgICogQGVudW0ge31cbiAgICogQHJlYWRvbmx5XG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiB2YWx1ZTogXCJzdGFydFwiXG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgXCJzdGFydFwiOiBcInN0YXJ0XCIsXG4gICAgLyoqXG4gICAgICogdmFsdWU6IFwicGF1c2VcIlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFwicGF1c2VcIjogXCJwYXVzZVwiLFxuICAgIC8qKlxuICAgICAqIHZhbHVlOiBcInN0b3BcIlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFwic3RvcFwiOiBcInN0b3BcIixcbiAgICAvKipcbiAgICAgKiB2YWx1ZTogXCJyZXN1bWVcIlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFwicmVzdW1lXCI6IFwicmVzdW1lXCIgIH07XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSA8Y29kZT5UcmFpblN0YXR1czwvY29kZT4gZW51bSB2YWx1ZSBmcm9tIGEgSmF2YXNjcmlwdCBvYmplY3QgbmFtZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG5hbWUgb2YgdGhlIGVudW0gdmFsdWUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gVGhlIGVudW0gPGNvZGU+VHJhaW5TdGF0dXM8L2NvZGU+IHZhbHVlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qXHJcbmNoZWNrIGlmIGNsaWVudCBhbmQgc2VydmVyIGFyZSBydW5uaW5nIGNvcnJlY3RseVxyXG4gKi9cclxudmFyIENvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHJlcXVpcmUoJ2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXInKTtcclxuXHJcbnZhciBidWlsZEFwaSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuQnVpbGRBcGkoKTtcclxuXHJcbi8vIGNoZWNrIEFQSSBmdW5jdGlvbmFsaXR5XHJcbmZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBUEkgY2FsbGVkIHN1Y2Nlc3NmdWxseS4nKTtcclxuICAgIH1cclxufVxyXG5cclxuYnVpbGRBcGkuZ2V0SW5wdXRTaGFwZShbXSwgY2FsbGJhY2spO1xyXG5cclxuXHJcbi8qXHJcbkNvbnZvbHV0aW9uYWwgQXV0byBFbmNvZGVyIHRvcG9sb2d5XHJcbiAqL1xyXG5cclxuXHJcbi8qXHJcbkhlbHBlciBmdW5jdGlvbnNcclxuICovXHJcbmZ1bmN0aW9uIGNvbnZlcnRUb0NhbWVsQ2FzZShpbnB1dFN0cmluZykge1xyXG4gICAgU3RyaW5nLnByb3RvdHlwZS5jYXBpdGFsaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdGhpcy5zbGljZSgxKTtcclxuICAgIH07XHJcbiAgICB2YXIgb3V0cHV0U3RyaW5nID0gXCJcIjtcclxuICAgIHZhciBhcnJheSA9IGlucHV0U3RyaW5nLnNwbGl0KCcgJyk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgb3V0cHV0U3RyaW5nICs9IGFycmF5W2ldLmNhcGl0YWxpemUoKTtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKG91dHB1dFN0cmluZyk7XHJcbiAgICByZXR1cm4gb3V0cHV0U3RyaW5nO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkM09wdGlvbkxpc3QoaWQpIHtcclxuICAgIHZhciBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkub3B0aW9uc1tkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkuc2VsZWN0ZWRJbmRleF0udmFsdWU7XHJcbiAgICBzd2l0Y2ggKHNlbGVjdGlvbikge1xyXG4gICAgICAgIGNhc2UgXCJ0cnVlXCI6XHJcbiAgICAgICAgICAgIHJldHVybiBbdHJ1ZV07XHJcbiAgICAgICAgY2FzZSBcImZhbHNlXCI6XHJcbiAgICAgICAgICAgIHJldHVybiBbZmFsc2VdO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIHJldHVybiBbdHJ1ZSwgZmFsc2VdXHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlSW5wdXRMaXN0KGlkLCBjb252ZXJ0VG9OdW1iZXIpIHtcclxuICAgIHZhciBpbnB1dFRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkudmFsdWUudHJpbSgpO1xyXG4gICAgaWYgKGlucHV0VGV4dC5zdGFydHNXaXRoKCdbJykpIHtcclxuICAgICAgICAvLyBwYXJzZSBhcyBsaXN0XHJcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoaW5wdXRUZXh0KTtcclxuICAgIH0gZWxzZSBpZiAoaW5wdXRUZXh0LnN0YXJ0c1dpdGgoJygnKSkge1xyXG4gICAgICAgIC8vIHBhcnNlIGFzIHR1cGxlOlxyXG4gICAgICAgIC8vIGNvZGUgZnJvbVxyXG4gICAgICAgIC8vIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzMxMjMyOTUyL2hvdy10by1leHRyYWN0LXR1cGxlcy1zdHJpbmctaW50by1kYXRhLXN0cnVjdHVyZVxyXG4gICAgICAgIHZhciB0dXBsZSA9IEpTT04ucGFyc2UoXCJbXCIgKyBpbnB1dFRleHQucmVwbGFjZSgvXFwoL2csIFwiW1wiKS5yZXBsYWNlKC9cXCkvZywgXCJdXCIpICsgXCJdXCIpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHR1cGxlKTtcclxuICAgICAgICAvLyBpdGVyYXRlIG92ZXIgcmFuZ2VcclxuICAgICAgICB2YXIgcmFuZ2UgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBpID0gdHVwbGVbMF1bMF07IGkgPCB0dXBsZVswXVsxXTsgaSArPSB0dXBsZVswXVsyXSkge1xyXG4gICAgICAgICAgICByYW5nZS5wdXNoKGkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmFuZ2U7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vcGFyc2UgYXMgc2luZ2xlIGVudHJ5XHJcbiAgICAgICAgaWYgKGNvbnZlcnRUb051bWJlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gW051bWJlcihpbnB1dFRleHQpXTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gW2lucHV0VGV4dF1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkQWN0aXZhdGlvbkZ1bmN0aW9ucygpIHtcclxuICAgIHZhciBzZWxlY3RlZEZ1bmN0aW9ucyA9IFtdO1xyXG4gICAgdmFyIHRhYmxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhY3RpdmF0aW9uRnVuY3Rpb25UYWJsZVwiKTtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwgY2hlY2tib3hlczpcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFibGUucm93c1syXS5jZWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmICh0YWJsZS5yb3dzWzJdLmNlbGxzW2ldLmNoaWxkcmVuWzBdLmNoZWNrZWQpIHtcclxuICAgICAgICAgICAgc2VsZWN0ZWRGdW5jdGlvbnMucHVzaCh0YWJsZS5yb3dzWzBdLmNlbGxzW2ldLnRleHRDb250ZW50KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZyhzZWxlY3RlZEZ1bmN0aW9ucyk7XHJcbiAgICByZXR1cm4gc2VsZWN0ZWRGdW5jdGlvbnM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRMZWFybmluZ1JhdGVGdW5jdGlvbnMoKSB7XHJcbiAgICB2YXIgc2VsZWN0ZWRGdW5jdGlvbnMgPSBbXTtcclxuICAgIHZhciB0YWJsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGVhcm5pbmdSYXRlRnVuY3Rpb25UYWJsZVwiKTtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwgY2hlY2tib3hlczpcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFibGUucm93c1syXS5jZWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmICh0YWJsZS5yb3dzWzJdLmNlbGxzW2ldLmNoaWxkcmVuWzBdLmNoZWNrZWQpIHtcclxuICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBkaWN0OlxyXG4gICAgICAgICAgICB2YXIgbGVhcm5pbmdSYXRlRGljdCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuTGVhcm5pbmdSYXRlKCk7XHJcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSB0YWJsZS5yb3dzWzBdLmNlbGxzW2ldLnRleHRDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgLy8gYWRkIGFkZGl0aW9uYWwgcGFyYW1ldGVyczpcclxuICAgICAgICAgICAgc3dpdGNoIChmdW5jdGlvbk5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzdGF0aWNcIjpcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxlYXJuaW5nX3JhdGVfZnVuY3Rpb24gPSBcInN0YXRpY1wiO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfaW5pdGlhbF9sZWFybmluZ19yYXRlID0gcGFyc2VJbnB1dExpc3QoXCJsckluaXRpYWxMZWFybmluZ1JhdGVTdGF0aWNcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZXhwb25lbnRpYWwgZGVjYXlcIjpcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxlYXJuaW5nX3JhdGVfZnVuY3Rpb24gPSBcImV4cG9uZW50aWFsX2RlY2F5XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9pbml0aWFsX2xlYXJuaW5nX3JhdGUgPSBwYXJzZUlucHV0TGlzdChcImxySW5pdGlhbExlYXJuaW5nUmF0ZUV4cERlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfc3RlcHMgPSBwYXJzZUlucHV0TGlzdChcImxyRGVjYXlTdGVwc0V4cERlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfcmF0ZSA9IHBhcnNlSW5wdXRMaXN0KFwibHJEZWNheVJhdGVFeHBEZWNheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX3N0YWlyY2FzZSA9IHJlYWQzT3B0aW9uTGlzdChcImxyU3RhaXJjYXNlRXhwRGVjYXlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiaW52ZXJzZSB0aW1lIGRlY2F5XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5sZWFybmluZ19yYXRlX2Z1bmN0aW9uID0gXCJpbnZlcnNlX3RpbWVfZGVjYXlcIjtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSA9IHBhcnNlSW5wdXRMaXN0KFwibHJJbml0aWFsTGVhcm5pbmdSYXRlSW52VGltZURlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfc3RlcHMgPSBwYXJzZUlucHV0TGlzdChcImxyRGVjYXlTdGVwc0ludlRpbWVEZWNheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX2RlY2F5X3JhdGUgPSBwYXJzZUlucHV0TGlzdChcImxyRGVjYXlSYXRlSW52VGltZURlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfc3RhaXJjYXNlID0gcmVhZDNPcHRpb25MaXN0KFwibHJTdGFpcmNhc2VJbnZUaW1lRGVjYXlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwibmF0dXJhbCBleHAgZGVjYXlcIjpcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxlYXJuaW5nX3JhdGVfZnVuY3Rpb24gPSBcIm5hdHVyYWxfZXhwX2RlY2F5XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5scl9pbml0aWFsX2xlYXJuaW5nX3JhdGUgPSBwYXJzZUlucHV0TGlzdChcImxySW5pdGlhbExlYXJuaW5nUmF0ZU5hdEV4cERlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfc3RlcHMgPSBwYXJzZUlucHV0TGlzdChcImxyRGVjYXlTdGVwc05hdEV4cERlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfcmF0ZSA9IHBhcnNlSW5wdXRMaXN0KFwibHJEZWNheVJhdGVOYXRFeHBEZWNheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX3N0YWlyY2FzZSA9IHJlYWQzT3B0aW9uTGlzdChcImxyU3RhaXJjYXNlTmF0RXhwRGVjYXlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicGllY2V3aXNlIGNvbnN0YW50XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgbGVhcm5pbmdSYXRlRGljdC5sZWFybmluZ19yYXRlX2Z1bmN0aW9uID0gXCJwaWVjZXdpc2VfY29uc3RhbnRcIjtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX2JvdW5kYXJpZXMgPSBwYXJzZUlucHV0TGlzdChcImxyQm91bmRhcmllc1BpZWNld2lzZUNvbnN0YW50XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfdmFsdWVzID0gcGFyc2VJbnB1dExpc3QoXCJsclZhbHVlc1BpZWNld2lzZUNvbnN0YW50XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInBvbHlub21pYWwgZGVjYXlcIjpcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxlYXJuaW5nX3JhdGVfZnVuY3Rpb24gPSBcInBvbHlub21pYWxfZGVjYXlcIjtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSA9IHBhcnNlSW5wdXRMaXN0KFwibHJJbml0aWFsTGVhcm5pbmdSYXRlUG9seW5vbURlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfc3RlcHMgPSBwYXJzZUlucHV0TGlzdChcImxyRGVjYXlTdGVwc1BvbHlub21EZWNheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX2VuZF9sZWFybmluZ19yYXRlID0gcGFyc2VJbnB1dExpc3QoXCJsckVuZExlYXJuaW5nUmF0ZVBvbHlub21EZWNheVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVEaWN0LmxyX3Bvd2VyID0gcGFyc2VJbnB1dExpc3QoXCJsclBvd2VyUG9seW5vbURlY2F5XCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfY3ljbGUgPSByZWFkM09wdGlvbkxpc3QoXCJsckN5Y2xlUG9seW5vbURlY2F5XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBhZGQgZGljdCB0byBsaXN0XHJcbiAgICAgICAgICAgIHNlbGVjdGVkRnVuY3Rpb25zLnB1c2gobGVhcm5pbmdSYXRlRGljdCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coc2VsZWN0ZWRGdW5jdGlvbnMpO1xyXG4gICAgcmV0dXJuIHNlbGVjdGVkRnVuY3Rpb25zO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkT3B0aW1pemVyRnVuY3Rpb25zKCkge1xyXG4gICAgdmFyIHNlbGVjdGVkRnVuY3Rpb25zID0gW107XHJcbiAgICB2YXIgdGFibGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm9wdGltaXplclRhYmxlXCIpO1xyXG4gICAgLy8gaXRlcmF0ZSBvdmVyIGFsbCBjaGVja2JveGVzOlxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YWJsZS5yb3dzWzJdLmNlbGxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKHRhYmxlLnJvd3NbMl0uY2VsbHNbaV0uY2hpbGRyZW5bMF0uY2hlY2tlZCkge1xyXG4gICAgICAgICAgICBzZWxlY3RlZEZ1bmN0aW9ucy5wdXNoKGNvbnZlcnRUb0NhbWVsQ2FzZSh0YWJsZS5yb3dzWzBdLmNlbGxzW2ldLnRleHRDb250ZW50KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coc2VsZWN0ZWRGdW5jdGlvbnMpO1xyXG4gICAgcmV0dXJuIHNlbGVjdGVkRnVuY3Rpb25zO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkQ29zdEZ1bmN0aW9ucygpIHtcclxuICAgIHZhciBzZWxlY3RlZEZ1bmN0aW9ucyA9IFtdO1xyXG4gICAgdmFyIHRhYmxlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb3N0RnVuY3Rpb25UYWJsZVwiKTtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwgY2hlY2tib3hlczpcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFibGUucm93c1syXS5jZWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmICh0YWJsZS5yb3dzWzJdLmNlbGxzW2ldLmNoaWxkcmVuWzBdLmNoZWNrZWQpIHtcclxuICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBkaWN0OlxyXG4gICAgICAgICAgICB2YXIgY29zdEZ1bmN0aW9uRGljdCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ29zdEZ1bmN0aW9uKCk7XHJcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSB0YWJsZS5yb3dzWzBdLmNlbGxzW2ldLnRleHRDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgLy8gYWRkIGFkZGl0aW9uYWwgcGFyYW1ldGVyczpcclxuICAgICAgICAgICAgc3dpdGNoIChmdW5jdGlvbk5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJzcXVhcmVkIHBpeGVsIGRpc3RhbmNlXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgY29zdEZ1bmN0aW9uRGljdC5jZl9jb3N0X2Z1bmN0aW9uID0gXCJzcXVhcmVkX3BpeGVsX2Rpc3RhbmNlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwicGl4ZWwgZGlzdGFuY2VcIjpcclxuICAgICAgICAgICAgICAgICAgICBjb3N0RnVuY3Rpb25EaWN0LmNmX2Nvc3RfZnVuY3Rpb24gPSBcInBpeGVsX2Rpc3RhbmNlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAvLyB0byBiZSBjb250aW51ZWQuLi5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gYWRkIGRpY3QgdG8gbGlzdFxyXG4gICAgICAgICAgICBzZWxlY3RlZEZ1bmN0aW9ucy5wdXNoKGNvc3RGdW5jdGlvbkRpY3QpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKHNlbGVjdGVkRnVuY3Rpb25zKTtcclxuICAgIHJldHVybiBzZWxlY3RlZEZ1bmN0aW9ucztcclxufVxyXG5cclxuZnVuY3Rpb24gcmVhZFJhbmRvbUZ1bmN0aW9ucyhpZCwgcHJlZml4KSB7XHJcbiAgICB2YXIgc2VsZWN0ZWRGdW5jdGlvbnMgPSBbXTtcclxuICAgIHZhciB0YWJsZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcclxuICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwgY2hlY2tib3hlczpcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFibGUucm93c1syXS5jZWxscy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGlmICh0YWJsZS5yb3dzWzJdLmNlbGxzW2ldLmNoaWxkcmVuWzBdLmNoZWNrZWQpIHtcclxuICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBkaWN0OlxyXG4gICAgICAgICAgICB2YXIgcmFuZG9tRnVuY3Rpb24gPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlJhbmRvbUZ1bmN0aW9uKCk7XHJcbiAgICAgICAgICAgIHZhciBmdW5jdGlvbk5hbWUgPSB0YWJsZS5yb3dzWzBdLmNlbGxzW2ldLnRleHRDb250ZW50O1xyXG5cclxuICAgICAgICAgICAgLy8gYWRkIGFkZGl0aW9uYWwgcGFyYW1ldGVyczpcclxuICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24ucmFuZG9tX2Z1bmN0aW9uID0gZnVuY3Rpb25OYW1lO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGZ1bmN0aW9uTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInplcm9zXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFwiZ2FtbWFcIjpcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5hbHBoYSA9IHBhcnNlSW5wdXRMaXN0KHByZWZpeCArIFwiR2FtbWFBbHBoYVwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5iZXRhID0gcGFyc2VJbnB1dExpc3QocHJlZml4ICsgXCJHYW1tYUJldGFcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24uc2VlZCA9IHBhcnNlSW5wdXRMaXN0KHByZWZpeCArIFwiR2FtbWFTZWVkXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcIm5vcm1hbFwiOlxyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbUZ1bmN0aW9uLm1lYW4gPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIk5vcm1hbE1lYW5cIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24uc3RkZGV2ID0gcGFyc2VJbnB1dExpc3QocHJlZml4ICsgXCJOb3JtYWxTdGRkZXZcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24uc2VlZCA9IHBhcnNlSW5wdXRMaXN0KHByZWZpeCArIFwiTm9ybWFsU2VlZFwiLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgXCJwb2lzc29uXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24ubGFtID0gcGFyc2VJbnB1dExpc3QocHJlZml4ICsgXCJQb2lzc29uTGFtXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbUZ1bmN0aW9uLnNlZWQgPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIlBvaXNzb25TZWVkXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBcInVuaWZvcm1cIjpcclxuICAgICAgICAgICAgICAgICAgICByYW5kb21GdW5jdGlvbi5taW52YWwgPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIlVuaWZvcm1NaW52YWxcIiwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmFuZG9tRnVuY3Rpb24ubWF4dmFsID0gcGFyc2VJbnB1dExpc3QocHJlZml4ICsgXCJVbmlmb3JtTWF4dmFsXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJhbmRvbUZ1bmN0aW9uLnNlZWQgPSBwYXJzZUlucHV0TGlzdChwcmVmaXggKyBcIlVuaWZvcm1TZWVkXCIsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBhZGQgZGljdCB0byBsaXN0XHJcbiAgICAgICAgICAgIHNlbGVjdGVkRnVuY3Rpb25zLnB1c2gocmFuZG9tRnVuY3Rpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKHNlbGVjdGVkRnVuY3Rpb25zKTtcclxuICAgIHJldHVybiBzZWxlY3RlZEZ1bmN0aW9ucztcclxufVxyXG5cclxuZnVuY3Rpb24gcmVhZExlYXJuaW5nUGFyYW1ldGVyKCkge1xyXG5cclxuICAgIHZhciBpbnB1dFBhcmFtZXRlckxpc3QgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBhcmFtZXRlckxpc3QoKTtcclxuICAgIC8vIHJlYWQgZ2VuZXJhbCBwYXJhbWV0ZXJzOlxyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LnVzZV90ZW5zb3Jib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidXNlVGVuc29yYm9hcmRcIikuY2hlY2tlZDtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC52ZXJib3NlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ2ZXJib3NlXCIpLmNoZWNrZWQ7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3Quc2Vzc2lvbl9zYXZlcl9wYXRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZXNzaW9uU2F2ZXJQYXRoXCIpLnZhbHVlO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LnNlc3Npb25fc2F2ZV9kdXJhdGlvbiA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZXNzaW9uU2F2ZUR1cmF0aW9uXCIpLnZhbHVlKV07XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QubnVtX3Rlc3RfcGljdHVyZXMgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibnVtVGVzdFBpY3R1cmVzXCIpLnZhbHVlKV07XHJcblxyXG5cclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5taXJyb3Jfd2VpZ2h0cyA9IHJlYWQzT3B0aW9uTGlzdChcIm1pcnJvcldlaWdodHNcIik7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QuYmF0Y2hfc2l6ZSA9IHBhcnNlSW5wdXRMaXN0KFwiYmF0Y2hTaXplXCIsIHRydWUpO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0Lm5fZXBvY2hzID0gcGFyc2VJbnB1dExpc3QoXCJuRXBvY2hzXCIsIHRydWUpO1xyXG5cclxuICAgIC8vIHJlYWQgZnVuY3Rpb25zOlxyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LmFjdGl2YXRpb25fZnVuY3Rpb24gPSByZWFkQWN0aXZhdGlvbkZ1bmN0aW9ucygpO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LmxlYXJuaW5nX3JhdGVfZGljdCA9IHJlYWRMZWFybmluZ1JhdGVGdW5jdGlvbnMoKTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5vcHRpbWl6ZXIgPSByZWFkT3B0aW1pemVyRnVuY3Rpb25zKCk7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QubW9tZW50dW0gPSBwYXJzZUlucHV0TGlzdChcIk1vbWVudHVtXCIsIHRydWUpO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LmNvc3RfZnVuY3Rpb25fZGljdCA9IHJlYWRDb3N0RnVuY3Rpb25zKCk7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QucmFuZG9tX3dlaWdodHNfZGljdCA9IHJlYWRSYW5kb21GdW5jdGlvbnMoXCJyYW5kb21GdW5jdGlvbnNGb3JXZWlnaHRzVGFibGVcIiwgXCJyd1wiKTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5yYW5kb21fYmlhc2VzX2RpY3QgPSByZWFkUmFuZG9tRnVuY3Rpb25zKFwicmFuZG9tRnVuY3Rpb25zRm9yQmlhc2VzVGFibGVcIiwgXCJyYlwiKTtcclxuXHJcbiAgICByZXR1cm4gaW5wdXRQYXJhbWV0ZXJMaXN0O1xyXG59XHJcblxyXG4vLyAvLyBnZXQgaW5wdXQgKG91dHB1dCkgZGltZW5zaW9uc1xyXG4vLyBmdW5jdGlvbiBnZXRJbnB1dERpbWVuc2lvbnMoKSB7XHJcbi8vXHJcbi8vXHJcbi8vICAgICBmdW5jdGlvbiBpbnB1dFNoYXBlQ2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbi8vICAgICAgICAgaWYgKGVycm9yKSB7XHJcbi8vICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4vLyAgICAgICAgIH0gZWxzZSB7XHJcbi8vICAgICAgICAgICAgIC8vY29uc29sZS5sb2coJ0FQSSBjYWxsZWQgc3VjY2Vzc2Z1bGx5LicpO1xyXG4vLyAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbi8vXHJcbi8vXHJcbi8vICAgICAgICAgICAgIC8vdXBkYXRlIGlucHV0IHNoYXBlOlxyXG4vLyAgICAgICAgICAgICBpbnB1dFNoYXBlID0gZGF0YTtcclxuLy9cclxuLy8gICAgICAgICAgICAgLy8gYWRkIHBsYWNlaG9sZGVyIGZvciBmaXJzdCBkaW06XHJcbi8vICAgICAgICAgICAgIGlucHV0U2hhcGVbMF0gPSAtMTtcclxuLy9cclxuLy8gICAgICAgICAgICAgLy8gdXBkYXRlIHRvcG9sb2d5IGlucHV0IG91dHB1dCBsYXllcnM6XHJcbi8vICAgICAgICAgICAgIHVwZGF0ZUlucHV0T3V0cHV0TGF5ZXIoaW5wdXRTaGFwZVsxXSwgaW5wdXRTaGFwZVsyXSwgaW5wdXRTaGFwZVszXSk7XHJcbi8vXHJcbi8vICAgICAgICAgfVxyXG4vLyAgICAgfVxyXG4vL1xyXG4vLyAgICAgY29uc29sZS5sb2coXCJ0ZXN0XCIpO1xyXG4vLyAgICAgYnVpbGRBcGkuZ2V0SW5wdXRTaGFwZShbXSwgaW5wdXRTaGFwZUNhbGxiYWNrKVxyXG4vLyB9XHJcbi8vXHJcbi8vIGZ1bmN0aW9uIHVwZGF0ZUlucHV0T3V0cHV0TGF5ZXIocmVzWCwgcmVzWSwgY2hhbm5lbHMpIHtcclxuLy8gICAgIC8vdXBkYXRlIHZpZXc6XHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc1hMYWJlbFwiKS50ZXh0Q29udGVudCA9IHJlc1g7XHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc1hMYWJlbDJcIikudGV4dENvbnRlbnQgPSByZXNYO1xyXG4vLyAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNZTGFiZWxcIikudGV4dENvbnRlbnQgPSByZXNZO1xyXG4vLyAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNZTGFiZWwyXCIpLnRleHRDb250ZW50ID0gcmVzWTtcclxuLy8gICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhbm5lbExhYmVsXCIpLnRleHRDb250ZW50ID0gY2hhbm5lbHM7XHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNoYW5uZWxMYWJlbDJcIikudGV4dENvbnRlbnQgPSBjaGFubmVscztcclxuLy9cclxuLy8gfVxyXG5cclxuLy9cclxuLy8gZnVuY3Rpb24gYWRkTGF5ZXIoZXZlbnQsIGZpbHRlcnNpemUsIG51bVN0YWNrcykge1xyXG4vLyAgICAgLy9yZWFkIHBhcmFtZXRlcnM6XHJcbi8vICAgICBmaWx0ZXJzaXplID0gZmlsdGVyc2l6ZSB8fCAyO1xyXG4vLyAgICAgbnVtU3RhY2tzID0gbnVtU3RhY2tzIHx8IDQ7XHJcbi8vICAgICAvKlxyXG4vLyAgICAgZ2V0IGN1cnJlbnQgQU5OIHRvcG9sb2d5IGluZm9ybWF0aW9uXHJcbi8vICAgICAgKi9cclxuLy9cclxuLy8gICAgIC8vIGdldCBlbmNvZGVyIGNvdW50XHJcbi8vICAgICB2YXIgZW5jb2RlckNvdW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlbmNvZGVyXCIpLmNoaWxkcmVuLmxlbmd0aCAtIDE7IC8vIG9uZSBjaGlsZCBpcyBpbnB1dCBsYXllclxyXG4vL1xyXG4vLyAgICAgLypcclxuLy8gICAgIGFwcGVuZCBFbmNvZGVyIGxheWVyXHJcbi8vICAgICAqL1xyXG4vLyAgICAgY29uc29sZS5sb2coXCJhZGQgZW5jb2RlclwiKTtcclxuLy9cclxuLy8gICAgIC8vIGdlbmVyYXRlIGRpdlxyXG4vLyAgICAgdmFyIGVuY29kZXJEaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5pZCA9IFwiZW5jb2RlckxheWVyX1wiICsgKGVuY29kZXJDb3VudCArIDEpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5jbGFzc05hbWUgPSBcIkFOTkxheWVyXCI7XHJcbi8vXHJcbi8vICAgICAvLyBnZW5lcmF0ZSBpbnB1dCBmaWVsZHM6XHJcbi8vICAgICB2YXIgZmlsdGVyc2l6ZUlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LnR5cGUgPSBcIm51bWJlclwiO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LnZhbHVlID0gZmlsdGVyc2l6ZTtcclxuLy8gICAgIGZpbHRlcnNpemVJbnB1dC5zdHlsZS53aWR0aCA9IFwiMzBweFwiO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LmlkID0gXCJmaWx0ZXJzaXplRUxcIiArIChlbmNvZGVyQ291bnQgKyAxKTtcclxuLy9cclxuLy8gICAgIHZhciBudW1TdGFja3NJbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuLy8gICAgIG51bVN0YWNrc0lucHV0LnR5cGUgPSBcIm51bWJlclwiO1xyXG4vLyAgICAgbnVtU3RhY2tzSW5wdXQudmFsdWUgPSBudW1TdGFja3M7XHJcbi8vICAgICBudW1TdGFja3NJbnB1dC5zdHlsZS53aWR0aCA9IFwiMzBweFwiO1xyXG4vLyAgICAgbnVtU3RhY2tzSW5wdXQuaWQgPSBcIm51bVN0YWNrc0VMXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vXHJcbi8vICAgICAvLyBnZW5lcmF0ZSByZW1vdmUgYnV0dG9uOlxyXG4vLyAgICAgdmFyIHJlbW92ZUJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJidXR0b25cIik7XHJcbi8vICAgICByZW1vdmVCdXR0b24uaWQgPSBcInJlbW92ZUVMXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vICAgICByZW1vdmVCdXR0b24udGV4dENvbnRlbnQgPSBcIi1cIjtcclxuLy9cclxuLy8gICAgIC8vIGFwcGVuZCBlbGVtZW50cyB0byBkaXY6XHJcbi8vICAgICBlbmNvZGVyRGl2LmFwcGVuZChcIkVuY29kZXIgTGF5ZXIgXCIgKyAoZW5jb2RlckNvdW50ICsgMSkgKyBcIjogXCIpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpKTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKSk7XHJcbi8vICAgICBlbmNvZGVyRGl2LmFwcGVuZChcIkZpbHRlcnNpemU6IFwiKTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kQ2hpbGQoZmlsdGVyc2l6ZUlucHV0KTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kKFwiIE51bWJlciBvZiBTdGFja3M6IFwiKTtcclxuLy8gICAgIGVuY29kZXJEaXYuYXBwZW5kQ2hpbGQobnVtU3RhY2tzSW5wdXQpO1xyXG4vLyAgICAgZW5jb2RlckRpdi5hcHBlbmRDaGlsZChyZW1vdmVCdXR0b24pO1xyXG4vL1xyXG4vLyAgICAgLy9hcHBlbmQgdG8gRE9NXHJcbi8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVuY29kZXJcIikuYXBwZW5kQ2hpbGQoZW5jb2RlckRpdik7XHJcbi8vXHJcbi8vXHJcbi8vICAgICAvKlxyXG4vLyAgICAgYXBwZW5kIGRlY29kZXIgbGF5ZXJcclxuLy8gICAgICovXHJcbi8vICAgICBjb25zb2xlLmxvZyhcImFkZCBkZWNvZGVyXCIpO1xyXG4vL1xyXG4vLyAgICAgLy8gZ2VuZXJhdGUgZGl2XHJcbi8vICAgICB2YXIgZGVjb2RlckRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbi8vICAgICBkZWNvZGVyRGl2LmlkID0gXCJkZWNvZGVyTGF5ZXJfXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vICAgICBkZWNvZGVyRGl2LmNsYXNzTmFtZSA9IFwiQU5OTGF5ZXJcIjtcclxuLy9cclxuLy8gICAgIC8vIGdlbmVyYXRlIGxhYmVsczpcclxuLy8gICAgIHZhciBmaWx0ZXJzaXplTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGFiZWxcIik7XHJcbi8vICAgICBmaWx0ZXJzaXplTGFiZWwudGV4dENvbnRlbnQgPSBmaWx0ZXJzaXplO1xyXG4vLyAgICAgZmlsdGVyc2l6ZUxhYmVsLmlkID0gXCJmaWx0ZXJzaXplRExcIiArIChlbmNvZGVyQ291bnQgKyAxKTtcclxuLy9cclxuLy8gICAgIHZhciBudW1TdGFja3NMYWJlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsYWJlbFwiKTtcclxuLy8gICAgIG51bVN0YWNrc0xhYmVsLnRleHRDb250ZW50ID0gbnVtU3RhY2tzO1xyXG4vLyAgICAgbnVtU3RhY2tzTGFiZWwuaWQgPSBcIm51bVN0YWNrc0RMXCIgKyAoZW5jb2RlckNvdW50ICsgMSk7XHJcbi8vXHJcbi8vICAgICAvLyBhcHBlbmQgZWxlbWVudHMgdG8gZGl2OlxyXG4vLyAgICAgZGVjb2RlckRpdi5hcHBlbmQoXCJEZWNvZGVyIExheWVyIFwiICsgKGVuY29kZXJDb3VudCArIDEpICsgXCI6IFwiKTtcclxuLy8gICAgIGRlY29kZXJEaXYuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKSk7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xyXG4vLyAgICAgZGVjb2RlckRpdi5hcHBlbmQoXCJGaWx0ZXJzaXplOiBcIik7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZENoaWxkKGZpbHRlcnNpemVMYWJlbCk7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZChcIiBOdW1iZXIgb2YgU3RhY2tzOiBcIik7XHJcbi8vICAgICBkZWNvZGVyRGl2LmFwcGVuZENoaWxkKG51bVN0YWNrc0xhYmVsKTtcclxuLy9cclxuLy8gICAgIC8vYXBwZW5kIHRvIERPTVxyXG4vLyAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZWNvZGVyXCIpLmluc2VydEJlZm9yZShkZWNvZGVyRGl2LCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlY29kZXJcIikuZmlyc3RDaGlsZCk7XHJcbi8vXHJcbi8vICAgICAvKlxyXG4vLyAgICAgbGluayBpbnB1dCBmaWVsZHNcclxuLy8gICAgICAqL1xyXG4vLyAgICAgZmlsdGVyc2l6ZUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKCkge1xyXG4vLyAgICAgICAgIGZpbHRlcnNpemVMYWJlbC50ZXh0Q29udGVudCA9IGZpbHRlcnNpemVJbnB1dC52YWx1ZTtcclxuLy8gICAgIH0pO1xyXG4vLyAgICAgbnVtU3RhY2tzSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XHJcbi8vICAgICAgICAgbnVtU3RhY2tzTGFiZWwudGV4dENvbnRlbnQgPSBudW1TdGFja3NJbnB1dC52YWx1ZTtcclxuLy8gICAgIH0pO1xyXG4vL1xyXG4vLyAgICAgLypcclxuLy8gICAgIGF0dGFjaCByZW1vdmUgYnV0dG9uXHJcbi8vICAgICAgKi9cclxuLy8gICAgIHJlbW92ZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4vLyAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZW5jb2RlclwiKS5yZW1vdmVDaGlsZChlbmNvZGVyRGl2KTtcclxuLy8gICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlY29kZXJcIikucmVtb3ZlQ2hpbGQoZGVjb2RlckRpdik7XHJcbi8vICAgICAgICAgY29uc29sZS5sb2coXCJsYXllciByZW1vdmVkXCIpO1xyXG4vLyAgICAgfSlcclxuLy8gfVxyXG4vL1xyXG4vLyBmdW5jdGlvbiBidWlsZEFOTigpIHtcclxuLy8gICAgIC8vIGdldCBBTk4gdG9wb2xvZ3k6XHJcbi8vICAgICB2YXIgZmlsdGVyU2l6ZXMgPSBbXTtcclxuLy8gICAgIHZhciBudW1TdGFja3MgPSBbXTtcclxuLy8gICAgIHZhciBudW1FbmNvZGVyTGF5ZXJzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlbmNvZGVyXCIpLmNoaWxkRWxlbWVudENvdW50O1xyXG4vLyAgICAgY29uc29sZS5sb2cobnVtRW5jb2RlckxheWVycyk7XHJcbi8vICAgICBmb3IgKHZhciBpID0gMTsgaSA8IG51bUVuY29kZXJMYXllcnM7IGkrKykge1xyXG4vLyAgICAgICAgIC8vIGdldCBmaWx0ZXJzaXplIG9mIGN1cnJlbnQgbGF5ZXI6XHJcbi8vICAgICAgICAgZmlsdGVyU2l6ZXMucHVzaChOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmaWx0ZXJzaXplRUxcIiArIGkpLnZhbHVlKSk7XHJcbi8vICAgICAgICAgLy8gZ2V0IG51bWJlciBvZiBTdGFja3Mgb2YgY3VycmVudCBsYXllclxyXG4vLyAgICAgICAgIG51bVN0YWNrcy5wdXNoKE51bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm51bVN0YWNrc0VMXCIgKyBpKS52YWx1ZSkpO1xyXG4vLyAgICAgfVxyXG4vL1xyXG4vLyAgICAgY29uc29sZS5sb2coaW5wdXRTaGFwZSk7XHJcbi8vICAgICBjb25zb2xlLmxvZyhmaWx0ZXJTaXplcyk7XHJcbi8vICAgICBjb25zb2xlLmxvZyhudW1TdGFja3MpO1xyXG4vLyAgICAgLy8gZ2V0IGxlYXJuaW5nIHBhcmFtZXRlcnMgKHNpZGViYXIpOlxyXG4vLyAgICAgdmFyIGlucHV0UGFyYW1ldGVycyA9IHJlYWRMZWFybmluZ1BhcmFtZXRlcigpO1xyXG4vL1xyXG4vLyAgICAgLy8gc2F2ZSB0b3BvbG9neSBpbmZvcm1hdGlvblxyXG4vLyAgICAgaW5wdXRQYXJhbWV0ZXJzLmlucHV0X3NoYXBlID0gW2lucHV0U2hhcGVdO1xyXG4vLyAgICAgaW5wdXRQYXJhbWV0ZXJzLmZpbHRlcl9zaXplcyA9IFtmaWx0ZXJTaXplc107XHJcbi8vICAgICBpbnB1dFBhcmFtZXRlcnMubnVtYmVyX29mX3N0YWNrcyA9IFtudW1TdGFja3NdO1xyXG4vL1xyXG4vLyAgICAgY29uc29sZS5sb2coaW5wdXRQYXJhbWV0ZXJzKTtcclxuLy9cclxuLy9cclxuLy8gICAgIC8qXHJcbi8vICAgICAgICAgaW5pdGlhbGl6ZSBBUEkgY2FsbFxyXG4vLyAgICAgICovXHJcbi8vXHJcbi8vICAgICB2YXIgYnVpbGRBcGkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkJ1aWxkQXBpKCk7XHJcbi8vXHJcbi8vXHJcbi8vICAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuLy8gICAgICAgICBpZiAoZXJyb3IpIHtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbi8vICAgICAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG4vLyAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuLy8gICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNwb25zZUxhYmVsXCIpLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGV4dDtcclxuLy8gICAgICAgICB9XHJcbi8vICAgICB9XHJcbi8vXHJcbi8vICAgICBidWlsZEFwaS5idWlsZEFOTihpbnB1dFBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuLy9cclxuLy9cclxuLy8gfVxyXG4vL1xyXG4vL1xyXG4vLyAvKlxyXG4vLyBHbG9iYWwgdmFyaWFibGVzXHJcbi8vICAqL1xyXG4vL1xyXG4vLyB2YXIgaW5wdXRTaGFwZSA9IFstMSwgLTEsIC0xLCAtMV07XHJcbi8vXHJcbi8vXHJcbi8qXHJcbkV2ZW50IExpc3RlbmVyXHJcbiAqL1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFkZExheWVyXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhZGRMYXllcik7XHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYnVpbGRBTk5cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHJlYWRMZWFybmluZ1BhcmFtZXRlcik7XHJcbi8vXHJcblxyXG4vKlxyXG5vbiBsb2FkXHJcbiAqL1xyXG5cclxuY29uc29sZS5sb2cocmVhZExlYXJuaW5nUGFyYW1ldGVyKCkpO1xyXG5cclxuLy8gZ2V0SW5wdXREaW1lbnNpb25zKCk7XHJcbi8vXHJcbi8vIC8vIGFkZCBzYW1wbGUgQU5OXHJcbi8vIGFkZExheWVyKG51bGwsIDMsIDEyKTtcclxuLy8gYWRkTGF5ZXIobnVsbCwgMywgMTApO1xyXG4vLyBhZGRMYXllcihudWxsLCAyLCAxMCk7XHJcbi8vIGFkZExheWVyKG51bGwsIDIsIDYpO1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4iXX0=
