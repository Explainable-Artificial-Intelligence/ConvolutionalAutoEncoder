(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
    tmp = ((uint8[i] << 16) & 0xFF0000) + ((uint8[i + 1] << 8) & 0xFF00) + (uint8[i + 2] & 0xFF)
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

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
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

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
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

function byteLength (string, encoding) {
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

Buffer.prototype.toLocaleString = Buffer.prototype.toString

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

function base64clean (str) {
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

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":4}],4:[function(require,module,exports){
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
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

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

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":5,"./encode":6}],8:[function(require,module,exports){

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
Emitter.prototype.addEventListener = function(event, fn){
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

Emitter.prototype.once = function(event, fn){
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
Emitter.prototype.removeEventListener = function(event, fn){
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

Emitter.prototype.emit = function(event){
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

Emitter.prototype.listeners = function(event){
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

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],9:[function(require,module,exports){
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

function noop(){};

/**
 * Expose `request`.
 */

var request = exports = module.exports = function(method, url) {
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
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
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
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

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
      val.forEach(function(v) {
        pushEncodedKeyValuePair(pairs, key, v);
      });
    } else if (isObject(val)) {
      for(var subkey in val) {
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
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
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

Response.prototype._parseBody = function(str){
  var parse = request.parse[this.type];
  if(this.req._parser) {
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

Response.prototype.toError = function(){
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
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
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
    } catch(e) {
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

Request.prototype.type = function(type){
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

Request.prototype.accept = function(type){
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

Request.prototype.auth = function(user, pass, options){
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

Request.prototype.query = function(val){
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

Request.prototype.attach = function(field, file, options){
  if (file) {
    if (this._data) {
      throw Error("superagent can't mix .send() and .attach()");
    }

    this._getFormData().append(field, file, options || file.name);
  }
  return this;
};

Request.prototype._getFormData = function(){
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

Request.prototype.callback = function(err, res){
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

Request.prototype.crossDomainError = function(){
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;

  err.status = this.status;
  err.method = this.method;
  err.url = this.url;

  this.callback(err);
};

// This only warns, because the request is still likely to work
Request.prototype.buffer = Request.prototype.ca = Request.prototype.agent = function(){
  console.warn("This is not supported in browser version of superagent");
  return this;
};

// This throws, because it can't send/receive data as expected
Request.prototype.pipe = Request.prototype.write = function(){
  throw Error("Streaming is not supported in browser version of superagent");
};

/**
 * Compose querystring to append to req.url
 *
 * @api private
 */

Request.prototype._appendQueryString = function(){
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

Request.prototype.end = function(fn){
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

Request.prototype._end = function() {
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var data = this._formData || this._data;

  this._setTimeouts();

  // state change
  xhr.onreadystatechange = function(){
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
    try { status = xhr.status } catch(e) { status = 0; }

    if (!status) {
      if (self.timedout || self._aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(direction, e) {
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
    } catch(e) {
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

request.get = function(url, data, fn){
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

request.head = function(url, data, fn){
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

request.options = function(url, data, fn){
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

function del(url, data, fn){
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

request.patch = function(url, data, fn){
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

request.post = function(url, data, fn){
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

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

},{"./is-function":10,"./is-object":11,"./request-base":12,"./response-base":13,"./should-retry":14,"component-emitter":8}],10:[function(require,module,exports){
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

},{"./is-object":11}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

RequestBase.prototype.clearTimeout = function _clearTimeout(){
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

RequestBase.prototype.parse = function parse(fn){
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

RequestBase.prototype.responseType = function(val){
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

RequestBase.prototype.serialize = function serialize(fn){
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

RequestBase.prototype.timeout = function timeout(options){
  if (!options || 'object' !== typeof options) {
    this._timeout = options;
    this._responseTimeout = 0;
    return this;
  }

  for(var option in options) {
    switch(option) {
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

RequestBase.prototype.retry = function retry(count){
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

RequestBase.prototype._retry = function() {
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
    this._fullfilledPromise = new Promise(function(innerResolve, innerReject){
      self.end(function(err, res){
        if (err) innerReject(err); else innerResolve(res);
      });
    });
  }
  return this._fullfilledPromise.then(resolve, reject);
}

RequestBase.prototype.catch = function(cb) {
  return this.then(undefined, cb);
};

/**
 * Allow for extension
 */

RequestBase.prototype.use = function use(fn) {
  fn(this);
  return this;
}

RequestBase.prototype.ok = function(cb) {
  if ('function' !== typeof cb) throw Error("Callback required");
  this._okCallback = cb;
  return this;
};

RequestBase.prototype._isResponseOK = function(res) {
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

RequestBase.prototype.get = function(field){
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

RequestBase.prototype.set = function(field, val){
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
RequestBase.prototype.unset = function(field){
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
RequestBase.prototype.field = function(name, val) {

  // name should be either a string or an object.
  if (null === name ||  undefined === name) {
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
RequestBase.prototype.abort = function(){
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

RequestBase.prototype.withCredentials = function(on){
  // This is browser-only functionality. Node side is no-op.
  if(on==undefined) on = true;
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

RequestBase.prototype.redirects = function(n){
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

RequestBase.prototype.toJSON = function(){
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

RequestBase.prototype.send = function(data){
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

RequestBase.prototype.sortQuery = function(sort) {
  // _sort default to true but otherwise can be a function or boolean
  this._sort = typeof sort === 'undefined' ? true : sort;
  return this;
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

RequestBase.prototype._timeoutError = function(reason, timeout, errno){
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

RequestBase.prototype._setTimeouts = function() {
  var self = this;

  // deadline
  if (this._timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self._timeoutError('Timeout of ', self._timeout, 'ETIME');
    }, this._timeout);
  }
  // response timeout
  if (this._responseTimeout && !this._responseTimeoutTimer) {
    this._responseTimeoutTimer = setTimeout(function(){
      self._timeoutError('Response timeout of ', self._responseTimeout, 'ETIMEDOUT');
    }, this._responseTimeout);
  }
}

},{"./is-object":11}],13:[function(require,module,exports){

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

ResponseBase.prototype.get = function(field){
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

ResponseBase.prototype._setHeaderProperties = function(header){
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

ResponseBase.prototype._setStatusProperties = function(status){
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

},{"./utils":15}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

exports.type = function(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

exports.params = function(str){
  return str.split(/ *; */).reduce(function(obj, str){
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

exports.parseLinks = function(str){
  return str.split(/ *, */).reduce(function(obj, str){
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

exports.cleanHeader = function(header, shouldStripCookie){
  delete header['content-type'];
  delete header['content-length'];
  delete header['transfer-encoding'];
  delete header['host'];
  if (shouldStripCookie) {
    delete header['cookie'];
  }
  return header;
};
},{}],16:[function(require,module,exports){
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

},{"buffer":3,"fs":2,"querystring":7,"superagent":9}],17:[function(require,module,exports){
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
    this.getANNParameter = function(callback) {
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
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

},{"../ApiClient":16,"../model/ParameterList":29}],18:[function(require,module,exports){
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
    this.getAvailableDataSets = function(callback) {
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
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
    this.getLatentRepresentationById = function(id, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'id' is set
      if (id === undefined || id === null) {
        throw new Error("Missing the required parameter 'id' when calling getLatentRepresentationById");
      }


      var pathParams = {
      };
      var queryParams = {
        'id': id,
        'datasetname': opts['datasetname'],
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
    this.getLoadedDataSets = function(callback) {
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
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
    this.uploadFile = function(upfile, callback) {
      var postBody = null;

      // verify the required parameter 'upfile' is set
      if (upfile === undefined || upfile === null) {
        throw new Error("Missing the required parameter 'upfile' when calling uploadFile");
      }


      var pathParams = {
      };
      var queryParams = {
      };
      var collectionQueryParams = {
      };
      var headerParams = {
      };
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

},{"../ApiClient":16,"../model/ImageData":27}],19:[function(require,module,exports){
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
    this.controlTraining = function(trainStatus, opts, callback) {
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
      var collectionQueryParams = {
      };
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

},{"../ApiClient":16,"../model/ProcessedImageData":31,"../model/TrainPerformance":33,"../model/TrainStatus":35}],20:[function(require,module,exports){
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

},{"../ApiClient":16,"../model/ParameterList":29,"../model/ProcessedImageData":31,"../model/TrainPerformance":33,"../model/TrainStatus":35}],21:[function(require,module,exports){
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

},{"../ApiClient":16,"../model/ClusterParameters":23,"../model/Clustering":24,"../model/Image":26,"../model/Point2D":30}],22:[function(require,module,exports){
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
}(function(ApiClient, ClusterParameters, Clustering, CostFunction, Image, ImageData, LearningRate, ParameterList, Point2D, ProcessedImageData, RandomFunction, TrainPerformance, TrainPerformanceDataPoint, TrainStatus, BuildApi, LoadApi, TrainApi, TuneApi, VisualizeApi) {
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

},{"./ApiClient":16,"./api/BuildApi":17,"./api/LoadApi":18,"./api/TrainApi":19,"./api/TuneApi":20,"./api/VisualizeApi":21,"./model/ClusterParameters":23,"./model/Clustering":24,"./model/CostFunction":25,"./model/Image":26,"./model/ImageData":27,"./model/LearningRate":28,"./model/ParameterList":29,"./model/Point2D":30,"./model/ProcessedImageData":31,"./model/RandomFunction":32,"./model/TrainPerformance":33,"./model/TrainPerformanceDataPoint":34,"./model/TrainStatus":35}],23:[function(require,module,exports){
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



},{"../ApiClient":16}],24:[function(require,module,exports){
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



},{"../ApiClient":16,"./Point2D":30}],25:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.8
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
    root.ConvolutionalAutoencoder.CostFunction = factory(root.ConvolutionalAutoencoder.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The CostFunction model module.
   * @module model/CostFunction
   * @version 1.1.8
   */

  /**
   * Constructs a new <code>CostFunction</code>.
   * @alias module:model/CostFunction
   * @class
   */
  var exports = function() {
    var _this = this;








  };

  /**
   * Constructs a <code>CostFunction</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/CostFunction} obj Optional instance to populate.
   * @return {module:model/CostFunction} The populated <code>CostFunction</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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



},{"../ApiClient":16}],26:[function(require,module,exports){
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



},{"../ApiClient":16}],27:[function(require,module,exports){
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



},{"../ApiClient":16,"./Image":26}],28:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.8
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
   * @version 1.1.8
   */

  /**
   * Constructs a new <code>LearningRate</code>.
   * @alias module:model/LearningRate
   * @class
   */
  var exports = function() {
    var _this = this;











  };

  /**
   * Constructs a <code>LearningRate</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/LearningRate} obj Optional instance to populate.
   * @return {module:model/LearningRate} The populated <code>LearningRate</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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



},{"../ApiClient":16}],29:[function(require,module,exports){
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
}(this, function(ApiClient, CostFunction, LearningRate, RandomFunction) {
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
  var exports = function() {
    var _this = this;




















  };

  /**
   * Constructs a <code>ParameterList</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/ParameterList} obj Optional instance to populate.
   * @return {module:model/ParameterList} The populated <code>ParameterList</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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



},{"../ApiClient":16,"./CostFunction":25,"./LearningRate":28,"./RandomFunction":32}],30:[function(require,module,exports){
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



},{"../ApiClient":16}],31:[function(require,module,exports){
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



},{"../ApiClient":16,"./Image":26}],32:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.8
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
    root.ConvolutionalAutoencoder.RandomFunction = factory(root.ConvolutionalAutoencoder.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The RandomFunction model module.
   * @module model/RandomFunction
   * @version 1.1.8
   */

  /**
   * Constructs a new <code>RandomFunction</code>.
   * @alias module:model/RandomFunction
   * @class
   */
  var exports = function() {
    var _this = this;










  };

  /**
   * Constructs a <code>RandomFunction</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/RandomFunction} obj Optional instance to populate.
   * @return {module:model/RandomFunction} The populated <code>RandomFunction</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
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



},{"../ApiClient":16}],33:[function(require,module,exports){
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
}(this, function(ApiClient, TrainPerformanceDataPoint) {
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



},{"../ApiClient":16,"./TrainPerformanceDataPoint":34}],34:[function(require,module,exports){
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.8
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
    root.ConvolutionalAutoencoder.TrainPerformanceDataPoint = factory(root.ConvolutionalAutoencoder.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The TrainPerformanceDataPoint model module.
   * @module model/TrainPerformanceDataPoint
   * @version 1.1.8
   */

  /**
   * Constructs a new <code>TrainPerformanceDataPoint</code>.
   * @alias module:model/TrainPerformanceDataPoint
   * @class
   */
  var exports = function() {
    var _this = this;





  };

  /**
   * Constructs a <code>TrainPerformanceDataPoint</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/TrainPerformanceDataPoint} obj Optional instance to populate.
   * @return {module:model/TrainPerformanceDataPoint} The populated <code>TrainPerformanceDataPoint</code> instance.
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



},{"../ApiClient":16}],35:[function(require,module,exports){
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



},{"../ApiClient":16}],36:[function(require,module,exports){
/*
check if client and server are running correctly
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

var buildApi = new ConvolutionalAutoencoder.BuildApi();
var loadApi = new ConvolutionalAutoencoder.LoadApi();

// check API functionality
function callback(error, data, response) {
    if (error) {
        console.error(error);
    } else {
        console.log('API called successfully.');
    }
}

// buildApi.getInputShape([], callback);


function readLearningParameter() {

    var inputParameterList = new ConvolutionalAutoencoder.ParameterList();
    inputParameterList.mirror_weights = [document.getElementById("mirrorWeights").checked];
    inputParameterList.activation_function = [document.getElementById("activationFunction").options[document.getElementById("activationFunction").selectedIndex].value];
    inputParameterList.batch_size = [Number(document.getElementById("batchSize").value)];
    inputParameterList.n_epochs = [Number(document.getElementById("nEpochs").value)];
    inputParameterList.use_tensorboard = document.getElementById("useTensorboard").checked;
    inputParameterList.verbose = document.getElementById("verbose").checked;

    var learningRateDict = new ConvolutionalAutoencoder.LearningRate();
    learningRateDict.learning_rate_function = document.getElementById("learningRateFunction").options[document.getElementById("learningRateFunction").selectedIndex].value;
    learningRateDict.lr_initial_learning_rate = [Number(document.getElementById("lrInitialLearningRate").value)];
    learningRateDict.lr_decay_steps = [Number(document.getElementById("lrDecaySteps").value)];
    learningRateDict.lr_decay_rate = [Number(document.getElementById("lrDecayRate").value)];
    learningRateDict.lr_staircase = [document.getElementById("lrStaircase").checked];
    learningRateDict.lr_boundaries = [JSON.parse(document.getElementById("lrBoundaries").value)];
    learningRateDict.lr_values = [JSON.parse(document.getElementById("lrValues").value)];
    learningRateDict.lr_end_learning_rate = [Number(document.getElementById("lrEndLearningRate").value)];
    learningRateDict.lr_power = [Number(document.getElementById("lrPower").value)];
    learningRateDict.lr_cycle = [document.getElementById("lrCycle").checked];
    inputParameterList.learning_rate_dict = [learningRateDict];

    inputParameterList.optimizer = [document.getElementById("Optimizer").options[document.getElementById("Optimizer").selectedIndex].value];
    inputParameterList.momentum = [Number(document.getElementById("Momentum").value)];

    var costFunctionDict = new ConvolutionalAutoencoder.CostFunction();
    costFunctionDict.cf_cost_function = document.getElementById("CostFunctions").options[document.getElementById("CostFunctions").selectedIndex].value;
    costFunctionDict.cf_max_val = [Number(document.getElementById("cfMaxVal").value)];
    costFunctionDict.cf_filter_size = [Number(document.getElementById("cfFilterSize").value)];
    costFunctionDict.cf_filter_sigma = [Number(document.getElementById("cfFilterSigma").value)];
    costFunctionDict.cf_k1 = [Number(document.getElementById("cfK1").value)];
    costFunctionDict.cf_k2 = [Number(document.getElementById("cfK2").value)];
    costFunctionDict.cf_weights = [JSON.parse(document.getElementById("cfWeights").value)];
    inputParameterList.cost_function_dict = [costFunctionDict];

    var randomWeightsDict = new ConvolutionalAutoencoder.RandomFunction();
    randomWeightsDict.random_function = document.getElementById("randomFunctionForWeights").options[document.getElementById("randomFunctionForWeights").selectedIndex].value;
    randomWeightsDict.alpha = [Number(document.getElementById("rwAlpha").value)];
    randomWeightsDict.beta = [Number(document.getElementById("rwBeta").value)];
    randomWeightsDict.mean = [Number(document.getElementById("rwMean").value)];
    randomWeightsDict.stddev = [Number(document.getElementById("rwStddev").value)];
    randomWeightsDict.lam = [Number(document.getElementById("rwLam").value)];
    randomWeightsDict.minval = [Number(document.getElementById("rwMinval").value)];
    randomWeightsDict.maxval = [Number(document.getElementById("rwMaxval").value)];
    randomWeightsDict.seed = [Number(document.getElementById("rwSeed").value)];
    inputParameterList.random_weights_dict = [randomWeightsDict];

    var randomBiasesDict = new ConvolutionalAutoencoder.RandomFunction();
    randomBiasesDict.random_function = document.getElementById("randomFunctionForBiases").options[document.getElementById("randomFunctionForBiases").selectedIndex].value;
    randomBiasesDict.alpha = [Number(document.getElementById("rbAlpha").value)];
    randomBiasesDict.beta = [Number(document.getElementById("rbBeta").value)];
    randomBiasesDict.mean = [Number(document.getElementById("rbMean").value)];
    randomBiasesDict.stddev = [Number(document.getElementById("rbStddev").value)];
    randomBiasesDict.lam = [Number(document.getElementById("rbLam").value)];
    randomBiasesDict.minval = [Number(document.getElementById("rbMinval").value)];
    randomBiasesDict.maxval = [Number(document.getElementById("rbMaxval").value)];
    randomBiasesDict.seed = [Number(document.getElementById("rbSeed").value)];
    inputParameterList.random_biases_dict = [randomBiasesDict];

    inputParameterList.session_saver_path = document.getElementById("sessionSaverPath").value;
    inputParameterList.session_save_duration = [Number(document.getElementById("sessionSaveDuration").value)];
    inputParameterList.num_test_pictures = [Number(document.getElementById("numTestPictures").value)];


    return inputParameterList;
}


/*
Convolutional Auto Encoder topology
 */


/*
Global Variables
 */
var inputShape = [1, 1, 1, 1];
var datasetname = "";

// var previewLayer = new ANNLayerPreview(500, 500, 28, 28, 3, 3, null, true, false, null);

/*
Helper functions
 */

// get input (output) dimensions
function getInputDimensions() {


    function inputShapeCallback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(data);

            //update data statistics:
            document.getElementById("labelResolution").textContent = "Resolution: " + data[1] + "px x " + data[2] + "px";
            document.getElementById("labelLayer").textContent = "Layer: " + data[3];
            document.getElementById("labelNumberOfImages").textContent = "Number of Images: " + data[0];

            //update input shape:
            inputShape = data;

            // add placeholder for first dim:
            inputShape[0] = -1;

            // update topology input output layers:
            updateInputOutputLayer(inputShape[1], inputShape[2], inputShape[3]);
        }
    }

    if (datasetname !== "") {
        buildApi.getInputShape({'datasetName': datasetname}, inputShapeCallback)
    }

}

function updateInputOutputLayer(resX, resY, channels) {
    // remove previous input/output layer
    var inputLayer = document.getElementById("input_layer");
    var outputLayer = document.getElementById("output_layer");
    if (inputLayer !== null) {
        inputLayer.parentNode.removeChild(inputLayer);
    }
    if (outputLayer !== null) {
        outputLayer.parentNode.removeChild(outputLayer);
    }

    //add visualisation:
    inputOutputLayerPair = new ANNLayerPair(200, 200, resX, resY, channels, 3, "input_output_layer");

    // update global variable:
    inputLayerDim = [resX, resY];

    // set input output layer as preview:
    annLayerPreview.setLinkedLayer(0);

    // renumber layer
    renumberLayers();

}

function getAvailableDataSets() {
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
            if (selection.options.length > 0) {
                // select first element:
                selection.options[0].selected = true;
                selectLoadedDataset();
            }

        }
    }

    loadApi.getLoadedDataSets(callback);
}

function selectLoadedDataset() {
    datasetname = document.getElementById("inputLoadedDataSets").options[document.getElementById("inputLoadedDataSets").selectedIndex].value;
    getInputDimensions();
}

/*function renumberLayers() {
    var layerDiv = document.getElementById("encoder").childNodes;
    console.log(layerDiv);
    var i = 1;
    for (var child in layerDiv) {
        if (layerDiv[child].tagName === 'DIV') {
            if (layerDiv[child].id.startsWith("encoderLayer_")) {
                layerDiv[child].id = "encoderLayer_" + i;
                // adjust layer text:
                console.log(layerDiv[child].childNodes[0]);
                layerDiv[child].childNodes[0].textContent = "Encoder Layer " + i + ": ";
                i++;
            }
        }

    }
    i--;
    layerDiv = document.getElementById("decoder").childNodes;
    console.log(layerDiv);
    for (var child in layerDiv) {
        if (layerDiv[child].tagName === 'DIV') {
            if (layerDiv[child].id.startsWith("decoderLayer_")) {
                layerDiv[child].id = "decoderLayer_" + i;
                // adjust layer text:
                layerDiv[child].childNodes[0].textContent = "Decoder Layer " + i + ": ";
                i--;
            }
        }

    }
    // layerDiv = document.getElementById("decoder").childNodes;
    // i = 1;
    // for(var child in layerDiv){
    //     layerDiv[child].id = "decoderLayer_" + i;
    //     i++;
    // }

}*/


function buildANN() {
    // get ANN topology:
    var filterSizes = [inputOutputLayerPair.getFilterSize()];
    var numStacks = [inputOutputLayerPair.getStackCount()];

    console.log(inputOutputLayerPair.getFilterSize());

    for (var i = 0; i < encoderDecoderLayerPairs.length; i++) {
        filterSizes.push(encoderDecoderLayerPairs[i].getFilterSize());
        numStacks.push(encoderDecoderLayerPairs[i].getStackCount());
    }
    // var numEncoderLayers = document.getElementById("encoder").childElementCount;
    // console.log(numEncoderLayers);
    // for (var i = 1; i < numEncoderLayers; i++) {
    //     // get filtersize of current layer:
    //     filterSizes.push(Number(document.getElementById("filtersizeEL" + i).value));
    //     // get number of Stacks of current layer
    //     numStacks.push(Number(document.getElementById("numStacksEL" + i).value));
    // }

    // var layerDiv = document.getElementById("encoder").childNodes;
    // console.log(layerDiv);
    // var i = 1;
    // for (var child in layerDiv) {
    //     if (layerDiv[child].tagName === 'DIV') {
    //         // get filtersize of current layer:
    //         console.log(layerDiv[child].getElementsByClassName("filter_description")[0]);
    //         var filterSize = Number(layerDiv[child].getElementsByClassName("filter_description")[0].textContent
    //             .split(':')[1]);
    //         // get number of Stacks of current layer
    //         var stackCount = Number(layerDiv[child].getElementsByClassName("stack_description")[0].textContent
    //             .split(':')[1]);
    //
    //         // add current layer properties to arrays
    //         filterSizes.push(filterSize);
    //         numStacks.push(stackCount);
    //
    //     }
    //
    // }

    console.log(inputShape);
    console.log(filterSizes);
    console.log(numStacks);
    // get learning parameters (sidebar):
    var inputParameters = readLearningParameter();

    // save topology information
    inputParameters.input_shape = [inputShape];
    inputParameters.filter_sizes = [filterSizes];
    inputParameters.number_of_stacks = [numStacks];

    console.log(inputParameters);


    /*
        initialize API call
     */

    var buildApi = new ConvolutionalAutoencoder.BuildApi();


    function callback(error, data, response) {
        if (error) {
            console.error(error);
        } else {
            console.log(response);
            console.log(data);
            document.getElementById("responseLabel").textContent = response.text;
        }
    }

    buildApi.buildANN(inputParameters, callback);


}


/*
Event Listener
 */
document.getElementById("buildANN").addEventListener("click", buildANN);
document.getElementById("inputLoadedDataSets").addEventListener("change", selectLoadedDataset);


/*
on load
 */

getAvailableDataSets();
// getInputDimensions();


// add sample ANN
addLayer(null, 3, 12);
//addLayer(null, 2, 6);









},{"convolutional_autoencoder":22}]},{},[36])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2VuY29kZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uLy4uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9pbmRleC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9jb21wb25lbnQtZW1pdHRlci9pbmRleC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9jbGllbnQuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvaXMtZnVuY3Rpb24uanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvaXMtb2JqZWN0LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3JlcXVlc3QtYmFzZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9yZXNwb25zZS1iYXNlLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL3Nob3VsZC1yZXRyeS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi91dGlscy5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9BcGlDbGllbnQuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL0J1aWxkQXBpLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2FwaS9Mb2FkQXBpLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2FwaS9UcmFpbkFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvVHVuZUFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvVmlzdWFsaXplQXBpLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2luZGV4LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0NsdXN0ZXJpbmcuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvQ29zdEZ1bmN0aW9uLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0ltYWdlLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0ltYWdlRGF0YS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9MZWFybmluZ1JhdGUuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUGFyYW1ldGVyTGlzdC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9Qb2ludDJELmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9SYW5kb21GdW5jdGlvbi5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9UcmFpblBlcmZvcm1hbmNlLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvVHJhaW5TdGF0dXMuanMiLCJidWlsZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3I2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMva0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcmxCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWxCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzllQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbi8vIFN1cHBvcnQgZGVjb2RpbmcgVVJMLXNhZmUgYmFzZTY0IHN0cmluZ3MsIGFzIE5vZGUuanMgZG9lcy5cbi8vIFNlZTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQmFzZTY0I1VSTF9hcHBsaWNhdGlvbnNcbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIHBsYWNlSG9sZGVyc0NvdW50IChiNjQpIHtcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG4gIC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcbiAgLy8gcmVwcmVzZW50IG9uZSBieXRlXG4gIC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuICAvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG4gIHJldHVybiBiNjRbbGVuIC0gMl0gPT09ICc9JyA/IDIgOiBiNjRbbGVuIC0gMV0gPT09ICc9JyA/IDEgOiAwXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICAvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbiAgcmV0dXJuIChiNjQubGVuZ3RoICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzQ291bnQoYjY0KVxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciBpLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIHBsYWNlSG9sZGVycyA9IHBsYWNlSG9sZGVyc0NvdW50KGI2NClcblxuICBhcnIgPSBuZXcgQXJyKChsZW4gKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnMpXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICBsID0gcGxhY2VIb2xkZXJzID4gMCA/IGxlbiAtIDQgOiBsZW5cblxuICB2YXIgTCA9IDBcblxuICBmb3IgKGkgPSAwOyBpIDwgbDsgaSArPSA0KSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8IHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPSAoKHVpbnQ4W2ldIDw8IDE2KSAmIDB4RkYwMDAwKSArICgodWludDhbaSArIDFdIDw8IDgpICYgMHhGRjAwKSArICh1aW50OFtpICsgMl0gJiAweEZGKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0ge19fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfX1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlci5wcm90b3R5cGUsICdwYXJlbnQnLCB7XG4gIGdldDogZnVuY3Rpb24gKCkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgfVxuICAgIHJldHVybiB0aGlzLmJ1ZmZlclxuICB9XG59KVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoQnVmZmVyLnByb3RvdHlwZSwgJ29mZnNldCcsIHtcbiAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEJ1ZmZlcikpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuYnl0ZU9mZnNldFxuICB9XG59KVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnSWYgZW5jb2RpbmcgaXMgc3BlY2lmaWVkIHRoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZShhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20oYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIGEgbnVtYmVyJylcbiAgfVxuXG4gIGlmIChpc0FycmF5QnVmZmVyKHZhbHVlKSB8fCAodmFsdWUgJiYgaXNBcnJheUJ1ZmZlcih2YWx1ZS5idWZmZXIpKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICByZXR1cm4gZnJvbU9iamVjdCh2YWx1ZSlcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgbmVnYXRpdmUnKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcIm9mZnNldFwiIGlzIG91dHNpZGUgb2YgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wibGVuZ3RoXCIgaXMgb3V0c2lkZSBvZiBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKEFycmF5QnVmZmVyLmlzVmlldyhvYmopIHx8ICdsZW5ndGgnIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKDApXG4gICAgICB9XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gICAgfVxuXG4gICAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBBcnJheS5pc0FycmF5KG9iai5kYXRhKSkge1xuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIHR5cGUgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgQXJyYXktbGlrZSBPYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIG11c3QgYmUgQnVmZmVycycpXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGJ1ZikpIHtcbiAgICAgIGJ1ZiA9IEJ1ZmZlci5mcm9tKGJ1ZilcbiAgICB9XG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgICB9XG4gICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpXG4gICAgcG9zICs9IGJ1Zi5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmZmVyXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgfVxuICBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KHN0cmluZykgfHwgaXNBcnJheUJ1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5ieXRlTGVuZ3RoXG4gIH1cbiAgaWYgKHR5cGVvZiBzdHJpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgc3RyaW5nID0gJycgKyBzdHJpbmdcbiAgfVxuXG4gIHZhciBsZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGlmIChsZW4gPT09IDApIHJldHVybiAwXG5cbiAgLy8gVXNlIGEgZm9yIGxvb3AgdG8gYXZvaWQgcmVjdXJzaW9uXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gbGVuICogMlxuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGxlbiA+Pj4gMVxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgcmV0dXJuIHV0ZjhUb0J5dGVzKHN0cmluZykubGVuZ3RoIC8vIGFzc3VtZSB1dGY4XG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGhcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIC8vIE5vIG5lZWQgdG8gdmVyaWZ5IHRoYXQgXCJ0aGlzLmxlbmd0aCA8PSBNQVhfVUlOVDMyXCIgc2luY2UgaXQncyBhIHJlYWQtb25seVxuICAvLyBwcm9wZXJ0eSBvZiBhIHR5cGVkIGFycmF5LlxuXG4gIC8vIFRoaXMgYmVoYXZlcyBuZWl0aGVyIGxpa2UgU3RyaW5nIG5vciBVaW50OEFycmF5IGluIHRoYXQgd2Ugc2V0IHN0YXJ0L2VuZFxuICAvLyB0byB0aGVpciB1cHBlci9sb3dlciBib3VuZHMgaWYgdGhlIHZhbHVlIHBhc3NlZCBpcyBvdXQgb2YgcmFuZ2UuXG4gIC8vIHVuZGVmaW5lZCBpcyBoYW5kbGVkIHNwZWNpYWxseSBhcyBwZXIgRUNNQS0yNjIgNnRoIEVkaXRpb24sXG4gIC8vIFNlY3Rpb24gMTMuMy4zLjcgUnVudGltZSBTZW1hbnRpY3M6IEtleWVkQmluZGluZ0luaXRpYWxpemF0aW9uLlxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCB8fCBzdGFydCA8IDApIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICAvLyBSZXR1cm4gZWFybHkgaWYgc3RhcnQgPiB0aGlzLmxlbmd0aC4gRG9uZSBoZXJlIHRvIHByZXZlbnQgcG90ZW50aWFsIHVpbnQzMlxuICAvLyBjb2VyY2lvbiBmYWlsIGJlbG93LlxuICBpZiAoc3RhcnQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChlbmQgPD0gMCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgLy8gRm9yY2UgY29lcnNpb24gdG8gdWludDMyLiBUaGlzIHdpbGwgYWxzbyBjb2VyY2UgZmFsc2V5L05hTiB2YWx1ZXMgdG8gMC5cbiAgZW5kID4+Pj0gMFxuICBzdGFydCA+Pj49IDBcblxuICBpZiAoZW5kIDw9IHN0YXJ0KSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuLy8gVGhpcyBwcm9wZXJ0eSBpcyB1c2VkIGJ5IGBCdWZmZXIuaXNCdWZmZXJgIChhbmQgdGhlIGBpcy1idWZmZXJgIG5wbSBwYWNrYWdlKVxuLy8gdG8gZGV0ZWN0IGEgQnVmZmVyIGluc3RhbmNlLiBJdCdzIG5vdCBwb3NzaWJsZSB0byB1c2UgYGluc3RhbmNlb2YgQnVmZmVyYFxuLy8gcmVsaWFibHkgaW4gYSBicm93c2VyaWZ5IGNvbnRleHQgYmVjYXVzZSB0aGVyZSBjb3VsZCBiZSBtdWx0aXBsZSBkaWZmZXJlbnRcbi8vIGNvcGllcyBvZiB0aGUgJ2J1ZmZlcicgcGFja2FnZSBpbiB1c2UuIFRoaXMgbWV0aG9kIHdvcmtzIGV2ZW4gZm9yIEJ1ZmZlclxuLy8gaW5zdGFuY2VzIHRoYXQgd2VyZSBjcmVhdGVkIGZyb20gYW5vdGhlciBjb3B5IG9mIHRoZSBgYnVmZmVyYCBwYWNrYWdlLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTU0XG5CdWZmZXIucHJvdG90eXBlLl9pc0J1ZmZlciA9IHRydWVcblxuZnVuY3Rpb24gc3dhcCAoYiwgbiwgbSkge1xuICB2YXIgaSA9IGJbbl1cbiAgYltuXSA9IGJbbV1cbiAgYlttXSA9IGlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMTYgPSBmdW5jdGlvbiBzd2FwMTYgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDIgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDE2LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAxKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDMyID0gZnVuY3Rpb24gc3dhcDMyICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA0ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAzMi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA0KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgMilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXA2NCA9IGZ1bmN0aW9uIHN3YXA2NCAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgOCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNjQtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gOCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDcpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDYpXG4gICAgc3dhcCh0aGlzLCBpICsgMiwgaSArIDUpXG4gICAgc3dhcCh0aGlzLCBpICsgMywgaSArIDQpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW5ndGggPT09IDApIHJldHVybiAnJ1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCAwLCBsZW5ndGgpXG4gIHJldHVybiBzbG93VG9TdHJpbmcuYXBwbHkodGhpcywgYXJndW1lbnRzKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvTG9jYWxlU3RyaW5nID0gQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZ1xuXG5CdWZmZXIucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uIGVxdWFscyAoYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIGlmICh0aGlzID09PSBiKSByZXR1cm4gdHJ1ZVxuICByZXR1cm4gQnVmZmVyLmNvbXBhcmUodGhpcywgYikgPT09IDBcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gIHZhciBzdHIgPSAnJ1xuICB2YXIgbWF4ID0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFU1xuICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgc3RyID0gdGhpcy50b1N0cmluZygnaGV4JywgMCwgbWF4KS5tYXRjaCgvLnsyfS9nKS5qb2luKCcgJylcbiAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHN0ciArPSAnIC4uLiAnXG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBzdHIgKyAnPidcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAodGFyZ2V0LCBzdGFydCwgZW5kLCB0aGlzU3RhcnQsIHRoaXNFbmQpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIodGFyZ2V0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICB9XG5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICBzdGFydCA9IDBcbiAgfVxuICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmQgPSB0YXJnZXQgPyB0YXJnZXQubGVuZ3RoIDogMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNTdGFydCA9IDBcbiAgfVxuICBpZiAodGhpc0VuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc0VuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoc3RhcnQgPCAwIHx8IGVuZCA+IHRhcmdldC5sZW5ndGggfHwgdGhpc1N0YXJ0IDwgMCB8fCB0aGlzRW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCAmJiBzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMFxuICB9XG4gIGlmICh0aGlzU3RhcnQgPj0gdGhpc0VuZCkge1xuICAgIHJldHVybiAtMVxuICB9XG4gIGlmIChzdGFydCA+PSBlbmQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgc3RhcnQgPj4+PSAwXG4gIGVuZCA+Pj49IDBcbiAgdGhpc1N0YXJ0ID4+Pj0gMFxuICB0aGlzRW5kID4+Pj0gMFxuXG4gIGlmICh0aGlzID09PSB0YXJnZXQpIHJldHVybiAwXG5cbiAgdmFyIHggPSB0aGlzRW5kIC0gdGhpc1N0YXJ0XG4gIHZhciB5ID0gZW5kIC0gc3RhcnRcbiAgdmFyIGxlbiA9IE1hdGgubWluKHgsIHkpXG5cbiAgdmFyIHRoaXNDb3B5ID0gdGhpcy5zbGljZSh0aGlzU3RhcnQsIHRoaXNFbmQpXG4gIHZhciB0YXJnZXRDb3B5ID0gdGFyZ2V0LnNsaWNlKHN0YXJ0LCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGlmICh0aGlzQ29weVtpXSAhPT0gdGFyZ2V0Q29weVtpXSkge1xuICAgICAgeCA9IHRoaXNDb3B5W2ldXG4gICAgICB5ID0gdGFyZ2V0Q29weVtpXVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHJldHVybiAtMVxuICBpZiAoeSA8IHgpIHJldHVybiAxXG4gIHJldHVybiAwXG59XG5cbi8vIEZpbmRzIGVpdGhlciB0aGUgZmlyc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0ID49IGBieXRlT2Zmc2V0YCxcbi8vIE9SIHRoZSBsYXN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA8PSBgYnl0ZU9mZnNldGAuXG4vL1xuLy8gQXJndW1lbnRzOlxuLy8gLSBidWZmZXIgLSBhIEJ1ZmZlciB0byBzZWFyY2hcbi8vIC0gdmFsIC0gYSBzdHJpbmcsIEJ1ZmZlciwgb3IgbnVtYmVyXG4vLyAtIGJ5dGVPZmZzZXQgLSBhbiBpbmRleCBpbnRvIGBidWZmZXJgOyB3aWxsIGJlIGNsYW1wZWQgdG8gYW4gaW50MzJcbi8vIC0gZW5jb2RpbmcgLSBhbiBvcHRpb25hbCBlbmNvZGluZywgcmVsZXZhbnQgaXMgdmFsIGlzIGEgc3RyaW5nXG4vLyAtIGRpciAtIHRydWUgZm9yIGluZGV4T2YsIGZhbHNlIGZvciBsYXN0SW5kZXhPZlxuZnVuY3Rpb24gYmlkaXJlY3Rpb25hbEluZGV4T2YgKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIC8vIEVtcHR5IGJ1ZmZlciBtZWFucyBubyBtYXRjaFxuICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkgcmV0dXJuIC0xXG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXRcbiAgaWYgKHR5cGVvZiBieXRlT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gYnl0ZU9mZnNldFxuICAgIGJ5dGVPZmZzZXQgPSAwXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIHtcbiAgICBieXRlT2Zmc2V0ID0gMHg3ZmZmZmZmZlxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkge1xuICAgIGJ5dGVPZmZzZXQgPSAtMHg4MDAwMDAwMFxuICB9XG4gIGJ5dGVPZmZzZXQgPSArYnl0ZU9mZnNldCAgLy8gQ29lcmNlIHRvIE51bWJlci5cbiAgaWYgKG51bWJlcklzTmFOKGJ5dGVPZmZzZXQpKSB7XG4gICAgLy8gYnl0ZU9mZnNldDogaXQgaXQncyB1bmRlZmluZWQsIG51bGwsIE5hTiwgXCJmb29cIiwgZXRjLCBzZWFyY2ggd2hvbGUgYnVmZmVyXG4gICAgYnl0ZU9mZnNldCA9IGRpciA/IDAgOiAoYnVmZmVyLmxlbmd0aCAtIDEpXG4gIH1cblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldDogbmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoICsgYnl0ZU9mZnNldFxuICBpZiAoYnl0ZU9mZnNldCA+PSBidWZmZXIubGVuZ3RoKSB7XG4gICAgaWYgKGRpcikgcmV0dXJuIC0xXG4gICAgZWxzZSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCAtIDFcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgMCkge1xuICAgIGlmIChkaXIpIGJ5dGVPZmZzZXQgPSAwXG4gICAgZWxzZSByZXR1cm4gLTFcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSB2YWxcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFsID0gQnVmZmVyLmZyb20odmFsLCBlbmNvZGluZylcbiAgfVxuXG4gIC8vIEZpbmFsbHksIHNlYXJjaCBlaXRoZXIgaW5kZXhPZiAoaWYgZGlyIGlzIHRydWUpIG9yIGxhc3RJbmRleE9mXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIC8vIFNwZWNpYWwgY2FzZTogbG9va2luZyBmb3IgZW1wdHkgc3RyaW5nL2J1ZmZlciBhbHdheXMgZmFpbHNcbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIC0xXG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAweEZGIC8vIFNlYXJjaCBmb3IgYSBieXRlIHZhbHVlIFswLTI1NV1cbiAgICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGlmIChkaXIpIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5sYXN0SW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgWyB2YWwgXSwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfVxuXG4gIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ZhbCBtdXN0IGJlIHN0cmluZywgbnVtYmVyIG9yIEJ1ZmZlcicpXG59XG5cbmZ1bmN0aW9uIGFycmF5SW5kZXhPZiAoYXJyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgdmFyIGluZGV4U2l6ZSA9IDFcbiAgdmFyIGFyckxlbmd0aCA9IGFyci5sZW5ndGhcbiAgdmFyIHZhbExlbmd0aCA9IHZhbC5sZW5ndGhcblxuICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgaWYgKGVuY29kaW5nID09PSAndWNzMicgfHwgZW5jb2RpbmcgPT09ICd1Y3MtMicgfHxcbiAgICAgICAgZW5jb2RpbmcgPT09ICd1dGYxNmxlJyB8fCBlbmNvZGluZyA9PT0gJ3V0Zi0xNmxlJykge1xuICAgICAgaWYgKGFyci5sZW5ndGggPCAyIHx8IHZhbC5sZW5ndGggPCAyKSB7XG4gICAgICAgIHJldHVybiAtMVxuICAgICAgfVxuICAgICAgaW5kZXhTaXplID0gMlxuICAgICAgYXJyTGVuZ3RoIC89IDJcbiAgICAgIHZhbExlbmd0aCAvPSAyXG4gICAgICBieXRlT2Zmc2V0IC89IDJcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZWFkIChidWYsIGkpIHtcbiAgICBpZiAoaW5kZXhTaXplID09PSAxKSB7XG4gICAgICByZXR1cm4gYnVmW2ldXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBidWYucmVhZFVJbnQxNkJFKGkgKiBpbmRleFNpemUpXG4gICAgfVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKGRpcikge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpIDwgYXJyTGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChyZWFkKGFyciwgaSkgPT09IHJlYWQodmFsLCBmb3VuZEluZGV4ID09PSAtMSA/IDAgOiBpIC0gZm91bmRJbmRleCkpIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggPT09IC0xKSBmb3VuZEluZGV4ID0gaVxuICAgICAgICBpZiAoaSAtIGZvdW5kSW5kZXggKyAxID09PSB2YWxMZW5ndGgpIHJldHVybiBmb3VuZEluZGV4ICogaW5kZXhTaXplXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoZm91bmRJbmRleCAhPT0gLTEpIGkgLT0gaSAtIGZvdW5kSW5kZXhcbiAgICAgICAgZm91bmRJbmRleCA9IC0xXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChieXRlT2Zmc2V0ICsgdmFsTGVuZ3RoID4gYXJyTGVuZ3RoKSBieXRlT2Zmc2V0ID0gYXJyTGVuZ3RoIC0gdmFsTGVuZ3RoXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBmb3VuZCA9IHRydWVcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYgKHJlYWQoYXJyLCBpICsgaikgIT09IHJlYWQodmFsLCBqKSkge1xuICAgICAgICAgIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZm91bmQpIHJldHVybiBpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbiBpbmNsdWRlcyAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gdGhpcy5pbmRleE9mKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpICE9PSAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbiBpbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCB0cnVlKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24gbGFzdEluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgKGJ5dGVzW2kgKyAxXSAqIDI1NikpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IHNob3VsZCBiZSBhIEJ1ZmZlcicpXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5jb3B5V2l0aGluID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVXNlIGJ1aWx0LWluIHdoZW4gYXZhaWxhYmxlLCBtaXNzaW5nIGZyb20gSUUxMVxuICAgIHRoaXMuY29weVdpdGhpbih0YXJnZXRTdGFydCwgc3RhcnQsIGVuZClcbiAgfSBlbHNlIGlmICh0aGlzID09PSB0YXJnZXQgJiYgc3RhcnQgPCB0YXJnZXRTdGFydCAmJiB0YXJnZXRTdGFydCA8IGVuZCkge1xuICAgIC8vIGRlc2NlbmRpbmcgY29weSBmcm9tIGVuZFxuICAgIGZvciAodmFyIGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgVWludDhBcnJheS5wcm90b3R5cGUuc2V0LmNhbGwoXG4gICAgICB0YXJnZXQsXG4gICAgICB0aGlzLnN1YmFycmF5KHN0YXJ0LCBlbmQpLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKChlbmNvZGluZyA9PT0gJ3V0ZjgnICYmIGNvZGUgPCAxMjgpIHx8XG4gICAgICAgICAgZW5jb2RpbmcgPT09ICdsYXRpbjEnKSB7XG4gICAgICAgIC8vIEZhc3QgcGF0aDogSWYgYHZhbGAgZml0cyBpbnRvIGEgc2luZ2xlIGJ5dGUsIHVzZSB0aGF0IG51bWVyaWMgdmFsdWUuXG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiBuZXcgQnVmZmVyKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGlmIChsZW4gPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSB2YWx1ZSBcIicgKyB2YWwgK1xuICAgICAgICAnXCIgaXMgaW52YWxpZCBmb3IgYXJndW1lbnQgXCJ2YWx1ZVwiJylcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSB0YWtlcyBlcXVhbCBzaWducyBhcyBlbmQgb2YgdGhlIEJhc2U2NCBlbmNvZGluZ1xuICBzdHIgPSBzdHIuc3BsaXQoJz0nKVswXVxuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyLnRyaW0oKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBjb252ZXJ0cyBzdHJpbmdzIHdpdGggbGVuZ3RoIDwgMiB0byAnJ1xuICBpZiAoc3RyLmxlbmd0aCA8IDIpIHJldHVybiAnJ1xuICAvLyBOb2RlIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBiYXNlNjQgc3RyaW5ncyAobWlzc2luZyB0cmFpbGluZyA9PT0pLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgd2hpbGUgKHN0ci5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgc3RyID0gc3RyICsgJz0nXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHJpbmcsIHVuaXRzKSB7XG4gIHVuaXRzID0gdW5pdHMgfHwgSW5maW5pdHlcbiAgdmFyIGNvZGVQb2ludFxuICB2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aFxuICB2YXIgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcbiAgdmFyIGJ5dGVzID0gW11cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgY29kZVBvaW50ID0gc3RyaW5nLmNoYXJDb2RlQXQoaSlcblxuICAgIC8vIGlzIHN1cnJvZ2F0ZSBjb21wb25lbnRcbiAgICBpZiAoY29kZVBvaW50ID4gMHhEN0ZGICYmIGNvZGVQb2ludCA8IDB4RTAwMCkge1xuICAgICAgLy8gbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICghbGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgICAvLyBubyBsZWFkIHlldFxuICAgICAgICBpZiAoY29kZVBvaW50ID4gMHhEQkZGKSB7XG4gICAgICAgICAgLy8gdW5leHBlY3RlZCB0cmFpbFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaSArIDEgPT09IGxlbmd0aCkge1xuICAgICAgICAgIC8vIHVucGFpcmVkIGxlYWRcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdmFsaWQgbGVhZFxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG5cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gMiBsZWFkcyBpbiBhIHJvd1xuICAgICAgaWYgKGNvZGVQb2ludCA8IDB4REMwMCkge1xuICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZCBzdXJyb2dhdGUgcGFpclxuICAgICAgY29kZVBvaW50ID0gKGxlYWRTdXJyb2dhdGUgLSAweEQ4MDAgPDwgMTAgfCBjb2RlUG9pbnQgLSAweERDMDApICsgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG5cbi8vIEFycmF5QnVmZmVycyBmcm9tIGFub3RoZXIgY29udGV4dCAoaS5lLiBhbiBpZnJhbWUpIGRvIG5vdCBwYXNzIHRoZSBgaW5zdGFuY2VvZmAgY2hlY2tcbi8vIGJ1dCB0aGV5IHNob3VsZCBiZSB0cmVhdGVkIGFzIHZhbGlkLiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNjZcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXIgKG9iaikge1xuICByZXR1cm4gb2JqIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgfHxcbiAgICAob2JqICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yICE9IG51bGwgJiYgb2JqLmNvbnN0cnVjdG9yLm5hbWUgPT09ICdBcnJheUJ1ZmZlcicgJiZcbiAgICAgIHR5cGVvZiBvYmouYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpXG59XG5cbmZ1bmN0aW9uIG51bWJlcklzTmFOIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPT0gb2JqIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2VsZi1jb21wYXJlXG59XG4iLCJleHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IChuQnl0ZXMgKiA4KSAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IChlICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IChtICogMjU2KSArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSAobkJ5dGVzICogOCkgLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKCh2YWx1ZSAqIGMpIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBJZiBvYmouaGFzT3duUHJvcGVydHkgaGFzIGJlZW4gb3ZlcnJpZGRlbiwgdGhlbiBjYWxsaW5nXG4vLyBvYmouaGFzT3duUHJvcGVydHkocHJvcCkgd2lsbCBicmVhay5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy8xNzA3XG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHFzLCBzZXAsIGVxLCBvcHRpb25zKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICB2YXIgb2JqID0ge307XG5cbiAgaWYgKHR5cGVvZiBxcyAhPT0gJ3N0cmluZycgfHwgcXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHZhciByZWdleHAgPSAvXFwrL2c7XG4gIHFzID0gcXMuc3BsaXQoc2VwKTtcblxuICB2YXIgbWF4S2V5cyA9IDEwMDA7XG4gIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLm1heEtleXMgPT09ICdudW1iZXInKSB7XG4gICAgbWF4S2V5cyA9IG9wdGlvbnMubWF4S2V5cztcbiAgfVxuXG4gIHZhciBsZW4gPSBxcy5sZW5ndGg7XG4gIC8vIG1heEtleXMgPD0gMCBtZWFucyB0aGF0IHdlIHNob3VsZCBub3QgbGltaXQga2V5cyBjb3VudFxuICBpZiAobWF4S2V5cyA+IDAgJiYgbGVuID4gbWF4S2V5cykge1xuICAgIGxlbiA9IG1heEtleXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgdmFyIHggPSBxc1tpXS5yZXBsYWNlKHJlZ2V4cCwgJyUyMCcpLFxuICAgICAgICBpZHggPSB4LmluZGV4T2YoZXEpLFxuICAgICAgICBrc3RyLCB2c3RyLCBrLCB2O1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBrc3RyID0geC5zdWJzdHIoMCwgaWR4KTtcbiAgICAgIHZzdHIgPSB4LnN1YnN0cihpZHggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAga3N0ciA9IHg7XG4gICAgICB2c3RyID0gJyc7XG4gICAgfVxuXG4gICAgayA9IGRlY29kZVVSSUNvbXBvbmVudChrc3RyKTtcbiAgICB2ID0gZGVjb2RlVVJJQ29tcG9uZW50KHZzdHIpO1xuXG4gICAgaWYgKCFoYXNPd25Qcm9wZXJ0eShvYmosIGspKSB7XG4gICAgICBvYmpba10gPSB2O1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICBvYmpba10ucHVzaCh2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tdID0gW29ialtrXSwgdl07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0cmluZ2lmeVByaW1pdGl2ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgc3dpdGNoICh0eXBlb2Ygdikge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gdjtcblxuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIHYgPyAndHJ1ZScgOiAnZmFsc2UnO1xuXG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBpc0Zpbml0ZSh2KSA/IHYgOiAnJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqLCBzZXAsIGVxLCBuYW1lKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG1hcChvYmplY3RLZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBrcyA9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUoaykpICsgZXE7XG4gICAgICBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICAgIHJldHVybiBtYXAob2JqW2tdLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZSh2KSk7XG4gICAgICAgIH0pLmpvaW4oc2VwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqW2tdKSk7XG4gICAgICB9XG4gICAgfSkuam9pbihzZXApO1xuXG4gIH1cblxuICBpZiAoIW5hbWUpIHJldHVybiAnJztcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUobmFtZSkpICsgZXEgK1xuICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmopKTtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG5mdW5jdGlvbiBtYXAgKHhzLCBmKSB7XG4gIGlmICh4cy5tYXApIHJldHVybiB4cy5tYXAoZik7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIHJlcy5wdXNoKGYoeHNbaV0sIGkpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuZGVjb2RlID0gZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vZGVjb2RlJyk7XG5leHBvcnRzLmVuY29kZSA9IGV4cG9ydHMuc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9lbmNvZGUnKTtcbiIsIlxyXG4vKipcclxuICogRXhwb3NlIGBFbWl0dGVyYC5cclxuICovXHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICBtb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBFbWl0dGVyKG9iaikge1xyXG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcclxuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcclxuICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcclxuICB9XHJcbiAgcmV0dXJuIG9iajtcclxufVxyXG5cclxuLyoqXHJcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cclxuRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XHJcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG4gICh0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXSlcclxuICAgIC5wdXNoKGZuKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcclxuICogdGltZSB0aGVuIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XHJcbiAgZnVuY3Rpb24gb24oKSB7XHJcbiAgICB0aGlzLm9mZihldmVudCwgb24pO1xyXG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICB9XHJcblxyXG4gIG9uLmZuID0gZm47XHJcbiAgdGhpcy5vbihldmVudCwgb24pO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXHJcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxyXG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XHJcbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XHJcbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xyXG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuXHJcbiAgLy8gYWxsXHJcbiAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIHNwZWNpZmljIGV2ZW50XHJcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XHJcbiAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xyXG5cclxuICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXHJcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIHJlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXHJcbiAgdmFyIGNiO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBjYiA9IGNhbGxiYWNrc1tpXTtcclxuICAgIGlmIChjYiA9PT0gZm4gfHwgY2IuZm4gPT09IGZuKSB7XHJcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXHJcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XHJcblxyXG4gIGlmIChjYWxsYmFja3MpIHtcclxuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcclxuICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEByZXR1cm4ge0FycmF5fVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcclxuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW107XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBSb290IHJlZmVyZW5jZSBmb3IgaWZyYW1lcy5cclxuICovXHJcblxyXG52YXIgcm9vdDtcclxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IC8vIEJyb3dzZXIgd2luZG93XHJcbiAgcm9vdCA9IHdpbmRvdztcclxufSBlbHNlIGlmICh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcpIHsgLy8gV2ViIFdvcmtlclxyXG4gIHJvb3QgPSBzZWxmO1xyXG59IGVsc2UgeyAvLyBPdGhlciBlbnZpcm9ubWVudHNcclxuICBjb25zb2xlLndhcm4oXCJVc2luZyBicm93c2VyLW9ubHkgdmVyc2lvbiBvZiBzdXBlcmFnZW50IGluIG5vbi1icm93c2VyIGVudmlyb25tZW50XCIpO1xyXG4gIHJvb3QgPSB0aGlzO1xyXG59XHJcblxyXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2NvbXBvbmVudC1lbWl0dGVyJyk7XHJcbnZhciBSZXF1ZXN0QmFzZSA9IHJlcXVpcmUoJy4vcmVxdWVzdC1iYXNlJyk7XHJcbnZhciBpc09iamVjdCA9IHJlcXVpcmUoJy4vaXMtb2JqZWN0Jyk7XHJcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnLi9pcy1mdW5jdGlvbicpO1xyXG52YXIgUmVzcG9uc2VCYXNlID0gcmVxdWlyZSgnLi9yZXNwb25zZS1iYXNlJyk7XHJcbnZhciBzaG91bGRSZXRyeSA9IHJlcXVpcmUoJy4vc2hvdWxkLXJldHJ5Jyk7XHJcblxyXG4vKipcclxuICogTm9vcC5cclxuICovXHJcblxyXG5mdW5jdGlvbiBub29wKCl7fTtcclxuXHJcbi8qKlxyXG4gKiBFeHBvc2UgYHJlcXVlc3RgLlxyXG4gKi9cclxuXHJcbnZhciByZXF1ZXN0ID0gZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obWV0aG9kLCB1cmwpIHtcclxuICAvLyBjYWxsYmFja1xyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiB1cmwpIHtcclxuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpLmVuZCh1cmwpO1xyXG4gIH1cclxuXHJcbiAgLy8gdXJsIGZpcnN0XHJcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xyXG4gICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbmV3IGV4cG9ydHMuUmVxdWVzdChtZXRob2QsIHVybCk7XHJcbn1cclxuXHJcbmV4cG9ydHMuUmVxdWVzdCA9IFJlcXVlc3Q7XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIFhIUi5cclxuICovXHJcblxyXG5yZXF1ZXN0LmdldFhIUiA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAocm9vdC5YTUxIdHRwUmVxdWVzdFxyXG4gICAgICAmJiAoIXJvb3QubG9jYXRpb24gfHwgJ2ZpbGU6JyAhPSByb290LmxvY2F0aW9uLnByb3RvY29sXHJcbiAgICAgICAgICB8fCAhcm9vdC5BY3RpdmVYT2JqZWN0KSkge1xyXG4gICAgcmV0dXJuIG5ldyBYTUxIdHRwUmVxdWVzdDtcclxuICB9IGVsc2Uge1xyXG4gICAgdHJ5IHsgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNaWNyb3NvZnQuWE1MSFRUUCcpOyB9IGNhdGNoKGUpIHt9XHJcbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjYuMCcpOyB9IGNhdGNoKGUpIHt9XHJcbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjMuMCcpOyB9IGNhdGNoKGUpIHt9XHJcbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQJyk7IH0gY2F0Y2goZSkge31cclxuICB9XHJcbiAgdGhyb3cgRXJyb3IoXCJCcm93c2VyLW9ubHkgdmVyaXNvbiBvZiBzdXBlcmFnZW50IGNvdWxkIG5vdCBmaW5kIFhIUlwiKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmVzIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHdoaXRlc3BhY2UsIGFkZGVkIHRvIHN1cHBvcnQgSUUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXHJcbiAqIEByZXR1cm4ge1N0cmluZ31cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxudmFyIHRyaW0gPSAnJy50cmltXHJcbiAgPyBmdW5jdGlvbihzKSB7IHJldHVybiBzLnRyaW0oKTsgfVxyXG4gIDogZnVuY3Rpb24ocykgeyByZXR1cm4gcy5yZXBsYWNlKC8oXlxccyp8XFxzKiQpL2csICcnKTsgfTtcclxuXHJcbi8qKlxyXG4gKiBTZXJpYWxpemUgdGhlIGdpdmVuIGBvYmpgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXHJcbiAqIEByZXR1cm4ge1N0cmluZ31cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gc2VyaWFsaXplKG9iaikge1xyXG4gIGlmICghaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcclxuICB2YXIgcGFpcnMgPSBbXTtcclxuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XHJcbiAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCBvYmpba2V5XSk7XHJcbiAgfVxyXG4gIHJldHVybiBwYWlycy5qb2luKCcmJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwcyAnc2VyaWFsaXplJyB3aXRoIHNlcmlhbGl6aW5nIGFycmF5cy5cclxuICogTXV0YXRlcyB0aGUgcGFpcnMgYXJyYXkuXHJcbiAqXHJcbiAqIEBwYXJhbSB7QXJyYXl9IHBhaXJzXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcclxuICogQHBhcmFtIHtNaXhlZH0gdmFsXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSwgdmFsKSB7XHJcbiAgaWYgKHZhbCAhPSBudWxsKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XHJcbiAgICAgIHZhbC5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2KTtcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2UgaWYgKGlzT2JqZWN0KHZhbCkpIHtcclxuICAgICAgZm9yKHZhciBzdWJrZXkgaW4gdmFsKSB7XHJcbiAgICAgICAgcHVzaEVuY29kZWRLZXlWYWx1ZVBhaXIocGFpcnMsIGtleSArICdbJyArIHN1YmtleSArICddJywgdmFsW3N1YmtleV0pO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBwYWlycy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpXHJcbiAgICAgICAgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsKSk7XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmICh2YWwgPT09IG51bGwpIHtcclxuICAgIHBhaXJzLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KGtleSkpO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEV4cG9zZSBzZXJpYWxpemF0aW9uIG1ldGhvZC5cclxuICovXHJcblxyXG4gcmVxdWVzdC5zZXJpYWxpemVPYmplY3QgPSBzZXJpYWxpemU7XHJcblxyXG4gLyoqXHJcbiAgKiBQYXJzZSB0aGUgZ2l2ZW4geC13d3ctZm9ybS11cmxlbmNvZGVkIGBzdHJgLlxyXG4gICpcclxuICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcclxuICAqIEByZXR1cm4ge09iamVjdH1cclxuICAqIEBhcGkgcHJpdmF0ZVxyXG4gICovXHJcblxyXG5mdW5jdGlvbiBwYXJzZVN0cmluZyhzdHIpIHtcclxuICB2YXIgb2JqID0ge307XHJcbiAgdmFyIHBhaXJzID0gc3RyLnNwbGl0KCcmJyk7XHJcbiAgdmFyIHBhaXI7XHJcbiAgdmFyIHBvcztcclxuXHJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhaXJzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICBwYWlyID0gcGFpcnNbaV07XHJcbiAgICBwb3MgPSBwYWlyLmluZGV4T2YoJz0nKTtcclxuICAgIGlmIChwb3MgPT0gLTEpIHtcclxuICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyKV0gPSAnJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG9ialtkZWNvZGVVUklDb21wb25lbnQocGFpci5zbGljZSgwLCBwb3MpKV0gPVxyXG4gICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKHBvcyArIDEpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHBvc2UgcGFyc2VyLlxyXG4gKi9cclxuXHJcbnJlcXVlc3QucGFyc2VTdHJpbmcgPSBwYXJzZVN0cmluZztcclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IE1JTUUgdHlwZSBtYXAuXHJcbiAqXHJcbiAqICAgICBzdXBlcmFnZW50LnR5cGVzLnhtbCA9ICdhcHBsaWNhdGlvbi94bWwnO1xyXG4gKlxyXG4gKi9cclxuXHJcbnJlcXVlc3QudHlwZXMgPSB7XHJcbiAgaHRtbDogJ3RleHQvaHRtbCcsXHJcbiAganNvbjogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gIHhtbDogJ2FwcGxpY2F0aW9uL3htbCcsXHJcbiAgdXJsZW5jb2RlZDogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXHJcbiAgJ2Zvcm0nOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyxcclxuICAnZm9ybS1kYXRhJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHNlcmlhbGl6YXRpb24gbWFwLlxyXG4gKlxyXG4gKiAgICAgc3VwZXJhZ2VudC5zZXJpYWxpemVbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24ob2JqKXtcclxuICogICAgICAgcmV0dXJuICdnZW5lcmF0ZWQgeG1sIGhlcmUnO1xyXG4gKiAgICAgfTtcclxuICpcclxuICovXHJcblxyXG4gcmVxdWVzdC5zZXJpYWxpemUgPSB7XHJcbiAgICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBzZXJpYWxpemUsXHJcbiAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5zdHJpbmdpZnlcclxuIH07XHJcblxyXG4gLyoqXHJcbiAgKiBEZWZhdWx0IHBhcnNlcnMuXHJcbiAgKlxyXG4gICogICAgIHN1cGVyYWdlbnQucGFyc2VbJ2FwcGxpY2F0aW9uL3htbCddID0gZnVuY3Rpb24oc3RyKXtcclxuICAqICAgICAgIHJldHVybiB7IG9iamVjdCBwYXJzZWQgZnJvbSBzdHIgfTtcclxuICAqICAgICB9O1xyXG4gICpcclxuICAqL1xyXG5cclxucmVxdWVzdC5wYXJzZSA9IHtcclxuICAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJzogcGFyc2VTdHJpbmcsXHJcbiAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnBhcnNlXHJcbn07XHJcblxyXG4vKipcclxuICogUGFyc2UgdGhlIGdpdmVuIGhlYWRlciBgc3RyYCBpbnRvXHJcbiAqIGFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtYXBwZWQgZmllbGRzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXHJcbiAqIEByZXR1cm4ge09iamVjdH1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gcGFyc2VIZWFkZXIoc3RyKSB7XHJcbiAgdmFyIGxpbmVzID0gc3RyLnNwbGl0KC9cXHI/XFxuLyk7XHJcbiAgdmFyIGZpZWxkcyA9IHt9O1xyXG4gIHZhciBpbmRleDtcclxuICB2YXIgbGluZTtcclxuICB2YXIgZmllbGQ7XHJcbiAgdmFyIHZhbDtcclxuXHJcbiAgbGluZXMucG9wKCk7IC8vIHRyYWlsaW5nIENSTEZcclxuXHJcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGxpbmVzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICBsaW5lID0gbGluZXNbaV07XHJcbiAgICBpbmRleCA9IGxpbmUuaW5kZXhPZignOicpO1xyXG4gICAgZmllbGQgPSBsaW5lLnNsaWNlKDAsIGluZGV4KS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgdmFsID0gdHJpbShsaW5lLnNsaWNlKGluZGV4ICsgMSkpO1xyXG4gICAgZmllbGRzW2ZpZWxkXSA9IHZhbDtcclxuICB9XHJcblxyXG4gIHJldHVybiBmaWVsZHM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiBgbWltZWAgaXMganNvbiBvciBoYXMgK2pzb24gc3RydWN0dXJlZCBzeW50YXggc3VmZml4LlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbWltZVxyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBpc0pTT04obWltZSkge1xyXG4gIHJldHVybiAvW1xcLytdanNvblxcYi8udGVzdChtaW1lKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlc3BvbnNlYCB3aXRoIHRoZSBnaXZlbiBgeGhyYC5cclxuICpcclxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxyXG4gKiAgLSBwYXJzZSBoZWFkZXJcclxuICpcclxuICogRXhhbXBsZXM6XHJcbiAqXHJcbiAqICBBbGlhc2luZyBgc3VwZXJhZ2VudGAgYXMgYHJlcXVlc3RgIGlzIG5pY2U6XHJcbiAqXHJcbiAqICAgICAgcmVxdWVzdCA9IHN1cGVyYWdlbnQ7XHJcbiAqXHJcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcclxuICpcclxuICogICAgICByZXF1ZXN0LmdldCgnLycpLmVuZChmdW5jdGlvbihyZXMpe30pO1xyXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcclxuICpcclxuICogIFNlbmRpbmcgZGF0YSBjYW4gYmUgY2hhaW5lZDpcclxuICpcclxuICogICAgICByZXF1ZXN0XHJcbiAqICAgICAgICAucG9zdCgnL3VzZXInKVxyXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXHJcbiAqICAgICAgICAuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XHJcbiAqXHJcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxyXG4gKlxyXG4gKiAgICAgIHJlcXVlc3RcclxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXHJcbiAqICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSwgZnVuY3Rpb24ocmVzKXt9KTtcclxuICpcclxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XHJcbiAqXHJcbiAqICAgICAgcmVxdWVzdFxyXG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXHJcbiAqICAgICAgICAuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XHJcbiAqXHJcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XHJcbiAqXHJcbiAqICAgICAgcmVxdWVzdFxyXG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7WE1MSFRUUFJlcXVlc3R9IHhoclxyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBSZXNwb25zZShyZXEpIHtcclxuICB0aGlzLnJlcSA9IHJlcTtcclxuICB0aGlzLnhociA9IHRoaXMucmVxLnhocjtcclxuICAvLyByZXNwb25zZVRleHQgaXMgYWNjZXNzaWJsZSBvbmx5IGlmIHJlc3BvbnNlVHlwZSBpcyAnJyBvciAndGV4dCcgYW5kIG9uIG9sZGVyIGJyb3dzZXJzXHJcbiAgdGhpcy50ZXh0ID0gKCh0aGlzLnJlcS5tZXRob2QgIT0nSEVBRCcgJiYgKHRoaXMueGhyLnJlc3BvbnNlVHlwZSA9PT0gJycgfHwgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndGV4dCcpKSB8fCB0eXBlb2YgdGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAndW5kZWZpbmVkJylcclxuICAgICA/IHRoaXMueGhyLnJlc3BvbnNlVGV4dFxyXG4gICAgIDogbnVsbDtcclxuICB0aGlzLnN0YXR1c1RleHQgPSB0aGlzLnJlcS54aHIuc3RhdHVzVGV4dDtcclxuICB2YXIgc3RhdHVzID0gdGhpcy54aHIuc3RhdHVzO1xyXG4gIC8vIGhhbmRsZSBJRTkgYnVnOiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwMDQ2OTcyL21zaWUtcmV0dXJucy1zdGF0dXMtY29kZS1vZi0xMjIzLWZvci1hamF4LXJlcXVlc3RcclxuICBpZiAoc3RhdHVzID09PSAxMjIzKSB7XHJcbiAgICAgIHN0YXR1cyA9IDIwNDtcclxuICB9XHJcbiAgdGhpcy5fc2V0U3RhdHVzUHJvcGVydGllcyhzdGF0dXMpO1xyXG4gIHRoaXMuaGVhZGVyID0gdGhpcy5oZWFkZXJzID0gcGFyc2VIZWFkZXIodGhpcy54aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpO1xyXG4gIC8vIGdldEFsbFJlc3BvbnNlSGVhZGVycyBzb21ldGltZXMgZmFsc2VseSByZXR1cm5zIFwiXCIgZm9yIENPUlMgcmVxdWVzdHMsIGJ1dFxyXG4gIC8vIGdldFJlc3BvbnNlSGVhZGVyIHN0aWxsIHdvcmtzLiBzbyB3ZSBnZXQgY29udGVudC10eXBlIGV2ZW4gaWYgZ2V0dGluZ1xyXG4gIC8vIG90aGVyIGhlYWRlcnMgZmFpbHMuXHJcbiAgdGhpcy5oZWFkZXJbJ2NvbnRlbnQtdHlwZSddID0gdGhpcy54aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ2NvbnRlbnQtdHlwZScpO1xyXG4gIHRoaXMuX3NldEhlYWRlclByb3BlcnRpZXModGhpcy5oZWFkZXIpO1xyXG5cclxuICBpZiAobnVsbCA9PT0gdGhpcy50ZXh0ICYmIHJlcS5fcmVzcG9uc2VUeXBlKSB7XHJcbiAgICB0aGlzLmJvZHkgPSB0aGlzLnhoci5yZXNwb25zZTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5ib2R5ID0gdGhpcy5yZXEubWV0aG9kICE9ICdIRUFEJ1xyXG4gICAgICA/IHRoaXMuX3BhcnNlQm9keSh0aGlzLnRleHQgPyB0aGlzLnRleHQgOiB0aGlzLnhoci5yZXNwb25zZSlcclxuICAgICAgOiBudWxsO1xyXG4gIH1cclxufVxyXG5cclxuUmVzcG9uc2VCYXNlKFJlc3BvbnNlLnByb3RvdHlwZSk7XHJcblxyXG4vKipcclxuICogUGFyc2UgdGhlIGdpdmVuIGJvZHkgYHN0cmAuXHJcbiAqXHJcbiAqIFVzZWQgZm9yIGF1dG8tcGFyc2luZyBvZiBib2RpZXMuIFBhcnNlcnNcclxuICogYXJlIGRlZmluZWQgb24gdGhlIGBzdXBlcmFnZW50LnBhcnNlYCBvYmplY3QuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcclxuICogQHJldHVybiB7TWl4ZWR9XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcblJlc3BvbnNlLnByb3RvdHlwZS5fcGFyc2VCb2R5ID0gZnVuY3Rpb24oc3RyKXtcclxuICB2YXIgcGFyc2UgPSByZXF1ZXN0LnBhcnNlW3RoaXMudHlwZV07XHJcbiAgaWYodGhpcy5yZXEuX3BhcnNlcikge1xyXG4gICAgcmV0dXJuIHRoaXMucmVxLl9wYXJzZXIodGhpcywgc3RyKTtcclxuICB9XHJcbiAgaWYgKCFwYXJzZSAmJiBpc0pTT04odGhpcy50eXBlKSkge1xyXG4gICAgcGFyc2UgPSByZXF1ZXN0LnBhcnNlWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgfVxyXG4gIHJldHVybiBwYXJzZSAmJiBzdHIgJiYgKHN0ci5sZW5ndGggfHwgc3RyIGluc3RhbmNlb2YgT2JqZWN0KVxyXG4gICAgPyBwYXJzZShzdHIpXHJcbiAgICA6IG51bGw7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0dXJuIGFuIGBFcnJvcmAgcmVwcmVzZW50YXRpdmUgb2YgdGhpcyByZXNwb25zZS5cclxuICpcclxuICogQHJldHVybiB7RXJyb3J9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuUmVzcG9uc2UucHJvdG90eXBlLnRvRXJyb3IgPSBmdW5jdGlvbigpe1xyXG4gIHZhciByZXEgPSB0aGlzLnJlcTtcclxuICB2YXIgbWV0aG9kID0gcmVxLm1ldGhvZDtcclxuICB2YXIgdXJsID0gcmVxLnVybDtcclxuXHJcbiAgdmFyIG1zZyA9ICdjYW5ub3QgJyArIG1ldGhvZCArICcgJyArIHVybCArICcgKCcgKyB0aGlzLnN0YXR1cyArICcpJztcclxuICB2YXIgZXJyID0gbmV3IEVycm9yKG1zZyk7XHJcbiAgZXJyLnN0YXR1cyA9IHRoaXMuc3RhdHVzO1xyXG4gIGVyci5tZXRob2QgPSBtZXRob2Q7XHJcbiAgZXJyLnVybCA9IHVybDtcclxuXHJcbiAgcmV0dXJuIGVycjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFeHBvc2UgYFJlc3BvbnNlYC5cclxuICovXHJcblxyXG5yZXF1ZXN0LlJlc3BvbnNlID0gUmVzcG9uc2U7XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdGAgd2l0aCB0aGUgZ2l2ZW4gYG1ldGhvZGAgYW5kIGB1cmxgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBSZXF1ZXN0KG1ldGhvZCwgdXJsKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMuX3F1ZXJ5ID0gdGhpcy5fcXVlcnkgfHwgW107XHJcbiAgdGhpcy5tZXRob2QgPSBtZXRob2Q7XHJcbiAgdGhpcy51cmwgPSB1cmw7XHJcbiAgdGhpcy5oZWFkZXIgPSB7fTsgLy8gcHJlc2VydmVzIGhlYWRlciBuYW1lIGNhc2VcclxuICB0aGlzLl9oZWFkZXIgPSB7fTsgLy8gY29lcmNlcyBoZWFkZXIgbmFtZXMgdG8gbG93ZXJjYXNlXHJcbiAgdGhpcy5vbignZW5kJywgZnVuY3Rpb24oKXtcclxuICAgIHZhciBlcnIgPSBudWxsO1xyXG4gICAgdmFyIHJlcyA9IG51bGw7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgcmVzID0gbmV3IFJlc3BvbnNlKHNlbGYpO1xyXG4gICAgfSBjYXRjaChlKSB7XHJcbiAgICAgIGVyciA9IG5ldyBFcnJvcignUGFyc2VyIGlzIHVuYWJsZSB0byBwYXJzZSB0aGUgcmVzcG9uc2UnKTtcclxuICAgICAgZXJyLnBhcnNlID0gdHJ1ZTtcclxuICAgICAgZXJyLm9yaWdpbmFsID0gZTtcclxuICAgICAgLy8gaXNzdWUgIzY3NTogcmV0dXJuIHRoZSByYXcgcmVzcG9uc2UgaWYgdGhlIHJlc3BvbnNlIHBhcnNpbmcgZmFpbHNcclxuICAgICAgaWYgKHNlbGYueGhyKSB7XHJcbiAgICAgICAgLy8gaWU5IGRvZXNuJ3QgaGF2ZSAncmVzcG9uc2UnIHByb3BlcnR5XHJcbiAgICAgICAgZXJyLnJhd1Jlc3BvbnNlID0gdHlwZW9mIHNlbGYueGhyLnJlc3BvbnNlVHlwZSA9PSAndW5kZWZpbmVkJyA/IHNlbGYueGhyLnJlc3BvbnNlVGV4dCA6IHNlbGYueGhyLnJlc3BvbnNlO1xyXG4gICAgICAgIC8vIGlzc3VlICM4NzY6IHJldHVybiB0aGUgaHR0cCBzdGF0dXMgY29kZSBpZiB0aGUgcmVzcG9uc2UgcGFyc2luZyBmYWlsc1xyXG4gICAgICAgIGVyci5zdGF0dXMgPSBzZWxmLnhoci5zdGF0dXMgPyBzZWxmLnhoci5zdGF0dXMgOiBudWxsO1xyXG4gICAgICAgIGVyci5zdGF0dXNDb2RlID0gZXJyLnN0YXR1czsgLy8gYmFja3dhcmRzLWNvbXBhdCBvbmx5XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZXJyLnJhd1Jlc3BvbnNlID0gbnVsbDtcclxuICAgICAgICBlcnIuc3RhdHVzID0gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHNlbGYuY2FsbGJhY2soZXJyKTtcclxuICAgIH1cclxuXHJcbiAgICBzZWxmLmVtaXQoJ3Jlc3BvbnNlJywgcmVzKTtcclxuXHJcbiAgICB2YXIgbmV3X2VycjtcclxuICAgIHRyeSB7XHJcbiAgICAgIGlmICghc2VsZi5faXNSZXNwb25zZU9LKHJlcykpIHtcclxuICAgICAgICBuZXdfZXJyID0gbmV3IEVycm9yKHJlcy5zdGF0dXNUZXh0IHx8ICdVbnN1Y2Nlc3NmdWwgSFRUUCByZXNwb25zZScpO1xyXG4gICAgICAgIG5ld19lcnIub3JpZ2luYWwgPSBlcnI7XHJcbiAgICAgICAgbmV3X2Vyci5yZXNwb25zZSA9IHJlcztcclxuICAgICAgICBuZXdfZXJyLnN0YXR1cyA9IHJlcy5zdGF0dXM7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2goZSkge1xyXG4gICAgICBuZXdfZXJyID0gZTsgLy8gIzk4NSB0b3VjaGluZyByZXMgbWF5IGNhdXNlIElOVkFMSURfU1RBVEVfRVJSIG9uIG9sZCBBbmRyb2lkXHJcbiAgICB9XHJcblxyXG4gICAgLy8gIzEwMDAgZG9uJ3QgY2F0Y2ggZXJyb3JzIGZyb20gdGhlIGNhbGxiYWNrIHRvIGF2b2lkIGRvdWJsZSBjYWxsaW5nIGl0XHJcbiAgICBpZiAobmV3X2Vycikge1xyXG4gICAgICBzZWxmLmNhbGxiYWNrKG5ld19lcnIsIHJlcyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzZWxmLmNhbGxiYWNrKG51bGwsIHJlcyk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNaXhpbiBgRW1pdHRlcmAgYW5kIGBSZXF1ZXN0QmFzZWAuXHJcbiAqL1xyXG5cclxuRW1pdHRlcihSZXF1ZXN0LnByb3RvdHlwZSk7XHJcblJlcXVlc3RCYXNlKFJlcXVlc3QucHJvdG90eXBlKTtcclxuXHJcbi8qKlxyXG4gKiBTZXQgQ29udGVudC1UeXBlIHRvIGB0eXBlYCwgbWFwcGluZyB2YWx1ZXMgZnJvbSBgcmVxdWVzdC50eXBlc2AuXHJcbiAqXHJcbiAqIEV4YW1wbGVzOlxyXG4gKlxyXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XHJcbiAqXHJcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvJylcclxuICogICAgICAgIC50eXBlKCd4bWwnKVxyXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxyXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XHJcbiAqXHJcbiAqICAgICAgcmVxdWVzdC5wb3N0KCcvJylcclxuICogICAgICAgIC50eXBlKCdhcHBsaWNhdGlvbi94bWwnKVxyXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxyXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlcXVlc3QucHJvdG90eXBlLnR5cGUgPSBmdW5jdGlvbih0eXBlKXtcclxuICB0aGlzLnNldCgnQ29udGVudC1UeXBlJywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXQgQWNjZXB0IHRvIGB0eXBlYCwgbWFwcGluZyB2YWx1ZXMgZnJvbSBgcmVxdWVzdC50eXBlc2AuXHJcbiAqXHJcbiAqIEV4YW1wbGVzOlxyXG4gKlxyXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcclxuICpcclxuICogICAgICByZXF1ZXN0LmdldCgnL2FnZW50JylcclxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxyXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XHJcbiAqXHJcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXHJcbiAqICAgICAgICAuYWNjZXB0KCdhcHBsaWNhdGlvbi9qc29uJylcclxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gYWNjZXB0XHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uKHR5cGUpe1xyXG4gIHRoaXMuc2V0KCdBY2NlcHQnLCByZXF1ZXN0LnR5cGVzW3R5cGVdIHx8IHR5cGUpO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VyXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFzc10gb3B0aW9uYWwgaW4gY2FzZSBvZiB1c2luZyAnYmVhcmVyJyBhcyB0eXBlXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHdpdGggJ3R5cGUnIHByb3BlcnR5ICdhdXRvJywgJ2Jhc2ljJyBvciAnYmVhcmVyJyAoZGVmYXVsdCAnYmFzaWMnKVxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5SZXF1ZXN0LnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24odXNlciwgcGFzcywgb3B0aW9ucyl7XHJcbiAgaWYgKHR5cGVvZiBwYXNzID09PSAnb2JqZWN0JyAmJiBwYXNzICE9PSBudWxsKSB7IC8vIHBhc3MgaXMgb3B0aW9uYWwgYW5kIGNhbiBzdWJzdGl0dXRlIGZvciBvcHRpb25zXHJcbiAgICBvcHRpb25zID0gcGFzcztcclxuICB9XHJcbiAgaWYgKCFvcHRpb25zKSB7XHJcbiAgICBvcHRpb25zID0ge1xyXG4gICAgICB0eXBlOiAnZnVuY3Rpb24nID09PSB0eXBlb2YgYnRvYSA/ICdiYXNpYycgOiAnYXV0bycsXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzd2l0Y2ggKG9wdGlvbnMudHlwZSkge1xyXG4gICAgY2FzZSAnYmFzaWMnOlxyXG4gICAgICB0aGlzLnNldCgnQXV0aG9yaXphdGlvbicsICdCYXNpYyAnICsgYnRvYSh1c2VyICsgJzonICsgcGFzcykpO1xyXG4gICAgYnJlYWs7XHJcblxyXG4gICAgY2FzZSAnYXV0byc6XHJcbiAgICAgIHRoaXMudXNlcm5hbWUgPSB1c2VyO1xyXG4gICAgICB0aGlzLnBhc3N3b3JkID0gcGFzcztcclxuICAgIGJyZWFrO1xyXG4gICAgICBcclxuICAgIGNhc2UgJ2JlYXJlcic6IC8vIHVzYWdlIHdvdWxkIGJlIC5hdXRoKGFjY2Vzc1Rva2VuLCB7IHR5cGU6ICdiZWFyZXInIH0pXHJcbiAgICAgIHRoaXMuc2V0KCdBdXRob3JpemF0aW9uJywgJ0JlYXJlciAnICsgdXNlcik7XHJcbiAgICBicmVhazsgIFxyXG4gIH1cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBZGQgcXVlcnktc3RyaW5nIGB2YWxgLlxyXG4gKlxyXG4gKiBFeGFtcGxlczpcclxuICpcclxuICogICByZXF1ZXN0LmdldCgnL3Nob2VzJylcclxuICogICAgIC5xdWVyeSgnc2l6ZT0xMCcpXHJcbiAqICAgICAucXVlcnkoeyBjb2xvcjogJ2JsdWUnIH0pXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gdmFsXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlcXVlc3QucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24odmFsKXtcclxuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gc2VyaWFsaXplKHZhbCk7XHJcbiAgaWYgKHZhbCkgdGhpcy5fcXVlcnkucHVzaCh2YWwpO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFF1ZXVlIHRoZSBnaXZlbiBgZmlsZWAgYXMgYW4gYXR0YWNobWVudCB0byB0aGUgc3BlY2lmaWVkIGBmaWVsZGAsXHJcbiAqIHdpdGggb3B0aW9uYWwgYG9wdGlvbnNgIChvciBmaWxlbmFtZSkuXHJcbiAqXHJcbiAqIGBgYCBqc1xyXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxyXG4gKiAgIC5hdHRhY2goJ2NvbnRlbnQnLCBuZXcgQmxvYihbJzxhIGlkPVwiYVwiPjxiIGlkPVwiYlwiPmhleSE8L2I+PC9hPiddLCB7IHR5cGU6IFwidGV4dC9odG1sXCJ9KSlcclxuICogICAuZW5kKGNhbGxiYWNrKTtcclxuICogYGBgXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxyXG4gKiBAcGFyYW0ge0Jsb2J8RmlsZX0gZmlsZVxyXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnNcclxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuUmVxdWVzdC5wcm90b3R5cGUuYXR0YWNoID0gZnVuY3Rpb24oZmllbGQsIGZpbGUsIG9wdGlvbnMpe1xyXG4gIGlmIChmaWxlKSB7XHJcbiAgICBpZiAodGhpcy5fZGF0YSkge1xyXG4gICAgICB0aHJvdyBFcnJvcihcInN1cGVyYWdlbnQgY2FuJ3QgbWl4IC5zZW5kKCkgYW5kIC5hdHRhY2goKVwiKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9nZXRGb3JtRGF0YSgpLmFwcGVuZChmaWVsZCwgZmlsZSwgb3B0aW9ucyB8fCBmaWxlLm5hbWUpO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblJlcXVlc3QucHJvdG90eXBlLl9nZXRGb3JtRGF0YSA9IGZ1bmN0aW9uKCl7XHJcbiAgaWYgKCF0aGlzLl9mb3JtRGF0YSkge1xyXG4gICAgdGhpcy5fZm9ybURhdGEgPSBuZXcgcm9vdC5Gb3JtRGF0YSgpO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5fZm9ybURhdGE7XHJcbn07XHJcblxyXG4vKipcclxuICogSW52b2tlIHRoZSBjYWxsYmFjayB3aXRoIGBlcnJgIGFuZCBgcmVzYFxyXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcblJlcXVlc3QucHJvdG90eXBlLmNhbGxiYWNrID0gZnVuY3Rpb24oZXJyLCByZXMpe1xyXG4gIC8vIGNvbnNvbGUubG9nKHRoaXMuX3JldHJpZXMsIHRoaXMuX21heFJldHJpZXMpXHJcbiAgaWYgKHRoaXMuX21heFJldHJpZXMgJiYgdGhpcy5fcmV0cmllcysrIDwgdGhpcy5fbWF4UmV0cmllcyAmJiBzaG91bGRSZXRyeShlcnIsIHJlcykpIHtcclxuICAgIHJldHVybiB0aGlzLl9yZXRyeSgpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGZuID0gdGhpcy5fY2FsbGJhY2s7XHJcbiAgdGhpcy5jbGVhclRpbWVvdXQoKTtcclxuXHJcbiAgaWYgKGVycikge1xyXG4gICAgaWYgKHRoaXMuX21heFJldHJpZXMpIGVyci5yZXRyaWVzID0gdGhpcy5fcmV0cmllcyAtIDE7XHJcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcclxuICB9XHJcblxyXG4gIGZuKGVyciwgcmVzKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJbnZva2UgY2FsbGJhY2sgd2l0aCB4LWRvbWFpbiBlcnJvci5cclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuUmVxdWVzdC5wcm90b3R5cGUuY3Jvc3NEb21haW5FcnJvciA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIGVyciA9IG5ldyBFcnJvcignUmVxdWVzdCBoYXMgYmVlbiB0ZXJtaW5hdGVkXFxuUG9zc2libGUgY2F1c2VzOiB0aGUgbmV0d29yayBpcyBvZmZsaW5lLCBPcmlnaW4gaXMgbm90IGFsbG93ZWQgYnkgQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luLCB0aGUgcGFnZSBpcyBiZWluZyB1bmxvYWRlZCwgZXRjLicpO1xyXG4gIGVyci5jcm9zc0RvbWFpbiA9IHRydWU7XHJcblxyXG4gIGVyci5zdGF0dXMgPSB0aGlzLnN0YXR1cztcclxuICBlcnIubWV0aG9kID0gdGhpcy5tZXRob2Q7XHJcbiAgZXJyLnVybCA9IHRoaXMudXJsO1xyXG5cclxuICB0aGlzLmNhbGxiYWNrKGVycik7XHJcbn07XHJcblxyXG4vLyBUaGlzIG9ubHkgd2FybnMsIGJlY2F1c2UgdGhlIHJlcXVlc3QgaXMgc3RpbGwgbGlrZWx5IHRvIHdvcmtcclxuUmVxdWVzdC5wcm90b3R5cGUuYnVmZmVyID0gUmVxdWVzdC5wcm90b3R5cGUuY2EgPSBSZXF1ZXN0LnByb3RvdHlwZS5hZ2VudCA9IGZ1bmN0aW9uKCl7XHJcbiAgY29uc29sZS53YXJuKFwiVGhpcyBpcyBub3Qgc3VwcG9ydGVkIGluIGJyb3dzZXIgdmVyc2lvbiBvZiBzdXBlcmFnZW50XCIpO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLy8gVGhpcyB0aHJvd3MsIGJlY2F1c2UgaXQgY2FuJ3Qgc2VuZC9yZWNlaXZlIGRhdGEgYXMgZXhwZWN0ZWRcclxuUmVxdWVzdC5wcm90b3R5cGUucGlwZSA9IFJlcXVlc3QucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oKXtcclxuICB0aHJvdyBFcnJvcihcIlN0cmVhbWluZyBpcyBub3Qgc3VwcG9ydGVkIGluIGJyb3dzZXIgdmVyc2lvbiBvZiBzdXBlcmFnZW50XCIpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbXBvc2UgcXVlcnlzdHJpbmcgdG8gYXBwZW5kIHRvIHJlcS51cmxcclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuUmVxdWVzdC5wcm90b3R5cGUuX2FwcGVuZFF1ZXJ5U3RyaW5nID0gZnVuY3Rpb24oKXtcclxuICB2YXIgcXVlcnkgPSB0aGlzLl9xdWVyeS5qb2luKCcmJyk7XHJcbiAgaWYgKHF1ZXJ5KSB7XHJcbiAgICB0aGlzLnVybCArPSAodGhpcy51cmwuaW5kZXhPZignPycpID49IDAgPyAnJicgOiAnPycpICsgcXVlcnk7XHJcbiAgfVxyXG5cclxuICBpZiAodGhpcy5fc29ydCkge1xyXG4gICAgdmFyIGluZGV4ID0gdGhpcy51cmwuaW5kZXhPZignPycpO1xyXG4gICAgaWYgKGluZGV4ID49IDApIHtcclxuICAgICAgdmFyIHF1ZXJ5QXJyID0gdGhpcy51cmwuc3Vic3RyaW5nKGluZGV4ICsgMSkuc3BsaXQoJyYnKTtcclxuICAgICAgaWYgKGlzRnVuY3Rpb24odGhpcy5fc29ydCkpIHtcclxuICAgICAgICBxdWVyeUFyci5zb3J0KHRoaXMuX3NvcnQpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHF1ZXJ5QXJyLnNvcnQoKTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLnVybCA9IHRoaXMudXJsLnN1YnN0cmluZygwLCBpbmRleCkgKyAnPycgKyBxdWVyeUFyci5qb2luKCcmJyk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGEgaG9zdCBvYmplY3QsXHJcbiAqIHdlIGRvbid0IHdhbnQgdG8gc2VyaWFsaXplIHRoZXNlIDopXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcclxuICogQHJldHVybiB7Qm9vbGVhbn1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5SZXF1ZXN0LnByb3RvdHlwZS5faXNIb3N0ID0gZnVuY3Rpb24gX2lzSG9zdChvYmopIHtcclxuICAvLyBOYXRpdmUgb2JqZWN0cyBzdHJpbmdpZnkgdG8gW29iamVjdCBGaWxlXSwgW29iamVjdCBCbG9iXSwgW29iamVjdCBGb3JtRGF0YV0sIGV0Yy5cclxuICByZXR1cm4gb2JqICYmICdvYmplY3QnID09PSB0eXBlb2Ygb2JqICYmICFBcnJheS5pc0FycmF5KG9iaikgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgIT09ICdbb2JqZWN0IE9iamVjdF0nO1xyXG59XHJcblxyXG4vKipcclxuICogSW5pdGlhdGUgcmVxdWVzdCwgaW52b2tpbmcgY2FsbGJhY2sgYGZuKHJlcylgXHJcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5SZXF1ZXN0LnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbihmbil7XHJcbiAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xyXG4gICAgY29uc29sZS53YXJuKFwiV2FybmluZzogLmVuZCgpIHdhcyBjYWxsZWQgdHdpY2UuIFRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBzdXBlcmFnZW50XCIpO1xyXG4gIH1cclxuICB0aGlzLl9lbmRDYWxsZWQgPSB0cnVlO1xyXG5cclxuICAvLyBzdG9yZSBjYWxsYmFja1xyXG4gIHRoaXMuX2NhbGxiYWNrID0gZm4gfHwgbm9vcDtcclxuXHJcbiAgLy8gcXVlcnlzdHJpbmdcclxuICB0aGlzLl9hcHBlbmRRdWVyeVN0cmluZygpO1xyXG5cclxuICByZXR1cm4gdGhpcy5fZW5kKCk7XHJcbn07XHJcblxyXG5SZXF1ZXN0LnByb3RvdHlwZS5fZW5kID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHZhciB4aHIgPSB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XHJcbiAgdmFyIGRhdGEgPSB0aGlzLl9mb3JtRGF0YSB8fCB0aGlzLl9kYXRhO1xyXG5cclxuICB0aGlzLl9zZXRUaW1lb3V0cygpO1xyXG5cclxuICAvLyBzdGF0ZSBjaGFuZ2VcclxuICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcclxuICAgIHZhciByZWFkeVN0YXRlID0geGhyLnJlYWR5U3RhdGU7XHJcbiAgICBpZiAocmVhZHlTdGF0ZSA+PSAyICYmIHNlbGYuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XHJcbiAgICAgIGNsZWFyVGltZW91dChzZWxmLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XHJcbiAgICB9XHJcbiAgICBpZiAoNCAhPSByZWFkeVN0YXRlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJbiBJRTksIHJlYWRzIHRvIGFueSBwcm9wZXJ0eSAoZS5nLiBzdGF0dXMpIG9mZiBvZiBhbiBhYm9ydGVkIFhIUiB3aWxsXHJcbiAgICAvLyByZXN1bHQgaW4gdGhlIGVycm9yIFwiQ291bGQgbm90IGNvbXBsZXRlIHRoZSBvcGVyYXRpb24gZHVlIHRvIGVycm9yIGMwMGMwMjNmXCJcclxuICAgIHZhciBzdGF0dXM7XHJcbiAgICB0cnkgeyBzdGF0dXMgPSB4aHIuc3RhdHVzIH0gY2F0Y2goZSkgeyBzdGF0dXMgPSAwOyB9XHJcblxyXG4gICAgaWYgKCFzdGF0dXMpIHtcclxuICAgICAgaWYgKHNlbGYudGltZWRvdXQgfHwgc2VsZi5fYWJvcnRlZCkgcmV0dXJuO1xyXG4gICAgICByZXR1cm4gc2VsZi5jcm9zc0RvbWFpbkVycm9yKCk7XHJcbiAgICB9XHJcbiAgICBzZWxmLmVtaXQoJ2VuZCcpO1xyXG4gIH07XHJcblxyXG4gIC8vIHByb2dyZXNzXHJcbiAgdmFyIGhhbmRsZVByb2dyZXNzID0gZnVuY3Rpb24oZGlyZWN0aW9uLCBlKSB7XHJcbiAgICBpZiAoZS50b3RhbCA+IDApIHtcclxuICAgICAgZS5wZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsICogMTAwO1xyXG4gICAgfVxyXG4gICAgZS5kaXJlY3Rpb24gPSBkaXJlY3Rpb247XHJcbiAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XHJcbiAgfVxyXG4gIGlmICh0aGlzLmhhc0xpc3RlbmVycygncHJvZ3Jlc3MnKSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgeGhyLm9ucHJvZ3Jlc3MgPSBoYW5kbGVQcm9ncmVzcy5iaW5kKG51bGwsICdkb3dubG9hZCcpO1xyXG4gICAgICBpZiAoeGhyLnVwbG9hZCkge1xyXG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGhhbmRsZVByb2dyZXNzLmJpbmQobnVsbCwgJ3VwbG9hZCcpO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoKGUpIHtcclxuICAgICAgLy8gQWNjZXNzaW5nIHhoci51cGxvYWQgZmFpbHMgaW4gSUUgZnJvbSBhIHdlYiB3b3JrZXIsIHNvIGp1c3QgcHJldGVuZCBpdCBkb2Vzbid0IGV4aXN0LlxyXG4gICAgICAvLyBSZXBvcnRlZCBoZXJlOlxyXG4gICAgICAvLyBodHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFjay9kZXRhaWxzLzgzNzI0NS94bWxodHRwcmVxdWVzdC11cGxvYWQtdGhyb3dzLWludmFsaWQtYXJndW1lbnQtd2hlbi11c2VkLWZyb20td2ViLXdvcmtlci1jb250ZXh0XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBpbml0aWF0ZSByZXF1ZXN0XHJcbiAgdHJ5IHtcclxuICAgIGlmICh0aGlzLnVzZXJuYW1lICYmIHRoaXMucGFzc3dvcmQpIHtcclxuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlLCB0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHhoci5vcGVuKHRoaXMubWV0aG9kLCB0aGlzLnVybCwgdHJ1ZSk7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAvLyBzZWUgIzExNDlcclxuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKGVycik7XHJcbiAgfVxyXG5cclxuICAvLyBDT1JTXHJcbiAgaWYgKHRoaXMuX3dpdGhDcmVkZW50aWFscykgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XHJcblxyXG4gIC8vIGJvZHlcclxuICBpZiAoIXRoaXMuX2Zvcm1EYXRhICYmICdHRVQnICE9IHRoaXMubWV0aG9kICYmICdIRUFEJyAhPSB0aGlzLm1ldGhvZCAmJiAnc3RyaW5nJyAhPSB0eXBlb2YgZGF0YSAmJiAhdGhpcy5faXNIb3N0KGRhdGEpKSB7XHJcbiAgICAvLyBzZXJpYWxpemUgc3R1ZmZcclxuICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XHJcbiAgICB2YXIgc2VyaWFsaXplID0gdGhpcy5fc2VyaWFsaXplciB8fCByZXF1ZXN0LnNlcmlhbGl6ZVtjb250ZW50VHlwZSA/IGNvbnRlbnRUeXBlLnNwbGl0KCc7JylbMF0gOiAnJ107XHJcbiAgICBpZiAoIXNlcmlhbGl6ZSAmJiBpc0pTT04oY29udGVudFR5cGUpKSB7XHJcbiAgICAgIHNlcmlhbGl6ZSA9IHJlcXVlc3Quc2VyaWFsaXplWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICB9XHJcbiAgICBpZiAoc2VyaWFsaXplKSBkYXRhID0gc2VyaWFsaXplKGRhdGEpO1xyXG4gIH1cclxuXHJcbiAgLy8gc2V0IGhlYWRlciBmaWVsZHNcclxuICBmb3IgKHZhciBmaWVsZCBpbiB0aGlzLmhlYWRlcikge1xyXG4gICAgaWYgKG51bGwgPT0gdGhpcy5oZWFkZXJbZmllbGRdKSBjb250aW51ZTtcclxuXHJcbiAgICBpZiAodGhpcy5oZWFkZXIuaGFzT3duUHJvcGVydHkoZmllbGQpKVxyXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihmaWVsZCwgdGhpcy5oZWFkZXJbZmllbGRdKTtcclxuICB9XHJcblxyXG4gIGlmICh0aGlzLl9yZXNwb25zZVR5cGUpIHtcclxuICAgIHhoci5yZXNwb25zZVR5cGUgPSB0aGlzLl9yZXNwb25zZVR5cGU7XHJcbiAgfVxyXG5cclxuICAvLyBzZW5kIHN0dWZmXHJcbiAgdGhpcy5lbWl0KCdyZXF1ZXN0JywgdGhpcyk7XHJcblxyXG4gIC8vIElFMTEgeGhyLnNlbmQodW5kZWZpbmVkKSBzZW5kcyAndW5kZWZpbmVkJyBzdHJpbmcgYXMgUE9TVCBwYXlsb2FkIChpbnN0ZWFkIG9mIG5vdGhpbmcpXHJcbiAgLy8gV2UgbmVlZCBudWxsIGhlcmUgaWYgZGF0YSBpcyB1bmRlZmluZWRcclxuICB4aHIuc2VuZCh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcgPyBkYXRhIDogbnVsbCk7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogR0VUIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXHJcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxucmVxdWVzdC5nZXQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcclxuICB2YXIgcmVxID0gcmVxdWVzdCgnR0VUJywgdXJsKTtcclxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcclxuICBpZiAoZGF0YSkgcmVxLnF1ZXJ5KGRhdGEpO1xyXG4gIGlmIChmbikgcmVxLmVuZChmbik7XHJcbiAgcmV0dXJuIHJlcTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXHJcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxucmVxdWVzdC5oZWFkID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XHJcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0hFQUQnLCB1cmwpO1xyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xyXG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcclxuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xyXG4gIHJldHVybiByZXE7XHJcbn07XHJcblxyXG4vKipcclxuICogT1BUSU9OUyBxdWVyeSB0byBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxyXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbnJlcXVlc3Qub3B0aW9ucyA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xyXG4gIHZhciByZXEgPSByZXF1ZXN0KCdPUFRJT05TJywgdXJsKTtcclxuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgZGF0YSkgZm4gPSBkYXRhLCBkYXRhID0gbnVsbDtcclxuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XHJcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcclxuICByZXR1cm4gcmVxO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERFTEVURSBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXHJcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gZGVsKHVybCwgZGF0YSwgZm4pe1xyXG4gIHZhciByZXEgPSByZXF1ZXN0KCdERUxFVEUnLCB1cmwpO1xyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xyXG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcclxuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xyXG4gIHJldHVybiByZXE7XHJcbn07XHJcblxyXG5yZXF1ZXN0WydkZWwnXSA9IGRlbDtcclxucmVxdWVzdFsnZGVsZXRlJ10gPSBkZWw7XHJcblxyXG4vKipcclxuICogUEFUQ0ggYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxyXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbnJlcXVlc3QucGF0Y2ggPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcclxuICB2YXIgcmVxID0gcmVxdWVzdCgnUEFUQ0gnLCB1cmwpO1xyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xyXG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcclxuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xyXG4gIHJldHVybiByZXE7XHJcbn07XHJcblxyXG4vKipcclxuICogUE9TVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXHJcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxucmVxdWVzdC5wb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XHJcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BPU1QnLCB1cmwpO1xyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xyXG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcclxuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xyXG4gIHJldHVybiByZXE7XHJcbn07XHJcblxyXG4vKipcclxuICogUFVUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcclxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cclxuICogQHJldHVybiB7UmVxdWVzdH1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5yZXF1ZXN0LnB1dCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xyXG4gIHZhciByZXEgPSByZXF1ZXN0KCdQVVQnLCB1cmwpO1xyXG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xyXG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcclxuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xyXG4gIHJldHVybiByZXE7XHJcbn07XHJcbiIsIi8qKlxyXG4gKiBDaGVjayBpZiBgZm5gIGlzIGEgZnVuY3Rpb24uXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcclxuXHJcbmZ1bmN0aW9uIGlzRnVuY3Rpb24oZm4pIHtcclxuICB2YXIgdGFnID0gaXNPYmplY3QoZm4pID8gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGZuKSA6ICcnO1xyXG4gIHJldHVybiB0YWcgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvbjtcclxuIiwiLyoqXHJcbiAqIENoZWNrIGlmIGBvYmpgIGlzIGFuIG9iamVjdC5cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9ialxyXG4gKiBAcmV0dXJuIHtCb29sZWFufVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcclxuICByZXR1cm4gbnVsbCAhPT0gb2JqICYmICdvYmplY3QnID09PSB0eXBlb2Ygb2JqO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0O1xyXG4iLCIvKipcclxuICogTW9kdWxlIG9mIG1peGVkLWluIGZ1bmN0aW9ucyBzaGFyZWQgYmV0d2VlbiBub2RlIGFuZCBjbGllbnQgY29kZVxyXG4gKi9cclxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcclxuXHJcbi8qKlxyXG4gKiBFeHBvc2UgYFJlcXVlc3RCYXNlYC5cclxuICovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RCYXNlO1xyXG5cclxuLyoqXHJcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RCYXNlYC5cclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBSZXF1ZXN0QmFzZShvYmopIHtcclxuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IG9ialxyXG4gKiBAcmV0dXJuIHtPYmplY3R9XHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIG1peGluKG9iaikge1xyXG4gIGZvciAodmFyIGtleSBpbiBSZXF1ZXN0QmFzZS5wcm90b3R5cGUpIHtcclxuICAgIG9ialtrZXldID0gUmVxdWVzdEJhc2UucHJvdG90eXBlW2tleV07XHJcbiAgfVxyXG4gIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDbGVhciBwcmV2aW91cyB0aW1lb3V0LlxyXG4gKlxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gX2NsZWFyVGltZW91dCgpe1xyXG4gIGNsZWFyVGltZW91dCh0aGlzLl90aW1lcik7XHJcbiAgY2xlYXJUaW1lb3V0KHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKTtcclxuICBkZWxldGUgdGhpcy5fdGltZXI7XHJcbiAgZGVsZXRlIHRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE92ZXJyaWRlIGRlZmF1bHQgcmVzcG9uc2UgYm9keSBwYXJzZXJcclxuICpcclxuICogVGhpcyBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCB0byBjb252ZXJ0IGluY29taW5nIGRhdGEgaW50byByZXF1ZXN0LmJvZHlcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZShmbil7XHJcbiAgdGhpcy5fcGFyc2VyID0gZm47XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0IGZvcm1hdCBvZiBiaW5hcnkgcmVzcG9uc2UgYm9keS5cclxuICogSW4gYnJvd3NlciB2YWxpZCBmb3JtYXRzIGFyZSAnYmxvYicgYW5kICdhcnJheWJ1ZmZlcicsXHJcbiAqIHdoaWNoIHJldHVybiBCbG9iIGFuZCBBcnJheUJ1ZmZlciwgcmVzcGVjdGl2ZWx5LlxyXG4gKlxyXG4gKiBJbiBOb2RlIGFsbCB2YWx1ZXMgcmVzdWx0IGluIEJ1ZmZlci5cclxuICpcclxuICogRXhhbXBsZXM6XHJcbiAqXHJcbiAqICAgICAgcmVxLmdldCgnLycpXHJcbiAqICAgICAgICAucmVzcG9uc2VUeXBlKCdibG9iJylcclxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlcXVlc3RCYXNlLnByb3RvdHlwZS5yZXNwb25zZVR5cGUgPSBmdW5jdGlvbih2YWwpe1xyXG4gIHRoaXMuX3Jlc3BvbnNlVHlwZSA9IHZhbDtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBPdmVycmlkZSBkZWZhdWx0IHJlcXVlc3QgYm9keSBzZXJpYWxpemVyXHJcbiAqXHJcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBkYXRhIHNldCB2aWEgLnNlbmQgb3IgLmF0dGFjaCBpbnRvIHBheWxvYWQgdG8gc2VuZFxyXG4gKlxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZm4pe1xyXG4gIHRoaXMuX3NlcmlhbGl6ZXIgPSBmbjtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXQgdGltZW91dHMuXHJcbiAqXHJcbiAqIC0gcmVzcG9uc2UgdGltZW91dCBpcyB0aW1lIGJldHdlZW4gc2VuZGluZyByZXF1ZXN0IGFuZCByZWNlaXZpbmcgdGhlIGZpcnN0IGJ5dGUgb2YgdGhlIHJlc3BvbnNlLiBJbmNsdWRlcyBETlMgYW5kIGNvbm5lY3Rpb24gdGltZS5cclxuICogLSBkZWFkbGluZSBpcyB0aGUgdGltZSBmcm9tIHN0YXJ0IG9mIHRoZSByZXF1ZXN0IHRvIHJlY2VpdmluZyByZXNwb25zZSBib2R5IGluIGZ1bGwuIElmIHRoZSBkZWFkbGluZSBpcyB0b28gc2hvcnQgbGFyZ2UgZmlsZXMgbWF5IG5vdCBsb2FkIGF0IGFsbCBvbiBzbG93IGNvbm5lY3Rpb25zLlxyXG4gKlxyXG4gKiBWYWx1ZSBvZiAwIG9yIGZhbHNlIG1lYW5zIG5vIHRpbWVvdXQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7TnVtYmVyfE9iamVjdH0gbXMgb3Ige3Jlc3BvbnNlLCByZWFkLCBkZWFkbGluZX1cclxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiB0aW1lb3V0KG9wdGlvbnMpe1xyXG4gIGlmICghb3B0aW9ucyB8fCAnb2JqZWN0JyAhPT0gdHlwZW9mIG9wdGlvbnMpIHtcclxuICAgIHRoaXMuX3RpbWVvdXQgPSBvcHRpb25zO1xyXG4gICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gMDtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgZm9yKHZhciBvcHRpb24gaW4gb3B0aW9ucykge1xyXG4gICAgc3dpdGNoKG9wdGlvbikge1xyXG4gICAgICBjYXNlICdkZWFkbGluZSc6XHJcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnMuZGVhZGxpbmU7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ3Jlc3BvbnNlJzpcclxuICAgICAgICB0aGlzLl9yZXNwb25zZVRpbWVvdXQgPSBvcHRpb25zLnJlc3BvbnNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIGNvbnNvbGUud2FybihcIlVua25vd24gdGltZW91dCBvcHRpb25cIiwgb3B0aW9uKTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0IG51bWJlciBvZiByZXRyeSBhdHRlbXB0cyBvbiBlcnJvci5cclxuICpcclxuICogRmFpbGVkIHJlcXVlc3RzIHdpbGwgYmUgcmV0cmllZCAnY291bnQnIHRpbWVzIGlmIHRpbWVvdXQgb3IgZXJyLmNvZGUgPj0gNTAwLlxyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnRcclxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnJldHJ5ID0gZnVuY3Rpb24gcmV0cnkoY291bnQpe1xyXG4gIC8vIERlZmF1bHQgdG8gMSBpZiBubyBjb3VudCBwYXNzZWQgb3IgdHJ1ZVxyXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwIHx8IGNvdW50ID09PSB0cnVlKSBjb3VudCA9IDE7XHJcbiAgaWYgKGNvdW50IDw9IDApIGNvdW50ID0gMDtcclxuICB0aGlzLl9tYXhSZXRyaWVzID0gY291bnQ7XHJcbiAgdGhpcy5fcmV0cmllcyA9IDA7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogUmV0cnkgcmVxdWVzdFxyXG4gKlxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9yZXRyeSA9IGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMuY2xlYXJUaW1lb3V0KCk7XHJcblxyXG4gIC8vIG5vZGVcclxuICBpZiAodGhpcy5yZXEpIHtcclxuICAgIHRoaXMucmVxID0gbnVsbDtcclxuICAgIHRoaXMucmVxID0gdGhpcy5yZXF1ZXN0KCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLl9hYm9ydGVkID0gZmFsc2U7XHJcbiAgdGhpcy50aW1lZG91dCA9IGZhbHNlO1xyXG5cclxuICByZXR1cm4gdGhpcy5fZW5kKCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUHJvbWlzZSBzdXBwb3J0XHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3JlamVjdF1cclxuICogQHJldHVybiB7UmVxdWVzdH1cclxuICovXHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudGhlbiA9IGZ1bmN0aW9uIHRoZW4ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgaWYgKCF0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgaWYgKHRoaXMuX2VuZENhbGxlZCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oXCJXYXJuaW5nOiBzdXBlcmFnZW50IHJlcXVlc3Qgd2FzIHNlbnQgdHdpY2UsIGJlY2F1c2UgYm90aCAuZW5kKCkgYW5kIC50aGVuKCkgd2VyZSBjYWxsZWQuIE5ldmVyIGNhbGwgLmVuZCgpIGlmIHlvdSB1c2UgcHJvbWlzZXNcIik7XHJcbiAgICB9XHJcbiAgICB0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKGlubmVyUmVzb2x2ZSwgaW5uZXJSZWplY3Qpe1xyXG4gICAgICBzZWxmLmVuZChmdW5jdGlvbihlcnIsIHJlcyl7XHJcbiAgICAgICAgaWYgKGVycikgaW5uZXJSZWplY3QoZXJyKTsgZWxzZSBpbm5lclJlc29sdmUocmVzKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcclxufVxyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmNhdGNoID0gZnVuY3Rpb24oY2IpIHtcclxuICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgY2IpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFsbG93IGZvciBleHRlbnNpb25cclxuICovXHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGZuKSB7XHJcbiAgZm4odGhpcyk7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn1cclxuXHJcblJlcXVlc3RCYXNlLnByb3RvdHlwZS5vayA9IGZ1bmN0aW9uKGNiKSB7XHJcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBjYikgdGhyb3cgRXJyb3IoXCJDYWxsYmFjayByZXF1aXJlZFwiKTtcclxuICB0aGlzLl9va0NhbGxiYWNrID0gY2I7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX2lzUmVzcG9uc2VPSyA9IGZ1bmN0aW9uKHJlcykge1xyXG4gIGlmICghcmVzKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAodGhpcy5fb2tDYWxsYmFjaykge1xyXG4gICAgcmV0dXJuIHRoaXMuX29rQ2FsbGJhY2socmVzKTtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXMuc3RhdHVzID49IDIwMCAmJiByZXMuc3RhdHVzIDwgMzAwO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBHZXQgcmVxdWVzdCBoZWFkZXIgYGZpZWxkYC5cclxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXHJcbiAqIEByZXR1cm4ge1N0cmluZ31cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oZmllbGQpe1xyXG4gIHJldHVybiB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IGNhc2UtaW5zZW5zaXRpdmUgaGVhZGVyIGBmaWVsZGAgdmFsdWUuXHJcbiAqIFRoaXMgaXMgYSBkZXByZWNhdGVkIGludGVybmFsIEFQSS4gVXNlIGAuZ2V0KGZpZWxkKWAgaW5zdGVhZC5cclxuICpcclxuICogKGdldEhlYWRlciBpcyBubyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoZSBzdXBlcmFnZW50IGNvZGUgYmFzZSlcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXHJcbiAqIEByZXR1cm4ge1N0cmluZ31cclxuICogQGFwaSBwcml2YXRlXHJcbiAqIEBkZXByZWNhdGVkXHJcbiAqL1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldEhlYWRlciA9IFJlcXVlc3RCYXNlLnByb3RvdHlwZS5nZXQ7XHJcblxyXG4vKipcclxuICogU2V0IGhlYWRlciBgZmllbGRgIHRvIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0LlxyXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxyXG4gKlxyXG4gKiBFeGFtcGxlczpcclxuICpcclxuICogICAgICByZXEuZ2V0KCcvJylcclxuICogICAgICAgIC5zZXQoJ0FjY2VwdCcsICdhcHBsaWNhdGlvbi9qc29uJylcclxuICogICAgICAgIC5zZXQoJ1gtQVBJLUtleScsICdmb29iYXInKVxyXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XHJcbiAqXHJcbiAqICAgICAgcmVxLmdldCgnLycpXHJcbiAqICAgICAgICAuc2V0KHsgQWNjZXB0OiAnYXBwbGljYXRpb24vanNvbicsICdYLUFQSS1LZXknOiAnZm9vYmFyJyB9KVxyXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gZmllbGRcclxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oZmllbGQsIHZhbCl7XHJcbiAgaWYgKGlzT2JqZWN0KGZpZWxkKSkge1xyXG4gICAgZm9yICh2YXIga2V5IGluIGZpZWxkKSB7XHJcbiAgICAgIHRoaXMuc2V0KGtleSwgZmllbGRba2V5XSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbiAgdGhpcy5faGVhZGVyW2ZpZWxkLnRvTG93ZXJDYXNlKCldID0gdmFsO1xyXG4gIHRoaXMuaGVhZGVyW2ZpZWxkXSA9IHZhbDtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgaGVhZGVyIGBmaWVsZGAuXHJcbiAqIENhc2UtaW5zZW5zaXRpdmUuXHJcbiAqXHJcbiAqIEV4YW1wbGU6XHJcbiAqXHJcbiAqICAgICAgcmVxLmdldCgnLycpXHJcbiAqICAgICAgICAudW5zZXQoJ1VzZXItQWdlbnQnKVxyXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxyXG4gKi9cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnVuc2V0ID0gZnVuY3Rpb24oZmllbGQpe1xyXG4gIGRlbGV0ZSB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV07XHJcbiAgZGVsZXRlIHRoaXMuaGVhZGVyW2ZpZWxkXTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZSB0aGUgZmllbGQgYG5hbWVgIGFuZCBgdmFsYCwgb3IgbXVsdGlwbGUgZmllbGRzIHdpdGggb25lIG9iamVjdFxyXG4gKiBmb3IgXCJtdWx0aXBhcnQvZm9ybS1kYXRhXCIgcmVxdWVzdCBib2RpZXMuXHJcbiAqXHJcbiAqIGBgYCBqc1xyXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxyXG4gKiAgIC5maWVsZCgnZm9vJywgJ2JhcicpXHJcbiAqICAgLmVuZChjYWxsYmFjayk7XHJcbiAqXHJcbiAqIHJlcXVlc3QucG9zdCgnL3VwbG9hZCcpXHJcbiAqICAgLmZpZWxkKHsgZm9vOiAnYmFyJywgYmF6OiAncXV4JyB9KVxyXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xyXG4gKiBgYGBcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBuYW1lXHJcbiAqIEBwYXJhbSB7U3RyaW5nfEJsb2J8RmlsZXxCdWZmZXJ8ZnMuUmVhZFN0cmVhbX0gdmFsXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmZpZWxkID0gZnVuY3Rpb24obmFtZSwgdmFsKSB7XHJcblxyXG4gIC8vIG5hbWUgc2hvdWxkIGJlIGVpdGhlciBhIHN0cmluZyBvciBhbiBvYmplY3QuXHJcbiAgaWYgKG51bGwgPT09IG5hbWUgfHwgIHVuZGVmaW5lZCA9PT0gbmFtZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCcuZmllbGQobmFtZSwgdmFsKSBuYW1lIGNhbiBub3QgYmUgZW1wdHknKTtcclxuICB9XHJcblxyXG4gIGlmICh0aGlzLl9kYXRhKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiLmZpZWxkKCkgY2FuJ3QgYmUgdXNlZCBpZiAuc2VuZCgpIGlzIHVzZWQuIFBsZWFzZSB1c2Ugb25seSAuc2VuZCgpIG9yIG9ubHkgLmZpZWxkKCkgJiAuYXR0YWNoKClcIik7XHJcbiAgfVxyXG5cclxuICBpZiAoaXNPYmplY3QobmFtZSkpIHtcclxuICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XHJcbiAgICAgIHRoaXMuZmllbGQoa2V5LCBuYW1lW2tleV0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XHJcbiAgICBmb3IgKHZhciBpIGluIHZhbCkge1xyXG4gICAgICB0aGlzLmZpZWxkKG5hbWUsIHZhbFtpXSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIC8vIHZhbCBzaG91bGQgYmUgZGVmaW5lZCBub3dcclxuICBpZiAobnVsbCA9PT0gdmFsIHx8IHVuZGVmaW5lZCA9PT0gdmFsKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJy5maWVsZChuYW1lLCB2YWwpIHZhbCBjYW4gbm90IGJlIGVtcHR5Jyk7XHJcbiAgfVxyXG4gIGlmICgnYm9vbGVhbicgPT09IHR5cGVvZiB2YWwpIHtcclxuICAgIHZhbCA9ICcnICsgdmFsO1xyXG4gIH1cclxuICB0aGlzLl9nZXRGb3JtRGF0YSgpLmFwcGVuZChuYW1lLCB2YWwpO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFib3J0IHRoZSByZXF1ZXN0LCBhbmQgY2xlYXIgcG90ZW50aWFsIHRpbWVvdXQuXHJcbiAqXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbigpe1xyXG4gIGlmICh0aGlzLl9hYm9ydGVkKSB7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcbiAgdGhpcy5fYWJvcnRlZCA9IHRydWU7XHJcbiAgdGhpcy54aHIgJiYgdGhpcy54aHIuYWJvcnQoKTsgLy8gYnJvd3NlclxyXG4gIHRoaXMucmVxICYmIHRoaXMucmVxLmFib3J0KCk7IC8vIG5vZGVcclxuICB0aGlzLmNsZWFyVGltZW91dCgpO1xyXG4gIHRoaXMuZW1pdCgnYWJvcnQnKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbmFibGUgdHJhbnNtaXNzaW9uIG9mIGNvb2tpZXMgd2l0aCB4LWRvbWFpbiByZXF1ZXN0cy5cclxuICpcclxuICogTm90ZSB0aGF0IGZvciB0aGlzIHRvIHdvcmsgdGhlIG9yaWdpbiBtdXN0IG5vdCBiZVxyXG4gKiB1c2luZyBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiIHdpdGggYSB3aWxkY2FyZCxcclxuICogYW5kIGFsc28gbXVzdCBzZXQgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFsc1wiXHJcbiAqIHRvIFwidHJ1ZVwiLlxyXG4gKlxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlcXVlc3RCYXNlLnByb3RvdHlwZS53aXRoQ3JlZGVudGlhbHMgPSBmdW5jdGlvbihvbil7XHJcbiAgLy8gVGhpcyBpcyBicm93c2VyLW9ubHkgZnVuY3Rpb25hbGl0eS4gTm9kZSBzaWRlIGlzIG5vLW9wLlxyXG4gIGlmKG9uPT11bmRlZmluZWQpIG9uID0gdHJ1ZTtcclxuICB0aGlzLl93aXRoQ3JlZGVudGlhbHMgPSBvbjtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTZXQgdGhlIG1heCByZWRpcmVjdHMgdG8gYG5gLiBEb2VzIG5vdGluZyBpbiBicm93c2VyIFhIUiBpbXBsZW1lbnRhdGlvbi5cclxuICpcclxuICogQHBhcmFtIHtOdW1iZXJ9IG5cclxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnJlZGlyZWN0cyA9IGZ1bmN0aW9uKG4pe1xyXG4gIHRoaXMuX21heFJlZGlyZWN0cyA9IG47XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29udmVydCB0byBhIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0IChub3QgSlNPTiBzdHJpbmcpIG9mIHNjYWxhciBwcm9wZXJ0aWVzLlxyXG4gKiBOb3RlIGFzIHRoaXMgbWV0aG9kIGlzIGRlc2lnbmVkIHRvIHJldHVybiBhIHVzZWZ1bCBub24tdGhpcyB2YWx1ZSxcclxuICogaXQgY2Fubm90IGJlIGNoYWluZWQuXHJcbiAqXHJcbiAqIEByZXR1cm4ge09iamVjdH0gZGVzY3JpYmluZyBtZXRob2QsIHVybCwgYW5kIGRhdGEgb2YgdGhpcyByZXF1ZXN0XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCl7XHJcbiAgcmV0dXJuIHtcclxuICAgIG1ldGhvZDogdGhpcy5tZXRob2QsXHJcbiAgICB1cmw6IHRoaXMudXJsLFxyXG4gICAgZGF0YTogdGhpcy5fZGF0YSxcclxuICAgIGhlYWRlcnM6IHRoaXMuX2hlYWRlclxyXG4gIH07XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFNlbmQgYGRhdGFgIGFzIHRoZSByZXF1ZXN0IGJvZHksIGRlZmF1bHRpbmcgdGhlIGAudHlwZSgpYCB0byBcImpzb25cIiB3aGVuXHJcbiAqIGFuIG9iamVjdCBpcyBnaXZlbi5cclxuICpcclxuICogRXhhbXBsZXM6XHJcbiAqXHJcbiAqICAgICAgIC8vIG1hbnVhbCBqc29uXHJcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxyXG4gKiAgICAgICAgIC50eXBlKCdqc29uJylcclxuICogICAgICAgICAuc2VuZCgne1wibmFtZVwiOlwidGpcIn0nKVxyXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXHJcbiAqXHJcbiAqICAgICAgIC8vIGF1dG8ganNvblxyXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcclxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcclxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxyXG4gKlxyXG4gKiAgICAgICAvLyBtYW51YWwgeC13d3ctZm9ybS11cmxlbmNvZGVkXHJcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxyXG4gKiAgICAgICAgIC50eXBlKCdmb3JtJylcclxuICogICAgICAgICAuc2VuZCgnbmFtZT10aicpXHJcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcclxuICpcclxuICogICAgICAgLy8gYXV0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcclxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXHJcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxyXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxyXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXHJcbiAqXHJcbiAqICAgICAgIC8vIGRlZmF1bHRzIHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxyXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxyXG4gKiAgICAgICAgLnNlbmQoJ25hbWU9dG9iaScpXHJcbiAqICAgICAgICAuc2VuZCgnc3BlY2llcz1mZXJyZXQnKVxyXG4gKiAgICAgICAgLmVuZChjYWxsYmFjaylcclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhXHJcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24oZGF0YSl7XHJcbiAgdmFyIGlzT2JqID0gaXNPYmplY3QoZGF0YSk7XHJcbiAgdmFyIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xyXG5cclxuICBpZiAodGhpcy5fZm9ybURhdGEpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoXCIuc2VuZCgpIGNhbid0IGJlIHVzZWQgaWYgLmF0dGFjaCgpIG9yIC5maWVsZCgpIGlzIHVzZWQuIFBsZWFzZSB1c2Ugb25seSAuc2VuZCgpIG9yIG9ubHkgLmZpZWxkKCkgJiAuYXR0YWNoKClcIik7XHJcbiAgfVxyXG5cclxuICBpZiAoaXNPYmogJiYgIXRoaXMuX2RhdGEpIHtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XHJcbiAgICAgIHRoaXMuX2RhdGEgPSBbXTtcclxuICAgIH0gZWxzZSBpZiAoIXRoaXMuX2lzSG9zdChkYXRhKSkge1xyXG4gICAgICB0aGlzLl9kYXRhID0ge307XHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmIChkYXRhICYmIHRoaXMuX2RhdGEgJiYgdGhpcy5faXNIb3N0KHRoaXMuX2RhdGEpKSB7XHJcbiAgICB0aHJvdyBFcnJvcihcIkNhbid0IG1lcmdlIHRoZXNlIHNlbmQgY2FsbHNcIik7XHJcbiAgfVxyXG5cclxuICAvLyBtZXJnZVxyXG4gIGlmIChpc09iaiAmJiBpc09iamVjdCh0aGlzLl9kYXRhKSkge1xyXG4gICAgZm9yICh2YXIga2V5IGluIGRhdGEpIHtcclxuICAgICAgdGhpcy5fZGF0YVtrZXldID0gZGF0YVtrZXldO1xyXG4gICAgfVxyXG4gIH0gZWxzZSBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIGRhdGEpIHtcclxuICAgIC8vIGRlZmF1bHQgdG8geC13d3ctZm9ybS11cmxlbmNvZGVkXHJcbiAgICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnZm9ybScpO1xyXG4gICAgdHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XHJcbiAgICBpZiAoJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcgPT0gdHlwZSkge1xyXG4gICAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YVxyXG4gICAgICAgID8gdGhpcy5fZGF0YSArICcmJyArIGRhdGFcclxuICAgICAgICA6IGRhdGE7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLl9kYXRhID0gKHRoaXMuX2RhdGEgfHwgJycpICsgZGF0YTtcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5fZGF0YSA9IGRhdGE7XHJcbiAgfVxyXG5cclxuICBpZiAoIWlzT2JqIHx8IHRoaXMuX2lzSG9zdChkYXRhKSkge1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyBkZWZhdWx0IHRvIGpzb25cclxuICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnanNvbicpO1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBTb3J0IGBxdWVyeXN0cmluZ2AgYnkgdGhlIHNvcnQgZnVuY3Rpb25cclxuICpcclxuICpcclxuICogRXhhbXBsZXM6XHJcbiAqXHJcbiAqICAgICAgIC8vIGRlZmF1bHQgb3JkZXJcclxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcclxuICogICAgICAgICAucXVlcnkoJ25hbWU9TmljaycpXHJcbiAqICAgICAgICAgLnF1ZXJ5KCdzZWFyY2g9TWFubnknKVxyXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoKVxyXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXHJcbiAqXHJcbiAqICAgICAgIC8vIGN1c3RvbWl6ZWQgc29ydCBmdW5jdGlvblxyXG4gKiAgICAgICByZXF1ZXN0LmdldCgnL3VzZXInKVxyXG4gKiAgICAgICAgIC5xdWVyeSgnbmFtZT1OaWNrJylcclxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXHJcbiAqICAgICAgICAgLnNvcnRRdWVyeShmdW5jdGlvbihhLCBiKXtcclxuICogICAgICAgICAgIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xyXG4gKiAgICAgICAgIH0pXHJcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcclxuICpcclxuICpcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gc29ydFxyXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc29ydFF1ZXJ5ID0gZnVuY3Rpb24oc29ydCkge1xyXG4gIC8vIF9zb3J0IGRlZmF1bHQgdG8gdHJ1ZSBidXQgb3RoZXJ3aXNlIGNhbiBiZSBhIGZ1bmN0aW9uIG9yIGJvb2xlYW5cclxuICB0aGlzLl9zb3J0ID0gdHlwZW9mIHNvcnQgPT09ICd1bmRlZmluZWQnID8gdHJ1ZSA6IHNvcnQ7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggdGltZW91dCBlcnJvci5cclxuICpcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl90aW1lb3V0RXJyb3IgPSBmdW5jdGlvbihyZWFzb24sIHRpbWVvdXQsIGVycm5vKXtcclxuICBpZiAodGhpcy5fYWJvcnRlZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgZXJyID0gbmV3IEVycm9yKHJlYXNvbiArIHRpbWVvdXQgKyAnbXMgZXhjZWVkZWQnKTtcclxuICBlcnIudGltZW91dCA9IHRpbWVvdXQ7XHJcbiAgZXJyLmNvZGUgPSAnRUNPTk5BQk9SVEVEJztcclxuICBlcnIuZXJybm8gPSBlcnJubztcclxuICB0aGlzLnRpbWVkb3V0ID0gdHJ1ZTtcclxuICB0aGlzLmFib3J0KCk7XHJcbiAgdGhpcy5jYWxsYmFjayhlcnIpO1xyXG59O1xyXG5cclxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9zZXRUaW1lb3V0cyA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gZGVhZGxpbmVcclxuICBpZiAodGhpcy5fdGltZW91dCAmJiAhdGhpcy5fdGltZXIpIHtcclxuICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICBzZWxmLl90aW1lb3V0RXJyb3IoJ1RpbWVvdXQgb2YgJywgc2VsZi5fdGltZW91dCwgJ0VUSU1FJyk7XHJcbiAgICB9LCB0aGlzLl90aW1lb3V0KTtcclxuICB9XHJcbiAgLy8gcmVzcG9uc2UgdGltZW91dFxyXG4gIGlmICh0aGlzLl9yZXNwb25zZVRpbWVvdXQgJiYgIXRoaXMuX3Jlc3BvbnNlVGltZW91dFRpbWVyKSB7XHJcbiAgICB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgc2VsZi5fdGltZW91dEVycm9yKCdSZXNwb25zZSB0aW1lb3V0IG9mICcsIHNlbGYuX3Jlc3BvbnNlVGltZW91dCwgJ0VUSU1FRE9VVCcpO1xyXG4gICAgfSwgdGhpcy5fcmVzcG9uc2VUaW1lb3V0KTtcclxuICB9XHJcbn1cclxuIiwiXHJcbi8qKlxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKi9cclxuXHJcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcclxuXHJcbi8qKlxyXG4gKiBFeHBvc2UgYFJlc3BvbnNlQmFzZWAuXHJcbiAqL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZXNwb25zZUJhc2U7XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVzcG9uc2VCYXNlYC5cclxuICpcclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5mdW5jdGlvbiBSZXNwb25zZUJhc2Uob2JqKSB7XHJcbiAgaWYgKG9iaikgcmV0dXJuIG1peGluKG9iaik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBNaXhpbiB0aGUgcHJvdG90eXBlIHByb3BlcnRpZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcclxuICBmb3IgKHZhciBrZXkgaW4gUmVzcG9uc2VCYXNlLnByb3RvdHlwZSkge1xyXG4gICAgb2JqW2tleV0gPSBSZXNwb25zZUJhc2UucHJvdG90eXBlW2tleV07XHJcbiAgfVxyXG4gIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgY2FzZS1pbnNlbnNpdGl2ZSBgZmllbGRgIHZhbHVlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcclxuICogQHJldHVybiB7U3RyaW5nfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oZmllbGQpe1xyXG4gICAgcmV0dXJuIHRoaXMuaGVhZGVyW2ZpZWxkLnRvTG93ZXJDYXNlKCldO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNldCBoZWFkZXIgcmVsYXRlZCBwcm9wZXJ0aWVzOlxyXG4gKlxyXG4gKiAgIC0gYC50eXBlYCB0aGUgY29udGVudCB0eXBlIHdpdGhvdXQgcGFyYW1zXHJcbiAqXHJcbiAqIEEgcmVzcG9uc2Ugb2YgXCJDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIlxyXG4gKiB3aWxsIHByb3ZpZGUgeW91IHdpdGggYSBgLnR5cGVgIG9mIFwidGV4dC9wbGFpblwiLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuX3NldEhlYWRlclByb3BlcnRpZXMgPSBmdW5jdGlvbihoZWFkZXIpe1xyXG4gICAgLy8gVE9ETzogbW9hciFcclxuICAgIC8vIFRPRE86IG1ha2UgdGhpcyBhIHV0aWxcclxuXHJcbiAgICAvLyBjb250ZW50LXR5cGVcclxuICAgIHZhciBjdCA9IGhlYWRlclsnY29udGVudC10eXBlJ10gfHwgJyc7XHJcbiAgICB0aGlzLnR5cGUgPSB1dGlscy50eXBlKGN0KTtcclxuXHJcbiAgICAvLyBwYXJhbXNcclxuICAgIHZhciBwYXJhbXMgPSB1dGlscy5wYXJhbXMoY3QpO1xyXG4gICAgZm9yICh2YXIga2V5IGluIHBhcmFtcykgdGhpc1trZXldID0gcGFyYW1zW2tleV07XHJcblxyXG4gICAgdGhpcy5saW5rcyA9IHt9O1xyXG5cclxuICAgIC8vIGxpbmtzXHJcbiAgICB0cnkge1xyXG4gICAgICAgIGlmIChoZWFkZXIubGluaykge1xyXG4gICAgICAgICAgICB0aGlzLmxpbmtzID0gdXRpbHMucGFyc2VMaW5rcyhoZWFkZXIubGluayk7XHJcbiAgICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgLy8gaWdub3JlXHJcbiAgICB9XHJcbn07XHJcblxyXG4vKipcclxuICogU2V0IGZsYWdzIHN1Y2ggYXMgYC5va2AgYmFzZWQgb24gYHN0YXR1c2AuXHJcbiAqXHJcbiAqIEZvciBleGFtcGxlIGEgMnh4IHJlc3BvbnNlIHdpbGwgZ2l2ZSB5b3UgYSBgLm9rYCBvZiBfX3RydWVfX1xyXG4gKiB3aGVyZWFzIDV4eCB3aWxsIGJlIF9fZmFsc2VfXyBhbmQgYC5lcnJvcmAgd2lsbCBiZSBfX3RydWVfXy4gVGhlXHJcbiAqIGAuY2xpZW50RXJyb3JgIGFuZCBgLnNlcnZlckVycm9yYCBhcmUgYWxzbyBhdmFpbGFibGUgdG8gYmUgbW9yZVxyXG4gKiBzcGVjaWZpYywgYW5kIGAuc3RhdHVzVHlwZWAgaXMgdGhlIGNsYXNzIG9mIGVycm9yIHJhbmdpbmcgZnJvbSAxLi41XHJcbiAqIHNvbWV0aW1lcyB1c2VmdWwgZm9yIG1hcHBpbmcgcmVzcG9uZCBjb2xvcnMgZXRjLlxyXG4gKlxyXG4gKiBcInN1Z2FyXCIgcHJvcGVydGllcyBhcmUgYWxzbyBkZWZpbmVkIGZvciBjb21tb24gY2FzZXMuIEN1cnJlbnRseSBwcm92aWRpbmc6XHJcbiAqXHJcbiAqICAgLSAubm9Db250ZW50XHJcbiAqICAgLSAuYmFkUmVxdWVzdFxyXG4gKiAgIC0gLnVuYXV0aG9yaXplZFxyXG4gKiAgIC0gLm5vdEFjY2VwdGFibGVcclxuICogICAtIC5ub3RGb3VuZFxyXG4gKlxyXG4gKiBAcGFyYW0ge051bWJlcn0gc3RhdHVzXHJcbiAqIEBhcGkgcHJpdmF0ZVxyXG4gKi9cclxuXHJcblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuX3NldFN0YXR1c1Byb3BlcnRpZXMgPSBmdW5jdGlvbihzdGF0dXMpe1xyXG4gICAgdmFyIHR5cGUgPSBzdGF0dXMgLyAxMDAgfCAwO1xyXG5cclxuICAgIC8vIHN0YXR1cyAvIGNsYXNzXHJcbiAgICB0aGlzLnN0YXR1cyA9IHRoaXMuc3RhdHVzQ29kZSA9IHN0YXR1cztcclxuICAgIHRoaXMuc3RhdHVzVHlwZSA9IHR5cGU7XHJcblxyXG4gICAgLy8gYmFzaWNzXHJcbiAgICB0aGlzLmluZm8gPSAxID09IHR5cGU7XHJcbiAgICB0aGlzLm9rID0gMiA9PSB0eXBlO1xyXG4gICAgdGhpcy5yZWRpcmVjdCA9IDMgPT0gdHlwZTtcclxuICAgIHRoaXMuY2xpZW50RXJyb3IgPSA0ID09IHR5cGU7XHJcbiAgICB0aGlzLnNlcnZlckVycm9yID0gNSA9PSB0eXBlO1xyXG4gICAgdGhpcy5lcnJvciA9ICg0ID09IHR5cGUgfHwgNSA9PSB0eXBlKVxyXG4gICAgICAgID8gdGhpcy50b0Vycm9yKClcclxuICAgICAgICA6IGZhbHNlO1xyXG5cclxuICAgIC8vIHN1Z2FyXHJcbiAgICB0aGlzLmFjY2VwdGVkID0gMjAyID09IHN0YXR1cztcclxuICAgIHRoaXMubm9Db250ZW50ID0gMjA0ID09IHN0YXR1cztcclxuICAgIHRoaXMuYmFkUmVxdWVzdCA9IDQwMCA9PSBzdGF0dXM7XHJcbiAgICB0aGlzLnVuYXV0aG9yaXplZCA9IDQwMSA9PSBzdGF0dXM7XHJcbiAgICB0aGlzLm5vdEFjY2VwdGFibGUgPSA0MDYgPT0gc3RhdHVzO1xyXG4gICAgdGhpcy5mb3JiaWRkZW4gPSA0MDMgPT0gc3RhdHVzO1xyXG4gICAgdGhpcy5ub3RGb3VuZCA9IDQwNCA9PSBzdGF0dXM7XHJcbn07XHJcbiIsInZhciBFUlJPUl9DT0RFUyA9IFtcclxuICAnRUNPTk5SRVNFVCcsXHJcbiAgJ0VUSU1FRE9VVCcsXHJcbiAgJ0VBRERSSU5GTycsXHJcbiAgJ0VTT0NLRVRUSU1FRE9VVCdcclxuXTtcclxuXHJcbi8qKlxyXG4gKiBEZXRlcm1pbmUgaWYgYSByZXF1ZXN0IHNob3VsZCBiZSByZXRyaWVkLlxyXG4gKiAoQm9ycm93ZWQgZnJvbSBzZWdtZW50aW8vc3VwZXJhZ2VudC1yZXRyeSlcclxuICpcclxuICogQHBhcmFtIHtFcnJvcn0gZXJyXHJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IFtyZXNdXHJcbiAqIEByZXR1cm5zIHtCb29sZWFufVxyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaG91bGRSZXRyeShlcnIsIHJlcykge1xyXG4gIGlmIChlcnIgJiYgZXJyLmNvZGUgJiYgfkVSUk9SX0NPREVTLmluZGV4T2YoZXJyLmNvZGUpKSByZXR1cm4gdHJ1ZTtcclxuICBpZiAocmVzICYmIHJlcy5zdGF0dXMgJiYgcmVzLnN0YXR1cyA+PSA1MDApIHJldHVybiB0cnVlO1xyXG4gIC8vIFN1cGVyYWdlbnQgdGltZW91dFxyXG4gIGlmIChlcnIgJiYgJ3RpbWVvdXQnIGluIGVyciAmJiBlcnIuY29kZSA9PSAnRUNPTk5BQk9SVEVEJykgcmV0dXJuIHRydWU7XHJcbiAgaWYgKGVyciAmJiAnY3Jvc3NEb21haW4nIGluIGVycikgcmV0dXJuIHRydWU7XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG4iLCJcclxuLyoqXHJcbiAqIFJldHVybiB0aGUgbWltZSB0eXBlIGZvciB0aGUgZ2l2ZW4gYHN0cmAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcclxuICogQHJldHVybiB7U3RyaW5nfVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5leHBvcnRzLnR5cGUgPSBmdW5jdGlvbihzdHIpe1xyXG4gIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykuc2hpZnQoKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXR1cm4gaGVhZGVyIGZpZWxkIHBhcmFtZXRlcnMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5leHBvcnRzLnBhcmFtcyA9IGZ1bmN0aW9uKHN0cil7XHJcbiAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBzdHIpe1xyXG4gICAgdmFyIHBhcnRzID0gc3RyLnNwbGl0KC8gKj0gKi8pO1xyXG4gICAgdmFyIGtleSA9IHBhcnRzLnNoaWZ0KCk7XHJcbiAgICB2YXIgdmFsID0gcGFydHMuc2hpZnQoKTtcclxuXHJcbiAgICBpZiAoa2V5ICYmIHZhbCkgb2JqW2tleV0gPSB2YWw7XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH0sIHt9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBMaW5rIGhlYWRlciBmaWVsZHMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5leHBvcnRzLnBhcnNlTGlua3MgPSBmdW5jdGlvbihzdHIpe1xyXG4gIHJldHVybiBzdHIuc3BsaXQoLyAqLCAqLykucmVkdWNlKGZ1bmN0aW9uKG9iaiwgc3RyKXtcclxuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo7ICovKTtcclxuICAgIHZhciB1cmwgPSBwYXJ0c1swXS5zbGljZSgxLCAtMSk7XHJcbiAgICB2YXIgcmVsID0gcGFydHNbMV0uc3BsaXQoLyAqPSAqLylbMV0uc2xpY2UoMSwgLTEpO1xyXG4gICAgb2JqW3JlbF0gPSB1cmw7XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH0sIHt9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTdHJpcCBjb250ZW50IHJlbGF0ZWQgZmllbGRzIGZyb20gYGhlYWRlcmAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBoZWFkZXJcclxuICogQHJldHVybiB7T2JqZWN0fSBoZWFkZXJcclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZXhwb3J0cy5jbGVhbkhlYWRlciA9IGZ1bmN0aW9uKGhlYWRlciwgc2hvdWxkU3RyaXBDb29raWUpe1xyXG4gIGRlbGV0ZSBoZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xyXG4gIGRlbGV0ZSBoZWFkZXJbJ2NvbnRlbnQtbGVuZ3RoJ107XHJcbiAgZGVsZXRlIGhlYWRlclsndHJhbnNmZXItZW5jb2RpbmcnXTtcclxuICBkZWxldGUgaGVhZGVyWydob3N0J107XHJcbiAgaWYgKHNob3VsZFN0cmlwQ29va2llKSB7XHJcbiAgICBkZWxldGUgaGVhZGVyWydjb29raWUnXTtcclxuICB9XHJcbiAgcmV0dXJuIGhlYWRlcjtcclxufTsiLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ3N1cGVyYWdlbnQnLCAncXVlcnlzdHJpbmcnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnc3VwZXJhZ2VudCcpLCByZXF1aXJlKCdxdWVyeXN0cmluZycpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCA9IGZhY3Rvcnkocm9vdC5zdXBlcmFnZW50LCByb290LnF1ZXJ5c3RyaW5nKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oc3VwZXJhZ2VudCwgcXVlcnlzdHJpbmcpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtb2R1bGUgQXBpQ2xpZW50XHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogTWFuYWdlcyBsb3cgbGV2ZWwgY2xpZW50LXNlcnZlciBjb21tdW5pY2F0aW9ucywgcGFyYW1ldGVyIG1hcnNoYWxsaW5nLCBldGMuIFRoZXJlIHNob3VsZCBub3QgYmUgYW55IG5lZWQgZm9yIGFuXHJcbiAgICogYXBwbGljYXRpb24gdG8gdXNlIHRoaXMgY2xhc3MgZGlyZWN0bHkgLSB0aGUgKkFwaSBhbmQgbW9kZWwgY2xhc3NlcyBwcm92aWRlIHRoZSBwdWJsaWMgQVBJIGZvciB0aGUgc2VydmljZS4gVGhlXHJcbiAgICogY29udGVudHMgb2YgdGhpcyBmaWxlIHNob3VsZCBiZSByZWdhcmRlZCBhcyBpbnRlcm5hbCBidXQgYXJlIGRvY3VtZW50ZWQgZm9yIGNvbXBsZXRlbmVzcy5cclxuICAgKiBAYWxpYXMgbW9kdWxlOkFwaUNsaWVudFxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBiYXNlIFVSTCBhZ2FpbnN0IHdoaWNoIHRvIHJlc29sdmUgZXZlcnkgQVBJIGNhbGwncyAocmVsYXRpdmUpIHBhdGguXHJcbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxyXG4gICAgICogQGRlZmF1bHQgaHR0cDovL2xvY2FsaG9zdDo4MDgwL3YyXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYmFzZVBhdGggPSAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3YyJy5yZXBsYWNlKC9cXC8rJC8sICcnKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2RzIHRvIGJlIGluY2x1ZGVkIGZvciBhbGwgQVBJIGNhbGxzLlxyXG4gICAgICogQHR5cGUge0FycmF5LjxTdHJpbmc+fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmF1dGhlbnRpY2F0aW9ucyA9IHtcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkZWZhdWx0IEhUVFAgaGVhZGVycyB0byBiZSBpbmNsdWRlZCBmb3IgYWxsIEFQSSBjYWxscy5cclxuICAgICAqIEB0eXBlIHtBcnJheS48U3RyaW5nPn1cclxuICAgICAqIEBkZWZhdWx0IHt9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZGVmYXVsdEhlYWRlcnMgPSB7fTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkZWZhdWx0IEhUVFAgdGltZW91dCBmb3IgYWxsIEFQSSBjYWxscy5cclxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XHJcbiAgICAgKiBAZGVmYXVsdCA2MDAwMFxyXG4gICAgICovXHJcbiAgICB0aGlzLnRpbWVvdXQgPSA2MDAwMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIElmIHNldCB0byBmYWxzZSBhbiBhZGRpdGlvbmFsIHRpbWVzdGFtcCBwYXJhbWV0ZXIgaXMgYWRkZWQgdG8gYWxsIEFQSSBHRVQgY2FsbHMgdG9cclxuICAgICAqIHByZXZlbnQgYnJvd3NlciBjYWNoaW5nXHJcbiAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cclxuICAgICAqIEBkZWZhdWx0IHRydWVcclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWNoZSA9IHRydWU7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGNsaWVudCB3aWxsIHNhdmUgdGhlIGNvb2tpZXMgZnJvbSBlYWNoIHNlcnZlclxyXG4gICAgICogcmVzcG9uc2UsIGFuZCByZXR1cm4gdGhlbSBpbiB0aGUgbmV4dCByZXF1ZXN0LlxyXG4gICAgICogQGRlZmF1bHQgZmFsc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5lbmFibGVDb29raWVzID0gZmFsc2U7XHJcblxyXG4gICAgLypcclxuICAgICAqIFVzZWQgdG8gc2F2ZSBhbmQgcmV0dXJuIGNvb2tpZXMgaW4gYSBub2RlLmpzIChub24tYnJvd3Nlcikgc2V0dGluZyxcclxuICAgICAqIGlmIHRoaXMuZW5hYmxlQ29va2llcyBpcyBzZXQgdG8gdHJ1ZS5cclxuICAgICAqL1xyXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgIHRoaXMuYWdlbnQgPSBuZXcgc3VwZXJhZ2VudC5hZ2VudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qXHJcbiAgICAgKiBBbGxvdyB1c2VyIHRvIG92ZXJyaWRlIHN1cGVyYWdlbnQgYWdlbnRcclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXF1ZXN0QWdlbnQgPSBudWxsO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gZm9yIGFuIGFjdHVhbCBwYXJhbWV0ZXIuXHJcbiAgICogQHBhcmFtIHBhcmFtIFRoZSBhY3R1YWwgcGFyYW1ldGVyLlxyXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgPGNvZGU+cGFyYW08L2NvZGU+LlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLnBhcmFtVG9TdHJpbmcgPSBmdW5jdGlvbihwYXJhbSkge1xyXG4gICAgaWYgKHBhcmFtID09IHVuZGVmaW5lZCB8fCBwYXJhbSA9PSBudWxsKSB7XHJcbiAgICAgIHJldHVybiAnJztcclxuICAgIH1cclxuICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIERhdGUpIHtcclxuICAgICAgcmV0dXJuIHBhcmFtLnRvSlNPTigpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtLnRvU3RyaW5nKCk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQnVpbGRzIGZ1bGwgVVJMIGJ5IGFwcGVuZGluZyB0aGUgZ2l2ZW4gcGF0aCB0byB0aGUgYmFzZSBVUkwgYW5kIHJlcGxhY2luZyBwYXRoIHBhcmFtZXRlciBwbGFjZS1ob2xkZXJzIHdpdGggcGFyYW1ldGVyIHZhbHVlcy5cclxuICAgKiBOT1RFOiBxdWVyeSBwYXJhbWV0ZXJzIGFyZSBub3QgaGFuZGxlZCBoZXJlLlxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgYmFzZSBVUkwuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IHBhdGhQYXJhbXMgVGhlIHBhcmFtZXRlciB2YWx1ZXMgdG8gYXBwZW5kLlxyXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBlbmNvZGVkIHBhdGggd2l0aCBwYXJhbWV0ZXIgdmFsdWVzIHN1YnN0aXR1dGVkLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLmJ1aWxkVXJsID0gZnVuY3Rpb24ocGF0aCwgcGF0aFBhcmFtcykge1xyXG4gICAgaWYgKCFwYXRoLm1hdGNoKC9eXFwvLykpIHtcclxuICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XHJcbiAgICB9XHJcbiAgICB2YXIgdXJsID0gdGhpcy5iYXNlUGF0aCArIHBhdGg7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgdXJsID0gdXJsLnJlcGxhY2UoL1xceyhbXFx3LV0rKVxcfS9nLCBmdW5jdGlvbihmdWxsTWF0Y2gsIGtleSkge1xyXG4gICAgICB2YXIgdmFsdWU7XHJcbiAgICAgIGlmIChwYXRoUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICB2YWx1ZSA9IF90aGlzLnBhcmFtVG9TdHJpbmcocGF0aFBhcmFtc1trZXldKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YWx1ZSA9IGZ1bGxNYXRjaDtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHVybDtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gY29udGVudCB0eXBlIHJlcHJlc2VudHMgSlNPTi48YnI+XHJcbiAgICogSlNPTiBjb250ZW50IHR5cGUgZXhhbXBsZXM6PGJyPlxyXG4gICAqIDx1bD5cclxuICAgKiA8bGk+YXBwbGljYXRpb24vanNvbjwvbGk+XHJcbiAgICogPGxpPmFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGODwvbGk+XHJcbiAgICogPGxpPkFQUExJQ0FUSU9OL0pTT048L2xpPlxyXG4gICAqIDwvdWw+XHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnRUeXBlIFRoZSBNSU1FIGNvbnRlbnQgdHlwZSB0byBjaGVjay5cclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgPGNvZGU+Y29udGVudFR5cGU8L2NvZGU+IHJlcHJlc2VudHMgSlNPTiwgb3RoZXJ3aXNlIDxjb2RlPmZhbHNlPC9jb2RlPi5cclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZS5pc0pzb25NaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGUpIHtcclxuICAgIHJldHVybiBCb29sZWFuKGNvbnRlbnRUeXBlICE9IG51bGwgJiYgY29udGVudFR5cGUubWF0Y2goL15hcHBsaWNhdGlvblxcL2pzb24oOy4qKT8kL2kpKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDaG9vc2VzIGEgY29udGVudCB0eXBlIGZyb20gdGhlIGdpdmVuIGFycmF5LCB3aXRoIEpTT04gcHJlZmVycmVkOyBpLmUuIHJldHVybiBKU09OIGlmIGluY2x1ZGVkLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBmaXJzdC5cclxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBjb250ZW50VHlwZXNcclxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgY2hvc2VuIGNvbnRlbnQgdHlwZSwgcHJlZmVycmluZyBKU09OLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLmpzb25QcmVmZXJyZWRNaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGVzKSB7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnRlbnRUeXBlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAodGhpcy5pc0pzb25NaW1lKGNvbnRlbnRUeXBlc1tpXSkpIHtcclxuICAgICAgICByZXR1cm4gY29udGVudFR5cGVzW2ldO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29udGVudFR5cGVzWzBdO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBwYXJhbWV0ZXIgdmFsdWUgcmVwcmVzZW50cyBmaWxlLWxpa2UgY29udGVudC5cclxuICAgKiBAcGFyYW0gcGFyYW0gVGhlIHBhcmFtZXRlciB0byBjaGVjay5cclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgPGNvZGU+cGFyYW08L2NvZGU+IHJlcHJlc2VudHMgYSBmaWxlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLmlzRmlsZVBhcmFtID0gZnVuY3Rpb24ocGFyYW0pIHtcclxuICAgIC8vIGZzLlJlYWRTdHJlYW0gaW4gTm9kZS5qcyBhbmQgRWxlY3Ryb24gKGJ1dCBub3QgaW4gcnVudGltZSBsaWtlIGJyb3dzZXJpZnkpXHJcbiAgICBpZiAodHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgdmFyIGZzO1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7fVxyXG4gICAgICBpZiAoZnMgJiYgZnMuUmVhZFN0cmVhbSAmJiBwYXJhbSBpbnN0YW5jZW9mIGZzLlJlYWRTdHJlYW0pIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gQnVmZmVyIGluIE5vZGUuanNcclxuICAgIGlmICh0eXBlb2YgQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIHBhcmFtIGluc3RhbmNlb2YgQnVmZmVyKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgLy8gQmxvYiBpbiBicm93c2VyXHJcbiAgICBpZiAodHlwZW9mIEJsb2IgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCbG9iKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgLy8gRmlsZSBpbiBicm93c2VyIChpdCBzZWVtcyBGaWxlIG9iamVjdCBpcyBhbHNvIGluc3RhbmNlIG9mIEJsb2IsIGJ1dCBrZWVwIHRoaXMgZm9yIHNhZmUpXHJcbiAgICBpZiAodHlwZW9mIEZpbGUgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBGaWxlKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIE5vcm1hbGl6ZXMgcGFyYW1ldGVyIHZhbHVlczpcclxuICAgKiA8dWw+XHJcbiAgICogPGxpPnJlbW92ZSBuaWxzPC9saT5cclxuICAgKiA8bGk+a2VlcCBmaWxlcyBhbmQgYXJyYXlzPC9saT5cclxuICAgKiA8bGk+Zm9ybWF0IHRvIHN0cmluZyB3aXRoIGBwYXJhbVRvU3RyaW5nYCBmb3Igb3RoZXIgY2FzZXM8L2xpPlxyXG4gICAqIDwvdWw+XHJcbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gcGFyYW1zIFRoZSBwYXJhbWV0ZXJzIGFzIG9iamVjdCBwcm9wZXJ0aWVzLlxyXG4gICAqIEByZXR1cm5zIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gbm9ybWFsaXplZCBwYXJhbWV0ZXJzLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLm5vcm1hbGl6ZVBhcmFtcyA9IGZ1bmN0aW9uKHBhcmFtcykge1xyXG4gICAgdmFyIG5ld1BhcmFtcyA9IHt9O1xyXG4gICAgZm9yICh2YXIga2V5IGluIHBhcmFtcykge1xyXG4gICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KGtleSkgJiYgcGFyYW1zW2tleV0gIT0gdW5kZWZpbmVkICYmIHBhcmFtc1trZXldICE9IG51bGwpIHtcclxuICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbXNba2V5XTtcclxuICAgICAgICBpZiAodGhpcy5pc0ZpbGVQYXJhbSh2YWx1ZSkgfHwgQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAgIG5ld1BhcmFtc1trZXldID0gdmFsdWU7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIG5ld1BhcmFtc1trZXldID0gdGhpcy5wYXJhbVRvU3RyaW5nKHZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBuZXdQYXJhbXM7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogRW51bWVyYXRpb24gb2YgY29sbGVjdGlvbiBmb3JtYXQgc2VwYXJhdG9yIHN0cmF0ZWdpZXMuXHJcbiAgICogQGVudW0ge1N0cmluZ31cclxuICAgKiBAcmVhZG9ubHlcclxuICAgKi9cclxuICBleHBvcnRzLkNvbGxlY3Rpb25Gb3JtYXRFbnVtID0ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBDb21tYS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+Y3N2PC9jb2RlPlxyXG4gICAgICogQGNvbnN0XHJcbiAgICAgKi9cclxuICAgIENTVjogJywnLFxyXG4gICAgLyoqXHJcbiAgICAgKiBTcGFjZS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+c3N2PC9jb2RlPlxyXG4gICAgICogQGNvbnN0XHJcbiAgICAgKi9cclxuICAgIFNTVjogJyAnLFxyXG4gICAgLyoqXHJcbiAgICAgKiBUYWItc2VwYXJhdGVkIHZhbHVlcy4gVmFsdWU6IDxjb2RlPnRzdjwvY29kZT5cclxuICAgICAqIEBjb25zdFxyXG4gICAgICovXHJcbiAgICBUU1Y6ICdcXHQnLFxyXG4gICAgLyoqXHJcbiAgICAgKiBQaXBlKHwpLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5waXBlczwvY29kZT5cclxuICAgICAqIEBjb25zdFxyXG4gICAgICovXHJcbiAgICBQSVBFUzogJ3wnLFxyXG4gICAgLyoqXHJcbiAgICAgKiBOYXRpdmUgYXJyYXkuIFZhbHVlOiA8Y29kZT5tdWx0aTwvY29kZT5cclxuICAgICAqIEBjb25zdFxyXG4gICAgICovXHJcbiAgICBNVUxUSTogJ211bHRpJ1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEJ1aWxkcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBhcnJheS10eXBlIGFjdHVhbCBwYXJhbWV0ZXIsIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gY29sbGVjdGlvbiBmb3JtYXQuXHJcbiAgICogQHBhcmFtIHtBcnJheX0gcGFyYW0gQW4gYXJyYXkgcGFyYW1ldGVyLlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudC5Db2xsZWN0aW9uRm9ybWF0RW51bX0gY29sbGVjdGlvbkZvcm1hdCBUaGUgYXJyYXkgZWxlbWVudCBzZXBhcmF0b3Igc3RyYXRlZ3kuXHJcbiAgICogQHJldHVybnMge1N0cmluZ3xBcnJheX0gQSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHN1cHBsaWVkIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBzcGVjaWZpZWQgZGVsaW1pdGVyLiBSZXR1cm5zXHJcbiAgICogPGNvZGU+cGFyYW08L2NvZGU+IGFzIGlzIGlmIDxjb2RlPmNvbGxlY3Rpb25Gb3JtYXQ8L2NvZGU+IGlzIDxjb2RlPm11bHRpPC9jb2RlPi5cclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZS5idWlsZENvbGxlY3Rpb25QYXJhbSA9IGZ1bmN0aW9uIGJ1aWxkQ29sbGVjdGlvblBhcmFtKHBhcmFtLCBjb2xsZWN0aW9uRm9ybWF0KSB7XHJcbiAgICBpZiAocGFyYW0gPT0gbnVsbCkge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIHN3aXRjaCAoY29sbGVjdGlvbkZvcm1hdCkge1xyXG4gICAgICBjYXNlICdjc3YnOlxyXG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCcsJyk7XHJcbiAgICAgIGNhc2UgJ3Nzdic6XHJcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpLmpvaW4oJyAnKTtcclxuICAgICAgY2FzZSAndHN2JzpcclxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignXFx0Jyk7XHJcbiAgICAgIGNhc2UgJ3BpcGVzJzpcclxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignfCcpO1xyXG4gICAgICBjYXNlICdtdWx0aSc6XHJcbiAgICAgICAgLy8gcmV0dXJuIHRoZSBhcnJheSBkaXJlY3RseSBhcyBTdXBlckFnZW50IHdpbGwgaGFuZGxlIGl0IGFzIGV4cGVjdGVkXHJcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBjb2xsZWN0aW9uIGZvcm1hdDogJyArIGNvbGxlY3Rpb25Gb3JtYXQpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEFwcGxpZXMgYXV0aGVudGljYXRpb24gaGVhZGVycyB0byB0aGUgcmVxdWVzdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVxdWVzdCBUaGUgcmVxdWVzdCBvYmplY3QgY3JlYXRlZCBieSBhIDxjb2RlPnN1cGVyYWdlbnQoKTwvY29kZT4gY2FsbC5cclxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBhdXRoTmFtZXMgQW4gYXJyYXkgb2YgYXV0aGVudGljYXRpb24gbWV0aG9kIG5hbWVzLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLmFwcGx5QXV0aFRvUmVxdWVzdCA9IGZ1bmN0aW9uKHJlcXVlc3QsIGF1dGhOYW1lcykge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgIGF1dGhOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uKGF1dGhOYW1lKSB7XHJcbiAgICAgIHZhciBhdXRoID0gX3RoaXMuYXV0aGVudGljYXRpb25zW2F1dGhOYW1lXTtcclxuICAgICAgc3dpdGNoIChhdXRoLnR5cGUpIHtcclxuICAgICAgICBjYXNlICdiYXNpYyc6XHJcbiAgICAgICAgICBpZiAoYXV0aC51c2VybmFtZSB8fCBhdXRoLnBhc3N3b3JkKSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3QuYXV0aChhdXRoLnVzZXJuYW1lIHx8ICcnLCBhdXRoLnBhc3N3b3JkIHx8ICcnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgJ2FwaUtleSc6XHJcbiAgICAgICAgICBpZiAoYXV0aC5hcGlLZXkpIHtcclxuICAgICAgICAgICAgdmFyIGRhdGEgPSB7fTtcclxuICAgICAgICAgICAgaWYgKGF1dGguYXBpS2V5UHJlZml4KSB7XHJcbiAgICAgICAgICAgICAgZGF0YVthdXRoLm5hbWVdID0gYXV0aC5hcGlLZXlQcmVmaXggKyAnICcgKyBhdXRoLmFwaUtleTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBkYXRhW2F1dGgubmFtZV0gPSBhdXRoLmFwaUtleTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYXV0aFsnaW4nXSA9PT0gJ2hlYWRlcicpIHtcclxuICAgICAgICAgICAgICByZXF1ZXN0LnNldChkYXRhKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZXF1ZXN0LnF1ZXJ5KGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlICdvYXV0aDInOlxyXG4gICAgICAgICAgaWYgKGF1dGguYWNjZXNzVG9rZW4pIHtcclxuICAgICAgICAgICAgcmVxdWVzdC5zZXQoeydBdXRob3JpemF0aW9uJzogJ0JlYXJlciAnICsgYXV0aC5hY2Nlc3NUb2tlbn0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBhdXRoZW50aWNhdGlvbiB0eXBlOiAnICsgYXV0aC50eXBlKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogRGVzZXJpYWxpemVzIGFuIEhUVFAgcmVzcG9uc2UgYm9keSBpbnRvIGEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSBBIFN1cGVyQWdlbnQgcmVzcG9uc2Ugb2JqZWN0LlxyXG4gICAqIEBwYXJhbSB7KFN0cmluZ3xBcnJheS48U3RyaW5nPnxPYmplY3QuPFN0cmluZywgT2JqZWN0PnxGdW5jdGlvbil9IHJldHVyblR5cGUgVGhlIHR5cGUgdG8gcmV0dXJuLiBQYXNzIGEgc3RyaW5nIGZvciBzaW1wbGUgdHlwZXNcclxuICAgKiBvciB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIGEgY29tcGxleCB0eXBlLiBQYXNzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHR5cGUgbmFtZSB0byByZXR1cm4gYW4gYXJyYXkgb2YgdGhhdCB0eXBlLiBUb1xyXG4gICAqIHJldHVybiBhbiBvYmplY3QsIHBhc3MgYW4gb2JqZWN0IHdpdGggb25lIHByb3BlcnR5IHdob3NlIG5hbWUgaXMgdGhlIGtleSB0eXBlIGFuZCB3aG9zZSB2YWx1ZSBpcyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZSB0eXBlOlxyXG4gICAqIGFsbCBwcm9wZXJ0aWVzIG9uIDxjb2RlPmRhdGE8Y29kZT4gd2lsbCBiZSBjb252ZXJ0ZWQgdG8gdGhpcyB0eXBlLlxyXG4gICAqIEByZXR1cm5zIEEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLmRlc2VyaWFsaXplID0gZnVuY3Rpb24gZGVzZXJpYWxpemUocmVzcG9uc2UsIHJldHVyblR5cGUpIHtcclxuICAgIGlmIChyZXNwb25zZSA9PSBudWxsIHx8IHJldHVyblR5cGUgPT0gbnVsbCB8fCByZXNwb25zZS5zdGF0dXMgPT0gMjA0KSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgLy8gUmVseSBvbiBTdXBlckFnZW50IGZvciBwYXJzaW5nIHJlc3BvbnNlIGJvZHkuXHJcbiAgICAvLyBTZWUgaHR0cDovL3Zpc2lvbm1lZGlhLmdpdGh1Yi5pby9zdXBlcmFnZW50LyNwYXJzaW5nLXJlc3BvbnNlLWJvZGllc1xyXG4gICAgdmFyIGRhdGEgPSByZXNwb25zZS5ib2R5O1xyXG4gICAgaWYgKGRhdGEgPT0gbnVsbCB8fCAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIHR5cGVvZiBkYXRhLmxlbmd0aCA9PT0gJ3VuZGVmaW5lZCcgJiYgIU9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCkpIHtcclxuICAgICAgLy8gU3VwZXJBZ2VudCBkb2VzIG5vdCBhbHdheXMgcHJvZHVjZSBhIGJvZHk7IHVzZSB0aGUgdW5wYXJzZWQgcmVzcG9uc2UgYXMgYSBmYWxsYmFja1xyXG4gICAgICBkYXRhID0gcmVzcG9uc2UudGV4dDtcclxuICAgIH1cclxuICAgIHJldHVybiBleHBvcnRzLmNvbnZlcnRUb1R5cGUoZGF0YSwgcmV0dXJuVHlwZSk7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24uXHJcbiAgICogQGNhbGxiYWNrIG1vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgKiBAcGFyYW0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogSW52b2tlcyB0aGUgUkVTVCBzZXJ2aWNlIHVzaW5nIHRoZSBzdXBwbGllZCBzZXR0aW5ncyBhbmQgcGFyYW1ldGVycy5cclxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgYmFzZSBVUkwgdG8gaW52b2tlLlxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodHRwTWV0aG9kIFRoZSBIVFRQIG1ldGhvZCB0byB1c2UuXHJcbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgU3RyaW5nPn0gcGF0aFBhcmFtcyBBIG1hcCBvZiBwYXRoIHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cclxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBxdWVyeVBhcmFtcyBBIG1hcCBvZiBxdWVyeSBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXHJcbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gY29sbGVjdGlvblF1ZXJ5UGFyYW1zIEEgbWFwIG9mIGNvbGxlY3Rpb24gcXVlcnkgcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IGhlYWRlclBhcmFtcyBBIG1hcCBvZiBoZWFkZXIgcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IGZvcm1QYXJhbXMgQSBtYXAgb2YgZm9ybSBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGJvZHlQYXJhbSBUaGUgdmFsdWUgdG8gcGFzcyBhcyB0aGUgcmVxdWVzdCBib2R5LlxyXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGF1dGhOYW1lcyBBbiBhcnJheSBvZiBhdXRoZW50aWNhdGlvbiB0eXBlIG5hbWVzLlxyXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGNvbnRlbnRUeXBlcyBBbiBhcnJheSBvZiByZXF1ZXN0IE1JTUUgdHlwZXMuXHJcbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYWNjZXB0cyBBbiBhcnJheSBvZiBhY2NlcHRhYmxlIHJlc3BvbnNlIE1JTUUgdHlwZXMuXHJcbiAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5fE9iamVjdEZ1bmN0aW9uKX0gcmV0dXJuVHlwZSBUaGUgcmVxdWlyZWQgdHlwZSB0byByZXR1cm47IGNhbiBiZSBhIHN0cmluZyBmb3Igc2ltcGxlIHR5cGVzIG9yIHRoZVxyXG4gICAqIGNvbnN0cnVjdG9yIGZvciBhIGNvbXBsZXggdHlwZS5cclxuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24uXHJcbiAgICogQHJldHVybnMge09iamVjdH0gVGhlIFN1cGVyQWdlbnQgcmVxdWVzdCBvYmplY3QuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUuY2FsbEFwaSA9IGZ1bmN0aW9uIGNhbGxBcGkocGF0aCwgaHR0cE1ldGhvZCwgcGF0aFBhcmFtcyxcclxuICAgICAgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBib2R5UGFyYW0sIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLFxyXG4gICAgICByZXR1cm5UeXBlLCBjYWxsYmFjaykge1xyXG5cclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB2YXIgdXJsID0gdGhpcy5idWlsZFVybChwYXRoLCBwYXRoUGFyYW1zKTtcclxuICAgIHZhciByZXF1ZXN0ID0gc3VwZXJhZ2VudChodHRwTWV0aG9kLCB1cmwpO1xyXG5cclxuICAgIC8vIGFwcGx5IGF1dGhlbnRpY2F0aW9uc1xyXG4gICAgdGhpcy5hcHBseUF1dGhUb1JlcXVlc3QocmVxdWVzdCwgYXV0aE5hbWVzKTtcclxuXHJcbiAgICAvLyBzZXQgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzXHJcbiAgICBmb3IgKHZhciBrZXkgaW4gY29sbGVjdGlvblF1ZXJ5UGFyYW1zKSB7XHJcbiAgICAgIGlmIChjb2xsZWN0aW9uUXVlcnlQYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgIHZhciBwYXJhbSA9IGNvbGxlY3Rpb25RdWVyeVBhcmFtc1trZXldO1xyXG4gICAgICAgIGlmIChwYXJhbS5jb2xsZWN0aW9uRm9ybWF0ID09PSAnY3N2Jykge1xyXG4gICAgICAgICAgLy8gU3VwZXJBZ2VudCBub3JtYWxseSBwZXJjZW50LWVuY29kZXMgYWxsIHJlc2VydmVkIGNoYXJhY3RlcnMgaW4gYSBxdWVyeSBwYXJhbWV0ZXIuIEhvd2V2ZXIsXHJcbiAgICAgICAgICAvLyBjb21tYXMgYXJlIHVzZWQgYXMgZGVsaW1pdGVycyBmb3IgdGhlICdjc3YnIGNvbGxlY3Rpb25Gb3JtYXQgc28gdGhleSBtdXN0IG5vdCBiZSBlbmNvZGVkLiBXZVxyXG4gICAgICAgICAgLy8gbXVzdCB0aGVyZWZvcmUgY29uc3RydWN0IGFuZCBlbmNvZGUgJ2NzdicgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzIG1hbnVhbGx5LlxyXG4gICAgICAgICAgaWYgKHBhcmFtLnZhbHVlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdmFyIHZhbHVlID0gcGFyYW0udmFsdWUubWFwKHRoaXMucGFyYW1Ub1N0cmluZykubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbignLCcpO1xyXG4gICAgICAgICAgICByZXF1ZXN0LnF1ZXJ5KGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCIgKyB2YWx1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIEFsbCBvdGhlciBjb2xsZWN0aW9uIHF1ZXJ5IHBhcmFtZXRlcnMgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb3JkaW5hcnkgcXVlcnkgcGFyYW1ldGVycy5cclxuICAgICAgICAgIHF1ZXJ5UGFyYW1zW2tleV0gPSB0aGlzLmJ1aWxkQ29sbGVjdGlvblBhcmFtKHBhcmFtLnZhbHVlLCBwYXJhbS5jb2xsZWN0aW9uRm9ybWF0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBzZXQgcXVlcnkgcGFyYW1ldGVyc1xyXG4gICAgaWYgKGh0dHBNZXRob2QudG9VcHBlckNhc2UoKSA9PT0gJ0dFVCcgJiYgdGhpcy5jYWNoZSA9PT0gZmFsc2UpIHtcclxuICAgICAgICBxdWVyeVBhcmFtc1snXyddID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICB9XHJcbiAgICByZXF1ZXN0LnF1ZXJ5KHRoaXMubm9ybWFsaXplUGFyYW1zKHF1ZXJ5UGFyYW1zKSk7XHJcblxyXG4gICAgLy8gc2V0IGhlYWRlciBwYXJhbWV0ZXJzXHJcbiAgICByZXF1ZXN0LnNldCh0aGlzLmRlZmF1bHRIZWFkZXJzKS5zZXQodGhpcy5ub3JtYWxpemVQYXJhbXMoaGVhZGVyUGFyYW1zKSk7XHJcblxyXG5cclxuICAgIC8vIHNldCByZXF1ZXN0QWdlbnQgaWYgaXQgaXMgc2V0IGJ5IHVzZXJcclxuICAgIGlmICh0aGlzLnJlcXVlc3RBZ2VudCkge1xyXG4gICAgICByZXF1ZXN0LmFnZW50KHRoaXMucmVxdWVzdEFnZW50KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBzZXQgcmVxdWVzdCB0aW1lb3V0XHJcbiAgICByZXF1ZXN0LnRpbWVvdXQodGhpcy50aW1lb3V0KTtcclxuXHJcbiAgICB2YXIgY29udGVudFR5cGUgPSB0aGlzLmpzb25QcmVmZXJyZWRNaW1lKGNvbnRlbnRUeXBlcyk7XHJcbiAgICBpZiAoY29udGVudFR5cGUpIHtcclxuICAgICAgLy8gSXNzdWUgd2l0aCBzdXBlcmFnZW50IGFuZCBtdWx0aXBhcnQvZm9ybS1kYXRhIChodHRwczovL2dpdGh1Yi5jb20vdmlzaW9ubWVkaWEvc3VwZXJhZ2VudC9pc3N1ZXMvNzQ2KVxyXG4gICAgICBpZihjb250ZW50VHlwZSAhPSAnbXVsdGlwYXJ0L2Zvcm0tZGF0YScpIHtcclxuICAgICAgICByZXF1ZXN0LnR5cGUoY29udGVudFR5cGUpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKCFyZXF1ZXN0LmhlYWRlclsnQ29udGVudC1UeXBlJ10pIHtcclxuICAgICAgcmVxdWVzdC50eXBlKCdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGNvbnRlbnRUeXBlID09PSAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykge1xyXG4gICAgICByZXF1ZXN0LnNlbmQocXVlcnlzdHJpbmcuc3RyaW5naWZ5KHRoaXMubm9ybWFsaXplUGFyYW1zKGZvcm1QYXJhbXMpKSk7XHJcbiAgICB9IGVsc2UgaWYgKGNvbnRlbnRUeXBlID09ICdtdWx0aXBhcnQvZm9ybS1kYXRhJykge1xyXG4gICAgICB2YXIgX2Zvcm1QYXJhbXMgPSB0aGlzLm5vcm1hbGl6ZVBhcmFtcyhmb3JtUGFyYW1zKTtcclxuICAgICAgZm9yICh2YXIga2V5IGluIF9mb3JtUGFyYW1zKSB7XHJcbiAgICAgICAgaWYgKF9mb3JtUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmlzRmlsZVBhcmFtKF9mb3JtUGFyYW1zW2tleV0pKSB7XHJcbiAgICAgICAgICAgIC8vIGZpbGUgZmllbGRcclxuICAgICAgICAgICAgcmVxdWVzdC5hdHRhY2goa2V5LCBfZm9ybVBhcmFtc1trZXldKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlcXVlc3QuZmllbGQoa2V5LCBfZm9ybVBhcmFtc1trZXldKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoYm9keVBhcmFtKSB7XHJcbiAgICAgIHJlcXVlc3Quc2VuZChib2R5UGFyYW0pO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBhY2NlcHQgPSB0aGlzLmpzb25QcmVmZXJyZWRNaW1lKGFjY2VwdHMpO1xyXG4gICAgaWYgKGFjY2VwdCkge1xyXG4gICAgICByZXF1ZXN0LmFjY2VwdChhY2NlcHQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXR1cm5UeXBlID09PSAnQmxvYicpIHtcclxuICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUoJ2Jsb2InKTtcclxuICAgIH0gZWxzZSBpZiAocmV0dXJuVHlwZSA9PT0gJ1N0cmluZycpIHtcclxuICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUoJ3N0cmluZycpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEF0dGFjaCBwcmV2aW91c2x5IHNhdmVkIGNvb2tpZXMsIGlmIGVuYWJsZWRcclxuICAgIGlmICh0aGlzLmVuYWJsZUNvb2tpZXMpe1xyXG4gICAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICB0aGlzLmFnZW50LmF0dGFjaENvb2tpZXMocmVxdWVzdCk7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgcmVxdWVzdC53aXRoQ3JlZGVudGlhbHMoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICByZXF1ZXN0LmVuZChmdW5jdGlvbihlcnJvciwgcmVzcG9uc2UpIHtcclxuICAgICAgaWYgKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgdmFyIGRhdGEgPSBudWxsO1xyXG4gICAgICAgIGlmICghZXJyb3IpIHtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGRhdGEgPSBfdGhpcy5kZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSk7XHJcbiAgICAgICAgICAgIGlmIChfdGhpcy5lbmFibGVDb29raWVzICYmIHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKXtcclxuICAgICAgICAgICAgICBfdGhpcy5hZ2VudC5zYXZlQ29va2llcyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICBlcnJvciA9IGVycjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHJlcXVlc3Q7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogUGFyc2VzIGFuIElTTy04NjAxIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhIGRhdGUgdmFsdWUuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgZGF0ZSB2YWx1ZSBhcyBhIHN0cmluZy5cclxuICAgKiBAcmV0dXJucyB7RGF0ZX0gVGhlIHBhcnNlZCBkYXRlIG9iamVjdC5cclxuICAgKi9cclxuICBleHBvcnRzLnBhcnNlRGF0ZSA9IGZ1bmN0aW9uKHN0cikge1xyXG4gICAgcmV0dXJuIG5ldyBEYXRlKHN0ci5yZXBsYWNlKC9UL2ksICcgJykpO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnZlcnRzIGEgdmFsdWUgdG8gdGhlIHNwZWNpZmllZCB0eXBlLlxyXG4gICAqIEBwYXJhbSB7KFN0cmluZ3xPYmplY3QpfSBkYXRhIFRoZSBkYXRhIHRvIGNvbnZlcnQsIGFzIGEgc3RyaW5nIG9yIG9iamVjdC5cclxuICAgKiBAcGFyYW0geyhTdHJpbmd8QXJyYXkuPFN0cmluZz58T2JqZWN0LjxTdHJpbmcsIE9iamVjdD58RnVuY3Rpb24pfSB0eXBlIFRoZSB0eXBlIHRvIHJldHVybi4gUGFzcyBhIHN0cmluZyBmb3Igc2ltcGxlIHR5cGVzXHJcbiAgICogb3IgdGhlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBhIGNvbXBsZXggdHlwZS4gUGFzcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSB0eXBlIG5hbWUgdG8gcmV0dXJuIGFuIGFycmF5IG9mIHRoYXQgdHlwZS4gVG9cclxuICAgKiByZXR1cm4gYW4gb2JqZWN0LCBwYXNzIGFuIG9iamVjdCB3aXRoIG9uZSBwcm9wZXJ0eSB3aG9zZSBuYW1lIGlzIHRoZSBrZXkgdHlwZSBhbmQgd2hvc2UgdmFsdWUgaXMgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWUgdHlwZTpcclxuICAgKiBhbGwgcHJvcGVydGllcyBvbiA8Y29kZT5kYXRhPGNvZGU+IHdpbGwgYmUgY29udmVydGVkIHRvIHRoaXMgdHlwZS5cclxuICAgKiBAcmV0dXJucyBBbiBpbnN0YW5jZSBvZiB0aGUgc3BlY2lmaWVkIHR5cGUgb3IgbnVsbCBvciB1bmRlZmluZWQgaWYgZGF0YSBpcyBudWxsIG9yIHVuZGVmaW5lZC5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnZlcnRUb1R5cGUgPSBmdW5jdGlvbihkYXRhLCB0eXBlKSB7XHJcbiAgICBpZiAoZGF0YSA9PT0gbnVsbCB8fCBkYXRhID09PSB1bmRlZmluZWQpXHJcbiAgICAgIHJldHVybiBkYXRhXHJcblxyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgIGNhc2UgJ0Jvb2xlYW4nOlxyXG4gICAgICAgIHJldHVybiBCb29sZWFuKGRhdGEpO1xyXG4gICAgICBjYXNlICdJbnRlZ2VyJzpcclxuICAgICAgICByZXR1cm4gcGFyc2VJbnQoZGF0YSwgMTApO1xyXG4gICAgICBjYXNlICdOdW1iZXInOlxyXG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KGRhdGEpO1xyXG4gICAgICBjYXNlICdTdHJpbmcnOlxyXG4gICAgICAgIHJldHVybiBTdHJpbmcoZGF0YSk7XHJcbiAgICAgIGNhc2UgJ0RhdGUnOlxyXG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlRGF0ZShTdHJpbmcoZGF0YSkpO1xyXG4gICAgICBjYXNlICdCbG9iJzpcclxuICAgICAgXHRyZXR1cm4gZGF0YTtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBpZiAodHlwZSA9PT0gT2JqZWN0KSB7XHJcbiAgICAgICAgICAvLyBnZW5lcmljIG9iamVjdCwgcmV0dXJuIGRpcmVjdGx5XHJcbiAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAvLyBmb3IgbW9kZWwgdHlwZSBsaWtlOiBVc2VyXHJcbiAgICAgICAgICByZXR1cm4gdHlwZS5jb25zdHJ1Y3RGcm9tT2JqZWN0KGRhdGEpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0eXBlKSkge1xyXG4gICAgICAgICAgLy8gZm9yIGFycmF5IHR5cGUgbGlrZTogWydTdHJpbmcnXVxyXG4gICAgICAgICAgdmFyIGl0ZW1UeXBlID0gdHlwZVswXTtcclxuICAgICAgICAgIHJldHVybiBkYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBleHBvcnRzLmNvbnZlcnRUb1R5cGUoaXRlbSwgaXRlbVR5cGUpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgIC8vIGZvciBwbGFpbiBvYmplY3QgdHlwZSBsaWtlOiB7J1N0cmluZyc6ICdJbnRlZ2VyJ31cclxuICAgICAgICAgIHZhciBrZXlUeXBlLCB2YWx1ZVR5cGU7XHJcbiAgICAgICAgICBmb3IgKHZhciBrIGluIHR5cGUpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGUuaGFzT3duUHJvcGVydHkoaykpIHtcclxuICAgICAgICAgICAgICBrZXlUeXBlID0gaztcclxuICAgICAgICAgICAgICB2YWx1ZVR5cGUgPSB0eXBlW2tdO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2YXIgcmVzdWx0ID0ge307XHJcbiAgICAgICAgICBmb3IgKHZhciBrIGluIGRhdGEpIHtcclxuICAgICAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaykpIHtcclxuICAgICAgICAgICAgICB2YXIga2V5ID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGssIGtleVR5cGUpO1xyXG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2tdLCB2YWx1ZVR5cGUpO1xyXG4gICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIGZvciB1bmtub3duIHR5cGUsIHJldHVybiB0aGUgZGF0YSBkaXJlY3RseVxyXG4gICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgbWFwIG9yIGFycmF5IG1vZGVsIGZyb20gUkVTVCBkYXRhLlxyXG4gICAqIEBwYXJhbSBkYXRhIHtPYmplY3R8QXJyYXl9IFRoZSBSRVNUIGRhdGEuXHJcbiAgICogQHBhcmFtIG9iaiB7T2JqZWN0fEFycmF5fSBUaGUgdGFyZ2V0IG9iamVjdCBvciBhcnJheS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmosIGl0ZW1UeXBlKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShpKSlcclxuICAgICAgICAgIG9ialtpXSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2ldLCBpdGVtVHlwZSk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGZvciAodmFyIGsgaW4gZGF0YSkge1xyXG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGspKVxyXG4gICAgICAgICAgb2JqW2tdID0gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGFba10sIGl0ZW1UeXBlKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBkZWZhdWx0IEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24uXHJcbiAgICogQHR5cGUge21vZHVsZTpBcGlDbGllbnR9XHJcbiAgICovXHJcbiAgZXhwb3J0cy5pbnN0YW5jZSA9IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1BhcmFtZXRlckxpc3QnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL1BhcmFtZXRlckxpc3QnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5CdWlsZEFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5QYXJhbWV0ZXJMaXN0KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBQYXJhbWV0ZXJMaXN0KSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvKipcclxuICAgKiBCdWlsZCBzZXJ2aWNlLlxyXG4gICAqIEBtb2R1bGUgYXBpL0J1aWxkQXBpXHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyBCdWlsZEFwaS4gXHJcbiAgICogQGFsaWFzIG1vZHVsZTphcGkvQnVpbGRBcGlcclxuICAgKiBAY2xhc3NcclxuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxyXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XHJcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBidWlsZEFOTiBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9CdWlsZEFwaX5idWlsZEFOTkNhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHBhc3NlcyBhbGwgbGVhcm5pbmcgYW5kIEFOTiBwYXJhbWV0ZXJzIHRvIHRoZSBzZXJ2ZXJcclxuICAgICAqIEluY2x1ZGVzIGxlYXJuaW5nIHBhcmFtZXRlcnMgYW5kIEFOTiB0b3BvbG9neVxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gaW5wdXRQYXJhbWV0ZXJzIG9iamVjdCB3aXRoIGFsbCB0dW5hYmxlIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9CdWlsZEFwaX5idWlsZEFOTkNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICovXHJcbiAgICB0aGlzLmJ1aWxkQU5OID0gZnVuY3Rpb24oaW5wdXRQYXJhbWV0ZXJzLCBjYWxsYmFjaykge1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBpbnB1dFBhcmFtZXRlcnM7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJzJyBpcyBzZXRcclxuICAgICAgaWYgKGlucHV0UGFyYW1ldGVycyA9PT0gdW5kZWZpbmVkIHx8IGlucHV0UGFyYW1ldGVycyA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJzJyB3aGVuIGNhbGxpbmcgYnVpbGRBTk5cIik7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2J1aWxkL2J1aWxkQU5OJywgJ1BPU1QnLFxyXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEFOTlBhcmFtZXRlciBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9CdWlsZEFwaX5nZXRBTk5QYXJhbWV0ZXJDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyB0aGUgcGFyYW1ldGVyIHNldCBvZiB0aGUgY3JlYXRlZCBBTk5cclxuICAgICAqIHJldHVybnMgYSBvYmplY3Qgb2YgdHlwZSBQYXJhbWV0ZXJMaXN0XHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+Z2V0QU5OUGFyYW1ldGVyQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZXRBTk5QYXJhbWV0ZXIgPSBmdW5jdGlvbihjYWxsYmFjaykge1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciByZXR1cm5UeXBlID0gUGFyYW1ldGVyTGlzdDtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvYnVpbGQvZ2V0QU5OUGFyYW1ldGVyJywgJ0dFVCcsXHJcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW5wdXRTaGFwZSBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9CdWlsZEFwaX5nZXRJbnB1dFNoYXBlQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5LjwnTnVtYmVyJz59IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyB0aGUgaW5wdXQgc2hhcGUgb2YgdGhlIHRyYWluIGRhdGFcclxuICAgICAqIHJldHVybnMgdGhlIGlucHV0IHNoYXBlIG9mIHRoZSB0cmFpbiBkYXRhXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBuYW1lIG9mIHRoZSBkYXRhc2V0IChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+Z2V0SW5wdXRTaGFwZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgQXJyYXkuPCdOdW1iZXInPn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZXRJbnB1dFNoYXBlID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcclxuICAgICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcclxuICAgICAgfTtcclxuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ051bWJlciddO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy9idWlsZC9nZXRJbnB1dFNoYXBlJywgJ0dFVCcsXHJcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZURhdGEnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL0ltYWdlRGF0YScpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxvYWRBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2VEYXRhKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZURhdGEpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIExvYWQgc2VydmljZS5cclxuICAgKiBAbW9kdWxlIGFwaS9Mb2FkQXBpXHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyBMb2FkQXBpLiBcclxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9Mb2FkQXBpXHJcbiAgICogQGNsYXNzXHJcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcclxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xyXG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0QXZhaWxhYmxlRGF0YVNldHMgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRBdmFpbGFibGVEYXRhU2V0c0NhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIHtBcnJheS48J1N0cmluZyc+fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIGdldCBhdmFpbGFibGUgZGF0YSBzZXRzXHJcbiAgICAgKiByZXR1cm5zIGEgbGlzdCBvZiBhdmFpbGFibGUgZGF0YSBzZXQgZmlsZXNcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEF2YWlsYWJsZURhdGFTZXRzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBBcnJheS48J1N0cmluZyc+fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldEF2YWlsYWJsZURhdGFTZXRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFsnU3RyaW5nJ107XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvZ2V0QXZhaWxhYmxlRGF0YVNldHMnLCAnR0VUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZUJhdGNoIG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VCYXRjaENhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2YgaW5wdXQvb3V0cHV0IGltYWdlc1xyXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmJhdGNoU2l6ZSBkZWZpbmVzIHRoZSBudW1iZXIgb2YgcmV0dXJuIGltYWdlcyAoZGVmYXVsdCB0byAxMDApXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxyXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQmF0Y2hDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0SW1hZ2VCYXRjaCA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgJ2JhdGNoX3NpemUnOiBvcHRzWydiYXRjaFNpemUnXSxcclxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxyXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXHJcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxyXG4gICAgICAgICdvdXRwdXQnOiBvcHRzWydvdXRwdXQnXSxcclxuICAgICAgfTtcclxuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvZ2V0SW1hZ2VCYXRjaCcsICdHRVQnLFxyXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEltYWdlQnlJZCBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQnlJZENhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgYSBzaW5nbGUgaW5wdXQvb3V0cHV0IGltYWdlXHJcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkIGRlZmluZXMgdGhlIGlkIG9mIHRoZSBpbWFnZXNcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuc29ydEJ5IGRlZmluZXMgdGhlIHNvcnRpbmcgb2YgdGhlIGlucHV0IGltYWdlc1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZmlsdGVyIHRoZSB2YWx1ZXMgd2hpY2ggc2hvdWxkIGJlIGZpbHRlcmVkICh3aGl0ZWxpc3QpXHJcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VCeUlkQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldEltYWdlQnlJZCA9IGZ1bmN0aW9uKGlkLCBvcHRzLCBjYWxsYmFjaykge1xyXG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpZCcgaXMgc2V0XHJcbiAgICAgIGlmIChpZCA9PT0gdW5kZWZpbmVkIHx8IGlkID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpZCcgd2hlbiBjYWxsaW5nIGdldEltYWdlQnlJZFwiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgJ2lkJzogaWQsXHJcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcclxuICAgICAgICAnc29ydF9ieSc6IG9wdHNbJ3NvcnRCeSddLFxyXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcclxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy9sb2FkL2dldEltYWdlQnlJZCcsICdHRVQnLFxyXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEltYWdlcyBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlc0NhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgaW5wdXQvb3V0cHV0IGltYWdlc1xyXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzdGFydElkeCBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXJcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBlbmRJZHggbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxyXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlc0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZXRJbWFnZXMgPSBmdW5jdGlvbihzdGFydElkeCwgZW5kSWR4LCBvcHRzLCBjYWxsYmFjaykge1xyXG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzdGFydElkeCcgaXMgc2V0XHJcbiAgICAgIGlmIChzdGFydElkeCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0SWR4ID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzdGFydElkeCcgd2hlbiBjYWxsaW5nIGdldEltYWdlc1wiKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2VuZElkeCcgaXMgc2V0XHJcbiAgICAgIGlmIChlbmRJZHggPT09IHVuZGVmaW5lZCB8fCBlbmRJZHggPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2VuZElkeCcgd2hlbiBjYWxsaW5nIGdldEltYWdlc1wiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgJ3N0YXJ0X2lkeCc6IHN0YXJ0SWR4LFxyXG4gICAgICAgICdlbmRfaWR4JzogZW5kSWR4LFxyXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXHJcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcclxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXHJcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvbG9hZC9nZXRJbWFnZXMnLCAnR0VUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWQgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWRDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGEgc2luZ2xlIGxhdGVudCByZXByZXNlbnRhdGlvbiBhcyAoKWxpc3Qgb2YpIHBuZyBpbWFnZXNcclxuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gaWQgZGVmaW5lcyB0aGUgaWQgb2YgdGhlIGltYWdlc1xyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWRDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0TGF0ZW50UmVwcmVzZW50YXRpb25CeUlkID0gZnVuY3Rpb24oaWQsIG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyBpcyBzZXRcclxuICAgICAgaWYgKGlkID09PSB1bmRlZmluZWQgfHwgaWQgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyB3aGVuIGNhbGxpbmcgZ2V0TGF0ZW50UmVwcmVzZW50YXRpb25CeUlkXCIpO1xyXG4gICAgICB9XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAnaWQnOiBpZCxcclxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvbG9hZC9nZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWQnLCAnR0VUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRMb2FkZWREYXRhU2V0cyBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldExvYWRlZERhdGFTZXRzQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge0FycmF5LjwnU3RyaW5nJz59IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogZ2V0IGxvYWRlZCBkYXRhIHNldHNcclxuICAgICAqIHJldHVybnMgYSBsaXN0IG9mIGxvYWRlZCBkYXRhIHNldHNcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldExvYWRlZERhdGFTZXRzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBBcnJheS48J1N0cmluZyc+fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldExvYWRlZERhdGFTZXRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFsnU3RyaW5nJ107XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvZ2V0TG9hZGVkRGF0YVNldHMnLCAnR0VUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRSYW5kb21JbWFnZXMgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIGlucHV0L291dHB1dCBpbWFnZXNcclxuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5iYXRjaFNpemUgZGVmaW5lcyB0aGUgbnVtYmVyIG9mIHJldHVybiBpbWFnZXMgKGRlZmF1bHQgdG8gMTAwKVxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcclxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0UmFuZG9tSW1hZ2VzID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcclxuICAgICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAnYmF0Y2hfc2l6ZSc6IG9wdHNbJ2JhdGNoU2l6ZSddLFxyXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXHJcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcclxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXHJcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvbG9hZC9nZXRSYW5kb21JbWFnZXMnLCAnR0VUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBsb2FkRmlsZSBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTG9hZCBhIHRyYWluL3Rlc3QgZGF0YSBmaWxlXHJcbiAgICAgKiBMb2FkIGEgZGF0YSBmaWxlIGluIGRpZmZlcmVudCBkYXRhIGZvcm1hdHNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlbmFtZSBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxyXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLnJlYWRMYWJlbHMgdHJ1ZSB0byByZWFkIGxhYmVscyAoZGVmYXVsdCB0byBmYWxzZSlcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFUeXBlIGRldGVybWluZXMgdGhlIGRhdGEgZm9ybWF0IG9mIHRoZSBpbnB1dCBmaWxlIChkZWZhdWx0IHRvIGF1dG8pXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5sb2FkRmlsZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICovXHJcbiAgICB0aGlzLmxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZW5hbWUsIG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2ZpbGVuYW1lJyBpcyBzZXRcclxuICAgICAgaWYgKGZpbGVuYW1lID09PSB1bmRlZmluZWQgfHwgZmlsZW5hbWUgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2ZpbGVuYW1lJyB3aGVuIGNhbGxpbmcgbG9hZEZpbGVcIik7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdmaWxlbmFtZSc6IGZpbGVuYW1lLFxyXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXHJcbiAgICAgICAgJ3JlYWRfbGFiZWxzJzogb3B0c1sncmVhZExhYmVscyddLFxyXG4gICAgICAgICdkYXRhX3R5cGUnOiBvcHRzWydkYXRhVHlwZSddLFxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvbG9hZEZpbGUnLCAnUE9TVCcsXHJcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgcmVzZXRBbGxCYXRjaEluZGljZXMgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5yZXNldEFsbEJhdGNoSW5kaWNlc0NhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlc2V0cyBhbGwgYmF0Y2ggaW5kaWNlcyBvZiBhbGwgaW1hZ2Ugc2V0c1xyXG4gICAgICogcmVzZXRzIGFsbCBiYXRjaCBpbmRpY2VzIG9mIGFsbCBpbWFnZSBzZXRzXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5yZXNldEFsbEJhdGNoSW5kaWNlc0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlc2V0QWxsQmF0Y2hJbmRpY2VzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvcmVzZXRBbGxCYXRjaEluZGljZXMnLCAnUE9TVCcsXHJcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgcmVzZXRCYXRjaEluZGV4IG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+cmVzZXRCYXRjaEluZGV4Q2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmVzZXRzIHRoZSBiYXRjaCBpbmRleCBvZiB0aGUgaW1hZ2Ugc2V0XHJcbiAgICAgKiByZXNldHMgdGhlIGJhdGNoIGluZGV4IG9mIHRoZSBpbWFnZSBzZXRcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxyXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCByZXNldCBvdXRwdXQgaW1hZ2UgYmF0Y2ggaW5kZXggaW5zdGVhZCBvZiBpbnB1dCBpbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5yZXNldEJhdGNoSW5kZXhDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNldEJhdGNoSW5kZXggPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xyXG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxyXG4gICAgICAgICdvdXRwdXQnOiBvcHRzWydvdXRwdXQnXSxcclxuICAgICAgfTtcclxuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy9sb2FkL3Jlc2V0QmF0Y2hJbmRleCcsICdQT1NUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSB1cGxvYWRGaWxlIG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+dXBsb2FkRmlsZUNhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHVwbG9hZHMgYSBkYXRhIGZpbGVcclxuICAgICAqIExvYWQgYSBkYXRhIGZpbGUgaW4gZGlmZmVyZW50IGRhdGEgZm9ybWF0c1xyXG4gICAgICogQHBhcmFtIHtGaWxlfSB1cGZpbGUgVGhlIGZpbGUgdG8gdXBsb2FkLlxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+dXBsb2FkRmlsZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICovXHJcbiAgICB0aGlzLnVwbG9hZEZpbGUgPSBmdW5jdGlvbih1cGZpbGUsIGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndXBmaWxlJyBpcyBzZXRcclxuICAgICAgaWYgKHVwZmlsZSA9PT0gdW5kZWZpbmVkIHx8IHVwZmlsZSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndXBmaWxlJyB3aGVuIGNhbGxpbmcgdXBsb2FkRmlsZVwiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICAgICd1cGZpbGUnOiB1cGZpbGVcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFtdO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvdXBsb2FkRmlsZScsICdQT1NUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluU3RhdHVzJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlByb2Nlc3NlZEltYWdlRGF0YSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5TdGF0dXMpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFByb2Nlc3NlZEltYWdlRGF0YSwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIFRyYWluIHNlcnZpY2UuXHJcbiAgICogQG1vZHVsZSBhcGkvVHJhaW5BcGlcclxuICAgKiBAdmVyc2lvbiAxLjIuMlxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFRyYWluQXBpLiBcclxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9UcmFpbkFwaVxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXHJcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcclxuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUcmFpbmluZyBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5jb250cm9sVHJhaW5pbmdDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHRyYWluaW5nXHJcbiAgICAgKiB1c2VzIGEgc3RyaW5nIGVudW1cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfSB0cmFpblN0YXR1cyBuZXcgc3RhdHVzIGZvciB0cmFpbmluZ1xyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldE5hbWUgZGV0ZXJtaW5lcyBkYXRhIHNldCBmb3IgdHJhaW5pbmdcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UcmFpbkFwaX5jb250cm9sVHJhaW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5jb250cm9sVHJhaW5pbmcgPSBmdW5jdGlvbih0cmFpblN0YXR1cywgb3B0cywgY2FsbGJhY2spIHtcclxuICAgICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyBpcyBzZXRcclxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyB3aGVuIGNhbGxpbmcgY29udHJvbFRyYWluaW5nXCIpO1xyXG4gICAgICB9XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAnZGF0YXNldE5hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3RyYWluL2NvbnRyb2xUcmFpbmluZycsICdQT1NUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRQcm9jZXNzZWRJbWFnZURhdGEgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHJhaW5BcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1RyYWluQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZXRQcm9jZXNzZWRJbWFnZURhdGEgPSBmdW5jdGlvbihzZXRTaXplLCBjYWxsYmFjaykge1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIGlzIHNldFxyXG4gICAgICBpZiAoc2V0U2l6ZSA9PT0gdW5kZWZpbmVkIHx8IHNldFNpemUgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFcIik7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdzZXRTaXplJzogc2V0U2l6ZSxcclxuICAgICAgfTtcclxuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBQcm9jZXNzZWRJbWFnZURhdGE7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3RyYWluL2dldFByb2Nlc3NlZEltYWdlRGF0YScsICdHRVQnLFxyXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2Ugb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHJhaW5BcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZUNhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIHNjYWxhciB0cmFpbiB2YXJpYWJsZXNcclxuICAgICAqIGFzIGxpc3Qgb2YgZGljdHNcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRUcmFpblBlcmZvcm1hbmNlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZXRUcmFpblBlcmZvcm1hbmNlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFRyYWluUGVyZm9ybWFuY2U7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3RyYWluL2dldFRyYWluUGVyZm9ybWFuY2UnLCAnR0VUJyxcclxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1BhcmFtZXRlckxpc3QnLCAnbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJywgJ21vZGVsL1RyYWluUGVyZm9ybWFuY2UnLCAnbW9kZWwvVHJhaW5TdGF0dXMnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL1BhcmFtZXRlckxpc3QnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJyksIHJlcXVpcmUoJy4uL21vZGVsL1RyYWluUGVyZm9ybWFuY2UnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5TdGF0dXMnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UdW5lQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBhcmFtZXRlckxpc3QsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlByb2Nlc3NlZEltYWdlRGF0YSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5TdGF0dXMpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBhcmFtZXRlckxpc3QsIFByb2Nlc3NlZEltYWdlRGF0YSwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIFR1bmUgc2VydmljZS5cclxuICAgKiBAbW9kdWxlIGFwaS9UdW5lQXBpXHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyBUdW5lQXBpLiBcclxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9UdW5lQXBpXHJcbiAgICogQGNsYXNzXHJcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcclxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xyXG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xyXG5cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGFwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbCBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+YXBwbHlTcGVjaWZpY1R1bmluZ0FzRGVmYXVsdE1vZGVsQ2FsbGJhY2tcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogc2V0cyBhIGdpdmVuIHR1bmVkIG1vZGVsIGFzIGRlZmF1bHQgbW9kZWxcclxuICAgICAgICogc2V0cyBhIGdpdmVuIHR1bmVkIG1vZGVsIGFzIGRlZmF1bHQgbW9kZWxcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIHR1bmVkIG1vZGVsXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmFwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICAgKi9cclxuICAgICAgdGhpcy5hcHBseVNwZWNpZmljVHVuaW5nQXNEZWZhdWx0TW9kZWwgPSBmdW5jdGlvbiAobW9kZWxJZCwgY2FsbGJhY2spIHtcclxuICAgICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIGlzIHNldFxyXG4gICAgICAgICAgaWYgKG1vZGVsSWQgPT09IHVuZGVmaW5lZCB8fCBtb2RlbElkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgYXBwbHlTcGVjaWZpY1R1bmluZ0FzRGVmYXVsdE1vZGVsXCIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xyXG5cclxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgICAgICAgJy90dW5lL2FwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbCcsICdQT1NUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgYnVpbGRHcmlkU2VhcmNoQU5OIG9wZXJhdGlvbi5cclxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5idWlsZEdyaWRTZWFyY2hBTk5DYWxsYmFja1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICAgKi9cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBwYXNzZXMgYWxsIGxlYXJuaW5nIGFuZCBBTk4gcGFyYW1ldGVycyB0byB0aGUgc2VydmVyXHJcbiAgICAgICAqIEluY2x1ZGVzIGxlYXJuaW5nIHBhcmFtZXRlcnMgYW5kIEFOTiB0b3BvbG9neSBhcyBsaXN0c1xyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBpbnB1dFBhcmFtZXRlckxpc3RzIG9iamVjdCB3aXRoIGFsbCB0dW5hYmxlIHBhcmFtZXRlciBsaXN0c1xyXG4gICAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5kZWxldGVQcmV2aW91c01vZGVscyBpZiB0cnVlIGRlbGV0ZSBhbGwgcHJldmlvdXMgdHVuZWQgbW9kZWxzIChkZWZhdWx0IHRvIGZhbHNlKVxyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5idWlsZEdyaWRTZWFyY2hBTk5DYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuYnVpbGRHcmlkU2VhcmNoQU5OID0gZnVuY3Rpb24gKGlucHV0UGFyYW1ldGVyTGlzdHMsIG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgICAgIHZhciBwb3N0Qm9keSA9IGlucHV0UGFyYW1ldGVyTGlzdHM7XHJcblxyXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVyTGlzdHMnIGlzIHNldFxyXG4gICAgICAgICAgaWYgKGlucHV0UGFyYW1ldGVyTGlzdHMgPT09IHVuZGVmaW5lZCB8fCBpbnB1dFBhcmFtZXRlckxpc3RzID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlckxpc3RzJyB3aGVuIGNhbGxpbmcgYnVpbGRHcmlkU2VhcmNoQU5OXCIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICdkZWxldGVQcmV2aW91c01vZGVscyc6IG9wdHNbJ2RlbGV0ZVByZXZpb3VzTW9kZWxzJ10sXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcclxuXHJcbiAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICAgICAgICcvdHVuZS9idWlsZEdyaWRTZWFyY2hBTk4nLCAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgY29udHJvbFR1bmluZyBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmNvbnRyb2xUdW5pbmdDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHR1bmluZ1xyXG4gICAgICogdXNlcyBhIHN0cmluZyBlbnVtXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gdHJhaW5TdGF0dXMgbmV3IHN0YXR1cyBmb3IgdHJhaW5pbmdcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmNvbnRyb2xUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5jb250cm9sVHVuaW5nID0gZnVuY3Rpb24odHJhaW5TdGF0dXMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyBpcyBzZXRcclxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyB3aGVuIGNhbGxpbmcgY29udHJvbFR1bmluZ1wiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICcvdHVuZS9jb250cm9sVHVuaW5nJywgJ1BPU1QnLFxyXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nIG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZyA9IGZ1bmN0aW9uKHNldFNpemUsIGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XHJcbiAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZ1wiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemUsXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBQcm9jZXNzZWRJbWFnZURhdGE7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3R1bmUvZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZyBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZ0NhbGxiYWNrXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgICAqL1xyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgdGhlIGN1cnJlbnQgdHJhaW4gaW1hZ2VzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBsYXRlbnQgcmVwcmVzZW50YXRpb24gYW5kIG91dHB1dFxyXG4gICAgICAgKlxyXG4gICAgICAgKiBAcGFyYW0ge051bWJlcn0gc2V0U2l6ZSBzaXplIG9mIHRoZSBpbWFnZSBzdWJzZXRcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZyA9IGZ1bmN0aW9uIChzZXRTaXplLCBtb2RlbElkLCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XHJcbiAgICAgICAgICBpZiAoc2V0U2l6ZSA9PT0gdW5kZWZpbmVkIHx8IHNldFNpemUgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nXCIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcclxuICAgICAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmdcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgJ3NldFNpemUnOiBzZXRTaXplLFxyXG4gICAgICAgICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xyXG5cclxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFByb2Nlc3NlZEltYWdlRGF0YTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICAgICAnL3R1bmUvZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZycsICdHRVQnLFxyXG4gICAgICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmcgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2Ygc2NhbGFyIHRyYWluIHZhcmlhYmxlc1xyXG4gICAgICogYXMgbGlzdCBvZiBkaWN0c1xyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvdHVuZS9nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZyBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogcmV0dXJucyB0aGUgY29tcGxldGUgc2V0IG9mIHNjYWxhciB0cmFpbiB2YXJpYWJsZXMgdG8gYSBnaXZlbiBtb2RlbFxyXG4gICAgICAgKiBhcyBsaXN0IG9mIGRpY3RzXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtb2RlbElkIG1vZGVsIGlkIG9mIHRoZSBleHNwZWN0ZWQgcGFyYW1ldGVyIHNldFxyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmcgPSBmdW5jdGlvbiAobW9kZWxJZCwgY2FsbGJhY2spIHtcclxuICAgICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIGlzIHNldFxyXG4gICAgICAgICAgaWYgKG1vZGVsSWQgPT09IHVuZGVmaW5lZCB8fCBtb2RlbElkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgJ21vZGVsSWQnOiBtb2RlbElkLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XHJcblxyXG4gICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICAgICAnL3R1bmUvZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmcnLCAnR0VUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHVuZU1vZGVsSWRzIG9wZXJhdGlvbi5cclxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRUdW5lTW9kZWxJZHNDYWxsYmFja1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICAgKiBAcGFyYW0ge0FycmF5LjwnU3RyaW5nJz59IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICAgKi9cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiByZXR1cm5zIGEgbGlzdCBvZiBhbGwgdHVuZWQgbW9kZWwgaWRzXHJcbiAgICAgICAqIHJldHVybnMgYSBsaXN0IG9mIGFsbCB0dW5lZCBtb2RlbCBpZHNcclxuICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZU1vZGVsSWRzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIEFycmF5LjwnU3RyaW5nJz59XHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLmdldFR1bmVNb2RlbElkcyA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcclxuXHJcbiAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ1N0cmluZyddO1xyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICAgICAgICcvdHVuZS9nZXRUdW5lTW9kZWxJZHMnLCAnR0VUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHVuZVBhcmFtZXRlciBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZVBhcmFtZXRlckNhbGxiYWNrXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICAgKi9cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiByZXR1cm5zIHRoZSBwYXJhbWV0ZXIgc2V0IG9mIHRoZSBBTk4gd2l0aCB0aGUgZ2l2ZW4gbW9kZWwgaWRcclxuICAgICAgICogcmV0dXJucyBhIG9iamVjdCBvZiB0eXBlIFBhcmFtZXRlckxpc3RcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFR1bmVQYXJhbWV0ZXJDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9XHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLmdldFR1bmVQYXJhbWV0ZXIgPSBmdW5jdGlvbiAobW9kZWxJZCwgY2FsbGJhY2spIHtcclxuICAgICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIGlzIHNldFxyXG4gICAgICAgICAgaWYgKG1vZGVsSWQgPT09IHVuZGVmaW5lZCB8fCBtb2RlbElkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHVuZVBhcmFtZXRlclwiKTtcclxuICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAnbW9kZWxJZCc6IG1vZGVsSWQsXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcclxuXHJcbiAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBQYXJhbWV0ZXJMaXN0O1xyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICAgICAgICcvdHVuZS9nZXRUdW5lUGFyYW1ldGVyJywgJ0dFVCcsXHJcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFR1bmVkTW9kZWxBc1ppcCBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZWRNb2RlbEFzWmlwQ2FsbGJhY2tcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAgICogQHBhcmFtIHtGaWxlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogcmV0dXJucyBhIHppcCBmaWxlIHdpdGggdGhlIHByZSB0cmFpbmVkIG1vZGVsIGFzIHJ1bmFibGUgcHl0aG9uIHNjcmlwdFxyXG4gICAgICAgKlxyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbW9kZWxJZCBtb2RlbCBpZCBvZiB0aGUgdHVuZWQgbW9kZWxcclxuICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZWRNb2RlbEFzWmlwQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIEZpbGV9XHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLmdldFR1bmVkTW9kZWxBc1ppcCA9IGZ1bmN0aW9uIChtb2RlbElkLCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgaXMgc2V0XHJcbiAgICAgICAgICBpZiAobW9kZWxJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZGVsSWQgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIHdoZW4gY2FsbGluZyBnZXRUdW5lZE1vZGVsQXNaaXBcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgJ21vZGVsSWQnOiBtb2RlbElkLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XHJcblxyXG4gICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddO1xyXG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddO1xyXG4gICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBGaWxlO1xyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICAgICAgICcvdHVuZS9nZXRUdW5lZE1vZGVsQXNaaXAnLCAnR0VUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnLCAnbW9kZWwvQ2x1c3RlcmluZycsICdtb2RlbC9JbWFnZScsICdtb2RlbC9Qb2ludDJEJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJyksIHJlcXVpcmUoJy4uL21vZGVsL0NsdXN0ZXJpbmcnKSwgcmVxdWlyZSgnLi4vbW9kZWwvSW1hZ2UnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUG9pbnQyRCcpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVmlzdWFsaXplQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNsdXN0ZXJQYXJhbWV0ZXJzLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyaW5nLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCk7XHJcbiAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uIChBcGlDbGllbnQsIENsdXN0ZXJQYXJhbWV0ZXJzLCBDbHVzdGVyaW5nLCBJbWFnZSwgUG9pbnQyRCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLyoqXHJcbiAgICogVmlzdWFsaXplIHNlcnZpY2UuXHJcbiAgICogQG1vZHVsZSBhcGkvVmlzdWFsaXplQXBpXHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyBWaXN1YWxpemVBcGkuIFxyXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaVxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXHJcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcclxuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcclxuXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBjb21wdXRlSGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nIG9wZXJhdGlvbi5cclxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpfmNvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdDYWxsYmFja1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICAgKi9cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBzdGFydHMgdGhlIGNsdXN0ZXJpbmcgb2YgdGhlIGxhdGVudCByZXByZXNlbnRhdGlvbiBvZiBhIGhpZGRlbiBsYXllclxyXG4gICAgICAgKiBzdGFydHMgdGhlIGNsdXN0ZXJpbmcgb2YgdGhlIGxhdGVudCByZXByZXNlbnRhdGlvbiBvZiBhIGhpZGRlbiBsYXllclxyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gYWxnb3JpdGhtIGRldGVybWluZXMgdGhlIGNsdXRlcmluZyBhbGdvcml0aG1cclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGRpbWVuc2lvblJlZHVjdGlvbiBkZXRlcm1pbmVzIHRoZSBhbGdvcml0aG0gZm9yIGRpbSByZWR1Y3Rpb25cclxuICAgICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBkZXRlcm1pbmVzIHRoZSBkYXRhc2V0IHdoaWNoIHNob3VsZCBiZSBjbHVzdGVyZWQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcclxuICAgICAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMubGF5ZXIgZGV0ZXJtaW5lcyB0aGUgaGlkZGVuIGxheWVyXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfSBvcHRzLmNsdXN0ZXJQYXJhbWV0ZXJzIGRldGVybWluZXMgdGhlIGNsdXRlcmluZyBwYXJhbWV0ZXJzXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Y29tcHV0ZUhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICAgKi9cclxuICAgICAgdGhpcy5jb21wdXRlSGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nID0gZnVuY3Rpb24gKGFsZ29yaXRobSwgZGltZW5zaW9uUmVkdWN0aW9uLCBvcHRzLCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBvcHRzWydjbHVzdGVyUGFyYW1ldGVycyddO1xyXG5cclxuICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdhbGdvcml0aG0nIGlzIHNldFxyXG4gICAgICAgICAgaWYgKGFsZ29yaXRobSA9PT0gdW5kZWZpbmVkIHx8IGFsZ29yaXRobSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnYWxnb3JpdGhtJyB3aGVuIGNhbGxpbmcgY29tcHV0ZUhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ1wiKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZGltZW5zaW9uUmVkdWN0aW9uJyBpcyBzZXRcclxuICAgICAgICAgIGlmIChkaW1lbnNpb25SZWR1Y3Rpb24gPT09IHVuZGVmaW5lZCB8fCBkaW1lbnNpb25SZWR1Y3Rpb24gPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2RpbWVuc2lvblJlZHVjdGlvbicgd2hlbiBjYWxsaW5nIGNvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgJ2FsZ29yaXRobSc6IGFsZ29yaXRobSxcclxuICAgICAgICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcclxuICAgICAgICAgICAgICAnZGltZW5zaW9uX3JlZHVjdGlvbic6IGRpbWVuc2lvblJlZHVjdGlvbixcclxuICAgICAgICAgICAgICAnbGF5ZXInOiBvcHRzWydsYXllciddLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XHJcblxyXG4gICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcclxuXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICAgICAnL3Zpc3VhbGl6ZS9jb21wdXRlSGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nJywgJ1BPU1QnLFxyXG4gICAgICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIGdlbmVyYXRlcyB0aGUgQUUgb3V0cHV0IGZyb20gYSBnaXZlbiBwb2ludCBvZiB0aGUgc2FtcGxlIGRpc3RyaWJ1dGlvblxyXG4gICAgICogXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBwb2ludDJEIDJEIFBvaW50IG9mIHRoZSBzYW1wbGUgZGlzdHJpYnV0aW9uXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50ID0gZnVuY3Rpb24ocG9pbnQyRCwgY2FsbGJhY2spIHtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gcG9pbnQyRDtcclxuXHJcbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdwb2ludDJEJyBpcyBzZXRcclxuICAgICAgaWYgKHBvaW50MkQgPT09IHVuZGVmaW5lZCB8fCBwb2ludDJEID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdwb2ludDJEJyB3aGVuIGNhbGxpbmcgZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludFwiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy92aXN1YWxpemUvZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludCcsICdHRVQnLFxyXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nIG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXHJcbiAgICAgKiByZXR1cm5zIHRoZSBjbHVzdGVyaW5nIG9mIHRoZSBsYXRlbnQgcmVwcmVzZW50YXRpb24gb2YgYSBoaWRkZW4gbGF5ZXJcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIGRldGVybWluZXMgdGhlIGRhdGFzZXQgd2hpY2ggc2hvdWxkIGJlIGNsdXN0ZXJlZCAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMubGF5ZXIgZGV0ZXJtaW5lcyB0aGUgaGlkZGVuIGxheWVyXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nID0gZnVuY3Rpb24gKG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xyXG4gICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcclxuICAgICAgICAgICdsYXllcic6IG9wdHNbJ2xheWVyJ10sXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBDbHVzdGVyaW5nO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgICAnL3Zpc3VhbGl6ZS9nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcnLCAnUE9TVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRQcmV0cmFpbmVkTW9kZWxBc1ppcCBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZXRQcmV0cmFpbmVkTW9kZWxBc1ppcENhbGxiYWNrXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgICAqIEBwYXJhbSB7RmlsZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgICAqL1xyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIHJldHVybnMgYSB6aXAgZmlsZSB3aXRoIHRoZSBwcmUgdHJhaW5lZCBtb2RlbCBhcyBydW5hYmxlIHB5dGhvbiBzY3JpcHRcclxuICAgICAgICpcclxuICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZXRQcmV0cmFpbmVkTW9kZWxBc1ppcENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBGaWxlfVxyXG4gICAgICAgKi9cclxuICAgICAgdGhpcy5nZXRQcmV0cmFpbmVkTW9kZWxBc1ppcCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcclxuXHJcbiAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydtdWx0aXBhcnQvZm9ybS1kYXRhJ107XHJcbiAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ107XHJcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IEZpbGU7XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgICAgICAgJy92aXN1YWxpemUvZ2V0UHJldHJhaW5lZE1vZGVsQXNaaXAnLCAnR0VUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJywgJ21vZGVsL0NsdXN0ZXJpbmcnLCAnbW9kZWwvQ29zdEZ1bmN0aW9uJywgJ21vZGVsL0ltYWdlJywgJ21vZGVsL0ltYWdlRGF0YScsICdtb2RlbC9MZWFybmluZ1JhdGUnLCAnbW9kZWwvUGFyYW1ldGVyTGlzdCcsICdtb2RlbC9Qb2ludDJEJywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9SYW5kb21GdW5jdGlvbicsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQnLCAnbW9kZWwvVHJhaW5TdGF0dXMnLCAnYXBpL0J1aWxkQXBpJywgJ2FwaS9Mb2FkQXBpJywgJ2FwaS9UcmFpbkFwaScsICdhcGkvVHVuZUFwaScsICdhcGkvVmlzdWFsaXplQXBpJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnKSwgcmVxdWlyZSgnLi9tb2RlbC9DbHVzdGVyaW5nJyksIHJlcXVpcmUoJy4vbW9kZWwvQ29zdEZ1bmN0aW9uJyksIHJlcXVpcmUoJy4vbW9kZWwvSW1hZ2UnKSwgcmVxdWlyZSgnLi9tb2RlbC9JbWFnZURhdGEnKSwgcmVxdWlyZSgnLi9tb2RlbC9MZWFybmluZ1JhdGUnKSwgcmVxdWlyZSgnLi9tb2RlbC9QYXJhbWV0ZXJMaXN0JyksIHJlcXVpcmUoJy4vbW9kZWwvUG9pbnQyRCcpLCByZXF1aXJlKCcuL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScpLCByZXF1aXJlKCcuL21vZGVsL1JhbmRvbUZ1bmN0aW9uJyksIHJlcXVpcmUoJy4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuL21vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQnKSwgcmVxdWlyZSgnLi9tb2RlbC9UcmFpblN0YXR1cycpLCByZXF1aXJlKCcuL2FwaS9CdWlsZEFwaScpLCByZXF1aXJlKCcuL2FwaS9Mb2FkQXBpJyksIHJlcXVpcmUoJy4vYXBpL1RyYWluQXBpJyksIHJlcXVpcmUoJy4vYXBpL1R1bmVBcGknKSwgcmVxdWlyZSgnLi9hcGkvVmlzdWFsaXplQXBpJykpO1xyXG4gIH1cclxufShmdW5jdGlvbihBcGlDbGllbnQsIENsdXN0ZXJQYXJhbWV0ZXJzLCBDbHVzdGVyaW5nLCBDb3N0RnVuY3Rpb24sIEltYWdlLCBJbWFnZURhdGEsIExlYXJuaW5nUmF0ZSwgUGFyYW1ldGVyTGlzdCwgUG9pbnQyRCwgUHJvY2Vzc2VkSW1hZ2VEYXRhLCBSYW5kb21GdW5jdGlvbiwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCwgVHJhaW5TdGF0dXMsIEJ1aWxkQXBpLCBMb2FkQXBpLCBUcmFpbkFwaSwgVHVuZUFwaSwgVmlzdWFsaXplQXBpKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAvKipcclxuICAgKiBXZWJVSV90b19idWlsZF90cmFpbl9hbmRfdHVuZV9hX0NvbnZvbHV0aW9uYWxfQXV0b2VuY29kZXIuPGJyPlxyXG4gICAqIFRoZSA8Y29kZT5pbmRleDwvY29kZT4gbW9kdWxlIHByb3ZpZGVzIGFjY2VzcyB0byBjb25zdHJ1Y3RvcnMgZm9yIGFsbCB0aGUgY2xhc3NlcyB3aGljaCBjb21wcmlzZSB0aGUgcHVibGljIEFQSS5cclxuICAgKiA8cD5cclxuICAgKiBBbiBBTUQgKHJlY29tbWVuZGVkISkgb3IgQ29tbW9uSlMgYXBwbGljYXRpb24gd2lsbCBnZW5lcmFsbHkgZG8gc29tZXRoaW5nIGVxdWl2YWxlbnQgdG8gdGhlIGZvbGxvd2luZzpcclxuICAgKiA8cHJlPlxyXG4gICAqIHZhciBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSByZXF1aXJlKCdpbmRleCcpOyAvLyBTZWUgbm90ZSBiZWxvdyouXHJcbiAgICogdmFyIHh4eFN2YyA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWHh4QXBpKCk7IC8vIEFsbG9jYXRlIHRoZSBBUEkgY2xhc3Mgd2UncmUgZ29pbmcgdG8gdXNlLlxyXG4gICAqIHZhciB5eXlNb2RlbCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWXl5KCk7IC8vIENvbnN0cnVjdCBhIG1vZGVsIGluc3RhbmNlLlxyXG4gICAqIHl5eU1vZGVsLnNvbWVQcm9wZXJ0eSA9ICdzb21lVmFsdWUnO1xyXG4gICAqIC4uLlxyXG4gICAqIHZhciB6enogPSB4eHhTdmMuZG9Tb21ldGhpbmcoeXl5TW9kZWwpOyAvLyBJbnZva2UgdGhlIHNlcnZpY2UuXHJcbiAgICogLi4uXHJcbiAgICogPC9wcmU+XHJcbiAgICogPGVtPipOT1RFOiBGb3IgYSB0b3AtbGV2ZWwgQU1EIHNjcmlwdCwgdXNlIHJlcXVpcmUoWydpbmRleCddLCBmdW5jdGlvbigpey4uLn0pXHJcbiAgICogYW5kIHB1dCB0aGUgYXBwbGljYXRpb24gbG9naWMgd2l0aGluIHRoZSBjYWxsYmFjayBmdW5jdGlvbi48L2VtPlxyXG4gICAqIDwvcD5cclxuICAgKiA8cD5cclxuICAgKiBBIG5vbi1BTUQgYnJvd3NlciBhcHBsaWNhdGlvbiAoZGlzY291cmFnZWQpIG1pZ2h0IGRvIHNvbWV0aGluZyBsaWtlIHRoaXM6XHJcbiAgICogPHByZT5cclxuICAgKiB2YXIgeHh4U3ZjID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5YeHhBcGkoKTsgLy8gQWxsb2NhdGUgdGhlIEFQSSBjbGFzcyB3ZSdyZSBnb2luZyB0byB1c2UuXHJcbiAgICogdmFyIHl5eSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWXl5KCk7IC8vIENvbnN0cnVjdCBhIG1vZGVsIGluc3RhbmNlLlxyXG4gICAqIHl5eU1vZGVsLnNvbWVQcm9wZXJ0eSA9ICdzb21lVmFsdWUnO1xyXG4gICAqIC4uLlxyXG4gICAqIHZhciB6enogPSB4eHhTdmMuZG9Tb21ldGhpbmcoeXl5TW9kZWwpOyAvLyBJbnZva2UgdGhlIHNlcnZpY2UuXHJcbiAgICogLi4uXHJcbiAgICogPC9wcmU+XHJcbiAgICogPC9wPlxyXG4gICAqIEBtb2R1bGUgaW5kZXhcclxuICAgKiBAdmVyc2lvbiAxLjIuMlxyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgQXBpQ2xpZW50IGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6QXBpQ2xpZW50fVxyXG4gICAgICovXHJcbiAgICBBcGlDbGllbnQ6IEFwaUNsaWVudCxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIENsdXN0ZXJQYXJhbWV0ZXJzIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9XHJcbiAgICAgKi9cclxuICAgIENsdXN0ZXJQYXJhbWV0ZXJzOiBDbHVzdGVyUGFyYW1ldGVycyxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIENsdXN0ZXJpbmcgbW9kZWwgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfVxyXG4gICAgICovXHJcbiAgICBDbHVzdGVyaW5nOiBDbHVzdGVyaW5nLFxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgQ29zdEZ1bmN0aW9uIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvQ29zdEZ1bmN0aW9ufVxyXG4gICAgICovXHJcbiAgICBDb3N0RnVuY3Rpb246IENvc3RGdW5jdGlvbixcclxuICAgIC8qKlxyXG4gICAgICogVGhlIEltYWdlIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvSW1hZ2V9XHJcbiAgICAgKi9cclxuICAgIEltYWdlOiBJbWFnZSxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIEltYWdlRGF0YSBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cclxuICAgICAqL1xyXG4gICAgSW1hZ2VEYXRhOiBJbWFnZURhdGEsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBMZWFybmluZ1JhdGUgbW9kZWwgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9MZWFybmluZ1JhdGV9XHJcbiAgICAgKi9cclxuICAgIExlYXJuaW5nUmF0ZTogTGVhcm5pbmdSYXRlLFxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgUGFyYW1ldGVyTGlzdCBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9XHJcbiAgICAgKi9cclxuICAgIFBhcmFtZXRlckxpc3Q6IFBhcmFtZXRlckxpc3QsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBQb2ludDJEIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvUG9pbnQyRH1cclxuICAgICAqL1xyXG4gICAgUG9pbnQyRDogUG9pbnQyRCxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFByb2Nlc3NlZEltYWdlRGF0YSBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cclxuICAgICAqL1xyXG4gICAgUHJvY2Vzc2VkSW1hZ2VEYXRhOiBQcm9jZXNzZWRJbWFnZURhdGEsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBSYW5kb21GdW5jdGlvbiBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9ufVxyXG4gICAgICovXHJcbiAgICBSYW5kb21GdW5jdGlvbjogUmFuZG9tRnVuY3Rpb24sXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cclxuICAgICAqL1xyXG4gICAgVHJhaW5QZXJmb3JtYW5jZTogVHJhaW5QZXJmb3JtYW5jZSxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQgbW9kZWwgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50fVxyXG4gICAgICovXHJcbiAgICBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50OiBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50LFxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgVHJhaW5TdGF0dXMgbW9kZWwgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c31cclxuICAgICAqL1xyXG4gICAgVHJhaW5TdGF0dXM6IFRyYWluU3RhdHVzLFxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgQnVpbGRBcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9CdWlsZEFwaX1cclxuICAgICAqL1xyXG4gICAgQnVpbGRBcGk6IEJ1aWxkQXBpLFxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgTG9hZEFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL0xvYWRBcGl9XHJcbiAgICAgKi9cclxuICAgIExvYWRBcGk6IExvYWRBcGksXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBUcmFpbkFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1RyYWluQXBpfVxyXG4gICAgICovXHJcbiAgICBUcmFpbkFwaTogVHJhaW5BcGksXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBUdW5lQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvVHVuZUFwaX1cclxuICAgICAqL1xyXG4gICAgVHVuZUFwaTogVHVuZUFwaSxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFZpc3VhbGl6ZUFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX1cclxuICAgICAqL1xyXG4gICAgVmlzdWFsaXplQXBpOiBWaXN1YWxpemVBcGlcclxuICB9O1xyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyUGFyYW1ldGVycyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBUaGUgQ2x1c3RlclBhcmFtZXRlcnMgbW9kZWwgbW9kdWxlLlxyXG4gICAqIEBtb2R1bGUgbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnNcclxuICAgKiBAdmVyc2lvbiAxLjIuMlxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPi5cclxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzXHJcbiAgICogQGNsYXNzXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXHJcbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cclxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9DbHVzdGVyUGFyYW1ldGVyc30gVGhlIHBvcHVsYXRlZCA8Y29kZT5DbHVzdGVyUGFyYW1ldGVyczwvY29kZT4gaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcclxuXHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2NsdXN0ZXJzJykpIHtcclxuICAgICAgICBvYmpbJ25fY2x1c3RlcnMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fY2x1c3RlcnMnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbml0JykpIHtcclxuICAgICAgICBvYmpbJ2luaXQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2luaXQnXSwgJ1N0cmluZycpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2luaXQnKSkge1xyXG4gICAgICAgIG9ialsnbl9pbml0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2luaXQnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXhfaXRlcicpKSB7XHJcbiAgICAgICAgb2JqWydtYXhfaXRlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4X2l0ZXInXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd0b2wnKSkge1xyXG4gICAgICAgIG9ialsndG9sJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd0b2wnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdwcmVjb21wdXRlX2Rpc3RhbmNlcycpKSB7XHJcbiAgICAgICAgb2JqWydwcmVjb21wdXRlX2Rpc3RhbmNlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncHJlY29tcHV0ZV9kaXN0YW5jZXMnXSwgJ1N0cmluZycpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd2ZXJib3NlJykpIHtcclxuICAgICAgICBvYmpbJ3ZlcmJvc2UnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3ZlcmJvc2UnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fc3RhdGUnKSkge1xyXG4gICAgICAgIG9ialsncmFuZG9tX3N0YXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fc3RhdGUnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjb3B5X3gnKSkge1xyXG4gICAgICAgIG9ialsnY29weV94J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjb3B5X3gnXSwgJ0Jvb2xlYW4nKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9qb2JzJykpIHtcclxuICAgICAgICBvYmpbJ25fam9icyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9qb2JzJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYWxnb3JpdGhtJykpIHtcclxuICAgICAgICBvYmpbJ2FsZ29yaXRobSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYWxnb3JpdGhtJ10sICdTdHJpbmcnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9jbHVzdGVyc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyduX2NsdXN0ZXJzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7U3RyaW5nfSBpbml0XHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2luaXQnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG5faW5pdFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyduX2luaXQnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1heF9pdGVyXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heF9pdGVyJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSB0b2xcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsndG9sJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7U3RyaW5nfSBwcmVjb21wdXRlX2Rpc3RhbmNlc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydwcmVjb21wdXRlX2Rpc3RhbmNlcyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gdmVyYm9zZVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyd2ZXJib3NlJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSByYW5kb21fc3RhdGVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX3N0YXRlJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gY29weV94XHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NvcHlfeCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9qb2JzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fam9icyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gYWxnb3JpdGhtXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2FsZ29yaXRobSddID0gdW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcblxyXG5cclxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUG9pbnQyRCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9Qb2ludDJEJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ2x1c3RlcmluZyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qb2ludDJEKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBQb2ludDJEKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBUaGUgQ2x1c3RlcmluZyBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9DbHVzdGVyaW5nXHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPi5cclxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmdcclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cclxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ30gVGhlIHBvcHVsYXRlZCA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPiBpbnN0YW5jZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xyXG5cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pblgnKSkge1xyXG4gICAgICAgIG9ialsnbWluWCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWluWCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heFgnKSkge1xyXG4gICAgICAgIG9ialsnbWF4WCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4WCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pblknKSkge1xyXG4gICAgICAgIG9ialsnbWluWSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWluWSddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heFknKSkge1xyXG4gICAgICAgIG9ialsnbWF4WSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4WSddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25DbHVzdGVycycpKSB7XHJcbiAgICAgICAgb2JqWyduQ2x1c3RlcnMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25DbHVzdGVycyddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3BvaW50cycpKSB7XHJcbiAgICAgICAgb2JqWydwb2ludHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3BvaW50cyddLCBbUG9pbnQyRF0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtaW5YXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pblgnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1heFhcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4WCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWluWVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaW5ZJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtYXhZXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heFknXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG5DbHVzdGVyc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyduQ2x1c3RlcnMnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1BvaW50MkQ+fSBwb2ludHNcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsncG9pbnRzJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuOFxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Db3N0RnVuY3Rpb24gPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XHJcbiAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcblxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIENvc3RGdW5jdGlvbiBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9Db3N0RnVuY3Rpb25cclxuICAgKiBAdmVyc2lvbiAxLjEuOFxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNvc3RGdW5jdGlvbjwvY29kZT4uXHJcbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb25cclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5Db3N0RnVuY3Rpb248L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cclxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbn0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb259IFRoZSBwb3B1bGF0ZWQgPGNvZGU+Q29zdEZ1bmN0aW9uPC9jb2RlPiBpbnN0YW5jZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xyXG5cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2Nvc3RfZnVuY3Rpb24nKSkge1xyXG4gICAgICAgIG9ialsnY2ZfY29zdF9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfY29zdF9mdW5jdGlvbiddLCAnU3RyaW5nJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX21heF92YWwnKSkge1xyXG4gICAgICAgIG9ialsnY2ZfbWF4X3ZhbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfbWF4X3ZhbCddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfZmlsdGVyX3NpemUnKSkge1xyXG4gICAgICAgIG9ialsnY2ZfZmlsdGVyX3NpemUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2ZpbHRlcl9zaXplJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9maWx0ZXJfc2lnbWEnKSkge1xyXG4gICAgICAgIG9ialsnY2ZfZmlsdGVyX3NpZ21hJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9maWx0ZXJfc2lnbWEnXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2sxJykpIHtcclxuICAgICAgICBvYmpbJ2NmX2sxJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9rMSddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfazInKSkge1xyXG4gICAgICAgIG9ialsnY2ZfazInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2syJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl93ZWlnaHRzJykpIHtcclxuICAgICAgICBvYmpbJ2NmX3dlaWdodHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX3dlaWdodHMnXSwgW1snTnVtYmVyJ11dKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gY2ZfY29zdF9mdW5jdGlvblxyXG4gICAqIEBkZWZhdWx0ICdzcXVhcmVkX3BpeGVsX2Rpc3RhbmNlJ1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9jb3N0X2Z1bmN0aW9uJ10gPSAnc3F1YXJlZF9waXhlbF9kaXN0YW5jZSc7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX21heF92YWxcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfbWF4X3ZhbCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9maWx0ZXJfc2l6ZVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9maWx0ZXJfc2l6ZSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9maWx0ZXJfc2lnbWFcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfZmlsdGVyX3NpZ21hJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2sxXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2sxJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2syXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2syJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gY2Zfd2VpZ2h0c1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl93ZWlnaHRzJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBUaGUgSW1hZ2UgbW9kZWwgbW9kdWxlLlxyXG4gICAqIEBtb2R1bGUgbW9kZWwvSW1hZ2VcclxuICAgKiBAdmVyc2lvbiAxLjIuMlxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkltYWdlPC9jb2RlPi5cclxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0ltYWdlXHJcbiAgICogQGNsYXNzXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG5cclxuXHJcblxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5JbWFnZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxyXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2V9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2V9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+SW1hZ2U8L2NvZGU+IGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYnl0ZXN0cmluZycpKSB7XHJcbiAgICAgICAgb2JqWydieXRlc3RyaW5nJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydieXRlc3RyaW5nJ10sICdTdHJpbmcnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaWQnKSkge1xyXG4gICAgICAgIG9ialsnaWQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2lkJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdCcpKSB7XHJcbiAgICAgICAgb2JqWydjb3N0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjb3N0J10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gYnl0ZXN0cmluZ1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydieXRlc3RyaW5nJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBpZFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydpZCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gY29zdFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3N0J10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZSddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9JbWFnZScpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlRGF0YSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSk7XHJcbiAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgSW1hZ2UpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBJbWFnZURhdGEgbW9kZWwgbW9kdWxlLlxyXG4gICAqIEBtb2R1bGUgbW9kZWwvSW1hZ2VEYXRhXHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5JbWFnZURhdGE8L2NvZGU+LlxyXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhXHJcbiAgICogQGNsYXNzXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+SW1hZ2VEYXRhPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXHJcbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cclxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkltYWdlRGF0YTwvY29kZT4gaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcclxuXHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1JbWFnZXMnKSkge1xyXG4gICAgICAgIG9ialsnbnVtSW1hZ2VzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydudW1JbWFnZXMnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNYJykpIHtcclxuICAgICAgICBvYmpbJ3Jlc1gnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Jlc1gnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyZXNZJykpIHtcclxuICAgICAgICBvYmpbJ3Jlc1knXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Jlc1knXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbWFnZXMnKSkge1xyXG4gICAgICAgIG9ialsnaW1hZ2VzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpbWFnZXMnXSwgW0ltYWdlXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG51bUltYWdlc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydudW1JbWFnZXMnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJlc1hcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsncmVzWCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gcmVzWVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNZJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9JbWFnZT59IGltYWdlc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydpbWFnZXMnXSA9IHVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS44XHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxlYXJuaW5nUmF0ZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBUaGUgTGVhcm5pbmdSYXRlIG1vZGVsIG1vZHVsZS5cclxuICAgKiBAbW9kdWxlIG1vZGVsL0xlYXJuaW5nUmF0ZVxyXG4gICAqIEB2ZXJzaW9uIDEuMS44XHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+TGVhcm5pbmdSYXRlPC9jb2RlPi5cclxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZVxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxyXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXHJcbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZX0gVGhlIHBvcHVsYXRlZCA8Y29kZT5MZWFybmluZ1JhdGU8L2NvZGU+IGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGVhcm5pbmdfcmF0ZV9mdW5jdGlvbicpKSB7XHJcbiAgICAgICAgb2JqWydsZWFybmluZ19yYXRlX2Z1bmN0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsZWFybmluZ19yYXRlX2Z1bmN0aW9uJ10sICdTdHJpbmcnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJykpIHtcclxuICAgICAgICBvYmpbJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9kZWNheV9zdGVwcycpKSB7XHJcbiAgICAgICAgb2JqWydscl9kZWNheV9zdGVwcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfZGVjYXlfc3RlcHMnXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2RlY2F5X3JhdGUnKSkge1xyXG4gICAgICAgIG9ialsnbHJfZGVjYXlfcmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfZGVjYXlfcmF0ZSddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfc3RhaXJjYXNlJykpIHtcclxuICAgICAgICBvYmpbJ2xyX3N0YWlyY2FzZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfc3RhaXJjYXNlJ10sIFsnQm9vbGVhbiddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfYm91bmRhcmllcycpKSB7XHJcbiAgICAgICAgb2JqWydscl9ib3VuZGFyaWVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9ib3VuZGFyaWVzJ10sIFtbJ051bWJlciddXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3ZhbHVlcycpKSB7XHJcbiAgICAgICAgb2JqWydscl92YWx1ZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX3ZhbHVlcyddLCBbWydOdW1iZXInXV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9lbmRfbGVhcm5pbmdfcmF0ZScpKSB7XHJcbiAgICAgICAgb2JqWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfZW5kX2xlYXJuaW5nX3JhdGUnXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3Bvd2VyJykpIHtcclxuICAgICAgICBvYmpbJ2xyX3Bvd2VyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9wb3dlciddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfY3ljbGUnKSkge1xyXG4gICAgICAgIG9ialsnbHJfY3ljbGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2N5Y2xlJ10sIFsnQm9vbGVhbiddKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbGVhcm5pbmdfcmF0ZV9mdW5jdGlvblxyXG4gICAqIEBkZWZhdWx0ICdzdGF0aWMnXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xlYXJuaW5nX3JhdGVfZnVuY3Rpb24nXSA9ICdzdGF0aWMnO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9pbml0aWFsX2xlYXJuaW5nX3JhdGVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2RlY2F5X3N0ZXBzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2RlY2F5X3N0ZXBzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2RlY2F5X3JhdGVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZGVjYXlfcmF0ZSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbHJfc3RhaXJjYXNlXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX3N0YWlyY2FzZSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGxyX2JvdW5kYXJpZXNcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfYm91bmRhcmllcyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGxyX3ZhbHVlc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl92YWx1ZXMnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZW5kX2xlYXJuaW5nX3JhdGVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZW5kX2xlYXJuaW5nX3JhdGUnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfcG93ZXJcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfcG93ZXInXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48Qm9vbGVhbj59IGxyX2N5Y2xlXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2N5Y2xlJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Db3N0RnVuY3Rpb24nLCAnbW9kZWwvTGVhcm5pbmdSYXRlJywgJ21vZGVsL1JhbmRvbUZ1bmN0aW9uJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL0Nvc3RGdW5jdGlvbicpLCByZXF1aXJlKCcuL0xlYXJuaW5nUmF0ZScpLCByZXF1aXJlKCcuL1JhbmRvbUZ1bmN0aW9uJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Db3N0RnVuY3Rpb24sIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxlYXJuaW5nUmF0ZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUmFuZG9tRnVuY3Rpb24pO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIENvc3RGdW5jdGlvbiwgTGVhcm5pbmdSYXRlLCBSYW5kb21GdW5jdGlvbikge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcblxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIFBhcmFtZXRlckxpc3QgbW9kZWwgbW9kdWxlLlxyXG4gICAqIEBtb2R1bGUgbW9kZWwvUGFyYW1ldGVyTGlzdFxyXG4gICAqIEB2ZXJzaW9uIDEuMi4yXHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4uXHJcbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0XHJcbiAgICogQGNsYXNzXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxyXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBUaGUgcG9wdWxhdGVkIDxjb2RlPlBhcmFtZXRlckxpc3Q8L2NvZGU+IGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaW5wdXRfc2hhcGUnKSkge1xyXG4gICAgICAgIG9ialsnaW5wdXRfc2hhcGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2lucHV0X3NoYXBlJ10sIFtbJ051bWJlciddXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ251bWJlcl9vZl9zdGFja3MnKSkge1xyXG4gICAgICAgIG9ialsnbnVtYmVyX29mX3N0YWNrcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbnVtYmVyX29mX3N0YWNrcyddLCBbWydOdW1iZXInXV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdmaWx0ZXJfc2l6ZXMnKSkge1xyXG4gICAgICAgIG9ialsnZmlsdGVyX3NpemVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydmaWx0ZXJfc2l6ZXMnXSwgW1snTnVtYmVyJ11dKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWlycm9yX3dlaWdodHMnKSkge1xyXG4gICAgICAgIG9ialsnbWlycm9yX3dlaWdodHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21pcnJvcl93ZWlnaHRzJ10sIFsnQm9vbGVhbiddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYWN0aXZhdGlvbl9mdW5jdGlvbicpKSB7XHJcbiAgICAgICAgb2JqWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10sIFsnU3RyaW5nJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdiYXRjaF9zaXplJykpIHtcclxuICAgICAgICBvYmpbJ2JhdGNoX3NpemUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2JhdGNoX3NpemUnXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25fZXBvY2hzJykpIHtcclxuICAgICAgICBvYmpbJ25fZXBvY2hzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2Vwb2NocyddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndXNlX3RlbnNvcmJvYXJkJykpIHtcclxuICAgICAgICBvYmpbJ3VzZV90ZW5zb3Jib2FyZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndXNlX3RlbnNvcmJvYXJkJ10sICdCb29sZWFuJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3ZlcmJvc2UnKSkge1xyXG4gICAgICAgIG9ialsndmVyYm9zZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndmVyYm9zZSddLCAnQm9vbGVhbicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsZWFybmluZ19yYXRlX2RpY3QnKSkge1xyXG4gICAgICAgIG9ialsnbGVhcm5pbmdfcmF0ZV9kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsZWFybmluZ19yYXRlX2RpY3QnXSwgW0xlYXJuaW5nUmF0ZV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjb3N0X2Z1bmN0aW9uX2RpY3QnKSkge1xyXG4gICAgICAgIG9ialsnY29zdF9mdW5jdGlvbl9kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSwgW0Nvc3RGdW5jdGlvbl0pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdvcHRpbWl6ZXInKSkge1xyXG4gICAgICAgIG9ialsnb3B0aW1pemVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydvcHRpbWl6ZXInXSwgWydTdHJpbmcnXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21vbWVudHVtJykpIHtcclxuICAgICAgICBvYmpbJ21vbWVudHVtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtb21lbnR1bSddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX3dlaWdodHNfZGljdCcpKSB7XHJcbiAgICAgICAgb2JqWydyYW5kb21fd2VpZ2h0c19kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fd2VpZ2h0c19kaWN0J10sIFtSYW5kb21GdW5jdGlvbl0pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fYmlhc2VzX2RpY3QnKSkge1xyXG4gICAgICAgIG9ialsncmFuZG9tX2JpYXNlc19kaWN0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fYmlhc2VzX2RpY3QnXSwgW1JhbmRvbUZ1bmN0aW9uXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3Nlc3Npb25fc2F2ZXJfcGF0aCcpKSB7XHJcbiAgICAgICAgb2JqWydzZXNzaW9uX3NhdmVyX3BhdGgnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddLCAnU3RyaW5nJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xvYWRfcHJldl9zZXNzaW9uJykpIHtcclxuICAgICAgICBvYmpbJ2xvYWRfcHJldl9zZXNzaW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsb2FkX3ByZXZfc2Vzc2lvbiddLCAnQm9vbGVhbicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzZXNzaW9uX3NhdmVfZHVyYXRpb24nKSkge1xyXG4gICAgICAgIG9ialsnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzZXNzaW9uX3NhdmVfZHVyYXRpb24nXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ251bV90ZXN0X3BpY3R1cmVzJykpIHtcclxuICAgICAgICBvYmpbJ251bV90ZXN0X3BpY3R1cmVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydudW1fdGVzdF9waWN0dXJlcyddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGlucHV0X3NoYXBlXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lucHV0X3NoYXBlJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbnVtYmVyX29mX3N0YWNrc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydudW1iZXJfb2Zfc3RhY2tzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gZmlsdGVyX3NpemVzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2ZpbHRlcl9zaXplcyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbWlycm9yX3dlaWdodHNcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbWlycm9yX3dlaWdodHMnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gYWN0aXZhdGlvbl9mdW5jdGlvblxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGJhdGNoX3NpemVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnYmF0Y2hfc2l6ZSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBuX2Vwb2Noc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyduX2Vwb2NocyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0Jvb2xlYW59IHVzZV90ZW5zb3Jib2FyZFxyXG4gICAqIEBkZWZhdWx0IHRydWVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsndXNlX3RlbnNvcmJvYXJkJ10gPSB0cnVlO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0Jvb2xlYW59IHZlcmJvc2VcclxuICAgKiBAZGVmYXVsdCB0cnVlXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHRydWU7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9MZWFybmluZ1JhdGU+fSBsZWFybmluZ19yYXRlX2RpY3RcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbGVhcm5pbmdfcmF0ZV9kaWN0J10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb24+fSBjb3N0X2Z1bmN0aW9uX2RpY3RcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnY29zdF9mdW5jdGlvbl9kaWN0J10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPFN0cmluZz59IG9wdGltaXplclxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydvcHRpbWl6ZXInXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbW9tZW50dW1cclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbW9tZW50dW0nXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9uPn0gcmFuZG9tX3dlaWdodHNfZGljdFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fd2VpZ2h0c19kaWN0J10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbj59IHJhbmRvbV9iaWFzZXNfZGljdFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fYmlhc2VzX2RpY3QnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHNlc3Npb25fc2F2ZXJfcGF0aFxyXG4gICAqIEBkZWZhdWx0ICcuL3NhdmUvJ1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydzZXNzaW9uX3NhdmVyX3BhdGgnXSA9ICcuL3NhdmUvJztcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtCb29sZWFufSBsb2FkX3ByZXZfc2Vzc2lvblxyXG4gICAqIEBkZWZhdWx0IGZhbHNlXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xvYWRfcHJldl9zZXNzaW9uJ10gPSBmYWxzZTtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gc2Vzc2lvbl9zYXZlX2R1cmF0aW9uXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbiddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBudW1fdGVzdF9waWN0dXJlc1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydudW1fdGVzdF9waWN0dXJlcyddID0gdW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcblxyXG5cclxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBUaGUgUG9pbnQyRCBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9Qb2ludDJEXHJcbiAgICogQHZlcnNpb24gMS4yLjJcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5Qb2ludDJEPC9jb2RlPi5cclxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1BvaW50MkRcclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlBvaW50MkQ8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cclxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BvaW50MkR9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gVGhlIHBvcHVsYXRlZCA8Y29kZT5Qb2ludDJEPC9jb2RlPiBpbnN0YW5jZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xyXG5cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3gnKSkge1xyXG4gICAgICAgIG9ialsneCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsneCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3knKSkge1xyXG4gICAgICAgIG9ialsneSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsneSddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NsdXN0ZXInKSkge1xyXG4gICAgICAgIG9ialsnY2x1c3RlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2x1c3RlciddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHhcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsneCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0geVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyd5J10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjbHVzdGVyXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NsdXN0ZXInXSA9IHVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0ltYWdlJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL0ltYWdlJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZSkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcblxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIFByb2Nlc3NlZEltYWdlRGF0YSBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGFcclxuICAgKiBAdmVyc2lvbiAxLjIuMlxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4uXHJcbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGFcclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UHJvY2Vzc2VkSW1hZ2VEYXRhPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXHJcbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cclxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4gaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcclxuXHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdlcG9jaCcpKSB7XHJcbiAgICAgICAgb2JqWydlcG9jaCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnZXBvY2gnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzdGVwJykpIHtcclxuICAgICAgICBvYmpbJ3N0ZXAnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3N0ZXAnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbnB1dExheWVyJykpIHtcclxuICAgICAgICBvYmpbJ2lucHV0TGF5ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2lucHV0TGF5ZXInXSwgW0ltYWdlXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xhdGVudExheWVyJykpIHtcclxuICAgICAgICBvYmpbJ2xhdGVudExheWVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsYXRlbnRMYXllciddLCBbW0ltYWdlXV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdvdXRwdXRMYXllcicpKSB7XHJcbiAgICAgICAgb2JqWydvdXRwdXRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnb3V0cHV0TGF5ZXInXSwgW0ltYWdlXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGVwb2NoXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2Vwb2NoJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBzdGVwXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3N0ZXAnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW5wdXRMYXllclxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydpbnB1dExheWVyJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+Pn0gbGF0ZW50TGF5ZXJcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbGF0ZW50TGF5ZXInXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gb3V0cHV0TGF5ZXJcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnb3V0cHV0TGF5ZXInXSA9IHVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS44XHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlJhbmRvbUZ1bmN0aW9uID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBSYW5kb21GdW5jdGlvbiBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9SYW5kb21GdW5jdGlvblxyXG4gICAqIEB2ZXJzaW9uIDEuMS44XHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UmFuZG9tRnVuY3Rpb248L2NvZGU+LlxyXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb25cclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlJhbmRvbUZ1bmN0aW9uPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXHJcbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cclxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbn0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbn0gVGhlIHBvcHVsYXRlZCA8Y29kZT5SYW5kb21GdW5jdGlvbjwvY29kZT4gaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcclxuXHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdyYW5kb21fZnVuY3Rpb24nKSkge1xyXG4gICAgICAgIG9ialsncmFuZG9tX2Z1bmN0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fZnVuY3Rpb24nXSwgJ1N0cmluZycpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhbHBoYScpKSB7XHJcbiAgICAgICAgb2JqWydhbHBoYSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYWxwaGEnXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2JldGEnKSkge1xyXG4gICAgICAgIG9ialsnYmV0YSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYmV0YSddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWVhbicpKSB7XHJcbiAgICAgICAgb2JqWydtZWFuJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtZWFuJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzdGRkZXYnKSkge1xyXG4gICAgICAgIG9ialsnc3RkZGV2J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzdGRkZXYnXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xhbScpKSB7XHJcbiAgICAgICAgb2JqWydsYW0nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xhbSddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWludmFsJykpIHtcclxuICAgICAgICBvYmpbJ21pbnZhbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWludmFsJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtYXh2YWwnKSkge1xyXG4gICAgICAgIG9ialsnbWF4dmFsJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXh2YWwnXSwgWydOdW1iZXInXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3NlZWQnKSkge1xyXG4gICAgICAgIG9ialsnc2VlZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc2VlZCddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gcmFuZG9tX2Z1bmN0aW9uXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV9mdW5jdGlvbiddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBhbHBoYVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydhbHBoYSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBiZXRhXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2JldGEnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbWVhblxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydtZWFuJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IHN0ZGRldlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydzdGRkZXYnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbGFtXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xhbSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtaW52YWxcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbWludmFsJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG1heHZhbFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydtYXh2YWwnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gc2VlZFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydzZWVkJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50J10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlIG1vZGVsIG1vZHVsZS5cclxuICAgKiBAbW9kdWxlIG1vZGVsL1RyYWluUGVyZm9ybWFuY2VcclxuICAgKiBAdmVyc2lvbiAxLjIuMlxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlRyYWluUGVyZm9ybWFuY2U8L2NvZGU+LlxyXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZVxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxyXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlRyYWluUGVyZm9ybWFuY2U8L2NvZGU+IGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbW9kZWxfaWQnKSkge1xyXG4gICAgICAgIG9ialsnbW9kZWxfaWQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21vZGVsX2lkJ10sICdTdHJpbmcnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndHJhaW5fc3RhdHVzJykpIHtcclxuICAgICAgICBvYmpbJ3RyYWluX3N0YXR1cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndHJhaW5fc3RhdHVzJ10sICdTdHJpbmcnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndHJhaW5fcGVyZm9ybWFuY2VfZGF0YScpKSB7XHJcbiAgICAgICAgb2JqWyd0cmFpbl9wZXJmb3JtYW5jZV9kYXRhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd0cmFpbl9wZXJmb3JtYW5jZV9kYXRhJ10sIFtUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50XSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IG1vZGVsX2lkXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21vZGVsX2lkJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7U3RyaW5nfSB0cmFpbl9zdGF0dXNcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsndHJhaW5fc3RhdHVzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50Pn0gdHJhaW5fcGVyZm9ybWFuY2VfZGF0YVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyd0cmFpbl9wZXJmb3JtYW5jZV9kYXRhJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuOFxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50ID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50IG1vZGVsIG1vZHVsZS5cclxuICAgKiBAbW9kdWxlIG1vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnRcclxuICAgKiBAdmVyc2lvbiAxLjEuOFxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQ8L2NvZGU+LlxyXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludFxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuXHJcblxyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQ8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cclxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnR9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludH0gVGhlIHBvcHVsYXRlZCA8Y29kZT5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50PC9jb2RlPiBpbnN0YW5jZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xyXG5cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Vwb2NoJykpIHtcclxuICAgICAgICBvYmpbJ2Vwb2NoJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydlcG9jaCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3N0ZXAnKSkge1xyXG4gICAgICAgIG9ialsnc3RlcCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc3RlcCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Nvc3QnKSkge1xyXG4gICAgICAgIG9ialsnY29zdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2N1cnJlbnRMZWFybmluZ1JhdGUnKSkge1xyXG4gICAgICAgIG9ialsnY3VycmVudExlYXJuaW5nUmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY3VycmVudExlYXJuaW5nUmF0ZSddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGVwb2NoXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2Vwb2NoJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBzdGVwXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3N0ZXAnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGNvc3RcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnY29zdCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gY3VycmVudExlYXJuaW5nUmF0ZVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydjdXJyZW50TGVhcm5pbmdSYXRlJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogRW51bSBjbGFzcyBUcmFpblN0YXR1cy5cclxuICAgKiBAZW51bSB7fVxyXG4gICAqIEByZWFkb25seVxyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0ge1xyXG4gICAgLyoqXHJcbiAgICAgKiB2YWx1ZTogXCJzdGFydFwiXHJcbiAgICAgKiBAY29uc3RcclxuICAgICAqL1xyXG4gICAgXCJzdGFydFwiOiBcInN0YXJ0XCIsXHJcbiAgICAvKipcclxuICAgICAqIHZhbHVlOiBcInBhdXNlXCJcclxuICAgICAqIEBjb25zdFxyXG4gICAgICovXHJcbiAgICBcInBhdXNlXCI6IFwicGF1c2VcIixcclxuICAgIC8qKlxyXG4gICAgICogdmFsdWU6IFwic3RvcFwiXHJcbiAgICAgKiBAY29uc3RcclxuICAgICAqL1xyXG4gICAgXCJzdG9wXCI6IFwic3RvcFwiLFxyXG4gICAgLyoqXHJcbiAgICAgKiB2YWx1ZTogXCJyZXN1bWVcIlxyXG4gICAgICogQGNvbnN0XHJcbiAgICAgKi9cclxuICAgIFwicmVzdW1lXCI6IFwicmVzdW1lXCIgIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybnMgYSA8Y29kZT5UcmFpblN0YXR1czwvY29kZT4gZW51bSB2YWx1ZSBmcm9tIGEgSmF2YXNjcmlwdCBvYmplY3QgbmFtZS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB0aGUgbmFtZSBvZiB0aGUgZW51bSB2YWx1ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9IFRoZSBlbnVtIDxjb2RlPlRyYWluU3RhdHVzPC9jb2RlPiB2YWx1ZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihvYmplY3QpIHtcclxuICAgIHJldHVybiBvYmplY3Q7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qXHJcbmNoZWNrIGlmIGNsaWVudCBhbmQgc2VydmVyIGFyZSBydW5uaW5nIGNvcnJlY3RseVxyXG4gKi9cclxudmFyIENvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHJlcXVpcmUoJ2NvbnZvbHV0aW9uYWxfYXV0b2VuY29kZXInKTtcclxuXHJcbnZhciBidWlsZEFwaSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuQnVpbGRBcGkoKTtcclxudmFyIGxvYWRBcGkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxvYWRBcGkoKTtcclxuXHJcbi8vIGNoZWNrIEFQSSBmdW5jdGlvbmFsaXR5XHJcbmZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBUEkgY2FsbGVkIHN1Y2Nlc3NmdWxseS4nKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gYnVpbGRBcGkuZ2V0SW5wdXRTaGFwZShbXSwgY2FsbGJhY2spO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHJlYWRMZWFybmluZ1BhcmFtZXRlcigpIHtcclxuXHJcbiAgICB2YXIgaW5wdXRQYXJhbWV0ZXJMaXN0ID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5QYXJhbWV0ZXJMaXN0KCk7XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QubWlycm9yX3dlaWdodHMgPSBbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaXJyb3JXZWlnaHRzXCIpLmNoZWNrZWRdO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LmFjdGl2YXRpb25fZnVuY3Rpb24gPSBbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhY3RpdmF0aW9uRnVuY3Rpb25cIikub3B0aW9uc1tkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFjdGl2YXRpb25GdW5jdGlvblwiKS5zZWxlY3RlZEluZGV4XS52YWx1ZV07XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QuYmF0Y2hfc2l6ZSA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYXRjaFNpemVcIikudmFsdWUpXTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5uX2Vwb2NocyA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuRXBvY2hzXCIpLnZhbHVlKV07XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QudXNlX3RlbnNvcmJvYXJkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ1c2VUZW5zb3Jib2FyZFwiKS5jaGVja2VkO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LnZlcmJvc2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInZlcmJvc2VcIikuY2hlY2tlZDtcclxuXHJcbiAgICB2YXIgbGVhcm5pbmdSYXRlRGljdCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuTGVhcm5pbmdSYXRlKCk7XHJcbiAgICBsZWFybmluZ1JhdGVEaWN0LmxlYXJuaW5nX3JhdGVfZnVuY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxlYXJuaW5nUmF0ZUZ1bmN0aW9uXCIpLm9wdGlvbnNbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsZWFybmluZ1JhdGVGdW5jdGlvblwiKS5zZWxlY3RlZEluZGV4XS52YWx1ZTtcclxuICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfaW5pdGlhbF9sZWFybmluZ19yYXRlID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxySW5pdGlhbExlYXJuaW5nUmF0ZVwiKS52YWx1ZSldO1xyXG4gICAgbGVhcm5pbmdSYXRlRGljdC5scl9kZWNheV9zdGVwcyA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsckRlY2F5U3RlcHNcIikudmFsdWUpXTtcclxuICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZGVjYXlfcmF0ZSA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsckRlY2F5UmF0ZVwiKS52YWx1ZSldO1xyXG4gICAgbGVhcm5pbmdSYXRlRGljdC5scl9zdGFpcmNhc2UgPSBbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsclN0YWlyY2FzZVwiKS5jaGVja2VkXTtcclxuICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfYm91bmRhcmllcyA9IFtKU09OLnBhcnNlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibHJCb3VuZGFyaWVzXCIpLnZhbHVlKV07XHJcbiAgICBsZWFybmluZ1JhdGVEaWN0LmxyX3ZhbHVlcyA9IFtKU09OLnBhcnNlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibHJWYWx1ZXNcIikudmFsdWUpXTtcclxuICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfZW5kX2xlYXJuaW5nX3JhdGUgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibHJFbmRMZWFybmluZ1JhdGVcIikudmFsdWUpXTtcclxuICAgIGxlYXJuaW5nUmF0ZURpY3QubHJfcG93ZXIgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibHJQb3dlclwiKS52YWx1ZSldO1xyXG4gICAgbGVhcm5pbmdSYXRlRGljdC5scl9jeWNsZSA9IFtkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxyQ3ljbGVcIikuY2hlY2tlZF07XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QubGVhcm5pbmdfcmF0ZV9kaWN0ID0gW2xlYXJuaW5nUmF0ZURpY3RdO1xyXG5cclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5vcHRpbWl6ZXIgPSBbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpbWl6ZXJcIikub3B0aW9uc1tkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGltaXplclwiKS5zZWxlY3RlZEluZGV4XS52YWx1ZV07XHJcbiAgICBpbnB1dFBhcmFtZXRlckxpc3QubW9tZW50dW0gPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTW9tZW50dW1cIikudmFsdWUpXTtcclxuXHJcbiAgICB2YXIgY29zdEZ1bmN0aW9uRGljdCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ29zdEZ1bmN0aW9uKCk7XHJcbiAgICBjb3N0RnVuY3Rpb25EaWN0LmNmX2Nvc3RfZnVuY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvc3RGdW5jdGlvbnNcIikub3B0aW9uc1tkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvc3RGdW5jdGlvbnNcIikuc2VsZWN0ZWRJbmRleF0udmFsdWU7XHJcbiAgICBjb3N0RnVuY3Rpb25EaWN0LmNmX21heF92YWwgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2ZNYXhWYWxcIikudmFsdWUpXTtcclxuICAgIGNvc3RGdW5jdGlvbkRpY3QuY2ZfZmlsdGVyX3NpemUgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2ZGaWx0ZXJTaXplXCIpLnZhbHVlKV07XHJcbiAgICBjb3N0RnVuY3Rpb25EaWN0LmNmX2ZpbHRlcl9zaWdtYSA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjZkZpbHRlclNpZ21hXCIpLnZhbHVlKV07XHJcbiAgICBjb3N0RnVuY3Rpb25EaWN0LmNmX2sxID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNmSzFcIikudmFsdWUpXTtcclxuICAgIGNvc3RGdW5jdGlvbkRpY3QuY2ZfazIgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2ZLMlwiKS52YWx1ZSldO1xyXG4gICAgY29zdEZ1bmN0aW9uRGljdC5jZl93ZWlnaHRzID0gW0pTT04ucGFyc2UoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjZldlaWdodHNcIikudmFsdWUpXTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5jb3N0X2Z1bmN0aW9uX2RpY3QgPSBbY29zdEZ1bmN0aW9uRGljdF07XHJcblxyXG4gICAgdmFyIHJhbmRvbVdlaWdodHNEaWN0ID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5SYW5kb21GdW5jdGlvbigpO1xyXG4gICAgcmFuZG9tV2VpZ2h0c0RpY3QucmFuZG9tX2Z1bmN0aW9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyYW5kb21GdW5jdGlvbkZvcldlaWdodHNcIikub3B0aW9uc1tkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJhbmRvbUZ1bmN0aW9uRm9yV2VpZ2h0c1wiKS5zZWxlY3RlZEluZGV4XS52YWx1ZTtcclxuICAgIHJhbmRvbVdlaWdodHNEaWN0LmFscGhhID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ3QWxwaGFcIikudmFsdWUpXTtcclxuICAgIHJhbmRvbVdlaWdodHNEaWN0LmJldGEgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicndCZXRhXCIpLnZhbHVlKV07XHJcbiAgICByYW5kb21XZWlnaHRzRGljdC5tZWFuID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ3TWVhblwiKS52YWx1ZSldO1xyXG4gICAgcmFuZG9tV2VpZ2h0c0RpY3Quc3RkZGV2ID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ3U3RkZGV2XCIpLnZhbHVlKV07XHJcbiAgICByYW5kb21XZWlnaHRzRGljdC5sYW0gPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicndMYW1cIikudmFsdWUpXTtcclxuICAgIHJhbmRvbVdlaWdodHNEaWN0Lm1pbnZhbCA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyd01pbnZhbFwiKS52YWx1ZSldO1xyXG4gICAgcmFuZG9tV2VpZ2h0c0RpY3QubWF4dmFsID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ3TWF4dmFsXCIpLnZhbHVlKV07XHJcbiAgICByYW5kb21XZWlnaHRzRGljdC5zZWVkID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJ3U2VlZFwiKS52YWx1ZSldO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LnJhbmRvbV93ZWlnaHRzX2RpY3QgPSBbcmFuZG9tV2VpZ2h0c0RpY3RdO1xyXG5cclxuICAgIHZhciByYW5kb21CaWFzZXNEaWN0ID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5SYW5kb21GdW5jdGlvbigpO1xyXG4gICAgcmFuZG9tQmlhc2VzRGljdC5yYW5kb21fZnVuY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJhbmRvbUZ1bmN0aW9uRm9yQmlhc2VzXCIpLm9wdGlvbnNbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyYW5kb21GdW5jdGlvbkZvckJpYXNlc1wiKS5zZWxlY3RlZEluZGV4XS52YWx1ZTtcclxuICAgIHJhbmRvbUJpYXNlc0RpY3QuYWxwaGEgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmJBbHBoYVwiKS52YWx1ZSldO1xyXG4gICAgcmFuZG9tQmlhc2VzRGljdC5iZXRhID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJiQmV0YVwiKS52YWx1ZSldO1xyXG4gICAgcmFuZG9tQmlhc2VzRGljdC5tZWFuID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJiTWVhblwiKS52YWx1ZSldO1xyXG4gICAgcmFuZG9tQmlhc2VzRGljdC5zdGRkZXYgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmJTdGRkZXZcIikudmFsdWUpXTtcclxuICAgIHJhbmRvbUJpYXNlc0RpY3QubGFtID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJiTGFtXCIpLnZhbHVlKV07XHJcbiAgICByYW5kb21CaWFzZXNEaWN0Lm1pbnZhbCA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyYk1pbnZhbFwiKS52YWx1ZSldO1xyXG4gICAgcmFuZG9tQmlhc2VzRGljdC5tYXh2YWwgPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmJNYXh2YWxcIikudmFsdWUpXTtcclxuICAgIHJhbmRvbUJpYXNlc0RpY3Quc2VlZCA9IFtOdW1iZXIoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyYlNlZWRcIikudmFsdWUpXTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5yYW5kb21fYmlhc2VzX2RpY3QgPSBbcmFuZG9tQmlhc2VzRGljdF07XHJcblxyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0LnNlc3Npb25fc2F2ZXJfcGF0aCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2Vzc2lvblNhdmVyUGF0aFwiKS52YWx1ZTtcclxuICAgIGlucHV0UGFyYW1ldGVyTGlzdC5zZXNzaW9uX3NhdmVfZHVyYXRpb24gPSBbTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2Vzc2lvblNhdmVEdXJhdGlvblwiKS52YWx1ZSldO1xyXG4gICAgaW5wdXRQYXJhbWV0ZXJMaXN0Lm51bV90ZXN0X3BpY3R1cmVzID0gW051bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm51bVRlc3RQaWN0dXJlc1wiKS52YWx1ZSldO1xyXG5cclxuXHJcbiAgICByZXR1cm4gaW5wdXRQYXJhbWV0ZXJMaXN0O1xyXG59XHJcblxyXG5cclxuLypcclxuQ29udm9sdXRpb25hbCBBdXRvIEVuY29kZXIgdG9wb2xvZ3lcclxuICovXHJcblxyXG5cclxuLypcclxuR2xvYmFsIFZhcmlhYmxlc1xyXG4gKi9cclxudmFyIGlucHV0U2hhcGUgPSBbMSwgMSwgMSwgMV07XHJcbnZhciBkYXRhc2V0bmFtZSA9IFwiXCI7XHJcblxyXG4vLyB2YXIgcHJldmlld0xheWVyID0gbmV3IEFOTkxheWVyUHJldmlldyg1MDAsIDUwMCwgMjgsIDI4LCAzLCAzLCBudWxsLCB0cnVlLCBmYWxzZSwgbnVsbCk7XHJcblxyXG4vKlxyXG5IZWxwZXIgZnVuY3Rpb25zXHJcbiAqL1xyXG5cclxuLy8gZ2V0IGlucHV0IChvdXRwdXQpIGRpbWVuc2lvbnNcclxuZnVuY3Rpb24gZ2V0SW5wdXREaW1lbnNpb25zKCkge1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBpbnB1dFNoYXBlQ2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgLy91cGRhdGUgZGF0YSBzdGF0aXN0aWNzOlxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxhYmVsUmVzb2x1dGlvblwiKS50ZXh0Q29udGVudCA9IFwiUmVzb2x1dGlvbjogXCIgKyBkYXRhWzFdICsgXCJweCB4IFwiICsgZGF0YVsyXSArIFwicHhcIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYWJlbExheWVyXCIpLnRleHRDb250ZW50ID0gXCJMYXllcjogXCIgKyBkYXRhWzNdO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxhYmVsTnVtYmVyT2ZJbWFnZXNcIikudGV4dENvbnRlbnQgPSBcIk51bWJlciBvZiBJbWFnZXM6IFwiICsgZGF0YVswXTtcclxuXHJcbiAgICAgICAgICAgIC8vdXBkYXRlIGlucHV0IHNoYXBlOlxyXG4gICAgICAgICAgICBpbnB1dFNoYXBlID0gZGF0YTtcclxuXHJcbiAgICAgICAgICAgIC8vIGFkZCBwbGFjZWhvbGRlciBmb3IgZmlyc3QgZGltOlxyXG4gICAgICAgICAgICBpbnB1dFNoYXBlWzBdID0gLTE7XHJcblxyXG4gICAgICAgICAgICAvLyB1cGRhdGUgdG9wb2xvZ3kgaW5wdXQgb3V0cHV0IGxheWVyczpcclxuICAgICAgICAgICAgdXBkYXRlSW5wdXRPdXRwdXRMYXllcihpbnB1dFNoYXBlWzFdLCBpbnB1dFNoYXBlWzJdLCBpbnB1dFNoYXBlWzNdKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRhdGFzZXRuYW1lICE9PSBcIlwiKSB7XHJcbiAgICAgICAgYnVpbGRBcGkuZ2V0SW5wdXRTaGFwZSh7J2RhdGFzZXROYW1lJzogZGF0YXNldG5hbWV9LCBpbnB1dFNoYXBlQ2FsbGJhY2spXHJcbiAgICB9XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVJbnB1dE91dHB1dExheWVyKHJlc1gsIHJlc1ksIGNoYW5uZWxzKSB7XHJcbiAgICAvLyByZW1vdmUgcHJldmlvdXMgaW5wdXQvb3V0cHV0IGxheWVyXHJcbiAgICB2YXIgaW5wdXRMYXllciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRfbGF5ZXJcIik7XHJcbiAgICB2YXIgb3V0cHV0TGF5ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm91dHB1dF9sYXllclwiKTtcclxuICAgIGlmIChpbnB1dExheWVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgaW5wdXRMYXllci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGlucHV0TGF5ZXIpO1xyXG4gICAgfVxyXG4gICAgaWYgKG91dHB1dExheWVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgb3V0cHV0TGF5ZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChvdXRwdXRMYXllcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy9hZGQgdmlzdWFsaXNhdGlvbjpcclxuICAgIGlucHV0T3V0cHV0TGF5ZXJQYWlyID0gbmV3IEFOTkxheWVyUGFpcigyMDAsIDIwMCwgcmVzWCwgcmVzWSwgY2hhbm5lbHMsIDMsIFwiaW5wdXRfb3V0cHV0X2xheWVyXCIpO1xyXG5cclxuICAgIC8vIHVwZGF0ZSBnbG9iYWwgdmFyaWFibGU6XHJcbiAgICBpbnB1dExheWVyRGltID0gW3Jlc1gsIHJlc1ldO1xyXG5cclxuICAgIC8vIHNldCBpbnB1dCBvdXRwdXQgbGF5ZXIgYXMgcHJldmlldzpcclxuICAgIGFubkxheWVyUHJldmlldy5zZXRMaW5rZWRMYXllcigwKTtcclxuXHJcbiAgICAvLyByZW51bWJlciBsYXllclxyXG4gICAgcmVudW1iZXJMYXllcnMoKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEF2YWlsYWJsZURhdGFTZXRzKCkge1xyXG4gICAgZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdsb2FkZWQgZGF0YSBzZXRzIHJldHJpZXZlZCcpO1xyXG4gICAgICAgICAgICAvLyByZXBsYWNlIG9wdGlvbnMgaW4gJ0xvYWRlZCBkYXRhIHNldHMnIHNlbGVjdGlvblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgdmFyIHNlbGVjdGlvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRMb2FkZWREYXRhU2V0c1wiKTtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIHByZXZpb3VzIG9wdGlvbnNcclxuICAgICAgICAgICAgc2VsZWN0aW9uLm9wdGlvbnMubGVuZ3RoID0gMDtcclxuICAgICAgICAgICAgLy8gYWRkIGF2YWlsYWJsZSBmaWxlIG5hbWVzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uLm9wdGlvbnNbaV0gPSBuZXcgT3B0aW9uKGRhdGFbaV0sIGRhdGFbaV0sIGZhbHNlLCBmYWxzZSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc2VsZWN0aW9uLm9wdGlvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gc2VsZWN0IGZpcnN0IGVsZW1lbnQ6XHJcbiAgICAgICAgICAgICAgICBzZWxlY3Rpb24ub3B0aW9uc1swXS5zZWxlY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBzZWxlY3RMb2FkZWREYXRhc2V0KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRBcGkuZ2V0TG9hZGVkRGF0YVNldHMoY2FsbGJhY2spO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWxlY3RMb2FkZWREYXRhc2V0KCkge1xyXG4gICAgZGF0YXNldG5hbWUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0TG9hZGVkRGF0YVNldHNcIikub3B0aW9uc1tkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0TG9hZGVkRGF0YVNldHNcIikuc2VsZWN0ZWRJbmRleF0udmFsdWU7XHJcbiAgICBnZXRJbnB1dERpbWVuc2lvbnMoKTtcclxufVxyXG5cclxuLypmdW5jdGlvbiByZW51bWJlckxheWVycygpIHtcclxuICAgIHZhciBsYXllckRpdiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZW5jb2RlclwiKS5jaGlsZE5vZGVzO1xyXG4gICAgY29uc29sZS5sb2cobGF5ZXJEaXYpO1xyXG4gICAgdmFyIGkgPSAxO1xyXG4gICAgZm9yICh2YXIgY2hpbGQgaW4gbGF5ZXJEaXYpIHtcclxuICAgICAgICBpZiAobGF5ZXJEaXZbY2hpbGRdLnRhZ05hbWUgPT09ICdESVYnKSB7XHJcbiAgICAgICAgICAgIGlmIChsYXllckRpdltjaGlsZF0uaWQuc3RhcnRzV2l0aChcImVuY29kZXJMYXllcl9cIikpIHtcclxuICAgICAgICAgICAgICAgIGxheWVyRGl2W2NoaWxkXS5pZCA9IFwiZW5jb2RlckxheWVyX1wiICsgaTtcclxuICAgICAgICAgICAgICAgIC8vIGFkanVzdCBsYXllciB0ZXh0OlxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobGF5ZXJEaXZbY2hpbGRdLmNoaWxkTm9kZXNbMF0pO1xyXG4gICAgICAgICAgICAgICAgbGF5ZXJEaXZbY2hpbGRdLmNoaWxkTm9kZXNbMF0udGV4dENvbnRlbnQgPSBcIkVuY29kZXIgTGF5ZXIgXCIgKyBpICsgXCI6IFwiO1xyXG4gICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGktLTtcclxuICAgIGxheWVyRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZWNvZGVyXCIpLmNoaWxkTm9kZXM7XHJcbiAgICBjb25zb2xlLmxvZyhsYXllckRpdik7XHJcbiAgICBmb3IgKHZhciBjaGlsZCBpbiBsYXllckRpdikge1xyXG4gICAgICAgIGlmIChsYXllckRpdltjaGlsZF0udGFnTmFtZSA9PT0gJ0RJVicpIHtcclxuICAgICAgICAgICAgaWYgKGxheWVyRGl2W2NoaWxkXS5pZC5zdGFydHNXaXRoKFwiZGVjb2RlckxheWVyX1wiKSkge1xyXG4gICAgICAgICAgICAgICAgbGF5ZXJEaXZbY2hpbGRdLmlkID0gXCJkZWNvZGVyTGF5ZXJfXCIgKyBpO1xyXG4gICAgICAgICAgICAgICAgLy8gYWRqdXN0IGxheWVyIHRleHQ6XHJcbiAgICAgICAgICAgICAgICBsYXllckRpdltjaGlsZF0uY2hpbGROb2Rlc1swXS50ZXh0Q29udGVudCA9IFwiRGVjb2RlciBMYXllciBcIiArIGkgKyBcIjogXCI7XHJcbiAgICAgICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgLy8gbGF5ZXJEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlY29kZXJcIikuY2hpbGROb2RlcztcclxuICAgIC8vIGkgPSAxO1xyXG4gICAgLy8gZm9yKHZhciBjaGlsZCBpbiBsYXllckRpdil7XHJcbiAgICAvLyAgICAgbGF5ZXJEaXZbY2hpbGRdLmlkID0gXCJkZWNvZGVyTGF5ZXJfXCIgKyBpO1xyXG4gICAgLy8gICAgIGkrKztcclxuICAgIC8vIH1cclxuXHJcbn0qL1xyXG5cclxuXHJcbmZ1bmN0aW9uIGJ1aWxkQU5OKCkge1xyXG4gICAgLy8gZ2V0IEFOTiB0b3BvbG9neTpcclxuICAgIHZhciBmaWx0ZXJTaXplcyA9IFtpbnB1dE91dHB1dExheWVyUGFpci5nZXRGaWx0ZXJTaXplKCldO1xyXG4gICAgdmFyIG51bVN0YWNrcyA9IFtpbnB1dE91dHB1dExheWVyUGFpci5nZXRTdGFja0NvdW50KCldO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGlucHV0T3V0cHV0TGF5ZXJQYWlyLmdldEZpbHRlclNpemUoKSk7XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbmNvZGVyRGVjb2RlckxheWVyUGFpcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBmaWx0ZXJTaXplcy5wdXNoKGVuY29kZXJEZWNvZGVyTGF5ZXJQYWlyc1tpXS5nZXRGaWx0ZXJTaXplKCkpO1xyXG4gICAgICAgIG51bVN0YWNrcy5wdXNoKGVuY29kZXJEZWNvZGVyTGF5ZXJQYWlyc1tpXS5nZXRTdGFja0NvdW50KCkpO1xyXG4gICAgfVxyXG4gICAgLy8gdmFyIG51bUVuY29kZXJMYXllcnMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVuY29kZXJcIikuY2hpbGRFbGVtZW50Q291bnQ7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhudW1FbmNvZGVyTGF5ZXJzKTtcclxuICAgIC8vIGZvciAodmFyIGkgPSAxOyBpIDwgbnVtRW5jb2RlckxheWVyczsgaSsrKSB7XHJcbiAgICAvLyAgICAgLy8gZ2V0IGZpbHRlcnNpemUgb2YgY3VycmVudCBsYXllcjpcclxuICAgIC8vICAgICBmaWx0ZXJTaXplcy5wdXNoKE51bWJlcihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImZpbHRlcnNpemVFTFwiICsgaSkudmFsdWUpKTtcclxuICAgIC8vICAgICAvLyBnZXQgbnVtYmVyIG9mIFN0YWNrcyBvZiBjdXJyZW50IGxheWVyXHJcbiAgICAvLyAgICAgbnVtU3RhY2tzLnB1c2goTnVtYmVyKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibnVtU3RhY2tzRUxcIiArIGkpLnZhbHVlKSk7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgLy8gdmFyIGxheWVyRGl2ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlbmNvZGVyXCIpLmNoaWxkTm9kZXM7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhsYXllckRpdik7XHJcbiAgICAvLyB2YXIgaSA9IDE7XHJcbiAgICAvLyBmb3IgKHZhciBjaGlsZCBpbiBsYXllckRpdikge1xyXG4gICAgLy8gICAgIGlmIChsYXllckRpdltjaGlsZF0udGFnTmFtZSA9PT0gJ0RJVicpIHtcclxuICAgIC8vICAgICAgICAgLy8gZ2V0IGZpbHRlcnNpemUgb2YgY3VycmVudCBsYXllcjpcclxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2cobGF5ZXJEaXZbY2hpbGRdLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJmaWx0ZXJfZGVzY3JpcHRpb25cIilbMF0pO1xyXG4gICAgLy8gICAgICAgICB2YXIgZmlsdGVyU2l6ZSA9IE51bWJlcihsYXllckRpdltjaGlsZF0uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcImZpbHRlcl9kZXNjcmlwdGlvblwiKVswXS50ZXh0Q29udGVudFxyXG4gICAgLy8gICAgICAgICAgICAgLnNwbGl0KCc6JylbMV0pO1xyXG4gICAgLy8gICAgICAgICAvLyBnZXQgbnVtYmVyIG9mIFN0YWNrcyBvZiBjdXJyZW50IGxheWVyXHJcbiAgICAvLyAgICAgICAgIHZhciBzdGFja0NvdW50ID0gTnVtYmVyKGxheWVyRGl2W2NoaWxkXS5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKFwic3RhY2tfZGVzY3JpcHRpb25cIilbMF0udGV4dENvbnRlbnRcclxuICAgIC8vICAgICAgICAgICAgIC5zcGxpdCgnOicpWzFdKTtcclxuICAgIC8vXHJcbiAgICAvLyAgICAgICAgIC8vIGFkZCBjdXJyZW50IGxheWVyIHByb3BlcnRpZXMgdG8gYXJyYXlzXHJcbiAgICAvLyAgICAgICAgIGZpbHRlclNpemVzLnB1c2goZmlsdGVyU2l6ZSk7XHJcbiAgICAvLyAgICAgICAgIG51bVN0YWNrcy5wdXNoKHN0YWNrQ291bnQpO1xyXG4gICAgLy9cclxuICAgIC8vICAgICB9XHJcbiAgICAvL1xyXG4gICAgLy8gfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGlucHV0U2hhcGUpO1xyXG4gICAgY29uc29sZS5sb2coZmlsdGVyU2l6ZXMpO1xyXG4gICAgY29uc29sZS5sb2cobnVtU3RhY2tzKTtcclxuICAgIC8vIGdldCBsZWFybmluZyBwYXJhbWV0ZXJzIChzaWRlYmFyKTpcclxuICAgIHZhciBpbnB1dFBhcmFtZXRlcnMgPSByZWFkTGVhcm5pbmdQYXJhbWV0ZXIoKTtcclxuXHJcbiAgICAvLyBzYXZlIHRvcG9sb2d5IGluZm9ybWF0aW9uXHJcbiAgICBpbnB1dFBhcmFtZXRlcnMuaW5wdXRfc2hhcGUgPSBbaW5wdXRTaGFwZV07XHJcbiAgICBpbnB1dFBhcmFtZXRlcnMuZmlsdGVyX3NpemVzID0gW2ZpbHRlclNpemVzXTtcclxuICAgIGlucHV0UGFyYW1ldGVycy5udW1iZXJfb2Zfc3RhY2tzID0gW251bVN0YWNrc107XHJcblxyXG4gICAgY29uc29sZS5sb2coaW5wdXRQYXJhbWV0ZXJzKTtcclxuXHJcblxyXG4gICAgLypcclxuICAgICAgICBpbml0aWFsaXplIEFQSSBjYWxsXHJcbiAgICAgKi9cclxuXHJcbiAgICB2YXIgYnVpbGRBcGkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkJ1aWxkQXBpKCk7XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3BvbnNlTGFiZWxcIikudGV4dENvbnRlbnQgPSByZXNwb25zZS50ZXh0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBidWlsZEFwaS5idWlsZEFOTihpbnB1dFBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuXHJcblxyXG59XHJcblxyXG5cclxuLypcclxuRXZlbnQgTGlzdGVuZXJcclxuICovXHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYnVpbGRBTk5cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGJ1aWxkQU5OKTtcclxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dExvYWRlZERhdGFTZXRzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgc2VsZWN0TG9hZGVkRGF0YXNldCk7XHJcblxyXG5cclxuLypcclxub24gbG9hZFxyXG4gKi9cclxuXHJcbmdldEF2YWlsYWJsZURhdGFTZXRzKCk7XHJcbi8vIGdldElucHV0RGltZW5zaW9ucygpO1xyXG5cclxuXHJcbi8vIGFkZCBzYW1wbGUgQU5OXHJcbmFkZExheWVyKG51bGwsIDMsIDEyKTtcclxuLy9hZGRMYXllcihudWxsLCAyLCA2KTtcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4iXX0=
