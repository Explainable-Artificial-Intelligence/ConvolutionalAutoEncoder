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
        function isArrayBufferView(obj) {
            return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
        }

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":4}],4:[function(require,module,exports){
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

    }, {"../ApiClient": 16, "../model/ParameterList": 29}],
    18: [function (require, module, exports) {
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

    }, {"../ApiClient": 16, "../model/ImageData": 27}],
    19: [function (require, module, exports) {
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
        "../ApiClient": 16,
        "../model/ProcessedImageData": 31,
        "../model/TrainPerformance": 33,
        "../model/TrainStatus": 35
    }],
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
        "../ApiClient": 16,
        "../model/ParameterList": 29,
        "../model/ProcessedImageData": 31,
        "../model/TrainPerformance": 33,
        "../model/TrainStatus": 35
    }],
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
          var contentTypes = [];
          var accepts = ['multipart/form-data'];
          var returnType = File;

          return this.apiClient.callApi(
              '/visualize/getPretrainedModelAsZip', 'POST',
              pathParams, queryParams, collectionQueryParams, headerParams, formParams, postBody,
              authNames, contentTypes, accepts, returnType, callback
          );
      }
  };

  return exports;
}));

    }, {
        "../ApiClient": 16,
        "../model/ClusterParameters": 23,
        "../model/Clustering": 24,
        "../model/Image": 26,
        "../model/Point2D": 30
    }],
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
        "./model/TrainPerformanceDataPoint": 34,
        "./model/TrainStatus": 35
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


    }, {"../ApiClient": 16, "./Point2D": 30}],
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


    }, {"../ApiClient": 16}],
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


    }, {"../ApiClient": 16}],
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


    }, {"../ApiClient": 16, "./Image": 26}],
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


    }, {"../ApiClient": 16}],
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


    }, {"../ApiClient": 16, "./CostFunction": 25, "./LearningRate": 28, "./RandomFunction": 32}],
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


    }, {"../ApiClient": 16}],
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


    }, {"../ApiClient": 16, "./Image": 26}],
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


    }, {"../ApiClient": 16}],
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


    }, {"../ApiClient": 16, "./TrainPerformanceDataPoint": 34}],
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


    }, {"../ApiClient": 16}],
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


    }, {"../ApiClient": 16}],
    36: [function (require, module, exports) {
/*
Includes
 */
var ConvolutionalAutoencoder = require('convolutional_autoencoder');

/*
Global variables
 */
var trainApi = new ConvolutionalAutoencoder.TrainApi();
        var loadApi = new ConvolutionalAutoencoder.LoadApi();
        var buildApi = new ConvolutionalAutoencoder.BuildApi();


        /*
        API test
         */
        function callback(error, data, response) {
            if (error) {
                console.error(error);
            } else {
                console.log('API called successfully.');
            }
        }

        loadApi.resetAllBatchIndices(callback);

        /*
        Global variables
         */
        var trainTimer;
        var currentTrainImageEpoch = 0;
        var datasetname = "train_data";
        var inputShape = [1, 1, 1, 1];
        var annInputShape = [1, 1, 1, 1];

        /*
        Helper function
         */
        function getAnnInputDimension() {
            function callback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log('parameter set received');
                    console.log(data);
                    annInputShape = data.input_shape[0];
                }
            }

            buildApi.getANNParameter(callback);
        }

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
                }
            }

            buildApi.getInputShape({'datasetName': datasetname}, inputShapeCallback)
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
                        checkInputDimensions(selection.options[i]);
                    }
                    // select first element:
                    selection.options[0].selected = true;
                    selectLoadedDataset();
                }
            }

            loadApi.getLoadedDataSets(callback);
        }

        function checkInputDimensions(option) {
            // disable option to prevent errors:
            option.disabled = true;

            // activate again if
            function inputShapeCallback(error, data, response) {
                if (error) {
                    console.error(error);
                } else {
                    console.log(data);
                    console.log(annInputShape);

                    // disable option if input shape doesn't fit the ANN:

                    if (data[1] === annInputShape[1]) {
                        if (data[2] === annInputShape[2]) {
                            if (data[3] === annInputShape[3]) {
                                option.disabled = false;
                            }
                        }
                    }
                }
            }

            buildApi.getInputShape({'datasetName': option.value}, inputShapeCallback)


        }

        function selectLoadedDataset() {
            datasetname = document.getElementById("inputLoadedDataSets").options[document.getElementById("inputLoadedDataSets").selectedIndex].value;
            getInputDimensions();
        }

/*
Charts
 */
        var costChart = new LineChart("charts", 500, 500, "step", "cost", "steps", "cost", {'cost': 'lightblue'});
// add line break
// document.getElementById("charts").appendChild(document.createElement("br"));
        var learningRateChart = new LineChart("charts", 500, 500, "step", "currentLearningRate", "steps", "learning rate",
            {'learning rate': 'lightblue'});
// add line break
        document.getElementById("charts").appendChild(document.createElement("br"));
        var epochImages = new ImageGrid(document.getElementById("contentFullWidth"), 9);


function updateTrainImages() {
    var callback = function (error, data, response) {
        if (error) {
            console.error(error);
        } else {
            //console.log(response);
            //console.log(data);

            // //get image pane
            // var imageGrid = document.getElementById("imageGrid");
            //
            // // remove all previous elements:
            // imageGrid.innerHTML = "";

            // add image pairs
            // for (var i = 0; i < data.inputLayer.length; i++) {
            //     // create new table row:
            //     var tableRow = document.createElement("tr");
            //
            //
            //     // create cell for input image
            //     var inputCell = document.createElement("td");
            //     // create new input image object
            //     var newInputImage = document.createElement("img");
            //     newInputImage.id = "InputImage_" + data.inputLayer[i].id;
            //     newInputImage.src = "data:image/png;base64," + data.inputLayer[i].bytestring.substring(2,
            //         data.inputLayer[i].bytestring.length - 1);
            //     newInputImage.style.width = "160px";
            //     newInputImage.class = "imageThumbnail";
            //
            //     // append new image to image grid
            //     inputCell.appendChild(newInputImage);
            //     tableRow.appendChild(inputCell);
            //
            //     // create new latent image object
            //     var latentCell = document.createElement("td");
            //     for (var j = 0; j < data.latentLayer[i].length; j++) {
            //         var newLatentImage = document.createElement("img");
            //         newLatentImage.id = "LatentImage_" + data.latentLayer[i][j].id + "_" + j;
            //         newLatentImage.src = "data:image/png;base64," + data.latentLayer[i][j].bytestring.substring(2,
            //             data.latentLayer[i][j].bytestring.length - 1);
            //         newLatentImage.style.width = "40px";
            //         newLatentImage.class = "imageThumbnail";
            //         // append new image div to image grid
            //         latentCell.appendChild(newLatentImage);
            //         if ((j + 1) % 4 === 0) { //Math.ceil(Math.sqrt(data.latentLayer[i].length))
            //             latentCell.appendChild(document.createElement('br'));
            //         }
            //
            //     }
            //     // append new image div to image grid
            //     tableRow.appendChild(latentCell);
            //
            //
            //     /*// add eventListener
            //     // change preview view
            //     newInputImage.addEventListener("click", function () {
            //         console.log(this.id);
            //         document.getElementById("imagePreview").src = this.src;
            //     });*/
            //
            //     // create cell for input image
            //     var outputCell = document.createElement("td");
            //     // create new output image object
            //     var newOutputImage = document.createElement("img");
            //     newOutputImage.id = "OutputImage_" + data.outputLayer[i].id;
            //     newOutputImage.src = "data:image/png;base64," + data.outputLayer[i].bytestring.substring(2,
            //         data.outputLayer[i].bytestring.length - 1);
            //     newOutputImage.style.width = "160px";
            //     newOutputImage.class = "imageThumbnail";
            //
            //     // append new image to image grid
            //     outputCell.appendChild(newOutputImage);
            //     tableRow.appendChild(outputCell);
            //
            //     imageGrid.appendChild(tableRow);
            //
            //
            // }

            //add images epochwise
            if (data.epoch > currentTrainImageEpoch) {

                //create new column:
                epochImages.addNewImageColumn(data);

                currentTrainImageEpoch = data.epoch;
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

            //update cost diagram
            if (data.train_performance_data.length > 0) {
                costChart.appendData({'cost': data.train_performance_data});
                learningRateChart.appendData({'learning rate': data.train_performance_data});
            }

            if (data.train_status === "finished") {
                // stop update timer
                clearInterval(trainTimer);

                // print status
                console.log("Training finished");
                console.log("Final step: " + costChart.getLatestXValue('cost'));
                document.getElementById("responseLabel").textContent = "Training finished.  Final step: "
                    + costChart.getLatestXValue('cost');
            }

        }


    };

    trainApi.getTrainPerformance(callback);
}

function updateView() {
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

            // abort if no model is available:
            if (response.statusCode === 204) {
                document.getElementById("responseLabel").textContent = "No CAE model available to train";
                return;
            }

            document.getElementById("responseLabel").textContent = response.text;
            // start update timer
            trainTimer = setInterval(updateView, 500);
        }
    }

    trainApi.controlTraining('"start"', {"datasetName": datasetname}, callback);
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
        document.getElementById("inputLoadedDataSets").addEventListener("change", selectLoadedDataset);
document.getElementById("startTraining").addEventListener("click", startTraining);
document.getElementById("stopTraining").addEventListener("click", stopTraining);

        getAnnInputDimension();
        getAvailableDataSets();


    }, {"convolutional_autoencoder": 22}]
}, {}, [36])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9iYXNlNjQtanMvaW5kZXguanMiLCJDOi9Vc2Vycy9MZW9uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZW5jb2RlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvaW5kZXguanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvY29tcG9uZW50LWVtaXR0ZXIvaW5kZXguanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvY2xpZW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2lzLWZ1bmN0aW9uLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2lzLW9iamVjdC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9yZXF1ZXN0LWJhc2UuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvcmVzcG9uc2UtYmFzZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9zaG91bGQtcmV0cnkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvdXRpbHMuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvQXBpQ2xpZW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2FwaS9CdWlsZEFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvTG9hZEFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvVHJhaW5BcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL1R1bmVBcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL1Zpc3VhbGl6ZUFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9pbmRleC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9DbHVzdGVyUGFyYW1ldGVycy5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9DbHVzdGVyaW5nLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0Nvc3RGdW5jdGlvbi5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9JbWFnZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9JbWFnZURhdGEuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvTGVhcm5pbmdSYXRlLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1BhcmFtZXRlckxpc3QuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUG9pbnQyRC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUmFuZG9tRnVuY3Rpb24uanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvVHJhaW5QZXJmb3JtYW5jZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1RyYWluU3RhdHVzLmpzIiwidHJhaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcjZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9rQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNybEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1bEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIid1c2Ugc3RyaWN0J1xuXG5leHBvcnRzLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5leHBvcnRzLnRvQnl0ZUFycmF5ID0gdG9CeXRlQXJyYXlcbmV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IGZyb21CeXRlQXJyYXlcblxudmFyIGxvb2t1cCA9IFtdXG52YXIgcmV2TG9va3VwID0gW11cbnZhciBBcnIgPSB0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcgPyBVaW50OEFycmF5IDogQXJyYXlcblxudmFyIGNvZGUgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLydcbmZvciAodmFyIGkgPSAwLCBsZW4gPSBjb2RlLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gIGxvb2t1cFtpXSA9IGNvZGVbaV1cbiAgcmV2TG9va3VwW2NvZGUuY2hhckNvZGVBdChpKV0gPSBpXG59XG5cbnJldkxvb2t1cFsnLScuY2hhckNvZGVBdCgwKV0gPSA2MlxucmV2TG9va3VwWydfJy5jaGFyQ29kZUF0KDApXSA9IDYzXG5cbmZ1bmN0aW9uIHBsYWNlSG9sZGVyc0NvdW50IChiNjQpIHtcbiAgdmFyIGxlbiA9IGI2NC5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0JylcbiAgfVxuXG4gIC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG4gIC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcbiAgLy8gcmVwcmVzZW50IG9uZSBieXRlXG4gIC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuICAvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG4gIHJldHVybiBiNjRbbGVuIC0gMl0gPT09ICc9JyA/IDIgOiBiNjRbbGVuIC0gMV0gPT09ICc9JyA/IDEgOiAwXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKGI2NCkge1xuICAvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcbiAgcmV0dXJuIChiNjQubGVuZ3RoICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzQ291bnQoYjY0KVxufVxuXG5mdW5jdGlvbiB0b0J5dGVBcnJheSAoYjY0KSB7XG4gIHZhciBpLCBsLCB0bXAsIHBsYWNlSG9sZGVycywgYXJyXG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIHBsYWNlSG9sZGVycyA9IHBsYWNlSG9sZGVyc0NvdW50KGI2NClcblxuICBhcnIgPSBuZXcgQXJyKChsZW4gKiAzIC8gNCkgLSBwbGFjZUhvbGRlcnMpXG5cbiAgLy8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuICBsID0gcGxhY2VIb2xkZXJzID4gMCA/IGxlbiAtIDQgOiBsZW5cblxuICB2YXIgTCA9IDBcblxuICBmb3IgKGkgPSAwOyBpIDwgbDsgaSArPSA0KSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTgpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDEyKSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDIpXSA8PCA2KSB8IHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMyldXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDE2KSAmIDB4RkZcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICBpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPj4gNClcbiAgICBhcnJbTCsrXSA9IHRtcCAmIDB4RkZcbiAgfSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcbiAgICB0bXAgPSAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkpXSA8PCAxMCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAxKV0gPDwgNCkgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPj4gMilcbiAgICBhcnJbTCsrXSA9ICh0bXAgPj4gOCkgJiAweEZGXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH1cblxuICByZXR1cm4gYXJyXG59XG5cbmZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG4gIHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXVxufVxuXG5mdW5jdGlvbiBlbmNvZGVDaHVuayAodWludDgsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHRtcFxuICB2YXIgb3V0cHV0ID0gW11cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpICs9IDMpIHtcbiAgICB0bXAgPSAodWludDhbaV0gPDwgMTYpICsgKHVpbnQ4W2kgKyAxXSA8PCA4KSArICh1aW50OFtpICsgMl0pXG4gICAgb3V0cHV0LnB1c2godHJpcGxldFRvQmFzZTY0KHRtcCkpXG4gIH1cbiAgcmV0dXJuIG91dHB1dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmcm9tQnl0ZUFycmF5ICh1aW50OCkge1xuICB2YXIgdG1wXG4gIHZhciBsZW4gPSB1aW50OC5sZW5ndGhcbiAgdmFyIGV4dHJhQnl0ZXMgPSBsZW4gJSAzIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG4gIHZhciBvdXRwdXQgPSAnJ1xuICB2YXIgcGFydHMgPSBbXVxuICB2YXIgbWF4Q2h1bmtMZW5ndGggPSAxNjM4MyAvLyBtdXN0IGJlIG11bHRpcGxlIG9mIDNcblxuICAvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG4gIGZvciAodmFyIGkgPSAwLCBsZW4yID0gbGVuIC0gZXh0cmFCeXRlczsgaSA8IGxlbjI7IGkgKz0gbWF4Q2h1bmtMZW5ndGgpIHtcbiAgICBwYXJ0cy5wdXNoKGVuY29kZUNodW5rKHVpbnQ4LCBpLCAoaSArIG1heENodW5rTGVuZ3RoKSA+IGxlbjIgPyBsZW4yIDogKGkgKyBtYXhDaHVua0xlbmd0aCkpKVxuICB9XG5cbiAgLy8gcGFkIHRoZSBlbmQgd2l0aCB6ZXJvcywgYnV0IG1ha2Ugc3VyZSB0byBub3QgZm9yZ2V0IHRoZSBleHRyYSBieXRlc1xuICBpZiAoZXh0cmFCeXRlcyA9PT0gMSkge1xuICAgIHRtcCA9IHVpbnQ4W2xlbiAtIDFdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPT0nXG4gIH0gZWxzZSBpZiAoZXh0cmFCeXRlcyA9PT0gMikge1xuICAgIHRtcCA9ICh1aW50OFtsZW4gLSAyXSA8PCA4KSArICh1aW50OFtsZW4gLSAxXSlcbiAgICBvdXRwdXQgKz0gbG9va3VwW3RtcCA+PiAxMF1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPj4gNCkgJiAweDNGXVxuICAgIG91dHB1dCArPSBsb29rdXBbKHRtcCA8PCAyKSAmIDB4M0ZdXG4gICAgb3V0cHV0ICs9ICc9J1xuICB9XG5cbiAgcGFydHMucHVzaChvdXRwdXQpXG5cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpXG59XG4iLCIiLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxodHRwczovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbi8qIGVzbGludC1kaXNhYmxlIG5vLXByb3RvICovXG5cbid1c2Ugc3RyaWN0J1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG5cbmV4cG9ydHMuQnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLlNsb3dCdWZmZXIgPSBTbG93QnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcblxudmFyIEtfTUFYX0xFTkdUSCA9IDB4N2ZmZmZmZmZcbmV4cG9ydHMua01heExlbmd0aCA9IEtfTUFYX0xFTkdUSFxuXG4vKipcbiAqIElmIGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBQcmludCB3YXJuaW5nIGFuZCByZWNvbW1lbmQgdXNpbmcgYGJ1ZmZlcmAgdjQueCB3aGljaCBoYXMgYW4gT2JqZWN0XG4gKiAgICAgICAgICAgICAgIGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBXZSByZXBvcnQgdGhhdCB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHR5cGVkIGFycmF5cyBpZiB0aGUgYXJlIG5vdCBzdWJjbGFzc2FibGVcbiAqIHVzaW5nIF9fcHJvdG9fXy4gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWBcbiAqIChTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOCkuIElFIDEwIGxhY2tzIHN1cHBvcnRcbiAqIGZvciBfX3Byb3RvX18gYW5kIGhhcyBhIGJ1Z2d5IHR5cGVkIGFycmF5IGltcGxlbWVudGF0aW9uLlxuICovXG5CdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCA9IHR5cGVkQXJyYXlTdXBwb3J0KClcblxuaWYgKCFCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiB0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgY29uc29sZS5lcnJvciA9PT0gJ2Z1bmN0aW9uJykge1xuICBjb25zb2xlLmVycm9yKFxuICAgICdUaGlzIGJyb3dzZXIgbGFja3MgdHlwZWQgYXJyYXkgKFVpbnQ4QXJyYXkpIHN1cHBvcnQgd2hpY2ggaXMgcmVxdWlyZWQgYnkgJyArXG4gICAgJ2BidWZmZXJgIHY1LnguIFVzZSBgYnVmZmVyYCB2NC54IGlmIHlvdSByZXF1aXJlIG9sZCBicm93c2VyIHN1cHBvcnQuJ1xuICApXG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgLy8gQ2FuIHR5cGVkIGFycmF5IGluc3RhbmNlcyBjYW4gYmUgYXVnbWVudGVkP1xuICB0cnkge1xuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheSgxKVxuICAgIGFyci5fX3Byb3RvX18gPSB7X19wcm90b19fOiBVaW50OEFycmF5LnByb3RvdHlwZSwgZm9vOiBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9fVxuICAgIHJldHVybiBhcnIuZm9vKCkgPT09IDQyXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAobGVuZ3RoID4gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgdHlwZWQgYXJyYXkgbGVuZ3RoJylcbiAgfVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkobGVuZ3RoKVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbi8qKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBoYXZlIHRoZWlyXG4gKiBwcm90b3R5cGUgY2hhbmdlZCB0byBgQnVmZmVyLnByb3RvdHlwZWAuIEZ1cnRoZXJtb3JlLCBgQnVmZmVyYCBpcyBhIHN1YmNsYXNzIG9mXG4gKiBgVWludDhBcnJheWAsIHNvIHRoZSByZXR1cm5lZCBpbnN0YW5jZXMgd2lsbCBoYXZlIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBtZXRob2RzXG4gKiBhbmQgdGhlIGBVaW50OEFycmF5YCBtZXRob2RzLiBTcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdFxuICogcmV0dXJucyBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBUaGUgYFVpbnQ4QXJyYXlgIHByb3RvdHlwZSByZW1haW5zIHVubW9kaWZpZWQuXG4gKi9cblxuZnVuY3Rpb24gQnVmZmVyIChhcmcsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICAvLyBDb21tb24gY2FzZS5cbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdudW1iZXInKSB7XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZ09yT2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnSWYgZW5jb2RpbmcgaXMgc3BlY2lmaWVkIHRoZW4gdGhlIGZpcnN0IGFyZ3VtZW50IG11c3QgYmUgYSBzdHJpbmcnXG4gICAgICApXG4gICAgfVxuICAgIHJldHVybiBhbGxvY1Vuc2FmZShhcmcpXG4gIH1cbiAgcmV0dXJuIGZyb20oYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG59XG5cbi8vIEZpeCBzdWJhcnJheSgpIGluIEVTMjAxNi4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzk3XG5pZiAodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnNwZWNpZXMgJiZcbiAgICBCdWZmZXJbU3ltYm9sLnNwZWNpZXNdID09PSBCdWZmZXIpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEJ1ZmZlciwgU3ltYm9sLnNwZWNpZXMsIHtcbiAgICB2YWx1ZTogbnVsbCxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZhbHNlXG4gIH0pXG59XG5cbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTIgLy8gbm90IHVzZWQgYnkgdGhpcyBpbXBsZW1lbnRhdGlvblxuXG5mdW5jdGlvbiBmcm9tICh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ2YWx1ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIGEgbnVtYmVyJylcbiAgfVxuXG4gIGlmIChpc0FycmF5QnVmZmVyKHZhbHVlKSkge1xuICAgIHJldHVybiBmcm9tQXJyYXlCdWZmZXIodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQpXG4gIH1cblxuICByZXR1cm4gZnJvbU9iamVjdCh2YWx1ZSlcbn1cblxuLyoqXG4gKiBGdW5jdGlvbmFsbHkgZXF1aXZhbGVudCB0byBCdWZmZXIoYXJnLCBlbmNvZGluZykgYnV0IHRocm93cyBhIFR5cGVFcnJvclxuICogaWYgdmFsdWUgaXMgYSBudW1iZXIuXG4gKiBCdWZmZXIuZnJvbShzdHJbLCBlbmNvZGluZ10pXG4gKiBCdWZmZXIuZnJvbShhcnJheSlcbiAqIEJ1ZmZlci5mcm9tKGJ1ZmZlcilcbiAqIEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyWywgYnl0ZU9mZnNldFssIGxlbmd0aF1dKVxuICoqL1xuQnVmZmVyLmZyb20gPSBmdW5jdGlvbiAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gZnJvbSh2YWx1ZSwgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBOb3RlOiBDaGFuZ2UgcHJvdG90eXBlICphZnRlciogQnVmZmVyLmZyb20gaXMgZGVmaW5lZCB0byB3b3JrYXJvdW5kIENocm9tZSBidWc6XG4vLyBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9wdWxsLzE0OFxuQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuQnVmZmVyLl9fcHJvdG9fXyA9IFVpbnQ4QXJyYXlcblxuZnVuY3Rpb24gYXNzZXJ0U2l6ZSAoc2l6ZSkge1xuICBpZiAodHlwZW9mIHNpemUgIT09ICdudW1iZXInKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBiZSBhIG51bWJlcicpXG4gIH0gZWxzZSBpZiAoc2l6ZSA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXCJzaXplXCIgYXJndW1lbnQgbXVzdCBub3QgYmUgbmVnYXRpdmUnKVxuICB9XG59XG5cbmZ1bmN0aW9uIGFsbG9jIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICBhc3NlcnRTaXplKHNpemUpXG4gIGlmIChzaXplIDw9IDApIHtcbiAgICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG4gIH1cbiAgaWYgKGZpbGwgIT09IHVuZGVmaW5lZCkge1xuICAgIC8vIE9ubHkgcGF5IGF0dGVudGlvbiB0byBlbmNvZGluZyBpZiBpdCdzIGEgc3RyaW5nLiBUaGlzXG4gICAgLy8gcHJldmVudHMgYWNjaWRlbnRhbGx5IHNlbmRpbmcgaW4gYSBudW1iZXIgdGhhdCB3b3VsZFxuICAgIC8vIGJlIGludGVycHJldHRlZCBhcyBhIHN0YXJ0IG9mZnNldC5cbiAgICByZXR1cm4gdHlwZW9mIGVuY29kaW5nID09PSAnc3RyaW5nJ1xuICAgICAgPyBjcmVhdGVCdWZmZXIoc2l6ZSkuZmlsbChmaWxsLCBlbmNvZGluZylcbiAgICAgIDogY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbClcbiAgfVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBmaWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogYWxsb2Moc2l6ZVssIGZpbGxbLCBlbmNvZGluZ11dKVxuICoqL1xuQnVmZmVyLmFsbG9jID0gZnVuY3Rpb24gKHNpemUsIGZpbGwsIGVuY29kaW5nKSB7XG4gIHJldHVybiBhbGxvYyhzaXplLCBmaWxsLCBlbmNvZGluZylcbn1cblxuZnVuY3Rpb24gYWxsb2NVbnNhZmUgKHNpemUpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICByZXR1cm4gY3JlYXRlQnVmZmVyKHNpemUgPCAwID8gMCA6IGNoZWNrZWQoc2l6ZSkgfCAwKVxufVxuXG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gQnVmZmVyKG51bSksIGJ5IGRlZmF1bHQgY3JlYXRlcyBhIG5vbi16ZXJvLWZpbGxlZCBCdWZmZXIgaW5zdGFuY2UuXG4gKiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG4vKipcbiAqIEVxdWl2YWxlbnQgdG8gU2xvd0J1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICovXG5CdWZmZXIuYWxsb2NVbnNhZmVTbG93ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgcmV0dXJuIGFsbG9jVW5zYWZlKHNpemUpXG59XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKHR5cGVvZiBlbmNvZGluZyAhPT0gJ3N0cmluZycgfHwgZW5jb2RpbmcgPT09ICcnKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgfVxuXG4gIGlmICghQnVmZmVyLmlzRW5jb2RpbmcoZW5jb2RpbmcpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJlbmNvZGluZ1wiIG11c3QgYmUgYSB2YWxpZCBzdHJpbmcgZW5jb2RpbmcnKVxuICB9XG5cbiAgdmFyIGxlbmd0aCA9IGJ5dGVMZW5ndGgoc3RyaW5nLCBlbmNvZGluZykgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuXG4gIHZhciBhY3R1YWwgPSBidWYud3JpdGUoc3RyaW5nLCBlbmNvZGluZylcblxuICBpZiAoYWN0dWFsICE9PSBsZW5ndGgpIHtcbiAgICAvLyBXcml0aW5nIGEgaGV4IHN0cmluZywgZm9yIGV4YW1wbGUsIHRoYXQgY29udGFpbnMgaW52YWxpZCBjaGFyYWN0ZXJzIHdpbGxcbiAgICAvLyBjYXVzZSBldmVyeXRoaW5nIGFmdGVyIHRoZSBmaXJzdCBpbnZhbGlkIGNoYXJhY3RlciB0byBiZSBpZ25vcmVkLiAoZS5nLlxuICAgIC8vICdhYnh4Y2QnIHdpbGwgYmUgdHJlYXRlZCBhcyAnYWInKVxuICAgIGJ1ZiA9IGJ1Zi5zbGljZSgwLCBhY3R1YWwpXG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUxpa2UgKGFycmF5KSB7XG4gIHZhciBsZW5ndGggPSBhcnJheS5sZW5ndGggPCAwID8gMCA6IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdmFyIGJ1ZiA9IGNyZWF0ZUJ1ZmZlcihsZW5ndGgpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICBidWZbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyIChhcnJheSwgYnl0ZU9mZnNldCwgbGVuZ3RoKSB7XG4gIGlmIChieXRlT2Zmc2V0IDwgMCB8fCBhcnJheS5ieXRlTGVuZ3RoIDwgYnl0ZU9mZnNldCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdvZmZzZXRcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICBpZiAoYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQgKyAobGVuZ3RoIHx8IDApKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1xcJ2xlbmd0aFxcJyBpcyBvdXQgb2YgYm91bmRzJylcbiAgfVxuXG4gIHZhciBidWZcbiAgaWYgKGJ5dGVPZmZzZXQgPT09IHVuZGVmaW5lZCAmJiBsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5KVxuICB9IGVsc2UgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQpXG4gIH0gZWxzZSB7XG4gICAgYnVmID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aClcbiAgfVxuXG4gIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlXG4gIGJ1Zi5fX3Byb3RvX18gPSBCdWZmZXIucHJvdG90eXBlXG4gIHJldHVybiBidWZcbn1cblxuZnVuY3Rpb24gZnJvbU9iamVjdCAob2JqKSB7XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIob2JqKSkge1xuICAgIHZhciBsZW4gPSBjaGVja2VkKG9iai5sZW5ndGgpIHwgMFxuICAgIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuKVxuXG4gICAgaWYgKGJ1Zi5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBidWZcbiAgICB9XG5cbiAgICBvYmouY29weShidWYsIDAsIDAsIGxlbilcbiAgICByZXR1cm4gYnVmXG4gIH1cblxuICBpZiAob2JqKSB7XG4gICAgaWYgKGlzQXJyYXlCdWZmZXJWaWV3KG9iaikgfHwgJ2xlbmd0aCcgaW4gb2JqKSB7XG4gICAgICBpZiAodHlwZW9mIG9iai5sZW5ndGggIT09ICdudW1iZXInIHx8IG51bWJlcklzTmFOKG9iai5sZW5ndGgpKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVCdWZmZXIoMClcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcm9tQXJyYXlMaWtlKG9iailcbiAgICB9XG5cbiAgICBpZiAob2JqLnR5cGUgPT09ICdCdWZmZXInICYmIEFycmF5LmlzQXJyYXkob2JqLmRhdGEpKSB7XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmouZGF0YSlcbiAgICB9XG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nLCBCdWZmZXIsIEFycmF5QnVmZmVyLCBBcnJheSwgb3IgYXJyYXktbGlrZSBvYmplY3QuJylcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IEtfTUFYX0xFTkdUSGAgaGVyZSBiZWNhdXNlIHRoYXQgZmFpbHMgd2hlblxuICAvLyBsZW5ndGggaXMgTmFOICh3aGljaCBpcyBvdGhlcndpc2UgY29lcmNlZCB0byB6ZXJvLilcbiAgaWYgKGxlbmd0aCA+PSBLX01BWF9MRU5HVEgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byBhbGxvY2F0ZSBCdWZmZXIgbGFyZ2VyIHRoYW4gbWF4aW11bSAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAnc2l6ZTogMHgnICsgS19NQVhfTEVOR1RILnRvU3RyaW5nKDE2KSArICcgYnl0ZXMnKVxuICB9XG4gIHJldHVybiBsZW5ndGggfCAwXG59XG5cbmZ1bmN0aW9uIFNsb3dCdWZmZXIgKGxlbmd0aCkge1xuICBpZiAoK2xlbmd0aCAhPSBsZW5ndGgpIHsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXFcbiAgICBsZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIEJ1ZmZlci5hbGxvYygrbGVuZ3RoKVxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyID09PSB0cnVlXG59XG5cbkJ1ZmZlci5jb21wYXJlID0gZnVuY3Rpb24gY29tcGFyZSAoYSwgYikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihhKSB8fCAhQnVmZmVyLmlzQnVmZmVyKGIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIG11c3QgYmUgQnVmZmVycycpXG4gIH1cblxuICBpZiAoYSA9PT0gYikgcmV0dXJuIDBcblxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXVxuICAgICAgeSA9IGJbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgfVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBCdWZmZXIuYWxsb2MoMClcbiAgfVxuXG4gIHZhciBpXG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGxlbmd0aCA9IDBcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgICAgbGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZmZlciA9IEJ1ZmZlci5hbGxvY1Vuc2FmZShsZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJ1ZiA9IGxpc3RbaV1cbiAgICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImxpc3RcIiBhcmd1bWVudCBtdXN0IGJlIGFuIEFycmF5IG9mIEJ1ZmZlcnMnKVxuICAgIH1cbiAgICBidWYuY29weShidWZmZXIsIHBvcylcbiAgICBwb3MgKz0gYnVmLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZmZXJcbn1cblxuZnVuY3Rpb24gYnl0ZUxlbmd0aCAoc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmxlbmd0aFxuICB9XG4gIGlmIChpc0FycmF5QnVmZmVyVmlldyhzdHJpbmcpIHx8IGlzQXJyYXlCdWZmZXIoc3RyaW5nKSkge1xuICAgIHJldHVybiBzdHJpbmcuYnl0ZUxlbmd0aFxuICB9XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykge1xuICAgIHN0cmluZyA9ICcnICsgc3RyaW5nXG4gIH1cblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsZW5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbmZ1bmN0aW9uIHNsb3dUb1N0cmluZyAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcblxuICAvLyBObyBuZWVkIHRvIHZlcmlmeSB0aGF0IFwidGhpcy5sZW5ndGggPD0gTUFYX1VJTlQzMlwiIHNpbmNlIGl0J3MgYSByZWFkLW9ubHlcbiAgLy8gcHJvcGVydHkgb2YgYSB0eXBlZCBhcnJheS5cblxuICAvLyBUaGlzIGJlaGF2ZXMgbmVpdGhlciBsaWtlIFN0cmluZyBub3IgVWludDhBcnJheSBpbiB0aGF0IHdlIHNldCBzdGFydC9lbmRcbiAgLy8gdG8gdGhlaXIgdXBwZXIvbG93ZXIgYm91bmRzIGlmIHRoZSB2YWx1ZSBwYXNzZWQgaXMgb3V0IG9mIHJhbmdlLlxuICAvLyB1bmRlZmluZWQgaXMgaGFuZGxlZCBzcGVjaWFsbHkgYXMgcGVyIEVDTUEtMjYyIDZ0aCBFZGl0aW9uLFxuICAvLyBTZWN0aW9uIDEzLjMuMy43IFJ1bnRpbWUgU2VtYW50aWNzOiBLZXllZEJpbmRpbmdJbml0aWFsaXphdGlvbi5cbiAgaWYgKHN0YXJ0ID09PSB1bmRlZmluZWQgfHwgc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgLy8gUmV0dXJuIGVhcmx5IGlmIHN0YXJ0ID4gdGhpcy5sZW5ndGguIERvbmUgaGVyZSB0byBwcmV2ZW50IHBvdGVudGlhbCB1aW50MzJcbiAgLy8gY29lcmNpb24gZmFpbCBiZWxvdy5cbiAgaWYgKHN0YXJ0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIH1cblxuICBpZiAoZW5kIDw9IDApIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIC8vIEZvcmNlIGNvZXJzaW9uIHRvIHVpbnQzMi4gVGhpcyB3aWxsIGFsc28gY29lcmNlIGZhbHNleS9OYU4gdmFsdWVzIHRvIDAuXG4gIGVuZCA+Pj49IDBcbiAgc3RhcnQgPj4+PSAwXG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiAnJ1xuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgcmV0dXJuIGJhc2U2NFNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1dGYxNmxlU2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKGVuY29kaW5nICsgJycpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbi8vIFRoaXMgcHJvcGVydHkgaXMgdXNlZCBieSBgQnVmZmVyLmlzQnVmZmVyYCAoYW5kIHRoZSBgaXMtYnVmZmVyYCBucG0gcGFja2FnZSlcbi8vIHRvIGRldGVjdCBhIEJ1ZmZlciBpbnN0YW5jZS4gSXQncyBub3QgcG9zc2libGUgdG8gdXNlIGBpbnN0YW5jZW9mIEJ1ZmZlcmBcbi8vIHJlbGlhYmx5IGluIGEgYnJvd3NlcmlmeSBjb250ZXh0IGJlY2F1c2UgdGhlcmUgY291bGQgYmUgbXVsdGlwbGUgZGlmZmVyZW50XG4vLyBjb3BpZXMgb2YgdGhlICdidWZmZXInIHBhY2thZ2UgaW4gdXNlLiBUaGlzIG1ldGhvZCB3b3JrcyBldmVuIGZvciBCdWZmZXJcbi8vIGluc3RhbmNlcyB0aGF0IHdlcmUgY3JlYXRlZCBmcm9tIGFub3RoZXIgY29weSBvZiB0aGUgYGJ1ZmZlcmAgcGFja2FnZS5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE1NFxuQnVmZmVyLnByb3RvdHlwZS5faXNCdWZmZXIgPSB0cnVlXG5cbmZ1bmN0aW9uIHN3YXAgKGIsIG4sIG0pIHtcbiAgdmFyIGkgPSBiW25dXG4gIGJbbl0gPSBiW21dXG4gIGJbbV0gPSBpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDE2ID0gZnVuY3Rpb24gc3dhcDE2ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSAyICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNi1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgMSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAzMiA9IGZ1bmN0aW9uIHN3YXAzMiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgNCAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMzItYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDMpXG4gICAgc3dhcCh0aGlzLCBpICsgMSwgaSArIDIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwNjQgPSBmdW5jdGlvbiBzd2FwNjQgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDggIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDY0LWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDgpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyA3KVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyA2KVxuICAgIHN3YXAodGhpcywgaSArIDIsIGkgKyA1KVxuICAgIHN3YXAodGhpcywgaSArIDMsIGkgKyA0KVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gIHZhciBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKHRhcmdldCwgc3RhcnQsIGVuZCwgdGhpc1N0YXJ0LCB0aGlzRW5kKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKHRhcmdldCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgfVxuXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhcnQgPSAwXG4gIH1cbiAgaWYgKGVuZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5kID0gdGFyZ2V0ID8gdGFyZ2V0Lmxlbmd0aCA6IDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzU3RhcnQgPSAwXG4gIH1cbiAgaWYgKHRoaXNFbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXNFbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBlbmQgPiB0YXJnZXQubGVuZ3RoIHx8IHRoaXNTdGFydCA8IDAgfHwgdGhpc0VuZCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ291dCBvZiByYW5nZSBpbmRleCcpXG4gIH1cblxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQgJiYgc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuICBpZiAodGhpc1N0YXJ0ID49IHRoaXNFbmQpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoc3RhcnQgPj0gZW5kKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHN0YXJ0ID4+Pj0gMFxuICBlbmQgPj4+PSAwXG4gIHRoaXNTdGFydCA+Pj49IDBcbiAgdGhpc0VuZCA+Pj49IDBcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0KSByZXR1cm4gMFxuXG4gIHZhciB4ID0gdGhpc0VuZCAtIHRoaXNTdGFydFxuICB2YXIgeSA9IGVuZCAtIHN0YXJ0XG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuXG4gIHZhciB0aGlzQ29weSA9IHRoaXMuc2xpY2UodGhpc1N0YXJ0LCB0aGlzRW5kKVxuICB2YXIgdGFyZ2V0Q29weSA9IHRhcmdldC5zbGljZShzdGFydCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAodGhpc0NvcHlbaV0gIT09IHRhcmdldENvcHlbaV0pIHtcbiAgICAgIHggPSB0aGlzQ29weVtpXVxuICAgICAgeSA9IHRhcmdldENvcHlbaV1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG4vLyBGaW5kcyBlaXRoZXIgdGhlIGZpcnN0IGluZGV4IG9mIGB2YWxgIGluIGBidWZmZXJgIGF0IG9mZnNldCA+PSBgYnl0ZU9mZnNldGAsXG4vLyBPUiB0aGUgbGFzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPD0gYGJ5dGVPZmZzZXRgLlxuLy9cbi8vIEFyZ3VtZW50czpcbi8vIC0gYnVmZmVyIC0gYSBCdWZmZXIgdG8gc2VhcmNoXG4vLyAtIHZhbCAtIGEgc3RyaW5nLCBCdWZmZXIsIG9yIG51bWJlclxuLy8gLSBieXRlT2Zmc2V0IC0gYW4gaW5kZXggaW50byBgYnVmZmVyYDsgd2lsbCBiZSBjbGFtcGVkIHRvIGFuIGludDMyXG4vLyAtIGVuY29kaW5nIC0gYW4gb3B0aW9uYWwgZW5jb2RpbmcsIHJlbGV2YW50IGlzIHZhbCBpcyBhIHN0cmluZ1xuLy8gLSBkaXIgLSB0cnVlIGZvciBpbmRleE9mLCBmYWxzZSBmb3IgbGFzdEluZGV4T2ZcbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxJbmRleE9mIChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICAvLyBFbXB0eSBidWZmZXIgbWVhbnMgbm8gbWF0Y2hcbiAgaWYgKGJ1ZmZlci5sZW5ndGggPT09IDApIHJldHVybiAtMVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0XG4gIGlmICh0eXBlb2YgYnl0ZU9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IGJ5dGVPZmZzZXRcbiAgICBieXRlT2Zmc2V0ID0gMFxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPiAweDdmZmZmZmZmKSB7XG4gICAgYnl0ZU9mZnNldCA9IDB4N2ZmZmZmZmZcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0IDwgLTB4ODAwMDAwMDApIHtcbiAgICBieXRlT2Zmc2V0ID0gLTB4ODAwMDAwMDBcbiAgfVxuICBieXRlT2Zmc2V0ID0gK2J5dGVPZmZzZXQgIC8vIENvZXJjZSB0byBOdW1iZXIuXG4gIGlmIChudW1iZXJJc05hTihieXRlT2Zmc2V0KSkge1xuICAgIC8vIGJ5dGVPZmZzZXQ6IGl0IGl0J3MgdW5kZWZpbmVkLCBudWxsLCBOYU4sIFwiZm9vXCIsIGV0Yywgc2VhcmNoIHdob2xlIGJ1ZmZlclxuICAgIGJ5dGVPZmZzZXQgPSBkaXIgPyAwIDogKGJ1ZmZlci5sZW5ndGggLSAxKVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIGJ5dGVPZmZzZXQ6IG5lZ2F0aXZlIG9mZnNldHMgc3RhcnQgZnJvbSB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgaWYgKGJ5dGVPZmZzZXQgPCAwKSBieXRlT2Zmc2V0ID0gYnVmZmVyLmxlbmd0aCArIGJ5dGVPZmZzZXRcbiAgaWYgKGJ5dGVPZmZzZXQgPj0gYnVmZmVyLmxlbmd0aCkge1xuICAgIGlmIChkaXIpIHJldHVybiAtMVxuICAgIGVsc2UgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggLSAxXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IDApIHtcbiAgICBpZiAoZGlyKSBieXRlT2Zmc2V0ID0gMFxuICAgIGVsc2UgcmV0dXJuIC0xXG4gIH1cblxuICAvLyBOb3JtYWxpemUgdmFsXG4gIGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuICAgIHZhbCA9IEJ1ZmZlci5mcm9tKHZhbCwgZW5jb2RpbmcpXG4gIH1cblxuICAvLyBGaW5hbGx5LCBzZWFyY2ggZWl0aGVyIGluZGV4T2YgKGlmIGRpciBpcyB0cnVlKSBvciBsYXN0SW5kZXhPZlxuICBpZiAoQnVmZmVyLmlzQnVmZmVyKHZhbCkpIHtcbiAgICAvLyBTcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZy9idWZmZXIgYWx3YXlzIGZhaWxzXG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAtMVxuICAgIH1cbiAgICByZXR1cm4gYXJyYXlJbmRleE9mKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSB7XG4gICAgdmFsID0gdmFsICYgMHhGRiAvLyBTZWFyY2ggZm9yIGEgYnl0ZSB2YWx1ZSBbMC0yNTVdXG4gICAgaWYgKHR5cGVvZiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpZiAoZGlyKSB7XG4gICAgICAgIHJldHVybiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUubGFzdEluZGV4T2YuY2FsbChidWZmZXIsIHZhbCwgYnl0ZU9mZnNldClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIFsgdmFsIF0sIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YgKGFyciwgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKSB7XG4gIHZhciBpbmRleFNpemUgPSAxXG4gIHZhciBhcnJMZW5ndGggPSBhcnIubGVuZ3RoXG4gIHZhciB2YWxMZW5ndGggPSB2YWwubGVuZ3RoXG5cbiAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9IFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgIGlmIChlbmNvZGluZyA9PT0gJ3VjczInIHx8IGVuY29kaW5nID09PSAndWNzLTInIHx8XG4gICAgICAgIGVuY29kaW5nID09PSAndXRmMTZsZScgfHwgZW5jb2RpbmcgPT09ICd1dGYtMTZsZScpIHtcbiAgICAgIGlmIChhcnIubGVuZ3RoIDwgMiB8fCB2YWwubGVuZ3RoIDwgMikge1xuICAgICAgICByZXR1cm4gLTFcbiAgICAgIH1cbiAgICAgIGluZGV4U2l6ZSA9IDJcbiAgICAgIGFyckxlbmd0aCAvPSAyXG4gICAgICB2YWxMZW5ndGggLz0gMlxuICAgICAgYnl0ZU9mZnNldCAvPSAyXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZCAoYnVmLCBpKSB7XG4gICAgaWYgKGluZGV4U2l6ZSA9PT0gMSkge1xuICAgICAgcmV0dXJuIGJ1ZltpXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYnVmLnJlYWRVSW50MTZCRShpICogaW5kZXhTaXplKVxuICAgIH1cbiAgfVxuXG4gIHZhciBpXG4gIGlmIChkaXIpIHtcbiAgICB2YXIgZm91bmRJbmRleCA9IC0xXG4gICAgZm9yIChpID0gYnl0ZU9mZnNldDsgaSA8IGFyckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAocmVhZChhcnIsIGkpID09PSByZWFkKHZhbCwgZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXgpKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsTGVuZ3RoKSByZXR1cm4gZm91bmRJbmRleCAqIGluZGV4U2l6ZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGZvdW5kSW5kZXggIT09IC0xKSBpIC09IGkgLSBmb3VuZEluZGV4XG4gICAgICAgIGZvdW5kSW5kZXggPSAtMVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoYnl0ZU9mZnNldCArIHZhbExlbmd0aCA+IGFyckxlbmd0aCkgYnl0ZU9mZnNldCA9IGFyckxlbmd0aCAtIHZhbExlbmd0aFxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZm91bmQgPSB0cnVlXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHZhbExlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChyZWFkKGFyciwgaSArIGopICE9PSByZWFkKHZhbCwgaikpIHtcbiAgICAgICAgICBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGZvdW5kKSByZXR1cm4gaVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiAtMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24gaW5jbHVkZXMgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIHRoaXMuaW5kZXhPZih2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSAhPT0gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24gaW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgdHJ1ZSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uIGxhc3RJbmRleE9mICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiBiaWRpcmVjdGlvbmFsSW5kZXhPZih0aGlzLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHBhcnNlZCA9IHBhcnNlSW50KHN0cmluZy5zdWJzdHIoaSAqIDIsIDIpLCAxNilcbiAgICBpZiAobnVtYmVySXNOYU4ocGFyc2VkKSkgcmV0dXJuIGlcbiAgICBidWZbb2Zmc2V0ICsgaV0gPSBwYXJzZWRcbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiB1dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcsIGJ1Zi5sZW5ndGggLSBvZmZzZXQpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBhc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIoYXNjaWlUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIGxhdGluMVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gdWNzMldyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZykge1xuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nKVxuICBpZiAob2Zmc2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICBlbmNvZGluZyA9ICd1dGY4J1xuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2Zmc2V0ID09PSAnc3RyaW5nJykge1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBvZmZzZXQgPSAwXG4gIC8vIEJ1ZmZlciN3cml0ZShzdHJpbmcsIG9mZnNldFssIGxlbmd0aF1bLCBlbmNvZGluZ10pXG4gIH0gZWxzZSBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICAgIGlmIChpc0Zpbml0ZShsZW5ndGgpKSB7XG4gICAgICBsZW5ndGggPSBsZW5ndGggPj4+IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdCdWZmZXIud3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0WywgbGVuZ3RoXSkgaXMgbm8gbG9uZ2VyIHN1cHBvcnRlZCdcbiAgICApXG4gIH1cblxuICB2YXIgcmVtYWluaW5nID0gdGhpcy5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKGxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGxlbmd0aCA+IHJlbWFpbmluZykgbGVuZ3RoID0gcmVtYWluaW5nXG5cbiAgaWYgKChzdHJpbmcubGVuZ3RoID4gMCAmJiAobGVuZ3RoIDwgMCB8fCBvZmZzZXQgPCAwKSkgfHwgb2Zmc2V0ID4gdGhpcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQXR0ZW1wdCB0byB3cml0ZSBvdXRzaWRlIGJ1ZmZlciBib3VuZHMnKVxuICB9XG5cbiAgaWYgKCFlbmNvZGluZykgZW5jb2RpbmcgPSAndXRmOCdcblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnaGV4JzpcbiAgICAgICAgcmV0dXJuIGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgY2FzZSAndXRmLTgnOlxuICAgICAgICByZXR1cm4gdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgICAgcmV0dXJuIGFzY2lpV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnbGF0aW4xJzpcbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBsYXRpbjFXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICAvLyBXYXJuaW5nOiBtYXhMZW5ndGggbm90IHRha2VuIGludG8gYWNjb3VudCBpbiBiYXNlNjRXcml0ZVxuICAgICAgICByZXR1cm4gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHVjczJXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKHN0YXJ0ID09PSAwICYmIGVuZCA9PT0gYnVmLmxlbmd0aCkge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYpXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zi5zbGljZShzdGFydCwgZW5kKSlcbiAgfVxufVxuXG5mdW5jdGlvbiB1dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG4gIHZhciByZXMgPSBbXVxuXG4gIHZhciBpID0gc3RhcnRcbiAgd2hpbGUgKGkgPCBlbmQpIHtcbiAgICB2YXIgZmlyc3RCeXRlID0gYnVmW2ldXG4gICAgdmFyIGNvZGVQb2ludCA9IG51bGxcbiAgICB2YXIgYnl0ZXNQZXJTZXF1ZW5jZSA9IChmaXJzdEJ5dGUgPiAweEVGKSA/IDRcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4REYpID8gM1xuICAgICAgOiAoZmlyc3RCeXRlID4gMHhCRikgPyAyXG4gICAgICA6IDFcblxuICAgIGlmIChpICsgYnl0ZXNQZXJTZXF1ZW5jZSA8PSBlbmQpIHtcbiAgICAgIHZhciBzZWNvbmRCeXRlLCB0aGlyZEJ5dGUsIGZvdXJ0aEJ5dGUsIHRlbXBDb2RlUG9pbnRcblxuICAgICAgc3dpdGNoIChieXRlc1BlclNlcXVlbmNlKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBpZiAoZmlyc3RCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgY29kZVBvaW50ID0gZmlyc3RCeXRlXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4MUYpIDw8IDB4NiB8IChzZWNvbmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3Rikge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgMzpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICAgIHRlbXBDb2RlUG9pbnQgPSAoZmlyc3RCeXRlICYgMHhGKSA8PCAweEMgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4NiB8ICh0aGlyZEJ5dGUgJiAweDNGKVxuICAgICAgICAgICAgaWYgKHRlbXBDb2RlUG9pbnQgPiAweDdGRiAmJiAodGVtcENvZGVQb2ludCA8IDB4RDgwMCB8fCB0ZW1wQ29kZVBvaW50ID4gMHhERkZGKSkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBzZWNvbmRCeXRlID0gYnVmW2kgKyAxXVxuICAgICAgICAgIHRoaXJkQnl0ZSA9IGJ1ZltpICsgMl1cbiAgICAgICAgICBmb3VydGhCeXRlID0gYnVmW2kgKyAzXVxuICAgICAgICAgIGlmICgoc2Vjb25kQnl0ZSAmIDB4QzApID09PSAweDgwICYmICh0aGlyZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAoZm91cnRoQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHgxMiB8IChzZWNvbmRCeXRlICYgMHgzRikgPDwgMHhDIHwgKHRoaXJkQnl0ZSAmIDB4M0YpIDw8IDB4NiB8IChmb3VydGhCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHhGRkZGICYmIHRlbXBDb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgICAgICAgICBjb2RlUG9pbnQgPSB0ZW1wQ29kZVBvaW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlUG9pbnQgPT09IG51bGwpIHtcbiAgICAgIC8vIHdlIGRpZCBub3QgZ2VuZXJhdGUgYSB2YWxpZCBjb2RlUG9pbnQgc28gaW5zZXJ0IGFcbiAgICAgIC8vIHJlcGxhY2VtZW50IGNoYXIgKFUrRkZGRCkgYW5kIGFkdmFuY2Ugb25seSAxIGJ5dGVcbiAgICAgIGNvZGVQb2ludCA9IDB4RkZGRFxuICAgICAgYnl0ZXNQZXJTZXF1ZW5jZSA9IDFcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA+IDB4RkZGRikge1xuICAgICAgLy8gZW5jb2RlIHRvIHV0ZjE2IChzdXJyb2dhdGUgcGFpciBkYW5jZSlcbiAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwXG4gICAgICByZXMucHVzaChjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApXG4gICAgICBjb2RlUG9pbnQgPSAweERDMDAgfCBjb2RlUG9pbnQgJiAweDNGRlxuICAgIH1cblxuICAgIHJlcy5wdXNoKGNvZGVQb2ludClcbiAgICBpICs9IGJ5dGVzUGVyU2VxdWVuY2VcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkocmVzKVxufVxuXG4vLyBCYXNlZCBvbiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMjc0NzI3Mi82ODA3NDIsIHRoZSBicm93c2VyIHdpdGhcbi8vIHRoZSBsb3dlc3QgbGltaXQgaXMgQ2hyb21lLCB3aXRoIDB4MTAwMDAgYXJncy5cbi8vIFdlIGdvIDEgbWFnbml0dWRlIGxlc3MsIGZvciBzYWZldHlcbnZhciBNQVhfQVJHVU1FTlRTX0xFTkdUSCA9IDB4MTAwMFxuXG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnRzQXJyYXkgKGNvZGVQb2ludHMpIHtcbiAgdmFyIGxlbiA9IGNvZGVQb2ludHMubGVuZ3RoXG4gIGlmIChsZW4gPD0gTUFYX0FSR1VNRU5UU19MRU5HVEgpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNvZGVQb2ludHMpIC8vIGF2b2lkIGV4dHJhIHNsaWNlKClcbiAgfVxuXG4gIC8vIERlY29kZSBpbiBjaHVua3MgdG8gYXZvaWQgXCJjYWxsIHN0YWNrIHNpemUgZXhjZWVkZWRcIi5cbiAgdmFyIHJlcyA9ICcnXG4gIHZhciBpID0gMFxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFxuICAgICAgU3RyaW5nLFxuICAgICAgY29kZVBvaW50cy5zbGljZShpLCBpICs9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKVxuICAgIClcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldICYgMHg3RilcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGxhdGluMVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyAoYnl0ZXNbaSArIDFdICogMjU2KSlcbiAgfVxuICByZXR1cm4gcmVzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbiBzbGljZSAoc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgc3RhcnQgPSB+fnN0YXJ0XG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gbGVuIDogfn5lbmRcblxuICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgc3RhcnQgKz0gbGVuXG4gICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApIGVuZCA9IDBcbiAgfSBlbHNlIGlmIChlbmQgPiBsZW4pIHtcbiAgICBlbmQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCBzdGFydCkgZW5kID0gc3RhcnRcblxuICB2YXIgbmV3QnVmID0gdGhpcy5zdWJhcnJheShzdGFydCwgZW5kKVxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBuZXdCdWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludEJFID0gZnVuY3Rpb24gcmVhZFVJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG4gIH1cblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdXG4gIHZhciBtdWwgPSAxXG4gIHdoaWxlIChieXRlTGVuZ3RoID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0tYnl0ZUxlbmd0aF0gKiBtdWxcbiAgfVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiByZWFkVUludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRVSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuICh0aGlzW29mZnNldF0gPDwgOCkgfCB0aGlzW29mZnNldCArIDFdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0gKiAweDEwMDAwMDApICtcbiAgICAoKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgdGhpc1tvZmZzZXQgKyAzXSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50TEUgPSBmdW5jdGlvbiByZWFkSW50TEUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG4gIG11bCAqPSAweDgwXG5cbiAgaWYgKHZhbCA+PSBtdWwpIHZhbCAtPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aClcblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludEJFID0gZnVuY3Rpb24gcmVhZEludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIGlmICghKHRoaXNbb2Zmc2V0XSAmIDB4ODApKSByZXR1cm4gKHRoaXNbb2Zmc2V0XSlcbiAgcmV0dXJuICgoMHhmZiAtIHRoaXNbb2Zmc2V0XSArIDEpICogLTEpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2TEUgPSBmdW5jdGlvbiByZWFkSW50MTZMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG5cbiAgcmV0dXJuICh0aGlzW29mZnNldF0pIHxcbiAgICAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAzXSA8PCAyNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDI0KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgMTYpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCA4KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiByZWFkRmxvYXRMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCBmYWxzZSwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gcmVhZERvdWJsZUxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgdHJ1ZSwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gcmVhZERvdWJsZUJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYnVmZmVyXCIgYXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlciBpbnN0YW5jZScpXG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBpcyBvdXQgb2YgYm91bmRzJylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludExFID0gZnVuY3Rpb24gd3JpdGVVSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIG1heEJ5dGVzID0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpIC0gMVxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG1heEJ5dGVzLCAwKVxuICB9XG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50OCA9IGZ1bmN0aW9uIHdyaXRlVUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gMTYpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50TEUgPSBmdW5jdGlvbiB3cml0ZUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsICg4ICogYnl0ZUxlbmd0aCkgLSAxKVxuXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbGltaXQgLSAxLCAtbGltaXQpXG4gIH1cblxuICB2YXIgaSA9IDBcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXRdID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgaWYgKHZhbHVlIDwgMCAmJiBzdWIgPT09IDAgJiYgdGhpc1tvZmZzZXQgKyBpIC0gMV0gIT09IDApIHtcbiAgICAgIHN1YiA9IDFcbiAgICB9XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludEJFID0gZnVuY3Rpb24gd3JpdGVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB2YXIgc3ViID0gMFxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSArIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiB3cml0ZUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCA0LCAweDdmZmZmZmZmLCAtMHg4MDAwMDAwMClcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmZmZmZmZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuZnVuY3Rpb24gY2hlY2tJRUVFNzU0IChidWYsIHZhbHVlLCBvZmZzZXQsIGV4dCwgbWF4LCBtaW4pIHtcbiAgaWYgKG9mZnNldCArIGV4dCA+IGJ1Zi5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxuICBpZiAob2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0luZGV4IG91dCBvZiByYW5nZScpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGNoZWNrSUVFRTc1NChidWYsIHZhbHVlLCBvZmZzZXQsIDQsIDMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgsIC0zLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxuICByZXR1cm4gb2Zmc2V0ICsgNFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gd3JpdGVGbG9hdEJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCkge1xuICAgIC8vIGFzY2VuZGluZyBjb3B5IGZyb20gc3RhcnRcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIFVpbnQ4QXJyYXkucHJvdG90eXBlLnNldC5jYWxsKFxuICAgICAgdGFyZ2V0LFxuICAgICAgdGhpcy5zdWJhcnJheShzdGFydCwgc3RhcnQgKyBsZW4pLFxuICAgICAgdGFyZ2V0U3RhcnRcbiAgICApXG4gIH1cblxuICByZXR1cm4gbGVuXG59XG5cbi8vIFVzYWdlOlxuLy8gICAgYnVmZmVyLmZpbGwobnVtYmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChidWZmZXJbLCBvZmZzZXRbLCBlbmRdXSlcbi8vICAgIGJ1ZmZlci5maWxsKHN0cmluZ1ssIG9mZnNldFssIGVuZF1dWywgZW5jb2RpbmddKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gZmlsbCAodmFsLCBzdGFydCwgZW5kLCBlbmNvZGluZykge1xuICAvLyBIYW5kbGUgc3RyaW5nIGNhc2VzOlxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICBpZiAodHlwZW9mIHN0YXJ0ID09PSAnc3RyaW5nJykge1xuICAgICAgZW5jb2RpbmcgPSBzdGFydFxuICAgICAgc3RhcnQgPSAwXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGVuZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gZW5kXG4gICAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICAgIH1cbiAgICBpZiAodmFsLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIGNvZGUgPSB2YWwuY2hhckNvZGVBdCgwKVxuICAgICAgaWYgKGNvZGUgPCAyNTYpIHtcbiAgICAgICAgdmFsID0gY29kZVxuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW5jb2RpbmcgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdlbmNvZGluZyBtdXN0IGJlIGEgc3RyaW5nJylcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZycgJiYgIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDI1NVxuICB9XG5cbiAgLy8gSW52YWxpZCByYW5nZXMgYXJlIG5vdCBzZXQgdG8gYSBkZWZhdWx0LCBzbyBjYW4gcmFuZ2UgY2hlY2sgZWFybHkuXG4gIGlmIChzdGFydCA8IDAgfHwgdGhpcy5sZW5ndGggPCBzdGFydCB8fCB0aGlzLmxlbmd0aCA8IGVuZCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdPdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKGVuZCA8PSBzdGFydCkge1xuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzdGFydCA9IHN0YXJ0ID4+PiAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5sZW5ndGggOiBlbmQgPj4+IDBcblxuICBpZiAoIXZhbCkgdmFsID0gMFxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICAgIHRoaXNbaV0gPSB2YWxcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGJ5dGVzID0gQnVmZmVyLmlzQnVmZmVyKHZhbClcbiAgICAgID8gdmFsXG4gICAgICA6IG5ldyBCdWZmZXIodmFsLCBlbmNvZGluZylcbiAgICB2YXIgbGVuID0gYnl0ZXMubGVuZ3RoXG4gICAgZm9yIChpID0gMDsgaSA8IGVuZCAtIHN0YXJ0OyArK2kpIHtcbiAgICAgIHRoaXNbaSArIHN0YXJ0XSA9IGJ5dGVzW2kgJSBsZW5dXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rLzAtOUEtWmEtei1fXS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0ci50cmltKCkucmVwbGFjZShJTlZBTElEX0JBU0U2NF9SRSwgJycpXG4gIC8vIE5vZGUgY29udmVydHMgc3RyaW5ncyB3aXRoIGxlbmd0aCA8IDIgdG8gJydcbiAgaWYgKHN0ci5sZW5ndGggPCAyKSByZXR1cm4gJydcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyaW5nLCB1bml0cykge1xuICB1bml0cyA9IHVuaXRzIHx8IEluZmluaXR5XG4gIHZhciBjb2RlUG9pbnRcbiAgdmFyIGxlbmd0aCA9IHN0cmluZy5sZW5ndGhcbiAgdmFyIGxlYWRTdXJyb2dhdGUgPSBudWxsXG4gIHZhciBieXRlcyA9IFtdXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGNvZGVQb2ludCA9IHN0cmluZy5jaGFyQ29kZUF0KGkpXG5cbiAgICAvLyBpcyBzdXJyb2dhdGUgY29tcG9uZW50XG4gICAgaWYgKGNvZGVQb2ludCA+IDB4RDdGRiAmJiBjb2RlUG9pbnQgPCAweEUwMDApIHtcbiAgICAgIC8vIGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoIWxlYWRTdXJyb2dhdGUpIHtcbiAgICAgICAgLy8gbm8gbGVhZCB5ZXRcbiAgICAgICAgaWYgKGNvZGVQb2ludCA+IDB4REJGRikge1xuICAgICAgICAgIC8vIHVuZXhwZWN0ZWQgdHJhaWxcbiAgICAgICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9IGVsc2UgaWYgKGkgKyAxID09PSBsZW5ndGgpIHtcbiAgICAgICAgICAvLyB1bnBhaXJlZCBsZWFkXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHZhbGlkIGxlYWRcbiAgICAgICAgbGVhZFN1cnJvZ2F0ZSA9IGNvZGVQb2ludFxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIDIgbGVhZHMgaW4gYSByb3dcbiAgICAgIGlmIChjb2RlUG9pbnQgPCAweERDMDApIHtcbiAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWQgc3Vycm9nYXRlIHBhaXJcbiAgICAgIGNvZGVQb2ludCA9IChsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwKSArIDB4MTAwMDBcbiAgICB9IGVsc2UgaWYgKGxlYWRTdXJyb2dhdGUpIHtcbiAgICAgIC8vIHZhbGlkIGJtcCBjaGFyLCBidXQgbGFzdCBjaGFyIHdhcyBhIGxlYWRcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgIH1cblxuICAgIGxlYWRTdXJyb2dhdGUgPSBudWxsXG5cbiAgICAvLyBlbmNvZGUgdXRmOFxuICAgIGlmIChjb2RlUG9pbnQgPCAweDgwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDEpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goY29kZVBvaW50KVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHg4MDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiB8IDB4QzAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDMpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgfCAweEUwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDExMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSA0KSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHgxMiB8IDB4RjAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweEMgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludCcpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVzXG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIsIHVuaXRzKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG5cbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShiYXNlNjRjbGVhbihzdHIpKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSkgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG4vLyBBcnJheUJ1ZmZlcnMgZnJvbSBhbm90aGVyIGNvbnRleHQgKGkuZS4gYW4gaWZyYW1lKSBkbyBub3QgcGFzcyB0aGUgYGluc3RhbmNlb2ZgIGNoZWNrXG4vLyBidXQgdGhleSBzaG91bGQgYmUgdHJlYXRlZCBhcyB2YWxpZC4gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9pc3N1ZXMvMTY2XG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIEFycmF5QnVmZmVyIHx8XG4gICAgKG9iaiAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3RvciAhPSBudWxsICYmIG9iai5jb25zdHJ1Y3Rvci5uYW1lID09PSAnQXJyYXlCdWZmZXInICYmXG4gICAgICB0eXBlb2Ygb2JqLmJ5dGVMZW5ndGggPT09ICdudW1iZXInKVxufVxuXG4vLyBOb2RlIDAuMTAgc3VwcG9ydHMgYEFycmF5QnVmZmVyYCBidXQgbGFja3MgYEFycmF5QnVmZmVyLmlzVmlld2BcbmZ1bmN0aW9uIGlzQXJyYXlCdWZmZXJWaWV3IChvYmopIHtcbiAgcmV0dXJuICh0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSAnZnVuY3Rpb24nKSAmJiBBcnJheUJ1ZmZlci5pc1ZpZXcob2JqKVxufVxuXG5mdW5jdGlvbiBudW1iZXJJc05hTiAob2JqKSB7XG4gIHJldHVybiBvYmogIT09IG9iaiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNlbGYtY29tcGFyZVxufVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24gKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG1cbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBuQml0cyA9IC03XG4gIHZhciBpID0gaXNMRSA/IChuQnl0ZXMgLSAxKSA6IDBcbiAgdmFyIGQgPSBpc0xFID8gLTEgOiAxXG4gIHZhciBzID0gYnVmZmVyW29mZnNldCArIGldXG5cbiAgaSArPSBkXG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgcyA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gZUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIGUgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IG1MZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBpZiAoZSA9PT0gMCkge1xuICAgIGUgPSAxIC0gZUJpYXNcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpXG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKVxuICAgIGUgPSBlIC0gZUJpYXNcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKVxufVxuXG5leHBvcnRzLndyaXRlID0gZnVuY3Rpb24gKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgcnQgPSAobUxlbiA9PT0gMjMgPyBNYXRoLnBvdygyLCAtMjQpIC0gTWF0aC5wb3coMiwgLTc3KSA6IDApXG4gIHZhciBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSlcbiAgdmFyIGQgPSBpc0xFID8gMSA6IC0xXG4gIHZhciBzID0gdmFsdWUgPCAwIHx8ICh2YWx1ZSA9PT0gMCAmJiAxIC8gdmFsdWUgPCAwKSA/IDEgOiAwXG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSlcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMFxuICAgIGUgPSBlTWF4XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpXG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tXG4gICAgICBjICo9IDJcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGNcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpXG4gICAgfVxuICAgIGlmICh2YWx1ZSAqIGMgPj0gMikge1xuICAgICAgZSsrXG4gICAgICBjIC89IDJcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwXG4gICAgICBlID0gZU1heFxuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IGUgKyBlQmlhc1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gdmFsdWUgKiBNYXRoLnBvdygyLCBlQmlhcyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSAwXG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCkge31cblxuICBlID0gKGUgPDwgbUxlbikgfCBtXG4gIGVMZW4gKz0gbUxlblxuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpIHt9XG5cbiAgYnVmZmVyW29mZnNldCArIGkgLSBkXSB8PSBzICogMTI4XG59XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBJZiBvYmouaGFzT3duUHJvcGVydHkgaGFzIGJlZW4gb3ZlcnJpZGRlbiwgdGhlbiBjYWxsaW5nXG4vLyBvYmouaGFzT3duUHJvcGVydHkocHJvcCkgd2lsbCBicmVhay5cbi8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2lzc3Vlcy8xNzA3XG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHFzLCBzZXAsIGVxLCBvcHRpb25zKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICB2YXIgb2JqID0ge307XG5cbiAgaWYgKHR5cGVvZiBxcyAhPT0gJ3N0cmluZycgfHwgcXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIHZhciByZWdleHAgPSAvXFwrL2c7XG4gIHFzID0gcXMuc3BsaXQoc2VwKTtcblxuICB2YXIgbWF4S2V5cyA9IDEwMDA7XG4gIGlmIChvcHRpb25zICYmIHR5cGVvZiBvcHRpb25zLm1heEtleXMgPT09ICdudW1iZXInKSB7XG4gICAgbWF4S2V5cyA9IG9wdGlvbnMubWF4S2V5cztcbiAgfVxuXG4gIHZhciBsZW4gPSBxcy5sZW5ndGg7XG4gIC8vIG1heEtleXMgPD0gMCBtZWFucyB0aGF0IHdlIHNob3VsZCBub3QgbGltaXQga2V5cyBjb3VudFxuICBpZiAobWF4S2V5cyA+IDAgJiYgbGVuID4gbWF4S2V5cykge1xuICAgIGxlbiA9IG1heEtleXM7XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgdmFyIHggPSBxc1tpXS5yZXBsYWNlKHJlZ2V4cCwgJyUyMCcpLFxuICAgICAgICBpZHggPSB4LmluZGV4T2YoZXEpLFxuICAgICAgICBrc3RyLCB2c3RyLCBrLCB2O1xuXG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBrc3RyID0geC5zdWJzdHIoMCwgaWR4KTtcbiAgICAgIHZzdHIgPSB4LnN1YnN0cihpZHggKyAxKTtcbiAgICB9IGVsc2Uge1xuICAgICAga3N0ciA9IHg7XG4gICAgICB2c3RyID0gJyc7XG4gICAgfVxuXG4gICAgayA9IGRlY29kZVVSSUNvbXBvbmVudChrc3RyKTtcbiAgICB2ID0gZGVjb2RlVVJJQ29tcG9uZW50KHZzdHIpO1xuXG4gICAgaWYgKCFoYXNPd25Qcm9wZXJ0eShvYmosIGspKSB7XG4gICAgICBvYmpba10gPSB2O1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICBvYmpba10ucHVzaCh2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2tdID0gW29ialtrXSwgdl07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHN0cmluZ2lmeVByaW1pdGl2ZSA9IGZ1bmN0aW9uKHYpIHtcbiAgc3dpdGNoICh0eXBlb2Ygdikge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gdjtcblxuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIHYgPyAndHJ1ZScgOiAnZmFsc2UnO1xuXG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBpc0Zpbml0ZSh2KSA/IHYgOiAnJztcblxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gJyc7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqLCBzZXAsIGVxLCBuYW1lKSB7XG4gIHNlcCA9IHNlcCB8fCAnJic7XG4gIGVxID0gZXEgfHwgJz0nO1xuICBpZiAob2JqID09PSBudWxsKSB7XG4gICAgb2JqID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG1hcChvYmplY3RLZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBrcyA9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUoaykpICsgZXE7XG4gICAgICBpZiAoaXNBcnJheShvYmpba10pKSB7XG4gICAgICAgIHJldHVybiBtYXAob2JqW2tdLCBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZSh2KSk7XG4gICAgICAgIH0pLmpvaW4oc2VwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqW2tdKSk7XG4gICAgICB9XG4gICAgfSkuam9pbihzZXApO1xuXG4gIH1cblxuICBpZiAoIW5hbWUpIHJldHVybiAnJztcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUobmFtZSkpICsgZXEgK1xuICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmopKTtcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuXG5mdW5jdGlvbiBtYXAgKHhzLCBmKSB7XG4gIGlmICh4cy5tYXApIHJldHVybiB4cy5tYXAoZik7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgIHJlcy5wdXNoKGYoeHNbaV0sIGkpKTtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuZGVjb2RlID0gZXhwb3J0cy5wYXJzZSA9IHJlcXVpcmUoJy4vZGVjb2RlJyk7XG5leHBvcnRzLmVuY29kZSA9IGV4cG9ydHMuc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9lbmNvZGUnKTtcbiIsIi8qKlxyXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxyXG4gKi9cclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xyXG59XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcclxuICAgIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcclxuICogQHJldHVybiB7T2JqZWN0fVxyXG4gKiBAYXBpIHByaXZhdGVcclxuICovXHJcblxyXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcclxuICAgIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xyXG4gICAgICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XHJcbiAgICBFbWl0dGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50LCBmbikge1xyXG4gICAgICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAgICAgICAodGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW10pXHJcbiAgICAgICAgICAgIC5wdXNoKGZuKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH07XHJcblxyXG4vKipcclxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXHJcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XHJcbiAgICBmdW5jdGlvbiBvbigpIHtcclxuICAgICAgICB0aGlzLm9mZihldmVudCwgb24pO1xyXG4gICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICB9XHJcblxyXG4gICAgb24uZm4gPSBmbjtcclxuICAgIHRoaXMub24oZXZlbnQsIG9uKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXHJcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxyXG4gICAgRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxyXG4gICAgICAgIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XHJcbiAgICAgICAgICAgIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnQsIGZuKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYWxsXHJcbiAgICAgICAgICAgICAgICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2FsbGJhY2tzID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gc3BlY2lmaWMgZXZlbnRcclxuICAgICAgICAgICAgICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBhbGwgaGFuZGxlcnNcclxuICAgICAgICAgICAgICAgIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgdmFyIGNiO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBjYiA9IGNhbGxiYWNrc1tpXTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICAgICAgfTtcclxuXHJcbi8qKlxyXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXHJcbiAgICAgICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG5cclxuICAgIGlmIChjYWxsYmFja3MpIHtcclxuICAgICAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xyXG4gICAgICAgICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcmV0dXJuIHtBcnJheX1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAgIHJldHVybiB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgICByZXR1cm4gISF0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xyXG59O1xyXG4iLCIvKipcbiAqIFJvb3QgcmVmZXJlbmNlIGZvciBpZnJhbWVzLlxuICovXG5cbnZhciByb290O1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IC8vIEJyb3dzZXIgd2luZG93XG4gIHJvb3QgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykgeyAvLyBXZWIgV29ya2VyXG4gIHJvb3QgPSBzZWxmO1xufSBlbHNlIHsgLy8gT3RoZXIgZW52aXJvbm1lbnRzXG4gIGNvbnNvbGUud2FybihcIlVzaW5nIGJyb3dzZXItb25seSB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQgaW4gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRcIik7XG4gIHJvb3QgPSB0aGlzO1xufVxuXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2NvbXBvbmVudC1lbWl0dGVyJyk7XG52YXIgUmVxdWVzdEJhc2UgPSByZXF1aXJlKCcuL3JlcXVlc3QtYmFzZScpO1xudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnLi9pcy1mdW5jdGlvbicpO1xudmFyIFJlc3BvbnNlQmFzZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UtYmFzZScpO1xudmFyIHNob3VsZFJldHJ5ID0gcmVxdWlyZSgnLi9zaG91bGQtcmV0cnknKTtcblxuLyoqXG4gKiBOb29wLlxuICovXG5cbmZ1bmN0aW9uIG5vb3AoKXt9O1xuXG4vKipcbiAqIEV4cG9zZSBgcmVxdWVzdGAuXG4gKi9cblxudmFyIHJlcXVlc3QgPSBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXRob2QsIHVybCkge1xuICAvLyBjYWxsYmFja1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgdXJsKSB7XG4gICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCkuZW5kKHVybCk7XG4gIH1cblxuICAvLyB1cmwgZmlyc3RcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QobWV0aG9kLCB1cmwpO1xufVxuXG5leHBvcnRzLlJlcXVlc3QgPSBSZXF1ZXN0O1xuXG4vKipcbiAqIERldGVybWluZSBYSFIuXG4gKi9cblxucmVxdWVzdC5nZXRYSFIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmIChyb290LlhNTEh0dHBSZXF1ZXN0XG4gICAgICAmJiAoIXJvb3QubG9jYXRpb24gfHwgJ2ZpbGU6JyAhPSByb290LmxvY2F0aW9uLnByb3RvY29sXG4gICAgICAgICAgfHwgIXJvb3QuQWN0aXZlWE9iamVjdCkpIHtcbiAgICByZXR1cm4gbmV3IFhNTEh0dHBSZXF1ZXN0O1xuICB9IGVsc2Uge1xuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTWljcm9zb2Z0LlhNTEhUVFAnKTsgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAuNi4wJyk7IH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjMuMCcpOyB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUCcpOyB9IGNhdGNoKGUpIHt9XG4gIH1cbiAgdGhyb3cgRXJyb3IoXCJCcm93c2VyLW9ubHkgdmVyaXNvbiBvZiBzdXBlcmFnZW50IGNvdWxkIG5vdCBmaW5kIFhIUlwiKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLCBhZGRlZCB0byBzdXBwb3J0IElFLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgdHJpbSA9ICcnLnRyaW1cbiAgPyBmdW5jdGlvbihzKSB7IHJldHVybiBzLnRyaW0oKTsgfVxuICA6IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHMucmVwbGFjZSgvKF5cXHMqfFxccyokKS9nLCAnJyk7IH07XG5cbi8qKlxuICogU2VyaWFsaXplIHRoZSBnaXZlbiBgb2JqYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZXJpYWxpemUob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgdmFyIHBhaXJzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCBvYmpba2V5XSk7XG4gIH1cbiAgcmV0dXJuIHBhaXJzLmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBIZWxwcyAnc2VyaWFsaXplJyB3aXRoIHNlcmlhbGl6aW5nIGFycmF5cy5cbiAqIE11dGF0ZXMgdGhlIHBhaXJzIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhaXJzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2YWwpIHtcbiAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsKSkge1xuICAgICAgZm9yKHZhciBzdWJrZXkgaW4gdmFsKSB7XG4gICAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXkgKyAnWycgKyBzdWJrZXkgKyAnXScsIHZhbFtzdWJrZXldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KVxuICAgICAgICArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodmFsID09PSBudWxsKSB7XG4gICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvc2Ugc2VyaWFsaXphdGlvbiBtZXRob2QuXG4gKi9cblxuIHJlcXVlc3Quc2VyaWFsaXplT2JqZWN0ID0gc2VyaWFsaXplO1xuXG4gLyoqXG4gICogUGFyc2UgdGhlIGdpdmVuIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBgc3RyYC5cbiAgKlxuICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICogQGFwaSBwcml2YXRlXG4gICovXG5cbmZ1bmN0aW9uIHBhcnNlU3RyaW5nKHN0cikge1xuICB2YXIgb2JqID0ge307XG4gIHZhciBwYWlycyA9IHN0ci5zcGxpdCgnJicpO1xuICB2YXIgcGFpcjtcbiAgdmFyIHBvcztcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFpcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgcG9zID0gcGFpci5pbmRleE9mKCc9Jyk7XG4gICAgaWYgKHBvcyA9PSAtMSkge1xuICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyKV0gPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKDAsIHBvcykpXSA9XG4gICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKHBvcyArIDEpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEV4cG9zZSBwYXJzZXIuXG4gKi9cblxucmVxdWVzdC5wYXJzZVN0cmluZyA9IHBhcnNlU3RyaW5nO1xuXG4vKipcbiAqIERlZmF1bHQgTUlNRSB0eXBlIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC50eXBlcy54bWwgPSAnYXBwbGljYXRpb24veG1sJztcbiAqXG4gKi9cblxucmVxdWVzdC50eXBlcyA9IHtcbiAgaHRtbDogJ3RleHQvaHRtbCcsXG4gIGpzb246ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgeG1sOiAnYXBwbGljYXRpb24veG1sJyxcbiAgdXJsZW5jb2RlZDogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICdmb3JtJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICdmb3JtLWRhdGEnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IHNlcmlhbGl6YXRpb24gbWFwLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihvYmope1xuICogICAgICAgcmV0dXJuICdnZW5lcmF0ZWQgeG1sIGhlcmUnO1xuICogICAgIH07XG4gKlxuICovXG5cbiByZXF1ZXN0LnNlcmlhbGl6ZSA9IHtcbiAgICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBzZXJpYWxpemUsXG4gICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5XG4gfTtcblxuIC8qKlxuICAqIERlZmF1bHQgcGFyc2Vycy5cbiAgKlxuICAqICAgICBzdXBlcmFnZW50LnBhcnNlWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKHN0cil7XG4gICogICAgICAgcmV0dXJuIHsgb2JqZWN0IHBhcnNlZCBmcm9tIHN0ciB9O1xuICAqICAgICB9O1xuICAqXG4gICovXG5cbnJlcXVlc3QucGFyc2UgPSB7XG4gICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBwYXJzZVN0cmluZyxcbiAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnBhcnNlXG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBoZWFkZXIgYHN0cmAgaW50b1xuICogYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1hcHBlZCBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VIZWFkZXIoc3RyKSB7XG4gIHZhciBsaW5lcyA9IHN0ci5zcGxpdCgvXFxyP1xcbi8pO1xuICB2YXIgZmllbGRzID0ge307XG4gIHZhciBpbmRleDtcbiAgdmFyIGxpbmU7XG4gIHZhciBmaWVsZDtcbiAgdmFyIHZhbDtcblxuICBsaW5lcy5wb3AoKTsgLy8gdHJhaWxpbmcgQ1JMRlxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsaW5lcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBpbmRleCA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgIGZpZWxkID0gbGluZS5zbGljZSgwLCBpbmRleCkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWwgPSB0cmltKGxpbmUuc2xpY2UoaW5kZXggKyAxKSk7XG4gICAgZmllbGRzW2ZpZWxkXSA9IHZhbDtcbiAgfVxuXG4gIHJldHVybiBmaWVsZHM7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG1pbWVgIGlzIGpzb24gb3IgaGFzICtqc29uIHN0cnVjdHVyZWQgc3ludGF4IHN1ZmZpeC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWltZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzSlNPTihtaW1lKSB7XG4gIHJldHVybiAvW1xcLytdanNvblxcYi8udGVzdChtaW1lKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZWAgd2l0aCB0aGUgZ2l2ZW4gYHhocmAuXG4gKlxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxuICogIC0gcGFyc2UgaGVhZGVyXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogIEFsaWFzaW5nIGBzdXBlcmFnZW50YCBhcyBgcmVxdWVzdGAgaXMgbmljZTpcbiAqXG4gKiAgICAgIHJlcXVlc3QgPSBzdXBlcmFnZW50O1xuICpcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJykuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgU2VuZGluZyBkYXRhIGNhbiBiZSBjaGFpbmVkOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogQHBhcmFtIHtYTUxIVFRQUmVxdWVzdH0geGhyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxKSB7XG4gIHRoaXMucmVxID0gcmVxO1xuICB0aGlzLnhociA9IHRoaXMucmVxLnhocjtcbiAgLy8gcmVzcG9uc2VUZXh0IGlzIGFjY2Vzc2libGUgb25seSBpZiByZXNwb25zZVR5cGUgaXMgJycgb3IgJ3RleHQnIGFuZCBvbiBvbGRlciBicm93c2Vyc1xuICB0aGlzLnRleHQgPSAoKHRoaXMucmVxLm1ldGhvZCAhPSdIRUFEJyAmJiAodGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAnJyB8fCB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd0ZXh0JykpIHx8IHR5cGVvZiB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd1bmRlZmluZWQnKVxuICAgICA/IHRoaXMueGhyLnJlc3BvbnNlVGV4dFxuICAgICA6IG51bGw7XG4gIHRoaXMuc3RhdHVzVGV4dCA9IHRoaXMucmVxLnhoci5zdGF0dXNUZXh0O1xuICB2YXIgc3RhdHVzID0gdGhpcy54aHIuc3RhdHVzO1xuICAvLyBoYW5kbGUgSUU5IGJ1ZzogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gIGlmIChzdGF0dXMgPT09IDEyMjMpIHtcbiAgICAgIHN0YXR1cyA9IDIwNDtcbiAgfVxuICB0aGlzLl9zZXRTdGF0dXNQcm9wZXJ0aWVzKHN0YXR1cyk7XG4gIHRoaXMuaGVhZGVyID0gdGhpcy5oZWFkZXJzID0gcGFyc2VIZWFkZXIodGhpcy54aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpO1xuICAvLyBnZXRBbGxSZXNwb25zZUhlYWRlcnMgc29tZXRpbWVzIGZhbHNlbHkgcmV0dXJucyBcIlwiIGZvciBDT1JTIHJlcXVlc3RzLCBidXRcbiAgLy8gZ2V0UmVzcG9uc2VIZWFkZXIgc3RpbGwgd29ya3MuIHNvIHdlIGdldCBjb250ZW50LXR5cGUgZXZlbiBpZiBnZXR0aW5nXG4gIC8vIG90aGVyIGhlYWRlcnMgZmFpbHMuXG4gIHRoaXMuaGVhZGVyWydjb250ZW50LXR5cGUnXSA9IHRoaXMueGhyLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKTtcbiAgdGhpcy5fc2V0SGVhZGVyUHJvcGVydGllcyh0aGlzLmhlYWRlcik7XG5cbiAgaWYgKG51bGwgPT09IHRoaXMudGV4dCAmJiByZXEuX3Jlc3BvbnNlVHlwZSkge1xuICAgIHRoaXMuYm9keSA9IHRoaXMueGhyLnJlc3BvbnNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYm9keSA9IHRoaXMucmVxLm1ldGhvZCAhPSAnSEVBRCdcbiAgICAgID8gdGhpcy5fcGFyc2VCb2R5KHRoaXMudGV4dCA/IHRoaXMudGV4dCA6IHRoaXMueGhyLnJlc3BvbnNlKVxuICAgICAgOiBudWxsO1xuICB9XG59XG5cblJlc3BvbnNlQmFzZShSZXNwb25zZS5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBib2R5IGBzdHJgLlxuICpcbiAqIFVzZWQgZm9yIGF1dG8tcGFyc2luZyBvZiBib2RpZXMuIFBhcnNlcnNcbiAqIGFyZSBkZWZpbmVkIG9uIHRoZSBgc3VwZXJhZ2VudC5wYXJzZWAgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLl9wYXJzZUJvZHkgPSBmdW5jdGlvbihzdHIpe1xuICB2YXIgcGFyc2UgPSByZXF1ZXN0LnBhcnNlW3RoaXMudHlwZV07XG4gIGlmKHRoaXMucmVxLl9wYXJzZXIpIHtcbiAgICByZXR1cm4gdGhpcy5yZXEuX3BhcnNlcih0aGlzLCBzdHIpO1xuICB9XG4gIGlmICghcGFyc2UgJiYgaXNKU09OKHRoaXMudHlwZSkpIHtcbiAgICBwYXJzZSA9IHJlcXVlc3QucGFyc2VbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgfVxuICByZXR1cm4gcGFyc2UgJiYgc3RyICYmIChzdHIubGVuZ3RoIHx8IHN0ciBpbnN0YW5jZW9mIE9iamVjdClcbiAgICA/IHBhcnNlKHN0cilcbiAgICA6IG51bGw7XG59O1xuXG4vKipcbiAqIFJldHVybiBhbiBgRXJyb3JgIHJlcHJlc2VudGF0aXZlIG9mIHRoaXMgcmVzcG9uc2UuXG4gKlxuICogQHJldHVybiB7RXJyb3J9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS50b0Vycm9yID0gZnVuY3Rpb24oKXtcbiAgdmFyIHJlcSA9IHRoaXMucmVxO1xuICB2YXIgbWV0aG9kID0gcmVxLm1ldGhvZDtcbiAgdmFyIHVybCA9IHJlcS51cmw7XG5cbiAgdmFyIG1zZyA9ICdjYW5ub3QgJyArIG1ldGhvZCArICcgJyArIHVybCArICcgKCcgKyB0aGlzLnN0YXR1cyArICcpJztcbiAgdmFyIGVyciA9IG5ldyBFcnJvcihtc2cpO1xuICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVyci5tZXRob2QgPSBtZXRob2Q7XG4gIGVyci51cmwgPSB1cmw7XG5cbiAgcmV0dXJuIGVycjtcbn07XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZWAuXG4gKi9cblxucmVxdWVzdC5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RgIHdpdGggdGhlIGdpdmVuIGBtZXRob2RgIGFuZCBgdXJsYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3QobWV0aG9kLCB1cmwpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9xdWVyeSA9IHRoaXMuX3F1ZXJ5IHx8IFtdO1xuICB0aGlzLm1ldGhvZCA9IG1ldGhvZDtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIHRoaXMuaGVhZGVyID0ge307IC8vIHByZXNlcnZlcyBoZWFkZXIgbmFtZSBjYXNlXG4gIHRoaXMuX2hlYWRlciA9IHt9OyAvLyBjb2VyY2VzIGhlYWRlciBuYW1lcyB0byBsb3dlcmNhc2VcbiAgdGhpcy5vbignZW5kJywgZnVuY3Rpb24oKXtcbiAgICB2YXIgZXJyID0gbnVsbDtcbiAgICB2YXIgcmVzID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICByZXMgPSBuZXcgUmVzcG9uc2Uoc2VsZik7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBlcnIgPSBuZXcgRXJyb3IoJ1BhcnNlciBpcyB1bmFibGUgdG8gcGFyc2UgdGhlIHJlc3BvbnNlJyk7XG4gICAgICBlcnIucGFyc2UgPSB0cnVlO1xuICAgICAgZXJyLm9yaWdpbmFsID0gZTtcbiAgICAgIC8vIGlzc3VlICM2NzU6IHJldHVybiB0aGUgcmF3IHJlc3BvbnNlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICBpZiAoc2VsZi54aHIpIHtcbiAgICAgICAgLy8gaWU5IGRvZXNuJ3QgaGF2ZSAncmVzcG9uc2UnIHByb3BlcnR5XG4gICAgICAgIGVyci5yYXdSZXNwb25zZSA9IHR5cGVvZiBzZWxmLnhoci5yZXNwb25zZVR5cGUgPT0gJ3VuZGVmaW5lZCcgPyBzZWxmLnhoci5yZXNwb25zZVRleHQgOiBzZWxmLnhoci5yZXNwb25zZTtcbiAgICAgICAgLy8gaXNzdWUgIzg3NjogcmV0dXJuIHRoZSBodHRwIHN0YXR1cyBjb2RlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICAgIGVyci5zdGF0dXMgPSBzZWxmLnhoci5zdGF0dXMgPyBzZWxmLnhoci5zdGF0dXMgOiBudWxsO1xuICAgICAgICBlcnIuc3RhdHVzQ29kZSA9IGVyci5zdGF0dXM7IC8vIGJhY2t3YXJkcy1jb21wYXQgb25seVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyLnJhd1Jlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgZXJyLnN0YXR1cyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmLmNhbGxiYWNrKGVycik7XG4gICAgfVxuXG4gICAgc2VsZi5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG5cbiAgICB2YXIgbmV3X2VycjtcbiAgICB0cnkge1xuICAgICAgaWYgKCFzZWxmLl9pc1Jlc3BvbnNlT0socmVzKSkge1xuICAgICAgICBuZXdfZXJyID0gbmV3IEVycm9yKHJlcy5zdGF0dXNUZXh0IHx8ICdVbnN1Y2Nlc3NmdWwgSFRUUCByZXNwb25zZScpO1xuICAgICAgICBuZXdfZXJyLm9yaWdpbmFsID0gZXJyO1xuICAgICAgICBuZXdfZXJyLnJlc3BvbnNlID0gcmVzO1xuICAgICAgICBuZXdfZXJyLnN0YXR1cyA9IHJlcy5zdGF0dXM7XG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBuZXdfZXJyID0gZTsgLy8gIzk4NSB0b3VjaGluZyByZXMgbWF5IGNhdXNlIElOVkFMSURfU1RBVEVfRVJSIG9uIG9sZCBBbmRyb2lkXG4gICAgfVxuXG4gICAgLy8gIzEwMDAgZG9uJ3QgY2F0Y2ggZXJyb3JzIGZyb20gdGhlIGNhbGxiYWNrIHRvIGF2b2lkIGRvdWJsZSBjYWxsaW5nIGl0XG4gICAgaWYgKG5ld19lcnIpIHtcbiAgICAgIHNlbGYuY2FsbGJhY2sobmV3X2VyciwgcmVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5jYWxsYmFjayhudWxsLCByZXMpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogTWl4aW4gYEVtaXR0ZXJgIGFuZCBgUmVxdWVzdEJhc2VgLlxuICovXG5cbkVtaXR0ZXIoUmVxdWVzdC5wcm90b3R5cGUpO1xuUmVxdWVzdEJhc2UoUmVxdWVzdC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFNldCBDb250ZW50LVR5cGUgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCd4bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2FwcGxpY2F0aW9uL3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICB0aGlzLnNldCgnQ29udGVudC1UeXBlJywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBY2NlcHQgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uKHR5cGUpe1xuICB0aGlzLnNldCgnQWNjZXB0JywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFzc10gb3B0aW9uYWwgaW4gY2FzZSBvZiB1c2luZyAnYmVhcmVyJyBhcyB0eXBlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB3aXRoICd0eXBlJyBwcm9wZXJ0eSAnYXV0bycsICdiYXNpYycgb3IgJ2JlYXJlcicgKGRlZmF1bHQgJ2Jhc2ljJylcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24odXNlciwgcGFzcywgb3B0aW9ucyl7XG4gIGlmICh0eXBlb2YgcGFzcyA9PT0gJ29iamVjdCcgJiYgcGFzcyAhPT0gbnVsbCkgeyAvLyBwYXNzIGlzIG9wdGlvbmFsIGFuZCBjYW4gc3Vic3RpdHV0ZSBmb3Igb3B0aW9uc1xuICAgIG9wdGlvbnMgPSBwYXNzO1xuICB9XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICB0eXBlOiAnZnVuY3Rpb24nID09PSB0eXBlb2YgYnRvYSA/ICdiYXNpYycgOiAnYXV0bycsXG4gICAgfVxuICB9XG5cbiAgc3dpdGNoIChvcHRpb25zLnR5cGUpIHtcbiAgICBjYXNlICdiYXNpYyc6XG4gICAgICB0aGlzLnNldCgnQXV0aG9yaXphdGlvbicsICdCYXNpYyAnICsgYnRvYSh1c2VyICsgJzonICsgcGFzcykpO1xuICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnYXV0byc6XG4gICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcjtcbiAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzO1xuICAgIGJyZWFrO1xuICAgICAgXG4gICAgY2FzZSAnYmVhcmVyJzogLy8gdXNhZ2Ugd291bGQgYmUgLmF1dGgoYWNjZXNzVG9rZW4sIHsgdHlwZTogJ2JlYXJlcicgfSlcbiAgICAgIHRoaXMuc2V0KCdBdXRob3JpemF0aW9uJywgJ0JlYXJlciAnICsgdXNlcik7XG4gICAgYnJlYWs7ICBcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIHF1ZXJ5LXN0cmluZyBgdmFsYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgIHJlcXVlc3QuZ2V0KCcvc2hvZXMnKVxuICogICAgIC5xdWVyeSgnc2l6ZT0xMCcpXG4gKiAgICAgLnF1ZXJ5KHsgY29sb3I6ICdibHVlJyB9KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbih2YWwpe1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gc2VyaWFsaXplKHZhbCk7XG4gIGlmICh2YWwpIHRoaXMuX3F1ZXJ5LnB1c2godmFsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFF1ZXVlIHRoZSBnaXZlbiBgZmlsZWAgYXMgYW4gYXR0YWNobWVudCB0byB0aGUgc3BlY2lmaWVkIGBmaWVsZGAsXG4gKiB3aXRoIG9wdGlvbmFsIGBvcHRpb25zYCAob3IgZmlsZW5hbWUpLlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5wb3N0KCcvdXBsb2FkJylcbiAqICAgLmF0dGFjaCgnY29udGVudCcsIG5ldyBCbG9iKFsnPGEgaWQ9XCJhXCI+PGIgaWQ9XCJiXCI+aGV5ITwvYj48L2E+J10sIHsgdHlwZTogXCJ0ZXh0L2h0bWxcIn0pKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHBhcmFtIHtCbG9ifEZpbGV9IGZpbGVcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmF0dGFjaCA9IGZ1bmN0aW9uKGZpZWxkLCBmaWxlLCBvcHRpb25zKXtcbiAgaWYgKGZpbGUpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhyb3cgRXJyb3IoXCJzdXBlcmFnZW50IGNhbid0IG1peCAuc2VuZCgpIGFuZCAuYXR0YWNoKClcIik7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQoZmllbGQsIGZpbGUsIG9wdGlvbnMgfHwgZmlsZS5uYW1lKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9nZXRGb3JtRGF0YSA9IGZ1bmN0aW9uKCl7XG4gIGlmICghdGhpcy5fZm9ybURhdGEpIHtcbiAgICB0aGlzLl9mb3JtRGF0YSA9IG5ldyByb290LkZvcm1EYXRhKCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2Zvcm1EYXRhO1xufTtcblxuLyoqXG4gKiBJbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggYGVycmAgYW5kIGByZXNgXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYWxsYmFjayA9IGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgLy8gY29uc29sZS5sb2codGhpcy5fcmV0cmllcywgdGhpcy5fbWF4UmV0cmllcylcbiAgaWYgKHRoaXMuX21heFJldHJpZXMgJiYgdGhpcy5fcmV0cmllcysrIDwgdGhpcy5fbWF4UmV0cmllcyAmJiBzaG91bGRSZXRyeShlcnIsIHJlcykpIHtcbiAgICByZXR1cm4gdGhpcy5fcmV0cnkoKTtcbiAgfVxuXG4gIHZhciBmbiA9IHRoaXMuX2NhbGxiYWNrO1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuXG4gIGlmIChlcnIpIHtcbiAgICBpZiAodGhpcy5fbWF4UmV0cmllcykgZXJyLnJldHJpZXMgPSB0aGlzLl9yZXRyaWVzIC0gMTtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgfVxuXG4gIGZuKGVyciwgcmVzKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggeC1kb21haW4gZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY3Jvc3NEb21haW5FcnJvciA9IGZ1bmN0aW9uKCl7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgaGFzIGJlZW4gdGVybWluYXRlZFxcblBvc3NpYmxlIGNhdXNlczogdGhlIG5ldHdvcmsgaXMgb2ZmbGluZSwgT3JpZ2luIGlzIG5vdCBhbGxvd2VkIGJ5IEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiwgdGhlIHBhZ2UgaXMgYmVpbmcgdW5sb2FkZWQsIGV0Yy4nKTtcbiAgZXJyLmNyb3NzRG9tYWluID0gdHJ1ZTtcblxuICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVyci5tZXRob2QgPSB0aGlzLm1ldGhvZDtcbiAgZXJyLnVybCA9IHRoaXMudXJsO1xuXG4gIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cbi8vIFRoaXMgb25seSB3YXJucywgYmVjYXVzZSB0aGUgcmVxdWVzdCBpcyBzdGlsbCBsaWtlbHkgdG8gd29ya1xuUmVxdWVzdC5wcm90b3R5cGUuYnVmZmVyID0gUmVxdWVzdC5wcm90b3R5cGUuY2EgPSBSZXF1ZXN0LnByb3RvdHlwZS5hZ2VudCA9IGZ1bmN0aW9uKCl7XG4gIGNvbnNvbGUud2FybihcIlRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBUaGlzIHRocm93cywgYmVjYXVzZSBpdCBjYW4ndCBzZW5kL3JlY2VpdmUgZGF0YSBhcyBleHBlY3RlZFxuUmVxdWVzdC5wcm90b3R5cGUucGlwZSA9IFJlcXVlc3QucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oKXtcbiAgdGhyb3cgRXJyb3IoXCJTdHJlYW1pbmcgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbn07XG5cbi8qKlxuICogQ29tcG9zZSBxdWVyeXN0cmluZyB0byBhcHBlbmQgdG8gcmVxLnVybFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9hcHBlbmRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5LmpvaW4oJyYnKTtcbiAgaWYgKHF1ZXJ5KSB7XG4gICAgdGhpcy51cmwgKz0gKHRoaXMudXJsLmluZGV4T2YoJz8nKSA+PSAwID8gJyYnIDogJz8nKSArIHF1ZXJ5O1xuICB9XG5cbiAgaWYgKHRoaXMuX3NvcnQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnVybC5pbmRleE9mKCc/Jyk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgIHZhciBxdWVyeUFyciA9IHRoaXMudXJsLnN1YnN0cmluZyhpbmRleCArIDEpLnNwbGl0KCcmJyk7XG4gICAgICBpZiAoaXNGdW5jdGlvbih0aGlzLl9zb3J0KSkge1xuICAgICAgICBxdWVyeUFyci5zb3J0KHRoaXMuX3NvcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlcnlBcnIuc29ydCgpO1xuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSB0aGlzLnVybC5zdWJzdHJpbmcoMCwgaW5kZXgpICsgJz8nICsgcXVlcnlBcnIuam9pbignJicpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBDaGVjayBpZiBgb2JqYCBpcyBhIGhvc3Qgb2JqZWN0LFxuICogd2UgZG9uJ3Qgd2FudCB0byBzZXJpYWxpemUgdGhlc2UgOilcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblJlcXVlc3QucHJvdG90eXBlLl9pc0hvc3QgPSBmdW5jdGlvbiBfaXNIb3N0KG9iaikge1xuICAvLyBOYXRpdmUgb2JqZWN0cyBzdHJpbmdpZnkgdG8gW29iamVjdCBGaWxlXSwgW29iamVjdCBCbG9iXSwgW29iamVjdCBGb3JtRGF0YV0sIGV0Yy5cbiAgcmV0dXJuIG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iaiAmJiAhQXJyYXkuaXNBcnJheShvYmopICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJztcbn1cblxuLyoqXG4gKiBJbml0aWF0ZSByZXF1ZXN0LCBpbnZva2luZyBjYWxsYmFjayBgZm4ocmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oZm4pe1xuICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgY29uc29sZS53YXJuKFwiV2FybmluZzogLmVuZCgpIHdhcyBjYWxsZWQgdHdpY2UuIFRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBzdXBlcmFnZW50XCIpO1xuICB9XG4gIHRoaXMuX2VuZENhbGxlZCA9IHRydWU7XG5cbiAgLy8gc3RvcmUgY2FsbGJhY2tcbiAgdGhpcy5fY2FsbGJhY2sgPSBmbiB8fCBub29wO1xuXG4gIC8vIHF1ZXJ5c3RyaW5nXG4gIHRoaXMuX2FwcGVuZFF1ZXJ5U3RyaW5nKCk7XG5cbiAgcmV0dXJuIHRoaXMuX2VuZCgpO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuX2VuZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB4aHIgPSB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XG4gIHZhciBkYXRhID0gdGhpcy5fZm9ybURhdGEgfHwgdGhpcy5fZGF0YTtcblxuICB0aGlzLl9zZXRUaW1lb3V0cygpO1xuXG4gIC8vIHN0YXRlIGNoYW5nZVxuICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgcmVhZHlTdGF0ZSA9IHhoci5yZWFkeVN0YXRlO1xuICAgIGlmIChyZWFkeVN0YXRlID49IDIgJiYgc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dChzZWxmLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XG4gICAgfVxuICAgIGlmICg0ICE9IHJlYWR5U3RhdGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJbiBJRTksIHJlYWRzIHRvIGFueSBwcm9wZXJ0eSAoZS5nLiBzdGF0dXMpIG9mZiBvZiBhbiBhYm9ydGVkIFhIUiB3aWxsXG4gICAgLy8gcmVzdWx0IGluIHRoZSBlcnJvciBcIkNvdWxkIG5vdCBjb21wbGV0ZSB0aGUgb3BlcmF0aW9uIGR1ZSB0byBlcnJvciBjMDBjMDIzZlwiXG4gICAgdmFyIHN0YXR1cztcbiAgICB0cnkgeyBzdGF0dXMgPSB4aHIuc3RhdHVzIH0gY2F0Y2goZSkgeyBzdGF0dXMgPSAwOyB9XG5cbiAgICBpZiAoIXN0YXR1cykge1xuICAgICAgaWYgKHNlbGYudGltZWRvdXQgfHwgc2VsZi5fYWJvcnRlZCkgcmV0dXJuO1xuICAgICAgcmV0dXJuIHNlbGYuY3Jvc3NEb21haW5FcnJvcigpO1xuICAgIH1cbiAgICBzZWxmLmVtaXQoJ2VuZCcpO1xuICB9O1xuXG4gIC8vIHByb2dyZXNzXG4gIHZhciBoYW5kbGVQcm9ncmVzcyA9IGZ1bmN0aW9uKGRpcmVjdGlvbiwgZSkge1xuICAgIGlmIChlLnRvdGFsID4gMCkge1xuICAgICAgZS5wZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsICogMTAwO1xuICAgIH1cbiAgICBlLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XG4gIH1cbiAgaWYgKHRoaXMuaGFzTGlzdGVuZXJzKCdwcm9ncmVzcycpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHhoci5vbnByb2dyZXNzID0gaGFuZGxlUHJvZ3Jlc3MuYmluZChudWxsLCAnZG93bmxvYWQnKTtcbiAgICAgIGlmICh4aHIudXBsb2FkKSB7XG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGhhbmRsZVByb2dyZXNzLmJpbmQobnVsbCwgJ3VwbG9hZCcpO1xuICAgICAgfVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgLy8gQWNjZXNzaW5nIHhoci51cGxvYWQgZmFpbHMgaW4gSUUgZnJvbSBhIHdlYiB3b3JrZXIsIHNvIGp1c3QgcHJldGVuZCBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgLy8gUmVwb3J0ZWQgaGVyZTpcbiAgICAgIC8vIGh0dHBzOi8vY29ubmVjdC5taWNyb3NvZnQuY29tL0lFL2ZlZWRiYWNrL2RldGFpbHMvODM3MjQ1L3htbGh0dHByZXF1ZXN0LXVwbG9hZC10aHJvd3MtaW52YWxpZC1hcmd1bWVudC13aGVuLXVzZWQtZnJvbS13ZWItd29ya2VyLWNvbnRleHRcbiAgICB9XG4gIH1cblxuICAvLyBpbml0aWF0ZSByZXF1ZXN0XG4gIHRyeSB7XG4gICAgaWYgKHRoaXMudXNlcm5hbWUgJiYgdGhpcy5wYXNzd29yZCkge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlLCB0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIHNlZSAjMTE0OVxuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKGVycik7XG4gIH1cblxuICAvLyBDT1JTXG4gIGlmICh0aGlzLl93aXRoQ3JlZGVudGlhbHMpIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gIC8vIGJvZHlcbiAgaWYgKCF0aGlzLl9mb3JtRGF0YSAmJiAnR0VUJyAhPSB0aGlzLm1ldGhvZCAmJiAnSEVBRCcgIT0gdGhpcy5tZXRob2QgJiYgJ3N0cmluZycgIT0gdHlwZW9mIGRhdGEgJiYgIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgIC8vIHNlcmlhbGl6ZSBzdHVmZlxuICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG4gICAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX3NlcmlhbGl6ZXIgfHwgcmVxdWVzdC5zZXJpYWxpemVbY29udGVudFR5cGUgPyBjb250ZW50VHlwZS5zcGxpdCgnOycpWzBdIDogJyddO1xuICAgIGlmICghc2VyaWFsaXplICYmIGlzSlNPTihjb250ZW50VHlwZSkpIHtcbiAgICAgIHNlcmlhbGl6ZSA9IHJlcXVlc3Quc2VyaWFsaXplWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgfVxuICAgIGlmIChzZXJpYWxpemUpIGRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XG4gIH1cblxuICAvLyBzZXQgaGVhZGVyIGZpZWxkc1xuICBmb3IgKHZhciBmaWVsZCBpbiB0aGlzLmhlYWRlcikge1xuICAgIGlmIChudWxsID09IHRoaXMuaGVhZGVyW2ZpZWxkXSkgY29udGludWU7XG5cbiAgICBpZiAodGhpcy5oZWFkZXIuaGFzT3duUHJvcGVydHkoZmllbGQpKVxuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoZmllbGQsIHRoaXMuaGVhZGVyW2ZpZWxkXSk7XG4gIH1cblxuICBpZiAodGhpcy5fcmVzcG9uc2VUeXBlKSB7XG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9IHRoaXMuX3Jlc3BvbnNlVHlwZTtcbiAgfVxuXG4gIC8vIHNlbmQgc3R1ZmZcbiAgdGhpcy5lbWl0KCdyZXF1ZXN0JywgdGhpcyk7XG5cbiAgLy8gSUUxMSB4aHIuc2VuZCh1bmRlZmluZWQpIHNlbmRzICd1bmRlZmluZWQnIHN0cmluZyBhcyBQT1NUIHBheWxvYWQgKGluc3RlYWQgb2Ygbm90aGluZylcbiAgLy8gV2UgbmVlZCBudWxsIGhlcmUgaWYgZGF0YSBpcyB1bmRlZmluZWRcbiAgeGhyLnNlbmQodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnID8gZGF0YSA6IG51bGwpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR0VUIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5nZXQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0dFVCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnF1ZXJ5KGRhdGEpO1xuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5oZWFkID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdIRUFEJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogT1BUSU9OUyBxdWVyeSB0byBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3Qub3B0aW9ucyA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnT1BUSU9OUycsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIERFTEVURSBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVsKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnREVMRVRFJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbnJlcXVlc3RbJ2RlbCddID0gZGVsO1xucmVxdWVzdFsnZGVsZXRlJ10gPSBkZWw7XG5cbi8qKlxuICogUEFUQ0ggYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucGF0Y2ggPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BBVENIJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUE9TVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdQT1NUJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUFVUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnB1dCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnUFVUJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG4iLCIvKipcbiAqIENoZWNrIGlmIGBmbmAgaXMgYSBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGZuKSB7XG4gIHZhciB0YWcgPSBpc09iamVjdChmbikgPyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZm4pIDogJyc7XG4gIHJldHVybiB0YWcgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvbjtcbiIsIi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYW4gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgcmV0dXJuIG51bGwgIT09IG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iajtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdDtcbiIsIi8qKlxuICogTW9kdWxlIG9mIG1peGVkLWluIGZ1bmN0aW9ucyBzaGFyZWQgYmV0d2VlbiBub2RlIGFuZCBjbGllbnQgY29kZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG4vKipcbiAqIEV4cG9zZSBgUmVxdWVzdEJhc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEJhc2U7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdEJhc2VgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVxdWVzdEJhc2Uob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIFJlcXVlc3RCYXNlLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gUmVxdWVzdEJhc2UucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBDbGVhciBwcmV2aW91cyB0aW1lb3V0LlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gX2NsZWFyVGltZW91dCgpe1xuICBjbGVhclRpbWVvdXQodGhpcy5fdGltZXIpO1xuICBjbGVhclRpbWVvdXQodGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpO1xuICBkZWxldGUgdGhpcy5fdGltZXI7XG4gIGRlbGV0ZSB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lcjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIGRlZmF1bHQgcmVzcG9uc2UgYm9keSBwYXJzZXJcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHRvIGNvbnZlcnQgaW5jb21pbmcgZGF0YSBpbnRvIHJlcXVlc3QuYm9keVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlKGZuKXtcbiAgdGhpcy5fcGFyc2VyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgZm9ybWF0IG9mIGJpbmFyeSByZXNwb25zZSBib2R5LlxuICogSW4gYnJvd3NlciB2YWxpZCBmb3JtYXRzIGFyZSAnYmxvYicgYW5kICdhcnJheWJ1ZmZlcicsXG4gKiB3aGljaCByZXR1cm4gQmxvYiBhbmQgQXJyYXlCdWZmZXIsIHJlc3BlY3RpdmVseS5cbiAqXG4gKiBJbiBOb2RlIGFsbCB2YWx1ZXMgcmVzdWx0IGluIEJ1ZmZlci5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5yZXNwb25zZVR5cGUoJ2Jsb2InKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVzcG9uc2VUeXBlID0gZnVuY3Rpb24odmFsKXtcbiAgdGhpcy5fcmVzcG9uc2VUeXBlID0gdmFsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgZGVmYXVsdCByZXF1ZXN0IGJvZHkgc2VyaWFsaXplclxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBkYXRhIHNldCB2aWEgLnNlbmQgb3IgLmF0dGFjaCBpbnRvIHBheWxvYWQgdG8gc2VuZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZm4pe1xuICB0aGlzLl9zZXJpYWxpemVyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGltZW91dHMuXG4gKlxuICogLSByZXNwb25zZSB0aW1lb3V0IGlzIHRpbWUgYmV0d2VlbiBzZW5kaW5nIHJlcXVlc3QgYW5kIHJlY2VpdmluZyB0aGUgZmlyc3QgYnl0ZSBvZiB0aGUgcmVzcG9uc2UuIEluY2x1ZGVzIEROUyBhbmQgY29ubmVjdGlvbiB0aW1lLlxuICogLSBkZWFkbGluZSBpcyB0aGUgdGltZSBmcm9tIHN0YXJ0IG9mIHRoZSByZXF1ZXN0IHRvIHJlY2VpdmluZyByZXNwb25zZSBib2R5IGluIGZ1bGwuIElmIHRoZSBkZWFkbGluZSBpcyB0b28gc2hvcnQgbGFyZ2UgZmlsZXMgbWF5IG5vdCBsb2FkIGF0IGFsbCBvbiBzbG93IGNvbm5lY3Rpb25zLlxuICpcbiAqIFZhbHVlIG9mIDAgb3IgZmFsc2UgbWVhbnMgbm8gdGltZW91dC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IG1zIG9yIHtyZXNwb25zZSwgcmVhZCwgZGVhZGxpbmV9XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiB0aW1lb3V0KG9wdGlvbnMpe1xuICBpZiAoIW9wdGlvbnMgfHwgJ29iamVjdCcgIT09IHR5cGVvZiBvcHRpb25zKSB7XG4gICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnM7XG4gICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGZvcih2YXIgb3B0aW9uIGluIG9wdGlvbnMpIHtcbiAgICBzd2l0Y2gob3B0aW9uKSB7XG4gICAgICBjYXNlICdkZWFkbGluZSc6XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSBvcHRpb25zLmRlYWRsaW5lO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3Jlc3BvbnNlJzpcbiAgICAgICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gb3B0aW9ucy5yZXNwb25zZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oXCJVbmtub3duIHRpbWVvdXQgb3B0aW9uXCIsIG9wdGlvbik7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgbnVtYmVyIG9mIHJldHJ5IGF0dGVtcHRzIG9uIGVycm9yLlxuICpcbiAqIEZhaWxlZCByZXF1ZXN0cyB3aWxsIGJlIHJldHJpZWQgJ2NvdW50JyB0aW1lcyBpZiB0aW1lb3V0IG9yIGVyci5jb2RlID49IDUwMC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmV0cnkgPSBmdW5jdGlvbiByZXRyeShjb3VudCl7XG4gIC8vIERlZmF1bHQgdG8gMSBpZiBubyBjb3VudCBwYXNzZWQgb3IgdHJ1ZVxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCBjb3VudCA9PT0gdHJ1ZSkgY291bnQgPSAxO1xuICBpZiAoY291bnQgPD0gMCkgY291bnQgPSAwO1xuICB0aGlzLl9tYXhSZXRyaWVzID0gY291bnQ7XG4gIHRoaXMuX3JldHJpZXMgPSAwO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0cnkgcmVxdWVzdFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9yZXRyeSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuXG4gIC8vIG5vZGVcbiAgaWYgKHRoaXMucmVxKSB7XG4gICAgdGhpcy5yZXEgPSBudWxsO1xuICAgIHRoaXMucmVxID0gdGhpcy5yZXF1ZXN0KCk7XG4gIH1cblxuICB0aGlzLl9hYm9ydGVkID0gZmFsc2U7XG4gIHRoaXMudGltZWRvdXQgPSBmYWxzZTtcblxuICByZXR1cm4gdGhpcy5fZW5kKCk7XG59O1xuXG4vKipcbiAqIFByb21pc2Ugc3VwcG9ydFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZWplY3RdXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gdGhlbihyZXNvbHZlLCByZWplY3QpIHtcbiAgaWYgKCF0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJXYXJuaW5nOiBzdXBlcmFnZW50IHJlcXVlc3Qgd2FzIHNlbnQgdHdpY2UsIGJlY2F1c2UgYm90aCAuZW5kKCkgYW5kIC50aGVuKCkgd2VyZSBjYWxsZWQuIE5ldmVyIGNhbGwgLmVuZCgpIGlmIHlvdSB1c2UgcHJvbWlzZXNcIik7XG4gICAgfVxuICAgIHRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oaW5uZXJSZXNvbHZlLCBpbm5lclJlamVjdCl7XG4gICAgICBzZWxmLmVuZChmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGlmIChlcnIpIGlubmVyUmVqZWN0KGVycik7IGVsc2UgaW5uZXJSZXNvbHZlKHJlcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZnVsbGZpbGxlZFByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xufVxuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2F0Y2ggPSBmdW5jdGlvbihjYikge1xuICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgY2IpO1xufTtcblxuLyoqXG4gKiBBbGxvdyBmb3IgZXh0ZW5zaW9uXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmbikge1xuICBmbih0aGlzKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5vayA9IGZ1bmN0aW9uKGNiKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgY2IpIHRocm93IEVycm9yKFwiQ2FsbGJhY2sgcmVxdWlyZWRcIik7XG4gIHRoaXMuX29rQ2FsbGJhY2sgPSBjYjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX2lzUmVzcG9uc2VPSyA9IGZ1bmN0aW9uKHJlcykge1xuICBpZiAoIXJlcykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0aGlzLl9va0NhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuX29rQ2FsbGJhY2socmVzKTtcbiAgfVxuXG4gIHJldHVybiByZXMuc3RhdHVzID49IDIwMCAmJiByZXMuc3RhdHVzIDwgMzAwO1xufTtcblxuXG4vKipcbiAqIEdldCByZXF1ZXN0IGhlYWRlciBgZmllbGRgLlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgcmV0dXJuIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogR2V0IGNhc2UtaW5zZW5zaXRpdmUgaGVhZGVyIGBmaWVsZGAgdmFsdWUuXG4gKiBUaGlzIGlzIGEgZGVwcmVjYXRlZCBpbnRlcm5hbCBBUEkuIFVzZSBgLmdldChmaWVsZClgIGluc3RlYWQuXG4gKlxuICogKGdldEhlYWRlciBpcyBubyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoZSBzdXBlcmFnZW50IGNvZGUgYmFzZSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQGRlcHJlY2F0ZWRcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0SGVhZGVyID0gUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldDtcblxuLyoqXG4gKiBTZXQgaGVhZGVyIGBmaWVsZGAgdG8gYHZhbGAsIG9yIG11bHRpcGxlIGZpZWxkcyB3aXRoIG9uZSBvYmplY3QuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCgnQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5zZXQoJ1gtQVBJLUtleScsICdmb29iYXInKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCh7IEFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLCAnWC1BUEktS2V5JzogJ2Zvb2JhcicgfSlcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGZpZWxkXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGZpZWxkLCB2YWwpe1xuICBpZiAoaXNPYmplY3QoZmllbGQpKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGZpZWxkKSB7XG4gICAgICB0aGlzLnNldChrZXksIGZpZWxkW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV0gPSB2YWw7XG4gIHRoaXMuaGVhZGVyW2ZpZWxkXSA9IHZhbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC51bnNldCgnVXNlci1BZ2VudCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS51bnNldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgZGVsZXRlIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbiAgZGVsZXRlIHRoaXMuaGVhZGVyW2ZpZWxkXTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyaXRlIHRoZSBmaWVsZCBgbmFtZWAgYW5kIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0XG4gKiBmb3IgXCJtdWx0aXBhcnQvZm9ybS1kYXRhXCIgcmVxdWVzdCBib2RpZXMuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoJ2ZvbycsICdiYXInKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoeyBmb286ICdiYXInLCBiYXo6ICdxdXgnIH0pXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xCbG9ifEZpbGV8QnVmZmVyfGZzLlJlYWRTdHJlYW19IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZmllbGQgPSBmdW5jdGlvbihuYW1lLCB2YWwpIHtcblxuICAvLyBuYW1lIHNob3VsZCBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgYW4gb2JqZWN0LlxuICBpZiAobnVsbCA9PT0gbmFtZSB8fCAgdW5kZWZpbmVkID09PSBuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCcuZmllbGQobmFtZSwgdmFsKSBuYW1lIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9kYXRhKSB7XG4gICAgY29uc29sZS5lcnJvcihcIi5maWVsZCgpIGNhbid0IGJlIHVzZWQgaWYgLnNlbmQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICB9XG5cbiAgaWYgKGlzT2JqZWN0KG5hbWUpKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgIHRoaXMuZmllbGQoa2V5LCBuYW1lW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICBmb3IgKHZhciBpIGluIHZhbCkge1xuICAgICAgdGhpcy5maWVsZChuYW1lLCB2YWxbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHZhbCBzaG91bGQgYmUgZGVmaW5lZCBub3dcbiAgaWYgKG51bGwgPT09IHZhbCB8fCB1bmRlZmluZWQgPT09IHZhbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgdmFsIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgfVxuICBpZiAoJ2Jvb2xlYW4nID09PSB0eXBlb2YgdmFsKSB7XG4gICAgdmFsID0gJycgKyB2YWw7XG4gIH1cbiAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQobmFtZSwgdmFsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFib3J0IHRoZSByZXF1ZXN0LCBhbmQgY2xlYXIgcG90ZW50aWFsIHRpbWVvdXQuXG4gKlxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgdGhpcy5fYWJvcnRlZCA9IHRydWU7XG4gIHRoaXMueGhyICYmIHRoaXMueGhyLmFib3J0KCk7IC8vIGJyb3dzZXJcbiAgdGhpcy5yZXEgJiYgdGhpcy5yZXEuYWJvcnQoKTsgLy8gbm9kZVxuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuICB0aGlzLmVtaXQoJ2Fib3J0Jyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbmFibGUgdHJhbnNtaXNzaW9uIG9mIGNvb2tpZXMgd2l0aCB4LWRvbWFpbiByZXF1ZXN0cy5cbiAqXG4gKiBOb3RlIHRoYXQgZm9yIHRoaXMgdG8gd29yayB0aGUgb3JpZ2luIG11c3Qgbm90IGJlXG4gKiB1c2luZyBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiIHdpdGggYSB3aWxkY2FyZCxcbiAqIGFuZCBhbHNvIG11c3Qgc2V0IFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHNcIlxuICogdG8gXCJ0cnVlXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUud2l0aENyZWRlbnRpYWxzID0gZnVuY3Rpb24ob24pe1xuICAvLyBUaGlzIGlzIGJyb3dzZXItb25seSBmdW5jdGlvbmFsaXR5LiBOb2RlIHNpZGUgaXMgbm8tb3AuXG4gIGlmKG9uPT11bmRlZmluZWQpIG9uID0gdHJ1ZTtcbiAgdGhpcy5fd2l0aENyZWRlbnRpYWxzID0gb247XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heCByZWRpcmVjdHMgdG8gYG5gLiBEb2VzIG5vdGluZyBpbiBicm93c2VyIFhIUiBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5yZWRpcmVjdHMgPSBmdW5jdGlvbihuKXtcbiAgdGhpcy5fbWF4UmVkaXJlY3RzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgdG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCAobm90IEpTT04gc3RyaW5nKSBvZiBzY2FsYXIgcHJvcGVydGllcy5cbiAqIE5vdGUgYXMgdGhpcyBtZXRob2QgaXMgZGVzaWduZWQgdG8gcmV0dXJuIGEgdXNlZnVsIG5vbi10aGlzIHZhbHVlLFxuICogaXQgY2Fubm90IGJlIGNoYWluZWQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBkZXNjcmliaW5nIG1ldGhvZCwgdXJsLCBhbmQgZGF0YSBvZiB0aGlzIHJlcXVlc3RcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgbWV0aG9kOiB0aGlzLm1ldGhvZCxcbiAgICB1cmw6IHRoaXMudXJsLFxuICAgIGRhdGE6IHRoaXMuX2RhdGEsXG4gICAgaGVhZGVyczogdGhpcy5faGVhZGVyXG4gIH07XG59O1xuXG5cbi8qKlxuICogU2VuZCBgZGF0YWAgYXMgdGhlIHJlcXVlc3QgYm9keSwgZGVmYXVsdGluZyB0aGUgYC50eXBlKClgIHRvIFwianNvblwiIHdoZW5cbiAqIGFuIG9iamVjdCBpcyBnaXZlbi5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgICAvLyBtYW51YWwganNvblxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdqc29uJylcbiAqICAgICAgICAgLnNlbmQoJ3tcIm5hbWVcIjpcInRqXCJ9JylcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBhdXRvIGpzb25cbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBtYW51YWwgeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxuICogICAgICAgICAuc2VuZCgnbmFtZT10aicpXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gYXV0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnZm9ybScpXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGRlZmF1bHRzIHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAuc2VuZCgnbmFtZT10b2JpJylcbiAqICAgICAgICAuc2VuZCgnc3BlY2llcz1mZXJyZXQnKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihkYXRhKXtcbiAgdmFyIGlzT2JqID0gaXNPYmplY3QoZGF0YSk7XG4gIHZhciB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcblxuICBpZiAodGhpcy5fZm9ybURhdGEpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiLnNlbmQoKSBjYW4ndCBiZSB1c2VkIGlmIC5hdHRhY2goKSBvciAuZmllbGQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICB9XG5cbiAgaWYgKGlzT2JqICYmICF0aGlzLl9kYXRhKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSBbXTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZGF0YSAmJiB0aGlzLl9kYXRhICYmIHRoaXMuX2lzSG9zdCh0aGlzLl9kYXRhKSkge1xuICAgIHRocm93IEVycm9yKFwiQ2FuJ3QgbWVyZ2UgdGhlc2Ugc2VuZCBjYWxsc1wiKTtcbiAgfVxuXG4gIC8vIG1lcmdlXG4gIGlmIChpc09iaiAmJiBpc09iamVjdCh0aGlzLl9kYXRhKSkge1xuICAgIGZvciAodmFyIGtleSBpbiBkYXRhKSB7XG4gICAgICB0aGlzLl9kYXRhW2tleV0gPSBkYXRhW2tleV07XG4gICAgfVxuICB9IGVsc2UgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBkYXRhKSB7XG4gICAgLy8gZGVmYXVsdCB0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAgICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnZm9ybScpO1xuICAgIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGlmICgnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyA9PSB0eXBlKSB7XG4gICAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YVxuICAgICAgICA/IHRoaXMuX2RhdGEgKyAnJicgKyBkYXRhXG4gICAgICAgIDogZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZGF0YSA9ICh0aGlzLl9kYXRhIHx8ICcnKSArIGRhdGE7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICB9XG5cbiAgaWYgKCFpc09iaiB8fCB0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRlZmF1bHQgdG8ganNvblxuICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnanNvbicpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTb3J0IGBxdWVyeXN0cmluZ2AgYnkgdGhlIHNvcnQgZnVuY3Rpb25cbiAqXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICAgLy8gZGVmYXVsdCBvcmRlclxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGN1c3RvbWl6ZWQgc29ydCBmdW5jdGlvblxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoZnVuY3Rpb24oYSwgYil7XG4gKiAgICAgICAgICAgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gKiAgICAgICAgIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHNvcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc29ydFF1ZXJ5ID0gZnVuY3Rpb24oc29ydCkge1xuICAvLyBfc29ydCBkZWZhdWx0IHRvIHRydWUgYnV0IG90aGVyd2lzZSBjYW4gYmUgYSBmdW5jdGlvbiBvciBib29sZWFuXG4gIHRoaXMuX3NvcnQgPSB0eXBlb2Ygc29ydCA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogc29ydDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEludm9rZSBjYWxsYmFjayB3aXRoIHRpbWVvdXQgZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl90aW1lb3V0RXJyb3IgPSBmdW5jdGlvbihyZWFzb24sIHRpbWVvdXQsIGVycm5vKXtcbiAgaWYgKHRoaXMuX2Fib3J0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGVyciA9IG5ldyBFcnJvcihyZWFzb24gKyB0aW1lb3V0ICsgJ21zIGV4Y2VlZGVkJyk7XG4gIGVyci50aW1lb3V0ID0gdGltZW91dDtcbiAgZXJyLmNvZGUgPSAnRUNPTk5BQk9SVEVEJztcbiAgZXJyLmVycm5vID0gZXJybm87XG4gIHRoaXMudGltZWRvdXQgPSB0cnVlO1xuICB0aGlzLmFib3J0KCk7XG4gIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fc2V0VGltZW91dHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIGRlYWRsaW5lXG4gIGlmICh0aGlzLl90aW1lb3V0ICYmICF0aGlzLl90aW1lcikge1xuICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgc2VsZi5fdGltZW91dEVycm9yKCdUaW1lb3V0IG9mICcsIHNlbGYuX3RpbWVvdXQsICdFVElNRScpO1xuICAgIH0sIHRoaXMuX3RpbWVvdXQpO1xuICB9XG4gIC8vIHJlc3BvbnNlIHRpbWVvdXRcbiAgaWYgKHRoaXMuX3Jlc3BvbnNlVGltZW91dCAmJiAhdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcignUmVzcG9uc2UgdGltZW91dCBvZiAnLCBzZWxmLl9yZXNwb25zZVRpbWVvdXQsICdFVElNRURPVVQnKTtcbiAgICB9LCB0aGlzLl9yZXNwb25zZVRpbWVvdXQpO1xuICB9XG59XG4iLCJcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZUJhc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUmVzcG9uc2VCYXNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlc3BvbnNlQmFzZWAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXNwb25zZUJhc2Uob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIFJlc3BvbnNlQmFzZS5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IFJlc3BvbnNlQmFzZS5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEdldCBjYXNlLWluc2Vuc2l0aXZlIGBmaWVsZGAgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiB0aGlzLmhlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogU2V0IGhlYWRlciByZWxhdGVkIHByb3BlcnRpZXM6XG4gKlxuICogICAtIGAudHlwZWAgdGhlIGNvbnRlbnQgdHlwZSB3aXRob3V0IHBhcmFtc1xuICpcbiAqIEEgcmVzcG9uc2Ugb2YgXCJDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIlxuICogd2lsbCBwcm92aWRlIHlvdSB3aXRoIGEgYC50eXBlYCBvZiBcInRleHQvcGxhaW5cIi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRIZWFkZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24oaGVhZGVyKXtcbiAgICAvLyBUT0RPOiBtb2FyIVxuICAgIC8vIFRPRE86IG1ha2UgdGhpcyBhIHV0aWxcblxuICAgIC8vIGNvbnRlbnQtdHlwZVxuICAgIHZhciBjdCA9IGhlYWRlclsnY29udGVudC10eXBlJ10gfHwgJyc7XG4gICAgdGhpcy50eXBlID0gdXRpbHMudHlwZShjdCk7XG5cbiAgICAvLyBwYXJhbXNcbiAgICB2YXIgcGFyYW1zID0gdXRpbHMucGFyYW1zKGN0KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB0aGlzW2tleV0gPSBwYXJhbXNba2V5XTtcblxuICAgIHRoaXMubGlua3MgPSB7fTtcblxuICAgIC8vIGxpbmtzXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKGhlYWRlci5saW5rKSB7XG4gICAgICAgICAgICB0aGlzLmxpbmtzID0gdXRpbHMucGFyc2VMaW5rcyhoZWFkZXIubGluayk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gaWdub3JlXG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXQgZmxhZ3Mgc3VjaCBhcyBgLm9rYCBiYXNlZCBvbiBgc3RhdHVzYC5cbiAqXG4gKiBGb3IgZXhhbXBsZSBhIDJ4eCByZXNwb25zZSB3aWxsIGdpdmUgeW91IGEgYC5va2Agb2YgX190cnVlX19cbiAqIHdoZXJlYXMgNXh4IHdpbGwgYmUgX19mYWxzZV9fIGFuZCBgLmVycm9yYCB3aWxsIGJlIF9fdHJ1ZV9fLiBUaGVcbiAqIGAuY2xpZW50RXJyb3JgIGFuZCBgLnNlcnZlckVycm9yYCBhcmUgYWxzbyBhdmFpbGFibGUgdG8gYmUgbW9yZVxuICogc3BlY2lmaWMsIGFuZCBgLnN0YXR1c1R5cGVgIGlzIHRoZSBjbGFzcyBvZiBlcnJvciByYW5naW5nIGZyb20gMS4uNVxuICogc29tZXRpbWVzIHVzZWZ1bCBmb3IgbWFwcGluZyByZXNwb25kIGNvbG9ycyBldGMuXG4gKlxuICogXCJzdWdhclwiIHByb3BlcnRpZXMgYXJlIGFsc28gZGVmaW5lZCBmb3IgY29tbW9uIGNhc2VzLiBDdXJyZW50bHkgcHJvdmlkaW5nOlxuICpcbiAqICAgLSAubm9Db250ZW50XG4gKiAgIC0gLmJhZFJlcXVlc3RcbiAqICAgLSAudW5hdXRob3JpemVkXG4gKiAgIC0gLm5vdEFjY2VwdGFibGVcbiAqICAgLSAubm90Rm91bmRcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gc3RhdHVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRTdGF0dXNQcm9wZXJ0aWVzID0gZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB2YXIgdHlwZSA9IHN0YXR1cyAvIDEwMCB8IDA7XG5cbiAgICAvLyBzdGF0dXMgLyBjbGFzc1xuICAgIHRoaXMuc3RhdHVzID0gdGhpcy5zdGF0dXNDb2RlID0gc3RhdHVzO1xuICAgIHRoaXMuc3RhdHVzVHlwZSA9IHR5cGU7XG5cbiAgICAvLyBiYXNpY3NcbiAgICB0aGlzLmluZm8gPSAxID09IHR5cGU7XG4gICAgdGhpcy5vayA9IDIgPT0gdHlwZTtcbiAgICB0aGlzLnJlZGlyZWN0ID0gMyA9PSB0eXBlO1xuICAgIHRoaXMuY2xpZW50RXJyb3IgPSA0ID09IHR5cGU7XG4gICAgdGhpcy5zZXJ2ZXJFcnJvciA9IDUgPT0gdHlwZTtcbiAgICB0aGlzLmVycm9yID0gKDQgPT0gdHlwZSB8fCA1ID09IHR5cGUpXG4gICAgICAgID8gdGhpcy50b0Vycm9yKClcbiAgICAgICAgOiBmYWxzZTtcblxuICAgIC8vIHN1Z2FyXG4gICAgdGhpcy5hY2NlcHRlZCA9IDIwMiA9PSBzdGF0dXM7XG4gICAgdGhpcy5ub0NvbnRlbnQgPSAyMDQgPT0gc3RhdHVzO1xuICAgIHRoaXMuYmFkUmVxdWVzdCA9IDQwMCA9PSBzdGF0dXM7XG4gICAgdGhpcy51bmF1dGhvcml6ZWQgPSA0MDEgPT0gc3RhdHVzO1xuICAgIHRoaXMubm90QWNjZXB0YWJsZSA9IDQwNiA9PSBzdGF0dXM7XG4gICAgdGhpcy5mb3JiaWRkZW4gPSA0MDMgPT0gc3RhdHVzO1xuICAgIHRoaXMubm90Rm91bmQgPSA0MDQgPT0gc3RhdHVzO1xufTtcbiIsInZhciBFUlJPUl9DT0RFUyA9IFtcbiAgJ0VDT05OUkVTRVQnLFxuICAnRVRJTUVET1VUJyxcbiAgJ0VBRERSSU5GTycsXG4gICdFU09DS0VUVElNRURPVVQnXG5dO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHJlcXVlc3Qgc2hvdWxkIGJlIHJldHJpZWQuXG4gKiAoQm9ycm93ZWQgZnJvbSBzZWdtZW50aW8vc3VwZXJhZ2VudC1yZXRyeSlcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IFtyZXNdXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaG91bGRSZXRyeShlcnIsIHJlcykge1xuICBpZiAoZXJyICYmIGVyci5jb2RlICYmIH5FUlJPUl9DT0RFUy5pbmRleE9mKGVyci5jb2RlKSkgcmV0dXJuIHRydWU7XG4gIGlmIChyZXMgJiYgcmVzLnN0YXR1cyAmJiByZXMuc3RhdHVzID49IDUwMCkgcmV0dXJuIHRydWU7XG4gIC8vIFN1cGVyYWdlbnQgdGltZW91dFxuICBpZiAoZXJyICYmICd0aW1lb3V0JyBpbiBlcnIgJiYgZXJyLmNvZGUgPT0gJ0VDT05OQUJPUlRFRCcpIHJldHVybiB0cnVlO1xuICBpZiAoZXJyICYmICdjcm9zc0RvbWFpbicgaW4gZXJyKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufTtcbiIsIlxuLyoqXG4gKiBSZXR1cm4gdGhlIG1pbWUgdHlwZSBmb3IgdGhlIGdpdmVuIGBzdHJgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uKHN0cil7XG4gIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykuc2hpZnQoKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGhlYWRlciBmaWVsZCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGFyYW1zID0gZnVuY3Rpb24oc3RyKXtcbiAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBzdHIpe1xuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo9ICovKTtcbiAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKTtcbiAgICB2YXIgdmFsID0gcGFydHMuc2hpZnQoKTtcblxuICAgIGlmIChrZXkgJiYgdmFsKSBvYmpba2V5XSA9IHZhbDtcbiAgICByZXR1cm4gb2JqO1xuICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFBhcnNlIExpbmsgaGVhZGVyIGZpZWxkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnBhcnNlTGlua3MgPSBmdW5jdGlvbihzdHIpe1xuICByZXR1cm4gc3RyLnNwbGl0KC8gKiwgKi8pLnJlZHVjZShmdW5jdGlvbihvYmosIHN0cil7XG4gICAgdmFyIHBhcnRzID0gc3RyLnNwbGl0KC8gKjsgKi8pO1xuICAgIHZhciB1cmwgPSBwYXJ0c1swXS5zbGljZSgxLCAtMSk7XG4gICAgdmFyIHJlbCA9IHBhcnRzWzFdLnNwbGl0KC8gKj0gKi8pWzFdLnNsaWNlKDEsIC0xKTtcbiAgICBvYmpbcmVsXSA9IHVybDtcbiAgICByZXR1cm4gb2JqO1xuICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFN0cmlwIGNvbnRlbnQgcmVsYXRlZCBmaWVsZHMgZnJvbSBgaGVhZGVyYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAcmV0dXJuIHtPYmplY3R9IGhlYWRlclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5jbGVhbkhlYWRlciA9IGZ1bmN0aW9uKGhlYWRlciwgc2hvdWxkU3RyaXBDb29raWUpe1xuICBkZWxldGUgaGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgZGVsZXRlIGhlYWRlclsnY29udGVudC1sZW5ndGgnXTtcbiAgZGVsZXRlIGhlYWRlclsndHJhbnNmZXItZW5jb2RpbmcnXTtcbiAgZGVsZXRlIGhlYWRlclsnaG9zdCddO1xuICBpZiAoc2hvdWxkU3RyaXBDb29raWUpIHtcbiAgICBkZWxldGUgaGVhZGVyWydjb29raWUnXTtcbiAgfVxuICByZXR1cm4gaGVhZGVyO1xufTsiLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydzdXBlcmFnZW50JywgJ3F1ZXJ5c3RyaW5nJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJ3N1cGVyYWdlbnQnKSwgcmVxdWlyZSgncXVlcnlzdHJpbmcnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQgPSBmYWN0b3J5KHJvb3Quc3VwZXJhZ2VudCwgcm9vdC5xdWVyeXN0cmluZyk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oc3VwZXJhZ2VudCwgcXVlcnlzdHJpbmcpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBAbW9kdWxlIEFwaUNsaWVudFxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogTWFuYWdlcyBsb3cgbGV2ZWwgY2xpZW50LXNlcnZlciBjb21tdW5pY2F0aW9ucywgcGFyYW1ldGVyIG1hcnNoYWxsaW5nLCBldGMuIFRoZXJlIHNob3VsZCBub3QgYmUgYW55IG5lZWQgZm9yIGFuXG4gICAqIGFwcGxpY2F0aW9uIHRvIHVzZSB0aGlzIGNsYXNzIGRpcmVjdGx5IC0gdGhlICpBcGkgYW5kIG1vZGVsIGNsYXNzZXMgcHJvdmlkZSB0aGUgcHVibGljIEFQSSBmb3IgdGhlIHNlcnZpY2UuIFRoZVxuICAgKiBjb250ZW50cyBvZiB0aGlzIGZpbGUgc2hvdWxkIGJlIHJlZ2FyZGVkIGFzIGludGVybmFsIGJ1dCBhcmUgZG9jdW1lbnRlZCBmb3IgY29tcGxldGVuZXNzLlxuICAgKiBAYWxpYXMgbW9kdWxlOkFwaUNsaWVudFxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogVGhlIGJhc2UgVVJMIGFnYWluc3Qgd2hpY2ggdG8gcmVzb2x2ZSBldmVyeSBBUEkgY2FsbCdzIChyZWxhdGl2ZSkgcGF0aC5cbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgICAqIEBkZWZhdWx0IGh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC92MlxuICAgICAqL1xuICAgIHRoaXMuYmFzZVBhdGggPSAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3YyJy5yZXBsYWNlKC9cXC8rJC8sICcnKTtcblxuICAgIC8qKlxuICAgICAqIFRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2RzIHRvIGJlIGluY2x1ZGVkIGZvciBhbGwgQVBJIGNhbGxzLlxuICAgICAqIEB0eXBlIHtBcnJheS48U3RyaW5nPn1cbiAgICAgKi9cbiAgICB0aGlzLmF1dGhlbnRpY2F0aW9ucyA9IHtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoZSBkZWZhdWx0IEhUVFAgaGVhZGVycyB0byBiZSBpbmNsdWRlZCBmb3IgYWxsIEFQSSBjYWxscy5cbiAgICAgKiBAdHlwZSB7QXJyYXkuPFN0cmluZz59XG4gICAgICogQGRlZmF1bHQge31cbiAgICAgKi9cbiAgICB0aGlzLmRlZmF1bHRIZWFkZXJzID0ge307XG5cbiAgICAvKipcbiAgICAgKiBUaGUgZGVmYXVsdCBIVFRQIHRpbWVvdXQgZm9yIGFsbCBBUEkgY2FsbHMuXG4gICAgICogQHR5cGUge051bWJlcn1cbiAgICAgKiBAZGVmYXVsdCA2MDAwMFxuICAgICAqL1xuICAgIHRoaXMudGltZW91dCA9IDYwMDAwO1xuXG4gICAgLyoqXG4gICAgICogSWYgc2V0IHRvIGZhbHNlIGFuIGFkZGl0aW9uYWwgdGltZXN0YW1wIHBhcmFtZXRlciBpcyBhZGRlZCB0byBhbGwgQVBJIEdFVCBjYWxscyB0b1xuICAgICAqIHByZXZlbnQgYnJvd3NlciBjYWNoaW5nXG4gICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICogQGRlZmF1bHQgdHJ1ZVxuICAgICAqL1xuICAgIHRoaXMuY2FjaGUgPSB0cnVlO1xuXG4gICAgLyoqXG4gICAgICogSWYgc2V0IHRvIHRydWUsIHRoZSBjbGllbnQgd2lsbCBzYXZlIHRoZSBjb29raWVzIGZyb20gZWFjaCBzZXJ2ZXJcbiAgICAgKiByZXNwb25zZSwgYW5kIHJldHVybiB0aGVtIGluIHRoZSBuZXh0IHJlcXVlc3QuXG4gICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgKi9cbiAgICB0aGlzLmVuYWJsZUNvb2tpZXMgPSBmYWxzZTtcblxuICAgIC8qXG4gICAgICogVXNlZCB0byBzYXZlIGFuZCByZXR1cm4gY29va2llcyBpbiBhIG5vZGUuanMgKG5vbi1icm93c2VyKSBzZXR0aW5nLFxuICAgICAqIGlmIHRoaXMuZW5hYmxlQ29va2llcyBpcyBzZXQgdG8gdHJ1ZS5cbiAgICAgKi9cbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMuYWdlbnQgPSBuZXcgc3VwZXJhZ2VudC5hZ2VudCgpO1xuICAgIH1cblxuICAgIC8qXG4gICAgICogQWxsb3cgdXNlciB0byBvdmVycmlkZSBzdXBlcmFnZW50IGFnZW50XG4gICAgICovXG4gICAgdGhpcy5yZXF1ZXN0QWdlbnQgPSBudWxsO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIGZvciBhbiBhY3R1YWwgcGFyYW1ldGVyLlxuICAgKiBAcGFyYW0gcGFyYW0gVGhlIGFjdHVhbCBwYXJhbWV0ZXIuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgPGNvZGU+cGFyYW08L2NvZGU+LlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUucGFyYW1Ub1N0cmluZyA9IGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgaWYgKHBhcmFtID09IHVuZGVmaW5lZCB8fCBwYXJhbSA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIGlmIChwYXJhbSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgIHJldHVybiBwYXJhbS50b0pTT04oKTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcmFtLnRvU3RyaW5nKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBmdWxsIFVSTCBieSBhcHBlbmRpbmcgdGhlIGdpdmVuIHBhdGggdG8gdGhlIGJhc2UgVVJMIGFuZCByZXBsYWNpbmcgcGF0aCBwYXJhbWV0ZXIgcGxhY2UtaG9sZGVycyB3aXRoIHBhcmFtZXRlciB2YWx1ZXMuXG4gICAqIE5PVEU6IHF1ZXJ5IHBhcmFtZXRlcnMgYXJlIG5vdCBoYW5kbGVkIGhlcmUuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIGFwcGVuZCB0byB0aGUgYmFzZSBVUkwuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwYXRoUGFyYW1zIFRoZSBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFwcGVuZC5cbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGVuY29kZWQgcGF0aCB3aXRoIHBhcmFtZXRlciB2YWx1ZXMgc3Vic3RpdHV0ZWQuXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5idWlsZFVybCA9IGZ1bmN0aW9uKHBhdGgsIHBhdGhQYXJhbXMpIHtcbiAgICBpZiAoIXBhdGgubWF0Y2goL15cXC8vKSkge1xuICAgICAgcGF0aCA9ICcvJyArIHBhdGg7XG4gICAgfVxuICAgIHZhciB1cmwgPSB0aGlzLmJhc2VQYXRoICsgcGF0aDtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHVybCA9IHVybC5yZXBsYWNlKC9cXHsoW1xcdy1dKylcXH0vZywgZnVuY3Rpb24oZnVsbE1hdGNoLCBrZXkpIHtcbiAgICAgIHZhciB2YWx1ZTtcbiAgICAgIGlmIChwYXRoUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdmFsdWUgPSBfdGhpcy5wYXJhbVRvU3RyaW5nKHBhdGhQYXJhbXNba2V5XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGZ1bGxNYXRjaDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiB1cmw7XG4gIH07XG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBjb250ZW50IHR5cGUgcmVwcmVzZW50cyBKU09OLjxicj5cbiAgICogSlNPTiBjb250ZW50IHR5cGUgZXhhbXBsZXM6PGJyPlxuICAgKiA8dWw+XG4gICAqIDxsaT5hcHBsaWNhdGlvbi9qc29uPC9saT5cbiAgICogPGxpPmFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGODwvbGk+XG4gICAqIDxsaT5BUFBMSUNBVElPTi9KU09OPC9saT5cbiAgICogPC91bD5cbiAgICogQHBhcmFtIHtTdHJpbmd9IGNvbnRlbnRUeXBlIFRoZSBNSU1FIGNvbnRlbnQgdHlwZSB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IDxjb2RlPnRydWU8L2NvZGU+IGlmIDxjb2RlPmNvbnRlbnRUeXBlPC9jb2RlPiByZXByZXNlbnRzIEpTT04sIG90aGVyd2lzZSA8Y29kZT5mYWxzZTwvY29kZT4uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5pc0pzb25NaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGUpIHtcbiAgICByZXR1cm4gQm9vbGVhbihjb250ZW50VHlwZSAhPSBudWxsICYmIGNvbnRlbnRUeXBlLm1hdGNoKC9eYXBwbGljYXRpb25cXC9qc29uKDsuKik/JC9pKSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENob29zZXMgYSBjb250ZW50IHR5cGUgZnJvbSB0aGUgZ2l2ZW4gYXJyYXksIHdpdGggSlNPTiBwcmVmZXJyZWQ7IGkuZS4gcmV0dXJuIEpTT04gaWYgaW5jbHVkZWQsIG90aGVyd2lzZSByZXR1cm4gdGhlIGZpcnN0LlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBjb250ZW50VHlwZXNcbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGNob3NlbiBjb250ZW50IHR5cGUsIHByZWZlcnJpbmcgSlNPTi5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlLmpzb25QcmVmZXJyZWRNaW1lID0gZnVuY3Rpb24oY29udGVudFR5cGVzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250ZW50VHlwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh0aGlzLmlzSnNvbk1pbWUoY29udGVudFR5cGVzW2ldKSkge1xuICAgICAgICByZXR1cm4gY29udGVudFR5cGVzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29udGVudFR5cGVzWzBdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgZ2l2ZW4gcGFyYW1ldGVyIHZhbHVlIHJlcHJlc2VudHMgZmlsZS1saWtlIGNvbnRlbnQuXG4gICAqIEBwYXJhbSBwYXJhbSBUaGUgcGFyYW1ldGVyIHRvIGNoZWNrLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gPGNvZGU+dHJ1ZTwvY29kZT4gaWYgPGNvZGU+cGFyYW08L2NvZGU+IHJlcHJlc2VudHMgYSBmaWxlLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuaXNGaWxlUGFyYW0gPSBmdW5jdGlvbihwYXJhbSkge1xuICAgIC8vIGZzLlJlYWRTdHJlYW0gaW4gTm9kZS5qcyBhbmQgRWxlY3Ryb24gKGJ1dCBub3QgaW4gcnVudGltZSBsaWtlIGJyb3dzZXJpZnkpXG4gICAgaWYgKHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgZnM7XG4gICAgICB0cnkge1xuICAgICAgICBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHt9XG4gICAgICBpZiAoZnMgJiYgZnMuUmVhZFN0cmVhbSAmJiBwYXJhbSBpbnN0YW5jZW9mIGZzLlJlYWRTdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEJ1ZmZlciBpbiBOb2RlLmpzXG4gICAgaWYgKHR5cGVvZiBCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCdWZmZXIpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLyBCbG9iIGluIGJyb3dzZXJcbiAgICBpZiAodHlwZW9mIEJsb2IgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gRmlsZSBpbiBicm93c2VyIChpdCBzZWVtcyBGaWxlIG9iamVjdCBpcyBhbHNvIGluc3RhbmNlIG9mIEJsb2IsIGJ1dCBrZWVwIHRoaXMgZm9yIHNhZmUpXG4gICAgaWYgKHR5cGVvZiBGaWxlID09PSAnZnVuY3Rpb24nICYmIHBhcmFtIGluc3RhbmNlb2YgRmlsZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAvKipcbiAgICogTm9ybWFsaXplcyBwYXJhbWV0ZXIgdmFsdWVzOlxuICAgKiA8dWw+XG4gICAqIDxsaT5yZW1vdmUgbmlsczwvbGk+XG4gICAqIDxsaT5rZWVwIGZpbGVzIGFuZCBhcnJheXM8L2xpPlxuICAgKiA8bGk+Zm9ybWF0IHRvIHN0cmluZyB3aXRoIGBwYXJhbVRvU3RyaW5nYCBmb3Igb3RoZXIgY2FzZXM8L2xpPlxuICAgKiA8L3VsPlxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBwYXJhbXMgVGhlIHBhcmFtZXRlcnMgYXMgb2JqZWN0IHByb3BlcnRpZXMuXG4gICAqIEByZXR1cm5zIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gbm9ybWFsaXplZCBwYXJhbWV0ZXJzLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUubm9ybWFsaXplUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdmFyIG5ld1BhcmFtcyA9IHt9O1xuICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHtcbiAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBwYXJhbXNba2V5XSAhPSB1bmRlZmluZWQgJiYgcGFyYW1zW2tleV0gIT0gbnVsbCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbXNba2V5XTtcbiAgICAgICAgaWYgKHRoaXMuaXNGaWxlUGFyYW0odmFsdWUpIHx8IEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgbmV3UGFyYW1zW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdQYXJhbXNba2V5XSA9IHRoaXMucGFyYW1Ub1N0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld1BhcmFtcztcbiAgfTtcblxuICAvKipcbiAgICogRW51bWVyYXRpb24gb2YgY29sbGVjdGlvbiBmb3JtYXQgc2VwYXJhdG9yIHN0cmF0ZWdpZXMuXG4gICAqIEBlbnVtIHtTdHJpbmd9XG4gICAqIEByZWFkb25seVxuICAgKi9cbiAgZXhwb3J0cy5Db2xsZWN0aW9uRm9ybWF0RW51bSA9IHtcbiAgICAvKipcbiAgICAgKiBDb21tYS1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+Y3N2PC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIENTVjogJywnLFxuICAgIC8qKlxuICAgICAqIFNwYWNlLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5zc3Y8L2NvZGU+XG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgU1NWOiAnICcsXG4gICAgLyoqXG4gICAgICogVGFiLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT50c3Y8L2NvZGU+XG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgVFNWOiAnXFx0JyxcbiAgICAvKipcbiAgICAgKiBQaXBlKHwpLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5waXBlczwvY29kZT5cbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBQSVBFUzogJ3wnLFxuICAgIC8qKlxuICAgICAqIE5hdGl2ZSBhcnJheS4gVmFsdWU6IDxjb2RlPm11bHRpPC9jb2RlPlxuICAgICAqIEBjb25zdFxuICAgICAqL1xuICAgIE1VTFRJOiAnbXVsdGknXG4gIH07XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBhcnJheS10eXBlIGFjdHVhbCBwYXJhbWV0ZXIsIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gY29sbGVjdGlvbiBmb3JtYXQuXG4gICAqIEBwYXJhbSB7QXJyYXl9IHBhcmFtIEFuIGFycmF5IHBhcmFtZXRlci5cbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50LkNvbGxlY3Rpb25Gb3JtYXRFbnVtfSBjb2xsZWN0aW9uRm9ybWF0IFRoZSBhcnJheSBlbGVtZW50IHNlcGFyYXRvciBzdHJhdGVneS5cbiAgICogQHJldHVybnMge1N0cmluZ3xBcnJheX0gQSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhlIHN1cHBsaWVkIGNvbGxlY3Rpb24sIHVzaW5nIHRoZSBzcGVjaWZpZWQgZGVsaW1pdGVyLiBSZXR1cm5zXG4gICAqIDxjb2RlPnBhcmFtPC9jb2RlPiBhcyBpcyBpZiA8Y29kZT5jb2xsZWN0aW9uRm9ybWF0PC9jb2RlPiBpcyA8Y29kZT5tdWx0aTwvY29kZT4uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZS5idWlsZENvbGxlY3Rpb25QYXJhbSA9IGZ1bmN0aW9uIGJ1aWxkQ29sbGVjdGlvblBhcmFtKHBhcmFtLCBjb2xsZWN0aW9uRm9ybWF0KSB7XG4gICAgaWYgKHBhcmFtID09IG51bGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBzd2l0Y2ggKGNvbGxlY3Rpb25Gb3JtYXQpIHtcbiAgICAgIGNhc2UgJ2Nzdic6XG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCcsJyk7XG4gICAgICBjYXNlICdzc3YnOlxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignICcpO1xuICAgICAgY2FzZSAndHN2JzpcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpLmpvaW4oJ1xcdCcpO1xuICAgICAgY2FzZSAncGlwZXMnOlxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignfCcpO1xuICAgICAgY2FzZSAnbXVsdGknOlxuICAgICAgICAvLyByZXR1cm4gdGhlIGFycmF5IGRpcmVjdGx5IGFzIFN1cGVyQWdlbnQgd2lsbCBoYW5kbGUgaXQgYXMgZXhwZWN0ZWRcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNvbGxlY3Rpb24gZm9ybWF0OiAnICsgY29sbGVjdGlvbkZvcm1hdCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBBcHBsaWVzIGF1dGhlbnRpY2F0aW9uIGhlYWRlcnMgdG8gdGhlIHJlcXVlc3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IFRoZSByZXF1ZXN0IG9iamVjdCBjcmVhdGVkIGJ5IGEgPGNvZGU+c3VwZXJhZ2VudCgpPC9jb2RlPiBjYWxsLlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBhdXRoTmFtZXMgQW4gYXJyYXkgb2YgYXV0aGVudGljYXRpb24gbWV0aG9kIG5hbWVzLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuYXBwbHlBdXRoVG9SZXF1ZXN0ID0gZnVuY3Rpb24ocmVxdWVzdCwgYXV0aE5hbWVzKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBhdXRoTmFtZXMuZm9yRWFjaChmdW5jdGlvbihhdXRoTmFtZSkge1xuICAgICAgdmFyIGF1dGggPSBfdGhpcy5hdXRoZW50aWNhdGlvbnNbYXV0aE5hbWVdO1xuICAgICAgc3dpdGNoIChhdXRoLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnYmFzaWMnOlxuICAgICAgICAgIGlmIChhdXRoLnVzZXJuYW1lIHx8IGF1dGgucGFzc3dvcmQpIHtcbiAgICAgICAgICAgIHJlcXVlc3QuYXV0aChhdXRoLnVzZXJuYW1lIHx8ICcnLCBhdXRoLnBhc3N3b3JkIHx8ICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2FwaUtleSc6XG4gICAgICAgICAgaWYgKGF1dGguYXBpS2V5KSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICAgICAgaWYgKGF1dGguYXBpS2V5UHJlZml4KSB7XG4gICAgICAgICAgICAgIGRhdGFbYXV0aC5uYW1lXSA9IGF1dGguYXBpS2V5UHJlZml4ICsgJyAnICsgYXV0aC5hcGlLZXk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBkYXRhW2F1dGgubmFtZV0gPSBhdXRoLmFwaUtleTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdXRoWydpbiddID09PSAnaGVhZGVyJykge1xuICAgICAgICAgICAgICByZXF1ZXN0LnNldChkYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlcXVlc3QucXVlcnkoZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdvYXV0aDInOlxuICAgICAgICAgIGlmIChhdXRoLmFjY2Vzc1Rva2VuKSB7XG4gICAgICAgICAgICByZXF1ZXN0LnNldCh7J0F1dGhvcml6YXRpb24nOiAnQmVhcmVyICcgKyBhdXRoLmFjY2Vzc1Rva2VufSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBhdXRoZW50aWNhdGlvbiB0eXBlOiAnICsgYXV0aC50eXBlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogRGVzZXJpYWxpemVzIGFuIEhUVFAgcmVzcG9uc2UgYm9keSBpbnRvIGEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgQSBTdXBlckFnZW50IHJlc3BvbnNlIG9iamVjdC5cbiAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5LjxTdHJpbmc+fE9iamVjdC48U3RyaW5nLCBPYmplY3Q+fEZ1bmN0aW9uKX0gcmV0dXJuVHlwZSBUaGUgdHlwZSB0byByZXR1cm4uIFBhc3MgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlc1xuICAgKiBvciB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIGEgY29tcGxleCB0eXBlLiBQYXNzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHR5cGUgbmFtZSB0byByZXR1cm4gYW4gYXJyYXkgb2YgdGhhdCB0eXBlLiBUb1xuICAgKiByZXR1cm4gYW4gb2JqZWN0LCBwYXNzIGFuIG9iamVjdCB3aXRoIG9uZSBwcm9wZXJ0eSB3aG9zZSBuYW1lIGlzIHRoZSBrZXkgdHlwZSBhbmQgd2hvc2UgdmFsdWUgaXMgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWUgdHlwZTpcbiAgICogYWxsIHByb3BlcnRpZXMgb24gPGNvZGU+ZGF0YTxjb2RlPiB3aWxsIGJlIGNvbnZlcnRlZCB0byB0aGlzIHR5cGUuXG4gICAqIEByZXR1cm5zIEEgdmFsdWUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiBkZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSkge1xuICAgIGlmIChyZXNwb25zZSA9PSBudWxsIHx8IHJldHVyblR5cGUgPT0gbnVsbCB8fCByZXNwb25zZS5zdGF0dXMgPT0gMjA0KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgLy8gUmVseSBvbiBTdXBlckFnZW50IGZvciBwYXJzaW5nIHJlc3BvbnNlIGJvZHkuXG4gICAgLy8gU2VlIGh0dHA6Ly92aXNpb25tZWRpYS5naXRodWIuaW8vc3VwZXJhZ2VudC8jcGFyc2luZy1yZXNwb25zZS1ib2RpZXNcbiAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmJvZHk7XG4gICAgaWYgKGRhdGEgPT0gbnVsbCB8fCAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIHR5cGVvZiBkYXRhLmxlbmd0aCA9PT0gJ3VuZGVmaW5lZCcgJiYgIU9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCkpIHtcbiAgICAgIC8vIFN1cGVyQWdlbnQgZG9lcyBub3QgYWx3YXlzIHByb2R1Y2UgYSBib2R5OyB1c2UgdGhlIHVucGFyc2VkIHJlc3BvbnNlIGFzIGEgZmFsbGJhY2tcbiAgICAgIGRhdGEgPSByZXNwb25zZS50ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGRhdGEsIHJldHVyblR5cGUpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvbi5cbiAgICogQGNhbGxiYWNrIG1vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAqIEBwYXJhbSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICovXG5cbiAgLyoqXG4gICAqIEludm9rZXMgdGhlIFJFU1Qgc2VydmljZSB1c2luZyB0aGUgc3VwcGxpZWQgc2V0dGluZ3MgYW5kIHBhcmFtZXRlcnMuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBiYXNlIFVSTCB0byBpbnZva2UuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBodHRwTWV0aG9kIFRoZSBIVFRQIG1ldGhvZCB0byB1c2UuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIFN0cmluZz59IHBhdGhQYXJhbXMgQSBtYXAgb2YgcGF0aCBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IHF1ZXJ5UGFyYW1zIEEgbWFwIG9mIHF1ZXJ5IHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gY29sbGVjdGlvblF1ZXJ5UGFyYW1zIEEgbWFwIG9mIGNvbGxlY3Rpb24gcXVlcnkgcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBoZWFkZXJQYXJhbXMgQSBtYXAgb2YgaGVhZGVyIHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gZm9ybVBhcmFtcyBBIG1hcCBvZiBmb3JtIHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cbiAgICogQHBhcmFtIHtPYmplY3R9IGJvZHlQYXJhbSBUaGUgdmFsdWUgdG8gcGFzcyBhcyB0aGUgcmVxdWVzdCBib2R5LlxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBhdXRoTmFtZXMgQW4gYXJyYXkgb2YgYXV0aGVudGljYXRpb24gdHlwZSBuYW1lcy5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gY29udGVudFR5cGVzIEFuIGFycmF5IG9mIHJlcXVlc3QgTUlNRSB0eXBlcy5cbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYWNjZXB0cyBBbiBhcnJheSBvZiBhY2NlcHRhYmxlIHJlc3BvbnNlIE1JTUUgdHlwZXMuXG4gICAqIEBwYXJhbSB7KFN0cmluZ3xBcnJheXxPYmplY3RGdW5jdGlvbil9IHJldHVyblR5cGUgVGhlIHJlcXVpcmVkIHR5cGUgdG8gcmV0dXJuOyBjYW4gYmUgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlcyBvciB0aGVcbiAgICogY29uc3RydWN0b3IgZm9yIGEgY29tcGxleCB0eXBlLlxuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR+Y2FsbEFwaUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IFRoZSBTdXBlckFnZW50IHJlcXVlc3Qgb2JqZWN0LlxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGUuY2FsbEFwaSA9IGZ1bmN0aW9uIGNhbGxBcGkocGF0aCwgaHR0cE1ldGhvZCwgcGF0aFBhcmFtcyxcbiAgICAgIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgYm9keVBhcmFtLCBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cyxcbiAgICAgIHJldHVyblR5cGUsIGNhbGxiYWNrKSB7XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciB1cmwgPSB0aGlzLmJ1aWxkVXJsKHBhdGgsIHBhdGhQYXJhbXMpO1xuICAgIHZhciByZXF1ZXN0ID0gc3VwZXJhZ2VudChodHRwTWV0aG9kLCB1cmwpO1xuXG4gICAgLy8gYXBwbHkgYXV0aGVudGljYXRpb25zXG4gICAgdGhpcy5hcHBseUF1dGhUb1JlcXVlc3QocmVxdWVzdCwgYXV0aE5hbWVzKTtcblxuICAgIC8vIHNldCBjb2xsZWN0aW9uIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICBmb3IgKHZhciBrZXkgaW4gY29sbGVjdGlvblF1ZXJ5UGFyYW1zKSB7XG4gICAgICBpZiAoY29sbGVjdGlvblF1ZXJ5UGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdmFyIHBhcmFtID0gY29sbGVjdGlvblF1ZXJ5UGFyYW1zW2tleV07XG4gICAgICAgIGlmIChwYXJhbS5jb2xsZWN0aW9uRm9ybWF0ID09PSAnY3N2Jykge1xuICAgICAgICAgIC8vIFN1cGVyQWdlbnQgbm9ybWFsbHkgcGVyY2VudC1lbmNvZGVzIGFsbCByZXNlcnZlZCBjaGFyYWN0ZXJzIGluIGEgcXVlcnkgcGFyYW1ldGVyLiBIb3dldmVyLFxuICAgICAgICAgIC8vIGNvbW1hcyBhcmUgdXNlZCBhcyBkZWxpbWl0ZXJzIGZvciB0aGUgJ2NzdicgY29sbGVjdGlvbkZvcm1hdCBzbyB0aGV5IG11c3Qgbm90IGJlIGVuY29kZWQuIFdlXG4gICAgICAgICAgLy8gbXVzdCB0aGVyZWZvcmUgY29uc3RydWN0IGFuZCBlbmNvZGUgJ2NzdicgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzIG1hbnVhbGx5LlxuICAgICAgICAgIGlmIChwYXJhbS52YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbS52YWx1ZS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKCcsJyk7XG4gICAgICAgICAgICByZXF1ZXN0LnF1ZXJ5KGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCIgKyB2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIEFsbCBvdGhlciBjb2xsZWN0aW9uIHF1ZXJ5IHBhcmFtZXRlcnMgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgb3JkaW5hcnkgcXVlcnkgcGFyYW1ldGVycy5cbiAgICAgICAgICBxdWVyeVBhcmFtc1trZXldID0gdGhpcy5idWlsZENvbGxlY3Rpb25QYXJhbShwYXJhbS52YWx1ZSwgcGFyYW0uY29sbGVjdGlvbkZvcm1hdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzZXQgcXVlcnkgcGFyYW1ldGVyc1xuICAgIGlmIChodHRwTWV0aG9kLnRvVXBwZXJDYXNlKCkgPT09ICdHRVQnICYmIHRoaXMuY2FjaGUgPT09IGZhbHNlKSB7XG4gICAgICAgIHF1ZXJ5UGFyYW1zWydfJ10gPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9XG4gICAgcmVxdWVzdC5xdWVyeSh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhxdWVyeVBhcmFtcykpO1xuXG4gICAgLy8gc2V0IGhlYWRlciBwYXJhbWV0ZXJzXG4gICAgcmVxdWVzdC5zZXQodGhpcy5kZWZhdWx0SGVhZGVycykuc2V0KHRoaXMubm9ybWFsaXplUGFyYW1zKGhlYWRlclBhcmFtcykpO1xuXG5cbiAgICAvLyBzZXQgcmVxdWVzdEFnZW50IGlmIGl0IGlzIHNldCBieSB1c2VyXG4gICAgaWYgKHRoaXMucmVxdWVzdEFnZW50KSB7XG4gICAgICByZXF1ZXN0LmFnZW50KHRoaXMucmVxdWVzdEFnZW50KTtcbiAgICB9XG5cbiAgICAvLyBzZXQgcmVxdWVzdCB0aW1lb3V0XG4gICAgcmVxdWVzdC50aW1lb3V0KHRoaXMudGltZW91dCk7XG5cbiAgICB2YXIgY29udGVudFR5cGUgPSB0aGlzLmpzb25QcmVmZXJyZWRNaW1lKGNvbnRlbnRUeXBlcyk7XG4gICAgaWYgKGNvbnRlbnRUeXBlKSB7XG4gICAgICAvLyBJc3N1ZSB3aXRoIHN1cGVyYWdlbnQgYW5kIG11bHRpcGFydC9mb3JtLWRhdGEgKGh0dHBzOi8vZ2l0aHViLmNvbS92aXNpb25tZWRpYS9zdXBlcmFnZW50L2lzc3Vlcy83NDYpXG4gICAgICBpZihjb250ZW50VHlwZSAhPSAnbXVsdGlwYXJ0L2Zvcm0tZGF0YScpIHtcbiAgICAgICAgcmVxdWVzdC50eXBlKGNvbnRlbnRUeXBlKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFyZXF1ZXN0LmhlYWRlclsnQ29udGVudC1UeXBlJ10pIHtcbiAgICAgIHJlcXVlc3QudHlwZSgnYXBwbGljYXRpb24vanNvbicpO1xuICAgIH1cblxuICAgIGlmIChjb250ZW50VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpIHtcbiAgICAgIHJlcXVlc3Quc2VuZChxdWVyeXN0cmluZy5zdHJpbmdpZnkodGhpcy5ub3JtYWxpemVQYXJhbXMoZm9ybVBhcmFtcykpKTtcbiAgICB9IGVsc2UgaWYgKGNvbnRlbnRUeXBlID09ICdtdWx0aXBhcnQvZm9ybS1kYXRhJykge1xuICAgICAgdmFyIF9mb3JtUGFyYW1zID0gdGhpcy5ub3JtYWxpemVQYXJhbXMoZm9ybVBhcmFtcyk7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gX2Zvcm1QYXJhbXMpIHtcbiAgICAgICAgaWYgKF9mb3JtUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZiAodGhpcy5pc0ZpbGVQYXJhbShfZm9ybVBhcmFtc1trZXldKSkge1xuICAgICAgICAgICAgLy8gZmlsZSBmaWVsZFxuICAgICAgICAgICAgcmVxdWVzdC5hdHRhY2goa2V5LCBfZm9ybVBhcmFtc1trZXldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVxdWVzdC5maWVsZChrZXksIF9mb3JtUGFyYW1zW2tleV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYm9keVBhcmFtKSB7XG4gICAgICByZXF1ZXN0LnNlbmQoYm9keVBhcmFtKTtcbiAgICB9XG5cbiAgICB2YXIgYWNjZXB0ID0gdGhpcy5qc29uUHJlZmVycmVkTWltZShhY2NlcHRzKTtcbiAgICBpZiAoYWNjZXB0KSB7XG4gICAgICByZXF1ZXN0LmFjY2VwdChhY2NlcHQpO1xuICAgIH1cblxuICAgIGlmIChyZXR1cm5UeXBlID09PSAnQmxvYicpIHtcbiAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlKCdibG9iJyk7XG4gICAgfSBlbHNlIGlmIChyZXR1cm5UeXBlID09PSAnU3RyaW5nJykge1xuICAgICAgcmVxdWVzdC5yZXNwb25zZVR5cGUoJ3N0cmluZycpO1xuICAgIH1cblxuICAgIC8vIEF0dGFjaCBwcmV2aW91c2x5IHNhdmVkIGNvb2tpZXMsIGlmIGVuYWJsZWRcbiAgICBpZiAodGhpcy5lbmFibGVDb29raWVzKXtcbiAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmFnZW50LmF0dGFjaENvb2tpZXMocmVxdWVzdCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcmVxdWVzdC53aXRoQ3JlZGVudGlhbHMoKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIHJlcXVlc3QuZW5kKGZ1bmN0aW9uKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBkYXRhID0gbnVsbDtcbiAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkYXRhID0gX3RoaXMuZGVzZXJpYWxpemUocmVzcG9uc2UsIHJldHVyblR5cGUpO1xuICAgICAgICAgICAgaWYgKF90aGlzLmVuYWJsZUNvb2tpZXMgJiYgdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpe1xuICAgICAgICAgICAgICBfdGhpcy5hZ2VudC5zYXZlQ29va2llcyhyZXNwb25zZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBlcnJvciA9IGVycjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZXF1ZXN0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBQYXJzZXMgYW4gSVNPLTg2MDEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGEgZGF0ZSB2YWx1ZS5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgZGF0ZSB2YWx1ZSBhcyBhIHN0cmluZy5cbiAgICogQHJldHVybnMge0RhdGV9IFRoZSBwYXJzZWQgZGF0ZSBvYmplY3QuXG4gICAqL1xuICBleHBvcnRzLnBhcnNlRGF0ZSA9IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBuZXcgRGF0ZShzdHIucmVwbGFjZSgvVC9pLCAnICcpKTtcbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSB2YWx1ZSB0byB0aGUgc3BlY2lmaWVkIHR5cGUuXG4gICAqIEBwYXJhbSB7KFN0cmluZ3xPYmplY3QpfSBkYXRhIFRoZSBkYXRhIHRvIGNvbnZlcnQsIGFzIGEgc3RyaW5nIG9yIG9iamVjdC5cbiAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5LjxTdHJpbmc+fE9iamVjdC48U3RyaW5nLCBPYmplY3Q+fEZ1bmN0aW9uKX0gdHlwZSBUaGUgdHlwZSB0byByZXR1cm4uIFBhc3MgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlc1xuICAgKiBvciB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIGEgY29tcGxleCB0eXBlLiBQYXNzIGFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIHR5cGUgbmFtZSB0byByZXR1cm4gYW4gYXJyYXkgb2YgdGhhdCB0eXBlLiBUb1xuICAgKiByZXR1cm4gYW4gb2JqZWN0LCBwYXNzIGFuIG9iamVjdCB3aXRoIG9uZSBwcm9wZXJ0eSB3aG9zZSBuYW1lIGlzIHRoZSBrZXkgdHlwZSBhbmQgd2hvc2UgdmFsdWUgaXMgdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWUgdHlwZTpcbiAgICogYWxsIHByb3BlcnRpZXMgb24gPGNvZGU+ZGF0YTxjb2RlPiB3aWxsIGJlIGNvbnZlcnRlZCB0byB0aGlzIHR5cGUuXG4gICAqIEByZXR1cm5zIEFuIGluc3RhbmNlIG9mIHRoZSBzcGVjaWZpZWQgdHlwZSBvciBudWxsIG9yIHVuZGVmaW5lZCBpZiBkYXRhIGlzIG51bGwgb3IgdW5kZWZpbmVkLlxuICAgKi9cbiAgZXhwb3J0cy5jb252ZXJ0VG9UeXBlID0gZnVuY3Rpb24oZGF0YSwgdHlwZSkge1xuICAgIGlmIChkYXRhID09PSBudWxsIHx8IGRhdGEgPT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiBkYXRhXG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ0Jvb2xlYW4nOlxuICAgICAgICByZXR1cm4gQm9vbGVhbihkYXRhKTtcbiAgICAgIGNhc2UgJ0ludGVnZXInOlxuICAgICAgICByZXR1cm4gcGFyc2VJbnQoZGF0YSwgMTApO1xuICAgICAgY2FzZSAnTnVtYmVyJzpcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoZGF0YSk7XG4gICAgICBjYXNlICdTdHJpbmcnOlxuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xuICAgICAgY2FzZSAnRGF0ZSc6XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlRGF0ZShTdHJpbmcoZGF0YSkpO1xuICAgICAgY2FzZSAnQmxvYic6XG4gICAgICBcdHJldHVybiBkYXRhO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKHR5cGUgPT09IE9iamVjdCkge1xuICAgICAgICAgIC8vIGdlbmVyaWMgb2JqZWN0LCByZXR1cm4gZGlyZWN0bHlcbiAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIC8vIGZvciBtb2RlbCB0eXBlIGxpa2U6IFVzZXJcbiAgICAgICAgICByZXR1cm4gdHlwZS5jb25zdHJ1Y3RGcm9tT2JqZWN0KGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkpIHtcbiAgICAgICAgICAvLyBmb3IgYXJyYXkgdHlwZSBsaWtlOiBbJ1N0cmluZyddXG4gICAgICAgICAgdmFyIGl0ZW1UeXBlID0gdHlwZVswXTtcbiAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgcmV0dXJuIGV4cG9ydHMuY29udmVydFRvVHlwZShpdGVtLCBpdGVtVHlwZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgLy8gZm9yIHBsYWluIG9iamVjdCB0eXBlIGxpa2U6IHsnU3RyaW5nJzogJ0ludGVnZXInfVxuICAgICAgICAgIHZhciBrZXlUeXBlLCB2YWx1ZVR5cGU7XG4gICAgICAgICAgZm9yICh2YXIgayBpbiB0eXBlKSB7XG4gICAgICAgICAgICBpZiAodHlwZS5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgICBrZXlUeXBlID0gaztcbiAgICAgICAgICAgICAgdmFsdWVUeXBlID0gdHlwZVtrXTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgICAgICBmb3IgKHZhciBrIGluIGRhdGEpIHtcbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgICAgIHZhciBrZXkgPSBleHBvcnRzLmNvbnZlcnRUb1R5cGUoaywga2V5VHlwZSk7XG4gICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2tdLCB2YWx1ZVR5cGUpO1xuICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGZvciB1bmtub3duIHR5cGUsIHJldHVybiB0aGUgZGF0YSBkaXJlY3RseVxuICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IG1hcCBvciBhcnJheSBtb2RlbCBmcm9tIFJFU1QgZGF0YS5cbiAgICogQHBhcmFtIGRhdGEge09iamVjdHxBcnJheX0gVGhlIFJFU1QgZGF0YS5cbiAgICogQHBhcmFtIG9iaiB7T2JqZWN0fEFycmF5fSBUaGUgdGFyZ2V0IG9iamVjdCBvciBhcnJheS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaiwgaXRlbVR5cGUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGkpKVxuICAgICAgICAgIG9ialtpXSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2ldLCBpdGVtVHlwZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGsgaW4gZGF0YSkge1xuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrKSlcbiAgICAgICAgICBvYmpba10gPSBleHBvcnRzLmNvbnZlcnRUb1R5cGUoZGF0YVtrXSwgaXRlbVR5cGUpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogVGhlIGRlZmF1bHQgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbi5cbiAgICogQHR5cGUge21vZHVsZTpBcGlDbGllbnR9XG4gICAqL1xuICBleHBvcnRzLmluc3RhbmNlID0gbmV3IGV4cG9ydHMoKTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9QYXJhbWV0ZXJMaXN0J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9QYXJhbWV0ZXJMaXN0JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQnVpbGRBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBQYXJhbWV0ZXJMaXN0KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKipcbiAgICogQnVpbGQgc2VydmljZS5cbiAgICogQG1vZHVsZSBhcGkvQnVpbGRBcGlcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgQnVpbGRBcGkuIFxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9CdWlsZEFwaVxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBidWlsZEFOTiBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvQnVpbGRBcGl+YnVpbGRBTk5DYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcGFzc2VzIGFsbCBsZWFybmluZyBhbmQgQU5OIHBhcmFtZXRlcnMgdG8gdGhlIHNlcnZlclxuICAgICAqIEluY2x1ZGVzIGxlYXJuaW5nIHBhcmFtZXRlcnMgYW5kIEFOTiB0b3BvbG9neVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGlucHV0UGFyYW1ldGVycyBvYmplY3Qgd2l0aCBhbGwgdHVuYWJsZSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0J1aWxkQXBpfmJ1aWxkQU5OQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5idWlsZEFOTiA9IGZ1bmN0aW9uKGlucHV0UGFyYW1ldGVycywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IGlucHV0UGFyYW1ldGVycztcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVycycgaXMgc2V0XG4gICAgICBpZiAoaW5wdXRQYXJhbWV0ZXJzID09PSB1bmRlZmluZWQgfHwgaW5wdXRQYXJhbWV0ZXJzID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJzJyB3aGVuIGNhbGxpbmcgYnVpbGRBTk5cIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2J1aWxkL2J1aWxkQU5OJywgJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRBTk5QYXJhbWV0ZXIgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0J1aWxkQXBpfmdldEFOTlBhcmFtZXRlckNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgcGFyYW1ldGVyIHNldCBvZiB0aGUgY3JlYXRlZCBBTk5cbiAgICAgKiByZXR1cm5zIGEgb2JqZWN0IG9mIHR5cGUgUGFyYW1ldGVyTGlzdFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9CdWlsZEFwaX5nZXRBTk5QYXJhbWV0ZXJDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH1cbiAgICAgKi9cbiAgICB0aGlzLmdldEFOTlBhcmFtZXRlciA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBQYXJhbWV0ZXJMaXN0O1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9idWlsZC9nZXRBTk5QYXJhbWV0ZXInLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW5wdXRTaGFwZSBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvQnVpbGRBcGl+Z2V0SW5wdXRTaGFwZUNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge0FycmF5LjwnTnVtYmVyJz59IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHRoZSBpbnB1dCBzaGFwZSBvZiB0aGUgdHJhaW4gZGF0YVxuICAgICAqIHJldHVybnMgdGhlIGlucHV0IHNoYXBlIG9mIHRoZSB0cmFpbiBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgb2YgdGhlIGRhdGFzZXQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+Z2V0SW5wdXRTaGFwZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIEFycmF5LjwnTnVtYmVyJz59XG4gICAgICovXG4gICAgdGhpcy5nZXRJbnB1dFNoYXBlID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFsnTnVtYmVyJ107XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2J1aWxkL2dldElucHV0U2hhcGUnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9JbWFnZURhdGEnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4uL21vZGVsL0ltYWdlRGF0YScpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxvYWRBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2VEYXRhKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIEltYWdlRGF0YSkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIExvYWQgc2VydmljZS5cbiAgICogQG1vZHVsZSBhcGkvTG9hZEFwaVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBMb2FkQXBpLiBcbiAgICogQGFsaWFzIG1vZHVsZTphcGkvTG9hZEFwaVxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRBdmFpbGFibGVEYXRhU2V0cyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRBdmFpbGFibGVEYXRhU2V0c0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge0FycmF5LjwnU3RyaW5nJz59IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBnZXQgYXZhaWxhYmxlIGRhdGEgc2V0c1xuICAgICAqIHJldHVybnMgYSBsaXN0IG9mIGF2YWlsYWJsZSBkYXRhIHNldCBmaWxlc1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEF2YWlsYWJsZURhdGFTZXRzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgQXJyYXkuPCdTdHJpbmcnPn1cbiAgICAgKi9cbiAgICB0aGlzLmdldEF2YWlsYWJsZURhdGFTZXRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFsnU3RyaW5nJ107XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvZ2V0QXZhaWxhYmxlRGF0YVNldHMnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW1hZ2VCYXRjaCBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJhdGNoQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2YgaW5wdXQvb3V0cHV0IGltYWdlc1xuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmJhdGNoU2l6ZSBkZWZpbmVzIHRoZSBudW1iZXIgb2YgcmV0dXJuIGltYWdlcyAoZGVmYXVsdCB0byAxMDApXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuc29ydEJ5IGRlZmluZXMgdGhlIHNvcnRpbmcgb2YgdGhlIGlucHV0IGltYWdlc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VCYXRjaENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRJbWFnZUJhdGNoID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdiYXRjaF9zaXplJzogb3B0c1snYmF0Y2hTaXplJ10sXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcbiAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRJbWFnZUJhdGNoJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEltYWdlQnlJZCBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJ5SWRDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIHNpbmdsZSBpbnB1dC9vdXRwdXQgaW1hZ2VcbiAgICAgKiBpbWFnZXMgYXJlIGVuY29kZWQgYXMgcG5nIGJ5dGUgc3RyaW5nc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBkZWZpbmVzIHRoZSBpZCBvZiB0aGUgaW1hZ2VzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQnlJZENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRJbWFnZUJ5SWQgPSBmdW5jdGlvbihpZCwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyBpcyBzZXRcbiAgICAgIGlmIChpZCA9PT0gdW5kZWZpbmVkIHx8IGlkID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaWQnIHdoZW4gY2FsbGluZyBnZXRJbWFnZUJ5SWRcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnaWQnOiBpZCxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldEltYWdlQnlJZCcsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZXMgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0SW1hZ2VzQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgaW5wdXQvb3V0cHV0IGltYWdlc1xuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHN0YXJ0SWR4IG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBlbmRJZHggbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdHMub3V0cHV0IGlmIHRydWUgcmV0dXJucyBBRSBvdXRwdXQgSW1hZ2VzIGluc3RlYWQgb2YgaW5wdXQgSW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlc0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRJbWFnZXMgPSBmdW5jdGlvbihzdGFydElkeCwgZW5kSWR4LCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc3RhcnRJZHgnIGlzIHNldFxuICAgICAgaWYgKHN0YXJ0SWR4ID09PSB1bmRlZmluZWQgfHwgc3RhcnRJZHggPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzdGFydElkeCcgd2hlbiBjYWxsaW5nIGdldEltYWdlc1wiKTtcbiAgICAgIH1cblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2VuZElkeCcgaXMgc2V0XG4gICAgICBpZiAoZW5kSWR4ID09PSB1bmRlZmluZWQgfHwgZW5kSWR4ID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZW5kSWR4JyB3aGVuIGNhbGxpbmcgZ2V0SW1hZ2VzXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ3N0YXJ0X2lkeCc6IHN0YXJ0SWR4LFxuICAgICAgICAnZW5kX2lkeCc6IGVuZElkeCxcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy9sb2FkL2dldEltYWdlcycsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWQgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0TGF0ZW50UmVwcmVzZW50YXRpb25CeUlkQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSBzaW5nbGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIGFzICgpbGlzdCBvZikgcG5nIGltYWdlc1xuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IGlkIGRlZmluZXMgdGhlIGlkIG9mIHRoZSBpbWFnZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0TGF0ZW50UmVwcmVzZW50YXRpb25CeUlkQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldExhdGVudFJlcHJlc2VudGF0aW9uQnlJZCA9IGZ1bmN0aW9uKGlkLCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaWQnIGlzIHNldFxuICAgICAgaWYgKGlkID09PSB1bmRlZmluZWQgfHwgaWQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpZCcgd2hlbiBjYWxsaW5nIGdldExhdGVudFJlcHJlc2VudGF0aW9uQnlJZFwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdpZCc6IGlkLFxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWQnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0TG9hZGVkRGF0YVNldHMgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0TG9hZGVkRGF0YVNldHNDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHtBcnJheS48J1N0cmluZyc+fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogZ2V0IGxvYWRlZCBkYXRhIHNldHNcbiAgICAgKiByZXR1cm5zIGEgbGlzdCBvZiBsb2FkZWQgZGF0YSBzZXRzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0TG9hZGVkRGF0YVNldHNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBBcnJheS48J1N0cmluZyc+fVxuICAgICAqL1xuICAgIHRoaXMuZ2V0TG9hZGVkRGF0YVNldHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gWydTdHJpbmcnXTtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9nZXRMb2FkZWREYXRhU2V0cycsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRSYW5kb21JbWFnZXMgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0UmFuZG9tSW1hZ2VzQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2YgaW5wdXQvb3V0cHV0IGltYWdlc1xuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmJhdGNoU2l6ZSBkZWZpbmVzIHRoZSBudW1iZXIgb2YgcmV0dXJuIGltYWdlcyAoZGVmYXVsdCB0byAxMDApXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuc29ydEJ5IGRlZmluZXMgdGhlIHNvcnRpbmcgb2YgdGhlIGlucHV0IGltYWdlc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+Z2V0UmFuZG9tSW1hZ2VzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFJhbmRvbUltYWdlcyA9IGZ1bmN0aW9uKG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnYmF0Y2hfc2l6ZSc6IG9wdHNbJ2JhdGNoU2l6ZSddLFxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxuICAgICAgICAnc29ydF9ieSc6IG9wdHNbJ3NvcnRCeSddLFxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXG4gICAgICAgICdvdXRwdXQnOiBvcHRzWydvdXRwdXQnXSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvZ2V0UmFuZG9tSW1hZ2VzJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGxvYWRGaWxlIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIExvYWQgYSB0cmFpbi90ZXN0IGRhdGEgZmlsZVxuICAgICAqIExvYWQgYSBkYXRhIGZpbGUgaW4gZGlmZmVyZW50IGRhdGEgZm9ybWF0c1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlbmFtZSBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLnJlYWRMYWJlbHMgdHJ1ZSB0byByZWFkIGxhYmVscyAoZGVmYXVsdCB0byBmYWxzZSlcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhVHlwZSBkZXRlcm1pbmVzIHRoZSBkYXRhIGZvcm1hdCBvZiB0aGUgaW5wdXQgZmlsZSAoZGVmYXVsdCB0byBhdXRvKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5sb2FkRmlsZSA9IGZ1bmN0aW9uKGZpbGVuYW1lLCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZmlsZW5hbWUnIGlzIHNldFxuICAgICAgaWYgKGZpbGVuYW1lID09PSB1bmRlZmluZWQgfHwgZmlsZW5hbWUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdmaWxlbmFtZScgd2hlbiBjYWxsaW5nIGxvYWRGaWxlXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2ZpbGVuYW1lJzogZmlsZW5hbWUsXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXG4gICAgICAgICdyZWFkX2xhYmVscyc6IG9wdHNbJ3JlYWRMYWJlbHMnXSxcbiAgICAgICAgJ2RhdGFfdHlwZSc6IG9wdHNbJ2RhdGFUeXBlJ10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9sb2FkRmlsZScsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgcmVzZXRBbGxCYXRjaEluZGljZXMgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+cmVzZXRBbGxCYXRjaEluZGljZXNDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmVzZXRzIGFsbCBiYXRjaCBpbmRpY2VzIG9mIGFsbCBpbWFnZSBzZXRzXG4gICAgICogcmVzZXRzIGFsbCBiYXRjaCBpbmRpY2VzIG9mIGFsbCBpbWFnZSBzZXRzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0xvYWRBcGl+cmVzZXRBbGxCYXRjaEluZGljZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLnJlc2V0QWxsQmF0Y2hJbmRpY2VzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvcmVzZXRBbGxCYXRjaEluZGljZXMnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIHJlc2V0QmF0Y2hJbmRleCBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5yZXNldEJhdGNoSW5kZXhDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmVzZXRzIHRoZSBiYXRjaCBpbmRleCBvZiB0aGUgaW1hZ2Ugc2V0XG4gICAgICogcmVzZXRzIHRoZSBiYXRjaCBpbmRleCBvZiB0aGUgaW1hZ2Ugc2V0XG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgcmVzZXQgb3V0cHV0IGltYWdlIGJhdGNoIGluZGV4IGluc3RlYWQgb2YgaW5wdXQgaW1hZ2VzIChkZWZhdWx0IHRvIGZhbHNlKVxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfnJlc2V0QmF0Y2hJbmRleENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMucmVzZXRCYXRjaEluZGV4ID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxuICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvbG9hZC9yZXNldEJhdGNoSW5kZXgnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIHVwbG9hZEZpbGUgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+dXBsb2FkRmlsZUNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiB1cGxvYWRzIGEgZGF0YSBmaWxlXG4gICAgICogTG9hZCBhIGRhdGEgZmlsZSBpbiBkaWZmZXJlbnQgZGF0YSBmb3JtYXRzXG4gICAgICogQHBhcmFtIHtGaWxlfSB1cGZpbGUgVGhlIGZpbGUgdG8gdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfnVwbG9hZEZpbGVDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLnVwbG9hZEZpbGUgPSBmdW5jdGlvbih1cGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndXBmaWxlJyBpcyBzZXRcbiAgICAgIGlmICh1cGZpbGUgPT09IHVuZGVmaW5lZCB8fCB1cGZpbGUgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd1cGZpbGUnIHdoZW4gY2FsbGluZyB1cGxvYWRGaWxlXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICAgICd1cGZpbGUnOiB1cGZpbGVcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ211bHRpcGFydC9mb3JtLWRhdGEnXTtcbiAgICAgIHZhciBhY2NlcHRzID0gW107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL2xvYWQvdXBsb2FkRmlsZScsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblN0YXR1cyddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJyksIHJlcXVpcmUoJy4uL21vZGVsL1RyYWluUGVyZm9ybWFuY2UnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5TdGF0dXMnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpbkFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qcm9jZXNzZWRJbWFnZURhdGEsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluUGVyZm9ybWFuY2UsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluU3RhdHVzKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFByb2Nlc3NlZEltYWdlRGF0YSwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBUcmFpbiBzZXJ2aWNlLlxuICAgKiBAbW9kdWxlIGFwaS9UcmFpbkFwaVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyBUcmFpbkFwaS4gXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL1RyYWluQXBpXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUcmFpbmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHJhaW5BcGl+Y29udHJvbFRyYWluaW5nQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHN0YXJ0cywgcGF1c2VzIGFuZCBzdG9wcyB0aGUgdHJhaW5pbmdcbiAgICAgKiB1c2VzIGEgc3RyaW5nIGVudW1cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gdHJhaW5TdGF0dXMgbmV3IHN0YXR1cyBmb3IgdHJhaW5pbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldE5hbWUgZGV0ZXJtaW5lcyBkYXRhIHNldCBmb3IgdHJhaW5pbmdcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Y29udHJvbFRyYWluaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5jb250cm9sVHJhaW5pbmcgPSBmdW5jdGlvbih0cmFpblN0YXR1cywgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gdHJhaW5TdGF0dXM7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgaXMgc2V0XG4gICAgICBpZiAodHJhaW5TdGF0dXMgPT09IHVuZGVmaW5lZCB8fCB0cmFpblN0YXR1cyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyB3aGVuIGNhbGxpbmcgY29udHJvbFRyYWluaW5nXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2RhdGFzZXROYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90cmFpbi9jb250cm9sVHJhaW5pbmcnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByb2Nlc3NlZEltYWdlRGF0YSBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHJhaW5BcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgdGhlIGN1cnJlbnQgdHJhaW4gaW1hZ2VzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBsYXRlbnQgcmVwcmVzZW50YXRpb24gYW5kIG91dHB1dFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhID0gZnVuY3Rpb24oc2V0U2l6ZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdzZXRTaXplJyBpcyBzZXRcbiAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemUsXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gUHJvY2Vzc2VkSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90cmFpbi9nZXRQcm9jZXNzZWRJbWFnZURhdGEnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHJhaW5QZXJmb3JtYW5jZSBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHJhaW5BcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZUNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgbmV4dCBiYXRjaCBvZiBzY2FsYXIgdHJhaW4gdmFyaWFibGVzXG4gICAgICogYXMgbGlzdCBvZiBkaWN0c1xuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRUcmFpblBlcmZvcm1hbmNlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9XG4gICAgICovXG4gICAgdGhpcy5nZXRUcmFpblBlcmZvcm1hbmNlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFRyYWluUGVyZm9ybWFuY2U7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3RyYWluL2dldFRyYWluUGVyZm9ybWFuY2UnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9QYXJhbWV0ZXJMaXN0JywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluU3RhdHVzJ10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9QYXJhbWV0ZXJMaXN0JyksIHJlcXVpcmUoJy4uL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblBlcmZvcm1hbmNlJyksIHJlcXVpcmUoJy4uL21vZGVsL1RyYWluU3RhdHVzJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHVuZUFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5QYXJhbWV0ZXJMaXN0LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qcm9jZXNzZWRJbWFnZURhdGEsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluUGVyZm9ybWFuY2UsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluU3RhdHVzKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBhcmFtZXRlckxpc3QsIFByb2Nlc3NlZEltYWdlRGF0YSwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBUdW5lIHNlcnZpY2UuXG4gICAqIEBtb2R1bGUgYXBpL1R1bmVBcGlcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgVHVuZUFwaS4gXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL1R1bmVBcGlcbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XG5cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgYXBwbHlTcGVjaWZpY1R1bmluZ0FzRGVmYXVsdE1vZGVsIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmFwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbENhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBzZXRzIGEgZ2l2ZW4gdHVuZWQgbW9kZWwgYXMgZGVmYXVsdCBtb2RlbFxuICAgICAqIHNldHMgYSBnaXZlbiB0dW5lZCBtb2RlbCBhcyBkZWZhdWx0IG1vZGVsXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIHR1bmVkIG1vZGVsXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+YXBwbHlTcGVjaWZpY1R1bmluZ0FzRGVmYXVsdE1vZGVsQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5hcHBseVNwZWNpZmljVHVuaW5nQXNEZWZhdWx0TW9kZWwgPSBmdW5jdGlvbihtb2RlbElkLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIGlzIHNldFxuICAgICAgaWYgKG1vZGVsSWQgPT09IHVuZGVmaW5lZCB8fCBtb2RlbElkID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgd2hlbiBjYWxsaW5nIGFwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbFwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2FwcGx5U3BlY2lmaWNUdW5pbmdBc0RlZmF1bHRNb2RlbCcsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgYnVpbGRHcmlkU2VhcmNoQU5OIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmJ1aWxkR3JpZFNlYXJjaEFOTkNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBwYXNzZXMgYWxsIGxlYXJuaW5nIGFuZCBBTk4gcGFyYW1ldGVycyB0byB0aGUgc2VydmVyXG4gICAgICogSW5jbHVkZXMgbGVhcm5pbmcgcGFyYW1ldGVycyBhbmQgQU5OIHRvcG9sb2d5IGFzIGxpc3RzXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gaW5wdXRQYXJhbWV0ZXJMaXN0cyBvYmplY3Qgd2l0aCBhbGwgdHVuYWJsZSBwYXJhbWV0ZXIgbGlzdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLmRlbGV0ZVByZXZpb3VzTW9kZWxzIGlmIHRydWUgZGVsZXRlIGFsbCBwcmV2aW91cyB0dW5lZCBtb2RlbHMgKGRlZmF1bHQgdG8gZmFsc2UpXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+YnVpbGRHcmlkU2VhcmNoQU5OQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICovXG4gICAgdGhpcy5idWlsZEdyaWRTZWFyY2hBTk4gPSBmdW5jdGlvbihpbnB1dFBhcmFtZXRlckxpc3RzLCBvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBpbnB1dFBhcmFtZXRlckxpc3RzO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJMaXN0cycgaXMgc2V0XG4gICAgICBpZiAoaW5wdXRQYXJhbWV0ZXJMaXN0cyA9PT0gdW5kZWZpbmVkIHx8IGlucHV0UGFyYW1ldGVyTGlzdHMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlckxpc3RzJyB3aGVuIGNhbGxpbmcgYnVpbGRHcmlkU2VhcmNoQU5OXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2RlbGV0ZVByZXZpb3VzTW9kZWxzJzogb3B0c1snZGVsZXRlUHJldmlvdXNNb2RlbHMnXSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2J1aWxkR3JpZFNlYXJjaEFOTicsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgY29udHJvbFR1bmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5jb250cm9sVHVuaW5nQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHN0YXJ0cywgcGF1c2VzIGFuZCBzdG9wcyB0aGUgdHVuaW5nXG4gICAgICogdXNlcyBhIHN0cmluZyBlbnVtXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9IHRyYWluU3RhdHVzIG5ldyBzdGF0dXMgZm9yIHRyYWluaW5nXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Y29udHJvbFR1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqL1xuICAgIHRoaXMuY29udHJvbFR1bmluZyA9IGZ1bmN0aW9uKHRyYWluU3RhdHVzLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gdHJhaW5TdGF0dXM7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgaXMgc2V0XG4gICAgICBpZiAodHJhaW5TdGF0dXMgPT09IHVuZGVmaW5lZCB8fCB0cmFpblN0YXR1cyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyB3aGVuIGNhbGxpbmcgY29udHJvbFR1bmluZ1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdHVuZS9jb250cm9sVHVuaW5nJywgJ1BPU1QnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgdGhlIGN1cnJlbnQgdHJhaW4gaW1hZ2VzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBsYXRlbnQgcmVwcmVzZW50YXRpb24gYW5kIG91dHB1dFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9XG4gICAgICovXG4gICAgdGhpcy5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZkN1cnJlbnRUdW5pbmcgPSBmdW5jdGlvbihzZXRTaXplLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIGlzIHNldFxuICAgICAgaWYgKHNldFNpemUgPT09IHVuZGVmaW5lZCB8fCBzZXRTaXplID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZ1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdzZXRTaXplJzogc2V0U2l6ZSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBQcm9jZXNzZWRJbWFnZURhdGE7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3R1bmUvZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgc3Vic2V0IG9mIHRoZSBjdXJyZW50IHRyYWluIGltYWdlcyBhbmQgdGhlIGNvcnJlc3BvbmRpbmcgbGF0ZW50IHJlcHJlc2VudGF0aW9uIGFuZCBvdXRwdXRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gc2V0U2l6ZSBzaXplIG9mIHRoZSBpbWFnZSBzdWJzZXRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbW9kZWxJZCBtb2RlbCBpZCBvZiB0aGUgZXhzcGVjdGVkIHBhcmFtZXRlciBzZXRcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmcgPSBmdW5jdGlvbihzZXRTaXplLCBtb2RlbElkLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIGlzIHNldFxuICAgICAgaWYgKHNldFNpemUgPT09IHVuZGVmaW5lZCB8fCBzZXRTaXplID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmdcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcbiAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ3NldFNpemUnOiBzZXRTaXplLFxuICAgICAgICAnbW9kZWxJZCc6IG1vZGVsSWQsXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gUHJvY2Vzc2VkSW1hZ2VEYXRhO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2dldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmcnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIHNjYWxhciB0cmFpbiB2YXJpYWJsZXNcbiAgICAgKiBhcyBsaXN0IG9mIGRpY3RzXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBUcmFpblBlcmZvcm1hbmNlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2dldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmcnLCAnR0VUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmcgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgdGhlIGNvbXBsZXRlIHNldCBvZiBzY2FsYXIgdHJhaW4gdmFyaWFibGVzIHRvIGEgZ2l2ZW4gbW9kZWxcbiAgICAgKiBhcyBsaXN0IG9mIGRpY3RzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cbiAgICAgKi9cbiAgICB0aGlzLmdldFRyYWluUGVyZm9ybWFuY2VPZlNwZWNpZmljVHVuaW5nID0gZnVuY3Rpb24obW9kZWxJZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcbiAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIHdoZW4gY2FsbGluZyBnZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZ1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBUcmFpblBlcmZvcm1hbmNlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2dldFRyYWluUGVyZm9ybWFuY2VPZlNwZWNpZmljVHVuaW5nJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFR1bmVNb2RlbElkcyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRUdW5lTW9kZWxJZHNDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHtBcnJheS48J1N0cmluZyc+fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyBhIGxpc3Qgb2YgYWxsIHR1bmVkIG1vZGVsIGlkc1xuICAgICAqIHJldHVybnMgYSBsaXN0IG9mIGFsbCB0dW5lZCBtb2RlbCBpZHNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRUdW5lTW9kZWxJZHNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBBcnJheS48J1N0cmluZyc+fVxuICAgICAqL1xuICAgIHRoaXMuZ2V0VHVuZU1vZGVsSWRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFsnU3RyaW5nJ107XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3R1bmUvZ2V0VHVuZU1vZGVsSWRzJywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFR1bmVQYXJhbWV0ZXIgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZVBhcmFtZXRlckNhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgcGFyYW1ldGVyIHNldCBvZiB0aGUgQU5OIHdpdGggdGhlIGdpdmVuIG1vZGVsIGlkXG4gICAgICogcmV0dXJucyBhIG9iamVjdCBvZiB0eXBlIFBhcmFtZXRlckxpc3RcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbW9kZWxJZCBtb2RlbCBpZCBvZiB0aGUgZXhzcGVjdGVkIHBhcmFtZXRlciBzZXRcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRUdW5lUGFyYW1ldGVyQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9XG4gICAgICovXG4gICAgdGhpcy5nZXRUdW5lUGFyYW1ldGVyID0gZnVuY3Rpb24obW9kZWxJZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcbiAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIHdoZW4gY2FsbGluZyBnZXRUdW5lUGFyYW1ldGVyXCIpO1xuICAgICAgfVxuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ21vZGVsSWQnOiBtb2RlbElkLFxuICAgICAgfTtcbiAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcbiAgICAgIH07XG5cbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFBhcmFtZXRlckxpc3Q7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3R1bmUvZ2V0VHVuZVBhcmFtZXRlcicsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUdW5lZE1vZGVsQXNaaXAgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZWRNb2RlbEFzWmlwQ2FsbGJhY2tcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxuICAgICAqIEBwYXJhbSB7RmlsZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIHJldHVybnMgYSB6aXAgZmlsZSB3aXRoIHRoZSBwcmUgdHJhaW5lZCBtb2RlbCBhcyBydW5hYmxlIHB5dGhvbiBzY3JpcHRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbW9kZWxJZCBtb2RlbCBpZCBvZiB0aGUgdHVuZWQgbW9kZWxcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRUdW5lZE1vZGVsQXNaaXBDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBGaWxlfVxuICAgICAqL1xuICAgIHRoaXMuZ2V0VHVuZWRNb2RlbEFzWmlwID0gZnVuY3Rpb24obW9kZWxJZCwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XG5cbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcbiAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIHdoZW4gY2FsbGluZyBnZXRUdW5lZE1vZGVsQXNaaXBcIik7XG4gICAgICB9XG5cblxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICAnbW9kZWxJZCc6IG1vZGVsSWQsXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBGaWxlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy90dW5lL2dldFR1bmVkTW9kZWxBc1ppcCcsICdHRVQnLFxuICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJywgJ21vZGVsL0NsdXN0ZXJpbmcnLCAnbW9kZWwvSW1hZ2UnLCAnbW9kZWwvUG9pbnQyRCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnKSwgcmVxdWlyZSgnLi4vbW9kZWwvQ2x1c3RlcmluZycpLCByZXF1aXJlKCcuLi9tb2RlbC9JbWFnZScpLCByZXF1aXJlKCcuLi9tb2RlbC9Qb2ludDJEJykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVmlzdWFsaXplQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNsdXN0ZXJQYXJhbWV0ZXJzLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyaW5nLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBDbHVzdGVyUGFyYW1ldGVycywgQ2x1c3RlcmluZywgSW1hZ2UsIFBvaW50MkQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKlxuICAgKiBWaXN1YWxpemUgc2VydmljZS5cbiAgICogQG1vZHVsZSBhcGkvVmlzdWFsaXplQXBpXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFZpc3VhbGl6ZUFwaS4gXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaVxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBjb21wdXRlSGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nIG9wZXJhdGlvbi5cbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Y29tcHV0ZUhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBzdGFydHMgdGhlIGNsdXN0ZXJpbmcgb2YgdGhlIGxhdGVudCByZXByZXNlbnRhdGlvbiBvZiBhIGhpZGRlbiBsYXllclxuICAgICAqIHN0YXJ0cyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGFsZ29yaXRobSBkZXRlcm1pbmVzIHRoZSBjbHV0ZXJpbmcgYWxnb3JpdGhtXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGRpbWVuc2lvblJlZHVjdGlvbiBkZXRlcm1pbmVzIHRoZSBhbGdvcml0aG0gZm9yIGRpbSByZWR1Y3Rpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldE5hbWUgZGV0ZXJtaW5lcyB0aGUgZGF0YXNldCB3aGljaCBzaG91bGQgYmUgY2x1c3RlcmVkIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdHMubGF5ZXIgZGV0ZXJtaW5lcyB0aGUgaGlkZGVuIGxheWVyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9IG9wdHMuY2x1c3RlclBhcmFtZXRlcnMgZGV0ZXJtaW5lcyB0aGUgY2x1dGVyaW5nIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVmlzdWFsaXplQXBpfmNvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcbiAgICAgKi9cbiAgICB0aGlzLmNvbXB1dGVIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcgPSBmdW5jdGlvbihhbGdvcml0aG0sIGRpbWVuc2lvblJlZHVjdGlvbiwgb3B0cywgY2FsbGJhY2spIHtcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgdmFyIHBvc3RCb2R5ID0gb3B0c1snY2x1c3RlclBhcmFtZXRlcnMnXTtcblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2FsZ29yaXRobScgaXMgc2V0XG4gICAgICBpZiAoYWxnb3JpdGhtID09PSB1bmRlZmluZWQgfHwgYWxnb3JpdGhtID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnYWxnb3JpdGhtJyB3aGVuIGNhbGxpbmcgY29tcHV0ZUhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ1wiKTtcbiAgICAgIH1cblxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2RpbWVuc2lvblJlZHVjdGlvbicgaXMgc2V0XG4gICAgICBpZiAoZGltZW5zaW9uUmVkdWN0aW9uID09PSB1bmRlZmluZWQgfHwgZGltZW5zaW9uUmVkdWN0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZGltZW5zaW9uUmVkdWN0aW9uJyB3aGVuIGNhbGxpbmcgY29tcHV0ZUhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ1wiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgICdhbGdvcml0aG0nOiBhbGdvcml0aG0sXG4gICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxuICAgICAgICAnZGltZW5zaW9uX3JlZHVjdGlvbic6IGRpbWVuc2lvblJlZHVjdGlvbixcbiAgICAgICAgJ2xheWVyJzogb3B0c1snbGF5ZXInXSxcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy92aXN1YWxpemUvY29tcHV0ZUhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZycsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludCBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRDYWxsYmFja1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2V9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiBnZW5lcmF0ZXMgdGhlIEFFIG91dHB1dCBmcm9tIGEgZ2l2ZW4gcG9pbnQgb2YgdGhlIHNhbXBsZSBkaXN0cmlidXRpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBwb2ludDJEIDJEIFBvaW50IG9mIHRoZSBzYW1wbGUgZGlzdHJpYnV0aW9uXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50Q2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlfVxuICAgICAqL1xuICAgIHRoaXMuZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludCA9IGZ1bmN0aW9uKHBvaW50MkQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBwb2ludDJEO1xuXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAncG9pbnQyRCcgaXMgc2V0XG4gICAgICBpZiAocG9pbnQyRCA9PT0gdW5kZWZpbmVkIHx8IHBvaW50MkQgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdwb2ludDJEJyB3aGVuIGNhbGxpbmcgZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludFwiKTtcbiAgICAgIH1cblxuXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2U7XG5cbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxuICAgICAgICAnL3Zpc3VhbGl6ZS9nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50JywgJ0dFVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZyBvcGVyYXRpb24uXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVmlzdWFsaXplQXBpfmdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZ0NhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIGRldGVybWluZXMgdGhlIGRhdGFzZXQgd2hpY2ggc2hvdWxkIGJlIGNsdXN0ZXJlZCAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmxheWVyIGRldGVybWluZXMgdGhlIGhpZGRlbiBsYXllclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0NsdXN0ZXJpbmd9XG4gICAgICovXG4gICAgdGhpcy5nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcgPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgJ2RhdGFzZXRfbmFtZSc6IG9wdHNbJ2RhdGFzZXROYW1lJ10sXG4gICAgICAgICdsYXllcic6IG9wdHNbJ2xheWVyJ10sXG4gICAgICB9O1xuICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xuICAgICAgfTtcblxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgICAgIHZhciByZXR1cm5UeXBlID0gQ2x1c3RlcmluZztcblxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXG4gICAgICAgICcvdmlzdWFsaXplL2dldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZycsICdQT1NUJyxcbiAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXG4gICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJldHJhaW5lZE1vZGVsQXNaaXAgb3BlcmF0aW9uLlxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZXRQcmV0cmFpbmVkTW9kZWxBc1ppcENhbGxiYWNrXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cbiAgICAgKiBAcGFyYW0ge0ZpbGV9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXG4gICAgICovXG5cbiAgICAvKipcbiAgICAgKiByZXR1cm5zIGEgemlwIGZpbGUgd2l0aCB0aGUgcHJlIHRyYWluZWQgbW9kZWwgYXMgcnVuYWJsZSBweXRob24gc2NyaXB0XG4gICAgICogXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZXRQcmV0cmFpbmVkTW9kZWxBc1ppcENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIEZpbGV9XG4gICAgICovXG4gICAgdGhpcy5nZXRQcmV0cmFpbmVkTW9kZWxBc1ppcCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xuXG5cbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgIH07XG4gICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xuICAgICAgfTtcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XG4gICAgICB9O1xuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XG4gICAgICB9O1xuXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XG4gICAgICB2YXIgY29udGVudFR5cGVzID0gW107XG4gICAgICB2YXIgYWNjZXB0cyA9IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddO1xuICAgICAgdmFyIHJldHVyblR5cGUgPSBGaWxlO1xuXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcbiAgICAgICAgJy92aXN1YWxpemUvZ2V0UHJldHJhaW5lZE1vZGVsQXNaaXAnLCAnUE9TVCcsXG4gICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xuICAgICAgKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnLCAnbW9kZWwvQ2x1c3RlcmluZycsICdtb2RlbC9Db3N0RnVuY3Rpb24nLCAnbW9kZWwvSW1hZ2UnLCAnbW9kZWwvSW1hZ2VEYXRhJywgJ21vZGVsL0xlYXJuaW5nUmF0ZScsICdtb2RlbC9QYXJhbWV0ZXJMaXN0JywgJ21vZGVsL1BvaW50MkQnLCAnbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJywgJ21vZGVsL1JhbmRvbUZ1bmN0aW9uJywgJ21vZGVsL1RyYWluUGVyZm9ybWFuY2UnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCcsICdtb2RlbC9UcmFpblN0YXR1cycsICdhcGkvQnVpbGRBcGknLCAnYXBpL0xvYWRBcGknLCAnYXBpL1RyYWluQXBpJywgJ2FwaS9UdW5lQXBpJywgJ2FwaS9WaXN1YWxpemVBcGknXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9tb2RlbC9DbHVzdGVyUGFyYW1ldGVycycpLCByZXF1aXJlKCcuL21vZGVsL0NsdXN0ZXJpbmcnKSwgcmVxdWlyZSgnLi9tb2RlbC9Db3N0RnVuY3Rpb24nKSwgcmVxdWlyZSgnLi9tb2RlbC9JbWFnZScpLCByZXF1aXJlKCcuL21vZGVsL0ltYWdlRGF0YScpLCByZXF1aXJlKCcuL21vZGVsL0xlYXJuaW5nUmF0ZScpLCByZXF1aXJlKCcuL21vZGVsL1BhcmFtZXRlckxpc3QnKSwgcmVxdWlyZSgnLi9tb2RlbC9Qb2ludDJEJyksIHJlcXVpcmUoJy4vbW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhJyksIHJlcXVpcmUoJy4vbW9kZWwvUmFuZG9tRnVuY3Rpb24nKSwgcmVxdWlyZSgnLi9tb2RlbC9UcmFpblBlcmZvcm1hbmNlJyksIHJlcXVpcmUoJy4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCcpLCByZXF1aXJlKCcuL21vZGVsL1RyYWluU3RhdHVzJyksIHJlcXVpcmUoJy4vYXBpL0J1aWxkQXBpJyksIHJlcXVpcmUoJy4vYXBpL0xvYWRBcGknKSwgcmVxdWlyZSgnLi9hcGkvVHJhaW5BcGknKSwgcmVxdWlyZSgnLi9hcGkvVHVuZUFwaScpLCByZXF1aXJlKCcuL2FwaS9WaXN1YWxpemVBcGknKSk7XG4gIH1cbn0oZnVuY3Rpb24oQXBpQ2xpZW50LCBDbHVzdGVyUGFyYW1ldGVycywgQ2x1c3RlcmluZywgQ29zdEZ1bmN0aW9uLCBJbWFnZSwgSW1hZ2VEYXRhLCBMZWFybmluZ1JhdGUsIFBhcmFtZXRlckxpc3QsIFBvaW50MkQsIFByb2Nlc3NlZEltYWdlRGF0YSwgUmFuZG9tRnVuY3Rpb24sIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQsIFRyYWluU3RhdHVzLCBCdWlsZEFwaSwgTG9hZEFwaSwgVHJhaW5BcGksIFR1bmVBcGksIFZpc3VhbGl6ZUFwaSkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyoqXG4gICAqIFdlYlVJX3RvX2J1aWxkX3RyYWluX2FuZF90dW5lX2FfQ29udm9sdXRpb25hbF9BdXRvZW5jb2Rlci48YnI+XG4gICAqIFRoZSA8Y29kZT5pbmRleDwvY29kZT4gbW9kdWxlIHByb3ZpZGVzIGFjY2VzcyB0byBjb25zdHJ1Y3RvcnMgZm9yIGFsbCB0aGUgY2xhc3NlcyB3aGljaCBjb21wcmlzZSB0aGUgcHVibGljIEFQSS5cbiAgICogPHA+XG4gICAqIEFuIEFNRCAocmVjb21tZW5kZWQhKSBvciBDb21tb25KUyBhcHBsaWNhdGlvbiB3aWxsIGdlbmVyYWxseSBkbyBzb21ldGhpbmcgZXF1aXZhbGVudCB0byB0aGUgZm9sbG93aW5nOlxuICAgKiA8cHJlPlxuICAgKiB2YXIgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0gcmVxdWlyZSgnaW5kZXgnKTsgLy8gU2VlIG5vdGUgYmVsb3cqLlxuICAgKiB2YXIgeHh4U3ZjID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5YeHhBcGkoKTsgLy8gQWxsb2NhdGUgdGhlIEFQSSBjbGFzcyB3ZSdyZSBnb2luZyB0byB1c2UuXG4gICAqIHZhciB5eXlNb2RlbCA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWXl5KCk7IC8vIENvbnN0cnVjdCBhIG1vZGVsIGluc3RhbmNlLlxuICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcbiAgICogLi4uXG4gICAqIHZhciB6enogPSB4eHhTdmMuZG9Tb21ldGhpbmcoeXl5TW9kZWwpOyAvLyBJbnZva2UgdGhlIHNlcnZpY2UuXG4gICAqIC4uLlxuICAgKiA8L3ByZT5cbiAgICogPGVtPipOT1RFOiBGb3IgYSB0b3AtbGV2ZWwgQU1EIHNjcmlwdCwgdXNlIHJlcXVpcmUoWydpbmRleCddLCBmdW5jdGlvbigpey4uLn0pXG4gICAqIGFuZCBwdXQgdGhlIGFwcGxpY2F0aW9uIGxvZ2ljIHdpdGhpbiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uPC9lbT5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogQSBub24tQU1EIGJyb3dzZXIgYXBwbGljYXRpb24gKGRpc2NvdXJhZ2VkKSBtaWdodCBkbyBzb21ldGhpbmcgbGlrZSB0aGlzOlxuICAgKiA8cHJlPlxuICAgKiB2YXIgeHh4U3ZjID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5YeHhBcGkoKTsgLy8gQWxsb2NhdGUgdGhlIEFQSSBjbGFzcyB3ZSdyZSBnb2luZyB0byB1c2UuXG4gICAqIHZhciB5eXkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLll5eSgpOyAvLyBDb25zdHJ1Y3QgYSBtb2RlbCBpbnN0YW5jZS5cbiAgICogeXl5TW9kZWwuc29tZVByb3BlcnR5ID0gJ3NvbWVWYWx1ZSc7XG4gICAqIC4uLlxuICAgKiB2YXIgenp6ID0geHh4U3ZjLmRvU29tZXRoaW5nKHl5eU1vZGVsKTsgLy8gSW52b2tlIHRoZSBzZXJ2aWNlLlxuICAgKiAuLi5cbiAgICogPC9wcmU+XG4gICAqIDwvcD5cbiAgICogQG1vZHVsZSBpbmRleFxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIEFwaUNsaWVudCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTpBcGlDbGllbnR9XG4gICAgICovXG4gICAgQXBpQ2xpZW50OiBBcGlDbGllbnQsXG4gICAgLyoqXG4gICAgICogVGhlIENsdXN0ZXJQYXJhbWV0ZXJzIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfVxuICAgICAqL1xuICAgIENsdXN0ZXJQYXJhbWV0ZXJzOiBDbHVzdGVyUGFyYW1ldGVycyxcbiAgICAvKipcbiAgICAgKiBUaGUgQ2x1c3RlcmluZyBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfVxuICAgICAqL1xuICAgIENsdXN0ZXJpbmc6IENsdXN0ZXJpbmcsXG4gICAgLyoqXG4gICAgICogVGhlIENvc3RGdW5jdGlvbiBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb259XG4gICAgICovXG4gICAgQ29zdEZ1bmN0aW9uOiBDb3N0RnVuY3Rpb24sXG4gICAgLyoqXG4gICAgICogVGhlIEltYWdlIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0ltYWdlfVxuICAgICAqL1xuICAgIEltYWdlOiBJbWFnZSxcbiAgICAvKipcbiAgICAgKiBUaGUgSW1hZ2VEYXRhIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cbiAgICAgKi9cbiAgICBJbWFnZURhdGE6IEltYWdlRGF0YSxcbiAgICAvKipcbiAgICAgKiBUaGUgTGVhcm5pbmdSYXRlIG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZX1cbiAgICAgKi9cbiAgICBMZWFybmluZ1JhdGU6IExlYXJuaW5nUmF0ZSxcbiAgICAvKipcbiAgICAgKiBUaGUgUGFyYW1ldGVyTGlzdCBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fVxuICAgICAqL1xuICAgIFBhcmFtZXRlckxpc3Q6IFBhcmFtZXRlckxpc3QsXG4gICAgLyoqXG4gICAgICogVGhlIFBvaW50MkQgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvUG9pbnQyRH1cbiAgICAgKi9cbiAgICBQb2ludDJEOiBQb2ludDJELFxuICAgIC8qKlxuICAgICAqIFRoZSBQcm9jZXNzZWRJbWFnZURhdGEgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxuICAgICAqL1xuICAgIFByb2Nlc3NlZEltYWdlRGF0YTogUHJvY2Vzc2VkSW1hZ2VEYXRhLFxuICAgIC8qKlxuICAgICAqIFRoZSBSYW5kb21GdW5jdGlvbiBtb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbn1cbiAgICAgKi9cbiAgICBSYW5kb21GdW5jdGlvbjogUmFuZG9tRnVuY3Rpb24sXG4gICAgLyoqXG4gICAgICogVGhlIFRyYWluUGVyZm9ybWFuY2UgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cbiAgICAgKi9cbiAgICBUcmFpblBlcmZvcm1hbmNlOiBUcmFpblBlcmZvcm1hbmNlLFxuICAgIC8qKlxuICAgICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50IG1vZGVsIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnR9XG4gICAgICovXG4gICAgVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludDogVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCxcbiAgICAvKipcbiAgICAgKiBUaGUgVHJhaW5TdGF0dXMgbW9kZWwgY29uc3RydWN0b3IuXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9XG4gICAgICovXG4gICAgVHJhaW5TdGF0dXM6IFRyYWluU3RhdHVzLFxuICAgIC8qKlxuICAgICAqIFRoZSBCdWlsZEFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9CdWlsZEFwaX1cbiAgICAgKi9cbiAgICBCdWlsZEFwaTogQnVpbGRBcGksXG4gICAgLyoqXG4gICAgICogVGhlIExvYWRBcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvTG9hZEFwaX1cbiAgICAgKi9cbiAgICBMb2FkQXBpOiBMb2FkQXBpLFxuICAgIC8qKlxuICAgICAqIFRoZSBUcmFpbkFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9UcmFpbkFwaX1cbiAgICAgKi9cbiAgICBUcmFpbkFwaTogVHJhaW5BcGksXG4gICAgLyoqXG4gICAgICogVGhlIFR1bmVBcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvVHVuZUFwaX1cbiAgICAgKi9cbiAgICBUdW5lQXBpOiBUdW5lQXBpLFxuICAgIC8qKlxuICAgICAqIFRoZSBWaXN1YWxpemVBcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvVmlzdWFsaXplQXBpfVxuICAgICAqL1xuICAgIFZpc3VhbGl6ZUFwaTogVmlzdWFsaXplQXBpXG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ2x1c3RlclBhcmFtZXRlcnMgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIENsdXN0ZXJQYXJhbWV0ZXJzIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9DbHVzdGVyUGFyYW1ldGVyc1xuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5DbHVzdGVyUGFyYW1ldGVyczwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnNcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5DbHVzdGVyUGFyYW1ldGVyczwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25fY2x1c3RlcnMnKSkge1xuICAgICAgICBvYmpbJ25fY2x1c3RlcnMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fY2x1c3RlcnMnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2luaXQnKSkge1xuICAgICAgICBvYmpbJ2luaXQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2luaXQnXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25faW5pdCcpKSB7XG4gICAgICAgIG9ialsnbl9pbml0J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2luaXQnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heF9pdGVyJykpIHtcbiAgICAgICAgb2JqWydtYXhfaXRlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWF4X2l0ZXInXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3RvbCcpKSB7XG4gICAgICAgIG9ialsndG9sJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd0b2wnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJykpIHtcbiAgICAgICAgb2JqWydwcmVjb21wdXRlX2Rpc3RhbmNlcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncHJlY29tcHV0ZV9kaXN0YW5jZXMnXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3ZlcmJvc2UnKSkge1xuICAgICAgICBvYmpbJ3ZlcmJvc2UnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3ZlcmJvc2UnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV9zdGF0ZScpKSB7XG4gICAgICAgIG9ialsncmFuZG9tX3N0YXRlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fc3RhdGUnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NvcHlfeCcpKSB7XG4gICAgICAgIG9ialsnY29weV94J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjb3B5X3gnXSwgJ0Jvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2pvYnMnKSkge1xuICAgICAgICBvYmpbJ25fam9icyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9qb2JzJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhbGdvcml0aG0nKSkge1xuICAgICAgICBvYmpbJ2FsZ29yaXRobSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYWxnb3JpdGhtJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG5fY2x1c3RlcnNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyduX2NsdXN0ZXJzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IGluaXRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydpbml0J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG5faW5pdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25faW5pdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtYXhfaXRlclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21heF9pdGVyJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHRvbFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3RvbCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBwcmVjb21wdXRlX2Rpc3RhbmNlc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHZlcmJvc2VcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyd2ZXJib3NlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJhbmRvbV9zdGF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV9zdGF0ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gY29weV94XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY29weV94J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG5fam9ic1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fam9icyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBhbGdvcml0aG1cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydhbGdvcml0aG0nXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1BvaW50MkQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vUG9pbnQyRCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNsdXN0ZXJpbmcgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBQb2ludDJEKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIENsdXN0ZXJpbmcgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0NsdXN0ZXJpbmdcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+Q2x1c3RlcmluZzwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ1xuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+Q2x1c3RlcmluZzwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ30gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ30gVGhlIHBvcHVsYXRlZCA8Y29kZT5DbHVzdGVyaW5nPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pblgnKSkge1xuICAgICAgICBvYmpbJ21pblgnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21pblgnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heFgnKSkge1xuICAgICAgICBvYmpbJ21heFgnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21heFgnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pblknKSkge1xuICAgICAgICBvYmpbJ21pblknXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21pblknXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heFknKSkge1xuICAgICAgICBvYmpbJ21heFknXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21heFknXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25DbHVzdGVycycpKSB7XG4gICAgICAgIG9ialsnbkNsdXN0ZXJzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduQ2x1c3RlcnMnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3BvaW50cycpKSB7XG4gICAgICAgIG9ialsncG9pbnRzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydwb2ludHMnXSwgW1BvaW50MkRdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1pblhcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaW5YJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1heFhcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtYXhYJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1pbllcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaW5ZJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1heFlcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtYXhZJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG5DbHVzdGVyc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25DbHVzdGVycyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9Qb2ludDJEPn0gcG9pbnRzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncG9pbnRzJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Db3N0RnVuY3Rpb24gPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIENvc3RGdW5jdGlvbiBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvQ29zdEZ1bmN0aW9uXG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNvc3RGdW5jdGlvbjwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvQ29zdEZ1bmN0aW9uXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNvc3RGdW5jdGlvbjwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ29zdEZ1bmN0aW9ufSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb259IFRoZSBwb3B1bGF0ZWQgPGNvZGU+Q29zdEZ1bmN0aW9uPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2Nvc3RfZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ2NmX2Nvc3RfZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2Nvc3RfZnVuY3Rpb24nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX21heF92YWwnKSkge1xuICAgICAgICBvYmpbJ2NmX21heF92YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX21heF92YWwnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfZmlsdGVyX3NpemUnKSkge1xuICAgICAgICBvYmpbJ2NmX2ZpbHRlcl9zaXplJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9maWx0ZXJfc2l6ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9maWx0ZXJfc2lnbWEnKSkge1xuICAgICAgICBvYmpbJ2NmX2ZpbHRlcl9zaWdtYSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfZmlsdGVyX3NpZ21hJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2sxJykpIHtcbiAgICAgICAgb2JqWydjZl9rMSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfazEnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfazInKSkge1xuICAgICAgICBvYmpbJ2NmX2syJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9rMiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl93ZWlnaHRzJykpIHtcbiAgICAgICAgb2JqWydjZl93ZWlnaHRzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl93ZWlnaHRzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBjZl9jb3N0X2Z1bmN0aW9uXG4gICAqIEBkZWZhdWx0ICdzcXVhcmVkX3BpeGVsX2Rpc3RhbmNlJ1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2Nvc3RfZnVuY3Rpb24nXSA9ICdzcXVhcmVkX3BpeGVsX2Rpc3RhbmNlJztcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9tYXhfdmFsXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfbWF4X3ZhbCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2ZpbHRlcl9zaXplXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfZmlsdGVyX3NpemUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9maWx0ZXJfc2lnbWFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9maWx0ZXJfc2lnbWEnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9rMVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2sxJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfazJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9rMiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gY2Zfd2VpZ2h0c1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX3dlaWdodHMnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMi4yXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBJbWFnZSBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvSW1hZ2VcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+SW1hZ2U8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0ltYWdlXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5JbWFnZTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2V9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0ltYWdlfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkltYWdlPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2J5dGVzdHJpbmcnKSkge1xuICAgICAgICBvYmpbJ2J5dGVzdHJpbmcnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2J5dGVzdHJpbmcnXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lkJykpIHtcbiAgICAgICAgb2JqWydpZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaWQnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Nvc3QnKSkge1xuICAgICAgICBvYmpbJ2Nvc3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Nvc3QnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gYnl0ZXN0cmluZ1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2J5dGVzdHJpbmcnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gaWRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydpZCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjb3N0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY29zdCddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvSW1hZ2UnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vSW1hZ2UnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZURhdGEgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgSW1hZ2UpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgSW1hZ2VEYXRhIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9JbWFnZURhdGFcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+SW1hZ2VEYXRhPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9JbWFnZURhdGFcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+SW1hZ2VEYXRhPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gVGhlIHBvcHVsYXRlZCA8Y29kZT5JbWFnZURhdGE8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbnVtSW1hZ2VzJykpIHtcbiAgICAgICAgb2JqWydudW1JbWFnZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bUltYWdlcyddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmVzWCcpKSB7XG4gICAgICAgIG9ialsncmVzWCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmVzWCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmVzWScpKSB7XG4gICAgICAgIG9ialsncmVzWSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmVzWSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnaW1hZ2VzJykpIHtcbiAgICAgICAgb2JqWydpbWFnZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2ltYWdlcyddLCBbSW1hZ2VdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG51bUltYWdlc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ251bUltYWdlcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSByZXNYXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmVzWCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSByZXNZXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmVzWSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9JbWFnZT59IGltYWdlc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2ltYWdlcyddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuTGVhcm5pbmdSYXRlID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBMZWFybmluZ1JhdGUgbW9kZWwgbW9kdWxlLlxuICAgKiBAbW9kdWxlIG1vZGVsL0xlYXJuaW5nUmF0ZVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5MZWFybmluZ1JhdGU8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZVxuICAgKiBAY2xhc3NcbiAgICovXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuXG5cblxuXG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5MZWFybmluZ1JhdGU8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvTGVhcm5pbmdSYXRlfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkxlYXJuaW5nUmF0ZTwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsZWFybmluZ19yYXRlX2Z1bmN0aW9uJykpIHtcbiAgICAgICAgb2JqWydsZWFybmluZ19yYXRlX2Z1bmN0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydsZWFybmluZ19yYXRlX2Z1bmN0aW9uJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnKSkge1xuICAgICAgICBvYmpbJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2RlY2F5X3N0ZXBzJykpIHtcbiAgICAgICAgb2JqWydscl9kZWNheV9zdGVwcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfZGVjYXlfc3RlcHMnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfZGVjYXlfcmF0ZScpKSB7XG4gICAgICAgIG9ialsnbHJfZGVjYXlfcmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfZGVjYXlfcmF0ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9zdGFpcmNhc2UnKSkge1xuICAgICAgICBvYmpbJ2xyX3N0YWlyY2FzZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfc3RhaXJjYXNlJ10sIFsnQm9vbGVhbiddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9ib3VuZGFyaWVzJykpIHtcbiAgICAgICAgb2JqWydscl9ib3VuZGFyaWVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9ib3VuZGFyaWVzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfdmFsdWVzJykpIHtcbiAgICAgICAgb2JqWydscl92YWx1ZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX3ZhbHVlcyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2VuZF9sZWFybmluZ19yYXRlJykpIHtcbiAgICAgICAgb2JqWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfZW5kX2xlYXJuaW5nX3JhdGUnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfcG93ZXInKSkge1xuICAgICAgICBvYmpbJ2xyX3Bvd2VyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9wb3dlciddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9jeWNsZScpKSB7XG4gICAgICAgIG9ialsnbHJfY3ljbGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2N5Y2xlJ10sIFsnQm9vbGVhbiddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IGxlYXJuaW5nX3JhdGVfZnVuY3Rpb25cbiAgICogQGRlZmF1bHQgJ3N0YXRpYydcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydsZWFybmluZ19yYXRlX2Z1bmN0aW9uJ10gPSAnc3RhdGljJztcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9pbml0aWFsX2xlYXJuaW5nX3JhdGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9kZWNheV9zdGVwc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2RlY2F5X3N0ZXBzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZGVjYXlfcmF0ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2RlY2F5X3JhdGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbHJfc3RhaXJjYXNlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfc3RhaXJjYXNlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBscl9ib3VuZGFyaWVzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfYm91bmRhcmllcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbHJfdmFsdWVzXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfdmFsdWVzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZW5kX2xlYXJuaW5nX3JhdGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9lbmRfbGVhcm5pbmdfcmF0ZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX3Bvd2VyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfcG93ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbHJfY3ljbGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9jeWNsZSddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvQ29zdEZ1bmN0aW9uJywgJ21vZGVsL0xlYXJuaW5nUmF0ZScsICdtb2RlbC9SYW5kb21GdW5jdGlvbiddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9Db3N0RnVuY3Rpb24nKSwgcmVxdWlyZSgnLi9MZWFybmluZ1JhdGUnKSwgcmVxdWlyZSgnLi9SYW5kb21GdW5jdGlvbicpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBhcmFtZXRlckxpc3QgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ29zdEZ1bmN0aW9uLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5MZWFybmluZ1JhdGUsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlJhbmRvbUZ1bmN0aW9uKTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIENvc3RGdW5jdGlvbiwgTGVhcm5pbmdSYXRlLCBSYW5kb21GdW5jdGlvbikge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBQYXJhbWV0ZXJMaXN0IG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9QYXJhbWV0ZXJMaXN0XG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlBhcmFtZXRlckxpc3Q8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3RcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH0gVGhlIHBvcHVsYXRlZCA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lucHV0X3NoYXBlJykpIHtcbiAgICAgICAgb2JqWydpbnB1dF9zaGFwZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5wdXRfc2hhcGUnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1iZXJfb2Zfc3RhY2tzJykpIHtcbiAgICAgICAgb2JqWydudW1iZXJfb2Zfc3RhY2tzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydudW1iZXJfb2Zfc3RhY2tzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZmlsdGVyX3NpemVzJykpIHtcbiAgICAgICAgb2JqWydmaWx0ZXJfc2l6ZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2ZpbHRlcl9zaXplcyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pcnJvcl93ZWlnaHRzJykpIHtcbiAgICAgICAgb2JqWydtaXJyb3Jfd2VpZ2h0cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWlycm9yX3dlaWdodHMnXSwgWydCb29sZWFuJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2FjdGl2YXRpb25fZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSwgWydTdHJpbmcnXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYmF0Y2hfc2l6ZScpKSB7XG4gICAgICAgIG9ialsnYmF0Y2hfc2l6ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYmF0Y2hfc2l6ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2Vwb2NocycpKSB7XG4gICAgICAgIG9ialsnbl9lcG9jaHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fZXBvY2hzJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3VzZV90ZW5zb3Jib2FyZCcpKSB7XG4gICAgICAgIG9ialsndXNlX3RlbnNvcmJvYXJkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd1c2VfdGVuc29yYm9hcmQnXSwgJ0Jvb2xlYW4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd2ZXJib3NlJykpIHtcbiAgICAgICAgb2JqWyd2ZXJib3NlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd2ZXJib3NlJ10sICdCb29sZWFuJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGVhcm5pbmdfcmF0ZV9kaWN0JykpIHtcbiAgICAgICAgb2JqWydsZWFybmluZ19yYXRlX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xlYXJuaW5nX3JhdGVfZGljdCddLCBbTGVhcm5pbmdSYXRlXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdF9mdW5jdGlvbl9kaWN0JykpIHtcbiAgICAgICAgb2JqWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Nvc3RfZnVuY3Rpb25fZGljdCddLCBbQ29zdEZ1bmN0aW9uXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnb3B0aW1pemVyJykpIHtcbiAgICAgICAgb2JqWydvcHRpbWl6ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ29wdGltaXplciddLCBbJ1N0cmluZyddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtb21lbnR1bScpKSB7XG4gICAgICAgIG9ialsnbW9tZW50dW0nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21vbWVudHVtJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV93ZWlnaHRzX2RpY3QnKSkge1xuICAgICAgICBvYmpbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSwgW1JhbmRvbUZ1bmN0aW9uXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX2JpYXNlc19kaWN0JykpIHtcbiAgICAgICAgb2JqWydyYW5kb21fYmlhc2VzX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9iaWFzZXNfZGljdCddLCBbUmFuZG9tRnVuY3Rpb25dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzZXNzaW9uX3NhdmVyX3BhdGgnKSkge1xuICAgICAgICBvYmpbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc2Vzc2lvbl9zYXZlcl9wYXRoJ10sICdTdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsb2FkX3ByZXZfc2Vzc2lvbicpKSB7XG4gICAgICAgIG9ialsnbG9hZF9wcmV2X3Nlc3Npb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xvYWRfcHJldl9zZXNzaW9uJ10sICdCb29sZWFuJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJykpIHtcbiAgICAgICAgb2JqWydzZXNzaW9uX3NhdmVfZHVyYXRpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdudW1fdGVzdF9waWN0dXJlcycpKSB7XG4gICAgICAgIG9ialsnbnVtX3Rlc3RfcGljdHVyZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bV90ZXN0X3BpY3R1cmVzJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGlucHV0X3NoYXBlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnaW5wdXRfc2hhcGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IG51bWJlcl9vZl9zdGFja3NcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydudW1iZXJfb2Zfc3RhY2tzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBmaWx0ZXJfc2l6ZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydmaWx0ZXJfc2l6ZXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxCb29sZWFuPn0gbWlycm9yX3dlaWdodHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaXJyb3Jfd2VpZ2h0cyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPFN0cmluZz59IGFjdGl2YXRpb25fZnVuY3Rpb25cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydhY3RpdmF0aW9uX2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gYmF0Y2hfc2l6ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2JhdGNoX3NpemUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBuX2Vwb2Noc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fZXBvY2hzJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtCb29sZWFufSB1c2VfdGVuc29yYm9hcmRcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3VzZV90ZW5zb3Jib2FyZCddID0gdHJ1ZTtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0Jvb2xlYW59IHZlcmJvc2VcbiAgICogQGRlZmF1bHQgdHJ1ZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHRydWU7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZT59IGxlYXJuaW5nX3JhdGVfZGljdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xlYXJuaW5nX3JhdGVfZGljdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb24+fSBjb3N0X2Z1bmN0aW9uX2RpY3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxTdHJpbmc+fSBvcHRpbWl6ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydvcHRpbWl6ZXInXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtb21lbnR1bVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21vbWVudHVtJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9uPn0gcmFuZG9tX3dlaWdodHNfZGljdFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb24+fSByYW5kb21fYmlhc2VzX2RpY3RcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fYmlhc2VzX2RpY3QnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gc2Vzc2lvbl9zYXZlcl9wYXRoXG4gICAqIEBkZWZhdWx0ICcuL3NhdmUvJ1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gJy4vc2F2ZS8nO1xuICAvKipcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gbG9hZF9wcmV2X3Nlc3Npb25cbiAgICogQGRlZmF1bHQgZmFsc2VcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydsb2FkX3ByZXZfc2Vzc2lvbiddID0gZmFsc2U7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gc2Vzc2lvbl9zYXZlX2R1cmF0aW9uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbnVtX3Rlc3RfcGljdHVyZXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydudW1fdGVzdF9waWN0dXJlcyddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUG9pbnQyRCA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgUG9pbnQyRCBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvUG9pbnQyRFxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5Qb2ludDJEPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Qb2ludDJEXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5Qb2ludDJEPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlBvaW50MkQ8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneCcpKSB7XG4gICAgICAgIG9ialsneCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsneCddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneScpKSB7XG4gICAgICAgIG9ialsneSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsneSddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2x1c3RlcicpKSB7XG4gICAgICAgIG9ialsnY2x1c3RlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2x1c3RlciddLCAnTnVtYmVyJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSB4XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsneCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSB5XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsneSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjbHVzdGVyXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2x1c3RlciddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvSW1hZ2UnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vSW1hZ2UnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qcm9jZXNzZWRJbWFnZURhdGEgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgSW1hZ2UpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgUHJvY2Vzc2VkSW1hZ2VEYXRhIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGFcbiAgICogQHZlcnNpb24gMS4yLjJcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UHJvY2Vzc2VkSW1hZ2VEYXRhPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGFcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5Qcm9jZXNzZWRJbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4gaW5zdGFuY2UuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcbiAgICBpZiAoZGF0YSkge1xuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XG5cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdlcG9jaCcpKSB7XG4gICAgICAgIG9ialsnZXBvY2gnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Vwb2NoJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzdGVwJykpIHtcbiAgICAgICAgb2JqWydzdGVwJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzdGVwJ10sICdOdW1iZXInKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbnB1dExheWVyJykpIHtcbiAgICAgICAgb2JqWydpbnB1dExheWVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpbnB1dExheWVyJ10sIFtJbWFnZV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xhdGVudExheWVyJykpIHtcbiAgICAgICAgb2JqWydsYXRlbnRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGF0ZW50TGF5ZXInXSwgW1tJbWFnZV1dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdvdXRwdXRMYXllcicpKSB7XG4gICAgICAgIG9ialsnb3V0cHV0TGF5ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ291dHB1dExheWVyJ10sIFtJbWFnZV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gZXBvY2hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydlcG9jaCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBzdGVwXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc3RlcCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9JbWFnZT59IGlucHV0TGF5ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydpbnB1dExheWVyJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPG1vZHVsZTptb2RlbC9JbWFnZT4+fSBsYXRlbnRMYXllclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xhdGVudExheWVyJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gb3V0cHV0TGF5ZXJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydvdXRwdXRMYXllciddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUmFuZG9tRnVuY3Rpb24gPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIFJhbmRvbUZ1bmN0aW9uIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9SYW5kb21GdW5jdGlvblxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5SYW5kb21GdW5jdGlvbjwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb25cbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlJhbmRvbUZ1bmN0aW9uPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9SYW5kb21GdW5jdGlvbn0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb259IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UmFuZG9tRnVuY3Rpb248L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX2Z1bmN0aW9uJykpIHtcbiAgICAgICAgb2JqWydyYW5kb21fZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9mdW5jdGlvbiddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYWxwaGEnKSkge1xuICAgICAgICBvYmpbJ2FscGhhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhbHBoYSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdiZXRhJykpIHtcbiAgICAgICAgb2JqWydiZXRhJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydiZXRhJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21lYW4nKSkge1xuICAgICAgICBvYmpbJ21lYW4nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21lYW4nXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc3RkZGV2JykpIHtcbiAgICAgICAgb2JqWydzdGRkZXYnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3N0ZGRldiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdsYW0nKSkge1xuICAgICAgICBvYmpbJ2xhbSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGFtJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21pbnZhbCcpKSB7XG4gICAgICAgIG9ialsnbWludmFsJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtaW52YWwnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4dmFsJykpIHtcbiAgICAgICAgb2JqWydtYXh2YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21heHZhbCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdzZWVkJykpIHtcbiAgICAgICAgb2JqWydzZWVkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzZWVkJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gcmFuZG9tX2Z1bmN0aW9uXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsncmFuZG9tX2Z1bmN0aW9uJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gYWxwaGFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydhbHBoYSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGJldGFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydiZXRhJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbWVhblxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21lYW4nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBzdGRkZXZcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydzdGRkZXYnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBsYW1cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydsYW0nXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtaW52YWxcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaW52YWwnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtYXh2YWxcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtYXh2YWwnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBzZWVkXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc2VlZCddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgVHJhaW5QZXJmb3JtYW5jZSBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvVHJhaW5QZXJmb3JtYW5jZVxuICAgKiBAdmVyc2lvbiAxLjIuMlxuICAgKi9cblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlRyYWluUGVyZm9ybWFuY2U8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbW9kZWxfaWQnKSkge1xuICAgICAgICBvYmpbJ21vZGVsX2lkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtb2RlbF9pZCddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndHJhaW5fc3RhdHVzJykpIHtcbiAgICAgICAgb2JqWyd0cmFpbl9zdGF0dXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3RyYWluX3N0YXR1cyddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndHJhaW5fcGVyZm9ybWFuY2VfZGF0YScpKSB7XG4gICAgICAgIG9ialsndHJhaW5fcGVyZm9ybWFuY2VfZGF0YSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndHJhaW5fcGVyZm9ybWFuY2VfZGF0YSddLCBbVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludF0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbW9kZWxfaWRcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtb2RlbF9pZCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSB0cmFpbl9zdGF0dXNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyd0cmFpbl9zdGF0dXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludD59IHRyYWluX3BlcmZvcm1hbmNlX2RhdGFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWyd0cmFpbl9wZXJmb3JtYW5jZV9kYXRhJ10gPSB1bmRlZmluZWQ7XG5cblxuXG4gIHJldHVybiBleHBvcnRzO1xufSkpO1xuXG5cbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjIuMlxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50ID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50IG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50XG4gICAqIEB2ZXJzaW9uIDEuMi4yXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQ8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludH0gVGhlIHBvcHVsYXRlZCA8Y29kZT5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50PC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Vwb2NoJykpIHtcbiAgICAgICAgb2JqWydlcG9jaCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnZXBvY2gnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3N0ZXAnKSkge1xuICAgICAgICBvYmpbJ3N0ZXAnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3N0ZXAnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Nvc3QnKSkge1xuICAgICAgICBvYmpbJ2Nvc3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Nvc3QnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2N1cnJlbnRMZWFybmluZ1JhdGUnKSkge1xuICAgICAgICBvYmpbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gZXBvY2hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydlcG9jaCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBzdGVwXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc3RlcCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjb3N0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY29zdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjdXJyZW50TGVhcm5pbmdSYXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY3VycmVudExlYXJuaW5nUmF0ZSddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcbiAqXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4yLjJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcbiAqXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxuICpcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxuICpcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cbiAqXG4gKi9cblxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcbiAgICB9XG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5TdGF0dXMgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG4gIC8qKlxuICAgKiBFbnVtIGNsYXNzIFRyYWluU3RhdHVzLlxuICAgKiBAZW51bSB7fVxuICAgKiBAcmVhZG9ubHlcbiAgICovXG4gIHZhciBleHBvcnRzID0ge1xuICAgIC8qKlxuICAgICAqIHZhbHVlOiBcInN0YXJ0XCJcbiAgICAgKiBAY29uc3RcbiAgICAgKi9cbiAgICBcInN0YXJ0XCI6IFwic3RhcnRcIixcbiAgICAvKipcbiAgICAgKiB2YWx1ZTogXCJwYXVzZVwiXG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgXCJwYXVzZVwiOiBcInBhdXNlXCIsXG4gICAgLyoqXG4gICAgICogdmFsdWU6IFwic3RvcFwiXG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgXCJzdG9wXCI6IFwic3RvcFwiLFxuICAgIC8qKlxuICAgICAqIHZhbHVlOiBcInJlc3VtZVwiXG4gICAgICogQGNvbnN0XG4gICAgICovXG4gICAgXCJyZXN1bWVcIjogXCJyZXN1bWVcIiAgfTtcblxuICAvKipcbiAgICogUmV0dXJucyBhIDxjb2RlPlRyYWluU3RhdHVzPC9jb2RlPiBlbnVtIHZhbHVlIGZyb20gYSBKYXZhc2NyaXB0IG9iamVjdCBuYW1lLlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB0aGUgbmFtZSBvZiB0aGUgZW51bSB2YWx1ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfSBUaGUgZW51bSA8Y29kZT5UcmFpblN0YXR1czwvY29kZT4gdmFsdWUuXG4gICAqL1xuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLypcclxuSW5jbHVkZXNcclxuICovXHJcbnZhciBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSByZXF1aXJlKCdjb252b2x1dGlvbmFsX2F1dG9lbmNvZGVyJyk7XHJcblxyXG4vKlxyXG5HbG9iYWwgdmFyaWFibGVzXHJcbiAqL1xyXG52YXIgdHJhaW5BcGkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluQXBpKCk7XHJcbnZhciBsb2FkQXBpID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Mb2FkQXBpKCk7XHJcbnZhciBidWlsZEFwaSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuQnVpbGRBcGkoKTtcclxuXHJcblxyXG4vKlxyXG5BUEkgdGVzdFxyXG4gKi9cclxuZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0FQSSBjYWxsZWQgc3VjY2Vzc2Z1bGx5LicpO1xyXG4gICAgfVxyXG59XHJcblxyXG5sb2FkQXBpLnJlc2V0QWxsQmF0Y2hJbmRpY2VzKGNhbGxiYWNrKTtcclxuXHJcbi8qXHJcbkdsb2JhbCB2YXJpYWJsZXNcclxuICovXHJcbnZhciB0cmFpblRpbWVyO1xyXG52YXIgY3VycmVudFRyYWluSW1hZ2VFcG9jaCA9IDA7XHJcbnZhciBkYXRhc2V0bmFtZSA9IFwidHJhaW5fZGF0YVwiO1xyXG52YXIgaW5wdXRTaGFwZSA9IFsxLCAxLCAxLCAxXTtcclxudmFyIGFubklucHV0U2hhcGUgPSBbMSwgMSwgMSwgMV07XHJcblxyXG4vKlxyXG5IZWxwZXIgZnVuY3Rpb25cclxuICovXHJcbmZ1bmN0aW9uIGdldEFubklucHV0RGltZW5zaW9uKCkge1xyXG4gICAgZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwYXJhbWV0ZXIgc2V0IHJlY2VpdmVkJyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICBhbm5JbnB1dFNoYXBlID0gZGF0YS5pbnB1dF9zaGFwZVswXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYnVpbGRBcGkuZ2V0QU5OUGFyYW1ldGVyKGNhbGxiYWNrKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0SW5wdXREaW1lbnNpb25zKCkge1xyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBpbnB1dFNoYXBlQ2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgLy91cGRhdGUgZGF0YSBzdGF0aXN0aWNzOlxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxhYmVsUmVzb2x1dGlvblwiKS50ZXh0Q29udGVudCA9IFwiUmVzb2x1dGlvbjogXCIgKyBkYXRhWzFdICsgXCJweCB4IFwiICsgZGF0YVsyXSArIFwicHhcIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsYWJlbExheWVyXCIpLnRleHRDb250ZW50ID0gXCJMYXllcjogXCIgKyBkYXRhWzNdO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxhYmVsTnVtYmVyT2ZJbWFnZXNcIikudGV4dENvbnRlbnQgPSBcIk51bWJlciBvZiBJbWFnZXM6IFwiICsgZGF0YVswXTtcclxuXHJcbiAgICAgICAgICAgIC8vdXBkYXRlIGlucHV0IHNoYXBlOlxyXG4gICAgICAgICAgICBpbnB1dFNoYXBlID0gZGF0YTtcclxuXHJcbiAgICAgICAgICAgIC8vIGFkZCBwbGFjZWhvbGRlciBmb3IgZmlyc3QgZGltOlxyXG4gICAgICAgICAgICBpbnB1dFNoYXBlWzBdID0gLTE7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGJ1aWxkQXBpLmdldElucHV0U2hhcGUoeydkYXRhc2V0TmFtZSc6IGRhdGFzZXRuYW1lfSwgaW5wdXRTaGFwZUNhbGxiYWNrKVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBdmFpbGFibGVEYXRhU2V0cygpIHtcclxuICAgIGZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbG9hZGVkIGRhdGEgc2V0cyByZXRyaWV2ZWQnKTtcclxuICAgICAgICAgICAgLy8gcmVwbGFjZSBvcHRpb25zIGluICdMb2FkZWQgZGF0YSBzZXRzJyBzZWxlY3Rpb25cclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIHZhciBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImlucHV0TG9hZGVkRGF0YVNldHNcIik7XHJcbiAgICAgICAgICAgIC8vIHJlbW92ZSBwcmV2aW91cyBvcHRpb25zXHJcbiAgICAgICAgICAgIHNlbGVjdGlvbi5vcHRpb25zLmxlbmd0aCA9IDA7XHJcbiAgICAgICAgICAgIC8vIGFkZCBhdmFpbGFibGUgZmlsZSBuYW1lc1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbi5vcHRpb25zW2ldID0gbmV3IE9wdGlvbihkYXRhW2ldLCBkYXRhW2ldLCBmYWxzZSwgZmFsc2UpXHJcbiAgICAgICAgICAgICAgICBjaGVja0lucHV0RGltZW5zaW9ucyhzZWxlY3Rpb24ub3B0aW9uc1tpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gc2VsZWN0IGZpcnN0IGVsZW1lbnQ6XHJcbiAgICAgICAgICAgIHNlbGVjdGlvbi5vcHRpb25zWzBdLnNlbGVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgc2VsZWN0TG9hZGVkRGF0YXNldCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsb2FkQXBpLmdldExvYWRlZERhdGFTZXRzKGNhbGxiYWNrKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hlY2tJbnB1dERpbWVuc2lvbnMob3B0aW9uKSB7XHJcbiAgICAvLyBkaXNhYmxlIG9wdGlvbiB0byBwcmV2ZW50IGVycm9yczpcclxuICAgIG9wdGlvbi5kaXNhYmxlZCA9IHRydWU7XHJcblxyXG4gICAgLy8gYWN0aXZhdGUgYWdhaW4gaWZcclxuICAgIGZ1bmN0aW9uIGlucHV0U2hhcGVDYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGFubklucHV0U2hhcGUpO1xyXG5cclxuICAgICAgICAgICAgLy8gZGlzYWJsZSBvcHRpb24gaWYgaW5wdXQgc2hhcGUgZG9lc24ndCBmaXQgdGhlIEFOTjpcclxuXHJcbiAgICAgICAgICAgIGlmIChkYXRhWzFdID09PSBhbm5JbnB1dFNoYXBlWzFdKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGF0YVsyXSA9PT0gYW5uSW5wdXRTaGFwZVsyXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhWzNdID09PSBhbm5JbnB1dFNoYXBlWzNdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbi5kaXNhYmxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBidWlsZEFwaS5nZXRJbnB1dFNoYXBlKHsnZGF0YXNldE5hbWUnOiBvcHRpb24udmFsdWV9LCBpbnB1dFNoYXBlQ2FsbGJhY2spXHJcblxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gc2VsZWN0TG9hZGVkRGF0YXNldCgpIHtcclxuICAgIGRhdGFzZXRuYW1lID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dExvYWRlZERhdGFTZXRzXCIpLm9wdGlvbnNbZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJpbnB1dExvYWRlZERhdGFTZXRzXCIpLnNlbGVjdGVkSW5kZXhdLnZhbHVlO1xyXG4gICAgZ2V0SW5wdXREaW1lbnNpb25zKCk7XHJcbn1cclxuXHJcbi8qXHJcbkNoYXJ0c1xyXG4gKi9cclxudmFyIGNvc3RDaGFydCA9IG5ldyBMaW5lQ2hhcnQoXCJjaGFydHNcIiwgNTAwLCA1MDAsIFwic3RlcFwiLCBcImNvc3RcIiwgXCJzdGVwc1wiLCBcImNvc3RcIiwgeydjb3N0JzogJ2xpZ2h0Ymx1ZSd9KTtcclxuLy8gYWRkIGxpbmUgYnJlYWtcclxuLy8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGFydHNcIikuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJyXCIpKTtcclxudmFyIGxlYXJuaW5nUmF0ZUNoYXJ0ID0gbmV3IExpbmVDaGFydChcImNoYXJ0c1wiLCA1MDAsIDUwMCwgXCJzdGVwXCIsIFwiY3VycmVudExlYXJuaW5nUmF0ZVwiLCBcInN0ZXBzXCIsIFwibGVhcm5pbmcgcmF0ZVwiLFxyXG4gICAgeydsZWFybmluZyByYXRlJzogJ2xpZ2h0Ymx1ZSd9KTtcclxuLy8gYWRkIGxpbmUgYnJlYWtcclxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGFydHNcIikuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJyXCIpKTtcclxudmFyIGVwb2NoSW1hZ2VzID0gbmV3IEltYWdlR3JpZChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRGdWxsV2lkdGhcIiksIDkpO1xyXG5cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRyYWluSW1hZ2VzKCkge1xyXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhkYXRhKTtcclxuXHJcbiAgICAgICAgICAgIC8vIC8vZ2V0IGltYWdlIHBhbmVcclxuICAgICAgICAgICAgLy8gdmFyIGltYWdlR3JpZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW1hZ2VHcmlkXCIpO1xyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyAvLyByZW1vdmUgYWxsIHByZXZpb3VzIGVsZW1lbnRzOlxyXG4gICAgICAgICAgICAvLyBpbWFnZUdyaWQuaW5uZXJIVE1MID0gXCJcIjtcclxuXHJcbiAgICAgICAgICAgIC8vIGFkZCBpbWFnZSBwYWlyc1xyXG4gICAgICAgICAgICAvLyBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEuaW5wdXRMYXllci5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAvLyAgICAgLy8gY3JlYXRlIG5ldyB0YWJsZSByb3c6XHJcbiAgICAgICAgICAgIC8vICAgICB2YXIgdGFibGVSb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidHJcIik7XHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vICAgICAvLyBjcmVhdGUgY2VsbCBmb3IgaW5wdXQgaW1hZ2VcclxuICAgICAgICAgICAgLy8gICAgIHZhciBpbnB1dENlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGRcIik7XHJcbiAgICAgICAgICAgIC8vICAgICAvLyBjcmVhdGUgbmV3IGlucHV0IGltYWdlIG9iamVjdFxyXG4gICAgICAgICAgICAvLyAgICAgdmFyIG5ld0lucHV0SW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAvLyAgICAgbmV3SW5wdXRJbWFnZS5pZCA9IFwiSW5wdXRJbWFnZV9cIiArIGRhdGEuaW5wdXRMYXllcltpXS5pZDtcclxuICAgICAgICAgICAgLy8gICAgIG5ld0lucHV0SW1hZ2Uuc3JjID0gXCJkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBkYXRhLmlucHV0TGF5ZXJbaV0uYnl0ZXN0cmluZy5zdWJzdHJpbmcoMixcclxuICAgICAgICAgICAgLy8gICAgICAgICBkYXRhLmlucHV0TGF5ZXJbaV0uYnl0ZXN0cmluZy5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgLy8gICAgIG5ld0lucHV0SW1hZ2Uuc3R5bGUud2lkdGggPSBcIjE2MHB4XCI7XHJcbiAgICAgICAgICAgIC8vICAgICBuZXdJbnB1dEltYWdlLmNsYXNzID0gXCJpbWFnZVRodW1ibmFpbFwiO1xyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyAgICAgLy8gYXBwZW5kIG5ldyBpbWFnZSB0byBpbWFnZSBncmlkXHJcbiAgICAgICAgICAgIC8vICAgICBpbnB1dENlbGwuYXBwZW5kQ2hpbGQobmV3SW5wdXRJbWFnZSk7XHJcbiAgICAgICAgICAgIC8vICAgICB0YWJsZVJvdy5hcHBlbmRDaGlsZChpbnB1dENlbGwpO1xyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyAgICAgLy8gY3JlYXRlIG5ldyBsYXRlbnQgaW1hZ2Ugb2JqZWN0XHJcbiAgICAgICAgICAgIC8vICAgICB2YXIgbGF0ZW50Q2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZFwiKTtcclxuICAgICAgICAgICAgLy8gICAgIGZvciAodmFyIGogPSAwOyBqIDwgZGF0YS5sYXRlbnRMYXllcltpXS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIHZhciBuZXdMYXRlbnRJbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgbmV3TGF0ZW50SW1hZ2UuaWQgPSBcIkxhdGVudEltYWdlX1wiICsgZGF0YS5sYXRlbnRMYXllcltpXVtqXS5pZCArIFwiX1wiICsgajtcclxuICAgICAgICAgICAgLy8gICAgICAgICBuZXdMYXRlbnRJbWFnZS5zcmMgPSBcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxcIiArIGRhdGEubGF0ZW50TGF5ZXJbaV1bal0uYnl0ZXN0cmluZy5zdWJzdHJpbmcoMixcclxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgZGF0YS5sYXRlbnRMYXllcltpXVtqXS5ieXRlc3RyaW5nLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIG5ld0xhdGVudEltYWdlLnN0eWxlLndpZHRoID0gXCI0MHB4XCI7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgbmV3TGF0ZW50SW1hZ2UuY2xhc3MgPSBcImltYWdlVGh1bWJuYWlsXCI7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgLy8gYXBwZW5kIG5ldyBpbWFnZSBkaXYgdG8gaW1hZ2UgZ3JpZFxyXG4gICAgICAgICAgICAvLyAgICAgICAgIGxhdGVudENlbGwuYXBwZW5kQ2hpbGQobmV3TGF0ZW50SW1hZ2UpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGlmICgoaiArIDEpICUgNCA9PT0gMCkgeyAvL01hdGguY2VpbChNYXRoLnNxcnQoZGF0YS5sYXRlbnRMYXllcltpXS5sZW5ndGgpKVxyXG4gICAgICAgICAgICAvLyAgICAgICAgICAgICBsYXRlbnRDZWxsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gICAgIC8vIGFwcGVuZCBuZXcgaW1hZ2UgZGl2IHRvIGltYWdlIGdyaWRcclxuICAgICAgICAgICAgLy8gICAgIHRhYmxlUm93LmFwcGVuZENoaWxkKGxhdGVudENlbGwpO1xyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyAgICAgLyovLyBhZGQgZXZlbnRMaXN0ZW5lclxyXG4gICAgICAgICAgICAvLyAgICAgLy8gY2hhbmdlIHByZXZpZXcgdmlld1xyXG4gICAgICAgICAgICAvLyAgICAgbmV3SW5wdXRJbWFnZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW1hZ2VQcmV2aWV3XCIpLnNyYyA9IHRoaXMuc3JjO1xyXG4gICAgICAgICAgICAvLyAgICAgfSk7Ki9cclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gICAgIC8vIGNyZWF0ZSBjZWxsIGZvciBpbnB1dCBpbWFnZVxyXG4gICAgICAgICAgICAvLyAgICAgdmFyIG91dHB1dENlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGRcIik7XHJcbiAgICAgICAgICAgIC8vICAgICAvLyBjcmVhdGUgbmV3IG91dHB1dCBpbWFnZSBvYmplY3RcclxuICAgICAgICAgICAgLy8gICAgIHZhciBuZXdPdXRwdXRJbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgIC8vICAgICBuZXdPdXRwdXRJbWFnZS5pZCA9IFwiT3V0cHV0SW1hZ2VfXCIgKyBkYXRhLm91dHB1dExheWVyW2ldLmlkO1xyXG4gICAgICAgICAgICAvLyAgICAgbmV3T3V0cHV0SW1hZ2Uuc3JjID0gXCJkYXRhOmltYWdlL3BuZztiYXNlNjQsXCIgKyBkYXRhLm91dHB1dExheWVyW2ldLmJ5dGVzdHJpbmcuc3Vic3RyaW5nKDIsXHJcbiAgICAgICAgICAgIC8vICAgICAgICAgZGF0YS5vdXRwdXRMYXllcltpXS5ieXRlc3RyaW5nLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICAvLyAgICAgbmV3T3V0cHV0SW1hZ2Uuc3R5bGUud2lkdGggPSBcIjE2MHB4XCI7XHJcbiAgICAgICAgICAgIC8vICAgICBuZXdPdXRwdXRJbWFnZS5jbGFzcyA9IFwiaW1hZ2VUaHVtYm5haWxcIjtcclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gICAgIC8vIGFwcGVuZCBuZXcgaW1hZ2UgdG8gaW1hZ2UgZ3JpZFxyXG4gICAgICAgICAgICAvLyAgICAgb3V0cHV0Q2VsbC5hcHBlbmRDaGlsZChuZXdPdXRwdXRJbWFnZSk7XHJcbiAgICAgICAgICAgIC8vICAgICB0YWJsZVJvdy5hcHBlbmRDaGlsZChvdXRwdXRDZWxsKTtcclxuICAgICAgICAgICAgLy9cclxuICAgICAgICAgICAgLy8gICAgIGltYWdlR3JpZC5hcHBlbmRDaGlsZCh0YWJsZVJvdyk7XHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vXHJcbiAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAgICAgICAgIC8vYWRkIGltYWdlcyBlcG9jaHdpc2VcclxuICAgICAgICAgICAgaWYgKGRhdGEuZXBvY2ggPiBjdXJyZW50VHJhaW5JbWFnZUVwb2NoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgbmV3IGNvbHVtbjpcclxuICAgICAgICAgICAgICAgIGVwb2NoSW1hZ2VzLmFkZE5ld0ltYWdlQ29sdW1uKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgICAgIGN1cnJlbnRUcmFpbkltYWdlRXBvY2ggPSBkYXRhLmVwb2NoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdHJhaW5BcGkuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhKDksIGNhbGxiYWNrKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVHJhaW5TdGF0aXN0aWNzKCkge1xyXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgLy91cGRhdGUgY29zdCBkaWFncmFtXHJcbiAgICAgICAgICAgIGlmIChkYXRhLnRyYWluX3BlcmZvcm1hbmNlX2RhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29zdENoYXJ0LmFwcGVuZERhdGEoeydjb3N0JzogZGF0YS50cmFpbl9wZXJmb3JtYW5jZV9kYXRhfSk7XHJcbiAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVDaGFydC5hcHBlbmREYXRhKHsnbGVhcm5pbmcgcmF0ZSc6IGRhdGEudHJhaW5fcGVyZm9ybWFuY2VfZGF0YX0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGF0YS50cmFpbl9zdGF0dXMgPT09IFwiZmluaXNoZWRcIikge1xyXG4gICAgICAgICAgICAgICAgLy8gc3RvcCB1cGRhdGUgdGltZXJcclxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodHJhaW5UaW1lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcHJpbnQgc3RhdHVzXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWluaW5nIGZpbmlzaGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGaW5hbCBzdGVwOiBcIiArIGNvc3RDaGFydC5nZXRMYXRlc3RYVmFsdWUoJ2Nvc3QnKSk7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3BvbnNlTGFiZWxcIikudGV4dENvbnRlbnQgPSBcIlRyYWluaW5nIGZpbmlzaGVkLiAgRmluYWwgc3RlcDogXCJcclxuICAgICAgICAgICAgICAgICAgICArIGNvc3RDaGFydC5nZXRMYXRlc3RYVmFsdWUoJ2Nvc3QnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH07XHJcblxyXG4gICAgdHJhaW5BcGkuZ2V0VHJhaW5QZXJmb3JtYW5jZShjYWxsYmFjayk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XHJcbiAgICAvLyB1cGRhdGUgdHJhaW4gaW1hZ2VzOlxyXG4gICAgdXBkYXRlVHJhaW5JbWFnZXMoKTtcclxuXHJcbiAgICAvLyB1cGRhdGUgY2hhcnRzOlxyXG4gICAgdXBkYXRlVHJhaW5TdGF0aXN0aWNzKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0YXJ0VHJhaW5pbmcoKSB7XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyBhYm9ydCBpZiBubyBtb2RlbCBpcyBhdmFpbGFibGU6XHJcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSAyMDQpIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzcG9uc2VMYWJlbFwiKS50ZXh0Q29udGVudCA9IFwiTm8gQ0FFIG1vZGVsIGF2YWlsYWJsZSB0byB0cmFpblwiO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3BvbnNlTGFiZWxcIikudGV4dENvbnRlbnQgPSByZXNwb25zZS50ZXh0O1xyXG4gICAgICAgICAgICAvLyBzdGFydCB1cGRhdGUgdGltZXJcclxuICAgICAgICAgICAgdHJhaW5UaW1lciA9IHNldEludGVydmFsKHVwZGF0ZVZpZXcsIDUwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRyYWluQXBpLmNvbnRyb2xUcmFpbmluZygnXCJzdGFydFwiJywge1wiZGF0YXNldE5hbWVcIjogZGF0YXNldG5hbWV9LCBjYWxsYmFjayk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0b3BUcmFpbmluZygpIHtcclxuXHJcbiAgICBmdW5jdGlvbiBjYWxsYmFjayhlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNwb25zZUxhYmVsXCIpLnRleHRDb250ZW50ID0gcmVzcG9uc2UudGV4dDtcclxuXHJcbiAgICAgICAgICAgIC8vIHN0b3AgdXBkYXRlIHRpbWVyXHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodHJhaW5UaW1lcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRyYWluQXBpLmNvbnRyb2xUcmFpbmluZygnXCJzdG9wXCInLCBjYWxsYmFjayk7XHJcbn1cclxuXHJcblxyXG4vKlxyXG5hdHRhY2ggRXZlbnQgTGlzdGVuZXJcclxuICovXHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW5wdXRMb2FkZWREYXRhU2V0c1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHNlbGVjdExvYWRlZERhdGFzZXQpO1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXJ0VHJhaW5pbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHN0YXJ0VHJhaW5pbmcpO1xyXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0b3BUcmFpbmluZ1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3RvcFRyYWluaW5nKTtcclxuXHJcbmdldEFubklucHV0RGltZW5zaW9uKCk7XHJcbmdldEF2YWlsYWJsZURhdGFTZXRzKCk7XHJcblxyXG5cclxuXHJcblxyXG4iXX0=
