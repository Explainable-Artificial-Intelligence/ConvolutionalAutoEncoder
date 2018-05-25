(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){

}, {}],
    2: [function (require, module, exports) {
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
    3: [function (require, module, exports) {
        arguments[4][1][0].apply(exports, arguments)
    }, {"dup": 1}],
    4: [function (require, module, exports) {
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
function checkOffset (offset, ext, length) {
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
function isArrayBuffer (obj) {
    return obj instanceof ArrayBuffer ||
        (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
            typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
    return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

        function numberIsNaN(obj) {
            return obj !== obj // eslint-disable-line no-self-compare
        }

    }, {"base64-js": 2, "ieee754": 5}],
    5: [function (require, module, exports) {
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

    }, {}],
    6: [function (require, module, exports) {
        (function (process) {
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

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
            function normalizeArray(parts, allowAboveRoot) {
                // if the path tries to go above the root, `up` ends up > 0
                var up = 0;
                for (var i = parts.length - 1; i >= 0; i--) {
                    var last = parts[i];
                    if (last === '.') {
                        parts.splice(i, 1);
                    } else if (last === '..') {
                        parts.splice(i, 1);
                        up++;
                    } else if (up) {
                        parts.splice(i, 1);
                        up--;
                    }
                }

                // if the path is allowed to go above the root, restore leading ..s
                if (allowAboveRoot) {
                    for (; up--; up) {
                        parts.unshift('..');
                    }
                }

                return parts;
            }

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
            var splitPathRe =
                /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
            var splitPath = function (filename) {
                return splitPathRe.exec(filename).slice(1);
            };

// path.resolve([from ...], to)
// posix version
            exports.resolve = function () {
                var resolvedPath = '',
                    resolvedAbsolute = false;

                for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                    var path = (i >= 0) ? arguments[i] : process.cwd();

                    // Skip empty and invalid entries
                    if (typeof path !== 'string') {
                        throw new TypeError('Arguments to path.resolve must be strings');
                    } else if (!path) {
                        continue;
                    }

                    resolvedPath = path + '/' + resolvedPath;
                    resolvedAbsolute = path.charAt(0) === '/';
                }

                // At this point the path should be resolved to a full absolute path, but
                // handle relative paths to be safe (might happen when process.cwd() fails)

                // Normalize the path
                resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function (p) {
                    return !!p;
                }), !resolvedAbsolute).join('/');

                return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
            };

// path.normalize(path)
// posix version
            exports.normalize = function (path) {
                var isAbsolute = exports.isAbsolute(path),
                    trailingSlash = substr(path, -1) === '/';

                // Normalize the path
                path = normalizeArray(filter(path.split('/'), function (p) {
                    return !!p;
                }), !isAbsolute).join('/');

                if (!path && !isAbsolute) {
                    path = '.';
                }
                if (path && trailingSlash) {
                    path += '/';
                }

                return (isAbsolute ? '/' : '') + path;
            };

// posix version
            exports.isAbsolute = function (path) {
                return path.charAt(0) === '/';
            };

// posix version
            exports.join = function () {
                var paths = Array.prototype.slice.call(arguments, 0);
                return exports.normalize(filter(paths, function (p, index) {
                    if (typeof p !== 'string') {
                        throw new TypeError('Arguments to path.join must be strings');
                    }
                    return p;
                }).join('/'));
            };


// path.relative(from, to)
// posix version
            exports.relative = function (from, to) {
                from = exports.resolve(from).substr(1);
                to = exports.resolve(to).substr(1);

                function trim(arr) {
                    var start = 0;
                    for (; start < arr.length; start++) {
                        if (arr[start] !== '') break;
                    }

                    var end = arr.length - 1;
                    for (; end >= 0; end--) {
                        if (arr[end] !== '') break;
                    }

                    if (start > end) return [];
                    return arr.slice(start, end - start + 1);
                }

                var fromParts = trim(from.split('/'));
                var toParts = trim(to.split('/'));

                var length = Math.min(fromParts.length, toParts.length);
                var samePartsLength = length;
                for (var i = 0; i < length; i++) {
                    if (fromParts[i] !== toParts[i]) {
                        samePartsLength = i;
                        break;
                    }
                }

                var outputParts = [];
                for (var i = samePartsLength; i < fromParts.length; i++) {
                    outputParts.push('..');
                }

                outputParts = outputParts.concat(toParts.slice(samePartsLength));

                return outputParts.join('/');
            };

            exports.sep = '/';
            exports.delimiter = ':';

            exports.dirname = function (path) {
                var result = splitPath(path),
                    root = result[0],
                    dir = result[1];

                if (!root && !dir) {
                    // No dirname whatsoever
                    return '.';
                }

                if (dir) {
                    // It has a dirname, strip trailing slash
                    dir = dir.substr(0, dir.length - 1);
                }

                return root + dir;
            };


            exports.basename = function (path, ext) {
                var f = splitPath(path)[2];
                // TODO: make this comparison case-insensitive on windows?
                if (ext && f.substr(-1 * ext.length) === ext) {
                    f = f.substr(0, f.length - ext.length);
                }
                return f;
            };


            exports.extname = function (path) {
                return splitPath(path)[3];
            };

            function filter(xs, f) {
                if (xs.filter) return xs.filter(f);
                var res = [];
                for (var i = 0; i < xs.length; i++) {
                    if (f(xs[i], i, xs)) res.push(xs[i]);
                }
                return res;
            }

// String.prototype.substr - negative index don't work in IE8
            var substr = 'ab'.substr(-1) === 'b'
                ? function (str, start, len) {
                    return str.substr(start, len)
                }
                : function (str, start, len) {
                    if (start < 0) start = str.length + start;
                    return str.substr(start, len);
                }
            ;

        }).call(this, require('_process'))

    }, {"_process": 7}],
    7: [function (require, module, exports) {
// shim for using process in browser
        var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

        var cachedSetTimeout;
        var cachedClearTimeout;

        function defaultSetTimout() {
            throw new Error('setTimeout has not been defined');
        }

        function defaultClearTimeout() {
            throw new Error('clearTimeout has not been defined');
        }

        (function () {
            try {
                if (typeof setTimeout === 'function') {
                    cachedSetTimeout = setTimeout;
                } else {
                    cachedSetTimeout = defaultSetTimout;
                }
            } catch (e) {
                cachedSetTimeout = defaultSetTimout;
            }
            try {
                if (typeof clearTimeout === 'function') {
                    cachedClearTimeout = clearTimeout;
                } else {
                    cachedClearTimeout = defaultClearTimeout;
                }
            } catch (e) {
                cachedClearTimeout = defaultClearTimeout;
            }
        }())

        function runTimeout(fun) {
            if (cachedSetTimeout === setTimeout) {
                //normal enviroments in sane situations
                return setTimeout(fun, 0);
            }
            // if setTimeout wasn't available but was latter defined
            if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
                cachedSetTimeout = setTimeout;
                return setTimeout(fun, 0);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedSetTimeout(fun, 0);
            } catch (e) {
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                    return cachedSetTimeout.call(null, fun, 0);
                } catch (e) {
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                    return cachedSetTimeout.call(this, fun, 0);
                }
            }


        }

        function runClearTimeout(marker) {
            if (cachedClearTimeout === clearTimeout) {
                //normal enviroments in sane situations
                return clearTimeout(marker);
            }
            // if clearTimeout wasn't available but was latter defined
            if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
                cachedClearTimeout = clearTimeout;
                return clearTimeout(marker);
            }
            try {
                // when when somebody has screwed with setTimeout but no I.E. maddness
                return cachedClearTimeout(marker);
            } catch (e) {
                try {
                    // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                    return cachedClearTimeout.call(null, marker);
                } catch (e) {
                    // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                    // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                    return cachedClearTimeout.call(this, marker);
                }
            }


        }

        var queue = [];
        var draining = false;
        var currentQueue;
        var queueIndex = -1;

        function cleanUpNextTick() {
            if (!draining || !currentQueue) {
                return;
            }
            draining = false;
            if (currentQueue.length) {
                queue = currentQueue.concat(queue);
            } else {
                queueIndex = -1;
            }
            if (queue.length) {
                drainQueue();
            }
        }

        function drainQueue() {
            if (draining) {
                return;
            }
            var timeout = runTimeout(cleanUpNextTick);
            draining = true;

            var len = queue.length;
            while (len) {
                currentQueue = queue;
                queue = [];
                while (++queueIndex < len) {
                    if (currentQueue) {
                        currentQueue[queueIndex].run();
                    }
                }
                queueIndex = -1;
                len = queue.length;
            }
            currentQueue = null;
            draining = false;
            runClearTimeout(timeout);
        }

        process.nextTick = function (fun) {
            var args = new Array(arguments.length - 1);
            if (arguments.length > 1) {
                for (var i = 1; i < arguments.length; i++) {
                    args[i - 1] = arguments[i];
                }
            }
            queue.push(new Item(fun, args));
            if (queue.length === 1 && !draining) {
                runTimeout(drainQueue);
            }
        };

// v8 likes predictible objects
        function Item(fun, array) {
            this.fun = fun;
            this.array = array;
        }

        Item.prototype.run = function () {
            this.fun.apply(null, this.array);
        };
        process.title = 'browser';
        process.browser = true;
        process.env = {};
        process.argv = [];
        process.version = ''; // empty string to avoid regexp issues
        process.versions = {};

        function noop() {
        }

        process.on = noop;
        process.addListener = noop;
        process.once = noop;
        process.off = noop;
        process.removeListener = noop;
        process.removeAllListeners = noop;
        process.emit = noop;
        process.prependListener = noop;
        process.prependOnceListener = noop;

        process.listeners = function (name) {
            return []
        }

        process.binding = function (name) {
            throw new Error('process.binding is not supported');
        };

        process.cwd = function () {
            return '/'
        };
        process.chdir = function (dir) {
            throw new Error('process.chdir is not supported');
        };
        process.umask = function () {
            return 0;
        };

    }, {}],
    8: [function (require, module, exports) {
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

    }, {}],
    9: [function (require, module, exports) {
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

    }, {}],
    10: [function (require, module, exports) {
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

    }, {"./decode": 8, "./encode": 9}],
    11: [function (require, module, exports) {

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
    12: [function (require, module, exports) {
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
        "./is-function": 13,
        "./is-object": 14,
        "./request-base": 15,
        "./response-base": 16,
        "./should-retry": 17,
        "component-emitter": 11
    }],
    13: [function (require, module, exports) {
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

    }, {"./is-object": 14}],
    14: [function (require, module, exports) {
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
    15: [function (require, module, exports) {
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

    }, {"./is-object": 14}],
    16: [function (require, module, exports) {

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

    }, {"./utils": 18}],
    17: [function (require, module, exports) {
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
    18: [function (require, module, exports) {

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
    19: [function (require, module, exports) {
(function (Buffer){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(superagent, querystring) {
  'use strict';

  /**
   * @module ApiClient
   * @version 1.2.2
   */

  /**
   * Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
   * application to use this class directly - the *Api and model classes provide the public API for the service. The
   * contents of this file should be regarded as internal but are documented for completeness.
   * @alias module:ApiClient
   * @class
   */
  var exports = function() {
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
    this.authentications = {
    };
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
  exports.prototype.paramToString = function(param) {
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
  exports.prototype.buildUrl = function(path, pathParams) {
    if (!path.match(/^\//)) {
      path = '/' + path;
    }
    var url = this.basePath + path;
    var _this = this;
    url = url.replace(/\{([\w-]+)\}/g, function(fullMatch, key) {
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
  exports.prototype.isJsonMime = function(contentType) {
    return Boolean(contentType != null && contentType.match(/^application\/json(;.*)?$/i));
  };

  /**
   * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
   * @param {Array.<String>} contentTypes
   * @returns {String} The chosen content type, preferring JSON.
   */
  exports.prototype.jsonPreferredMime = function(contentTypes) {
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
  exports.prototype.isFileParam = function(param) {
    // fs.ReadStream in Node.js and Electron (but not in runtime like browserify)
    if (typeof require === 'function') {
      var fs;
      try {
        fs = require('fs');
      } catch (err) {}
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
  exports.prototype.normalizeParams = function(params) {
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
  exports.prototype.applyAuthToRequest = function(request, authNames) {
    var _this = this;
    authNames.forEach(function(authName) {
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
      if(contentType != 'multipart/form-data') {
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
    if (this.enableCookies){
      if (typeof window === 'undefined') {
        this.agent.attachCookies(request);
      }
      else {
        request.withCredentials();
      }
    }


    request.end(function(error, response) {
      if (callback) {
        var data = null;
        if (!error) {
          try {
            data = _this.deserialize(response, returnType);
            if (_this.enableCookies && typeof window === 'undefined'){
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
  exports.parseDate = function(str) {
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
  exports.convertToType = function(data, type) {
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
          return data.map(function(item) {
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
  exports.constructFromObject = function(data, obj, itemType) {
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

    }, {"buffer": 4, "fs": 3, "querystring": 10, "superagent": 12}],
    20: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient, ParameterList) {
  'use strict';

  /**
   * Build service.
   * @module api/BuildApi
   * @version 1.2.2
   */

  /**
   * Constructs a new BuildApi.
   * @alias module:api/BuildApi
   * @class
   * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
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
    this.buildANN = function(inputParameters, callback) {
      var postBody = inputParameters;

      // verify the required parameter 'inputParameters' is set
      if (inputParameters === undefined || inputParameters === null) {
        throw new Error("Missing the required parameter 'inputParameters' when calling buildANN");
      }


      var pathParams = {
      };
      var queryParams = {
      };
        var collectionQueryParams = {};
      var headerParams = {
      };
      var formParams = {
      };

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
    this.getInputShape = function(opts, callback) {
      opts = opts || {};
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
          'dataset_name': opts['datasetName'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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

    }, {"../ApiClient": 19, "../model/ParameterList": 32}],
    21: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient, ImageData) {
  'use strict';

  /**
   * Load service.
   * @module api/LoadApi
   * @version 1.2.2
   */

  /**
   * Constructs a new LoadApi.
   * @alias module:api/LoadApi
   * @class
   * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


      /**
       * Callback function to receive the result of the getAvailableDataSets operation.
       * @callback module:api/LoadApi~getAvailableDataSetsCallback
       * @param {String} error Error message, if any.
       * @param {Array.<'String'>} data The data returned by the service call.
       * @param {String} response The complete HTTP response.
       */

      /**
       * get available data sets
       * returns a list of available data set files
       * @param {module:api/LoadApi~getAvailableDataSetsCallback} callback The callback function, accepting three arguments: error, data, response
       * data is of type: {@link Array.<'String'>}
       */
      this.getAvailableDataSets = function (callback) {
          var postBody = null;


          var pathParams = {};
          var queryParams = {};
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {};

          var authNames = [];
          var contentTypes = ['application/json'];
          var accepts = ['application/json'];
          var returnType = ['String'];

          return this.apiClient.callApi(
              '/load/getAvailableDataSets', 'GET',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }

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
    this.getImageBatch = function(opts, callback) {
      opts = opts || {};
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
        'batch_size': opts['batchSize'],
        'datasetname': opts['datasetname'],
        'sort_by': opts['sortBy'],
        'filter': opts['filter'],
          'output': opts['output'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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
    this.getImageById = function(id, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'id' is set
      if (id === undefined || id === null) {
        throw new Error("Missing the required parameter 'id' when calling getImageById");
      }


      var pathParams = {
      };
      var queryParams = {
        'id': id,
        'datasetname': opts['datasetname'],
        'sort_by': opts['sortBy'],
        'filter': opts['filter'],
          'output': opts['output'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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
    this.getImages = function(startIdx, endIdx, opts, callback) {
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


      var pathParams = {
      };
      var queryParams = {
        'start_idx': startIdx,
        'end_idx': endIdx,
        'datasetname': opts['datasetname'],
        'sort_by': opts['sortBy'],
        'filter': opts['filter'],
          'output': opts['output'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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
       * Callback function to receive the result of the getLatentRepresentationById operation.
       * @callback module:api/LoadApi~getLatentRepresentationByIdCallback
       * @param {String} error Error message, if any.
       * @param {module:model/ImageData} data The data returned by the service call.
       * @param {String} response The complete HTTP response.
       */

      /**
       * returns a single latent representation as ()list of) png images
       * images are encoded as png byte strings
       * @param {Number} id defines the id of the images
       * @param {Object} opts Optional parameters
       * @param {String} opts.datasetname name for dataset on the server (default to train_data)
       * @param {module:api/LoadApi~getLatentRepresentationByIdCallback} callback The callback function, accepting three arguments: error, data, response
       * data is of type: {@link module:model/ImageData}
       */
      this.getLatentRepresentationById = function (id, opts, callback) {
          opts = opts || {};
          var postBody = null;

          // verify the required parameter 'id' is set
          if (id === undefined || id === null) {
              throw new Error("Missing the required parameter 'id' when calling getLatentRepresentationById");
          }


          var pathParams = {};
          var queryParams = {
              'id': id,
              'datasetname': opts['datasetname'],
          };
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {};

          var authNames = [];
          var contentTypes = ['application/json'];
          var accepts = ['application/json'];
          var returnType = ImageData;

          return this.apiClient.callApi(
              '/load/getLatentRepresentationById', 'GET',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }

      /**
       * Callback function to receive the result of the getLoadedDataSets operation.
       * @callback module:api/LoadApi~getLoadedDataSetsCallback
       * @param {String} error Error message, if any.
       * @param {Array.<'String'>} data The data returned by the service call.
       * @param {String} response The complete HTTP response.
       */

      /**
       * get loaded data sets
       * returns a list of loaded data sets
       * @param {module:api/LoadApi~getLoadedDataSetsCallback} callback The callback function, accepting three arguments: error, data, response
       * data is of type: {@link Array.<'String'>}
       */
      this.getLoadedDataSets = function (callback) {
          var postBody = null;


          var pathParams = {};
          var queryParams = {};
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {};

          var authNames = [];
          var contentTypes = ['application/json'];
          var accepts = ['application/json'];
          var returnType = ['String'];

          return this.apiClient.callApi(
              '/load/getLoadedDataSets', 'GET',
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
    this.getRandomImages = function(opts, callback) {
      opts = opts || {};
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
        'batch_size': opts['batchSize'],
        'datasetname': opts['datasetname'],
        'sort_by': opts['sortBy'],
        'filter': opts['filter'],
          'output': opts['output'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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
    this.loadFile = function(filename, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'filename' is set
      if (filename === undefined || filename === null) {
        throw new Error("Missing the required parameter 'filename' when calling loadFile");
      }


      var pathParams = {
      };
      var queryParams = {
        'filename': filename,
        'datasetname': opts['datasetname'],
        'read_labels': opts['readLabels'],
          'data_type': opts['dataType'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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
    this.resetAllBatchIndices = function(callback) {
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
      };
        var collectionQueryParams = {};
      var headerParams = {
      };
      var formParams = {
      };

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
    this.resetBatchIndex = function(opts, callback) {
      opts = opts || {};
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
        'dataset_name': opts['datasetName'],
          'output': opts['output'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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

      /**
       * Callback function to receive the result of the uploadFile operation.
       * @callback module:api/LoadApi~uploadFileCallback
       * @param {String} error Error message, if any.
       * @param data This operation does not return a value.
       * @param {String} response The complete HTTP response.
       */

      /**
       * uploads a data file
       * Load a data file in different data formats
       * @param {File} upfile The file to upload.
       * @param {module:api/LoadApi~uploadFileCallback} callback The callback function, accepting three arguments: error, data, response
       */
      this.uploadFile = function (upfile, callback) {
          var postBody = null;

          // verify the required parameter 'upfile' is set
          if (upfile === undefined || upfile === null) {
              throw new Error("Missing the required parameter 'upfile' when calling uploadFile");
          }


          var pathParams = {};
          var queryParams = {};
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {
              'upfile': upfile
          };

          var authNames = [];
          var contentTypes = ['multipart/form-data'];
          var accepts = [];
          var returnType = null;

          return this.apiClient.callApi(
              '/load/uploadFile', 'POST',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }
  };

  return exports;
}));

    }, {"../ApiClient": 19, "../model/ImageData": 30}],
    22: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient, ProcessedImageData, TrainPerformance, TrainStatus) {
  'use strict';

  /**
   * Train service.
   * @module api/TrainApi
   * @version 1.2.2
   */

  /**
   * Constructs a new TrainApi.
   * @alias module:api/TrainApi
   * @class
   * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
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
     * @param {Object} opts Optional parameters
     * @param {String} opts.datasetName determines data set for training
     * @param {module:api/TrainApi~controlTrainingCallback} callback The callback function, accepting three arguments: error, data, response
     */
    this.controlTraining = function (trainStatus, opts, callback) {
        opts = opts || {};
      var postBody = trainStatus;

      // verify the required parameter 'trainStatus' is set
      if (trainStatus === undefined || trainStatus === null) {
        throw new Error("Missing the required parameter 'trainStatus' when calling controlTraining");
      }


      var pathParams = {
      };
      var queryParams = {
          'datasetName': opts['datasetName'],
      };
        var collectionQueryParams = {};
      var headerParams = {
      };
      var formParams = {
      };

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
    this.getProcessedImageData = function(setSize, callback) {
      var postBody = null;

      // verify the required parameter 'setSize' is set
      if (setSize === undefined || setSize === null) {
        throw new Error("Missing the required parameter 'setSize' when calling getProcessedImageData");
      }


      var pathParams = {
      };
      var queryParams = {
          'setSize': setSize,
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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
    this.getTrainPerformance = function(callback) {
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
      };
        var collectionQueryParams = {};
      var headerParams = {
      };
      var formParams = {
      };

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
        "../ApiClient": 19,
        "../model/ProcessedImageData": 34,
        "../model/TrainPerformance": 36,
        "../model/TrainStatus": 38
    }],
    23: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient, ParameterList, ProcessedImageData, TrainPerformance, TrainStatus) {
  'use strict';

  /**
   * Tune service.
   * @module api/TuneApi
   * @version 1.2.2
   */

  /**
   * Constructs a new TuneApi.
   * @alias module:api/TuneApi
   * @class
   * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


      /**
       * Callback function to receive the result of the applySpecificTuningAsDefaultModel operation.
       * @callback module:api/TuneApi~applySpecificTuningAsDefaultModelCallback
       * @param {String} error Error message, if any.
       * @param data This operation does not return a value.
       * @param {String} response The complete HTTP response.
       */

      /**
       * sets a given tuned model as default model
       * sets a given tuned model as default model
       * @param {String} modelId model id of the tuned model
       * @param {module:api/TuneApi~applySpecificTuningAsDefaultModelCallback} callback The callback function, accepting three arguments: error, data, response
       */
      this.applySpecificTuningAsDefaultModel = function (modelId, callback) {
          var postBody = null;

          // verify the required parameter 'modelId' is set
          if (modelId === undefined || modelId === null) {
              throw new Error("Missing the required parameter 'modelId' when calling applySpecificTuningAsDefaultModel");
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
          var returnType = null;

          return this.apiClient.callApi(
              '/tune/applySpecificTuningAsDefaultModel', 'POST',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }

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
       * @param {Object} opts Optional parameters
       * @param {Boolean} opts.deletePreviousModels if true delete all previous tuned models (default to false)
       * @param {module:api/TuneApi~buildGridSearchANNCallback} callback The callback function, accepting three arguments: error, data, response
       */
      this.buildGridSearchANN = function (inputParameterLists, opts, callback) {
          opts = opts || {};
          var postBody = inputParameterLists;

          // verify the required parameter 'inputParameterLists' is set
          if (inputParameterLists === undefined || inputParameterLists === null) {
              throw new Error("Missing the required parameter 'inputParameterLists' when calling buildGridSearchANN");
          }


          var pathParams = {};
          var queryParams = {
              'deletePreviousModels': opts['deletePreviousModels'],
          };
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
    this.controlTuning = function(trainStatus, callback) {
      var postBody = trainStatus;

      // verify the required parameter 'trainStatus' is set
      if (trainStatus === undefined || trainStatus === null) {
        throw new Error("Missing the required parameter 'trainStatus' when calling controlTuning");
      }


      var pathParams = {
      };
      var queryParams = {
      };
        var collectionQueryParams = {};
      var headerParams = {
      };
      var formParams = {
      };

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
    this.getProcessedImageDataOfCurrentTuning = function(setSize, callback) {
      var postBody = null;

      // verify the required parameter 'setSize' is set
      if (setSize === undefined || setSize === null) {
        throw new Error("Missing the required parameter 'setSize' when calling getProcessedImageDataOfCurrentTuning");
      }


      var pathParams = {
      };
      var queryParams = {
          'setSize': setSize,
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

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
    this.getTrainPerformanceOfCurrentTuning = function(callback) {
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
      };
        var collectionQueryParams = {};
      var headerParams = {
      };
      var formParams = {
      };

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
       * Callback function to receive the result of the getTuneModelIds operation.
       * @callback module:api/TuneApi~getTuneModelIdsCallback
       * @param {String} error Error message, if any.
       * @param {Array.<'String'>} data The data returned by the service call.
       * @param {String} response The complete HTTP response.
       */

      /**
       * returns a list of all tuned model ids
       * returns a list of all tuned model ids
       * @param {module:api/TuneApi~getTuneModelIdsCallback} callback The callback function, accepting three arguments: error, data, response
       * data is of type: {@link Array.<'String'>}
       */
      this.getTuneModelIds = function (callback) {
          var postBody = null;


          var pathParams = {};
          var queryParams = {};
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {};

          var authNames = [];
          var contentTypes = ['application/json'];
          var accepts = ['application/json'];
          var returnType = ['String'];

          return this.apiClient.callApi(
              '/tune/getTuneModelIds', 'GET',
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

      /**
       * Callback function to receive the result of the getTunedModelAsZip operation.
       * @callback module:api/TuneApi~getTunedModelAsZipCallback
       * @param {String} error Error message, if any.
       * @param {File} data The data returned by the service call.
       * @param {String} response The complete HTTP response.
       */

      /**
       * returns a zip file with the pre trained model as runable python script
       *
       * @param {String} modelId model id of the tuned model
       * @param {module:api/TuneApi~getTunedModelAsZipCallback} callback The callback function, accepting three arguments: error, data, response
       * data is of type: {@link File}
       */
      this.getTunedModelAsZip = function (modelId, callback) {
          var postBody = null;

          // verify the required parameter 'modelId' is set
          if (modelId === undefined || modelId === null) {
              throw new Error("Missing the required parameter 'modelId' when calling getTunedModelAsZip");
      }


          var pathParams = {};
          var queryParams = {
              'modelId': modelId,
          };
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {};

          var authNames = [];
          var contentTypes = ['multipart/form-data'];
          var accepts = ['application/octet-stream'];
          var returnType = File;

          return this.apiClient.callApi(
              '/tune/getTunedModelAsZip', 'GET',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }
  };

  return exports;
}));

    }, {
        "../ApiClient": 19,
        "../model/ParameterList": 32,
        "../model/ProcessedImageData": 34,
        "../model/TrainPerformance": 36,
        "../model/TrainStatus": 38
    }],
    24: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
   * @version 1.2.2
   */

  /**
   * Constructs a new VisualizeApi.
   * @alias module:api/VisualizeApi
   * @class
   * @param {module:ApiClient} [apiClient] Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


      /**
       * Callback function to receive the result of the computeHiddenLayerLatentClustering operation.
       * @callback module:api/VisualizeApi~computeHiddenLayerLatentClusteringCallback
       * @param {String} error Error message, if any.
       * @param data This operation does not return a value.
       * @param {String} response The complete HTTP response.
       */

      /**
       * starts the clustering of the latent representation of a hidden layer
       * starts the clustering of the latent representation of a hidden layer
       * @param {String} algorithm determines the clutering algorithm
       * @param {String} dimensionReduction determines the algorithm for dim reduction
       * @param {Object} opts Optional parameters
       * @param {String} opts.datasetName determines the dataset which should be clustered (default to train_data)
       * @param {Number} opts.layer determines the hidden layer
       * @param {module:model/ClusterParameters} opts.clusterParameters determines the clutering parameters
       * @param {module:api/VisualizeApi~computeHiddenLayerLatentClusteringCallback} callback The callback function, accepting three arguments: error, data, response
       */
      this.computeHiddenLayerLatentClustering = function (algorithm, dimensionReduction, opts, callback) {
          opts = opts || {};
          var postBody = opts['clusterParameters'];

          // verify the required parameter 'algorithm' is set
          if (algorithm === undefined || algorithm === null) {
              throw new Error("Missing the required parameter 'algorithm' when calling computeHiddenLayerLatentClustering");
          }

          // verify the required parameter 'dimensionReduction' is set
          if (dimensionReduction === undefined || dimensionReduction === null) {
              throw new Error("Missing the required parameter 'dimensionReduction' when calling computeHiddenLayerLatentClustering");
          }


          var pathParams = {};
          var queryParams = {
              'algorithm': algorithm,
              'dataset_name': opts['datasetName'],
              'dimension_reduction': dimensionReduction,
              'layer': opts['layer'],
          };
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {};

          var authNames = [];
          var contentTypes = ['application/json'];
          var accepts = ['application/json'];
          var returnType = null;

          return this.apiClient.callApi(
              '/visualize/computeHiddenLayerLatentClustering', 'POST',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }

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
    this.generateImageFromSinglePoint = function(point2D, callback) {
      var postBody = point2D;

      // verify the required parameter 'point2D' is set
      if (point2D === undefined || point2D === null) {
        throw new Error("Missing the required parameter 'point2D' when calling generateImageFromSinglePoint");
      }


      var pathParams = {
      };
      var queryParams = {
      };
        var collectionQueryParams = {};
      var headerParams = {
      };
      var formParams = {
      };

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
     * @param {String} opts.datasetName determines the dataset which should be clustered (default to train_data)
     * @param {Number} opts.layer determines the hidden layer
     * @param {module:api/VisualizeApi~getHiddenLayerLatentClusteringCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Clustering}
     */
    this.getHiddenLayerLatentClustering = function (opts, callback) {
      opts = opts || {};
        var postBody = null;


      var pathParams = {
      };
      var queryParams = {
        'dataset_name': opts['datasetName'],
          'layer': opts['layer'],
      };
        var collectionQueryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = [];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Clustering;

      return this.apiClient.callApi(
          '/visualize/getHiddenLayerLatentClustering', 'POST',
          pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

      /**
       * Callback function to receive the result of the getPretrainedModelAsZip operation.
       * @callback module:api/VisualizeApi~getPretrainedModelAsZipCallback
       * @param {String} error Error message, if any.
       * @param {File} data The data returned by the service call.
       * @param {String} response The complete HTTP response.
       */

      /**
       * returns a zip file with the pre trained model as runable python script
       *
       * @param {module:api/VisualizeApi~getPretrainedModelAsZipCallback} callback The callback function, accepting three arguments: error, data, response
       * data is of type: {@link File}
       */
      this.getPretrainedModelAsZip = function (callback) {
          var postBody = null;


          var pathParams = {};
          var queryParams = {};
          var collectionQueryParams = {};
          var headerParams = {};
          var formParams = {};

          var authNames = [];
          var contentTypes = ['multipart/form-data'];
          var accepts = ['application/octet-stream'];
          var returnType = File;

          return this.apiClient.callApi(
              '/visualize/getPretrainedModelAsZip', 'GET',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }
  };

  return exports;
}));

    }, {
        "../ApiClient": 19,
        "../model/ClusterParameters": 26,
        "../model/Clustering": 27,
        "../model/Image": 29,
        "../model/Point2D": 33
    }],
    25: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
      define(['ApiClient', 'model/ClusterParameters', 'model/Clustering', 'model/CostFunction', 'model/Image', 'model/ImageData', 'model/LearningRate', 'model/ParameterList', 'model/Point2D', 'model/ProcessedImageData', 'model/RandomFunction', 'model/TrainPerformance', 'model/TrainPerformanceDataPoint', 'model/TrainStatus', 'api/BuildApi', 'api/LoadApi', 'api/TrainApi', 'api/TuneApi', 'api/VisualizeApi'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
      module.exports = factory(require('./ApiClient'), require('./model/ClusterParameters'), require('./model/Clustering'), require('./model/CostFunction'), require('./model/Image'), require('./model/ImageData'), require('./model/LearningRate'), require('./model/ParameterList'), require('./model/Point2D'), require('./model/ProcessedImageData'), require('./model/RandomFunction'), require('./model/TrainPerformance'), require('./model/TrainPerformanceDataPoint'), require('./model/TrainStatus'), require('./api/BuildApi'), require('./api/LoadApi'), require('./api/TrainApi'), require('./api/TuneApi'), require('./api/VisualizeApi'));
  }
}(function (ApiClient, ClusterParameters, Clustering, CostFunction, Image, ImageData, LearningRate, ParameterList, Point2D, ProcessedImageData, RandomFunction, TrainPerformance, TrainPerformanceDataPoint, TrainStatus, BuildApi, LoadApi, TrainApi, TuneApi, VisualizeApi) {
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
   * @version 1.2.2
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
     * The TrainPerformanceDataPoint model constructor.
     * @property {module:model/TrainPerformanceDataPoint}
     */
    TrainPerformanceDataPoint: TrainPerformanceDataPoint,
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
        "./ApiClient": 19,
        "./api/BuildApi": 20,
        "./api/LoadApi": 21,
        "./api/TrainApi": 22,
        "./api/TuneApi": 23,
        "./api/VisualizeApi": 24,
        "./model/ClusterParameters": 26,
        "./model/Clustering": 27,
        "./model/CostFunction": 28,
        "./model/Image": 29,
        "./model/ImageData": 30,
        "./model/LearningRate": 31,
        "./model/ParameterList": 32,
        "./model/Point2D": 33,
        "./model/ProcessedImageData": 34,
        "./model/RandomFunction": 35,
        "./model/TrainPerformance": 36,
        "./model/TrainPerformanceDataPoint": 37,
        "./model/TrainStatus": 38
    }],
    26: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient) {
  'use strict';




  /**
   * The ClusterParameters model module.
   * @module model/ClusterParameters
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>ClusterParameters</code>.
   * @alias module:model/ClusterParameters
   * @class
   */
  var exports = function() {
    var _this = this;












  };

  /**
   * Constructs a <code>ClusterParameters</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ClusterParameters} obj Optional instance to populate.
   * @return {module:model/ClusterParameters} The populated <code>ClusterParameters</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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


    }, {"../ApiClient": 19}],
    27: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient, Point2D) {
  'use strict';




  /**
   * The Clustering model module.
   * @module model/Clustering
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>Clustering</code>.
   * @alias module:model/Clustering
   * @class
   */
  var exports = function() {
    var _this = this;







  };

  /**
   * Constructs a <code>Clustering</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Clustering} obj Optional instance to populate.
   * @return {module:model/Clustering} The populated <code>Clustering</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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


    }, {"../ApiClient": 19, "./Point2D": 33}],
    28: [function (require, module, exports) {
        /**
         * Convolutional Autoencoder
         * WebUI to build, train and tune a Convolutional Autoencoder
         *
         * OpenAPI spec version: 1.2.2
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
             * @version 1.2.2
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


    }, {"../ApiClient": 19}],
    29: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient) {
  'use strict';




  /**
   * The Image model module.
   * @module model/Image
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>Image</code>.
   * @alias module:model/Image
   * @class
   */
  var exports = function() {
    var _this = this;




  };

  /**
   * Constructs a <code>Image</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Image} obj Optional instance to populate.
   * @return {module:model/Image} The populated <code>Image</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('bytestring')) {
        obj['bytestring'] = ApiClient.convertToType(data['bytestring'], 'String');
      }
      if (data.hasOwnProperty('id')) {
        obj['id'] = ApiClient.convertToType(data['id'], 'Number');
      }
        if (data.hasOwnProperty('cost')) {
            obj['cost'] = ApiClient.convertToType(data['cost'], 'Number');
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
    /**
     * @member {Number} cost
     */
    exports.prototype['cost'] = undefined;



  return exports;
}));


    }, {"../ApiClient": 19}],
    30: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient, Image) {
  'use strict';




  /**
   * The ImageData model module.
   * @module model/ImageData
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>ImageData</code>.
   * @alias module:model/ImageData
   * @class
   */
  var exports = function() {
    var _this = this;





  };

  /**
   * Constructs a <code>ImageData</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ImageData} obj Optional instance to populate.
   * @return {module:model/ImageData} The populated <code>ImageData</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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


    }, {"../ApiClient": 19, "./Image": 29}],
    31: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient) {
  'use strict';


    /**
     * The LearningRate model module.
     * @module model/LearningRate
     * @version 1.2.2
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


    }, {"../ApiClient": 19}],
    32: [function (require, module, exports) {
        /**
         * Convolutional Autoencoder
         * WebUI to build, train and tune a Convolutional Autoencoder
         *
         * OpenAPI spec version: 1.2.2
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
             * @version 1.2.2
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


    }, {"../ApiClient": 19, "./CostFunction": 28, "./LearningRate": 31, "./RandomFunction": 35}],
    33: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient) {
  'use strict';




  /**
   * The Point2D model module.
   * @module model/Point2D
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>Point2D</code>.
   * @alias module:model/Point2D
   * @class
   */
  var exports = function() {
    var _this = this;




  };

  /**
   * Constructs a <code>Point2D</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Point2D} obj Optional instance to populate.
   * @return {module:model/Point2D} The populated <code>Point2D</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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


    }, {"../ApiClient": 19}],
    34: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient, Image) {
  'use strict';




  /**
   * The ProcessedImageData model module.
   * @module model/ProcessedImageData
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>ProcessedImageData</code>.
   * @alias module:model/ProcessedImageData
   * @class
   */
  var exports = function() {
    var _this = this;


  };

  /**
   * Constructs a <code>ProcessedImageData</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ProcessedImageData} obj Optional instance to populate.
   * @return {module:model/ProcessedImageData} The populated <code>ProcessedImageData</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

        if (data.hasOwnProperty('epoch')) {
            obj['epoch'] = ApiClient.convertToType(data['epoch'], 'Number');
        }
        if (data.hasOwnProperty('step')) {
            obj['step'] = ApiClient.convertToType(data['step'], 'Number');
        }
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
     * @member {Number} epoch
     */
    exports.prototype['epoch'] = undefined;
    /**
     * @member {Number} step
     */
    exports.prototype['step'] = undefined;
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


    }, {"../ApiClient": 19, "./Image": 29}],
    35: [function (require, module, exports) {
        /**
         * Convolutional Autoencoder
         * WebUI to build, train and tune a Convolutional Autoencoder
         *
         * OpenAPI spec version: 1.2.2
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
             * @version 1.2.2
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


    }, {"../ApiClient": 19}],
    36: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
      define(['ApiClient', 'model/TrainPerformanceDataPoint'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
      module.exports = factory(require('../ApiClient'), require('./TrainPerformanceDataPoint'));
  } else {
    // Browser globals (root is window)
    if (!root.ConvolutionalAutoencoder) {
      root.ConvolutionalAutoencoder = {};
    }
      root.ConvolutionalAutoencoder.TrainPerformance = factory(root.ConvolutionalAutoencoder.ApiClient, root.ConvolutionalAutoencoder.TrainPerformanceDataPoint);
  }
}(this, function (ApiClient, TrainPerformanceDataPoint) {
  'use strict';




  /**
   * The TrainPerformance model module.
   * @module model/TrainPerformance
   * @version 1.2.2
   */

  /**
   * Constructs a new <code>TrainPerformance</code>.
   * @alias module:model/TrainPerformance
   * @class
   */
  var exports = function() {
    var _this = this;




  };

  /**
   * Constructs a <code>TrainPerformance</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/TrainPerformance} obj Optional instance to populate.
   * @return {module:model/TrainPerformance} The populated <code>TrainPerformance</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('model_id')) {
        obj['model_id'] = ApiClient.convertToType(data['model_id'], 'String');
      }
        if (data.hasOwnProperty('train_status')) {
            obj['train_status'] = ApiClient.convertToType(data['train_status'], 'String');
      }
        if (data.hasOwnProperty('train_performance_data')) {
            obj['train_performance_data'] = ApiClient.convertToType(data['train_performance_data'], [TrainPerformanceDataPoint]);
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
     * @member {Array.<module:model/TrainPerformanceDataPoint>} train_performance_data
     */
    exports.prototype['train_performance_data'] = undefined;


    return exports;
}));


    }, {"../ApiClient": 19, "./TrainPerformanceDataPoint": 37}],
    37: [function (require, module, exports) {
        /**
         * Convolutional Autoencoder
         * WebUI to build, train and tune a Convolutional Autoencoder
         *
         * OpenAPI spec version: 1.2.2
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
                root.ConvolutionalAutoencoder.TrainPerformanceDataPoint = factory(root.ConvolutionalAutoencoder.ApiClient);
            }
        }(this, function (ApiClient) {
            'use strict';


            /**
             * The TrainPerformanceDataPoint model module.
             * @module model/TrainPerformanceDataPoint
             * @version 1.2.2
             */

            /**
             * Constructs a new <code>TrainPerformanceDataPoint</code>.
             * @alias module:model/TrainPerformanceDataPoint
             * @class
             */
            var exports = function () {
                var _this = this;


            };

            /**
             * Constructs a <code>TrainPerformanceDataPoint</code> from a plain JavaScript object, optionally creating a new instance.
             * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
             * @param {Object} data The plain JavaScript object bearing properties of interest.
             * @param {module:model/TrainPerformanceDataPoint} obj Optional instance to populate.
             * @return {module:model/TrainPerformanceDataPoint} The populated <code>TrainPerformanceDataPoint</code> instance.
             */
            exports.constructFromObject = function (data, obj) {
                if (data) {
                    obj = obj || new exports();

                    if (data.hasOwnProperty('epoch')) {
                        obj['epoch'] = ApiClient.convertToType(data['epoch'], 'Number');
                    }
                    if (data.hasOwnProperty('step')) {
                        obj['step'] = ApiClient.convertToType(data['step'], 'Number');
                    }
                    if (data.hasOwnProperty('cost')) {
                        obj['cost'] = ApiClient.convertToType(data['cost'], 'Number');
                    }
                    if (data.hasOwnProperty('currentLearningRate')) {
                        obj['currentLearningRate'] = ApiClient.convertToType(data['currentLearningRate'], 'Number');
                    }
                }
                return obj;
            }

            /**
             * @member {Number} epoch
             */
            exports.prototype['epoch'] = undefined;
            /**
             * @member {Number} step
             */
            exports.prototype['step'] = undefined;
            /**
             * @member {Number} cost
             */
            exports.prototype['cost'] = undefined;
  /**
   * @member {Number} currentLearningRate
   */
  exports.prototype['currentLearningRate'] = undefined;



  return exports;
}));


    }, {"../ApiClient": 19}],
    38: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.2.2
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

(function(root, factory) {
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
}(this, function(ApiClient) {
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
    "resume": "resume"  };

  /**
   * Returns a <code>TrainStatus</code> enum value from a Javascript object name.
   * @param {Object} data The plain JavaScript object containing the name of the enum value.
   * @return {module:model/TrainStatus} The enum <code>TrainStatus</code> value.
   */
  exports.constructFromObject = function(object) {
    return object;
  }

  return exports;
}));


    }, {"../ApiClient": 19}],
    39: [function (require, module, exports) {
/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');
        var fs = require('fs');
        var path = require('path');

        var selectedImageId = "";
        var datasetname = "train_data";

var loadApi = new ConvolutionalAutoencoder.LoadApi();
        var buildApi = new ConvolutionalAutoencoder.BuildApi();

function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

        function appendImages(numberOfImages) {
    // get image grid
    var imageGrid = document.getElementById("imageGrid");


    // load next Image batch through swagger client
    //var loadApi = new ConvolutionalAutoencoder.LoadApi();

    function imageCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log('API called successfully.');
            //console.log(response);
            console.log(data);

            // iterate over all images
            for (var i = 0; i < data.images.length; i++) {
                // create new image object
                var newImage = document.createElement("img");
                newImage.id = "Image_" + data.images[i].id;
                newImage.src = "data:image/png;base64," + data.images[i].bytestring.substring(2, data.images[i].bytestring.length - 1);
                newImage.class = "imageThumbnail";
                // add eventListener
                // change preview view
                newImage.addEventListener("click", function () {
                    console.log(this.id);
                    // remove old border

                    // update preview:
                    var imagePreview = document.getElementById("imagePreview");
                    // remove old border
                    if (imagePreview.linkedId !== "") {
                        document.getElementById(imagePreview.linkedId).style.border = "";
                    }

                    imagePreview.src = this.src;

                    // update histogram:
                    histogram.setImage(this);


                    // mark selected image:
                    this.style.border = "1px solid orange";
                    // save current id in preview
                    imagePreview.linkedId = this.id;
                });


                // append new image to image grid
                imageGrid.appendChild(newImage);
            }
        }
    }

            loadApi.getImageBatch({"batchSize": numberOfImages, "datasetname": datasetname}, imageCallback);

        }

        function getAvailableDataSets() {
            function callback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log('Available data sets retrieved');
                    // replace options in 'Available data sets' selection
                    console.log(data);
                    var selection = document.getElementById("inputAvailableDataSets");
                    // remove previous options
                    selection.options.length = 0;
                    // add available file names
                    for (var i = 0; i < data.length; i++) {
                        selection.options[i] = new Option(data[i], data[i], false, false)
                    }
                }
            }

            loadApi.getAvailableDataSets(callback);
        }

        function getLoadedDataSets() {
            function callback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log('loaded data sets retrieved');
                    // replace options in 'Loaded data sets' selection
                    console.log(data);
                    var selection = document.getElementById("inputLoadedDataSets");
                    // remove previous options
                    selection.options.length = 0;
                    // add available file names
                    for (var i = 0; i < data.length; i++) {
                        selection.options[i] = new Option(data[i], data[i], false, false)
                    }
                }
            }

            loadApi.getLoadedDataSets(callback);
        }

        function updateDataSetStatistics() {
            function inputShapeCallback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log(data);
                    //update data statistics:
                    document.getElementById("labelResolution").textContent = "Resolution: " + data[1] + "px x " + data[2] + "px";
                    document.getElementById("labelLayer").textContent = "Layer: " + data[3];
                    document.getElementById("labelNumberOfImages").textContent = "Number of Images: " + data[0];


                }
            }


            buildApi.getInputShape({'datasetName': datasetname}, inputShapeCallback)
        }

        function loadFile() {

            // abort if no data set is selected
            if (document.getElementById("inputAvailableDataSets").selectedIndex === -1) {
                console.log("No data set selected");
                return;
            }

            // get all input fields
            var filename = document.getElementById("inputAvailableDataSets").options[document.getElementById("inputAvailableDataSets").selectedIndex].value;
            var datasetname = document.getElementById("inputDatasetName").value;
            //var readLabels = document.getElementById("readLabels").options[document.getElementById("readLabels").selectedIndex].value === true;
            var dataType = document.getElementById("dataType").options[document.getElementById("dataType").selectedIndex].value;

            // // call swagger client
            // var api = new ConvolutionalAutoencoder.LoadApi();

            // create callback function
            function loadCallback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    //console.log(response);
                    //console.log(data);
                    //load the first image batch
                    console.log("File loaded");
                    getLoadedDataSets();
                    appendImages(1000);

                    // remove selection:
                    document.getElementById("imagePreview").linkedId = "";

                }
            }

            loadApi.loadFile(filename, {
                'datasetname': datasetname,
                'read_labels': false,
                'data_type': dataType
            }, loadCallback);

        }

        function uploadFile() {
            function callback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log('File uploaded!');
                    // update available dat sets:
                    getAvailableDataSets();
                }
            }

            var files = document.getElementById("inputUploadFile").files;
            //console.log(filePath);
            for (var i = 0, f; f = files[i]; i++) {
                console.log(f);
                loadApi.uploadFile(f);
            }

        }


/*
Attach button events
 */

document.getElementById("loadBtn").addEventListener("click", loadFile);

        document.getElementById("showImagesBtn").addEventListener("click", function () {
            appendImages(300);
        });

        document.getElementById("uploadBtn").addEventListener("click", uploadFile);

        document.getElementById("inputAvailableDataSets").addEventListener("change", function () {
            document.getElementById("inputDatasetName").value =
                document.getElementById("inputAvailableDataSets").options[document.getElementById("inputAvailableDataSets")
                    .selectedIndex].value.split('.')[0];
        });

        document.getElementById("inputLoadedDataSets").addEventListener("change", function () {
            datasetname = document.getElementById("inputLoadedDataSets").options[document.getElementById("inputLoadedDataSets").selectedIndex].value;
            var imageGrid = document.getElementById("imageGrid");
            while (imageGrid.firstChild) {
                imageGrid.removeChild(imageGrid.firstChild);
            }
            loadApi.resetAllBatchIndices(callback);
            updateDataSetStatistics();
            appendImages(1000);
        });

        /*
Initialisation
 */

// create histogram
        var histogram = new Histogram("imagePreviewView", 400, 400);
        loadApi.resetAllBatchIndices(callback);
// remove selection:
        document.getElementById("imagePreview").linkedId = "";
        getAvailableDataSets();
        getLoadedDataSets();


    }, {"convolutional_autoencoder": 25, "fs": 1, "path": 6}]
}, {}, [39])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCJDOi9Vc2Vycy9MZW9uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCJDOi9Vc2Vycy9MZW9uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2RlY29kZS5qcyIsIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2VuY29kZS5qcyIsIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2luZGV4LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL2NvbXBvbmVudC1lbWl0dGVyL2luZGV4LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2NsaWVudC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9pcy1mdW5jdGlvbi5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9pcy1vYmplY3QuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvcmVxdWVzdC1iYXNlLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3Jlc3BvbnNlLWJhc2UuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvc2hvdWxkLXJldHJ5LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3V0aWxzLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL0FwaUNsaWVudC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvQnVpbGRBcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL0xvYWRBcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL1RyYWluQXBpLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2FwaS9UdW5lQXBpLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2FwaS9WaXN1YWxpemVBcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvaW5kZXguanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvQ2x1c3RlcmluZy5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9Db3N0RnVuY3Rpb24uanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvSW1hZ2UuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvSW1hZ2VEYXRhLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0xlYXJuaW5nUmF0ZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9QYXJhbWV0ZXJMaXN0LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1BvaW50MkQuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1JhbmRvbUZ1bmN0aW9uLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1RyYWluUGVyZm9ybWFuY2UuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9UcmFpblN0YXR1cy5qcyIsImxvYWQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcjZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9rQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNybEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1bEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIiwiJ3VzZSBzdHJpY3QnXG5cbmV4cG9ydHMuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcbmV4cG9ydHMudG9CeXRlQXJyYXkgPSB0b0J5dGVBcnJheVxuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gZnJvbUJ5dGVBcnJheVxuXG52YXIgbG9va3VwID0gW11cbnZhciByZXZMb29rdXAgPSBbXVxudmFyIEFyciA9IHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJyA/IFVpbnQ4QXJyYXkgOiBBcnJheVxuXG52YXIgY29kZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJ1xuZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNvZGUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgbG9va3VwW2ldID0gY29kZVtpXVxuICByZXZMb29rdXBbY29kZS5jaGFyQ29kZUF0KGkpXSA9IGlcbn1cblxucmV2TG9va3VwWyctJy5jaGFyQ29kZUF0KDApXSA9IDYyXG5yZXZMb29rdXBbJ18nLmNoYXJDb2RlQXQoMCldID0gNjNcblxuZnVuY3Rpb24gcGxhY2VIb2xkZXJzQ291bnQgKGI2NCkge1xuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBpZiAobGVuICUgNCA+IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnKVxuICB9XG5cbiAgLy8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcbiAgLy8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuICAvLyByZXByZXNlbnQgb25lIGJ5dGVcbiAgLy8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG4gIC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2VcbiAgcmV0dXJuIGI2NFtsZW4gLSAyXSA9PT0gJz0nID8gMiA6IGI2NFtsZW4gLSAxXSA9PT0gJz0nID8gMSA6IDBcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoYjY0KSB7XG4gIC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuICByZXR1cm4gKGI2NC5sZW5ndGggKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG59XG5cbmZ1bmN0aW9uIHRvQnl0ZUFycmF5IChiNjQpIHtcbiAgdmFyIGksIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcbiAgcGxhY2VIb2xkZXJzID0gcGxhY2VIb2xkZXJzQ291bnQoYjY0KVxuXG4gIGFyciA9IG5ldyBBcnIoKGxlbiAqIDMgLyA0KSAtIHBsYWNlSG9sZGVycylcblxuICAvLyBpZiB0aGVyZSBhcmUgcGxhY2Vob2xkZXJzLCBvbmx5IGdldCB1cCB0byB0aGUgbGFzdCBjb21wbGV0ZSA0IGNoYXJzXG4gIGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gbGVuIC0gNCA6IGxlblxuXG4gIHZhciBMID0gMFxuXG4gIGZvciAoaSA9IDA7IGkgPCBsOyBpICs9IDQpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxOCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgMTIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildIDw8IDYpIHwgcmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAzKV1cbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gMTYpICYgMHhGRlxuICAgIGFycltMKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA+PiA0KVxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9IGVsc2UgaWYgKHBsYWNlSG9sZGVycyA9PT0gMSkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDEwKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCA0KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA+PiAyKVxuICAgIGFycltMKytdID0gKHRtcCA+PiA4KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBhcnJcbn1cblxuZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcbiAgcmV0dXJuIGxvb2t1cFtudW0gPj4gMTggJiAweDNGXSArIGxvb2t1cFtudW0gPj4gMTIgJiAweDNGXSArIGxvb2t1cFtudW0gPj4gNiAmIDB4M0ZdICsgbG9va3VwW251bSAmIDB4M0ZdXG59XG5cbmZ1bmN0aW9uIGVuY29kZUNodW5rICh1aW50OCwgc3RhcnQsIGVuZCkge1xuICB2YXIgdG1wXG4gIHZhciBvdXRwdXQgPSBbXVxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkgKz0gMykge1xuICAgIHRtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcbiAgICBvdXRwdXQucHVzaCh0cmlwbGV0VG9CYXNlNjQodG1wKSlcbiAgfVxuICByZXR1cm4gb3V0cHV0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGZyb21CeXRlQXJyYXkgKHVpbnQ4KSB7XG4gIHZhciB0bXBcbiAgdmFyIGxlbiA9IHVpbnQ4Lmxlbmd0aFxuICB2YXIgZXh0cmFCeXRlcyA9IGxlbiAlIDMgLy8gaWYgd2UgaGF2ZSAxIGJ5dGUgbGVmdCwgcGFkIDIgYnl0ZXNcbiAgdmFyIG91dHB1dCA9ICcnXG4gIHZhciBwYXJ0cyA9IFtdXG4gIHZhciBtYXhDaHVua0xlbmd0aCA9IDE2MzgzIC8vIG11c3QgYmUgbXVsdGlwbGUgb2YgM1xuXG4gIC8vIGdvIHRocm91Z2ggdGhlIGFycmF5IGV2ZXJ5IHRocmVlIGJ5dGVzLCB3ZSdsbCBkZWFsIHdpdGggdHJhaWxpbmcgc3R1ZmYgbGF0ZXJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbjIgPSBsZW4gLSBleHRyYUJ5dGVzOyBpIDwgbGVuMjsgaSArPSBtYXhDaHVua0xlbmd0aCkge1xuICAgIHBhcnRzLnB1c2goZW5jb2RlQ2h1bmsodWludDgsIGksIChpICsgbWF4Q2h1bmtMZW5ndGgpID4gbGVuMiA/IGxlbjIgOiAoaSArIG1heENodW5rTGVuZ3RoKSkpXG4gIH1cblxuICAvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG4gIGlmIChleHRyYUJ5dGVzID09PSAxKSB7XG4gICAgdG1wID0gdWludDhbbGVuIC0gMV1cbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAyXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9PSdcbiAgfSBlbHNlIGlmIChleHRyYUJ5dGVzID09PSAyKSB7XG4gICAgdG1wID0gKHVpbnQ4W2xlbiAtIDJdIDw8IDgpICsgKHVpbnQ4W2xlbiAtIDFdKVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDEwXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA+PiA0KSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDIpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz0nXG4gIH1cblxuICBwYXJ0cy5wdXNoKG91dHB1dClcblxuICByZXR1cm4gcGFydHMuam9pbignJylcbn1cbiIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuLyogZXNsaW50LWRpc2FibGUgbm8tcHJvdG8gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuXG52YXIgS19NQVhfTEVOR1RIID0gMHg3ZmZmZmZmZlxuZXhwb3J0cy5rTWF4TGVuZ3RoID0gS19NQVhfTEVOR1RIXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUYDpcbiAqICAgPT09IHRydWUgICAgVXNlIFVpbnQ4QXJyYXkgaW1wbGVtZW50YXRpb24gKGZhc3Rlc3QpXG4gKiAgID09PSBmYWxzZSAgIFByaW50IHdhcm5pbmcgYW5kIHJlY29tbWVuZCB1c2luZyBgYnVmZmVyYCB2NC54IHdoaWNoIGhhcyBhbiBPYmplY3RcbiAqICAgICAgICAgICAgICAgaW1wbGVtZW50YXRpb24gKG1vc3QgY29tcGF0aWJsZSwgZXZlbiBJRTYpXG4gKlxuICogQnJvd3NlcnMgdGhhdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBhcmUgSUUgMTArLCBGaXJlZm94IDQrLCBDaHJvbWUgNyssIFNhZmFyaSA1LjErLFxuICogT3BlcmEgMTEuNissIGlPUyA0LjIrLlxuICpcbiAqIFdlIHJlcG9ydCB0aGF0IHRoZSBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGlmIHRoZSBhcmUgbm90IHN1YmNsYXNzYWJsZVxuICogdXNpbmcgX19wcm90b19fLiBGaXJlZm94IDQtMjkgbGFja3Mgc3VwcG9ydCBmb3IgYWRkaW5nIG5ldyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YFxuICogKFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4KS4gSUUgMTAgbGFja3Mgc3VwcG9ydFxuICogZm9yIF9fcHJvdG9fXyBhbmQgaGFzIGEgYnVnZ3kgdHlwZWQgYXJyYXkgaW1wbGVtZW50YXRpb24uXG4gKi9cbkJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUID0gdHlwZWRBcnJheVN1cHBvcnQoKVxuXG5pZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUICYmIHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHR5cGVvZiBjb25zb2xlLmVycm9yID09PSAnZnVuY3Rpb24nKSB7XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgJ1RoaXMgYnJvd3NlciBsYWNrcyB0eXBlZCBhcnJheSAoVWludDhBcnJheSkgc3VwcG9ydCB3aGljaCBpcyByZXF1aXJlZCBieSAnICtcbiAgICAnYGJ1ZmZlcmAgdjUueC4gVXNlIGBidWZmZXJgIHY0LnggaWYgeW91IHJlcXVpcmUgb2xkIGJyb3dzZXIgc3VwcG9ydC4nXG4gIClcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVN1cHBvcnQgKCkge1xuICAvLyBDYW4gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWQ/XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLl9fcHJvdG9fXyA9IHtfX3Byb3RvX186IFVpbnQ4QXJyYXkucHJvdG90eXBlLCBmb286IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH19XG4gICAgcmV0dXJuIGFyci5mb28oKSA9PT0gNDJcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlciAobGVuZ3RoKSB7XG4gIGlmIChsZW5ndGggPiBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW52YWxpZCB0eXBlZCBhcnJheSBsZW5ndGgnKVxuICB9XG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIHZhciBidWYgPSBuZXcgVWludDhBcnJheShsZW5ndGgpXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuLyoqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGhhdmUgdGhlaXJcbiAqIHByb3RvdHlwZSBjaGFuZ2VkIHRvIGBCdWZmZXIucHJvdG90eXBlYC4gRnVydGhlcm1vcmUsIGBCdWZmZXJgIGlzIGEgc3ViY2xhc3Mgb2ZcbiAqIGBVaW50OEFycmF5YCwgc28gdGhlIHJldHVybmVkIGluc3RhbmNlcyB3aWxsIGhhdmUgYWxsIHRoZSBub2RlIGBCdWZmZXJgIG1ldGhvZHNcbiAqIGFuZCB0aGUgYFVpbnQ4QXJyYXlgIG1ldGhvZHMuIFNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0XG4gKiByZXR1cm5zIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIFRoZSBgVWludDhBcnJheWAgcHJvdG90eXBlIHJlbWFpbnMgdW5tb2RpZmllZC5cbiAqL1xuXG5mdW5jdGlvbiBCdWZmZXIgKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIC8vIENvbW1vbiBjYXNlLlxuICBpZiAodHlwZW9mIGFyZyA9PT0gJ251bWJlcicpIHtcbiAgICBpZiAodHlwZW9mIGVuY29kaW5nT3JPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdJZiBlbmNvZGluZyBpcyBzcGVjaWZpZWQgdGhlbiB0aGUgZmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZydcbiAgICAgIClcbiAgICB9XG4gICAgcmV0dXJuIGFsbG9jVW5zYWZlKGFyZylcbiAgfVxuICByZXR1cm4gZnJvbShhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gRml4IHN1YmFycmF5KCkgaW4gRVMyMDE2LiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvOTdcbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wuc3BlY2llcyAmJlxuICAgIEJ1ZmZlcltTeW1ib2wuc3BlY2llc10gPT09IEJ1ZmZlcikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLCBTeW1ib2wuc3BlY2llcywge1xuICAgIHZhbHVlOiBudWxsLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICB3cml0YWJsZTogZmFsc2VcbiAgfSlcbn1cblxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbmZ1bmN0aW9uIGZyb20gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgYSBudW1iZXInKVxuICB9XG5cbiAgaWYgKGlzQXJyYXlCdWZmZXIodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldClcbiAgfVxuXG4gIHJldHVybiBmcm9tT2JqZWN0KHZhbHVlKVxufVxuXG4vKipcbiAqIEZ1bmN0aW9uYWxseSBlcXVpdmFsZW50IHRvIEJ1ZmZlcihhcmcsIGVuY29kaW5nKSBidXQgdGhyb3dzIGEgVHlwZUVycm9yXG4gKiBpZiB2YWx1ZSBpcyBhIG51bWJlci5cbiAqIEJ1ZmZlci5mcm9tKHN0clssIGVuY29kaW5nXSlcbiAqIEJ1ZmZlci5mcm9tKGFycmF5KVxuICogQnVmZmVyLmZyb20oYnVmZmVyKVxuICogQnVmZmVyLmZyb20oYXJyYXlCdWZmZXJbLCBieXRlT2Zmc2V0WywgbGVuZ3RoXV0pXG4gKiovXG5CdWZmZXIuZnJvbSA9IGZ1bmN0aW9uICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBmcm9tKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIE5vdGU6IENoYW5nZSBwcm90b3R5cGUgKmFmdGVyKiBCdWZmZXIuZnJvbSBpcyBkZWZpbmVkIHRvIHdvcmthcm91bmQgQ2hyb21lIGJ1Zzpcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL3B1bGwvMTQ4XG5CdWZmZXIucHJvdG90eXBlLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlXG5CdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxuXG5mdW5jdGlvbiBhc3NlcnRTaXplIChzaXplKSB7XG4gIGlmICh0eXBlb2Ygc2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IGJlIGEgbnVtYmVyJylcbiAgfSBlbHNlIGlmIChzaXplIDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInNpemVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBuZWdhdGl2ZScpXG4gIH1cbn1cblxuZnVuY3Rpb24gYWxsb2MgKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgaWYgKHNpemUgPD0gMCkge1xuICAgIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbiAgfVxuICBpZiAoZmlsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gT25seSBwYXkgYXR0ZW50aW9uIHRvIGVuY29kaW5nIGlmIGl0J3MgYSBzdHJpbmcuIFRoaXNcbiAgICAvLyBwcmV2ZW50cyBhY2NpZGVudGFsbHkgc2VuZGluZyBpbiBhIG51bWJlciB0aGF0IHdvdWxkXG4gICAgLy8gYmUgaW50ZXJwcmV0dGVkIGFzIGEgc3RhcnQgb2Zmc2V0LlxuICAgIHJldHVybiB0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnXG4gICAgICA/IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwsIGVuY29kaW5nKVxuICAgICAgOiBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsKVxuICB9XG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSlcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiBhbGxvYyhzaXplWywgZmlsbFssIGVuY29kaW5nXV0pXG4gKiovXG5CdWZmZXIuYWxsb2MgPSBmdW5jdGlvbiAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGFsbG9jKHNpemUsIGZpbGwsIGVuY29kaW5nKVxufVxuXG5mdW5jdGlvbiBhbGxvY1Vuc2FmZSAoc2l6ZSkge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIHJldHVybiBjcmVhdGVCdWZmZXIoc2l6ZSA8IDAgPyAwIDogY2hlY2tlZChzaXplKSB8IDApXG59XG5cbi8qKlxuICogRXF1aXZhbGVudCB0byBCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqICovXG5CdWZmZXIuYWxsb2NVbnNhZmUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cbi8qKlxuICogRXF1aXZhbGVudCB0byBTbG93QnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZVNsb3cgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICByZXR1cm4gYWxsb2NVbnNhZmUoc2l6ZSlcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICB9XG5cbiAgaWYgKCFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImVuY29kaW5nXCIgbXVzdCBiZSBhIHZhbGlkIHN0cmluZyBlbmNvZGluZycpXG4gIH1cblxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG5cbiAgdmFyIGFjdHVhbCA9IGJ1Zi53cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuXG4gIGlmIChhY3R1YWwgIT09IGxlbmd0aCkge1xuICAgIC8vIFdyaXRpbmcgYSBoZXggc3RyaW5nLCBmb3IgZXhhbXBsZSwgdGhhdCBjb250YWlucyBpbnZhbGlkIGNoYXJhY3RlcnMgd2lsbFxuICAgIC8vIGNhdXNlIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGZpcnN0IGludmFsaWQgY2hhcmFjdGVyIHRvIGJlIGlnbm9yZWQuIChlLmcuXG4gICAgLy8gJ2FieHhjZCcgd2lsbCBiZSB0cmVhdGVkIGFzICdhYicpXG4gICAgYnVmID0gYnVmLnNsaWNlKDAsIGFjdHVhbClcbiAgfVxuXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAoYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aCA8IDAgPyAwIDogY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIGJ1ZltpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlCdWZmZXIgKGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpIHtcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwIHx8IGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0KSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ29mZnNldFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIGlmIChhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCArIChsZW5ndGggfHwgMCkpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnbGVuZ3RoXFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgdmFyIGJ1ZlxuICBpZiAoYnl0ZU9mZnNldCA9PT0gdW5kZWZpbmVkICYmIGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXkpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldClcbiAgfSBlbHNlIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKVxuICB9XG5cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tT2JqZWN0IChvYmopIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihvYmopKSB7XG4gICAgdmFyIGxlbiA9IGNoZWNrZWQob2JqLmxlbmd0aCkgfCAwXG4gICAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW4pXG5cbiAgICBpZiAoYnVmLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGJ1ZlxuICAgIH1cblxuICAgIG9iai5jb3B5KGJ1ZiwgMCwgMCwgbGVuKVxuICAgIHJldHVybiBidWZcbiAgfVxuXG4gIGlmIChvYmopIHtcbiAgICBpZiAoaXNBcnJheUJ1ZmZlclZpZXcob2JqKSB8fCAnbGVuZ3RoJyBpbiBvYmopIHtcbiAgICAgIGlmICh0eXBlb2Ygb2JqLmxlbmd0aCAhPT0gJ251bWJlcicgfHwgbnVtYmVySXNOYU4ob2JqLmxlbmd0aCkpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcigwKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqKVxuICAgIH1cblxuICAgIGlmIChvYmoudHlwZSA9PT0gJ0J1ZmZlcicgJiYgQXJyYXkuaXNBcnJheShvYmouZGF0YSkpIHtcbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iai5kYXRhKVxuICAgIH1cbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcsIEJ1ZmZlciwgQXJyYXlCdWZmZXIsIEFycmF5LCBvciBhcnJheS1saWtlIG9iamVjdC4nKVxufVxuXG5mdW5jdGlvbiBjaGVja2VkIChsZW5ndGgpIHtcbiAgLy8gTm90ZTogY2Fubm90IHVzZSBgbGVuZ3RoIDwgS19NQVhfTEVOR1RIYCBoZXJlIGJlY2F1c2UgdGhhdCBmYWlscyB3aGVuXG4gIC8vIGxlbmd0aCBpcyBOYU4gKHdoaWNoIGlzIG90aGVyd2lzZSBjb2VyY2VkIHRvIHplcm8uKVxuICBpZiAobGVuZ3RoID49IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIGFsbG9jYXRlIEJ1ZmZlciBsYXJnZXIgdGhhbiBtYXhpbXVtICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICdzaXplOiAweCcgKyBLX01BWF9MRU5HVEgudG9TdHJpbmcoMTYpICsgJyBieXRlcycpXG4gIH1cbiAgcmV0dXJuIGxlbmd0aCB8IDBcbn1cblxuZnVuY3Rpb24gU2xvd0J1ZmZlciAobGVuZ3RoKSB7XG4gIGlmICgrbGVuZ3RoICE9IGxlbmd0aCkgeyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIGVxZXFlcVxuICAgIGxlbmd0aCA9IDBcbiAgfVxuICByZXR1cm4gQnVmZmVyLmFsbG9jKCtsZW5ndGgpXG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIGlzQnVmZmVyIChiKSB7XG4gIHJldHVybiBiICE9IG51bGwgJiYgYi5faXNCdWZmZXIgPT09IHRydWVcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlIChhLCBiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGEpIHx8ICFCdWZmZXIuaXNCdWZmZXIoYikpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgbXVzdCBiZSBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChhID09PSBiKSByZXR1cm4gMFxuXG4gIHZhciB4ID0gYS5sZW5ndGhcbiAgdmFyIHkgPSBiLmxlbmd0aFxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldXG4gICAgICB5ID0gYltpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbkJ1ZmZlci5pc0VuY29kaW5nID0gZnVuY3Rpb24gaXNFbmNvZGluZyAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnbGF0aW4xJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiBjb25jYXQgKGxpc3QsIGxlbmd0aCkge1xuICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIEJ1ZmZlci5hbGxvYygwKVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBsZW5ndGggKz0gbGlzdFtpXS5sZW5ndGhcbiAgICB9XG4gIH1cblxuICB2YXIgYnVmZmVyID0gQnVmZmVyLmFsbG9jVW5zYWZlKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgYnVmID0gbGlzdFtpXVxuICAgIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gICAgfVxuICAgIGJ1Zi5jb3B5KGJ1ZmZlciwgcG9zKVxuICAgIHBvcyArPSBidWYubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZmZlclxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcubGVuZ3RoXG4gIH1cbiAgaWYgKGlzQXJyYXlCdWZmZXJWaWV3KHN0cmluZykgfHwgaXNBcnJheUJ1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmdcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAgLy8gQ29lcmNlIHRvIE51bWJlci5cbiAgaWYgKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKSB7XG4gICAgLy8gYnl0ZU9mZnNldDogaXQgaXQncyB1bmRlZmluZWQsIG51bGwsIE5hTiwgXCJmb29cIiwgZXRjLCBzZWFyY2ggd2hvbGUgYnVmZmVyXG4gICAgYnl0ZU9mZnNldCA9IGRpciA/IDAgOiAoYnVmZmVyLmxlbmd0aCAtIDEpXG4gIH1cblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldDogbmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoICsgYnl0ZU9mZnNldFxuICBpZiAoYnl0ZU9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSB7XG4gICAgaWYgKGRpcikgcmV0dXJuIC0xXG4gICAgZWxzZSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCAtIDFcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgMCkge1xuICAgIGlmIChkaXIpIGJ5dGVPZmZzZXQgPSAwXG4gICAgZWxzZSByZXR1cm4gLTFcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSB2YWxcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHNlYXJjaCBlaXRoZXIgaW5kZXhPZiAoaWYgZGlyIGlzIHRydWUpIG9yIGxhc3RJbmRleE9mXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIFNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAweEZGIC8vIFNlYXJjaCBmb3IgYSBieXRlIHZhbHVlIFswLTI1NV1cbiAgICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChzdHJMZW4gJSAyICE9PSAwKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChudW1iZXJJc05hTihwYXJzZWQpKSByZXR1cm4gaVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IHBhcnNlZFxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGFzY2lpV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gbGF0aW4xV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGJhc2U2NFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiB1Y3MyV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcpXG4gIGlmIChvZmZzZXQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgb2Zmc2V0WywgbGVuZ3RoXVssIGVuY29kaW5nXSlcbiAgfSBlbHNlIGlmIChpc0Zpbml0ZShvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCA+Pj4gMFxuICAgICAgaWYgKGVuY29kaW5nID09PSB1bmRlZmluZWQpIGVuY29kaW5nID0gJ3V0ZjgnXG4gICAgfSBlbHNlIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ0J1ZmZlci53cml0ZShzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXRbLCBsZW5ndGhdKSBpcyBubyBsb25nZXIgc3VwcG9ydGVkJ1xuICAgIClcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdBdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIC8vIFdhcm5pbmc6IG1heExlbmd0aCBub3QgdGFrZW4gaW50byBhY2NvdW50IGluIGJhc2U2NFdyaXRlXG4gICAgICAgIHJldHVybiBiYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdWNzMldyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuZnVuY3Rpb24gYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIHV0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcbiAgdmFyIHJlcyA9IFtdXG5cbiAgdmFyIGkgPSBzdGFydFxuICB3aGlsZSAoaSA8IGVuZCkge1xuICAgIHZhciBmaXJzdEJ5dGUgPSBidWZbaV1cbiAgICB2YXIgY29kZVBvaW50ID0gbnVsbFxuICAgIHZhciBieXRlc1BlclNlcXVlbmNlID0gKGZpcnN0Qnl0ZSA+IDB4RUYpID8gNFxuICAgICAgOiAoZmlyc3RCeXRlID4gMHhERikgPyAzXG4gICAgICA6IChmaXJzdEJ5dGUgPiAweEJGKSA/IDJcbiAgICAgIDogMVxuXG4gICAgaWYgKGkgKyBieXRlc1BlclNlcXVlbmNlIDw9IGVuZCkge1xuICAgICAgdmFyIHNlY29uZEJ5dGUsIHRoaXJkQnl0ZSwgZm91cnRoQnl0ZSwgdGVtcENvZGVQb2ludFxuXG4gICAgICBzd2l0Y2ggKGJ5dGVzUGVyU2VxdWVuY2UpIHtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgIGlmIChmaXJzdEJ5dGUgPCAweDgwKSB7XG4gICAgICAgICAgICBjb2RlUG9pbnQgPSBmaXJzdEJ5dGVcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHgxRikgPDwgMHg2IHwgKHNlY29uZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4QyB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKHRoaXJkQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0ZGICYmICh0ZW1wQ29kZVBvaW50IDwgMHhEODAwIHx8IHRlbXBDb2RlUG9pbnQgPiAweERGRkYpKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSA0OlxuICAgICAgICAgIHNlY29uZEJ5dGUgPSBidWZbaSArIDFdXG4gICAgICAgICAgdGhpcmRCeXRlID0gYnVmW2kgKyAyXVxuICAgICAgICAgIGZvdXJ0aEJ5dGUgPSBidWZbaSArIDNdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwICYmIChmb3VydGhCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweDEyIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweEMgfCAodGhpcmRCeXRlICYgMHgzRikgPDwgMHg2IHwgKGZvdXJ0aEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweEZGRkYgJiYgdGVtcENvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICAgICAgICAgIGNvZGVQb2ludCA9IHRlbXBDb2RlUG9pbnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGVQb2ludCA9PT0gbnVsbCkge1xuICAgICAgLy8gd2UgZGlkIG5vdCBnZW5lcmF0ZSBhIHZhbGlkIGNvZGVQb2ludCBzbyBpbnNlcnQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQgY2hhciAoVStGRkZEKSBhbmQgYWR2YW5jZSBvbmx5IDEgYnl0ZVxuICAgICAgY29kZVBvaW50ID0gMHhGRkZEXG4gICAgICBieXRlc1BlclNlcXVlbmNlID0gMVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50ID4gMHhGRkZGKSB7XG4gICAgICAvLyBlbmNvZGUgdG8gdXRmMTYgKHN1cnJvZ2F0ZSBwYWlyIGRhbmNlKVxuICAgICAgY29kZVBvaW50IC09IDB4MTAwMDBcbiAgICAgIHJlcy5wdXNoKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMClcbiAgICAgIGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGXG4gICAgfVxuXG4gICAgcmVzLnB1c2goY29kZVBvaW50KVxuICAgIGkgKz0gYnl0ZXNQZXJTZXF1ZW5jZVxuICB9XG5cbiAgcmV0dXJuIGRlY29kZUNvZGVQb2ludHNBcnJheShyZXMpXG59XG5cbi8vIEJhc2VkIG9uIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIyNzQ3MjcyLzY4MDc0MiwgdGhlIGJyb3dzZXIgd2l0aFxuLy8gdGhlIGxvd2VzdCBsaW1pdCBpcyBDaHJvbWUsIHdpdGggMHgxMDAwMCBhcmdzLlxuLy8gV2UgZ28gMSBtYWduaXR1ZGUgbGVzcywgZm9yIHNhZmV0eVxudmFyIE1BWF9BUkdVTUVOVFNfTEVOR1RIID0gMHgxMDAwXG5cbmZ1bmN0aW9uIGRlY29kZUNvZGVQb2ludHNBcnJheSAoY29kZVBvaW50cykge1xuICB2YXIgbGVuID0gY29kZVBvaW50cy5sZW5ndGhcbiAgaWYgKGxlbiA8PSBNQVhfQVJHVU1FTlRTX0xFTkdUSCkge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY29kZVBvaW50cykgLy8gYXZvaWQgZXh0cmEgc2xpY2UoKVxuICB9XG5cbiAgLy8gRGVjb2RlIGluIGNodW5rcyB0byBhdm9pZCBcImNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiLlxuICB2YXIgcmVzID0gJydcbiAgdmFyIGkgPSAwXG4gIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoXG4gICAgICBTdHJpbmcsXG4gICAgICBjb2RlUG9pbnRzLnNsaWNlKGksIGkgKz0gTUFYX0FSR1VNRU5UU19MRU5HVEgpXG4gICAgKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0gJiAweDdGKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gbGF0aW4xU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiB1dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIChieXRlc1tpICsgMV0gKiAyNTYpKVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWYgPSB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIG5ld0J1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBuZXdCdWZcbn1cblxuLypcbiAqIE5lZWQgdG8gbWFrZSBzdXJlIHRoYXQgYnVmZmVyIGlzbid0IHRyeWluZyB0byB3cml0ZSBvdXQgb2YgYm91bmRzLlxuICovXG5mdW5jdGlvbiBjaGVja09mZnNldCAob2Zmc2V0LCBleHQsIGxlbmd0aCkge1xuICBpZiAoKG9mZnNldCAlIDEpICE9PSAwIHx8IG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdvZmZzZXQgaXMgbm90IHVpbnQnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gbGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVHJ5aW5nIHRvIGFjY2VzcyBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRMRSA9IGZ1bmN0aW9uIHJlYWRVSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF1cbiAgdmFyIG11bCA9IDFcbiAgd2hpbGUgKGJ5dGVMZW5ndGggPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIHJlYWRVSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCA4KSB8IHRoaXNbb2Zmc2V0ICsgMV1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiByZWFkVUludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICgodGhpc1tvZmZzZXRdKSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikpICtcbiAgICAgICh0aGlzW29mZnNldCArIDNdICogMHgxMDAwMDAwKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50QkUgPSBmdW5jdGlvbiByZWFkSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoXG4gIHZhciBtdWwgPSAxXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIC0taV1cbiAgd2hpbGUgKGkgPiAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgLS1pXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiByZWFkSW50OCAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkJFID0gZnVuY3Rpb24gcmVhZEludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldCArIDFdIHwgKHRoaXNbb2Zmc2V0XSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyTEUgPSBmdW5jdGlvbiByZWFkSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgMjQpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRMRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdExFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiByZWFkRmxvYXRCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiByZWFkRG91YmxlQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgOCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgNTIsIDgpXG59XG5cbmZ1bmN0aW9uIGNoZWNrSW50IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJidWZmZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludEJFID0gZnVuY3Rpb24gd3JpdGVVSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4ZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweGZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweGZmZmZmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gMFxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgLSAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpICsgMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweDdmLCAtMHg4MClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5mdW5jdGlvbiBjaGVja0lFRUU3NTQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgNCwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdExFID0gZnVuY3Rpb24gd3JpdGVGbG9hdExFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDgsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cbiAgaWVlZTc1NC53cml0ZShidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG4gIHJldHVybiBvZmZzZXQgKyA4XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVMRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gY29weSh0YXJnZXRCdWZmZXIsIHRhcmdldFN0YXJ0PTAsIHNvdXJjZVN0YXJ0PTAsIHNvdXJjZUVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSAodGFyZ2V0LCB0YXJnZXRTdGFydCwgc3RhcnQsIGVuZCkge1xuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0U3RhcnQgPj0gdGFyZ2V0Lmxlbmd0aCkgdGFyZ2V0U3RhcnQgPSB0YXJnZXQubGVuZ3RoXG4gIGlmICghdGFyZ2V0U3RhcnQpIHRhcmdldFN0YXJ0ID0gMFxuICBpZiAoZW5kID4gMCAmJiBlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICAvLyBDb3B5IDAgYnl0ZXM7IHdlJ3JlIGRvbmVcbiAgaWYgKGVuZCA9PT0gc3RhcnQpIHJldHVybiAwXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgaWYgKHRhcmdldFN0YXJ0IDwgMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgfVxuICBpZiAoc3RhcnQgPCAwIHx8IHN0YXJ0ID49IHRoaXMubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChlbmQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignc291cmNlRW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIC8vIEFyZSB3ZSBvb2I/XG4gIGlmIChlbmQgPiB0aGlzLmxlbmd0aCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCA8IGVuZCAtIHN0YXJ0KSB7XG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0ICsgc3RhcnRcbiAgfVxuXG4gIHZhciBsZW4gPSBlbmQgLSBzdGFydFxuICB2YXIgaVxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAoaSA9IGxlbiAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIGlmIChsZW4gPCAxMDAwKSB7XG4gICAgLy8gYXNjZW5kaW5nIGNvcHkgZnJvbSBzdGFydFxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksXG4gICAgICB0YXJnZXRTdGFydFxuICAgIClcbiAgfVxuXG4gIHJldHVybiBsZW5cbn1cblxuLy8gVXNhZ2U6XG4vLyAgICBidWZmZXIuZmlsbChudW1iZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKGJ1ZmZlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoc3RyaW5nWywgb2Zmc2V0WywgZW5kXV1bLCBlbmNvZGluZ10pXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiBmaWxsICh2YWwsIHN0YXJ0LCBlbmQsIGVuY29kaW5nKSB7XG4gIC8vIEhhbmRsZSBzdHJpbmcgY2FzZXM6XG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIGlmICh0eXBlb2Ygc3RhcnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IHN0YXJ0XG4gICAgICBzdGFydCA9IDBcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZW5kID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBlbmRcbiAgICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gICAgfVxuICAgIGlmICh2YWwubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgY29kZSA9IHZhbC5jaGFyQ29kZUF0KDApXG4gICAgICBpZiAoY29kZSA8IDI1Nikge1xuICAgICAgICB2YWwgPSBjb2RlXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2VuY29kaW5nIG11c3QgYmUgYSBzdHJpbmcnKVxuICAgIH1cbiAgICBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJyAmJiAhQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMjU1XG4gIH1cblxuICAvLyBJbnZhbGlkIHJhbmdlcyBhcmUgbm90IHNldCB0byBhIGRlZmF1bHQsIHNvIGNhbiByYW5nZSBjaGVjayBlYXJseS5cbiAgaWYgKHN0YXJ0IDwgMCB8fCB0aGlzLmxlbmd0aCA8IHN0YXJ0IHx8IHRoaXMubGVuZ3RoIDwgZW5kKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ091dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN0YXJ0ID0gc3RhcnQgPj4+IDBcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyB0aGlzLmxlbmd0aCA6IGVuZCA+Pj4gMFxuXG4gIGlmICghdmFsKSB2YWwgPSAwXG5cbiAgdmFyIGlcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgICAgdGhpc1tpXSA9IHZhbFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSBCdWZmZXIuaXNCdWZmZXIodmFsKVxuICAgICAgPyB2YWxcbiAgICAgIDogbmV3IEJ1ZmZlcih2YWwsIGVuY29kaW5nKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSAwOyBpIDwgZW5kIC0gc3RhcnQ7ICsraSkge1xuICAgICAgdGhpc1tpICsgc3RhcnRdID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbnZhciBJTlZBTElEX0JBU0U2NF9SRSA9IC9bXisvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbi8vIEFycmF5QnVmZmVycyBmcm9tIGFub3RoZXIgY29udGV4dCAoaS5lLiBhbiBpZnJhbWUpIGRvIG5vdCBwYXNzIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2tcbi8vIGJ1dCB0aGV5IHNob3VsZCBiZSB0cmVhdGVkIGFzIHZhbGlkLiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNjZcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIgKG9iaikge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdBcnJheUJ1ZmZlcicgJiZcbiAgICAgIHR5cGVvZiBvYmouYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpXG59XG5cbi8vIE5vZGUgMC4xMCBzdXBwb3J0cyBgQXJyYXlCdWZmZXJgIGJ1dCBsYWNrcyBgQXJyYXlCdWZmZXIuaXNWaWV3YFxuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlclZpZXcgKG9iaikge1xuICByZXR1cm4gKHR5cGVvZiBBcnJheUJ1ZmZlci5pc1ZpZXcgPT09ICdmdW5jdGlvbicpICYmIEFycmF5QnVmZmVyLmlzVmlldyhvYmopXG59XG5cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPT0gb2JqIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbi8vIElmIG9iai5oYXNPd25Qcm9wZXJ0eSBoYXMgYmVlbiBvdmVycmlkZGVuLCB0aGVuIGNhbGxpbmdcbi8vIG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSB3aWxsIGJyZWFrLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vam95ZW50L25vZGUvaXNzdWVzLzE3MDdcbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocXMsIHNlcCwgZXEsIG9wdGlvbnMpIHtcbiAgc2VwID0gc2VwIHx8ICcmJztcbiAgZXEgPSBlcSB8fCAnPSc7XG4gIHZhciBvYmogPSB7fTtcblxuICBpZiAodHlwZW9mIHFzICE9PSAnc3RyaW5nJyB8fCBxcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgdmFyIHJlZ2V4cCA9IC9cXCsvZztcbiAgcXMgPSBxcy5zcGxpdChzZXApO1xuXG4gIHZhciBtYXhLZXlzID0gMTAwMDtcbiAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMubWF4S2V5cyA9PT0gJ251bWJlcicpIHtcbiAgICBtYXhLZXlzID0gb3B0aW9ucy5tYXhLZXlzO1xuICB9XG5cbiAgdmFyIGxlbiA9IHFzLmxlbmd0aDtcbiAgLy8gbWF4S2V5cyA8PSAwIG1lYW5zIHRoYXQgd2Ugc2hvdWxkIG5vdCBsaW1pdCBrZXlzIGNvdW50XG4gIGlmIChtYXhLZXlzID4gMCAmJiBsZW4gPiBtYXhLZXlzKSB7XG4gICAgbGVuID0gbWF4S2V5cztcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICB2YXIgeCA9IHFzW2ldLnJlcGxhY2UocmVnZXhwLCAnJTIwJyksXG4gICAgICAgIGlkeCA9IHguaW5kZXhPZihlcSksXG4gICAgICAgIGtzdHIsIHZzdHIsIGssIHY7XG5cbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIGtzdHIgPSB4LnN1YnN0cigwLCBpZHgpO1xuICAgICAgdnN0ciA9IHguc3Vic3RyKGlkeCArIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBrc3RyID0geDtcbiAgICAgIHZzdHIgPSAnJztcbiAgICB9XG5cbiAgICBrID0gZGVjb2RlVVJJQ29tcG9uZW50KGtzdHIpO1xuICAgIHYgPSBkZWNvZGVVUklDb21wb25lbnQodnN0cik7XG5cbiAgICBpZiAoIWhhc093blByb3BlcnR5KG9iaiwgaykpIHtcbiAgICAgIG9ialtrXSA9IHY7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KG9ialtrXSkpIHtcbiAgICAgIG9ialtrXS5wdXNoKHYpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmpba10gPSBbb2JqW2tdLCB2XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3RyaW5naWZ5UHJpbWl0aXZlID0gZnVuY3Rpb24odikge1xuICBzd2l0Y2ggKHR5cGVvZiB2KSB7XG4gICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIHJldHVybiB2O1xuXG4gICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICByZXR1cm4gdiA/ICd0cnVlJyA6ICdmYWxzZSc7XG5cbiAgICBjYXNlICdudW1iZXInOlxuICAgICAgcmV0dXJuIGlzRmluaXRlKHYpID8gdiA6ICcnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnJztcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmosIHNlcCwgZXEsIG5hbWUpIHtcbiAgc2VwID0gc2VwIHx8ICcmJztcbiAgZXEgPSBlcSB8fCAnPSc7XG4gIGlmIChvYmogPT09IG51bGwpIHtcbiAgICBvYmogPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gbWFwKG9iamVjdEtleXMob2JqKSwgZnVuY3Rpb24oaykge1xuICAgICAgdmFyIGtzID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShrKSkgKyBlcTtcbiAgICAgIGlmIChpc0FycmF5KG9ialtrXSkpIHtcbiAgICAgICAgcmV0dXJuIG1hcChvYmpba10sIGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKHYpKTtcbiAgICAgICAgfSkuam9pbihzZXApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmpba10pKTtcbiAgICAgIH1cbiAgICB9KS5qb2luKHNlcCk7XG5cbiAgfVxuXG4gIGlmICghbmFtZSkgcmV0dXJuICcnO1xuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShuYW1lKSkgKyBlcSArXG4gICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9iaikpO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbmZ1bmN0aW9uIG1hcCAoeHMsIGYpIHtcbiAgaWYgKHhzLm1hcCkgcmV0dXJuIHhzLm1hcChmKTtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVzLnB1c2goZih4c1tpXSwgaSkpO1xuICB9XG4gIHJldHVybiByZXM7XG59XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgcmVzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5kZWNvZGUgPSBleHBvcnRzLnBhcnNlID0gcmVxdWlyZSgnLi9kZWNvZGUnKTtcbmV4cG9ydHMuZW5jb2RlID0gZXhwb3J0cy5zdHJpbmdpZnkgPSByZXF1aXJlKCcuL2VuY29kZScpO1xuIiwiXHJcbi8qKlxyXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxyXG4gKi9cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG4gIG1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgYSBuZXcgYEVtaXR0ZXJgLlxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XHJcbiAgaWYgKG9iaikgcmV0dXJuIG1peGluKG9iaik7XHJcbn07XHJcblxyXG4vKipcclxuICogTWl4aW4gdGhlIGVtaXR0ZXIgcHJvcGVydGllcy5cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9ialxyXG4gKiBAcmV0dXJuIHtPYmplY3R9XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIG1peGluKG9iaikge1xyXG4gIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xyXG4gICAgb2JqW2tleV0gPSBFbWl0dGVyLnByb3RvdHlwZVtrZXldO1xyXG4gIH1cclxuICByZXR1cm4gb2JqO1xyXG59XHJcblxyXG4vKipcclxuICogTGlzdGVuIG9uIHRoZSBnaXZlbiBgZXZlbnRgIHdpdGggYGZuYC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUub24gPVxyXG5FbWl0dGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcclxuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcbiAgKHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdKVxyXG4gICAgLnB1c2goZm4pO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFkZHMgYW4gYGV2ZW50YCBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgaW52b2tlZCBhIHNpbmdsZVxyXG4gKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcclxuICBmdW5jdGlvbiBvbigpIHtcclxuICAgIHRoaXMub2ZmKGV2ZW50LCBvbik7XHJcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gIH1cclxuXHJcbiAgb24uZm4gPSBmbjtcclxuICB0aGlzLm9uKGV2ZW50LCBvbik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcclxuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9XHJcbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cclxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cclxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XHJcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG5cclxuICAvLyBhbGxcclxuICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gc3BlY2lmaWMgZXZlbnRcclxuICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcclxuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XHJcblxyXG4gIC8vIHJlbW92ZSBhbGwgaGFuZGxlcnNcclxuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcclxuICB2YXIgY2I7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcclxuICAgIGNiID0gY2FsbGJhY2tzW2ldO1xyXG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcclxuICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtNaXhlZH0gLi4uXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcclxuICAgICwgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcclxuXHJcbiAgaWYgKGNhbGxiYWNrcykge1xyXG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm4gYXJyYXkgb2YgY2FsbGJhY2tzIGZvciBgZXZlbnRgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHJldHVybiB7QXJyYXl9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xyXG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICByZXR1cm4gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuICByZXR1cm4gISEgdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcclxufTtcclxuIiwiLyoqXG4gKiBSb290IHJlZmVyZW5jZSBmb3IgaWZyYW1lcy5cbiAqL1xuXG52YXIgcm9vdDtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgeyAvLyBCcm93c2VyIHdpbmRvd1xuICByb290ID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gV2ViIFdvcmtlclxuICByb290ID0gc2VsZjtcbn0gZWxzZSB7IC8vIE90aGVyIGVudmlyb25tZW50c1xuICBjb25zb2xlLndhcm4oXCJVc2luZyBicm93c2VyLW9ubHkgdmVyc2lvbiBvZiBzdXBlcmFnZW50IGluIG5vbi1icm93c2VyIGVudmlyb25tZW50XCIpO1xuICByb290ID0gdGhpcztcbn1cblxudmFyIEVtaXR0ZXIgPSByZXF1aXJlKCdjb21wb25lbnQtZW1pdHRlcicpO1xudmFyIFJlcXVlc3RCYXNlID0gcmVxdWlyZSgnLi9yZXF1ZXN0LWJhc2UnKTtcbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vaXMtb2JqZWN0Jyk7XG52YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoJy4vaXMtZnVuY3Rpb24nKTtcbnZhciBSZXNwb25zZUJhc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlLWJhc2UnKTtcbnZhciBzaG91bGRSZXRyeSA9IHJlcXVpcmUoJy4vc2hvdWxkLXJldHJ5Jyk7XG5cbi8qKlxuICogTm9vcC5cbiAqL1xuXG5mdW5jdGlvbiBub29wKCl7fTtcblxuLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RgLlxuICovXG5cbnZhciByZXF1ZXN0ID0gZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obWV0aG9kLCB1cmwpIHtcbiAgLy8gY2FsbGJhY2tcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHVybCkge1xuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpLmVuZCh1cmwpO1xuICB9XG5cbiAgLy8gdXJsIGZpcnN0XG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdCgnR0VUJywgbWV0aG9kKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KG1ldGhvZCwgdXJsKTtcbn1cblxuZXhwb3J0cy5SZXF1ZXN0ID0gUmVxdWVzdDtcblxuLyoqXG4gKiBEZXRlcm1pbmUgWEhSLlxuICovXG5cbnJlcXVlc3QuZ2V0WEhSID0gZnVuY3Rpb24gKCkge1xuICBpZiAocm9vdC5YTUxIdHRwUmVxdWVzdFxuICAgICAgJiYgKCFyb290LmxvY2F0aW9uIHx8ICdmaWxlOicgIT0gcm9vdC5sb2NhdGlvbi5wcm90b2NvbFxuICAgICAgICAgIHx8ICFyb290LkFjdGl2ZVhPYmplY3QpKSB7XG4gICAgcmV0dXJuIG5ldyBYTUxIdHRwUmVxdWVzdDtcbiAgfSBlbHNlIHtcbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01pY3Jvc29mdC5YTUxIVFRQJyk7IH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjYuMCcpOyB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUC4zLjAnKTsgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAnKTsgfSBjYXRjaChlKSB7fVxuICB9XG4gIHRocm93IEVycm9yKFwiQnJvd3Nlci1vbmx5IHZlcmlzb24gb2Ygc3VwZXJhZ2VudCBjb3VsZCBub3QgZmluZCBYSFJcIik7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZSwgYWRkZWQgdG8gc3VwcG9ydCBJRS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxudmFyIHRyaW0gPSAnJy50cmltXG4gID8gZnVuY3Rpb24ocykgeyByZXR1cm4gcy50cmltKCk7IH1cbiAgOiBmdW5jdGlvbihzKSB7IHJldHVybiBzLnJlcGxhY2UoLyheXFxzKnxcXHMqJCkvZywgJycpOyB9O1xuXG4vKipcbiAqIFNlcmlhbGl6ZSB0aGUgZ2l2ZW4gYG9iamAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2VyaWFsaXplKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gIHZhciBwYWlycyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgb2JqW2tleV0pO1xuICB9XG4gIHJldHVybiBwYWlycy5qb2luKCcmJyk7XG59XG5cbi8qKlxuICogSGVscHMgJ3NlcmlhbGl6ZScgd2l0aCBzZXJpYWxpemluZyBhcnJheXMuXG4gKiBNdXRhdGVzIHRoZSBwYWlycyBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBwYWlyc1xuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKi9cblxuZnVuY3Rpb24gcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgdmFsKSB7XG4gIGlmICh2YWwgIT0gbnVsbCkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgdik7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbCkpIHtcbiAgICAgIGZvcih2YXIgc3Via2V5IGluIHZhbCkge1xuICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5ICsgJ1snICsgc3Via2V5ICsgJ10nLCB2YWxbc3Via2V5XSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhaXJzLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSlcbiAgICAgICAgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsKSk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHZhbCA9PT0gbnVsbCkge1xuICAgIHBhaXJzLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSkpO1xuICB9XG59XG5cbi8qKlxuICogRXhwb3NlIHNlcmlhbGl6YXRpb24gbWV0aG9kLlxuICovXG5cbiByZXF1ZXN0LnNlcmlhbGl6ZU9iamVjdCA9IHNlcmlhbGl6ZTtcblxuIC8qKlxuICAqIFBhcnNlIHRoZSBnaXZlbiB4LXd3dy1mb3JtLXVybGVuY29kZWQgYHN0cmAuXG4gICpcbiAgKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gICogQHJldHVybiB7T2JqZWN0fVxuICAqIEBhcGkgcHJpdmF0ZVxuICAqL1xuXG5mdW5jdGlvbiBwYXJzZVN0cmluZyhzdHIpIHtcbiAgdmFyIG9iaiA9IHt9O1xuICB2YXIgcGFpcnMgPSBzdHIuc3BsaXQoJyYnKTtcbiAgdmFyIHBhaXI7XG4gIHZhciBwb3M7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhaXJzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgcGFpciA9IHBhaXJzW2ldO1xuICAgIHBvcyA9IHBhaXIuaW5kZXhPZignPScpO1xuICAgIGlmIChwb3MgPT0gLTEpIHtcbiAgICAgIG9ialtkZWNvZGVVUklDb21wb25lbnQocGFpcildID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtkZWNvZGVVUklDb21wb25lbnQocGFpci5zbGljZSgwLCBwb3MpKV0gPVxuICAgICAgICBkZWNvZGVVUklDb21wb25lbnQocGFpci5zbGljZShwb3MgKyAxKSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBFeHBvc2UgcGFyc2VyLlxuICovXG5cbnJlcXVlc3QucGFyc2VTdHJpbmcgPSBwYXJzZVN0cmluZztcblxuLyoqXG4gKiBEZWZhdWx0IE1JTUUgdHlwZSBtYXAuXG4gKlxuICogICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICovXG5cbnJlcXVlc3QudHlwZXMgPSB7XG4gIGh0bWw6ICd0ZXh0L2h0bWwnLFxuICBqc29uOiAnYXBwbGljYXRpb24vanNvbicsXG4gIHhtbDogJ2FwcGxpY2F0aW9uL3htbCcsXG4gIHVybGVuY29kZWQ6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAnZm9ybSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAnZm9ybS1kYXRhJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbn07XG5cbi8qKlxuICogRGVmYXVsdCBzZXJpYWxpemF0aW9uIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24ob2JqKXtcbiAqICAgICAgIHJldHVybiAnZ2VuZXJhdGVkIHhtbCBoZXJlJztcbiAqICAgICB9O1xuICpcbiAqL1xuXG4gcmVxdWVzdC5zZXJpYWxpemUgPSB7XG4gICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogc2VyaWFsaXplLFxuICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeVxuIH07XG5cbiAvKipcbiAgKiBEZWZhdWx0IHBhcnNlcnMuXG4gICpcbiAgKiAgICAgc3VwZXJhZ2VudC5wYXJzZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihzdHIpe1xuICAqICAgICAgIHJldHVybiB7IG9iamVjdCBwYXJzZWQgZnJvbSBzdHIgfTtcbiAgKiAgICAgfTtcbiAgKlxuICAqL1xuXG5yZXF1ZXN0LnBhcnNlID0ge1xuICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogcGFyc2VTdHJpbmcsXG4gICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5wYXJzZVxufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gaGVhZGVyIGBzdHJgIGludG9cbiAqIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtYXBwZWQgZmllbGRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlSGVhZGVyKHN0cikge1xuICB2YXIgbGluZXMgPSBzdHIuc3BsaXQoL1xccj9cXG4vKTtcbiAgdmFyIGZpZWxkcyA9IHt9O1xuICB2YXIgaW5kZXg7XG4gIHZhciBsaW5lO1xuICB2YXIgZmllbGQ7XG4gIHZhciB2YWw7XG5cbiAgbGluZXMucG9wKCk7IC8vIHRyYWlsaW5nIENSTEZcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gbGluZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBsaW5lID0gbGluZXNbaV07XG4gICAgaW5kZXggPSBsaW5lLmluZGV4T2YoJzonKTtcbiAgICBmaWVsZCA9IGxpbmUuc2xpY2UoMCwgaW5kZXgpLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFsID0gdHJpbShsaW5lLnNsaWNlKGluZGV4ICsgMSkpO1xuICAgIGZpZWxkc1tmaWVsZF0gPSB2YWw7XG4gIH1cblxuICByZXR1cm4gZmllbGRzO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGBtaW1lYCBpcyBqc29uIG9yIGhhcyAranNvbiBzdHJ1Y3R1cmVkIHN5bnRheCBzdWZmaXguXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1pbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc0pTT04obWltZSkge1xuICByZXR1cm4gL1tcXC8rXWpzb25cXGIvLnRlc3QobWltZSk7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVzcG9uc2VgIHdpdGggdGhlIGdpdmVuIGB4aHJgLlxuICpcbiAqICAtIHNldCBmbGFncyAoLm9rLCAuZXJyb3IsIGV0YylcbiAqICAtIHBhcnNlIGhlYWRlclxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICBBbGlhc2luZyBgc3VwZXJhZ2VudGAgYXMgYHJlcXVlc3RgIGlzIG5pY2U6XG4gKlxuICogICAgICByZXF1ZXN0ID0gc3VwZXJhZ2VudDtcbiAqXG4gKiAgV2UgY2FuIHVzZSB0aGUgcHJvbWlzZS1saWtlIEFQSSwgb3IgcGFzcyBjYWxsYmFja3M6XG4gKlxuICogICAgICByZXF1ZXN0LmdldCgnLycpLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICogICAgICByZXF1ZXN0LmdldCgnLycsIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIFNlbmRpbmcgZGF0YSBjYW4gYmUgY2hhaW5lZDpcbiAqXG4gKiAgICAgIHJlcXVlc3RcbiAqICAgICAgICAucG9zdCgnL3VzZXInKVxuICogICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgIC5lbmQoZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgT3IgcGFzc2VkIHRvIGAuc2VuZCgpYDpcbiAqXG4gKiAgICAgIHJlcXVlc3RcbiAqICAgICAgICAucG9zdCgnL3VzZXInKVxuICogICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9LCBmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5wb3N0KClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicsIHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgIC5lbmQoZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiBPciBmdXJ0aGVyIHJlZHVjZWQgdG8gYSBzaW5nbGUgY2FsbCBmb3Igc2ltcGxlIGNhc2VzOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicsIHsgbmFtZTogJ3RqJyB9LCBmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIEBwYXJhbSB7WE1MSFRUUFJlcXVlc3R9IHhoclxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIFJlc3BvbnNlKHJlcSkge1xuICB0aGlzLnJlcSA9IHJlcTtcbiAgdGhpcy54aHIgPSB0aGlzLnJlcS54aHI7XG4gIC8vIHJlc3BvbnNlVGV4dCBpcyBhY2Nlc3NpYmxlIG9ubHkgaWYgcmVzcG9uc2VUeXBlIGlzICcnIG9yICd0ZXh0JyBhbmQgb24gb2xkZXIgYnJvd3NlcnNcbiAgdGhpcy50ZXh0ID0gKCh0aGlzLnJlcS5tZXRob2QgIT0nSEVBRCcgJiYgKHRoaXMueGhyLnJlc3BvbnNlVHlwZSA9PT0gJycgfHwgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndGV4dCcpKSB8fCB0eXBlb2YgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndW5kZWZpbmVkJylcbiAgICAgPyB0aGlzLnhoci5yZXNwb25zZVRleHRcbiAgICAgOiBudWxsO1xuICB0aGlzLnN0YXR1c1RleHQgPSB0aGlzLnJlcS54aHIuc3RhdHVzVGV4dDtcbiAgdmFyIHN0YXR1cyA9IHRoaXMueGhyLnN0YXR1cztcbiAgLy8gaGFuZGxlIElFOSBidWc6IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTAwNDY5NzIvbXNpZS1yZXR1cm5zLXN0YXR1cy1jb2RlLW9mLTEyMjMtZm9yLWFqYXgtcmVxdWVzdFxuICBpZiAoc3RhdHVzID09PSAxMjIzKSB7XG4gICAgICBzdGF0dXMgPSAyMDQ7XG4gIH1cbiAgdGhpcy5fc2V0U3RhdHVzUHJvcGVydGllcyhzdGF0dXMpO1xuICB0aGlzLmhlYWRlciA9IHRoaXMuaGVhZGVycyA9IHBhcnNlSGVhZGVyKHRoaXMueGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKTtcbiAgLy8gZ2V0QWxsUmVzcG9uc2VIZWFkZXJzIHNvbWV0aW1lcyBmYWxzZWx5IHJldHVybnMgXCJcIiBmb3IgQ09SUyByZXF1ZXN0cywgYnV0XG4gIC8vIGdldFJlc3BvbnNlSGVhZGVyIHN0aWxsIHdvcmtzLiBzbyB3ZSBnZXQgY29udGVudC10eXBlIGV2ZW4gaWYgZ2V0dGluZ1xuICAvLyBvdGhlciBoZWFkZXJzIGZhaWxzLlxuICB0aGlzLmhlYWRlclsnY29udGVudC10eXBlJ10gPSB0aGlzLnhoci5nZXRSZXNwb25zZUhlYWRlcignY29udGVudC10eXBlJyk7XG4gIHRoaXMuX3NldEhlYWRlclByb3BlcnRpZXModGhpcy5oZWFkZXIpO1xuXG4gIGlmIChudWxsID09PSB0aGlzLnRleHQgJiYgcmVxLl9yZXNwb25zZVR5cGUpIHtcbiAgICB0aGlzLmJvZHkgPSB0aGlzLnhoci5yZXNwb25zZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmJvZHkgPSB0aGlzLnJlcS5tZXRob2QgIT0gJ0hFQUQnXG4gICAgICA/IHRoaXMuX3BhcnNlQm9keSh0aGlzLnRleHQgPyB0aGlzLnRleHQgOiB0aGlzLnhoci5yZXNwb25zZSlcbiAgICAgIDogbnVsbDtcbiAgfVxufVxuXG5SZXNwb25zZUJhc2UoUmVzcG9uc2UucHJvdG90eXBlKTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgZ2l2ZW4gYm9keSBgc3RyYC5cbiAqXG4gKiBVc2VkIGZvciBhdXRvLXBhcnNpbmcgb2YgYm9kaWVzLiBQYXJzZXJzXG4gKiBhcmUgZGVmaW5lZCBvbiB0aGUgYHN1cGVyYWdlbnQucGFyc2VgIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS5fcGFyc2VCb2R5ID0gZnVuY3Rpb24oc3RyKXtcbiAgdmFyIHBhcnNlID0gcmVxdWVzdC5wYXJzZVt0aGlzLnR5cGVdO1xuICBpZih0aGlzLnJlcS5fcGFyc2VyKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxLl9wYXJzZXIodGhpcywgc3RyKTtcbiAgfVxuICBpZiAoIXBhcnNlICYmIGlzSlNPTih0aGlzLnR5cGUpKSB7XG4gICAgcGFyc2UgPSByZXF1ZXN0LnBhcnNlWydhcHBsaWNhdGlvbi9qc29uJ107XG4gIH1cbiAgcmV0dXJuIHBhcnNlICYmIHN0ciAmJiAoc3RyLmxlbmd0aCB8fCBzdHIgaW5zdGFuY2VvZiBPYmplY3QpXG4gICAgPyBwYXJzZShzdHIpXG4gICAgOiBudWxsO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYW4gYEVycm9yYCByZXByZXNlbnRhdGl2ZSBvZiB0aGlzIHJlc3BvbnNlLlxuICpcbiAqIEByZXR1cm4ge0Vycm9yfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXNwb25zZS5wcm90b3R5cGUudG9FcnJvciA9IGZ1bmN0aW9uKCl7XG4gIHZhciByZXEgPSB0aGlzLnJlcTtcbiAgdmFyIG1ldGhvZCA9IHJlcS5tZXRob2Q7XG4gIHZhciB1cmwgPSByZXEudXJsO1xuXG4gIHZhciBtc2cgPSAnY2Fubm90ICcgKyBtZXRob2QgKyAnICcgKyB1cmwgKyAnICgnICsgdGhpcy5zdGF0dXMgKyAnKSc7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IobXNnKTtcbiAgZXJyLnN0YXR1cyA9IHRoaXMuc3RhdHVzO1xuICBlcnIubWV0aG9kID0gbWV0aG9kO1xuICBlcnIudXJsID0gdXJsO1xuXG4gIHJldHVybiBlcnI7XG59O1xuXG4vKipcbiAqIEV4cG9zZSBgUmVzcG9uc2VgLlxuICovXG5cbnJlcXVlc3QuUmVzcG9uc2UgPSBSZXNwb25zZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXF1ZXN0YCB3aXRoIHRoZSBnaXZlbiBgbWV0aG9kYCBhbmQgYHVybGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXF1ZXN0KG1ldGhvZCwgdXJsKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fcXVlcnkgPSB0aGlzLl9xdWVyeSB8fCBbXTtcbiAgdGhpcy5tZXRob2QgPSBtZXRob2Q7XG4gIHRoaXMudXJsID0gdXJsO1xuICB0aGlzLmhlYWRlciA9IHt9OyAvLyBwcmVzZXJ2ZXMgaGVhZGVyIG5hbWUgY2FzZVxuICB0aGlzLl9oZWFkZXIgPSB7fTsgLy8gY29lcmNlcyBoZWFkZXIgbmFtZXMgdG8gbG93ZXJjYXNlXG4gIHRoaXMub24oJ2VuZCcsIGZ1bmN0aW9uKCl7XG4gICAgdmFyIGVyciA9IG51bGw7XG4gICAgdmFyIHJlcyA9IG51bGw7XG5cbiAgICB0cnkge1xuICAgICAgcmVzID0gbmV3IFJlc3BvbnNlKHNlbGYpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgZXJyID0gbmV3IEVycm9yKCdQYXJzZXIgaXMgdW5hYmxlIHRvIHBhcnNlIHRoZSByZXNwb25zZScpO1xuICAgICAgZXJyLnBhcnNlID0gdHJ1ZTtcbiAgICAgIGVyci5vcmlnaW5hbCA9IGU7XG4gICAgICAvLyBpc3N1ZSAjNjc1OiByZXR1cm4gdGhlIHJhdyByZXNwb25zZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xuICAgICAgaWYgKHNlbGYueGhyKSB7XG4gICAgICAgIC8vIGllOSBkb2Vzbid0IGhhdmUgJ3Jlc3BvbnNlJyBwcm9wZXJ0eVxuICAgICAgICBlcnIucmF3UmVzcG9uc2UgPSB0eXBlb2Ygc2VsZi54aHIucmVzcG9uc2VUeXBlID09ICd1bmRlZmluZWQnID8gc2VsZi54aHIucmVzcG9uc2VUZXh0IDogc2VsZi54aHIucmVzcG9uc2U7XG4gICAgICAgIC8vIGlzc3VlICM4NzY6IHJldHVybiB0aGUgaHR0cCBzdGF0dXMgY29kZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xuICAgICAgICBlcnIuc3RhdHVzID0gc2VsZi54aHIuc3RhdHVzID8gc2VsZi54aHIuc3RhdHVzIDogbnVsbDtcbiAgICAgICAgZXJyLnN0YXR1c0NvZGUgPSBlcnIuc3RhdHVzOyAvLyBiYWNrd2FyZHMtY29tcGF0IG9ubHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVyci5yYXdSZXNwb25zZSA9IG51bGw7XG4gICAgICAgIGVyci5zdGF0dXMgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2VsZi5jYWxsYmFjayhlcnIpO1xuICAgIH1cblxuICAgIHNlbGYuZW1pdCgncmVzcG9uc2UnLCByZXMpO1xuXG4gICAgdmFyIG5ld19lcnI7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghc2VsZi5faXNSZXNwb25zZU9LKHJlcykpIHtcbiAgICAgICAgbmV3X2VyciA9IG5ldyBFcnJvcihyZXMuc3RhdHVzVGV4dCB8fCAnVW5zdWNjZXNzZnVsIEhUVFAgcmVzcG9uc2UnKTtcbiAgICAgICAgbmV3X2Vyci5vcmlnaW5hbCA9IGVycjtcbiAgICAgICAgbmV3X2Vyci5yZXNwb25zZSA9IHJlcztcbiAgICAgICAgbmV3X2Vyci5zdGF0dXMgPSByZXMuc3RhdHVzO1xuICAgICAgfVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgbmV3X2VyciA9IGU7IC8vICM5ODUgdG91Y2hpbmcgcmVzIG1heSBjYXVzZSBJTlZBTElEX1NUQVRFX0VSUiBvbiBvbGQgQW5kcm9pZFxuICAgIH1cblxuICAgIC8vICMxMDAwIGRvbid0IGNhdGNoIGVycm9ycyBmcm9tIHRoZSBjYWxsYmFjayB0byBhdm9pZCBkb3VibGUgY2FsbGluZyBpdFxuICAgIGlmIChuZXdfZXJyKSB7XG4gICAgICBzZWxmLmNhbGxiYWNrKG5ld19lcnIsIHJlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGYuY2FsbGJhY2sobnVsbCwgcmVzKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIE1peGluIGBFbWl0dGVyYCBhbmQgYFJlcXVlc3RCYXNlYC5cbiAqL1xuXG5FbWl0dGVyKFJlcXVlc3QucHJvdG90eXBlKTtcblJlcXVlc3RCYXNlKFJlcXVlc3QucHJvdG90eXBlKTtcblxuLyoqXG4gKiBTZXQgQ29udGVudC1UeXBlIHRvIGB0eXBlYCwgbWFwcGluZyB2YWx1ZXMgZnJvbSBgcmVxdWVzdC50eXBlc2AuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICBzdXBlcmFnZW50LnR5cGVzLnhtbCA9ICdhcHBsaWNhdGlvbi94bWwnO1xuICpcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvJylcbiAqICAgICAgICAudHlwZSgneG1sJylcbiAqICAgICAgICAuc2VuZCh4bWxzdHJpbmcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCdhcHBsaWNhdGlvbi94bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnR5cGUgPSBmdW5jdGlvbih0eXBlKXtcbiAgdGhpcy5zZXQoJ0NvbnRlbnQtVHlwZScsIHJlcXVlc3QudHlwZXNbdHlwZV0gfHwgdHlwZSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgQWNjZXB0IHRvIGB0eXBlYCwgbWFwcGluZyB2YWx1ZXMgZnJvbSBgcmVxdWVzdC50eXBlc2AuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICBzdXBlcmFnZW50LnR5cGVzLmpzb24gPSAnYXBwbGljYXRpb24vanNvbic7XG4gKlxuICogICAgICByZXF1ZXN0LmdldCgnL2FnZW50JylcbiAqICAgICAgICAuYWNjZXB0KCdqc29uJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBhY2NlcHRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hY2NlcHQgPSBmdW5jdGlvbih0eXBlKXtcbiAgdGhpcy5zZXQoJ0FjY2VwdCcsIHJlcXVlc3QudHlwZXNbdHlwZV0gfHwgdHlwZSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgQXV0aG9yaXphdGlvbiBmaWVsZCB2YWx1ZSB3aXRoIGB1c2VyYCBhbmQgYHBhc3NgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyXG4gKiBAcGFyYW0ge1N0cmluZ30gW3Bhc3NdIG9wdGlvbmFsIGluIGNhc2Ugb2YgdXNpbmcgJ2JlYXJlcicgYXMgdHlwZVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgd2l0aCAndHlwZScgcHJvcGVydHkgJ2F1dG8nLCAnYmFzaWMnIG9yICdiZWFyZXInIChkZWZhdWx0ICdiYXNpYycpXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuYXV0aCA9IGZ1bmN0aW9uKHVzZXIsIHBhc3MsIG9wdGlvbnMpe1xuICBpZiAodHlwZW9mIHBhc3MgPT09ICdvYmplY3QnICYmIHBhc3MgIT09IG51bGwpIHsgLy8gcGFzcyBpcyBvcHRpb25hbCBhbmQgY2FuIHN1YnN0aXR1dGUgZm9yIG9wdGlvbnNcbiAgICBvcHRpb25zID0gcGFzcztcbiAgfVxuICBpZiAoIW9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0ge1xuICAgICAgdHlwZTogJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGJ0b2EgPyAnYmFzaWMnIDogJ2F1dG8nLFxuICAgIH1cbiAgfVxuXG4gIHN3aXRjaCAob3B0aW9ucy50eXBlKSB7XG4gICAgY2FzZSAnYmFzaWMnOlxuICAgICAgdGhpcy5zZXQoJ0F1dGhvcml6YXRpb24nLCAnQmFzaWMgJyArIGJ0b2EodXNlciArICc6JyArIHBhc3MpKTtcbiAgICBicmVhaztcblxuICAgIGNhc2UgJ2F1dG8nOlxuICAgICAgdGhpcy51c2VybmFtZSA9IHVzZXI7XG4gICAgICB0aGlzLnBhc3N3b3JkID0gcGFzcztcbiAgICBicmVhaztcbiAgICAgIFxuICAgIGNhc2UgJ2JlYXJlcic6IC8vIHVzYWdlIHdvdWxkIGJlIC5hdXRoKGFjY2Vzc1Rva2VuLCB7IHR5cGU6ICdiZWFyZXInIH0pXG4gICAgICB0aGlzLnNldCgnQXV0aG9yaXphdGlvbicsICdCZWFyZXIgJyArIHVzZXIpO1xuICAgIGJyZWFrOyAgXG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBxdWVyeS1zdHJpbmcgYHZhbGAuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICByZXF1ZXN0LmdldCgnL3Nob2VzJylcbiAqICAgICAucXVlcnkoJ3NpemU9MTAnKVxuICogICAgIC5xdWVyeSh7IGNvbG9yOiAnYmx1ZScgfSlcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24odmFsKXtcbiAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiB2YWwpIHZhbCA9IHNlcmlhbGl6ZSh2YWwpO1xuICBpZiAodmFsKSB0aGlzLl9xdWVyeS5wdXNoKHZhbCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBRdWV1ZSB0aGUgZ2l2ZW4gYGZpbGVgIGFzIGFuIGF0dGFjaG1lbnQgdG8gdGhlIHNwZWNpZmllZCBgZmllbGRgLFxuICogd2l0aCBvcHRpb25hbCBgb3B0aW9uc2AgKG9yIGZpbGVuYW1lKS5cbiAqXG4gKiBgYGAganNcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXG4gKiAgIC5hdHRhY2goJ2NvbnRlbnQnLCBuZXcgQmxvYihbJzxhIGlkPVwiYVwiPjxiIGlkPVwiYlwiPmhleSE8L2I+PC9hPiddLCB7IHR5cGU6IFwidGV4dC9odG1sXCJ9KSlcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEBwYXJhbSB7QmxvYnxGaWxlfSBmaWxlXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnNcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdHRhY2ggPSBmdW5jdGlvbihmaWVsZCwgZmlsZSwgb3B0aW9ucyl7XG4gIGlmIChmaWxlKSB7XG4gICAgaWYgKHRoaXMuX2RhdGEpIHtcbiAgICAgIHRocm93IEVycm9yKFwic3VwZXJhZ2VudCBjYW4ndCBtaXggLnNlbmQoKSBhbmQgLmF0dGFjaCgpXCIpO1xuICAgIH1cblxuICAgIHRoaXMuX2dldEZvcm1EYXRhKCkuYXBwZW5kKGZpZWxkLCBmaWxlLCBvcHRpb25zIHx8IGZpbGUubmFtZSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fZ2V0Rm9ybURhdGEgPSBmdW5jdGlvbigpe1xuICBpZiAoIXRoaXMuX2Zvcm1EYXRhKSB7XG4gICAgdGhpcy5fZm9ybURhdGEgPSBuZXcgcm9vdC5Gb3JtRGF0YSgpO1xuICB9XG4gIHJldHVybiB0aGlzLl9mb3JtRGF0YTtcbn07XG5cbi8qKlxuICogSW52b2tlIHRoZSBjYWxsYmFjayB3aXRoIGBlcnJgIGFuZCBgcmVzYFxuICogYW5kIGhhbmRsZSBhcml0eSBjaGVjay5cbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IHJlc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY2FsbGJhY2sgPSBmdW5jdGlvbihlcnIsIHJlcyl7XG4gIC8vIGNvbnNvbGUubG9nKHRoaXMuX3JldHJpZXMsIHRoaXMuX21heFJldHJpZXMpXG4gIGlmICh0aGlzLl9tYXhSZXRyaWVzICYmIHRoaXMuX3JldHJpZXMrKyA8IHRoaXMuX21heFJldHJpZXMgJiYgc2hvdWxkUmV0cnkoZXJyLCByZXMpKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JldHJ5KCk7XG4gIH1cblxuICB2YXIgZm4gPSB0aGlzLl9jYWxsYmFjaztcbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcblxuICBpZiAoZXJyKSB7XG4gICAgaWYgKHRoaXMuX21heFJldHJpZXMpIGVyci5yZXRyaWVzID0gdGhpcy5fcmV0cmllcyAtIDE7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIGVycik7XG4gIH1cblxuICBmbihlcnIsIHJlcyk7XG59O1xuXG4vKipcbiAqIEludm9rZSBjYWxsYmFjayB3aXRoIHgtZG9tYWluIGVycm9yLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmNyb3NzRG9tYWluRXJyb3IgPSBmdW5jdGlvbigpe1xuICB2YXIgZXJyID0gbmV3IEVycm9yKCdSZXF1ZXN0IGhhcyBiZWVuIHRlcm1pbmF0ZWRcXG5Qb3NzaWJsZSBjYXVzZXM6IHRoZSBuZXR3b3JrIGlzIG9mZmxpbmUsIE9yaWdpbiBpcyBub3QgYWxsb3dlZCBieSBBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4sIHRoZSBwYWdlIGlzIGJlaW5nIHVubG9hZGVkLCBldGMuJyk7XG4gIGVyci5jcm9zc0RvbWFpbiA9IHRydWU7XG5cbiAgZXJyLnN0YXR1cyA9IHRoaXMuc3RhdHVzO1xuICBlcnIubWV0aG9kID0gdGhpcy5tZXRob2Q7XG4gIGVyci51cmwgPSB0aGlzLnVybDtcblxuICB0aGlzLmNhbGxiYWNrKGVycik7XG59O1xuXG4vLyBUaGlzIG9ubHkgd2FybnMsIGJlY2F1c2UgdGhlIHJlcXVlc3QgaXMgc3RpbGwgbGlrZWx5IHRvIHdvcmtcblJlcXVlc3QucHJvdG90eXBlLmJ1ZmZlciA9IFJlcXVlc3QucHJvdG90eXBlLmNhID0gUmVxdWVzdC5wcm90b3R5cGUuYWdlbnQgPSBmdW5jdGlvbigpe1xuICBjb25zb2xlLndhcm4oXCJUaGlzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gYnJvd3NlciB2ZXJzaW9uIG9mIHN1cGVyYWdlbnRcIik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gVGhpcyB0aHJvd3MsIGJlY2F1c2UgaXQgY2FuJ3Qgc2VuZC9yZWNlaXZlIGRhdGEgYXMgZXhwZWN0ZWRcblJlcXVlc3QucHJvdG90eXBlLnBpcGUgPSBSZXF1ZXN0LnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKCl7XG4gIHRocm93IEVycm9yKFwiU3RyZWFtaW5nIGlzIG5vdCBzdXBwb3J0ZWQgaW4gYnJvd3NlciB2ZXJzaW9uIG9mIHN1cGVyYWdlbnRcIik7XG59O1xuXG4vKipcbiAqIENvbXBvc2UgcXVlcnlzdHJpbmcgdG8gYXBwZW5kIHRvIHJlcS51cmxcbiAqXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5fYXBwZW5kUXVlcnlTdHJpbmcgPSBmdW5jdGlvbigpe1xuICB2YXIgcXVlcnkgPSB0aGlzLl9xdWVyeS5qb2luKCcmJyk7XG4gIGlmIChxdWVyeSkge1xuICAgIHRoaXMudXJsICs9ICh0aGlzLnVybC5pbmRleE9mKCc/JykgPj0gMCA/ICcmJyA6ICc/JykgKyBxdWVyeTtcbiAgfVxuXG4gIGlmICh0aGlzLl9zb3J0KSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy51cmwuaW5kZXhPZignPycpO1xuICAgIGlmIChpbmRleCA+PSAwKSB7XG4gICAgICB2YXIgcXVlcnlBcnIgPSB0aGlzLnVybC5zdWJzdHJpbmcoaW5kZXggKyAxKS5zcGxpdCgnJicpO1xuICAgICAgaWYgKGlzRnVuY3Rpb24odGhpcy5fc29ydCkpIHtcbiAgICAgICAgcXVlcnlBcnIuc29ydCh0aGlzLl9zb3J0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXJ5QXJyLnNvcnQoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMudXJsID0gdGhpcy51cmwuc3Vic3RyaW5nKDAsIGluZGV4KSArICc/JyArIHF1ZXJ5QXJyLmpvaW4oJyYnKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYSBob3N0IG9iamVjdCxcbiAqIHdlIGRvbid0IHdhbnQgdG8gc2VyaWFsaXplIHRoZXNlIDopXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5SZXF1ZXN0LnByb3RvdHlwZS5faXNIb3N0ID0gZnVuY3Rpb24gX2lzSG9zdChvYmopIHtcbiAgLy8gTmF0aXZlIG9iamVjdHMgc3RyaW5naWZ5IHRvIFtvYmplY3QgRmlsZV0sIFtvYmplY3QgQmxvYl0sIFtvYmplY3QgRm9ybURhdGFdLCBldGMuXG4gIHJldHVybiBvYmogJiYgJ29iamVjdCcgPT09IHR5cGVvZiBvYmogJiYgIUFycmF5LmlzQXJyYXkob2JqKSAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSAhPT0gJ1tvYmplY3QgT2JqZWN0XSc7XG59XG5cbi8qKlxuICogSW5pdGlhdGUgcmVxdWVzdCwgaW52b2tpbmcgY2FsbGJhY2sgYGZuKHJlcylgXG4gKiB3aXRoIGFuIGluc3RhbmNlb2YgYFJlc3BvbnNlYC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGZuKXtcbiAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xuICAgIGNvbnNvbGUud2FybihcIldhcm5pbmc6IC5lbmQoKSB3YXMgY2FsbGVkIHR3aWNlLiBUaGlzIGlzIG5vdCBzdXBwb3J0ZWQgaW4gc3VwZXJhZ2VudFwiKTtcbiAgfVxuICB0aGlzLl9lbmRDYWxsZWQgPSB0cnVlO1xuXG4gIC8vIHN0b3JlIGNhbGxiYWNrXG4gIHRoaXMuX2NhbGxiYWNrID0gZm4gfHwgbm9vcDtcblxuICAvLyBxdWVyeXN0cmluZ1xuICB0aGlzLl9hcHBlbmRRdWVyeVN0cmluZygpO1xuXG4gIHJldHVybiB0aGlzLl9lbmQoKTtcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9lbmQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgeGhyID0gdGhpcy54aHIgPSByZXF1ZXN0LmdldFhIUigpO1xuICB2YXIgZGF0YSA9IHRoaXMuX2Zvcm1EYXRhIHx8IHRoaXMuX2RhdGE7XG5cbiAgdGhpcy5fc2V0VGltZW91dHMoKTtcblxuICAvLyBzdGF0ZSBjaGFuZ2VcbiAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHJlYWR5U3RhdGUgPSB4aHIucmVhZHlTdGF0ZTtcbiAgICBpZiAocmVhZHlTdGF0ZSA+PSAyICYmIHNlbGYuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQoc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpO1xuICAgIH1cbiAgICBpZiAoNCAhPSByZWFkeVN0YXRlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gSW4gSUU5LCByZWFkcyB0byBhbnkgcHJvcGVydHkgKGUuZy4gc3RhdHVzKSBvZmYgb2YgYW4gYWJvcnRlZCBYSFIgd2lsbFxuICAgIC8vIHJlc3VsdCBpbiB0aGUgZXJyb3IgXCJDb3VsZCBub3QgY29tcGxldGUgdGhlIG9wZXJhdGlvbiBkdWUgdG8gZXJyb3IgYzAwYzAyM2ZcIlxuICAgIHZhciBzdGF0dXM7XG4gICAgdHJ5IHsgc3RhdHVzID0geGhyLnN0YXR1cyB9IGNhdGNoKGUpIHsgc3RhdHVzID0gMDsgfVxuXG4gICAgaWYgKCFzdGF0dXMpIHtcbiAgICAgIGlmIChzZWxmLnRpbWVkb3V0IHx8IHNlbGYuX2Fib3J0ZWQpIHJldHVybjtcbiAgICAgIHJldHVybiBzZWxmLmNyb3NzRG9tYWluRXJyb3IoKTtcbiAgICB9XG4gICAgc2VsZi5lbWl0KCdlbmQnKTtcbiAgfTtcblxuICAvLyBwcm9ncmVzc1xuICB2YXIgaGFuZGxlUHJvZ3Jlc3MgPSBmdW5jdGlvbihkaXJlY3Rpb24sIGUpIHtcbiAgICBpZiAoZS50b3RhbCA+IDApIHtcbiAgICAgIGUucGVyY2VudCA9IGUubG9hZGVkIC8gZS50b3RhbCAqIDEwMDtcbiAgICB9XG4gICAgZS5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XG4gICAgc2VsZi5lbWl0KCdwcm9ncmVzcycsIGUpO1xuICB9XG4gIGlmICh0aGlzLmhhc0xpc3RlbmVycygncHJvZ3Jlc3MnKSkge1xuICAgIHRyeSB7XG4gICAgICB4aHIub25wcm9ncmVzcyA9IGhhbmRsZVByb2dyZXNzLmJpbmQobnVsbCwgJ2Rvd25sb2FkJyk7XG4gICAgICBpZiAoeGhyLnVwbG9hZCkge1xuICAgICAgICB4aHIudXBsb2FkLm9ucHJvZ3Jlc3MgPSBoYW5kbGVQcm9ncmVzcy5iaW5kKG51bGwsICd1cGxvYWQnKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIC8vIEFjY2Vzc2luZyB4aHIudXBsb2FkIGZhaWxzIGluIElFIGZyb20gYSB3ZWIgd29ya2VyLCBzbyBqdXN0IHByZXRlbmQgaXQgZG9lc24ndCBleGlzdC5cbiAgICAgIC8vIFJlcG9ydGVkIGhlcmU6XG4gICAgICAvLyBodHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFjay9kZXRhaWxzLzgzNzI0NS94bWxodHRwcmVxdWVzdC11cGxvYWQtdGhyb3dzLWludmFsaWQtYXJndW1lbnQtd2hlbi11c2VkLWZyb20td2ViLXdvcmtlci1jb250ZXh0XG4gICAgfVxuICB9XG5cbiAgLy8gaW5pdGlhdGUgcmVxdWVzdFxuICB0cnkge1xuICAgIGlmICh0aGlzLnVzZXJuYW1lICYmIHRoaXMucGFzc3dvcmQpIHtcbiAgICAgIHhoci5vcGVuKHRoaXMubWV0aG9kLCB0aGlzLnVybCwgdHJ1ZSwgdGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHhoci5vcGVuKHRoaXMubWV0aG9kLCB0aGlzLnVybCwgdHJ1ZSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICAvLyBzZWUgIzExNDlcbiAgICByZXR1cm4gdGhpcy5jYWxsYmFjayhlcnIpO1xuICB9XG5cbiAgLy8gQ09SU1xuICBpZiAodGhpcy5fd2l0aENyZWRlbnRpYWxzKSB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcblxuICAvLyBib2R5XG4gIGlmICghdGhpcy5fZm9ybURhdGEgJiYgJ0dFVCcgIT0gdGhpcy5tZXRob2QgJiYgJ0hFQUQnICE9IHRoaXMubWV0aG9kICYmICdzdHJpbmcnICE9IHR5cGVvZiBkYXRhICYmICF0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAvLyBzZXJpYWxpemUgc3R1ZmZcbiAgICB2YXIgY29udGVudFR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIHZhciBzZXJpYWxpemUgPSB0aGlzLl9zZXJpYWxpemVyIHx8IHJlcXVlc3Quc2VyaWFsaXplW2NvbnRlbnRUeXBlID8gY29udGVudFR5cGUuc3BsaXQoJzsnKVswXSA6ICcnXTtcbiAgICBpZiAoIXNlcmlhbGl6ZSAmJiBpc0pTT04oY29udGVudFR5cGUpKSB7XG4gICAgICBzZXJpYWxpemUgPSByZXF1ZXN0LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24vanNvbiddO1xuICAgIH1cbiAgICBpZiAoc2VyaWFsaXplKSBkYXRhID0gc2VyaWFsaXplKGRhdGEpO1xuICB9XG5cbiAgLy8gc2V0IGhlYWRlciBmaWVsZHNcbiAgZm9yICh2YXIgZmllbGQgaW4gdGhpcy5oZWFkZXIpIHtcbiAgICBpZiAobnVsbCA9PSB0aGlzLmhlYWRlcltmaWVsZF0pIGNvbnRpbnVlO1xuXG4gICAgaWYgKHRoaXMuaGVhZGVyLmhhc093blByb3BlcnR5KGZpZWxkKSlcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGZpZWxkLCB0aGlzLmhlYWRlcltmaWVsZF0pO1xuICB9XG5cbiAgaWYgKHRoaXMuX3Jlc3BvbnNlVHlwZSkge1xuICAgIHhoci5yZXNwb25zZVR5cGUgPSB0aGlzLl9yZXNwb25zZVR5cGU7XG4gIH1cblxuICAvLyBzZW5kIHN0dWZmXG4gIHRoaXMuZW1pdCgncmVxdWVzdCcsIHRoaXMpO1xuXG4gIC8vIElFMTEgeGhyLnNlbmQodW5kZWZpbmVkKSBzZW5kcyAndW5kZWZpbmVkJyBzdHJpbmcgYXMgUE9TVCBwYXlsb2FkIChpbnN0ZWFkIG9mIG5vdGhpbmcpXG4gIC8vIFdlIG5lZWQgbnVsbCBoZXJlIGlmIGRhdGEgaXMgdW5kZWZpbmVkXG4gIHhoci5zZW5kKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJyA/IGRhdGEgOiBudWxsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdFVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QuZ2V0ID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdHRVQnLCB1cmwpO1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgaWYgKGRhdGEpIHJlcS5xdWVyeShkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogSEVBRCBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QuaGVhZCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnSEVBRCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIE9QVElPTlMgcXVlcnkgdG8gYHVybGAgd2l0aCBvcHRpb25hbCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0Lm9wdGlvbnMgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ09QVElPTlMnLCB1cmwpO1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcbiAgaWYgKGRhdGEpIHJlcS5zZW5kKGRhdGEpO1xuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBERUxFVEUgYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRlbCh1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0RFTEVURScsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG5yZXF1ZXN0WydkZWwnXSA9IGRlbDtcbnJlcXVlc3RbJ2RlbGV0ZSddID0gZGVsO1xuXG4vKipcbiAqIFBBVENIIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZH0gW2RhdGFdXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnBhdGNoID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdQQVRDSCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIFBPU1QgYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucG9zdCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnUE9TVCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIFBVVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wdXQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BVVCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuIiwiLyoqXG4gKiBDaGVjayBpZiBgZm5gIGlzIGEgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihmbikge1xuICB2YXIgdGFnID0gaXNPYmplY3QoZm4pID8gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGZuKSA6ICcnO1xuICByZXR1cm4gdGFnID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzRnVuY3Rpb247XG4iLCIvKipcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGFuIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gaXNPYmplY3Qob2JqKSB7XG4gIHJldHVybiBudWxsICE9PSBvYmogJiYgJ29iamVjdCcgPT09IHR5cGVvZiBvYmo7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3Q7XG4iLCIvKipcbiAqIE1vZHVsZSBvZiBtaXhlZC1pbiBmdW5jdGlvbnMgc2hhcmVkIGJldHdlZW4gbm9kZSBhbmQgY2xpZW50IGNvZGVcbiAqL1xudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcblxuLyoqXG4gKiBFeHBvc2UgYFJlcXVlc3RCYXNlYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RCYXNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RCYXNlYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3RCYXNlKG9iaikge1xuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgcHJvdG90eXBlIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gIGZvciAodmFyIGtleSBpbiBSZXF1ZXN0QmFzZS5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IFJlcXVlc3RCYXNlLnByb3RvdHlwZVtrZXldO1xuICB9XG4gIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogQ2xlYXIgcHJldmlvdXMgdGltZW91dC5cbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmNsZWFyVGltZW91dCA9IGZ1bmN0aW9uIF9jbGVhclRpbWVvdXQoKXtcbiAgY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVyKTtcbiAgY2xlYXJUaW1lb3V0KHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKTtcbiAgZGVsZXRlIHRoaXMuX3RpbWVyO1xuICBkZWxldGUgdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXI7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBPdmVycmlkZSBkZWZhdWx0IHJlc3BvbnNlIGJvZHkgcGFyc2VyXG4gKlxuICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB0byBjb252ZXJ0IGluY29taW5nIGRhdGEgaW50byByZXF1ZXN0LmJvZHlcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZShmbil7XG4gIHRoaXMuX3BhcnNlciA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IGZvcm1hdCBvZiBiaW5hcnkgcmVzcG9uc2UgYm9keS5cbiAqIEluIGJyb3dzZXIgdmFsaWQgZm9ybWF0cyBhcmUgJ2Jsb2InIGFuZCAnYXJyYXlidWZmZXInLFxuICogd2hpY2ggcmV0dXJuIEJsb2IgYW5kIEFycmF5QnVmZmVyLCByZXNwZWN0aXZlbHkuXG4gKlxuICogSW4gTm9kZSBhbGwgdmFsdWVzIHJlc3VsdCBpbiBCdWZmZXIuXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICByZXEuZ2V0KCcvJylcbiAqICAgICAgICAucmVzcG9uc2VUeXBlKCdibG9iJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnJlc3BvbnNlVHlwZSA9IGZ1bmN0aW9uKHZhbCl7XG4gIHRoaXMuX3Jlc3BvbnNlVHlwZSA9IHZhbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIGRlZmF1bHQgcmVxdWVzdCBib2R5IHNlcmlhbGl6ZXJcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHRvIGNvbnZlcnQgZGF0YSBzZXQgdmlhIC5zZW5kIG9yIC5hdHRhY2ggaW50byBwYXlsb2FkIHRvIHNlbmRcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc2VyaWFsaXplID0gZnVuY3Rpb24gc2VyaWFsaXplKGZuKXtcbiAgdGhpcy5fc2VyaWFsaXplciA9IGZuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRpbWVvdXRzLlxuICpcbiAqIC0gcmVzcG9uc2UgdGltZW91dCBpcyB0aW1lIGJldHdlZW4gc2VuZGluZyByZXF1ZXN0IGFuZCByZWNlaXZpbmcgdGhlIGZpcnN0IGJ5dGUgb2YgdGhlIHJlc3BvbnNlLiBJbmNsdWRlcyBETlMgYW5kIGNvbm5lY3Rpb24gdGltZS5cbiAqIC0gZGVhZGxpbmUgaXMgdGhlIHRpbWUgZnJvbSBzdGFydCBvZiB0aGUgcmVxdWVzdCB0byByZWNlaXZpbmcgcmVzcG9uc2UgYm9keSBpbiBmdWxsLiBJZiB0aGUgZGVhZGxpbmUgaXMgdG9vIHNob3J0IGxhcmdlIGZpbGVzIG1heSBub3QgbG9hZCBhdCBhbGwgb24gc2xvdyBjb25uZWN0aW9ucy5cbiAqXG4gKiBWYWx1ZSBvZiAwIG9yIGZhbHNlIG1lYW5zIG5vIHRpbWVvdXQuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8T2JqZWN0fSBtcyBvciB7cmVzcG9uc2UsIHJlYWQsIGRlYWRsaW5lfVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50aW1lb3V0ID0gZnVuY3Rpb24gdGltZW91dChvcHRpb25zKXtcbiAgaWYgKCFvcHRpb25zIHx8ICdvYmplY3QnICE9PSB0eXBlb2Ygb3B0aW9ucykge1xuICAgIHRoaXMuX3RpbWVvdXQgPSBvcHRpb25zO1xuICAgIHRoaXMuX3Jlc3BvbnNlVGltZW91dCA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBmb3IodmFyIG9wdGlvbiBpbiBvcHRpb25zKSB7XG4gICAgc3dpdGNoKG9wdGlvbikge1xuICAgICAgY2FzZSAnZGVhZGxpbmUnOlxuICAgICAgICB0aGlzLl90aW1lb3V0ID0gb3B0aW9ucy5kZWFkbGluZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyZXNwb25zZSc6XG4gICAgICAgIHRoaXMuX3Jlc3BvbnNlVGltZW91dCA9IG9wdGlvbnMucmVzcG9uc2U7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS53YXJuKFwiVW5rbm93biB0aW1lb3V0IG9wdGlvblwiLCBvcHRpb24pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IG51bWJlciBvZiByZXRyeSBhdHRlbXB0cyBvbiBlcnJvci5cbiAqXG4gKiBGYWlsZWQgcmVxdWVzdHMgd2lsbCBiZSByZXRyaWVkICdjb3VudCcgdGltZXMgaWYgdGltZW91dCBvciBlcnIuY29kZSA+PSA1MDAuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGNvdW50XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnJldHJ5ID0gZnVuY3Rpb24gcmV0cnkoY291bnQpe1xuICAvLyBEZWZhdWx0IHRvIDEgaWYgbm8gY291bnQgcGFzc2VkIG9yIHRydWVcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDAgfHwgY291bnQgPT09IHRydWUpIGNvdW50ID0gMTtcbiAgaWYgKGNvdW50IDw9IDApIGNvdW50ID0gMDtcbiAgdGhpcy5fbWF4UmV0cmllcyA9IGNvdW50O1xuICB0aGlzLl9yZXRyaWVzID0gMDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHJ5IHJlcXVlc3RcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fcmV0cnkgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcblxuICAvLyBub2RlXG4gIGlmICh0aGlzLnJlcSkge1xuICAgIHRoaXMucmVxID0gbnVsbDtcbiAgICB0aGlzLnJlcSA9IHRoaXMucmVxdWVzdCgpO1xuICB9XG5cbiAgdGhpcy5fYWJvcnRlZCA9IGZhbHNlO1xuICB0aGlzLnRpbWVkb3V0ID0gZmFsc2U7XG5cbiAgcmV0dXJuIHRoaXMuX2VuZCgpO1xufTtcblxuLyoqXG4gKiBQcm9taXNlIHN1cHBvcnRcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbcmVqZWN0XVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIHRoZW4ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gIGlmICghdGhpcy5fZnVsbGZpbGxlZFByb21pc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xuICAgICAgY29uc29sZS53YXJuKFwiV2FybmluZzogc3VwZXJhZ2VudCByZXF1ZXN0IHdhcyBzZW50IHR3aWNlLCBiZWNhdXNlIGJvdGggLmVuZCgpIGFuZCAudGhlbigpIHdlcmUgY2FsbGVkLiBOZXZlciBjYWxsIC5lbmQoKSBpZiB5b3UgdXNlIHByb21pc2VzXCIpO1xuICAgIH1cbiAgICB0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGlubmVyUmVzb2x2ZSwgaW5uZXJSZWplY3Qpe1xuICAgICAgc2VsZi5lbmQoZnVuY3Rpb24oZXJyLCByZXMpe1xuICAgICAgICBpZiAoZXJyKSBpbm5lclJlamVjdChlcnIpOyBlbHNlIGlubmVyUmVzb2x2ZShyZXMpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbn1cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmNhdGNoID0gZnVuY3Rpb24oY2IpIHtcbiAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIGNiKTtcbn07XG5cbi8qKlxuICogQWxsb3cgZm9yIGV4dGVuc2lvblxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbiB1c2UoZm4pIHtcbiAgZm4odGhpcyk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUub2sgPSBmdW5jdGlvbihjYikge1xuICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGNiKSB0aHJvdyBFcnJvcihcIkNhbGxiYWNrIHJlcXVpcmVkXCIpO1xuICB0aGlzLl9va0NhbGxiYWNrID0gY2I7XG4gIHJldHVybiB0aGlzO1xufTtcblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9pc1Jlc3BvbnNlT0sgPSBmdW5jdGlvbihyZXMpIHtcbiAgaWYgKCFyZXMpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAodGhpcy5fb2tDYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLl9va0NhbGxiYWNrKHJlcyk7XG4gIH1cblxuICByZXR1cm4gcmVzLnN0YXR1cyA+PSAyMDAgJiYgcmVzLnN0YXR1cyA8IDMwMDtcbn07XG5cblxuLyoqXG4gKiBHZXQgcmVxdWVzdCBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihmaWVsZCl7XG4gIHJldHVybiB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG59O1xuXG4vKipcbiAqIEdldCBjYXNlLWluc2Vuc2l0aXZlIGhlYWRlciBgZmllbGRgIHZhbHVlLlxuICogVGhpcyBpcyBhIGRlcHJlY2F0ZWQgaW50ZXJuYWwgQVBJLiBVc2UgYC5nZXQoZmllbGQpYCBpbnN0ZWFkLlxuICpcbiAqIChnZXRIZWFkZXIgaXMgbm8gbG9uZ2VyIHVzZWQgaW50ZXJuYWxseSBieSB0aGUgc3VwZXJhZ2VudCBjb2RlIGJhc2UpXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqIEBkZXByZWNhdGVkXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldEhlYWRlciA9IFJlcXVlc3RCYXNlLnByb3RvdHlwZS5nZXQ7XG5cbi8qKlxuICogU2V0IGhlYWRlciBgZmllbGRgIHRvIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0LlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJylcbiAqICAgICAgICAuc2V0KCdYLUFQSS1LZXknLCAnZm9vYmFyJylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5zZXQoeyBBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJywgJ1gtQVBJLUtleSc6ICdmb29iYXInIH0pXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBmaWVsZFxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihmaWVsZCwgdmFsKXtcbiAgaWYgKGlzT2JqZWN0KGZpZWxkKSkge1xuICAgIGZvciAodmFyIGtleSBpbiBmaWVsZCkge1xuICAgICAgdGhpcy5zZXQoa2V5LCBmaWVsZFtrZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgdGhpcy5faGVhZGVyW2ZpZWxkLnRvTG93ZXJDYXNlKCldID0gdmFsO1xuICB0aGlzLmhlYWRlcltmaWVsZF0gPSB2YWw7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgaGVhZGVyIGBmaWVsZGAuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEV4YW1wbGU6XG4gKlxuICogICAgICByZXEuZ2V0KCcvJylcbiAqICAgICAgICAudW5zZXQoJ1VzZXItQWdlbnQnKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudW5zZXQgPSBmdW5jdGlvbihmaWVsZCl7XG4gIGRlbGV0ZSB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG4gIGRlbGV0ZSB0aGlzLmhlYWRlcltmaWVsZF07XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBXcml0ZSB0aGUgZmllbGQgYG5hbWVgIGFuZCBgdmFsYCwgb3IgbXVsdGlwbGUgZmllbGRzIHdpdGggb25lIG9iamVjdFxuICogZm9yIFwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwiIHJlcXVlc3QgYm9kaWVzLlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5wb3N0KCcvdXBsb2FkJylcbiAqICAgLmZpZWxkKCdmb28nLCAnYmFyJylcbiAqICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogcmVxdWVzdC5wb3N0KCcvdXBsb2FkJylcbiAqICAgLmZpZWxkKHsgZm9vOiAnYmFyJywgYmF6OiAncXV4JyB9KVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gbmFtZVxuICogQHBhcmFtIHtTdHJpbmd8QmxvYnxGaWxlfEJ1ZmZlcnxmcy5SZWFkU3RyZWFtfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuUmVxdWVzdEJhc2UucHJvdG90eXBlLmZpZWxkID0gZnVuY3Rpb24obmFtZSwgdmFsKSB7XG5cbiAgLy8gbmFtZSBzaG91bGQgYmUgZWl0aGVyIGEgc3RyaW5nIG9yIGFuIG9iamVjdC5cbiAgaWYgKG51bGwgPT09IG5hbWUgfHwgIHVuZGVmaW5lZCA9PT0gbmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgbmFtZSBjYW4gbm90IGJlIGVtcHR5Jyk7XG4gIH1cblxuICBpZiAodGhpcy5fZGF0YSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCIuZmllbGQoKSBjYW4ndCBiZSB1c2VkIGlmIC5zZW5kKCkgaXMgdXNlZC4gUGxlYXNlIHVzZSBvbmx5IC5zZW5kKCkgb3Igb25seSAuZmllbGQoKSAmIC5hdHRhY2goKVwiKTtcbiAgfVxuXG4gIGlmIChpc09iamVjdChuYW1lKSkge1xuICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XG4gICAgICB0aGlzLmZpZWxkKGtleSwgbmFtZVtrZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgZm9yICh2YXIgaSBpbiB2YWwpIHtcbiAgICAgIHRoaXMuZmllbGQobmFtZSwgdmFsW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyB2YWwgc2hvdWxkIGJlIGRlZmluZWQgbm93XG4gIGlmIChudWxsID09PSB2YWwgfHwgdW5kZWZpbmVkID09PSB2YWwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJy5maWVsZChuYW1lLCB2YWwpIHZhbCBjYW4gbm90IGJlIGVtcHR5Jyk7XG4gIH1cbiAgaWYgKCdib29sZWFuJyA9PT0gdHlwZW9mIHZhbCkge1xuICAgIHZhbCA9ICcnICsgdmFsO1xuICB9XG4gIHRoaXMuX2dldEZvcm1EYXRhKCkuYXBwZW5kKG5hbWUsIHZhbCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBYm9ydCB0aGUgcmVxdWVzdCwgYW5kIGNsZWFyIHBvdGVudGlhbCB0aW1lb3V0LlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbigpe1xuICBpZiAodGhpcy5fYWJvcnRlZCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG4gIHRoaXMuX2Fib3J0ZWQgPSB0cnVlO1xuICB0aGlzLnhociAmJiB0aGlzLnhoci5hYm9ydCgpOyAvLyBicm93c2VyXG4gIHRoaXMucmVxICYmIHRoaXMucmVxLmFib3J0KCk7IC8vIG5vZGVcbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcbiAgdGhpcy5lbWl0KCdhYm9ydCcpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW5hYmxlIHRyYW5zbWlzc2lvbiBvZiBjb29raWVzIHdpdGggeC1kb21haW4gcmVxdWVzdHMuXG4gKlxuICogTm90ZSB0aGF0IGZvciB0aGlzIHRvIHdvcmsgdGhlIG9yaWdpbiBtdXN0IG5vdCBiZVxuICogdXNpbmcgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIiB3aXRoIGEgd2lsZGNhcmQsXG4gKiBhbmQgYWxzbyBtdXN0IHNldCBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUNyZWRlbnRpYWxzXCJcbiAqIHRvIFwidHJ1ZVwiLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLndpdGhDcmVkZW50aWFscyA9IGZ1bmN0aW9uKG9uKXtcbiAgLy8gVGhpcyBpcyBicm93c2VyLW9ubHkgZnVuY3Rpb25hbGl0eS4gTm9kZSBzaWRlIGlzIG5vLW9wLlxuICBpZihvbj09dW5kZWZpbmVkKSBvbiA9IHRydWU7XG4gIHRoaXMuX3dpdGhDcmVkZW50aWFscyA9IG9uO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBtYXggcmVkaXJlY3RzIHRvIGBuYC4gRG9lcyBub3RpbmcgaW4gYnJvd3NlciBYSFIgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG5cbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVkaXJlY3RzID0gZnVuY3Rpb24obil7XG4gIHRoaXMuX21heFJlZGlyZWN0cyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb252ZXJ0IHRvIGEgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QgKG5vdCBKU09OIHN0cmluZykgb2Ygc2NhbGFyIHByb3BlcnRpZXMuXG4gKiBOb3RlIGFzIHRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHJldHVybiBhIHVzZWZ1bCBub24tdGhpcyB2YWx1ZSxcbiAqIGl0IGNhbm5vdCBiZSBjaGFpbmVkLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gZGVzY3JpYmluZyBtZXRob2QsIHVybCwgYW5kIGRhdGEgb2YgdGhpcyByZXF1ZXN0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbigpe1xuICByZXR1cm4ge1xuICAgIG1ldGhvZDogdGhpcy5tZXRob2QsXG4gICAgdXJsOiB0aGlzLnVybCxcbiAgICBkYXRhOiB0aGlzLl9kYXRhLFxuICAgIGhlYWRlcnM6IHRoaXMuX2hlYWRlclxuICB9O1xufTtcblxuXG4vKipcbiAqIFNlbmQgYGRhdGFgIGFzIHRoZSByZXF1ZXN0IGJvZHksIGRlZmF1bHRpbmcgdGhlIGAudHlwZSgpYCB0byBcImpzb25cIiB3aGVuXG4gKiBhbiBvYmplY3QgaXMgZ2l2ZW4uXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICAgLy8gbWFudWFsIGpzb25cbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnanNvbicpXG4gKiAgICAgICAgIC5zZW5kKCd7XCJuYW1lXCI6XCJ0alwifScpXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gYXV0byBqc29uXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gbWFudWFsIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdmb3JtJylcbiAqICAgICAgICAgLnNlbmQoJ25hbWU9dGonKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGF1dG8geC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBkZWZhdWx0cyB0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoJ25hbWU9dG9iaScpXG4gKiAgICAgICAgLnNlbmQoJ3NwZWNpZXM9ZmVycmV0JylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gZGF0YVxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24oZGF0YSl7XG4gIHZhciBpc09iaiA9IGlzT2JqZWN0KGRhdGEpO1xuICB2YXIgdHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG5cbiAgaWYgKHRoaXMuX2Zvcm1EYXRhKSB7XG4gICAgY29uc29sZS5lcnJvcihcIi5zZW5kKCkgY2FuJ3QgYmUgdXNlZCBpZiAuYXR0YWNoKCkgb3IgLmZpZWxkKCkgaXMgdXNlZC4gUGxlYXNlIHVzZSBvbmx5IC5zZW5kKCkgb3Igb25seSAuZmllbGQoKSAmIC5hdHRhY2goKVwiKTtcbiAgfVxuXG4gIGlmIChpc09iaiAmJiAhdGhpcy5fZGF0YSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgfSBlbHNlIGlmICghdGhpcy5faXNIb3N0KGRhdGEpKSB7XG4gICAgICB0aGlzLl9kYXRhID0ge307XG4gICAgfVxuICB9IGVsc2UgaWYgKGRhdGEgJiYgdGhpcy5fZGF0YSAmJiB0aGlzLl9pc0hvc3QodGhpcy5fZGF0YSkpIHtcbiAgICB0aHJvdyBFcnJvcihcIkNhbid0IG1lcmdlIHRoZXNlIHNlbmQgY2FsbHNcIik7XG4gIH1cblxuICAvLyBtZXJnZVxuICBpZiAoaXNPYmogJiYgaXNPYmplY3QodGhpcy5fZGF0YSkpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gZGF0YSkge1xuICAgICAgdGhpcy5fZGF0YVtrZXldID0gZGF0YVtrZXldO1xuICAgIH1cbiAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PSB0eXBlb2YgZGF0YSkge1xuICAgIC8vIGRlZmF1bHQgdG8geC13d3ctZm9ybS11cmxlbmNvZGVkXG4gICAgaWYgKCF0eXBlKSB0aGlzLnR5cGUoJ2Zvcm0nKTtcbiAgICB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgICBpZiAoJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcgPT0gdHlwZSkge1xuICAgICAgdGhpcy5fZGF0YSA9IHRoaXMuX2RhdGFcbiAgICAgICAgPyB0aGlzLl9kYXRhICsgJyYnICsgZGF0YVxuICAgICAgICA6IGRhdGE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2RhdGEgPSAodGhpcy5fZGF0YSB8fCAnJykgKyBkYXRhO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9kYXRhID0gZGF0YTtcbiAgfVxuXG4gIGlmICghaXNPYmogfHwgdGhpcy5faXNIb3N0KGRhdGEpKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBkZWZhdWx0IHRvIGpzb25cbiAgaWYgKCF0eXBlKSB0aGlzLnR5cGUoJ2pzb24nKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogU29ydCBgcXVlcnlzdHJpbmdgIGJ5IHRoZSBzb3J0IGZ1bmN0aW9uXG4gKlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgIC8vIGRlZmF1bHQgb3JkZXJcbiAqICAgICAgIHJlcXVlc3QuZ2V0KCcvdXNlcicpXG4gKiAgICAgICAgIC5xdWVyeSgnbmFtZT1OaWNrJylcbiAqICAgICAgICAgLnF1ZXJ5KCdzZWFyY2g9TWFubnknKVxuICogICAgICAgICAuc29ydFF1ZXJ5KClcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBjdXN0b21pemVkIHNvcnQgZnVuY3Rpb25cbiAqICAgICAgIHJlcXVlc3QuZ2V0KCcvdXNlcicpXG4gKiAgICAgICAgIC5xdWVyeSgnbmFtZT1OaWNrJylcbiAqICAgICAgICAgLnF1ZXJ5KCdzZWFyY2g9TWFubnknKVxuICogICAgICAgICAuc29ydFF1ZXJ5KGZ1bmN0aW9uKGEsIGIpe1xuICogICAgICAgICAgIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xuICogICAgICAgICB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzb3J0XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNvcnRRdWVyeSA9IGZ1bmN0aW9uKHNvcnQpIHtcbiAgLy8gX3NvcnQgZGVmYXVsdCB0byB0cnVlIGJ1dCBvdGhlcndpc2UgY2FuIGJlIGEgZnVuY3Rpb24gb3IgYm9vbGVhblxuICB0aGlzLl9zb3J0ID0gdHlwZW9mIHNvcnQgPT09ICd1bmRlZmluZWQnID8gdHJ1ZSA6IHNvcnQ7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbnZva2UgY2FsbGJhY2sgd2l0aCB0aW1lb3V0IGVycm9yLlxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fdGltZW91dEVycm9yID0gZnVuY3Rpb24ocmVhc29uLCB0aW1lb3V0LCBlcnJubyl7XG4gIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IocmVhc29uICsgdGltZW91dCArICdtcyBleGNlZWRlZCcpO1xuICBlcnIudGltZW91dCA9IHRpbWVvdXQ7XG4gIGVyci5jb2RlID0gJ0VDT05OQUJPUlRFRCc7XG4gIGVyci5lcnJubyA9IGVycm5vO1xuICB0aGlzLnRpbWVkb3V0ID0gdHJ1ZTtcbiAgdGhpcy5hYm9ydCgpO1xuICB0aGlzLmNhbGxiYWNrKGVycik7XG59O1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX3NldFRpbWVvdXRzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBkZWFkbGluZVxuICBpZiAodGhpcy5fdGltZW91dCAmJiAhdGhpcy5fdGltZXIpIHtcbiAgICB0aGlzLl90aW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcignVGltZW91dCBvZiAnLCBzZWxmLl90aW1lb3V0LCAnRVRJTUUnKTtcbiAgICB9LCB0aGlzLl90aW1lb3V0KTtcbiAgfVxuICAvLyByZXNwb25zZSB0aW1lb3V0XG4gIGlmICh0aGlzLl9yZXNwb25zZVRpbWVvdXQgJiYgIXRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XG4gICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBzZWxmLl90aW1lb3V0RXJyb3IoJ1Jlc3BvbnNlIHRpbWVvdXQgb2YgJywgc2VsZi5fcmVzcG9uc2VUaW1lb3V0LCAnRVRJTUVET1VUJyk7XG4gICAgfSwgdGhpcy5fcmVzcG9uc2VUaW1lb3V0KTtcbiAgfVxufVxuIiwiXG4vKipcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG4vKipcbiAqIEV4cG9zZSBgUmVzcG9uc2VCYXNlYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlc3BvbnNlQmFzZTtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZUJhc2VgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2VCYXNlKG9iaikge1xuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgcHJvdG90eXBlIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gIGZvciAodmFyIGtleSBpbiBSZXNwb25zZUJhc2UucHJvdG90eXBlKSB7XG4gICAgb2JqW2tleV0gPSBSZXNwb25zZUJhc2UucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBHZXQgY2FzZS1pbnNlbnNpdGl2ZSBgZmllbGRgIHZhbHVlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgICByZXR1cm4gdGhpcy5oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XG59O1xuXG4vKipcbiAqIFNldCBoZWFkZXIgcmVsYXRlZCBwcm9wZXJ0aWVzOlxuICpcbiAqICAgLSBgLnR5cGVgIHRoZSBjb250ZW50IHR5cGUgd2l0aG91dCBwYXJhbXNcbiAqXG4gKiBBIHJlc3BvbnNlIG9mIFwiQ29udGVudC1UeXBlOiB0ZXh0L3BsYWluOyBjaGFyc2V0PXV0Zi04XCJcbiAqIHdpbGwgcHJvdmlkZSB5b3Ugd2l0aCBhIGAudHlwZWAgb2YgXCJ0ZXh0L3BsYWluXCIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGhlYWRlclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2VCYXNlLnByb3RvdHlwZS5fc2V0SGVhZGVyUHJvcGVydGllcyA9IGZ1bmN0aW9uKGhlYWRlcil7XG4gICAgLy8gVE9ETzogbW9hciFcbiAgICAvLyBUT0RPOiBtYWtlIHRoaXMgYSB1dGlsXG5cbiAgICAvLyBjb250ZW50LXR5cGVcbiAgICB2YXIgY3QgPSBoZWFkZXJbJ2NvbnRlbnQtdHlwZSddIHx8ICcnO1xuICAgIHRoaXMudHlwZSA9IHV0aWxzLnR5cGUoY3QpO1xuXG4gICAgLy8gcGFyYW1zXG4gICAgdmFyIHBhcmFtcyA9IHV0aWxzLnBhcmFtcyhjdCk7XG4gICAgZm9yICh2YXIga2V5IGluIHBhcmFtcykgdGhpc1trZXldID0gcGFyYW1zW2tleV07XG5cbiAgICB0aGlzLmxpbmtzID0ge307XG5cbiAgICAvLyBsaW5rc1xuICAgIHRyeSB7XG4gICAgICAgIGlmIChoZWFkZXIubGluaykge1xuICAgICAgICAgICAgdGhpcy5saW5rcyA9IHV0aWxzLnBhcnNlTGlua3MoaGVhZGVyLmxpbmspO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIGlnbm9yZVxuICAgIH1cbn07XG5cbi8qKlxuICogU2V0IGZsYWdzIHN1Y2ggYXMgYC5va2AgYmFzZWQgb24gYHN0YXR1c2AuXG4gKlxuICogRm9yIGV4YW1wbGUgYSAyeHggcmVzcG9uc2Ugd2lsbCBnaXZlIHlvdSBhIGAub2tgIG9mIF9fdHJ1ZV9fXG4gKiB3aGVyZWFzIDV4eCB3aWxsIGJlIF9fZmFsc2VfXyBhbmQgYC5lcnJvcmAgd2lsbCBiZSBfX3RydWVfXy4gVGhlXG4gKiBgLmNsaWVudEVycm9yYCBhbmQgYC5zZXJ2ZXJFcnJvcmAgYXJlIGFsc28gYXZhaWxhYmxlIHRvIGJlIG1vcmVcbiAqIHNwZWNpZmljLCBhbmQgYC5zdGF0dXNUeXBlYCBpcyB0aGUgY2xhc3Mgb2YgZXJyb3IgcmFuZ2luZyBmcm9tIDEuLjVcbiAqIHNvbWV0aW1lcyB1c2VmdWwgZm9yIG1hcHBpbmcgcmVzcG9uZCBjb2xvcnMgZXRjLlxuICpcbiAqIFwic3VnYXJcIiBwcm9wZXJ0aWVzIGFyZSBhbHNvIGRlZmluZWQgZm9yIGNvbW1vbiBjYXNlcy4gQ3VycmVudGx5IHByb3ZpZGluZzpcbiAqXG4gKiAgIC0gLm5vQ29udGVudFxuICogICAtIC5iYWRSZXF1ZXN0XG4gKiAgIC0gLnVuYXV0aG9yaXplZFxuICogICAtIC5ub3RBY2NlcHRhYmxlXG4gKiAgIC0gLm5vdEZvdW5kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHN0YXR1c1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2VCYXNlLnByb3RvdHlwZS5fc2V0U3RhdHVzUHJvcGVydGllcyA9IGZ1bmN0aW9uKHN0YXR1cyl7XG4gICAgdmFyIHR5cGUgPSBzdGF0dXMgLyAxMDAgfCAwO1xuXG4gICAgLy8gc3RhdHVzIC8gY2xhc3NcbiAgICB0aGlzLnN0YXR1cyA9IHRoaXMuc3RhdHVzQ29kZSA9IHN0YXR1cztcbiAgICB0aGlzLnN0YXR1c1R5cGUgPSB0eXBlO1xuXG4gICAgLy8gYmFzaWNzXG4gICAgdGhpcy5pbmZvID0gMSA9PSB0eXBlO1xuICAgIHRoaXMub2sgPSAyID09IHR5cGU7XG4gICAgdGhpcy5yZWRpcmVjdCA9IDMgPT0gdHlwZTtcbiAgICB0aGlzLmNsaWVudEVycm9yID0gNCA9PSB0eXBlO1xuICAgIHRoaXMuc2VydmVyRXJyb3IgPSA1ID09IHR5cGU7XG4gICAgdGhpcy5lcnJvciA9ICg0ID09IHR5cGUgfHwgNSA9PSB0eXBlKVxuICAgICAgICA/IHRoaXMudG9FcnJvcigpXG4gICAgICAgIDogZmFsc2U7XG5cbiAgICAvLyBzdWdhclxuICAgIHRoaXMuYWNjZXB0ZWQgPSAyMDIgPT0gc3RhdHVzO1xuICAgIHRoaXMubm9Db250ZW50ID0gMjA0ID09IHN0YXR1cztcbiAgICB0aGlzLmJhZFJlcXVlc3QgPSA0MDAgPT0gc3RhdHVzO1xuICAgIHRoaXMudW5hdXRob3JpemVkID0gNDAxID09IHN0YXR1cztcbiAgICB0aGlzLm5vdEFjY2VwdGFibGUgPSA0MDYgPT0gc3RhdHVzO1xuICAgIHRoaXMuZm9yYmlkZGVuID0gNDAzID09IHN0YXR1cztcbiAgICB0aGlzLm5vdEZvdW5kID0gNDA0ID09IHN0YXR1cztcbn07XG4iLCJ2YXIgRVJST1JfQ09ERVMgPSBbXG4gICdFQ09OTlJFU0VUJyxcbiAgJ0VUSU1FRE9VVCcsXG4gICdFQUREUklORk8nLFxuICAnRVNPQ0tFVFRJTUVET1VUJ1xuXTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSByZXF1ZXN0IHNob3VsZCBiZSByZXRyaWVkLlxuICogKEJvcnJvd2VkIGZyb20gc2VnbWVudGlvL3N1cGVyYWdlbnQtcmV0cnkpXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyXG4gKiBAcGFyYW0ge1Jlc3BvbnNlfSBbcmVzXVxuICogQHJldHVybnMge0Jvb2xlYW59XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2hvdWxkUmV0cnkoZXJyLCByZXMpIHtcbiAgaWYgKGVyciAmJiBlcnIuY29kZSAmJiB+RVJST1JfQ09ERVMuaW5kZXhPZihlcnIuY29kZSkpIHJldHVybiB0cnVlO1xuICBpZiAocmVzICYmIHJlcy5zdGF0dXMgJiYgcmVzLnN0YXR1cyA+PSA1MDApIHJldHVybiB0cnVlO1xuICAvLyBTdXBlcmFnZW50IHRpbWVvdXRcbiAgaWYgKGVyciAmJiAndGltZW91dCcgaW4gZXJyICYmIGVyci5jb2RlID09ICdFQ09OTkFCT1JURUQnKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKGVyciAmJiAnY3Jvc3NEb21haW4nIGluIGVycikgcmV0dXJuIHRydWU7XG4gIHJldHVybiBmYWxzZTtcbn07XG4iLCJcbi8qKlxuICogUmV0dXJuIHRoZSBtaW1lIHR5cGUgZm9yIHRoZSBnaXZlbiBgc3RyYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnR5cGUgPSBmdW5jdGlvbihzdHIpe1xuICByZXR1cm4gc3RyLnNwbGl0KC8gKjsgKi8pLnNoaWZ0KCk7XG59O1xuXG4vKipcbiAqIFJldHVybiBoZWFkZXIgZmllbGQgcGFyYW1ldGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnBhcmFtcyA9IGZ1bmN0aW9uKHN0cil7XG4gIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykucmVkdWNlKGZ1bmN0aW9uKG9iaiwgc3RyKXtcbiAgICB2YXIgcGFydHMgPSBzdHIuc3BsaXQoLyAqPSAqLyk7XG4gICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgdmFyIHZhbCA9IHBhcnRzLnNoaWZ0KCk7XG5cbiAgICBpZiAoa2V5ICYmIHZhbCkgb2JqW2tleV0gPSB2YWw7XG4gICAgcmV0dXJuIG9iajtcbiAgfSwge30pO1xufTtcblxuLyoqXG4gKiBQYXJzZSBMaW5rIGhlYWRlciBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5wYXJzZUxpbmtzID0gZnVuY3Rpb24oc3RyKXtcbiAgcmV0dXJuIHN0ci5zcGxpdCgvICosICovKS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBzdHIpe1xuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo7ICovKTtcbiAgICB2YXIgdXJsID0gcGFydHNbMF0uc2xpY2UoMSwgLTEpO1xuICAgIHZhciByZWwgPSBwYXJ0c1sxXS5zcGxpdCgvICo9ICovKVsxXS5zbGljZSgxLCAtMSk7XG4gICAgb2JqW3JlbF0gPSB1cmw7XG4gICAgcmV0dXJuIG9iajtcbiAgfSwge30pO1xufTtcblxuLyoqXG4gKiBTdHJpcCBjb250ZW50IHJlbGF0ZWQgZmllbGRzIGZyb20gYGhlYWRlcmAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGhlYWRlclxuICogQHJldHVybiB7T2JqZWN0fSBoZWFkZXJcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMuY2xlYW5IZWFkZXIgPSBmdW5jdGlvbihoZWFkZXIsIHNob3VsZFN0cmlwQ29va2llKXtcbiAgZGVsZXRlIGhlYWRlclsnY29udGVudC10eXBlJ107XG4gIGRlbGV0ZSBoZWFkZXJbJ2NvbnRlbnQtbGVuZ3RoJ107XG4gIGRlbGV0ZSBoZWFkZXJbJ3RyYW5zZmVyLWVuY29kaW5nJ107XG4gIGRlbGV0ZSBoZWFkZXJbJ2hvc3QnXTtcbiAgaWYgKHNob3VsZFN0cmlwQ29va2llKSB7XG4gICAgZGVsZXRlIGhlYWRlclsnY29va2llJ107XG4gIH1cbiAgcmV0dXJuIGhlYWRlcjtcbn07IiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnc3VwZXJhZ2VudCcsICdxdWVyeXN0cmluZyddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdzdXBlcmFnZW50JyksIHJlcXVpcmUoJ3F1ZXJ5c3RyaW5nJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50ID0gZmFjdG9yeShyb290LnN1cGVyYWdlbnQsIHJvb3QucXVlcnlzdHJpbmcpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKHN1cGVyYWdlbnQsIHF1ZXJ5c3RyaW5nKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogQG1vZHVsZSBBcGlDbGllbnRcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIE1hbmFnZXMgbG93IGxldmVsIGNsaWVudC1zZXJ2ZXIgY29tbXVuaWNhdGlvbnMsIHBhcmFtZXRlciBtYXJzaGFsbGluZywgZXRjLiBUaGVyZSBzaG91bGQgbm90IGJlIGFueSBuZWVkIGZvciBhblxuICAgKiBhcHBsaWNhdGlvbiB0byB1c2UgdGhpcyBjbGFzcyBkaXJlY3RseSAtIHRoZSAqQXBpIGFuZCBtb2RlbCBjbGFzc2VzIHByb3ZpZGUgdGhlIHB1YmxpYyBBUEkgZm9yIHRoZSBzZXJ2aWNlLiBUaGVcbiAgICogY29udGVudHMgb2YgdGhpcyBmaWxlIHNob3VsZCBiZSByZWdhcmRlZCBhcyBpbnRlcm5hbCBidXQgYXJlIGRvY3VtZW50ZWQgZm9yIGNvbXBsZXRlbmVzcy5cbiAgICogQGFsaWFzIG1vZHVsZTpBcGlDbGllbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIFRoZSBiYXNlIFVSTCBhZ2FpbnN0IHdoaWNoIHRvIHJlc29sdmUgZXZlcnkgQVBJIGNhbGwncyAocmVsYXRpdmUpIHBhdGguXG4gICAgICogQHR5cGUge1N0cmluZ31cbiAgICAgKiBAZGVmYXVsdCBodHRwOi8vbG9jYWxob3N0OjgwODAvdjJcbiAgICAgKi9cbiAgICB0aGlzLmJhc2VQYXRoID0gJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC92MicucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYXV0aGVudGljYXRpb24gbWV0aG9kcyB0byBiZSBpbmNsdWRlZCBmb3IgYWxsIEFQSSBjYWxscy5cbiAgICAgKiBAdHlwZSB7QXJyYXkuPFN0cmluZz59XG4gICAgICovXG4gICAgdGhpcy5hdXRoZW50aWNhdGlvbnMgPSB7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGUgZGVmYXVsdCBIVFRQIGhlYWRlcnMgdG8gYmUgaW5jbHVkZWQgZm9yIGFsbCBBUEkgY2FsbHMuXG4gICAgICogQHR5cGUge0FycmF5LjxTdHJpbmc+fVxuICAgICAqIEBkZWZhdWx0IHt9XG4gICAgICovXG4gICAgdGhpcy5kZWZhdWx0SGVhZGVycyA9IHt9O1xuXG4gICAgLyoqXG4gICAgICogVGhlIGRlZmF1bHQgSFRUUCB0aW1lb3V0IGZvciBhbGwgQVBJIGNhbGxzLlxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICogQGRlZmF1bHQgNjAwMDBcbiAgICAgKi9cbiAgICB0aGlzLnRpbWVvdXQgPSA2MDAwMDtcblxuICAgIC8qKlxuICAgICAqIElmIHNldCB0byBmYWxzZSBhbiBhZGRpdGlvbmFsIHRpbWVzdGFtcCBwYXJhbWV0ZXIgaXMgYWRkZWQgdG8gYWxsIEFQSSBHRVQgY2FsbHMgdG9cbiAgICAgKiBwcmV2ZW50IGJyb3dzZXIgY2FjaGluZ1xuICAgICAqIEB0eXBlIHtCb29sZWFufVxuICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgKi9cbiAgICB0aGlzLmNhY2hlID0gdHJ1ZTtcblxuICAgIC8qKlxuICAgICAqIElmIHNldCB0byB0cnVlLCB0aGUgY2xpZW50IHdpbGwgc2F2ZSB0aGUgY29va2llcyBmcm9tIGVhY2ggc2VydmVyXG4gICAgICogcmVzcG9uc2UsIGFuZCByZXR1cm4gdGhlbSBpbiB0aGUgbmV4dCByZXF1ZXN0LlxuICAgICAqIEBkZWZhdWx0IGZhbHNlXG4gICAgICovXG4gICAgdGhpcy5lbmFibGVDb29raWVzID0gZmFsc2U7XG5cbiAgICAvKlxuICAgICAqIFVzZWQgdG8gc2F2ZSBhbmQgcmV0dXJuIGNvb2tpZXMgaW4gYSBub2RlLmpzIChub24tYnJvd3Nlcikgc2V0dGluZyxcbiAgICAgKiBpZiB0aGlzLmVuYWJsZUNvb2tpZXMgaXMgc2V0IHRvIHRydWUuXG4gICAgICovXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLmFnZW50ID0gbmV3IHN1cGVyYWdlbnQuYWdlbnQoKTtcbiAgICB9XG5cbiAgICAvKlxuICAgICAqIEFsbG93IHVzZXIgdG8gb3ZlcnJpZGUgc3VwZXJhZ2VudCBhZ2VudFxuICAgICAqL1xuICAgIHRoaXMucmVxdWVzdEFnZW50ID0gbnVsbDtcbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBmb3IgYW4gYWN0dWFsIHBhcmFtZXRlci5cbiAgICogQHBhcmFtIHBhcmFtIFRoZSBhY3R1YWwgcGFyYW1ldGVyLlxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIDxjb2RlPnBhcmFtPC9jb2RlPi5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLnBhcmFtVG9TdHJpbmcgPSBmdW5jdGlvbihwYXJhbSkge1xuICAgIGlmIChwYXJhbSA9PSB1bmRlZmluZWQgfHwgcGFyYW0gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBpZiAocGFyYW0gaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICByZXR1cm4gcGFyYW0udG9KU09OKCk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbS50b1N0cmluZygpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBCdWlsZHMgZnVsbCBVUkwgYnkgYXBwZW5kaW5nIHRoZSBnaXZlbiBwYXRoIHRvIHRoZSBiYXNlIFVSTCBhbmQgcmVwbGFjaW5nIHBhdGggcGFyYW1ldGVyIHBsYWNlLWhvbGRlcnMgd2l0aCBwYXJhbWV0ZXIgdmFsdWVzLlxuICAgKiBOT1RFOiBxdWVyeSBwYXJhbWV0ZXJzIGFyZSBub3QgaGFuZGxlZCBoZXJlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCB0byBhcHBlbmQgdG8gdGhlIGJhc2UgVVJMLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGF0aFBhcmFtcyBUaGUgcGFyYW1ldGVyIHZhbHVlcyB0byBhcHBlbmQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBlbmNvZGVkIHBhdGggd2l0aCBwYXJhbWV0ZXIgdmFsdWVzIHN1YnN0aXR1dGVkLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuYnVpbGRVcmwgPSBmdW5jdGlvbihwYXRoLCBwYXRoUGFyYW1zKSB7XG4gICAgaWYgKCFwYXRoLm1hdGNoKC9eXFwvLykpIHtcbiAgICAgIHBhdGggPSAnLycgKyBwYXRoO1xuICAgIH1cbiAgICB2YXIgdXJsID0gdGhpcy5iYXNlUGF0aCArIHBhdGg7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB1cmwgPSB1cmwucmVwbGFjZSgvXFx7KFtcXHctXSspXFx9L2csIGZ1bmN0aW9uKGZ1bGxNYXRjaCwga2V5KSB7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICBpZiAocGF0aFBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHZhbHVlID0gX3RoaXMucGFyYW1Ub1N0cmluZyhwYXRoUGFyYW1zW2tleV0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBmdWxsTWF0Y2g7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdXJsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gY29udGVudCB0eXBlIHJlcHJlc2VudHMgSlNPTi48YnI+XG4gICAqIEpTT04gY29udGVudCB0eXBlIGV4YW1wbGVzOjxicj5cbiAgICogPHVsPlxuICAgKiA8bGk+YXBwbGljYXRpb24vanNvbjwvbGk+XG4gICAqIDxsaT5hcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURjg8L2xpPlxuICAgKiA8bGk+QVBQTElDQVRJT04vSlNPTjwvbGk+XG4gICAqIDwvdWw+XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjb250ZW50VHlwZSBUaGUgTUlNRSBjb250ZW50IHR5cGUgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiA8Y29kZT5jb250ZW50VHlwZTwvY29kZT4gcmVwcmVzZW50cyBKU09OLCBvdGhlcndpc2UgPGNvZGU+ZmFsc2U8L2NvZGU+LlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuaXNKc29uTWltZSA9IGZ1bmN0aW9uKGNvbnRlbnRUeXBlKSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oY29udGVudFR5cGUgIT0gbnVsbCAmJiBjb250ZW50VHlwZS5tYXRjaCgvXmFwcGxpY2F0aW9uXFwvanNvbig7LiopPyQvaSkpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaG9vc2VzIGEgY29udGVudCB0eXBlIGZyb20gdGhlIGdpdmVuIGFycmF5LCB3aXRoIEpTT04gcHJlZmVycmVkOyBpLmUuIHJldHVybiBKU09OIGlmIGluY2x1ZGVkLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBmaXJzdC5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gY29udGVudFR5cGVzXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBjaG9zZW4gY29udGVudCB0eXBlLCBwcmVmZXJyaW5nIEpTT04uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5qc29uUHJlZmVycmVkTWltZSA9IGZ1bmN0aW9uKGNvbnRlbnRUeXBlcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udGVudFR5cGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5pc0pzb25NaW1lKGNvbnRlbnRUeXBlc1tpXSkpIHtcbiAgICAgICAgcmV0dXJuIGNvbnRlbnRUeXBlc1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnRUeXBlc1swXTtcbiAgfTtcblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGdpdmVuIHBhcmFtZXRlciB2YWx1ZSByZXByZXNlbnRzIGZpbGUtbGlrZSBjb250ZW50LlxuICAgKiBAcGFyYW0gcGFyYW0gVGhlIHBhcmFtZXRlciB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIDxjb2RlPnBhcmFtPC9jb2RlPiByZXByZXNlbnRzIGEgZmlsZS5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmlzRmlsZVBhcmFtID0gZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAvLyBmcy5SZWFkU3RyZWFtIGluIE5vZGUuanMgYW5kIEVsZWN0cm9uIChidXQgbm90IGluIHJ1bnRpbWUgbGlrZSBicm93c2VyaWZ5KVxuICAgIGlmICh0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIGZzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7fVxuICAgICAgaWYgKGZzICYmIGZzLlJlYWRTdHJlYW0gJiYgcGFyYW0gaW5zdGFuY2VvZiBmcy5SZWFkU3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBCdWZmZXIgaW4gTm9kZS5qc1xuICAgIGlmICh0eXBlb2YgQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIHBhcmFtIGluc3RhbmNlb2YgQnVmZmVyKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gQmxvYiBpbiBicm93c2VyXG4gICAgaWYgKHR5cGVvZiBCbG9iID09PSAnZnVuY3Rpb24nICYmIHBhcmFtIGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vIEZpbGUgaW4gYnJvd3NlciAoaXQgc2VlbXMgRmlsZSBvYmplY3QgaXMgYWxzbyBpbnN0YW5jZSBvZiBCbG9iLCBidXQga2VlcCB0aGlzIGZvciBzYWZlKVxuICAgIGlmICh0eXBlb2YgRmlsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBwYXJhbSBpbnN0YW5jZW9mIEZpbGUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIE5vcm1hbGl6ZXMgcGFyYW1ldGVyIHZhbHVlczpcbiAgICogPHVsPlxuICAgKiA8bGk+cmVtb3ZlIG5pbHM8L2xpPlxuICAgKiA8bGk+a2VlcCBmaWxlcyBhbmQgYXJyYXlzPC9saT5cbiAgICogPGxpPmZvcm1hdCB0byBzdHJpbmcgd2l0aCBgcGFyYW1Ub1N0cmluZ2AgZm9yIG90aGVyIGNhc2VzPC9saT5cbiAgICogPC91bD5cbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gcGFyYW1zIFRoZSBwYXJhbWV0ZXJzIGFzIG9iamVjdCBwcm9wZXJ0aWVzLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IG5vcm1hbGl6ZWQgcGFyYW1ldGVycy5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLm5vcm1hbGl6ZVBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHZhciBuZXdQYXJhbXMgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB7XG4gICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KGtleSkgJiYgcGFyYW1zW2tleV0gIT0gdW5kZWZpbmVkICYmIHBhcmFtc1trZXldICE9IG51bGwpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFyYW1zW2tleV07XG4gICAgICAgIGlmICh0aGlzLmlzRmlsZVBhcmFtKHZhbHVlKSB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgIG5ld1BhcmFtc1trZXldID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV3UGFyYW1zW2tleV0gPSB0aGlzLnBhcmFtVG9TdHJpbmcodmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXdQYXJhbXM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEVudW1lcmF0aW9uIG9mIGNvbGxlY3Rpb24gZm9ybWF0IHNlcGFyYXRvciBzdHJhdGVnaWVzLlxuICAgKiBAZW51bSB7U3RyaW5nfVxuICAgKiBAcmVhZG9ubHlcbiAgICovXG4gIGV4cG9ydHMuQ29sbGVjdGlvbkZvcm1hdEVudW0gPSB7XG4gICAgLyoqXG4gICAgICogQ29tbWEtc2VwYXJhdGVkIHZhbHVlcy4gVmFsdWU6IDxjb2RlPmNzdjwvY29kZT5cbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBDU1Y6ICcsJyxcbiAgICAvKipcbiAgICAgKiBTcGFjZS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+c3N2PC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFNTVjogJyAnLFxuICAgIC8qKlxuICAgICAqIFRhYi1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+dHN2PC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFRTVjogJ1xcdCcsXG4gICAgLyoqXG4gICAgICogUGlwZSh8KS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+cGlwZXM8L2NvZGU+XG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgUElQRVM6ICd8JyxcbiAgICAvKipcbiAgICAgKiBOYXRpdmUgYXJyYXkuIFZhbHVlOiA8Y29kZT5tdWx0aTwvY29kZT5cbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBNVUxUSTogJ211bHRpJ1xuICB9O1xuXG4gIC8qKlxuICAgKiBCdWlsZHMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYW4gYXJyYXktdHlwZSBhY3R1YWwgcGFyYW1ldGVyLCBhY2NvcmRpbmcgdG8gdGhlIGdpdmVuIGNvbGxlY3Rpb24gZm9ybWF0LlxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbSBBbiBhcnJheSBwYXJhbWV0ZXIuXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudC5Db2xsZWN0aW9uRm9ybWF0RW51bX0gY29sbGVjdGlvbkZvcm1hdCBUaGUgYXJyYXkgZWxlbWVudCBzZXBhcmF0b3Igc3RyYXRlZ3kuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd8QXJyYXl9IEEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBzdXBwbGllZCBjb2xsZWN0aW9uLCB1c2luZyB0aGUgc3BlY2lmaWVkIGRlbGltaXRlci4gUmV0dXJuc1xuICAgKiA8Y29kZT5wYXJhbTwvY29kZT4gYXMgaXMgaWYgPGNvZGU+Y29sbGVjdGlvbkZvcm1hdDwvY29kZT4gaXMgPGNvZGU+bXVsdGk8L2NvZGU+LlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuYnVpbGRDb2xsZWN0aW9uUGFyYW0gPSBmdW5jdGlvbiBidWlsZENvbGxlY3Rpb25QYXJhbShwYXJhbSwgY29sbGVjdGlvbkZvcm1hdCkge1xuICAgIGlmIChwYXJhbSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgc3dpdGNoIChjb2xsZWN0aW9uRm9ybWF0KSB7XG4gICAgICBjYXNlICdjc3YnOlxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignLCcpO1xuICAgICAgY2FzZSAnc3N2JzpcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpLmpvaW4oJyAnKTtcbiAgICAgIGNhc2UgJ3Rzdic6XG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCdcXHQnKTtcbiAgICAgIGNhc2UgJ3BpcGVzJzpcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpLmpvaW4oJ3wnKTtcbiAgICAgIGNhc2UgJ211bHRpJzpcbiAgICAgICAgLy8gcmV0dXJuIHRoZSBhcnJheSBkaXJlY3RseSBhcyBTdXBlckFnZW50IHdpbGwgaGFuZGxlIGl0IGFzIGV4cGVjdGVkXG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBjb2xsZWN0aW9uIGZvcm1hdDogJyArIGNvbGxlY3Rpb25Gb3JtYXQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQXBwbGllcyBhdXRoZW50aWNhdGlvbiBoZWFkZXJzIHRvIHRoZSByZXF1ZXN0LlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCBUaGUgcmVxdWVzdCBvYmplY3QgY3JlYXRlZCBieSBhIDxjb2RlPnN1cGVyYWdlbnQoKTwvY29kZT4gY2FsbC5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYXV0aE5hbWVzIEFuIGFycmF5IG9mIGF1dGhlbnRpY2F0aW9uIG1ldGhvZCBuYW1lcy5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmFwcGx5QXV0aFRvUmVxdWVzdCA9IGZ1bmN0aW9uKHJlcXVlc3QsIGF1dGhOYW1lcykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgYXV0aE5hbWVzLmZvckVhY2goZnVuY3Rpb24oYXV0aE5hbWUpIHtcbiAgICAgIHZhciBhdXRoID0gX3RoaXMuYXV0aGVudGljYXRpb25zW2F1dGhOYW1lXTtcbiAgICAgIHN3aXRjaCAoYXV0aC50eXBlKSB7XG4gICAgICAgIGNhc2UgJ2Jhc2ljJzpcbiAgICAgICAgICBpZiAoYXV0aC51c2VybmFtZSB8fCBhdXRoLnBhc3N3b3JkKSB7XG4gICAgICAgICAgICByZXF1ZXN0LmF1dGgoYXV0aC51c2VybmFtZSB8fCAnJywgYXV0aC5wYXNzd29yZCB8fCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdhcGlLZXknOlxuICAgICAgICAgIGlmIChhdXRoLmFwaUtleSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgICAgIGlmIChhdXRoLmFwaUtleVByZWZpeCkge1xuICAgICAgICAgICAgICBkYXRhW2F1dGgubmFtZV0gPSBhdXRoLmFwaUtleVByZWZpeCArICcgJyArIGF1dGguYXBpS2V5O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZGF0YVthdXRoLm5hbWVdID0gYXV0aC5hcGlLZXk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXV0aFsnaW4nXSA9PT0gJ2hlYWRlcicpIHtcbiAgICAgICAgICAgICAgcmVxdWVzdC5zZXQoZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXF1ZXN0LnF1ZXJ5KGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnb2F1dGgyJzpcbiAgICAgICAgICBpZiAoYXV0aC5hY2Nlc3NUb2tlbikge1xuICAgICAgICAgICAgcmVxdWVzdC5zZXQoeydBdXRob3JpemF0aW9uJzogJ0JlYXJlciAnICsgYXV0aC5hY2Nlc3NUb2tlbn0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gYXV0aGVudGljYXRpb24gdHlwZTogJyArIGF1dGgudHlwZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIERlc2VyaWFsaXplcyBhbiBIVFRQIHJlc3BvbnNlIGJvZHkgaW50byBhIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIEEgU3VwZXJBZ2VudCByZXNwb25zZSBvYmplY3QuXG4gICAqIEBwYXJhbSB7KFN0cmluZ3xBcnJheS48U3RyaW5nPnxPYmplY3QuPFN0cmluZywgT2JqZWN0PnxGdW5jdGlvbil9IHJldHVyblR5cGUgVGhlIHR5cGUgdG8gcmV0dXJuLiBQYXNzIGEgc3RyaW5nIGZvciBzaW1wbGUgdHlwZXNcbiAgICogb3IgdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBhIGNvbXBsZXggdHlwZS4gUGFzcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSB0eXBlIG5hbWUgdG8gcmV0dXJuIGFuIGFycmF5IG9mIHRoYXQgdHlwZS4gVG9cbiAgICogcmV0dXJuIGFuIG9iamVjdCwgcGFzcyBhbiBvYmplY3Qgd2l0aCBvbmUgcHJvcGVydHkgd2hvc2UgbmFtZSBpcyB0aGUga2V5IHR5cGUgYW5kIHdob3NlIHZhbHVlIGlzIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlIHR5cGU6XG4gICAqIGFsbCBwcm9wZXJ0aWVzIG9uIDxjb2RlPmRhdGE8Y29kZT4gd2lsbCBiZSBjb252ZXJ0ZWQgdG8gdGhpcyB0eXBlLlxuICAgKiBAcmV0dXJucyBBIHZhbHVlIG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmRlc2VyaWFsaXplID0gZnVuY3Rpb24gZGVzZXJpYWxpemUocmVzcG9uc2UsIHJldHVyblR5cGUpIHtcbiAgICBpZiAocmVzcG9uc2UgPT0gbnVsbCB8fCByZXR1cm5UeXBlID09IG51bGwgfHwgcmVzcG9uc2Uuc3RhdHVzID09IDIwNCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIFJlbHkgb24gU3VwZXJBZ2VudCBmb3IgcGFyc2luZyByZXNwb25zZSBib2R5LlxuICAgIC8vIFNlZSBodHRwOi8vdmlzaW9ubWVkaWEuZ2l0aHViLmlvL3N1cGVyYWdlbnQvI3BhcnNpbmctcmVzcG9uc2UtYm9kaWVzXG4gICAgdmFyIGRhdGEgPSByZXNwb25zZS5ib2R5O1xuICAgIGlmIChkYXRhID09IG51bGwgfHwgKHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgZGF0YS5sZW5ndGggPT09ICd1bmRlZmluZWQnICYmICFPYmplY3Qua2V5cyhkYXRhKS5sZW5ndGgpKSB7XG4gICAgICAvLyBTdXBlckFnZW50IGRvZXMgbm90IGFsd2F5cyBwcm9kdWNlIGEgYm9keTsgdXNlIHRoZSB1bnBhcnNlZCByZXNwb25zZSBhcyBhIGZhbGxiYWNrXG4gICAgICBkYXRhID0gcmVzcG9uc2UudGV4dDtcbiAgICB9XG4gICAgcmV0dXJuIGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhLCByZXR1cm5UeXBlKTtcbiAgfTtcblxuICAvKipcbiAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24uXG4gICAqIEBjYWxsYmFjayBtb2R1bGU6QXBpQ2xpZW50fmNhbGxBcGlDYWxsYmFja1xuICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgKiBAcGFyYW0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAqL1xuXG4gIC8qKlxuICAgKiBJbnZva2VzIHRoZSBSRVNUIHNlcnZpY2UgdXNpbmcgdGhlIHN1cHBsaWVkIHNldHRpbmdzIGFuZCBwYXJhbWV0ZXJzLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgYmFzZSBVUkwgdG8gaW52b2tlLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gaHR0cE1ldGhvZCBUaGUgSFRUUCBtZXRob2QgdG8gdXNlLlxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBTdHJpbmc+fSBwYXRoUGFyYW1zIEEgbWFwIG9mIHBhdGggcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBxdWVyeVBhcmFtcyBBIG1hcCBvZiBxdWVyeSBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IGNvbGxlY3Rpb25RdWVyeVBhcmFtcyBBIG1hcCBvZiBjb2xsZWN0aW9uIHF1ZXJ5IHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gaGVhZGVyUGFyYW1zIEEgbWFwIG9mIGhlYWRlciBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IGZvcm1QYXJhbXMgQSBtYXAgb2YgZm9ybSBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBib2R5UGFyYW0gVGhlIHZhbHVlIHRvIHBhc3MgYXMgdGhlIHJlcXVlc3QgYm9keS5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYXV0aE5hbWVzIEFuIGFycmF5IG9mIGF1dGhlbnRpY2F0aW9uIHR5cGUgbmFtZXMuXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGNvbnRlbnRUeXBlcyBBbiBhcnJheSBvZiByZXF1ZXN0IE1JTUUgdHlwZXMuXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGFjY2VwdHMgQW4gYXJyYXkgb2YgYWNjZXB0YWJsZSByZXNwb25zZSBNSU1FIHR5cGVzLlxuICAgKiBAcGFyYW0geyhTdHJpbmd8QXJyYXl8T2JqZWN0RnVuY3Rpb24pfSByZXR1cm5UeXBlIFRoZSByZXF1aXJlZCB0eXBlIHRvIHJldHVybjsgY2FuIGJlIGEgc3RyaW5nIGZvciBzaW1wbGUgdHlwZXMgb3IgdGhlXG4gICAqIGNvbnN0cnVjdG9yIGZvciBhIGNvbXBsZXggdHlwZS5cbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fmNhbGxBcGlDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgU3VwZXJBZ2VudCByZXF1ZXN0IG9iamVjdC5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmNhbGxBcGkgPSBmdW5jdGlvbiBjYWxsQXBpKHBhdGgsIGh0dHBNZXRob2QsIHBhdGhQYXJhbXMsXG4gICAgICBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIGJvZHlQYXJhbSwgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsXG4gICAgICByZXR1cm5UeXBlLCBjYWxsYmFjaykge1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgdXJsID0gdGhpcy5idWlsZFVybChwYXRoLCBwYXRoUGFyYW1zKTtcbiAgICB2YXIgcmVxdWVzdCA9IHN1cGVyYWdlbnQoaHR0cE1ldGhvZCwgdXJsKTtcblxuICAgIC8vIGFwcGx5IGF1dGhlbnRpY2F0aW9uc1xuICAgIHRoaXMuYXBwbHlBdXRoVG9SZXF1ZXN0KHJlcXVlc3QsIGF1dGhOYW1lcyk7XG5cbiAgICAvLyBzZXQgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgZm9yICh2YXIga2V5IGluIGNvbGxlY3Rpb25RdWVyeVBhcmFtcykge1xuICAgICAgaWYgKGNvbGxlY3Rpb25RdWVyeVBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHZhciBwYXJhbSA9IGNvbGxlY3Rpb25RdWVyeVBhcmFtc1trZXldO1xuICAgICAgICBpZiAocGFyYW0uY29sbGVjdGlvbkZvcm1hdCA9PT0gJ2NzdicpIHtcbiAgICAgICAgICAvLyBTdXBlckFnZW50IG5vcm1hbGx5IHBlcmNlbnQtZW5jb2RlcyBhbGwgcmVzZXJ2ZWQgY2hhcmFjdGVycyBpbiBhIHF1ZXJ5IHBhcmFtZXRlci4gSG93ZXZlcixcbiAgICAgICAgICAvLyBjb21tYXMgYXJlIHVzZWQgYXMgZGVsaW1pdGVycyBmb3IgdGhlICdjc3YnIGNvbGxlY3Rpb25Gb3JtYXQgc28gdGhleSBtdXN0IG5vdCBiZSBlbmNvZGVkLiBXZVxuICAgICAgICAgIC8vIG11c3QgdGhlcmVmb3JlIGNvbnN0cnVjdCBhbmQgZW5jb2RlICdjc3YnIGNvbGxlY3Rpb24gcXVlcnkgcGFyYW1ldGVycyBtYW51YWxseS5cbiAgICAgICAgICBpZiAocGFyYW0udmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gcGFyYW0udmFsdWUubWFwKHRoaXMucGFyYW1Ub1N0cmluZykubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbignLCcpO1xuICAgICAgICAgICAgcmVxdWVzdC5xdWVyeShlbmNvZGVVUklDb21wb25lbnQoa2V5KSArIFwiPVwiICsgdmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBBbGwgb3RoZXIgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzIHNob3VsZCBiZSB0cmVhdGVkIGFzIG9yZGluYXJ5IHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAgICAgICAgcXVlcnlQYXJhbXNba2V5XSA9IHRoaXMuYnVpbGRDb2xsZWN0aW9uUGFyYW0ocGFyYW0udmFsdWUsIHBhcmFtLmNvbGxlY3Rpb25Gb3JtYXQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc2V0IHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICBpZiAoaHR0cE1ldGhvZC50b1VwcGVyQ2FzZSgpID09PSAnR0VUJyAmJiB0aGlzLmNhY2hlID09PSBmYWxzZSkge1xuICAgICAgICBxdWVyeVBhcmFtc1snXyddID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfVxuICAgIHJlcXVlc3QucXVlcnkodGhpcy5ub3JtYWxpemVQYXJhbXMocXVlcnlQYXJhbXMpKTtcblxuICAgIC8vIHNldCBoZWFkZXIgcGFyYW1ldGVyc1xuICAgIHJlcXVlc3Quc2V0KHRoaXMuZGVmYXVsdEhlYWRlcnMpLnNldCh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhoZWFkZXJQYXJhbXMpKTtcblxuXG4gICAgLy8gc2V0IHJlcXVlc3RBZ2VudCBpZiBpdCBpcyBzZXQgYnkgdXNlclxuICAgIGlmICh0aGlzLnJlcXVlc3RBZ2VudCkge1xuICAgICAgcmVxdWVzdC5hZ2VudCh0aGlzLnJlcXVlc3RBZ2VudCk7XG4gICAgfVxuXG4gICAgLy8gc2V0IHJlcXVlc3QgdGltZW91dFxuICAgIHJlcXVlc3QudGltZW91dCh0aGlzLnRpbWVvdXQpO1xuXG4gICAgdmFyIGNvbnRlbnRUeXBlID0gdGhpcy5qc29uUHJlZmVycmVkTWltZShjb250ZW50VHlwZXMpO1xuICAgIGlmIChjb250ZW50VHlwZSkge1xuICAgICAgLy8gSXNzdWUgd2l0aCBzdXBlcmFnZW50IGFuZCBtdWx0aXBhcnQvZm9ybS1kYXRhIChodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvc3VwZXJhZ2VudC9pc3N1ZXMvNzQ2KVxuICAgICAgaWYoY29udGVudFR5cGUgIT0gJ211bHRpcGFydC9mb3JtLWRhdGEnKSB7XG4gICAgICAgIHJlcXVlc3QudHlwZShjb250ZW50VHlwZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghcmVxdWVzdC5oZWFkZXJbJ0NvbnRlbnQtVHlwZSddKSB7XG4gICAgICByZXF1ZXN0LnR5cGUoJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICB9XG5cbiAgICBpZiAoY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKSB7XG4gICAgICByZXF1ZXN0LnNlbmQocXVlcnlzdHJpbmcuc3RyaW5naWZ5KHRoaXMubm9ybWFsaXplUGFyYW1zKGZvcm1QYXJhbXMpKSk7XG4gICAgfSBlbHNlIGlmIChjb250ZW50VHlwZSA9PSAnbXVsdGlwYXJ0L2Zvcm0tZGF0YScpIHtcbiAgICAgIHZhciBfZm9ybVBhcmFtcyA9IHRoaXMubm9ybWFsaXplUGFyYW1zKGZvcm1QYXJhbXMpO1xuICAgICAgZm9yICh2YXIga2V5IGluIF9mb3JtUGFyYW1zKSB7XG4gICAgICAgIGlmIChfZm9ybVBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNGaWxlUGFyYW0oX2Zvcm1QYXJhbXNba2V5XSkpIHtcbiAgICAgICAgICAgIC8vIGZpbGUgZmllbGRcbiAgICAgICAgICAgIHJlcXVlc3QuYXR0YWNoKGtleSwgX2Zvcm1QYXJhbXNba2V5XSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcXVlc3QuZmllbGQoa2V5LCBfZm9ybVBhcmFtc1trZXldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGJvZHlQYXJhbSkge1xuICAgICAgcmVxdWVzdC5zZW5kKGJvZHlQYXJhbSk7XG4gICAgfVxuXG4gICAgdmFyIGFjY2VwdCA9IHRoaXMuanNvblByZWZlcnJlZE1pbWUoYWNjZXB0cyk7XG4gICAgaWYgKGFjY2VwdCkge1xuICAgICAgcmVxdWVzdC5hY2NlcHQoYWNjZXB0KTtcbiAgICB9XG5cbiAgICBpZiAocmV0dXJuVHlwZSA9PT0gJ0Jsb2InKSB7XG4gICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSgnYmxvYicpO1xuICAgIH0gZWxzZSBpZiAocmV0dXJuVHlwZSA9PT0gJ1N0cmluZycpIHtcbiAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlKCdzdHJpbmcnKTtcbiAgICB9XG5cbiAgICAvLyBBdHRhY2ggcHJldmlvdXNseSBzYXZlZCBjb29raWVzLCBpZiBlbmFibGVkXG4gICAgaWYgKHRoaXMuZW5hYmxlQ29va2llcyl7XG4gICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5hZ2VudC5hdHRhY2hDb29raWVzKHJlcXVlc3QpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHJlcXVlc3Qud2l0aENyZWRlbnRpYWxzKCk7XG4gICAgICB9XG4gICAgfVxuXG5cbiAgICByZXF1ZXN0LmVuZChmdW5jdGlvbihlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICB2YXIgZGF0YSA9IG51bGw7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgZGF0YSA9IF90aGlzLmRlc2VyaWFsaXplKHJlc3BvbnNlLCByZXR1cm5UeXBlKTtcbiAgICAgICAgICAgIGlmIChfdGhpcy5lbmFibGVDb29raWVzICYmIHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKXtcbiAgICAgICAgICAgICAgX3RoaXMuYWdlbnQuc2F2ZUNvb2tpZXMocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgZXJyb3IgPSBlcnI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVxdWVzdDtcbiAgfTtcblxuICAvKipcbiAgICogUGFyc2VzIGFuIElTTy04NjAxIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGRhdGUgdmFsdWUuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIGRhdGUgdmFsdWUgYXMgYSBzdHJpbmcuXG4gICAqIEByZXR1cm5zIHtEYXRlfSBUaGUgcGFyc2VkIGRhdGUgb2JqZWN0LlxuICAgKi9cbiAgZXhwb3J0cy5wYXJzZURhdGUgPSBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoc3RyLnJlcGxhY2UoL1QvaSwgJyAnKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGEgdmFsdWUgdG8gdGhlIHNwZWNpZmllZCB0eXBlLlxuICAgKiBAcGFyYW0geyhTdHJpbmd8T2JqZWN0KX0gZGF0YSBUaGUgZGF0YSB0byBjb252ZXJ0LCBhcyBhIHN0cmluZyBvciBvYmplY3QuXG4gICAqIEBwYXJhbSB7KFN0cmluZ3xBcnJheS48U3RyaW5nPnxPYmplY3QuPFN0cmluZywgT2JqZWN0PnxGdW5jdGlvbil9IHR5cGUgVGhlIHR5cGUgdG8gcmV0dXJuLiBQYXNzIGEgc3RyaW5nIGZvciBzaW1wbGUgdHlwZXNcbiAgICogb3IgdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBhIGNvbXBsZXggdHlwZS4gUGFzcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSB0eXBlIG5hbWUgdG8gcmV0dXJuIGFuIGFycmF5IG9mIHRoYXQgdHlwZS4gVG9cbiAgICogcmV0dXJuIGFuIG9iamVjdCwgcGFzcyBhbiBvYmplY3Qgd2l0aCBvbmUgcHJvcGVydHkgd2hvc2UgbmFtZSBpcyB0aGUga2V5IHR5cGUgYW5kIHdob3NlIHZhbHVlIGlzIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlIHR5cGU6XG4gICAqIGFsbCBwcm9wZXJ0aWVzIG9uIDxjb2RlPmRhdGE8Y29kZT4gd2lsbCBiZSBjb252ZXJ0ZWQgdG8gdGhpcyB0eXBlLlxuICAgKiBAcmV0dXJucyBBbiBpbnN0YW5jZSBvZiB0aGUgc3BlY2lmaWVkIHR5cGUgb3IgbnVsbCBvciB1bmRlZmluZWQgaWYgZGF0YSBpcyBudWxsIG9yIHVuZGVmaW5lZC5cbiAgICovXG4gIGV4cG9ydHMuY29udmVydFRvVHlwZSA9IGZ1bmN0aW9uKGRhdGEsIHR5cGUpIHtcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCB8fCBkYXRhID09PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gZGF0YVxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdCb29sZWFuJzpcbiAgICAgICAgcmV0dXJuIEJvb2xlYW4oZGF0YSk7XG4gICAgICBjYXNlICdJbnRlZ2VyJzpcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KGRhdGEsIDEwKTtcbiAgICAgIGNhc2UgJ051bWJlcic6XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KGRhdGEpO1xuICAgICAgY2FzZSAnU3RyaW5nJzpcbiAgICAgICAgcmV0dXJuIFN0cmluZyhkYXRhKTtcbiAgICAgIGNhc2UgJ0RhdGUnOlxuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURhdGUoU3RyaW5nKGRhdGEpKTtcbiAgICAgIGNhc2UgJ0Jsb2InOlxuICAgICAgXHRyZXR1cm4gZGF0YTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmICh0eXBlID09PSBPYmplY3QpIHtcbiAgICAgICAgICAvLyBnZW5lcmljIG9iamVjdCwgcmV0dXJuIGRpcmVjdGx5XG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAvLyBmb3IgbW9kZWwgdHlwZSBsaWtlOiBVc2VyXG4gICAgICAgICAgcmV0dXJuIHR5cGUuY29uc3RydWN0RnJvbU9iamVjdChkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHR5cGUpKSB7XG4gICAgICAgICAgLy8gZm9yIGFycmF5IHR5cGUgbGlrZTogWydTdHJpbmcnXVxuICAgICAgICAgIHZhciBpdGVtVHlwZSA9IHR5cGVbMF07XG4gICAgICAgICAgcmV0dXJuIGRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBleHBvcnRzLmNvbnZlcnRUb1R5cGUoaXRlbSwgaXRlbVR5cGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0eXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIC8vIGZvciBwbGFpbiBvYmplY3QgdHlwZSBsaWtlOiB7J1N0cmluZyc6ICdJbnRlZ2VyJ31cbiAgICAgICAgICB2YXIga2V5VHlwZSwgdmFsdWVUeXBlO1xuICAgICAgICAgIGZvciAodmFyIGsgaW4gdHlwZSkge1xuICAgICAgICAgICAgaWYgKHR5cGUuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgICAga2V5VHlwZSA9IGs7XG4gICAgICAgICAgICAgIHZhbHVlVHlwZSA9IHR5cGVba107XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICAgICAgZm9yICh2YXIgayBpbiBkYXRhKSB7XG4gICAgICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICB2YXIga2V5ID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGssIGtleVR5cGUpO1xuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBleHBvcnRzLmNvbnZlcnRUb1R5cGUoZGF0YVtrXSwgdmFsdWVUeXBlKTtcbiAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBmb3IgdW5rbm93biB0eXBlLCByZXR1cm4gdGhlIGRhdGEgZGlyZWN0bHlcbiAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBtYXAgb3IgYXJyYXkgbW9kZWwgZnJvbSBSRVNUIGRhdGEuXG4gICAqIEBwYXJhbSBkYXRhIHtPYmplY3R8QXJyYXl9IFRoZSBSRVNUIGRhdGEuXG4gICAqIEBwYXJhbSBvYmoge09iamVjdHxBcnJheX0gVGhlIHRhcmdldCBvYmplY3Qgb3IgYXJyYXkuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmosIGl0ZW1UeXBlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShpKSlcbiAgICAgICAgICBvYmpbaV0gPSBleHBvcnRzLmNvbnZlcnRUb1R5cGUoZGF0YVtpXSwgaXRlbVR5cGUpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBrIGluIGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaykpXG4gICAgICAgICAgb2JqW2tdID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGFba10sIGl0ZW1UeXBlKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24uXG4gICAqIEB0eXBlIHttb2R1bGU6QXBpQ2xpZW50fVxuICAgKi9cbiAgZXhwb3J0cy5pbnN0YW5jZSA9IG5ldyBleHBvcnRzKCk7XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUGFyYW1ldGVyTGlzdCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkJ1aWxkQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBhcmFtZXRlckxpc3QpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgUGFyYW1ldGVyTGlzdCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIEJ1aWxkIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL0J1aWxkQXBpXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IEJ1aWxkQXBpLiBcbiAgICogQGFsaWFzIG1vZHVsZTphcGkvQnVpbGRBcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgYnVpbGRBTk4gb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0J1aWxkQXBpfmJ1aWxkQU5OQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHBhc3NlcyBhbGwgbGVhcm5pbmcgYW5kIEFOTiBwYXJhbWV0ZXJzIHRvIHRoZSBzZXJ2ZXJcbiAgICAgKiBJbmNsdWRlcyBsZWFybmluZyBwYXJhbWV0ZXJzIGFuZCBBTk4gdG9wb2xvZ3lcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBpbnB1dFBhcmFtZXRlcnMgb2JqZWN0IHdpdGggYWxsIHR1bmFibGUgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9CdWlsZEFwaX5idWlsZEFOTkNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMuYnVpbGRBTk4gPSBmdW5jdGlvbihpbnB1dFBhcmFtZXRlcnMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBpbnB1dFBhcmFtZXRlcnM7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlcnMnIGlzIHNldFxuICAgICAgaWYgKGlucHV0UGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkIHx8IGlucHV0UGFyYW1ldGVycyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVycycgd2hlbiBjYWxsaW5nIGJ1aWxkQU5OXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9idWlsZC9idWlsZEFOTicsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0QU5OUGFyYW1ldGVyIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9CdWlsZEFwaX5nZXRBTk5QYXJhbWV0ZXJDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIHBhcmFtZXRlciBzZXQgb2YgdGhlIGNyZWF0ZWQgQU5OXG4gICAgICogcmV0dXJucyBhIG9iamVjdCBvZiB0eXBlIFBhcmFtZXRlckxpc3RcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+Z2V0QU5OUGFyYW1ldGVyQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9XG4gICAgICovXG4gICAgdGhpcy5nZXRBTk5QYXJhbWV0ZXIgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gUGFyYW1ldGVyTGlzdDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvYnVpbGQvZ2V0QU5OUGFyYW1ldGVyJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldElucHV0U2hhcGUgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0J1aWxkQXBpfmdldElucHV0U2hhcGVDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHtBcnJheS48J051bWJlcic+fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgaW5wdXQgc2hhcGUgb2YgdGhlIHRyYWluIGRhdGFcbiAgICAgKiByZXR1cm5zIHRoZSBpbnB1dCBzaGFwZSBvZiB0aGUgdHJhaW4gZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBuYW1lIG9mIHRoZSBkYXRhc2V0IChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0J1aWxkQXBpfmdldElucHV0U2hhcGVDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBBcnJheS48J051bWJlcic+fVxuICAgICAqL1xuICAgIHRoaXMuZ2V0SW5wdXRTaGFwZSA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ051bWJlciddO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9idWlsZC9nZXRJbnB1dFNoYXBlJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvSW1hZ2VEYXRhJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9JbWFnZURhdGEnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Mb2FkQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlRGF0YSk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZURhdGEpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBMb2FkIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL0xvYWRBcGlcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgTG9hZEFwaS4gXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL0xvYWRBcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0QXZhaWxhYmxlRGF0YVNldHMgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0QXZhaWxhYmxlRGF0YVNldHNDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHtBcnJheS48J1N0cmluZyc+fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogZ2V0IGF2YWlsYWJsZSBkYXRhIHNldHNcbiAgICAgKiByZXR1cm5zIGEgbGlzdCBvZiBhdmFpbGFibGUgZGF0YSBzZXQgZmlsZXNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRBdmFpbGFibGVEYXRhU2V0c0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIEFycmF5LjwnU3RyaW5nJz59XG4gICAgICovXG4gICAgdGhpcy5nZXRBdmFpbGFibGVEYXRhU2V0cyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ1N0cmluZyddO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldEF2YWlsYWJsZURhdGFTZXRzJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEltYWdlQmF0Y2ggb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VCYXRjaENhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIGlucHV0L291dHB1dCBpbWFnZXNcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5iYXRjaFNpemUgZGVmaW5lcyB0aGUgbnVtYmVyIG9mIHJldHVybiBpbWFnZXMgKGRlZmF1bHQgdG8gMTAwKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQmF0Y2hDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0SW1hZ2VCYXRjaCA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnYmF0Y2hfc2l6ZSc6IG9wdHNbJ2JhdGNoU2l6ZSddLFxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgICAnc29ydF9ieSc6IG9wdHNbJ3NvcnRCeSddLFxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXG4gICAgICAgICdvdXRwdXQnOiBvcHRzWydvdXRwdXQnXSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvZ2V0SW1hZ2VCYXRjaCcsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZUJ5SWQgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VCeUlkQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSBzaW5nbGUgaW5wdXQvb3V0cHV0IGltYWdlXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gaWQgZGVmaW5lcyB0aGUgaWQgb2YgdGhlIGltYWdlc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJ5SWRDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0SW1hZ2VCeUlkID0gZnVuY3Rpb24oaWQsIG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpZCcgaXMgc2V0XG4gICAgICBpZiAoaWQgPT09IHVuZGVmaW5lZCB8fCBpZCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyB3aGVuIGNhbGxpbmcgZ2V0SW1hZ2VCeUlkXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2lkJzogaWQsXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRJbWFnZUJ5SWQnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW1hZ2VzIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlc0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgc3Vic2V0IG9mIGlucHV0L291dHB1dCBpbWFnZXNcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzdGFydElkeCBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZW5kSWR4IG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0SW1hZ2VzID0gZnVuY3Rpb24oc3RhcnRJZHgsIGVuZElkeCwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3N0YXJ0SWR4JyBpcyBzZXRcbiAgICAgIGlmIChzdGFydElkeCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0SWR4ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc3RhcnRJZHgnIHdoZW4gY2FsbGluZyBnZXRJbWFnZXNcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdlbmRJZHgnIGlzIHNldFxuICAgICAgaWYgKGVuZElkeCA9PT0gdW5kZWZpbmVkIHx8IGVuZElkeCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2VuZElkeCcgd2hlbiBjYWxsaW5nIGdldEltYWdlc1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdzdGFydF9pZHgnOiBzdGFydElkeCxcbiAgICAgICAgJ2VuZF9pZHgnOiBlbmRJZHgsXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRJbWFnZXMnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0TGF0ZW50UmVwcmVzZW50YXRpb25CeUlkIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldExhdGVudFJlcHJlc2VudGF0aW9uQnlJZENhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgc2luZ2xlIGxhdGVudCByZXByZXNlbnRhdGlvbiBhcyAoKWxpc3Qgb2YpIHBuZyBpbWFnZXNcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBkZWZpbmVzIHRoZSBpZCBvZiB0aGUgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldExhdGVudFJlcHJlc2VudGF0aW9uQnlJZENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWQgPSBmdW5jdGlvbihpZCwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyBpcyBzZXRcbiAgICAgIGlmIChpZCA9PT0gdW5kZWZpbmVkIHx8IGlkID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaWQnIHdoZW4gY2FsbGluZyBnZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWRcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnaWQnOiBpZCxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvZ2V0TGF0ZW50UmVwcmVzZW50YXRpb25CeUlkJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldExvYWRlZERhdGFTZXRzIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldExvYWRlZERhdGFTZXRzQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7QXJyYXkuPCdTdHJpbmcnPn0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIGdldCBsb2FkZWQgZGF0YSBzZXRzXG4gICAgICogcmV0dXJucyBhIGxpc3Qgb2YgbG9hZGVkIGRhdGEgc2V0c1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldExvYWRlZERhdGFTZXRzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgQXJyYXkuPCdTdHJpbmcnPn1cbiAgICAgKi9cbiAgICB0aGlzLmdldExvYWRlZERhdGFTZXRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFsnU3RyaW5nJ107XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvZ2V0TG9hZGVkRGF0YVNldHMnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UmFuZG9tSW1hZ2VzIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldFJhbmRvbUltYWdlc0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIGlucHV0L291dHB1dCBpbWFnZXNcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5iYXRjaFNpemUgZGVmaW5lcyB0aGUgbnVtYmVyIG9mIHJldHVybiBpbWFnZXMgKGRlZmF1bHQgdG8gMTAwKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldFJhbmRvbUltYWdlc0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRSYW5kb21JbWFnZXMgPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2JhdGNoX3NpemUnOiBvcHRzWydiYXRjaFNpemUnXSxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldFJhbmRvbUltYWdlcycsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBsb2FkRmlsZSBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5sb2FkRmlsZUNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGEgdHJhaW4vdGVzdCBkYXRhIGZpbGVcbiAgICAgKiBMb2FkIGEgZGF0YSBmaWxlIGluIGRpZmZlcmVudCBkYXRhIGZvcm1hdHNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZmlsZW5hbWUgXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5yZWFkTGFiZWxzIHRydWUgdG8gcmVhZCBsYWJlbHMgKGRlZmF1bHQgdG8gZmFsc2UpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YVR5cGUgZGV0ZXJtaW5lcyB0aGUgZGF0YSBmb3JtYXQgb2YgdGhlIGlucHV0IGZpbGUgKGRlZmF1bHQgdG8gYXV0bylcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5sb2FkRmlsZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMubG9hZEZpbGUgPSBmdW5jdGlvbihmaWxlbmFtZSwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2ZpbGVuYW1lJyBpcyBzZXRcbiAgICAgIGlmIChmaWxlbmFtZSA9PT0gdW5kZWZpbmVkIHx8IGZpbGVuYW1lID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZmlsZW5hbWUnIHdoZW4gY2FsbGluZyBsb2FkRmlsZVwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdmaWxlbmFtZSc6IGZpbGVuYW1lLFxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgICAncmVhZF9sYWJlbHMnOiBvcHRzWydyZWFkTGFiZWxzJ10sXG4gICAgICAgICdkYXRhX3R5cGUnOiBvcHRzWydkYXRhVHlwZSddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvbG9hZEZpbGUnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIHJlc2V0QWxsQmF0Y2hJbmRpY2VzIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfnJlc2V0QWxsQmF0Y2hJbmRpY2VzQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJlc2V0cyBhbGwgYmF0Y2ggaW5kaWNlcyBvZiBhbGwgaW1hZ2Ugc2V0c1xuICAgICAqIHJlc2V0cyBhbGwgYmF0Y2ggaW5kaWNlcyBvZiBhbGwgaW1hZ2Ugc2V0c1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfnJlc2V0QWxsQmF0Y2hJbmRpY2VzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5yZXNldEFsbEJhdGNoSW5kaWNlcyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL3Jlc2V0QWxsQmF0Y2hJbmRpY2VzJywgJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSByZXNldEJhdGNoSW5kZXggb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+cmVzZXRCYXRjaEluZGV4Q2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJlc2V0cyB0aGUgYmF0Y2ggaW5kZXggb2YgdGhlIGltYWdlIHNldFxuICAgICAqIHJlc2V0cyB0aGUgYmF0Y2ggaW5kZXggb2YgdGhlIGltYWdlIHNldFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IHJlc2V0IG91dHB1dCBpbWFnZSBiYXRjaCBpbmRleCBpbnN0ZWFkIG9mIGlucHV0IGltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5yZXNldEJhdGNoSW5kZXhDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLnJlc2V0QmF0Y2hJbmRleCA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvcmVzZXRCYXRjaEluZGV4JywgJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSB1cGxvYWRGaWxlIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfnVwbG9hZEZpbGVDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogdXBsb2FkcyBhIGRhdGEgZmlsZVxuICAgICAqIExvYWQgYSBkYXRhIGZpbGUgaW4gZGlmZmVyZW50IGRhdGEgZm9ybWF0c1xuICAgICAqIEBwYXJhbSB7RmlsZX0gdXBmaWxlIFRoZSBmaWxlIHRvIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX51cGxvYWRGaWxlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy51cGxvYWRGaWxlID0gZnVuY3Rpb24odXBmaWxlLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3VwZmlsZScgaXMgc2V0XG4gICAgICBpZiAodXBmaWxlID09PSB1bmRlZmluZWQgfHwgdXBmaWxlID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndXBmaWxlJyB3aGVuIGNhbGxpbmcgdXBsb2FkRmlsZVwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgICAndXBmaWxlJzogdXBmaWxlXG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydtdWx0aXBhcnQvZm9ybS1kYXRhJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFtdO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL3VwbG9hZEZpbGUnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJywgJ21vZGVsL1RyYWluUGVyZm9ybWFuY2UnLCAnbW9kZWwvVHJhaW5TdGF0dXMnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblBlcmZvcm1hbmNlJyksIHJlcXVpcmUoJy4uL21vZGVsL1RyYWluU3RhdHVzJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5BcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBQcm9jZXNzZWRJbWFnZURhdGEsIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluU3RhdHVzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogVHJhaW4gc2VydmljZS5cbiAgICogQG1vZHVsZSBhcGkvVHJhaW5BcGlcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgVHJhaW5BcGkuIFxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9UcmFpbkFwaVxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBjb250cm9sVHJhaW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1RyYWluQXBpfmNvbnRyb2xUcmFpbmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHRyYWluaW5nXG4gICAgICogdXNlcyBhIHN0cmluZyBlbnVtXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9IHRyYWluU3RhdHVzIG5ldyBzdGF0dXMgZm9yIHRyYWluaW5nXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIGRldGVybWluZXMgZGF0YSBzZXQgZm9yIHRyYWluaW5nXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1RyYWluQXBpfmNvbnRyb2xUcmFpbmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMuY29udHJvbFRyYWluaW5nID0gZnVuY3Rpb24odHJhaW5TdGF0dXMsIG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndHJhaW5TdGF0dXMnIGlzIHNldFxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgd2hlbiBjYWxsaW5nIGNvbnRyb2xUcmFpbmluZ1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdkYXRhc2V0TmFtZSc6IG9wdHNbJ2RhdGFzZXROYW1lJ10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHJhaW4vY29udHJvbFRyYWluaW5nJywgJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRQcm9jZXNzZWRJbWFnZURhdGEgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1RyYWluQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YUNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgc3Vic2V0IG9mIHRoZSBjdXJyZW50IHRyYWluIGltYWdlcyBhbmQgdGhlIGNvcnJlc3BvbmRpbmcgbGF0ZW50IHJlcHJlc2VudGF0aW9uIGFuZCBvdXRwdXRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gc2V0U2l6ZSBzaXplIG9mIHRoZSBpbWFnZSBzdWJzZXRcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YSA9IGZ1bmN0aW9uKHNldFNpemUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XG4gICAgICBpZiAoc2V0U2l6ZSA9PT0gdW5kZWZpbmVkIHx8IHNldFNpemUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyB3aGVuIGNhbGxpbmcgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ3NldFNpemUnOiBzZXRTaXplLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFByb2Nlc3NlZEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHJhaW4vZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2Ugb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1RyYWluQXBpfmdldFRyYWluUGVyZm9ybWFuY2VDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2Ygc2NhbGFyIHRyYWluIHZhcmlhYmxlc1xuICAgICAqIGFzIGxpc3Qgb2YgZGljdHNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBUcmFpblBlcmZvcm1hbmNlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90cmFpbi9nZXRUcmFpblBlcmZvcm1hbmNlJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUGFyYW1ldGVyTGlzdCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblN0YXR1cyddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlR1bmVBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBQYXJhbWV0ZXJMaXN0LCBQcm9jZXNzZWRJbWFnZURhdGEsIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluU3RhdHVzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogVHVuZSBzZXJ2aWNlLlxuICAgKiBAbW9kdWxlIGFwaS9UdW5lQXBpXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFR1bmVBcGkuIFxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9UdW5lQXBpXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGFwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbCBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5hcHBseVNwZWNpZmljVHVuaW5nQXNEZWZhdWx0TW9kZWxDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogc2V0cyBhIGdpdmVuIHR1bmVkIG1vZGVsIGFzIGRlZmF1bHQgbW9kZWxcbiAgICAgKiBzZXRzIGEgZ2l2ZW4gdHVuZWQgbW9kZWwgYXMgZGVmYXVsdCBtb2RlbFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtb2RlbElkIG1vZGVsIGlkIG9mIHRoZSB0dW5lZCBtb2RlbFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmFwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMuYXBwbHlTcGVjaWZpY1R1bmluZ0FzRGVmYXVsdE1vZGVsID0gZnVuY3Rpb24obW9kZWxJZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcbiAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIHdoZW4gY2FsbGluZyBhcHBseVNwZWNpZmljVHVuaW5nQXNEZWZhdWx0TW9kZWxcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnbW9kZWxJZCc6IG1vZGVsSWQsXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9hcHBseVNwZWNpZmljVHVuaW5nQXNEZWZhdWx0TW9kZWwnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGJ1aWxkR3JpZFNlYXJjaEFOTiBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5idWlsZEdyaWRTZWFyY2hBTk5DYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcGFzc2VzIGFsbCBsZWFybmluZyBhbmQgQU5OIHBhcmFtZXRlcnMgdG8gdGhlIHNlcnZlclxuICAgICAqIEluY2x1ZGVzIGxlYXJuaW5nIHBhcmFtZXRlcnMgYW5kIEFOTiB0b3BvbG9neSBhcyBsaXN0c1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGlucHV0UGFyYW1ldGVyTGlzdHMgb2JqZWN0IHdpdGggYWxsIHR1bmFibGUgcGFyYW1ldGVyIGxpc3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5kZWxldGVQcmV2aW91c01vZGVscyBpZiB0cnVlIGRlbGV0ZSBhbGwgcHJldmlvdXMgdHVuZWQgbW9kZWxzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmJ1aWxkR3JpZFNlYXJjaEFOTkNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMuYnVpbGRHcmlkU2VhcmNoQU5OID0gZnVuY3Rpb24oaW5wdXRQYXJhbWV0ZXJMaXN0cywgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gaW5wdXRQYXJhbWV0ZXJMaXN0cztcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVyTGlzdHMnIGlzIHNldFxuICAgICAgaWYgKGlucHV0UGFyYW1ldGVyTGlzdHMgPT09IHVuZGVmaW5lZCB8fCBpbnB1dFBhcmFtZXRlckxpc3RzID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJMaXN0cycgd2hlbiBjYWxsaW5nIGJ1aWxkR3JpZFNlYXJjaEFOTlwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdkZWxldGVQcmV2aW91c01vZGVscyc6IG9wdHNbJ2RlbGV0ZVByZXZpb3VzTW9kZWxzJ10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9idWlsZEdyaWRTZWFyY2hBTk4nLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Y29udHJvbFR1bmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHR1bmluZ1xuICAgICAqIHVzZXMgYSBzdHJpbmcgZW51bVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfSB0cmFpblN0YXR1cyBuZXcgc3RhdHVzIGZvciB0cmFpbmluZ1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmNvbnRyb2xUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLmNvbnRyb2xUdW5pbmcgPSBmdW5jdGlvbih0cmFpblN0YXR1cywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndHJhaW5TdGF0dXMnIGlzIHNldFxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgd2hlbiBjYWxsaW5nIGNvbnRyb2xUdW5pbmdcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3R1bmUvY29udHJvbFR1bmluZycsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgc3Vic2V0IG9mIHRoZSBjdXJyZW50IHRyYWluIGltYWdlcyBhbmQgdGhlIGNvcnJlc3BvbmRpbmcgbGF0ZW50IHJlcHJlc2VudGF0aW9uIGFuZCBvdXRwdXRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gc2V0U2l6ZSBzaXplIG9mIHRoZSBpbWFnZSBzdWJzZXRcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nID0gZnVuY3Rpb24oc2V0U2l6ZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyBpcyBzZXRcbiAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmdcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemUsXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gUHJvY2Vzc2VkSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2dldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZycsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHNldFNpemUgc2l6ZSBvZiB0aGUgaW1hZ2Ugc3Vic2V0XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nID0gZnVuY3Rpb24oc2V0U2l6ZSwgbW9kZWxJZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyBpcyBzZXRcbiAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nXCIpO1xuICAgICAgfVxuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgaXMgc2V0XG4gICAgICBpZiAobW9kZWxJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZ1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdzZXRTaXplJzogc2V0U2l6ZSxcbiAgICAgICAgJ21vZGVsSWQnOiBtb2RlbElkLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFByb2Nlc3NlZEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9nZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgbmV4dCBiYXRjaCBvZiBzY2FsYXIgdHJhaW4gdmFyaWFibGVzXG4gICAgICogYXMgbGlzdCBvZiBkaWN0c1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmcgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2VPZlNwZWNpZmljVHVuaW5nIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmdldFRyYWluUGVyZm9ybWFuY2VPZlNwZWNpZmljVHVuaW5nQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHRoZSBjb21wbGV0ZSBzZXQgb2Ygc2NhbGFyIHRyYWluIHZhcmlhYmxlcyB0byBhIGdpdmVuIG1vZGVsXG4gICAgICogYXMgbGlzdCBvZiBkaWN0c1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtb2RlbElkIG1vZGVsIGlkIG9mIHRoZSBleHNwZWN0ZWQgcGFyYW1ldGVyIHNldFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFRyYWluUGVyZm9ybWFuY2VPZlNwZWNpZmljVHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9XG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZyA9IGZ1bmN0aW9uKG1vZGVsSWQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgaXMgc2V0XG4gICAgICBpZiAobW9kZWxJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnbW9kZWxJZCc6IG1vZGVsSWQsXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9nZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZycsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUdW5lTW9kZWxJZHMgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZU1vZGVsSWRzQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7QXJyYXkuPCdTdHJpbmcnPn0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSBsaXN0IG9mIGFsbCB0dW5lZCBtb2RlbCBpZHNcbiAgICAgKiByZXR1cm5zIGEgbGlzdCBvZiBhbGwgdHVuZWQgbW9kZWwgaWRzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZU1vZGVsSWRzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgQXJyYXkuPCdTdHJpbmcnPn1cbiAgICAgKi9cbiAgICB0aGlzLmdldFR1bmVNb2RlbElkcyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ1N0cmluZyddO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2dldFR1bmVNb2RlbElkcycsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUdW5lUGFyYW1ldGVyIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmdldFR1bmVQYXJhbWV0ZXJDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIHBhcmFtZXRlciBzZXQgb2YgdGhlIEFOTiB3aXRoIHRoZSBnaXZlbiBtb2RlbCBpZFxuICAgICAqIHJldHVybnMgYSBvYmplY3Qgb2YgdHlwZSBQYXJhbWV0ZXJMaXN0XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZVBhcmFtZXRlckNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fVxuICAgICAqL1xuICAgIHRoaXMuZ2V0VHVuZVBhcmFtZXRlciA9IGZ1bmN0aW9uKG1vZGVsSWQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgaXMgc2V0XG4gICAgICBpZiAobW9kZWxJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHVuZVBhcmFtZXRlclwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBQYXJhbWV0ZXJMaXN0O1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2dldFR1bmVQYXJhbWV0ZXInLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHVuZWRNb2RlbEFzWmlwIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmdldFR1bmVkTW9kZWxBc1ppcENhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge0ZpbGV9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgemlwIGZpbGUgd2l0aCB0aGUgcHJlIHRyYWluZWQgbW9kZWwgYXMgcnVuYWJsZSBweXRob24gc2NyaXB0XG4gICAgICogXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIHR1bmVkIG1vZGVsXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZWRNb2RlbEFzWmlwQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgRmlsZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFR1bmVkTW9kZWxBc1ppcCA9IGZ1bmN0aW9uKG1vZGVsSWQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgaXMgc2V0XG4gICAgICBpZiAobW9kZWxJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZGVsSWQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHVuZWRNb2RlbEFzWmlwXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ21vZGVsSWQnOiBtb2RlbElkLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ211bHRpcGFydC9mb3JtLWRhdGEnXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gRmlsZTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9nZXRUdW5lZE1vZGVsQXNaaXAnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9DbHVzdGVyUGFyYW1ldGVycycsICdtb2RlbC9DbHVzdGVyaW5nJywgJ21vZGVsL0ltYWdlJywgJ21vZGVsL1BvaW50MkQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJyksIHJlcXVpcmUoJy4uL21vZGVsL0NsdXN0ZXJpbmcnKSwgcmVxdWlyZSgnLi4vbW9kZWwvSW1hZ2UnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUG9pbnQyRCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlZpc3VhbGl6ZUFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyUGFyYW1ldGVycywgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ2x1c3RlcmluZywgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBvaW50MkQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgQ2x1c3RlclBhcmFtZXRlcnMsIENsdXN0ZXJpbmcsIEltYWdlLCBQb2ludDJEKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogVmlzdWFsaXplIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL1Zpc3VhbGl6ZUFwaVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBWaXN1YWxpemVBcGkuIFxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgY29tcHV0ZUhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpfmNvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogc3RhcnRzIHRoZSBjbHVzdGVyaW5nIG9mIHRoZSBsYXRlbnQgcmVwcmVzZW50YXRpb24gb2YgYSBoaWRkZW4gbGF5ZXJcbiAgICAgKiBzdGFydHMgdGhlIGNsdXN0ZXJpbmcgb2YgdGhlIGxhdGVudCByZXByZXNlbnRhdGlvbiBvZiBhIGhpZGRlbiBsYXllclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhbGdvcml0aG0gZGV0ZXJtaW5lcyB0aGUgY2x1dGVyaW5nIGFsZ29yaXRobVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkaW1lbnNpb25SZWR1Y3Rpb24gZGV0ZXJtaW5lcyB0aGUgYWxnb3JpdGhtIGZvciBkaW0gcmVkdWN0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIGRldGVybWluZXMgdGhlIGRhdGFzZXQgd2hpY2ggc2hvdWxkIGJlIGNsdXN0ZXJlZCAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmxheWVyIGRldGVybWluZXMgdGhlIGhpZGRlbiBsYXllclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfSBvcHRzLmNsdXN0ZXJQYXJhbWV0ZXJzIGRldGVybWluZXMgdGhlIGNsdXRlcmluZyBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5jb21wdXRlSGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5jb21wdXRlSGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nID0gZnVuY3Rpb24oYWxnb3JpdGhtLCBkaW1lbnNpb25SZWR1Y3Rpb24sIG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG9wdHNbJ2NsdXN0ZXJQYXJhbWV0ZXJzJ107XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdhbGdvcml0aG0nIGlzIHNldFxuICAgICAgaWYgKGFsZ29yaXRobSA9PT0gdW5kZWZpbmVkIHx8IGFsZ29yaXRobSA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2FsZ29yaXRobScgd2hlbiBjYWxsaW5nIGNvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdkaW1lbnNpb25SZWR1Y3Rpb24nIGlzIHNldFxuICAgICAgaWYgKGRpbWVuc2lvblJlZHVjdGlvbiA9PT0gdW5kZWZpbmVkIHx8IGRpbWVuc2lvblJlZHVjdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2RpbWVuc2lvblJlZHVjdGlvbicgd2hlbiBjYWxsaW5nIGNvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnYWxnb3JpdGhtJzogYWxnb3JpdGhtLFxuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcbiAgICAgICAgJ2RpbWVuc2lvbl9yZWR1Y3Rpb24nOiBkaW1lbnNpb25SZWR1Y3Rpb24sXG4gICAgICAgICdsYXllcic6IG9wdHNbJ2xheWVyJ10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdmlzdWFsaXplL2NvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50Q2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogZ2VuZXJhdGVzIHRoZSBBRSBvdXRwdXQgZnJvbSBhIGdpdmVuIHBvaW50IG9mIHRoZSBzYW1wbGUgZGlzdHJpYnV0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gcG9pbnQyRCAyRCBQb2ludCBvZiB0aGUgc2FtcGxlIGRpc3RyaWJ1dGlvblxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZX1cbiAgICAgKi9cbiAgICB0aGlzLmdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgPSBmdW5jdGlvbihwb2ludDJELCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gcG9pbnQyRDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3BvaW50MkQnIGlzIHNldFxuICAgICAgaWYgKHBvaW50MkQgPT09IHVuZGVmaW5lZCB8fCBwb2ludDJEID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAncG9pbnQyRCcgd2hlbiBjYWxsaW5nIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy92aXN1YWxpemUvZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludCcsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ30gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIGNsdXN0ZXJpbmcgb2YgdGhlIGxhdGVudCByZXByZXNlbnRhdGlvbiBvZiBhIGhpZGRlbiBsYXllclxuICAgICAqIHJldHVybnMgdGhlIGNsdXN0ZXJpbmcgb2YgdGhlIGxhdGVudCByZXByZXNlbnRhdGlvbiBvZiBhIGhpZGRlbiBsYXllclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBkZXRlcm1pbmVzIHRoZSBkYXRhc2V0IHdoaWNoIHNob3VsZCBiZSBjbHVzdGVyZWQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5sYXllciBkZXRlcm1pbmVzIHRoZSBoaWRkZW4gbGF5ZXJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9DbHVzdGVyaW5nfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxuICAgICAgICAnbGF5ZXInOiBvcHRzWydsYXllciddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IENsdXN0ZXJpbmc7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3Zpc3VhbGl6ZS9nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByZXRyYWluZWRNb2RlbEFzWmlwIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0UHJldHJhaW5lZE1vZGVsQXNaaXBDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHtGaWxlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHppcCBmaWxlIHdpdGggdGhlIHByZSB0cmFpbmVkIG1vZGVsIGFzIHJ1bmFibGUgcHl0aG9uIHNjcmlwdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0UHJldHJhaW5lZE1vZGVsQXNaaXBDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBGaWxlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0UHJldHJhaW5lZE1vZGVsQXNaaXAgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBGaWxlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy92aXN1YWxpemUvZ2V0UHJldHJhaW5lZE1vZGVsQXNaaXAnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24oZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9DbHVzdGVyUGFyYW1ldGVycycsICdtb2RlbC9DbHVzdGVyaW5nJywgJ21vZGVsL0Nvc3RGdW5jdGlvbicsICdtb2RlbC9JbWFnZScsICdtb2RlbC9JbWFnZURhdGEnLCAnbW9kZWwvTGVhcm5pbmdSYXRlJywgJ21vZGVsL1BhcmFtZXRlckxpc3QnLCAnbW9kZWwvUG9pbnQyRCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvUmFuZG9tRnVuY3Rpb24nLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50JywgJ21vZGVsL1RyYWluU3RhdHVzJywgJ2FwaS9CdWlsZEFwaScsICdhcGkvTG9hZEFwaScsICdhcGkvVHJhaW5BcGknLCAnYXBpL1R1bmVBcGknLCAnYXBpL1Zpc3VhbGl6ZUFwaSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJyksIHJlcXVpcmUoJy4vbW9kZWwvQ2x1c3RlcmluZycpLCByZXF1aXJlKCcuL21vZGVsL0Nvc3RGdW5jdGlvbicpLCByZXF1aXJlKCcuL21vZGVsL0ltYWdlJyksIHJlcXVpcmUoJy4vbW9kZWwvSW1hZ2VEYXRhJyksIHJlcXVpcmUoJy4vbW9kZWwvTGVhcm5pbmdSYXRlJyksIHJlcXVpcmUoJy4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpLCByZXF1aXJlKCcuL21vZGVsL1BvaW50MkQnKSwgcmVxdWlyZSgnLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi9tb2RlbC9SYW5kb21GdW5jdGlvbicpLCByZXF1aXJlKCcuL21vZGVsL1RyYWluUGVyZm9ybWFuY2UnKSwgcmVxdWlyZSgnLi9tb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50JyksIHJlcXVpcmUoJy4vbW9kZWwvVHJhaW5TdGF0dXMnKSwgcmVxdWlyZSgnLi9hcGkvQnVpbGRBcGknKSwgcmVxdWlyZSgnLi9hcGkvTG9hZEFwaScpLCByZXF1aXJlKCcuL2FwaS9UcmFpbkFwaScpLCByZXF1aXJlKCcuL2FwaS9UdW5lQXBpJyksIHJlcXVpcmUoJy4vYXBpL1Zpc3VhbGl6ZUFwaScpKTtcbiAgfVxufShmdW5jdGlvbihBcGlDbGllbnQsIENsdXN0ZXJQYXJhbWV0ZXJzLCBDbHVzdGVyaW5nLCBDb3N0RnVuY3Rpb24sIEltYWdlLCBJbWFnZURhdGEsIExlYXJuaW5nUmF0ZSwgUGFyYW1ldGVyTGlzdCwgUG9pbnQyRCwgUHJvY2Vzc2VkSW1hZ2VEYXRhLCBSYW5kb21GdW5jdGlvbiwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCwgVHJhaW5TdGF0dXMsIEJ1aWxkQXBpLCBMb2FkQXBpLCBUcmFpbkFwaSwgVHVuZUFwaSwgVmlzdWFsaXplQXBpKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogV2ViVUlfdG9fYnVpbGRfdHJhaW5fYW5kX3R1bmVfYV9Db252b2x1dGlvbmFsX0F1dG9lbmNvZGVyLjxicj5cbiAgICogVGhlIDxjb2RlPmluZGV4PC9jb2RlPiBtb2R1bGUgcHJvdmlkZXMgYWNjZXNzIHRvIGNvbnN0cnVjdG9ycyBmb3IgYWxsIHRoZSBjbGFzc2VzIHdoaWNoIGNvbXByaXNlIHRoZSBwdWJsaWMgQVBJLlxuICAgKiA8cD5cbiAgICogQW4gQU1EIChyZWNvbW1lbmRlZCEpIG9yIENvbW1vbkpTIGFwcGxpY2F0aW9uIHdpbGwgZ2VuZXJhbGx5IGRvIHNvbWV0aGluZyBlcXVpdmFsZW50IHRvIHRoZSBmb2xsb3dpbmc6XG4gICAqIDxwcmU+XG4gICAqIHZhciBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSByZXF1aXJlKCdpbmRleCcpOyAvLyBTZWUgbm90ZSBiZWxvdyouXG4gICAqIHZhciB4eHhTdmMgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlh4eEFwaSgpOyAvLyBBbGxvY2F0ZSB0aGUgQVBJIGNsYXNzIHdlJ3JlIGdvaW5nIHRvIHVzZS5cbiAgICogdmFyIHl5eU1vZGVsID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5ZeXkoKTsgLy8gQ29uc3RydWN0IGEgbW9kZWwgaW5zdGFuY2UuXG4gICAqIHl5eU1vZGVsLnNvbWVQcm9wZXJ0eSA9ICdzb21lVmFsdWUnO1xuICAgKiAuLi5cbiAgICogdmFyIHp6eiA9IHh4eFN2Yy5kb1NvbWV0aGluZyh5eXlNb2RlbCk7IC8vIEludm9rZSB0aGUgc2VydmljZS5cbiAgICogLi4uXG4gICAqIDwvcHJlPlxuICAgKiA8ZW0+Kk5PVEU6IEZvciBhIHRvcC1sZXZlbCBBTUQgc2NyaXB0LCB1c2UgcmVxdWlyZShbJ2luZGV4J10sIGZ1bmN0aW9uKCl7Li4ufSlcbiAgICogYW5kIHB1dCB0aGUgYXBwbGljYXRpb24gbG9naWMgd2l0aGluIHRoZSBjYWxsYmFjayBmdW5jdGlvbi48L2VtPlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBBIG5vbi1BTUQgYnJvd3NlciBhcHBsaWNhdGlvbiAoZGlzY291cmFnZWQpIG1pZ2h0IGRvIHNvbWV0aGluZyBsaWtlIHRoaXM6XG4gICAqIDxwcmU+XG4gICAqIHZhciB4eHhTdmMgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlh4eEFwaSgpOyAvLyBBbGxvY2F0ZSB0aGUgQVBJIGNsYXNzIHdlJ3JlIGdvaW5nIHRvIHVzZS5cbiAgICogdmFyIHl5eSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWXl5KCk7IC8vIENvbnN0cnVjdCBhIG1vZGVsIGluc3RhbmNlLlxuICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcbiAgICogLi4uXG4gICAqIHZhciB6enogPSB4eHhTdmMuZG9Tb21ldGhpbmcoeXl5TW9kZWwpOyAvLyBJbnZva2UgdGhlIHNlcnZpY2UuXG4gICAqIC4uLlxuICAgKiA8L3ByZT5cbiAgICogPC9wPlxuICAgKiBAbW9kdWxlIGluZGV4XG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgQXBpQ2xpZW50IGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOkFwaUNsaWVudH1cbiAgICAgKi9cbiAgICBBcGlDbGllbnQ6IEFwaUNsaWVudCxcbiAgICAvKipcbiAgICAgKiBUaGUgQ2x1c3RlclBhcmFtZXRlcnMgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9XG4gICAgICovXG4gICAgQ2x1c3RlclBhcmFtZXRlcnM6IENsdXN0ZXJQYXJhbWV0ZXJzLFxuICAgIC8qKlxuICAgICAqIFRoZSBDbHVzdGVyaW5nIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9XG4gICAgICovXG4gICAgQ2x1c3RlcmluZzogQ2x1c3RlcmluZyxcbiAgICAvKipcbiAgICAgKiBUaGUgQ29zdEZ1bmN0aW9uIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbn1cbiAgICAgKi9cbiAgICBDb3N0RnVuY3Rpb246IENvc3RGdW5jdGlvbixcbiAgICAvKipcbiAgICAgKiBUaGUgSW1hZ2UgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvSW1hZ2V9XG4gICAgICovXG4gICAgSW1hZ2U6IEltYWdlLFxuICAgIC8qKlxuICAgICAqIFRoZSBJbWFnZURhdGEgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIEltYWdlRGF0YTogSW1hZ2VEYXRhLFxuICAgIC8qKlxuICAgICAqIFRoZSBMZWFybmluZ1JhdGUgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlfVxuICAgICAqL1xuICAgIExlYXJuaW5nUmF0ZTogTGVhcm5pbmdSYXRlLFxuICAgIC8qKlxuICAgICAqIFRoZSBQYXJhbWV0ZXJMaXN0IG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9XG4gICAgICovXG4gICAgUGFyYW1ldGVyTGlzdDogUGFyYW1ldGVyTGlzdCxcbiAgICAvKipcbiAgICAgKiBUaGUgUG9pbnQyRCBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9Qb2ludDJEfVxuICAgICAqL1xuICAgIFBvaW50MkQ6IFBvaW50MkQsXG4gICAgLyoqXG4gICAgICogVGhlIFByb2Nlc3NlZEltYWdlRGF0YSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9XG4gICAgICovXG4gICAgUHJvY2Vzc2VkSW1hZ2VEYXRhOiBQcm9jZXNzZWRJbWFnZURhdGEsXG4gICAgLyoqXG4gICAgICogVGhlIFJhbmRvbUZ1bmN0aW9uIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9ufVxuICAgICAqL1xuICAgIFJhbmRvbUZ1bmN0aW9uOiBSYW5kb21GdW5jdGlvbixcbiAgICAvKipcbiAgICAgKiBUaGUgVHJhaW5QZXJmb3JtYW5jZSBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxuICAgICAqL1xuICAgIFRyYWluUGVyZm9ybWFuY2U6IFRyYWluUGVyZm9ybWFuY2UsXG4gICAgLyoqXG4gICAgICogVGhlIFRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludH1cbiAgICAgKi9cbiAgICBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50OiBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50LFxuICAgIC8qKlxuICAgICAqIFRoZSBUcmFpblN0YXR1cyBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c31cbiAgICAgKi9cbiAgICBUcmFpblN0YXR1czogVHJhaW5TdGF0dXMsXG4gICAgLyoqXG4gICAgICogVGhlIEJ1aWxkQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL0J1aWxkQXBpfVxuICAgICAqL1xuICAgIEJ1aWxkQXBpOiBCdWlsZEFwaSxcbiAgICAvKipcbiAgICAgKiBUaGUgTG9hZEFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9Mb2FkQXBpfVxuICAgICAqL1xuICAgIExvYWRBcGk6IExvYWRBcGksXG4gICAgLyoqXG4gICAgICogVGhlIFRyYWluQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1RyYWluQXBpfVxuICAgICAqL1xuICAgIFRyYWluQXBpOiBUcmFpbkFwaSxcbiAgICAvKipcbiAgICAgKiBUaGUgVHVuZUFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9UdW5lQXBpfVxuICAgICAqL1xuICAgIFR1bmVBcGk6IFR1bmVBcGksXG4gICAgLyoqXG4gICAgICogVGhlIFZpc3VhbGl6ZUFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl9XG4gICAgICovXG4gICAgVmlzdWFsaXplQXBpOiBWaXN1YWxpemVBcGlcbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyUGFyYW1ldGVycyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgQ2x1c3RlclBhcmFtZXRlcnMgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc1xuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+Q2x1c3RlclBhcmFtZXRlcnM8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9jbHVzdGVycycpKSB7XG4gICAgICAgIG9ialsnbl9jbHVzdGVycyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9jbHVzdGVycyddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaW5pdCcpKSB7XG4gICAgICAgIG9ialsnaW5pdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5pdCddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9pbml0JykpIHtcbiAgICAgICAgb2JqWyduX2luaXQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25faW5pdCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4X2l0ZXInKSkge1xuICAgICAgICBvYmpbJ21heF9pdGVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhfaXRlciddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndG9sJykpIHtcbiAgICAgICAgb2JqWyd0b2wnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3RvbCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncHJlY29tcHV0ZV9kaXN0YW5jZXMnKSkge1xuICAgICAgICBvYmpbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydwcmVjb21wdXRlX2Rpc3RhbmNlcyddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndmVyYm9zZScpKSB7XG4gICAgICAgIG9ialsndmVyYm9zZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndmVyYm9zZSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX3N0YXRlJykpIHtcbiAgICAgICAgb2JqWydyYW5kb21fc3RhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9zdGF0ZSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29weV94JykpIHtcbiAgICAgICAgb2JqWydjb3B5X3gnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NvcHlfeCddLCAnQm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25fam9icycpKSB7XG4gICAgICAgIG9ialsnbl9qb2JzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2pvYnMnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2FsZ29yaXRobScpKSB7XG4gICAgICAgIG9ialsnYWxnb3JpdGhtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhbGdvcml0aG0nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9jbHVzdGVyc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fY2x1c3RlcnMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gaW5pdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2luaXQnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9pbml0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbl9pbml0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1heF9pdGVyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4X2l0ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gdG9sXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsndG9sJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHByZWNvbXB1dGVfZGlzdGFuY2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncHJlY29tcHV0ZV9kaXN0YW5jZXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gdmVyYm9zZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gcmFuZG9tX3N0YXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX3N0YXRlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtCb29sZWFufSBjb3B5X3hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3B5X3gnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9qb2JzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbl9qb2JzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IGFsZ29yaXRobVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2FsZ29yaXRobSddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUG9pbnQyRCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9Qb2ludDJEJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ2x1c3RlcmluZyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qb2ludDJEKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBvaW50MkQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgQ2x1c3RlcmluZyBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvQ2x1c3RlcmluZ1xuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9DbHVzdGVyaW5nXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWluWCcpKSB7XG4gICAgICAgIG9ialsnbWluWCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWluWCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4WCcpKSB7XG4gICAgICAgIG9ialsnbWF4WCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4WCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWluWScpKSB7XG4gICAgICAgIG9ialsnbWluWSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWluWSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4WScpKSB7XG4gICAgICAgIG9ialsnbWF4WSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4WSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbkNsdXN0ZXJzJykpIHtcbiAgICAgICAgb2JqWyduQ2x1c3RlcnMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25DbHVzdGVycyddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncG9pbnRzJykpIHtcbiAgICAgICAgb2JqWydwb2ludHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3BvaW50cyddLCBbUG9pbnQyRF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWluWFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pblgnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWF4WFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heFgnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWluWVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pblknXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWF4WVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heFknXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbkNsdXN0ZXJzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbkNsdXN0ZXJzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1BvaW50MkQ+fSBwb2ludHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydwb2ludHMnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNvc3RGdW5jdGlvbiA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgQ29zdEZ1bmN0aW9uIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9Db3N0RnVuY3Rpb25cbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+Q29zdEZ1bmN0aW9uPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb25cbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+Q29zdEZ1bmN0aW9uPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb259IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbn0gVGhlIHBvcHVsYXRlZCA8Y29kZT5Db3N0RnVuY3Rpb248L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfY29zdF9mdW5jdGlvbicpKSB7XG4gICAgICAgIG9ialsnY2ZfY29zdF9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfY29zdF9mdW5jdGlvbiddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfbWF4X3ZhbCcpKSB7XG4gICAgICAgIG9ialsnY2ZfbWF4X3ZhbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfbWF4X3ZhbCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9maWx0ZXJfc2l6ZScpKSB7XG4gICAgICAgIG9ialsnY2ZfZmlsdGVyX3NpemUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2ZpbHRlcl9zaXplJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2ZpbHRlcl9zaWdtYScpKSB7XG4gICAgICAgIG9ialsnY2ZfZmlsdGVyX3NpZ21hJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9maWx0ZXJfc2lnbWEnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfazEnKSkge1xuICAgICAgICBvYmpbJ2NmX2sxJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9rMSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9rMicpKSB7XG4gICAgICAgIG9ialsnY2ZfazInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2syJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX3dlaWdodHMnKSkge1xuICAgICAgICBvYmpbJ2NmX3dlaWdodHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX3dlaWdodHMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IGNmX2Nvc3RfZnVuY3Rpb25cbiAgICogQGRlZmF1bHQgJ3NxdWFyZWRfcGl4ZWxfZGlzdGFuY2UnXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfY29zdF9mdW5jdGlvbiddID0gJ3NxdWFyZWRfcGl4ZWxfZGlzdGFuY2UnO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX21heF92YWxcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9tYXhfdmFsJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfZmlsdGVyX3NpemVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9maWx0ZXJfc2l6ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2ZpbHRlcl9zaWdtYVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2ZpbHRlcl9zaWdtYSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2sxXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfazEnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9rMlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2syJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBjZl93ZWlnaHRzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2Zfd2VpZ2h0cyddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIEltYWdlIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9JbWFnZVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5JbWFnZTwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvSW1hZ2VcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkltYWdlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2V9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+SW1hZ2U8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYnl0ZXN0cmluZycpKSB7XG4gICAgICAgIG9ialsnYnl0ZXN0cmluZyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYnl0ZXN0cmluZyddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaWQnKSkge1xuICAgICAgICBvYmpbJ2lkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpZCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdCcpKSB7XG4gICAgICAgIG9ialsnY29zdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBieXRlc3RyaW5nXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYnl0ZXN0cmluZyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBpZFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lkJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGNvc3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3N0J10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9JbWFnZScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlRGF0YSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZSkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBJbWFnZURhdGEgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0ltYWdlRGF0YVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5JbWFnZURhdGE8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YVxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5JbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkltYWdlRGF0YTwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1JbWFnZXMnKSkge1xuICAgICAgICBvYmpbJ251bUltYWdlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbnVtSW1hZ2VzJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNYJykpIHtcbiAgICAgICAgb2JqWydyZXNYJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyZXNYJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNZJykpIHtcbiAgICAgICAgb2JqWydyZXNZJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyZXNZJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbWFnZXMnKSkge1xuICAgICAgICBvYmpbJ2ltYWdlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW1hZ2VzJ10sIFtJbWFnZV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gbnVtSW1hZ2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbnVtSW1hZ2VzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJlc1hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNYJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJlc1lcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNZJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW1hZ2VzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnaW1hZ2VzJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5MZWFybmluZ1JhdGUgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIExlYXJuaW5nUmF0ZSBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvTGVhcm5pbmdSYXRlXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9MZWFybmluZ1JhdGV9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+TGVhcm5pbmdSYXRlPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZScpKSB7XG4gICAgICAgIG9ialsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZGVjYXlfc3RlcHMnKSkge1xuICAgICAgICBvYmpbJ2xyX2RlY2F5X3N0ZXBzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9kZWNheV9zdGVwcyddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9kZWNheV9yYXRlJykpIHtcbiAgICAgICAgb2JqWydscl9kZWNheV9yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9kZWNheV9yYXRlJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3N0YWlyY2FzZScpKSB7XG4gICAgICAgIG9ialsnbHJfc3RhaXJjYXNlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9zdGFpcmNhc2UnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2JvdW5kYXJpZXMnKSkge1xuICAgICAgICBvYmpbJ2xyX2JvdW5kYXJpZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2JvdW5kYXJpZXMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl92YWx1ZXMnKSkge1xuICAgICAgICBvYmpbJ2xyX3ZhbHVlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfdmFsdWVzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZW5kX2xlYXJuaW5nX3JhdGUnKSkge1xuICAgICAgICBvYmpbJ2xyX2VuZF9sZWFybmluZ19yYXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9wb3dlcicpKSB7XG4gICAgICAgIG9ialsnbHJfcG93ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX3Bvd2VyJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2N5Y2xlJykpIHtcbiAgICAgICAgb2JqWydscl9jeWNsZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfY3ljbGUnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbGVhcm5pbmdfcmF0ZV9mdW5jdGlvblxuICAgKiBAZGVmYXVsdCAnc3RhdGljJ1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSA9ICdzdGF0aWMnO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2RlY2F5X3N0ZXBzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZGVjYXlfc3RlcHMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9kZWNheV9yYXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZGVjYXlfcmF0ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEJvb2xlYW4+fSBscl9zdGFpcmNhc2VcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9zdGFpcmNhc2UnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGxyX2JvdW5kYXJpZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9ib3VuZGFyaWVzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBscl92YWx1ZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl92YWx1ZXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9lbmRfbGVhcm5pbmdfcmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2VuZF9sZWFybmluZ19yYXRlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfcG93ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9wb3dlciddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEJvb2xlYW4+fSBscl9jeWNsZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2N5Y2xlJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Db3N0RnVuY3Rpb24nLCAnbW9kZWwvTGVhcm5pbmdSYXRlJywgJ21vZGVsL1JhbmRvbUZ1bmN0aW9uJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL0Nvc3RGdW5jdGlvbicpLCByZXF1aXJlKCcuL0xlYXJuaW5nUmF0ZScpLCByZXF1aXJlKCcuL1JhbmRvbUZ1bmN0aW9uJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Db3N0RnVuY3Rpb24sIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxlYXJuaW5nUmF0ZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUmFuZG9tRnVuY3Rpb24pO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgQ29zdEZ1bmN0aW9uLCBMZWFybmluZ1JhdGUsIFJhbmRvbUZ1bmN0aW9uKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIFBhcmFtZXRlckxpc3QgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL1BhcmFtZXRlckxpc3RcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdFxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBUaGUgcG9wdWxhdGVkIDxjb2RlPlBhcmFtZXRlckxpc3Q8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaW5wdXRfc2hhcGUnKSkge1xuICAgICAgICBvYmpbJ2lucHV0X3NoYXBlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpbnB1dF9zaGFwZSddLCBbWydOdW1iZXInXV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ251bWJlcl9vZl9zdGFja3MnKSkge1xuICAgICAgICBvYmpbJ251bWJlcl9vZl9zdGFja3MnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bWJlcl9vZl9zdGFja3MnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdmaWx0ZXJfc2l6ZXMnKSkge1xuICAgICAgICBvYmpbJ2ZpbHRlcl9zaXplcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnZmlsdGVyX3NpemVzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWlycm9yX3dlaWdodHMnKSkge1xuICAgICAgICBvYmpbJ21pcnJvcl93ZWlnaHRzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtaXJyb3Jfd2VpZ2h0cyddLCBbJ0Jvb2xlYW4nXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYWN0aXZhdGlvbl9mdW5jdGlvbicpKSB7XG4gICAgICAgIG9ialsnYWN0aXZhdGlvbl9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYWN0aXZhdGlvbl9mdW5jdGlvbiddLCBbJ1N0cmluZyddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdiYXRjaF9zaXplJykpIHtcbiAgICAgICAgb2JqWydiYXRjaF9zaXplJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydiYXRjaF9zaXplJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25fZXBvY2hzJykpIHtcbiAgICAgICAgb2JqWyduX2Vwb2NocyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9lcG9jaHMnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndXNlX3RlbnNvcmJvYXJkJykpIHtcbiAgICAgICAgb2JqWyd1c2VfdGVuc29yYm9hcmQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3VzZV90ZW5zb3Jib2FyZCddLCAnQm9vbGVhbicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3ZlcmJvc2UnKSkge1xuICAgICAgICBvYmpbJ3ZlcmJvc2UnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3ZlcmJvc2UnXSwgJ0Jvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsZWFybmluZ19yYXRlX2RpY3QnKSkge1xuICAgICAgICBvYmpbJ2xlYXJuaW5nX3JhdGVfZGljdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGVhcm5pbmdfcmF0ZV9kaWN0J10sIFtMZWFybmluZ1JhdGVdKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjb3N0X2Z1bmN0aW9uX2RpY3QnKSkge1xuICAgICAgICBvYmpbJ2Nvc3RfZnVuY3Rpb25fZGljdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdF9mdW5jdGlvbl9kaWN0J10sIFtDb3N0RnVuY3Rpb25dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdvcHRpbWl6ZXInKSkge1xuICAgICAgICBvYmpbJ29wdGltaXplciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnb3B0aW1pemVyJ10sIFsnU3RyaW5nJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21vbWVudHVtJykpIHtcbiAgICAgICAgb2JqWydtb21lbnR1bSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbW9tZW50dW0nXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX3dlaWdodHNfZGljdCcpKSB7XG4gICAgICAgIG9ialsncmFuZG9tX3dlaWdodHNfZGljdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmFuZG9tX3dlaWdodHNfZGljdCddLCBbUmFuZG9tRnVuY3Rpb25dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fYmlhc2VzX2RpY3QnKSkge1xuICAgICAgICBvYmpbJ3JhbmRvbV9iaWFzZXNfZGljdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmFuZG9tX2JpYXNlc19kaWN0J10sIFtSYW5kb21GdW5jdGlvbl0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3Nlc3Npb25fc2F2ZXJfcGF0aCcpKSB7XG4gICAgICAgIG9ialsnc2Vzc2lvbl9zYXZlcl9wYXRoJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzZXNzaW9uX3NhdmVyX3BhdGgnXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xvYWRfcHJldl9zZXNzaW9uJykpIHtcbiAgICAgICAgb2JqWydsb2FkX3ByZXZfc2Vzc2lvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbG9hZF9wcmV2X3Nlc3Npb24nXSwgJ0Jvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzZXNzaW9uX3NhdmVfZHVyYXRpb24nKSkge1xuICAgICAgICBvYmpbJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ251bV90ZXN0X3BpY3R1cmVzJykpIHtcbiAgICAgICAgb2JqWydudW1fdGVzdF9waWN0dXJlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbnVtX3Rlc3RfcGljdHVyZXMnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gaW5wdXRfc2hhcGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydpbnB1dF9zaGFwZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbnVtYmVyX29mX3N0YWNrc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ251bWJlcl9vZl9zdGFja3MnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGZpbHRlcl9zaXplc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2ZpbHRlcl9zaXplcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEJvb2xlYW4+fSBtaXJyb3Jfd2VpZ2h0c1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pcnJvcl93ZWlnaHRzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gYWN0aXZhdGlvbl9mdW5jdGlvblxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBiYXRjaF9zaXplXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYmF0Y2hfc2l6ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG5fZXBvY2hzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbl9lcG9jaHMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0Jvb2xlYW59IHVzZV90ZW5zb3Jib2FyZFxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsndXNlX3RlbnNvcmJvYXJkJ10gPSB0cnVlO1xuICAvKipcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gdmVyYm9zZVxuICAgKiBAZGVmYXVsdCB0cnVlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsndmVyYm9zZSddID0gdHJ1ZTtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlPn0gbGVhcm5pbmdfcmF0ZV9kaWN0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbGVhcm5pbmdfcmF0ZV9kaWN0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbj59IGNvc3RfZnVuY3Rpb25fZGljdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2Nvc3RfZnVuY3Rpb25fZGljdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPFN0cmluZz59IG9wdGltaXplclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ29wdGltaXplciddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG1vbWVudHVtXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbW9tZW50dW0nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb24+fSByYW5kb21fd2VpZ2h0c19kaWN0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX3dlaWdodHNfZGljdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbj59IHJhbmRvbV9iaWFzZXNfZGljdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV9iaWFzZXNfZGljdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBzZXNzaW9uX3NhdmVyX3BhdGhcbiAgICogQGRlZmF1bHQgJy4vc2F2ZS8nXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc2Vzc2lvbl9zYXZlcl9wYXRoJ10gPSAnLi9zYXZlLyc7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtCb29sZWFufSBsb2FkX3ByZXZfc2Vzc2lvblxuICAgKiBAZGVmYXVsdCBmYWxzZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xvYWRfcHJldl9zZXNzaW9uJ10gPSBmYWxzZTtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBzZXNzaW9uX3NhdmVfZHVyYXRpb25cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydzZXNzaW9uX3NhdmVfZHVyYXRpb24nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBudW1fdGVzdF9waWN0dXJlc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ251bV90ZXN0X3BpY3R1cmVzJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qb2ludDJEID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBQb2ludDJEIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9Qb2ludDJEXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlBvaW50MkQ8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1BvaW50MkRcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlBvaW50MkQ8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BvaW50MkR9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1BvaW50MkR9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UG9pbnQyRDwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd4JykpIHtcbiAgICAgICAgb2JqWyd4J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd4J10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd5JykpIHtcbiAgICAgICAgb2JqWyd5J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd5J10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjbHVzdGVyJykpIHtcbiAgICAgICAgb2JqWydjbHVzdGVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjbHVzdGVyJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHhcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyd4J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHlcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyd5J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGNsdXN0ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjbHVzdGVyJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9JbWFnZScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlByb2Nlc3NlZEltYWdlRGF0YSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZSkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBQcm9jZXNzZWRJbWFnZURhdGEgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5Qcm9jZXNzZWRJbWFnZURhdGE8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YVxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UHJvY2Vzc2VkSW1hZ2VEYXRhPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Vwb2NoJykpIHtcbiAgICAgICAgb2JqWydlcG9jaCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnZXBvY2gnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3N0ZXAnKSkge1xuICAgICAgICBvYmpbJ3N0ZXAnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3N0ZXAnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lucHV0TGF5ZXInKSkge1xuICAgICAgICBvYmpbJ2lucHV0TGF5ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2lucHV0TGF5ZXInXSwgW0ltYWdlXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGF0ZW50TGF5ZXInKSkge1xuICAgICAgICBvYmpbJ2xhdGVudExheWVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsYXRlbnRMYXllciddLCBbW0ltYWdlXV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ291dHB1dExheWVyJykpIHtcbiAgICAgICAgb2JqWydvdXRwdXRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnb3V0cHV0TGF5ZXInXSwgW0ltYWdlXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBlcG9jaFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2Vwb2NoJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHN0ZXBcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydzdGVwJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW5wdXRMYXllclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lucHV0TGF5ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPj59IGxhdGVudExheWVyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbGF0ZW50TGF5ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+fSBvdXRwdXRMYXllclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ291dHB1dExheWVyJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5SYW5kb21GdW5jdGlvbiA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgUmFuZG9tRnVuY3Rpb24gbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL1JhbmRvbUZ1bmN0aW9uXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlJhbmRvbUZ1bmN0aW9uPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvblxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UmFuZG9tRnVuY3Rpb248L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9ufSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbn0gVGhlIHBvcHVsYXRlZCA8Y29kZT5SYW5kb21GdW5jdGlvbjwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ3JhbmRvbV9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmFuZG9tX2Z1bmN0aW9uJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhbHBoYScpKSB7XG4gICAgICAgIG9ialsnYWxwaGEnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2FscGhhJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2JldGEnKSkge1xuICAgICAgICBvYmpbJ2JldGEnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2JldGEnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWVhbicpKSB7XG4gICAgICAgIG9ialsnbWVhbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWVhbiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzdGRkZXYnKSkge1xuICAgICAgICBvYmpbJ3N0ZGRldiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc3RkZGV2J10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xhbScpKSB7XG4gICAgICAgIG9ialsnbGFtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsYW0nXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWludmFsJykpIHtcbiAgICAgICAgb2JqWydtaW52YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21pbnZhbCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXh2YWwnKSkge1xuICAgICAgICBvYmpbJ21heHZhbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4dmFsJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3NlZWQnKSkge1xuICAgICAgICBvYmpbJ3NlZWQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3NlZWQnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSByYW5kb21fZnVuY3Rpb25cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fZnVuY3Rpb24nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBhbHBoYVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2FscGhhJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gYmV0YVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2JldGEnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtZWFuXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWVhbiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHN0ZGRldlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3N0ZGRldiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxhbVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xhbSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG1pbnZhbFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pbnZhbCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG1heHZhbFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heHZhbCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHNlZWRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydzZWVkJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9UcmFpblBlcmZvcm1hbmNlXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlRyYWluUGVyZm9ybWFuY2U8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2VcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlRyYWluUGVyZm9ybWFuY2U8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZTwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtb2RlbF9pZCcpKSB7XG4gICAgICAgIG9ialsnbW9kZWxfaWQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21vZGVsX2lkJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd0cmFpbl9zdGF0dXMnKSkge1xuICAgICAgICBvYmpbJ3RyYWluX3N0YXR1cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndHJhaW5fc3RhdHVzJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd0cmFpbl9wZXJmb3JtYW5jZV9kYXRhJykpIHtcbiAgICAgICAgb2JqWyd0cmFpbl9wZXJmb3JtYW5jZV9kYXRhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd0cmFpbl9wZXJmb3JtYW5jZV9kYXRhJ10sIFtUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50XSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBtb2RlbF9pZFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21vZGVsX2lkJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHRyYWluX3N0YXR1c1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3RyYWluX3N0YXR1cyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50Pn0gdHJhaW5fcGVyZm9ybWFuY2VfZGF0YVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3RyYWluX3BlcmZvcm1hbmNlX2RhdGEnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIFRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnRcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludDwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludFxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50PC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50fSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50fSBUaGUgcG9wdWxhdGVkIDxjb2RlPlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQ8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZXBvY2gnKSkge1xuICAgICAgICBvYmpbJ2Vwb2NoJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydlcG9jaCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc3RlcCcpKSB7XG4gICAgICAgIG9ialsnc3RlcCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc3RlcCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdCcpKSB7XG4gICAgICAgIG9ialsnY29zdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY3VycmVudExlYXJuaW5nUmF0ZScpKSB7XG4gICAgICAgIG9ialsnY3VycmVudExlYXJuaW5nUmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY3VycmVudExlYXJuaW5nUmF0ZSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBlcG9jaFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2Vwb2NoJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHN0ZXBcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydzdGVwJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGNvc3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3N0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGN1cnJlbnRMZWFybmluZ1JhdGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjdXJyZW50TGVhcm5pbmdSYXRlJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cbiAgLyoqXG4gICAqIEVudW0gY2xhc3MgVHJhaW5TdGF0dXMuXG4gICAqIEBlbnVtIHt9XG4gICAqIEByZWFkb25seVxuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSB7XG4gICAgLyoqXG4gICAgICogdmFsdWU6IFwic3RhcnRcIlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIFwic3RhcnRcIjogXCJzdGFydFwiLFxuICAgIC8qKlxuICAgICAqIHZhbHVlOiBcInBhdXNlXCJcbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBcInBhdXNlXCI6IFwicGF1c2VcIixcbiAgICAvKipcbiAgICAgKiB2YWx1ZTogXCJzdG9wXCJcbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBcInN0b3BcIjogXCJzdG9wXCIsXG4gICAgLyoqXG4gICAgICogdmFsdWU6IFwicmVzdW1lXCJcbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBcInJlc3VtZVwiOiBcInJlc3VtZVwiICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgPGNvZGU+VHJhaW5TdGF0dXM8L2NvZGU+IGVudW0gdmFsdWUgZnJvbSBhIEphdmFzY3JpcHQgb2JqZWN0IG5hbWUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBjb250YWluaW5nIHRoZSBuYW1lIG9mIHRoZSBlbnVtIHZhbHVlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9IFRoZSBlbnVtIDxjb2RlPlRyYWluU3RhdHVzPC9jb2RlPiB2YWx1ZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKlxyXG5jaGVjayBpZiBjbGllbnQgYW5kIHNlcnZlciBhcmUgcnVubmluZyBjb3JyZWN0bHlcclxuICovXHJcbnZhciBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSByZXF1aXJlKCdjb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyJyk7XHJcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xyXG5cclxudmFyIHNlbGVjdGVkSW1hZ2VJZCA9IFwiXCI7XHJcbnZhciBkYXRhc2V0bmFtZSA9IFwidHJhaW5fZGF0YVwiO1xyXG5cclxudmFyIGxvYWRBcGkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxvYWRBcGkoKTtcclxudmFyIGJ1aWxkQXBpID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5CdWlsZEFwaSgpO1xyXG5cclxuZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0FQSSBjYWxsZWQgc3VjY2Vzc2Z1bGx5LicpO1xyXG4gICAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhcHBlbmRJbWFnZXMobnVtYmVyT2ZJbWFnZXMpIHtcclxuICAgIC8vIGdldCBpbWFnZSBncmlkXHJcbiAgICB2YXIgaW1hZ2VHcmlkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbWFnZUdyaWRcIik7XHJcblxyXG5cclxuICAgIC8vIGxvYWQgbmV4dCBJbWFnZSBiYXRjaCB0aHJvdWdoIHN3YWdnZXIgY2xpZW50XHJcbiAgICAvL3ZhciBsb2FkQXBpID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Mb2FkQXBpKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gaW1hZ2VDYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZygnQVBJIGNhbGxlZCBzdWNjZXNzZnVsbHkuJyk7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciBhbGwgaW1hZ2VzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5pbWFnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBuZXcgaW1hZ2Ugb2JqZWN0XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3SW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3SW1hZ2UuaWQgPSBcIkltYWdlX1wiICsgZGF0YS5pbWFnZXNbaV0uaWQ7XHJcbiAgICAgICAgICAgICAgICBuZXdJbWFnZS5zcmMgPSBcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxcIiArIGRhdGEuaW1hZ2VzW2ldLmJ5dGVzdHJpbmcuc3Vic3RyaW5nKDIsIGRhdGEuaW1hZ2VzW2ldLmJ5dGVzdHJpbmcubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgICAgICAgICBuZXdJbWFnZS5jbGFzcyA9IFwiaW1hZ2VUaHVtYm5haWxcIjtcclxuICAgICAgICAgICAgICAgIC8vIGFkZCBldmVudExpc3RlbmVyXHJcbiAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgcHJldmlldyB2aWV3XHJcbiAgICAgICAgICAgICAgICBuZXdJbWFnZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBvbGQgYm9yZGVyXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSBwcmV2aWV3OlxyXG4gICAgICAgICAgICAgICAgICAgIHZhciBpbWFnZVByZXZpZXcgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImltYWdlUHJldmlld1wiKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgb2xkIGJvcmRlclxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbWFnZVByZXZpZXcubGlua2VkSWQgIT09IFwiXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaW1hZ2VQcmV2aWV3LmxpbmtlZElkKS5zdHlsZS5ib3JkZXIgPSBcIlwiO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2VQcmV2aWV3LnNyYyA9IHRoaXMuc3JjO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGUgaGlzdG9ncmFtOlxyXG4gICAgICAgICAgICAgICAgICAgIGhpc3RvZ3JhbS5zZXRJbWFnZSh0aGlzKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIG1hcmsgc2VsZWN0ZWQgaW1hZ2U6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdHlsZS5ib3JkZXIgPSBcIjFweCBzb2xpZCBvcmFuZ2VcIjtcclxuICAgICAgICAgICAgICAgICAgICAvLyBzYXZlIGN1cnJlbnQgaWQgaW4gcHJldmlld1xyXG4gICAgICAgICAgICAgICAgICAgIGltYWdlUHJldmlldy5saW5rZWRJZCA9IHRoaXMuaWQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYXBwZW5kIG5ldyBpbWFnZSB0byBpbWFnZSBncmlkXHJcbiAgICAgICAgICAgICAgICBpbWFnZUdyaWQuYXBwZW5kQ2hpbGQobmV3SW1hZ2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRBcGkuZ2V0SW1hZ2VCYXRjaCh7XCJiYXRjaFNpemVcIjogbnVtYmVyT2ZJbWFnZXMsIFwiZGF0YXNldG5hbWVcIjogZGF0YXNldG5hbWV9LCBpbWFnZUNhbGxiYWNrKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEF2YWlsYWJsZURhdGFTZXRzKCkge1xyXG4gICAgZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBdmFpbGFibGUgZGF0YSBzZXRzIHJldHJpZXZlZCcpO1xyXG4gICAgICAgICAgICAvLyByZXBsYWNlIG9wdGlvbnMgaW4gJ0F2YWlsYWJsZSBkYXRhIHNldHMnIHNlbGVjdGlvblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRBdmFpbGFibGVEYXRhU2V0c1wiKTtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIHByZXZpb3VzIG9wdGlvbnNcclxuICAgICAgICAgICAgc2VsZWN0aW9uLm9wdGlvbnMubGVuZ3RoID0gMDtcclxuICAgICAgICAgICAgLy8gYWRkIGF2YWlsYWJsZSBmaWxlIG5hbWVzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uLm9wdGlvbnNbaV0gPSBuZXcgT3B0aW9uKGRhdGFbaV0sIGRhdGFbaV0sIGZhbHNlLCBmYWxzZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkQXBpLmdldEF2YWlsYWJsZURhdGFTZXRzKGNhbGxiYWNrKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0TG9hZGVkRGF0YVNldHMoKSB7XHJcbiAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ2xvYWRlZCBkYXRhIHNldHMgcmV0cmlldmVkJyk7XHJcbiAgICAgICAgICAgIC8vIHJlcGxhY2Ugb3B0aW9ucyBpbiAnTG9hZGVkIGRhdGEgc2V0cycgc2VsZWN0aW9uXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICB2YXIgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dExvYWRlZERhdGFTZXRzXCIpO1xyXG4gICAgICAgICAgICAvLyByZW1vdmUgcHJldmlvdXMgb3B0aW9uc1xyXG4gICAgICAgICAgICBzZWxlY3Rpb24ub3B0aW9ucy5sZW5ndGggPSAwO1xyXG4gICAgICAgICAgICAvLyBhZGQgYXZhaWxhYmxlIGZpbGUgbmFtZXNcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24ub3B0aW9uc1tpXSA9IG5ldyBPcHRpb24oZGF0YVtpXSwgZGF0YVtpXSwgZmFsc2UsIGZhbHNlKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRBcGkuZ2V0TG9hZGVkRGF0YVNldHMoY2FsbGJhY2spO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVEYXRhU2V0U3RhdGlzdGljcygpIHtcclxuICAgIGZ1bmN0aW9uIGlucHV0U2hhcGVDYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIC8vdXBkYXRlIGRhdGEgc3RhdGlzdGljczpcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYWJlbFJlc29sdXRpb25cIikudGV4dENvbnRlbnQgPSBcIlJlc29sdXRpb246IFwiICsgZGF0YVsxXSArIFwicHggeCBcIiArIGRhdGFbMl0gKyBcInB4XCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibGFiZWxMYXllclwiKS50ZXh0Q29udGVudCA9IFwiTGF5ZXI6IFwiICsgZGF0YVszXTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYWJlbE51bWJlck9mSW1hZ2VzXCIpLnRleHRDb250ZW50ID0gXCJOdW1iZXIgb2YgSW1hZ2VzOiBcIiArIGRhdGFbMF07XHJcblxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGJ1aWxkQXBpLmdldElucHV0U2hhcGUoeydkYXRhc2V0TmFtZSc6IGRhdGFzZXRuYW1lfSwgaW5wdXRTaGFwZUNhbGxiYWNrKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkRmlsZSgpIHtcclxuXHJcbiAgICAvLyBhYm9ydCBpZiBubyBkYXRhIHNldCBpcyBzZWxlY3RlZFxyXG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRBdmFpbGFibGVEYXRhU2V0c1wiKS5zZWxlY3RlZEluZGV4ID09PSAtMSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm8gZGF0YSBzZXQgc2VsZWN0ZWRcIik7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGdldCBhbGwgaW5wdXQgZmllbGRzXHJcbiAgICB2YXIgZmlsZW5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0QXZhaWxhYmxlRGF0YVNldHNcIikub3B0aW9uc1tkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0QXZhaWxhYmxlRGF0YVNldHNcIikuc2VsZWN0ZWRJbmRleF0udmFsdWU7XHJcbiAgICB2YXIgZGF0YXNldG5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0RGF0YXNldE5hbWVcIikudmFsdWU7XHJcbiAgICAvL3ZhciByZWFkTGFiZWxzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWFkTGFiZWxzXCIpLm9wdGlvbnNbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZWFkTGFiZWxzXCIpLnNlbGVjdGVkSW5kZXhdLnZhbHVlID09PSB0cnVlO1xyXG4gICAgdmFyIGRhdGFUeXBlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkYXRhVHlwZVwiKS5vcHRpb25zW2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGF0YVR5cGVcIikuc2VsZWN0ZWRJbmRleF0udmFsdWU7XHJcblxyXG4gICAgLy8gLy8gY2FsbCBzd2FnZ2VyIGNsaWVudFxyXG4gICAgLy8gdmFyIGFwaSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuTG9hZEFwaSgpO1xyXG5cclxuICAgIC8vIGNyZWF0ZSBjYWxsYmFjayBmdW5jdGlvblxyXG4gICAgZnVuY3Rpb24gbG9hZENhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgLy9sb2FkIHRoZSBmaXJzdCBpbWFnZSBiYXRjaFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZpbGUgbG9hZGVkXCIpO1xyXG4gICAgICAgICAgICBnZXRMb2FkZWREYXRhU2V0cygpO1xyXG4gICAgICAgICAgICBhcHBlbmRJbWFnZXMoMTAwMCk7XHJcblxyXG4gICAgICAgICAgICAvLyByZW1vdmUgc2VsZWN0aW9uOlxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImltYWdlUHJldmlld1wiKS5saW5rZWRJZCA9IFwiXCI7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkQXBpLmxvYWRGaWxlKGZpbGVuYW1lLCB7XHJcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogZGF0YXNldG5hbWUsXHJcbiAgICAgICAgJ3JlYWRfbGFiZWxzJzogZmFsc2UsXHJcbiAgICAgICAgJ2RhdGFfdHlwZSc6IGRhdGFUeXBlXHJcbiAgICB9LCBsb2FkQ2FsbGJhY2spO1xyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gdXBsb2FkRmlsZSgpIHtcclxuICAgIGZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnRmlsZSB1cGxvYWRlZCEnKTtcclxuICAgICAgICAgICAgLy8gdXBkYXRlIGF2YWlsYWJsZSBkYXQgc2V0czpcclxuICAgICAgICAgICAgZ2V0QXZhaWxhYmxlRGF0YVNldHMoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGZpbGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dFVwbG9hZEZpbGVcIikuZmlsZXM7XHJcbiAgICAvL2NvbnNvbGUubG9nKGZpbGVQYXRoKTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBmOyBmID0gZmlsZXNbaV07IGkrKykge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGYpO1xyXG4gICAgICAgIGxvYWRBcGkudXBsb2FkRmlsZShmKTtcclxuICAgIH1cclxuXHJcbn1cclxuXHJcblxyXG4vKlxyXG5BdHRhY2ggYnV0dG9uIGV2ZW50c1xyXG4gKi9cclxuXHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9hZEJ0blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgbG9hZEZpbGUpO1xyXG5cclxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzaG93SW1hZ2VzQnRuXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBhcHBlbmRJbWFnZXMoMzAwKTtcclxufSk7XHJcblxyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVwbG9hZEJ0blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgdXBsb2FkRmlsZSk7XHJcblxyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0QXZhaWxhYmxlRGF0YVNldHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0RGF0YXNldE5hbWVcIikudmFsdWUgPVxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRBdmFpbGFibGVEYXRhU2V0c1wiKS5vcHRpb25zW2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRBdmFpbGFibGVEYXRhU2V0c1wiKVxyXG4gICAgICAgICAgICAuc2VsZWN0ZWRJbmRleF0udmFsdWUuc3BsaXQoJy4nKVswXTtcclxufSk7XHJcblxyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0TG9hZGVkRGF0YVNldHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICBkYXRhc2V0bmFtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRMb2FkZWREYXRhU2V0c1wiKS5vcHRpb25zW2RvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRMb2FkZWREYXRhU2V0c1wiKS5zZWxlY3RlZEluZGV4XS52YWx1ZTtcclxuICAgIHZhciBpbWFnZUdyaWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImltYWdlR3JpZFwiKTtcclxuICAgIHdoaWxlIChpbWFnZUdyaWQuZmlyc3RDaGlsZCkge1xyXG4gICAgICAgIGltYWdlR3JpZC5yZW1vdmVDaGlsZChpbWFnZUdyaWQuZmlyc3RDaGlsZCk7XHJcbiAgICB9XHJcbiAgICBsb2FkQXBpLnJlc2V0QWxsQmF0Y2hJbmRpY2VzKGNhbGxiYWNrKTtcclxuICAgIHVwZGF0ZURhdGFTZXRTdGF0aXN0aWNzKCk7XHJcbiAgICBhcHBlbmRJbWFnZXMoMTAwMCk7XHJcbn0pO1xyXG5cclxuLypcclxuSW5pdGlhbGlzYXRpb25cclxuICovXHJcblxyXG4vLyBjcmVhdGUgaGlzdG9ncmFtXHJcbnZhciBoaXN0b2dyYW0gPSBuZXcgSGlzdG9ncmFtKFwiaW1hZ2VQcmV2aWV3Vmlld1wiLCA0MDAsIDQwMCk7XHJcbmxvYWRBcGkucmVzZXRBbGxCYXRjaEluZGljZXMoY2FsbGJhY2spO1xyXG4vLyByZW1vdmUgc2VsZWN0aW9uOlxyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImltYWdlUHJldmlld1wiKS5saW5rZWRJZCA9IFwiXCI7XHJcbmdldEF2YWlsYWJsZURhdGFTZXRzKCk7XHJcbmdldExvYWRlZERhdGFTZXRzKCk7XHJcblxyXG5cclxuIl19
