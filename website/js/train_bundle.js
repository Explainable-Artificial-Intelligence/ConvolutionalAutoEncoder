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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
     * @param {module:api/TrainApi~controlTrainingCallback} callback The callback function, accepting three arguments: error, data, response
     */
    this.controlTraining = function(trainStatus, callback) {
      var postBody = trainStatus;

      // verify the required parameter 'trainStatus' is set
      if (trainStatus === undefined || trainStatus === null) {
        throw new Error("Missing the required parameter 'trainStatus' when calling controlTraining");
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
        "../model/TrainStatus": 35
    }],
    21: [function (require, module, exports) {
/**
 * Convolutional Autoencoder
 * WebUI to build, train and tune a Convolutional Autoencoder
 *
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
     * @param {String} algorithm determines the clutering algorithm
     * @param {String} dimensionReduction determines the algorithm for dim reduction
     * @param {Object} opts Optional parameters
     * @param {String} opts.datasetName determines the dataset which should be clustered (default to train_data)
     * @param {Number} opts.layer determines the hidden layer
     * @param {module:model/ClusterParameters} opts.clusterParameters determines the clutering parameters
     * @param {module:api/VisualizeApi~getHiddenLayerLatentClusteringCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Clustering}
     */
    this.getHiddenLayerLatentClustering = function (algorithm, dimensionReduction, opts, callback) {
      opts = opts || {};
        var postBody = opts['clusterParameters'];

        // verify the required parameter 'algorithm' is set
        if (algorithm === undefined || algorithm === null) {
            throw new Error("Missing the required parameter 'algorithm' when calling getHiddenLayerLatentClustering");
        }

        // verify the required parameter 'dimensionReduction' is set
        if (dimensionReduction === undefined || dimensionReduction === null) {
            throw new Error("Missing the required parameter 'dimensionReduction' when calling getHiddenLayerLatentClustering");
        }


      var pathParams = {
      };
      var queryParams = {
          'algorithm': algorithm,
        'dataset_name': opts['datasetName'],
          'dimension_reduction': dimensionReduction,
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
         * OpenAPI spec version: 1.1.3
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
             * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
     * @version 1.1.3
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
         * OpenAPI spec version: 1.1.3
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
             * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
         * OpenAPI spec version: 1.1.3
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
             * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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
   * @version 1.1.3
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
         * OpenAPI spec version: 1.1.3
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
             * @version 1.1.3
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
 * OpenAPI spec version: 1.1.3
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


var trainTimer;

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
        var currentTrainImageEpoch = 0;

/*
Charts
 */
        var costChart = new LineChart("charts", 500, 500, "step", "cost", "steps", "cost", {'cost': 'lightblue'});
// add line break
        document.getElementById("charts").appendChild(document.createElement("br"));
        var learningRateChart = new LineChart("charts", 500, 500, "step", "currentLearningRate", "steps", "learning rate",
            {'learning rate': 'lightblue'});
// add line break
        document.getElementById("charts").appendChild(document.createElement("br"));
        var epochImages = new ImageGrid(document.getElementById("charts"), 9);


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
            document.getElementById("responseLabel").textContent = response.text;

            // start update timer
            trainTimer = setInterval(updateView, 500);
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


    }, {"convolutional_autoencoder": 22}]
}, {}, [36])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9iYXNlNjQtanMvaW5kZXguanMiLCJDOi9Vc2Vycy9MZW9uL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVzb2x2ZS9lbXB0eS5qcyIsIkM6L1VzZXJzL0xlb24vQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZGVjb2RlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZW5jb2RlLmpzIiwiQzovVXNlcnMvTGVvbi9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvaW5kZXguanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvY29tcG9uZW50LWVtaXR0ZXIvaW5kZXguanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvY2xpZW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2lzLWZ1bmN0aW9uLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvbm9kZV9tb2R1bGVzL3N1cGVyYWdlbnQvbGliL2lzLW9iamVjdC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9yZXF1ZXN0LWJhc2UuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvcmVzcG9uc2UtYmFzZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L25vZGVfbW9kdWxlcy9zdXBlcmFnZW50L2xpYi9zaG91bGQtcmV0cnkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9ub2RlX21vZHVsZXMvc3VwZXJhZ2VudC9saWIvdXRpbHMuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvQXBpQ2xpZW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL2FwaS9CdWlsZEFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvTG9hZEFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9hcGkvVHJhaW5BcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL1R1bmVBcGkuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvYXBpL1Zpc3VhbGl6ZUFwaS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9pbmRleC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9DbHVzdGVyUGFyYW1ldGVycy5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9DbHVzdGVyaW5nLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL0Nvc3RGdW5jdGlvbi5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9JbWFnZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9JbWFnZURhdGEuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvTGVhcm5pbmdSYXRlLmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1BhcmFtZXRlckxpc3QuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUG9pbnQyRC5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEuanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvUmFuZG9tRnVuY3Rpb24uanMiLCIuLi8uLi9zd2FnZ2VyX2NsaWVudC9zcmMvbW9kZWwvVHJhaW5QZXJmb3JtYW5jZS5qcyIsIi4uLy4uL3N3YWdnZXJfY2xpZW50L3NyYy9tb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50LmpzIiwiLi4vLi4vc3dhZ2dlcl9jbGllbnQvc3JjL21vZGVsL1RyYWluU3RhdHVzLmpzIiwidHJhaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyNkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2tCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25MQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyaUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIndXNlIHN0cmljdCdcblxuZXhwb3J0cy5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuZXhwb3J0cy50b0J5dGVBcnJheSA9IHRvQnl0ZUFycmF5XG5leHBvcnRzLmZyb21CeXRlQXJyYXkgPSBmcm9tQnl0ZUFycmF5XG5cbnZhciBsb29rdXAgPSBbXVxudmFyIHJldkxvb2t1cCA9IFtdXG52YXIgQXJyID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnID8gVWludDhBcnJheSA6IEFycmF5XG5cbnZhciBjb2RlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nXG5mb3IgKHZhciBpID0gMCwgbGVuID0gY29kZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICBsb29rdXBbaV0gPSBjb2RlW2ldXG4gIHJldkxvb2t1cFtjb2RlLmNoYXJDb2RlQXQoaSldID0gaVxufVxuXG5yZXZMb29rdXBbJy0nLmNoYXJDb2RlQXQoMCldID0gNjJcbnJldkxvb2t1cFsnXycuY2hhckNvZGVBdCgwKV0gPSA2M1xuXG5mdW5jdGlvbiBwbGFjZUhvbGRlcnNDb3VudCAoYjY0KSB7XG4gIHZhciBsZW4gPSBiNjQubGVuZ3RoXG4gIGlmIChsZW4gJSA0ID4gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG4gIH1cblxuICAvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuICAvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG4gIC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuICAvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcbiAgLy8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuICByZXR1cm4gYjY0W2xlbiAtIDJdID09PSAnPScgPyAyIDogYjY0W2xlbiAtIDFdID09PSAnPScgPyAxIDogMFxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChiNjQpIHtcbiAgLy8gYmFzZTY0IGlzIDQvMyArIHVwIHRvIHR3byBjaGFyYWN0ZXJzIG9mIHRoZSBvcmlnaW5hbCBkYXRhXG4gIHJldHVybiAoYjY0Lmxlbmd0aCAqIDMgLyA0KSAtIHBsYWNlSG9sZGVyc0NvdW50KGI2NClcbn1cblxuZnVuY3Rpb24gdG9CeXRlQXJyYXkgKGI2NCkge1xuICB2YXIgaSwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuICB2YXIgbGVuID0gYjY0Lmxlbmd0aFxuICBwbGFjZUhvbGRlcnMgPSBwbGFjZUhvbGRlcnNDb3VudChiNjQpXG5cbiAgYXJyID0gbmV3IEFycigobGVuICogMyAvIDQpIC0gcGxhY2VIb2xkZXJzKVxuXG4gIC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcbiAgbCA9IHBsYWNlSG9sZGVycyA+IDAgPyBsZW4gLSA0IDogbGVuXG5cbiAgdmFyIEwgPSAwXG5cbiAgZm9yIChpID0gMDsgaSA8IGw7IGkgKz0gNCkge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDE4KSB8IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDEpXSA8PCAxMikgfCAocmV2TG9va3VwW2I2NC5jaGFyQ29kZUF0KGkgKyAyKV0gPDwgNikgfCByZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSArIDMpXVxuICAgIGFycltMKytdID0gKHRtcCA+PiAxNikgJiAweEZGXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgaWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuICAgIHRtcCA9IChyZXZMb29rdXBbYjY0LmNoYXJDb2RlQXQoaSldIDw8IDIpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldID4+IDQpXG4gICAgYXJyW0wrK10gPSB0bXAgJiAweEZGXG4gIH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG4gICAgdG1wID0gKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpKV0gPDwgMTApIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMSldIDw8IDQpIHwgKHJldkxvb2t1cFtiNjQuY2hhckNvZGVBdChpICsgMildID4+IDIpXG4gICAgYXJyW0wrK10gPSAodG1wID4+IDgpICYgMHhGRlxuICAgIGFycltMKytdID0gdG1wICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIGFyclxufVxuXG5mdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuICByZXR1cm4gbG9va3VwW251bSA+PiAxOCAmIDB4M0ZdICsgbG9va3VwW251bSA+PiAxMiAmIDB4M0ZdICsgbG9va3VwW251bSA+PiA2ICYgMHgzRl0gKyBsb29rdXBbbnVtICYgMHgzRl1cbn1cblxuZnVuY3Rpb24gZW5jb2RlQ2h1bmsgKHVpbnQ4LCBzdGFydCwgZW5kKSB7XG4gIHZhciB0bXBcbiAgdmFyIG91dHB1dCA9IFtdXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSArPSAzKSB7XG4gICAgdG1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuICAgIG91dHB1dC5wdXNoKHRyaXBsZXRUb0Jhc2U2NCh0bXApKVxuICB9XG4gIHJldHVybiBvdXRwdXQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZnJvbUJ5dGVBcnJheSAodWludDgpIHtcbiAgdmFyIHRtcFxuICB2YXIgbGVuID0gdWludDgubGVuZ3RoXG4gIHZhciBleHRyYUJ5dGVzID0gbGVuICUgMyAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuICB2YXIgb3V0cHV0ID0gJydcbiAgdmFyIHBhcnRzID0gW11cbiAgdmFyIG1heENodW5rTGVuZ3RoID0gMTYzODMgLy8gbXVzdCBiZSBtdWx0aXBsZSBvZiAzXG5cbiAgLy8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuICBmb3IgKHZhciBpID0gMCwgbGVuMiA9IGxlbiAtIGV4dHJhQnl0ZXM7IGkgPCBsZW4yOyBpICs9IG1heENodW5rTGVuZ3RoKSB7XG4gICAgcGFydHMucHVzaChlbmNvZGVDaHVuayh1aW50OCwgaSwgKGkgKyBtYXhDaHVua0xlbmd0aCkgPiBsZW4yID8gbGVuMiA6IChpICsgbWF4Q2h1bmtMZW5ndGgpKSlcbiAgfVxuXG4gIC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcbiAgaWYgKGV4dHJhQnl0ZXMgPT09IDEpIHtcbiAgICB0bXAgPSB1aW50OFtsZW4gLSAxXVxuICAgIG91dHB1dCArPSBsb29rdXBbdG1wID4+IDJdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wIDw8IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gJz09J1xuICB9IGVsc2UgaWYgKGV4dHJhQnl0ZXMgPT09IDIpIHtcbiAgICB0bXAgPSAodWludDhbbGVuIC0gMl0gPDwgOCkgKyAodWludDhbbGVuIC0gMV0pXG4gICAgb3V0cHV0ICs9IGxvb2t1cFt0bXAgPj4gMTBdXG4gICAgb3V0cHV0ICs9IGxvb2t1cFsodG1wID4+IDQpICYgMHgzRl1cbiAgICBvdXRwdXQgKz0gbG9va3VwWyh0bXAgPDwgMikgJiAweDNGXVxuICAgIG91dHB1dCArPSAnPSdcbiAgfVxuXG4gIHBhcnRzLnB1c2gob3V0cHV0KVxuXG4gIHJldHVybiBwYXJ0cy5qb2luKCcnKVxufVxuIiwiIiwiLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG4ndXNlIHN0cmljdCdcblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gU2xvd0J1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5cbnZhciBLX01BWF9MRU5HVEggPSAweDdmZmZmZmZmXG5leHBvcnRzLmtNYXhMZW5ndGggPSBLX01BWF9MRU5HVEhcblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgUHJpbnQgd2FybmluZyBhbmQgcmVjb21tZW5kIHVzaW5nIGBidWZmZXJgIHY0Lnggd2hpY2ggaGFzIGFuIE9iamVjdFxuICogICAgICAgICAgICAgICBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogV2UgcmVwb3J0IHRoYXQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCB0eXBlZCBhcnJheXMgaWYgdGhlIGFyZSBub3Qgc3ViY2xhc3NhYmxlXG4gKiB1c2luZyBfX3Byb3RvX18uIEZpcmVmb3ggNC0yOSBsYWNrcyBzdXBwb3J0IGZvciBhZGRpbmcgbmV3IHByb3BlcnRpZXMgdG8gYFVpbnQ4QXJyYXlgXG4gKiAoU2VlOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzgpLiBJRSAxMCBsYWNrcyBzdXBwb3J0XG4gKiBmb3IgX19wcm90b19fIGFuZCBoYXMgYSBidWdneSB0eXBlZCBhcnJheSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgY29uc29sZS5lcnJvcihcbiAgICAnVGhpcyBicm93c2VyIGxhY2tzIHR5cGVkIGFycmF5IChVaW50OEFycmF5KSBzdXBwb3J0IHdoaWNoIGlzIHJlcXVpcmVkIGJ5ICcgK1xuICAgICdgYnVmZmVyYCB2NS54LiBVc2UgYGJ1ZmZlcmAgdjQueCBpZiB5b3UgcmVxdWlyZSBvbGQgYnJvd3NlciBzdXBwb3J0LidcbiAgKVxufVxuXG5mdW5jdGlvbiB0eXBlZEFycmF5U3VwcG9ydCAoKSB7XG4gIC8vIENhbiB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZD9cbiAgdHJ5IHtcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoMSlcbiAgICBhcnIuX19wcm90b19fID0ge19fcHJvdG9fXzogVWludDhBcnJheS5wcm90b3R5cGUsIGZvbzogZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfX1cbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MlxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlQnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKGxlbmd0aCA+IEtfTUFYX0xFTkdUSCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbnZhbGlkIHR5cGVkIGFycmF5IGxlbmd0aCcpXG4gIH1cbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGxlbmd0aClcbiAgYnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIGJ1ZlxufVxuXG4vKipcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgaGF2ZSB0aGVpclxuICogcHJvdG90eXBlIGNoYW5nZWQgdG8gYEJ1ZmZlci5wcm90b3R5cGVgLiBGdXJ0aGVybW9yZSwgYEJ1ZmZlcmAgaXMgYSBzdWJjbGFzcyBvZlxuICogYFVpbnQ4QXJyYXlgLCBzbyB0aGUgcmV0dXJuZWQgaW5zdGFuY2VzIHdpbGwgaGF2ZSBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgbWV0aG9kc1xuICogYW5kIHRoZSBgVWludDhBcnJheWAgbWV0aG9kcy4gU3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXRcbiAqIHJldHVybnMgYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogVGhlIGBVaW50OEFycmF5YCBwcm90b3R5cGUgcmVtYWlucyB1bm1vZGlmaWVkLlxuICovXG5cbmZ1bmN0aW9uIEJ1ZmZlciAoYXJnLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIGlmICh0eXBlb2YgZW5jb2RpbmdPck9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ0lmIGVuY29kaW5nIGlzIHNwZWNpZmllZCB0aGVuIHRoZSBmaXJzdCBhcmd1bWVudCBtdXN0IGJlIGEgc3RyaW5nJ1xuICAgICAgKVxuICAgIH1cbiAgICByZXR1cm4gYWxsb2NVbnNhZmUoYXJnKVxuICB9XG4gIHJldHVybiBmcm9tKGFyZywgZW5jb2RpbmdPck9mZnNldCwgbGVuZ3RoKVxufVxuXG4vLyBGaXggc3ViYXJyYXkoKSBpbiBFUzIwMTYuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC85N1xuaWYgKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5zcGVjaWVzICYmXG4gICAgQnVmZmVyW1N5bWJvbC5zcGVjaWVzXSA9PT0gQnVmZmVyKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShCdWZmZXIsIFN5bWJvbC5zcGVjaWVzLCB7XG4gICAgdmFsdWU6IG51bGwsXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmYWxzZVxuICB9KVxufVxuXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyIC8vIG5vdCB1c2VkIGJ5IHRoaXMgaW1wbGVtZW50YXRpb25cblxuZnVuY3Rpb24gZnJvbSAodmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widmFsdWVcIiBhcmd1bWVudCBtdXN0IG5vdCBiZSBhIG51bWJlcicpXG4gIH1cblxuICBpZiAoaXNBcnJheUJ1ZmZlcih2YWx1ZSkpIHtcbiAgICByZXR1cm4gZnJvbUFycmF5QnVmZmVyKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0KVxuICB9XG5cbiAgcmV0dXJuIGZyb21PYmplY3QodmFsdWUpXG59XG5cbi8qKlxuICogRnVuY3Rpb25hbGx5IGVxdWl2YWxlbnQgdG8gQnVmZmVyKGFyZywgZW5jb2RpbmcpIGJ1dCB0aHJvd3MgYSBUeXBlRXJyb3JcbiAqIGlmIHZhbHVlIGlzIGEgbnVtYmVyLlxuICogQnVmZmVyLmZyb20oc3RyWywgZW5jb2RpbmddKVxuICogQnVmZmVyLmZyb20oYXJyYXkpXG4gKiBCdWZmZXIuZnJvbShidWZmZXIpXG4gKiBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlclssIGJ5dGVPZmZzZXRbLCBsZW5ndGhdXSlcbiAqKi9cbkJ1ZmZlci5mcm9tID0gZnVuY3Rpb24gKHZhbHVlLCBlbmNvZGluZ09yT2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGZyb20odmFsdWUsIGVuY29kaW5nT3JPZmZzZXQsIGxlbmd0aClcbn1cblxuLy8gTm90ZTogQ2hhbmdlIHByb3RvdHlwZSAqYWZ0ZXIqIEJ1ZmZlci5mcm9tIGlzIGRlZmluZWQgdG8gd29ya2Fyb3VuZCBDaHJvbWUgYnVnOlxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvcHVsbC8xNDhcbkJ1ZmZlci5wcm90b3R5cGUuX19wcm90b19fID0gVWludDhBcnJheS5wcm90b3R5cGVcbkJ1ZmZlci5fX3Byb3RvX18gPSBVaW50OEFycmF5XG5cbmZ1bmN0aW9uIGFzc2VydFNpemUgKHNpemUpIHtcbiAgaWYgKHR5cGVvZiBzaXplICE9PSAnbnVtYmVyJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3QgYmUgYSBudW1iZXInKVxuICB9IGVsc2UgaWYgKHNpemUgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1wic2l6ZVwiIGFyZ3VtZW50IG11c3Qgbm90IGJlIG5lZ2F0aXZlJylcbiAgfVxufVxuXG5mdW5jdGlvbiBhbGxvYyAoc2l6ZSwgZmlsbCwgZW5jb2RpbmcpIHtcbiAgYXNzZXJ0U2l6ZShzaXplKVxuICBpZiAoc2l6ZSA8PSAwKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxuICB9XG4gIGlmIChmaWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAvLyBPbmx5IHBheSBhdHRlbnRpb24gdG8gZW5jb2RpbmcgaWYgaXQncyBhIHN0cmluZy4gVGhpc1xuICAgIC8vIHByZXZlbnRzIGFjY2lkZW50YWxseSBzZW5kaW5nIGluIGEgbnVtYmVyIHRoYXQgd291bGRcbiAgICAvLyBiZSBpbnRlcnByZXR0ZWQgYXMgYSBzdGFydCBvZmZzZXQuXG4gICAgcmV0dXJuIHR5cGVvZiBlbmNvZGluZyA9PT0gJ3N0cmluZydcbiAgICAgID8gY3JlYXRlQnVmZmVyKHNpemUpLmZpbGwoZmlsbCwgZW5jb2RpbmcpXG4gICAgICA6IGNyZWF0ZUJ1ZmZlcihzaXplKS5maWxsKGZpbGwpXG4gIH1cbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplKVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqIGFsbG9jKHNpemVbLCBmaWxsWywgZW5jb2RpbmddXSlcbiAqKi9cbkJ1ZmZlci5hbGxvYyA9IGZ1bmN0aW9uIChzaXplLCBmaWxsLCBlbmNvZGluZykge1xuICByZXR1cm4gYWxsb2Moc2l6ZSwgZmlsbCwgZW5jb2RpbmcpXG59XG5cbmZ1bmN0aW9uIGFsbG9jVW5zYWZlIChzaXplKSB7XG4gIGFzc2VydFNpemUoc2l6ZSlcbiAgcmV0dXJuIGNyZWF0ZUJ1ZmZlcihzaXplIDwgMCA/IDAgOiBjaGVja2VkKHNpemUpIHwgMClcbn1cblxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIEJ1ZmZlcihudW0pLCBieSBkZWZhdWx0IGNyZWF0ZXMgYSBub24temVyby1maWxsZWQgQnVmZmVyIGluc3RhbmNlLlxuICogKi9cbkJ1ZmZlci5hbGxvY1Vuc2FmZSA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuLyoqXG4gKiBFcXVpdmFsZW50IHRvIFNsb3dCdWZmZXIobnVtKSwgYnkgZGVmYXVsdCBjcmVhdGVzIGEgbm9uLXplcm8tZmlsbGVkIEJ1ZmZlciBpbnN0YW5jZS5cbiAqL1xuQnVmZmVyLmFsbG9jVW5zYWZlU2xvdyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gIHJldHVybiBhbGxvY1Vuc2FmZShzaXplKVxufVxuXG5mdW5jdGlvbiBmcm9tU3RyaW5nIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgIT09ICdzdHJpbmcnIHx8IGVuY29kaW5nID09PSAnJykge1xuICAgIGVuY29kaW5nID0gJ3V0ZjgnXG4gIH1cblxuICBpZiAoIUJ1ZmZlci5pc0VuY29kaW5nKGVuY29kaW5nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiZW5jb2RpbmdcIiBtdXN0IGJlIGEgdmFsaWQgc3RyaW5nIGVuY29kaW5nJylcbiAgfVxuXG4gIHZhciBsZW5ndGggPSBieXRlTGVuZ3RoKHN0cmluZywgZW5jb2RpbmcpIHwgMFxuICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbmd0aClcblxuICB2YXIgYWN0dWFsID0gYnVmLndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG5cbiAgaWYgKGFjdHVhbCAhPT0gbGVuZ3RoKSB7XG4gICAgLy8gV3JpdGluZyBhIGhleCBzdHJpbmcsIGZvciBleGFtcGxlLCB0aGF0IGNvbnRhaW5zIGludmFsaWQgY2hhcmFjdGVycyB3aWxsXG4gICAgLy8gY2F1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgZmlyc3QgaW52YWxpZCBjaGFyYWN0ZXIgdG8gYmUgaWdub3JlZC4gKGUuZy5cbiAgICAvLyAnYWJ4eGNkJyB3aWxsIGJlIHRyZWF0ZWQgYXMgJ2FiJylcbiAgICBidWYgPSBidWYuc2xpY2UoMCwgYWN0dWFsKVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBmcm9tQXJyYXlMaWtlIChhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGFycmF5Lmxlbmd0aCkgfCAwXG4gIHZhciBidWYgPSBjcmVhdGVCdWZmZXIobGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgYnVmW2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21BcnJheUJ1ZmZlciAoYXJyYXksIGJ5dGVPZmZzZXQsIGxlbmd0aCkge1xuICBpZiAoYnl0ZU9mZnNldCA8IDAgfHwgYXJyYXkuYnl0ZUxlbmd0aCA8IGJ5dGVPZmZzZXQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignXFwnb2Zmc2V0XFwnIGlzIG91dCBvZiBib3VuZHMnKVxuICB9XG5cbiAgaWYgKGFycmF5LmJ5dGVMZW5ndGggPCBieXRlT2Zmc2V0ICsgKGxlbmd0aCB8fCAwKSkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdcXCdsZW5ndGhcXCcgaXMgb3V0IG9mIGJvdW5kcycpXG4gIH1cblxuICB2YXIgYnVmXG4gIGlmIChieXRlT2Zmc2V0ID09PSB1bmRlZmluZWQgJiYgbGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBidWYgPSBuZXcgVWludDhBcnJheShhcnJheSlcbiAgfSBlbHNlIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCkge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0KVxuICB9IGVsc2Uge1xuICAgIGJ1ZiA9IG5ldyBVaW50OEFycmF5KGFycmF5LCBieXRlT2Zmc2V0LCBsZW5ndGgpXG4gIH1cblxuICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZVxuICBidWYuX19wcm90b19fID0gQnVmZmVyLnByb3RvdHlwZVxuICByZXR1cm4gYnVmXG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKG9iaikge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iaikpIHtcbiAgICB2YXIgbGVuID0gY2hlY2tlZChvYmoubGVuZ3RoKSB8IDBcbiAgICB2YXIgYnVmID0gY3JlYXRlQnVmZmVyKGxlbilcblxuICAgIGlmIChidWYubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gYnVmXG4gICAgfVxuXG4gICAgb2JqLmNvcHkoYnVmLCAwLCAwLCBsZW4pXG4gICAgcmV0dXJuIGJ1ZlxuICB9XG5cbiAgaWYgKG9iaikge1xuICAgIGlmIChpc0FycmF5QnVmZmVyVmlldyhvYmopIHx8ICdsZW5ndGgnIGluIG9iaikge1xuICAgICAgaWYgKHR5cGVvZiBvYmoubGVuZ3RoICE9PSAnbnVtYmVyJyB8fCBudW1iZXJJc05hTihvYmoubGVuZ3RoKSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlQnVmZmVyKDApXG4gICAgICB9XG4gICAgICByZXR1cm4gZnJvbUFycmF5TGlrZShvYmopXG4gICAgfVxuXG4gICAgaWYgKG9iai50eXBlID09PSAnQnVmZmVyJyAmJiBBcnJheS5pc0FycmF5KG9iai5kYXRhKSkge1xuICAgICAgcmV0dXJuIGZyb21BcnJheUxpa2Uob2JqLmRhdGEpXG4gICAgfVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcignRmlyc3QgYXJndW1lbnQgbXVzdCBiZSBhIHN0cmluZywgQnVmZmVyLCBBcnJheUJ1ZmZlciwgQXJyYXksIG9yIGFycmF5LWxpa2Ugb2JqZWN0LicpXG59XG5cbmZ1bmN0aW9uIGNoZWNrZWQgKGxlbmd0aCkge1xuICAvLyBOb3RlOiBjYW5ub3QgdXNlIGBsZW5ndGggPCBLX01BWF9MRU5HVEhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0gS19NQVhfTEVOR1RIKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIEtfTUFYX0xFTkdUSC50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChsZW5ndGgpIHtcbiAgaWYgKCtsZW5ndGggIT0gbGVuZ3RoKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgZXFlcWVxXG4gICAgbGVuZ3RoID0gMFxuICB9XG4gIHJldHVybiBCdWZmZXIuYWxsb2MoK2xlbmd0aClcbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gaXNCdWZmZXIgKGIpIHtcbiAgcmV0dXJuIGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlciA9PT0gdHJ1ZVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV1cbiAgICAgIHkgPSBiW2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiBpc0VuY29kaW5nIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdsYXRpbjEnOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIGNvbmNhdCAobGlzdCwgbGVuZ3RoKSB7XG4gIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdFwiIGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycycpXG4gIH1cblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gQnVmZmVyLmFsbG9jKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyArK2kpIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWZmZXIgPSBCdWZmZXIuYWxsb2NVbnNhZmUobGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7ICsraSkge1xuICAgIHZhciBidWYgPSBsaXN0W2ldXG4gICAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0XCIgYXJndW1lbnQgbXVzdCBiZSBhbiBBcnJheSBvZiBCdWZmZXJzJylcbiAgICB9XG4gICAgYnVmLmNvcHkoYnVmZmVyLCBwb3MpXG4gICAgcG9zICs9IGJ1Zi5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmZmVyXG59XG5cbmZ1bmN0aW9uIGJ5dGVMZW5ndGggKHN0cmluZywgZW5jb2RpbmcpIHtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdHJpbmcpKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sZW5ndGhcbiAgfVxuICBpZiAoaXNBcnJheUJ1ZmZlclZpZXcoc3RyaW5nKSB8fCBpc0FycmF5QnVmZmVyKHN0cmluZykpIHtcbiAgICByZXR1cm4gc3RyaW5nLmJ5dGVMZW5ndGhcbiAgfVxuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICBzdHJpbmcgPSAnJyArIHN0cmluZ1xuICB9XG5cbiAgdmFyIGxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBVc2UgYSBmb3IgbG9vcCB0byBhdm9pZCByZWN1cnNpb25cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGVuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGhcbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiBsZW4gKiAyXG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gbGVuID4+PiAxXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSByZXR1cm4gdXRmOFRvQnl0ZXMoc3RyaW5nKS5sZW5ndGggLy8gYXNzdW1lIHV0ZjhcbiAgICAgICAgZW5jb2RpbmcgPSAoJycgKyBlbmNvZGluZykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aFxuXG5mdW5jdGlvbiBzbG93VG9TdHJpbmcgKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG5cbiAgLy8gTm8gbmVlZCB0byB2ZXJpZnkgdGhhdCBcInRoaXMubGVuZ3RoIDw9IE1BWF9VSU5UMzJcIiBzaW5jZSBpdCdzIGEgcmVhZC1vbmx5XG4gIC8vIHByb3BlcnR5IG9mIGEgdHlwZWQgYXJyYXkuXG5cbiAgLy8gVGhpcyBiZWhhdmVzIG5laXRoZXIgbGlrZSBTdHJpbmcgbm9yIFVpbnQ4QXJyYXkgaW4gdGhhdCB3ZSBzZXQgc3RhcnQvZW5kXG4gIC8vIHRvIHRoZWlyIHVwcGVyL2xvd2VyIGJvdW5kcyBpZiB0aGUgdmFsdWUgcGFzc2VkIGlzIG91dCBvZiByYW5nZS5cbiAgLy8gdW5kZWZpbmVkIGlzIGhhbmRsZWQgc3BlY2lhbGx5IGFzIHBlciBFQ01BLTI2MiA2dGggRWRpdGlvbixcbiAgLy8gU2VjdGlvbiAxMy4zLjMuNyBSdW50aW1lIFNlbWFudGljczogS2V5ZWRCaW5kaW5nSW5pdGlhbGl6YXRpb24uXG4gIGlmIChzdGFydCA9PT0gdW5kZWZpbmVkIHx8IHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIC8vIFJldHVybiBlYXJseSBpZiBzdGFydCA+IHRoaXMubGVuZ3RoLiBEb25lIGhlcmUgdG8gcHJldmVudCBwb3RlbnRpYWwgdWludDMyXG4gIC8vIGNvZXJjaW9uIGZhaWwgYmVsb3cuXG4gIGlmIChzdGFydCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICBpZiAoZW5kID09PSB1bmRlZmluZWQgfHwgZW5kID4gdGhpcy5sZW5ndGgpIHtcbiAgICBlbmQgPSB0aGlzLmxlbmd0aFxuICB9XG5cbiAgaWYgKGVuZCA8PSAwKSB7XG4gICAgcmV0dXJuICcnXG4gIH1cblxuICAvLyBGb3JjZSBjb2Vyc2lvbiB0byB1aW50MzIuIFRoaXMgd2lsbCBhbHNvIGNvZXJjZSBmYWxzZXkvTmFOIHZhbHVlcyB0byAwLlxuICBlbmQgPj4+PSAwXG4gIHN0YXJ0ID4+Pj0gMFxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gJydcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdsYXRpbjEnOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgICAgcmV0dXJuIGxhdGluMVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1Y3MyJzpcbiAgICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgICByZXR1cm4gdXRmMTZsZVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmIChsb3dlcmVkQ2FzZSkgdGhyb3cgbmV3IFR5cGVFcnJvcignVW5rbm93biBlbmNvZGluZzogJyArIGVuY29kaW5nKVxuICAgICAgICBlbmNvZGluZyA9IChlbmNvZGluZyArICcnKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG4vLyBUaGlzIHByb3BlcnR5IGlzIHVzZWQgYnkgYEJ1ZmZlci5pc0J1ZmZlcmAgKGFuZCB0aGUgYGlzLWJ1ZmZlcmAgbnBtIHBhY2thZ2UpXG4vLyB0byBkZXRlY3QgYSBCdWZmZXIgaW5zdGFuY2UuIEl0J3Mgbm90IHBvc3NpYmxlIHRvIHVzZSBgaW5zdGFuY2VvZiBCdWZmZXJgXG4vLyByZWxpYWJseSBpbiBhIGJyb3dzZXJpZnkgY29udGV4dCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIGRpZmZlcmVudFxuLy8gY29waWVzIG9mIHRoZSAnYnVmZmVyJyBwYWNrYWdlIGluIHVzZS4gVGhpcyBtZXRob2Qgd29ya3MgZXZlbiBmb3IgQnVmZmVyXG4vLyBpbnN0YW5jZXMgdGhhdCB3ZXJlIGNyZWF0ZWQgZnJvbSBhbm90aGVyIGNvcHkgb2YgdGhlIGBidWZmZXJgIHBhY2thZ2UuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2lzc3Vlcy8xNTRcbkJ1ZmZlci5wcm90b3R5cGUuX2lzQnVmZmVyID0gdHJ1ZVxuXG5mdW5jdGlvbiBzd2FwIChiLCBuLCBtKSB7XG4gIHZhciBpID0gYltuXVxuICBiW25dID0gYlttXVxuICBiW21dID0gaVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnN3YXAxNiA9IGZ1bmN0aW9uIHN3YXAxNiAoKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBpZiAobGVuICUgMiAhPT0gMCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdCdWZmZXIgc2l6ZSBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgMTYtYml0cycpXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIHN3YXAodGhpcywgaSwgaSArIDEpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zd2FwMzIgPSBmdW5jdGlvbiBzd2FwMzIgKCkge1xuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbiAlIDQgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignQnVmZmVyIHNpemUgbXVzdCBiZSBhIG11bHRpcGxlIG9mIDMyLWJpdHMnKVxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDQpIHtcbiAgICBzd2FwKHRoaXMsIGksIGkgKyAzKVxuICAgIHN3YXAodGhpcywgaSArIDEsIGkgKyAyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuc3dhcDY0ID0gZnVuY3Rpb24gc3dhcDY0ICgpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGlmIChsZW4gJSA4ICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0J1ZmZlciBzaXplIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA2NC1iaXRzJylcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSA4KSB7XG4gICAgc3dhcCh0aGlzLCBpLCBpICsgNylcbiAgICBzd2FwKHRoaXMsIGkgKyAxLCBpICsgNilcbiAgICBzd2FwKHRoaXMsIGkgKyAyLCBpICsgNSlcbiAgICBzd2FwKHRoaXMsIGkgKyAzLCBpICsgNClcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICB2YXIgbGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgaWYgKGxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gdXRmOFNsaWNlKHRoaXMsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHNsb3dUb1N0cmluZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gZXF1YWxzIChiKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBtdXN0IGJlIGEgQnVmZmVyJylcbiAgaWYgKHRoaXMgPT09IGIpIHJldHVybiB0cnVlXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIHZhciBtYXggPSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBzdHIgPSB0aGlzLnRvU3RyaW5nKCdoZXgnLCAwLCBtYXgpLm1hdGNoKC8uezJ9L2cpLmpvaW4oJyAnKVxuICAgIGlmICh0aGlzLmxlbmd0aCA+IG1heCkgc3RyICs9ICcgLi4uICdcbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIHN0ciArICc+J1xufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiBjb21wYXJlICh0YXJnZXQsIHN0YXJ0LCBlbmQsIHRoaXNTdGFydCwgdGhpc0VuZCkge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcih0YXJnZXQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIH1cblxuICBpZiAoc3RhcnQgPT09IHVuZGVmaW5lZCkge1xuICAgIHN0YXJ0ID0gMFxuICB9XG4gIGlmIChlbmQgPT09IHVuZGVmaW5lZCkge1xuICAgIGVuZCA9IHRhcmdldCA/IHRhcmdldC5sZW5ndGggOiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpc1N0YXJ0ID0gMFxuICB9XG4gIGlmICh0aGlzRW5kID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzRW5kID0gdGhpcy5sZW5ndGhcbiAgfVxuXG4gIGlmIChzdGFydCA8IDAgfHwgZW5kID4gdGFyZ2V0Lmxlbmd0aCB8fCB0aGlzU3RhcnQgPCAwIHx8IHRoaXNFbmQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdvdXQgb2YgcmFuZ2UgaW5kZXgnKVxuICB9XG5cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kICYmIHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAwXG4gIH1cbiAgaWYgKHRoaXNTdGFydCA+PSB0aGlzRW5kKSB7XG4gICAgcmV0dXJuIC0xXG4gIH1cbiAgaWYgKHN0YXJ0ID49IGVuZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICBzdGFydCA+Pj49IDBcbiAgZW5kID4+Pj0gMFxuICB0aGlzU3RhcnQgPj4+PSAwXG4gIHRoaXNFbmQgPj4+PSAwXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCkgcmV0dXJuIDBcblxuICB2YXIgeCA9IHRoaXNFbmQgLSB0aGlzU3RhcnRcbiAgdmFyIHkgPSBlbmQgLSBzdGFydFxuICB2YXIgbGVuID0gTWF0aC5taW4oeCwgeSlcblxuICB2YXIgdGhpc0NvcHkgPSB0aGlzLnNsaWNlKHRoaXNTdGFydCwgdGhpc0VuZClcbiAgdmFyIHRhcmdldENvcHkgPSB0YXJnZXQuc2xpY2Uoc3RhcnQsIGVuZClcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKHRoaXNDb3B5W2ldICE9PSB0YXJnZXRDb3B5W2ldKSB7XG4gICAgICB4ID0gdGhpc0NvcHlbaV1cbiAgICAgIHkgPSB0YXJnZXRDb3B5W2ldXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkgcmV0dXJuIC0xXG4gIGlmICh5IDwgeCkgcmV0dXJuIDFcbiAgcmV0dXJuIDBcbn1cblxuLy8gRmluZHMgZWl0aGVyIHRoZSBmaXJzdCBpbmRleCBvZiBgdmFsYCBpbiBgYnVmZmVyYCBhdCBvZmZzZXQgPj0gYGJ5dGVPZmZzZXRgLFxuLy8gT1IgdGhlIGxhc3QgaW5kZXggb2YgYHZhbGAgaW4gYGJ1ZmZlcmAgYXQgb2Zmc2V0IDw9IGBieXRlT2Zmc2V0YC5cbi8vXG4vLyBBcmd1bWVudHM6XG4vLyAtIGJ1ZmZlciAtIGEgQnVmZmVyIHRvIHNlYXJjaFxuLy8gLSB2YWwgLSBhIHN0cmluZywgQnVmZmVyLCBvciBudW1iZXJcbi8vIC0gYnl0ZU9mZnNldCAtIGFuIGluZGV4IGludG8gYGJ1ZmZlcmA7IHdpbGwgYmUgY2xhbXBlZCB0byBhbiBpbnQzMlxuLy8gLSBlbmNvZGluZyAtIGFuIG9wdGlvbmFsIGVuY29kaW5nLCByZWxldmFudCBpcyB2YWwgaXMgYSBzdHJpbmdcbi8vIC0gZGlyIC0gdHJ1ZSBmb3IgaW5kZXhPZiwgZmFsc2UgZm9yIGxhc3RJbmRleE9mXG5mdW5jdGlvbiBiaWRpcmVjdGlvbmFsSW5kZXhPZiAoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nLCBkaXIpIHtcbiAgLy8gRW1wdHkgYnVmZmVyIG1lYW5zIG5vIG1hdGNoXG4gIGlmIChidWZmZXIubGVuZ3RoID09PSAwKSByZXR1cm4gLTFcblxuICAvLyBOb3JtYWxpemUgYnl0ZU9mZnNldFxuICBpZiAodHlwZW9mIGJ5dGVPZmZzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgZW5jb2RpbmcgPSBieXRlT2Zmc2V0XG4gICAgYnl0ZU9mZnNldCA9IDBcbiAgfSBlbHNlIGlmIChieXRlT2Zmc2V0ID4gMHg3ZmZmZmZmZikge1xuICAgIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIH0gZWxzZSBpZiAoYnl0ZU9mZnNldCA8IC0weDgwMDAwMDAwKSB7XG4gICAgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIH1cbiAgYnl0ZU9mZnNldCA9ICtieXRlT2Zmc2V0ICAvLyBDb2VyY2UgdG8gTnVtYmVyLlxuICBpZiAobnVtYmVySXNOYU4oYnl0ZU9mZnNldCkpIHtcbiAgICAvLyBieXRlT2Zmc2V0OiBpdCBpdCdzIHVuZGVmaW5lZCwgbnVsbCwgTmFOLCBcImZvb1wiLCBldGMsIHNlYXJjaCB3aG9sZSBidWZmZXJcbiAgICBieXRlT2Zmc2V0ID0gZGlyID8gMCA6IChidWZmZXIubGVuZ3RoIC0gMSlcbiAgfVxuXG4gIC8vIE5vcm1hbGl6ZSBieXRlT2Zmc2V0OiBuZWdhdGl2ZSBvZmZzZXRzIHN0YXJ0IGZyb20gdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIGlmIChieXRlT2Zmc2V0IDwgMCkgYnl0ZU9mZnNldCA9IGJ1ZmZlci5sZW5ndGggKyBieXRlT2Zmc2V0XG4gIGlmIChieXRlT2Zmc2V0ID49IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICBpZiAoZGlyKSByZXR1cm4gLTFcbiAgICBlbHNlIGJ5dGVPZmZzZXQgPSBidWZmZXIubGVuZ3RoIC0gMVxuICB9IGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAwKSB7XG4gICAgaWYgKGRpcikgYnl0ZU9mZnNldCA9IDBcbiAgICBlbHNlIHJldHVybiAtMVxuICB9XG5cbiAgLy8gTm9ybWFsaXplIHZhbFxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWwgPSBCdWZmZXIuZnJvbSh2YWwsIGVuY29kaW5nKVxuICB9XG5cbiAgLy8gRmluYWxseSwgc2VhcmNoIGVpdGhlciBpbmRleE9mIChpZiBkaXIgaXMgdHJ1ZSkgb3IgbGFzdEluZGV4T2ZcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcih2YWwpKSB7XG4gICAgLy8gU3BlY2lhbCBjYXNlOiBsb29raW5nIGZvciBlbXB0eSBzdHJpbmcvYnVmZmVyIGFsd2F5cyBmYWlsc1xuICAgIGlmICh2YWwubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZihidWZmZXIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcilcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIHZhbCA9IHZhbCAmIDB4RkYgLy8gU2VhcmNoIGZvciBhIGJ5dGUgdmFsdWUgWzAtMjU1XVxuICAgIGlmICh0eXBlb2YgVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKGRpcikge1xuICAgICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKGJ1ZmZlciwgdmFsLCBieXRlT2Zmc2V0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkucHJvdG90eXBlLmxhc3RJbmRleE9mLmNhbGwoYnVmZmVyLCB2YWwsIGJ5dGVPZmZzZXQpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhcnJheUluZGV4T2YoYnVmZmVyLCBbIHZhbCBdLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZGlyKVxuICB9XG5cbiAgdGhyb3cgbmV3IFR5cGVFcnJvcigndmFsIG11c3QgYmUgc3RyaW5nLCBudW1iZXIgb3IgQnVmZmVyJylcbn1cblxuZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIGRpcikge1xuICB2YXIgaW5kZXhTaXplID0gMVxuICB2YXIgYXJyTGVuZ3RoID0gYXJyLmxlbmd0aFxuICB2YXIgdmFsTGVuZ3RoID0gdmFsLmxlbmd0aFxuXG4gIGlmIChlbmNvZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICBpZiAoZW5jb2RpbmcgPT09ICd1Y3MyJyB8fCBlbmNvZGluZyA9PT0gJ3Vjcy0yJyB8fFxuICAgICAgICBlbmNvZGluZyA9PT0gJ3V0ZjE2bGUnIHx8IGVuY29kaW5nID09PSAndXRmLTE2bGUnKSB7XG4gICAgICBpZiAoYXJyLmxlbmd0aCA8IDIgfHwgdmFsLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgcmV0dXJuIC0xXG4gICAgICB9XG4gICAgICBpbmRleFNpemUgPSAyXG4gICAgICBhcnJMZW5ndGggLz0gMlxuICAgICAgdmFsTGVuZ3RoIC89IDJcbiAgICAgIGJ5dGVPZmZzZXQgLz0gMlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWQgKGJ1ZiwgaSkge1xuICAgIGlmIChpbmRleFNpemUgPT09IDEpIHtcbiAgICAgIHJldHVybiBidWZbaV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGJ1Zi5yZWFkVUludDE2QkUoaSAqIGluZGV4U2l6ZSlcbiAgICB9XG4gIH1cblxuICB2YXIgaVxuICBpZiAoZGlyKSB7XG4gICAgdmFyIGZvdW5kSW5kZXggPSAtMVxuICAgIGZvciAoaSA9IGJ5dGVPZmZzZXQ7IGkgPCBhcnJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHJlYWQoYXJyLCBpKSA9PT0gcmVhZCh2YWwsIGZvdW5kSW5kZXggPT09IC0xID8gMCA6IGkgLSBmb3VuZEluZGV4KSkge1xuICAgICAgICBpZiAoZm91bmRJbmRleCA9PT0gLTEpIGZvdW5kSW5kZXggPSBpXG4gICAgICAgIGlmIChpIC0gZm91bmRJbmRleCArIDEgPT09IHZhbExlbmd0aCkgcmV0dXJuIGZvdW5kSW5kZXggKiBpbmRleFNpemVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ICE9PSAtMSkgaSAtPSBpIC0gZm91bmRJbmRleFxuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGJ5dGVPZmZzZXQgKyB2YWxMZW5ndGggPiBhcnJMZW5ndGgpIGJ5dGVPZmZzZXQgPSBhcnJMZW5ndGggLSB2YWxMZW5ndGhcbiAgICBmb3IgKGkgPSBieXRlT2Zmc2V0OyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZvdW5kID0gdHJ1ZVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCB2YWxMZW5ndGg7IGorKykge1xuICAgICAgICBpZiAocmVhZChhcnIsIGkgKyBqKSAhPT0gcmVhZCh2YWwsIGopKSB7XG4gICAgICAgICAgZm91bmQgPSBmYWxzZVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gLTFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uIGluY2x1ZGVzICh2YWwsIGJ5dGVPZmZzZXQsIGVuY29kaW5nKSB7XG4gIHJldHVybiB0aGlzLmluZGV4T2YodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykgIT09IC0xXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGJpZGlyZWN0aW9uYWxJbmRleE9mKHRoaXMsIHZhbCwgYnl0ZU9mZnNldCwgZW5jb2RpbmcsIHRydWUpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUubGFzdEluZGV4T2YgPSBmdW5jdGlvbiBsYXN0SW5kZXhPZiAodmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZykge1xuICByZXR1cm4gYmlkaXJlY3Rpb25hbEluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0LCBlbmNvZGluZywgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGhleFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgb2Zmc2V0ID0gTnVtYmVyKG9mZnNldCkgfHwgMFxuICB2YXIgcmVtYWluaW5nID0gYnVmLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG5cbiAgLy8gbXVzdCBiZSBhbiBldmVuIG51bWJlciBvZiBkaWdpdHNcbiAgdmFyIHN0ckxlbiA9IHN0cmluZy5sZW5ndGhcbiAgaWYgKHN0ckxlbiAlIDIgIT09IDApIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgIHZhciBwYXJzZWQgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgaWYgKG51bWJlcklzTmFOKHBhcnNlZCkpIHJldHVybiBpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBsYXRpbjFXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgICBpZiAoaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgbGVuZ3RoID0gbGVuZ3RoID4+PiAwXG4gICAgICBpZiAoZW5jb2RpbmcgPT09IHVuZGVmaW5lZCkgZW5jb2RpbmcgPSAndXRmOCdcbiAgICB9IGVsc2Uge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnQnVmZmVyLndyaXRlKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldFssIGxlbmd0aF0pIGlzIG5vIGxvbmdlciBzdXBwb3J0ZWQnXG4gICAgKVxuICB9XG5cbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmIChsZW5ndGggPT09IHVuZGVmaW5lZCB8fCBsZW5ndGggPiByZW1haW5pbmcpIGxlbmd0aCA9IHJlbWFpbmluZ1xuXG4gIGlmICgoc3RyaW5nLmxlbmd0aCA+IDAgJiYgKGxlbmd0aCA8IDAgfHwgb2Zmc2V0IDwgMCkpIHx8IG9mZnNldCA+IHRoaXMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gd3JpdGUgb3V0c2lkZSBidWZmZXIgYm91bmRzJylcbiAgfVxuXG4gIGlmICghZW5jb2RpbmcpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgdmFyIGxvd2VyZWRDYXNlID0gZmFsc2VcbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ2xhdGluMSc6XG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gbGF0aW4xV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7ICsraSkge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBsYXRpbjFTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyArK2kpIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgKGJ5dGVzW2kgKyAxXSAqIDI1NikpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gc2xpY2UgKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlblxuICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gMFxuICB9IGVsc2UgaWYgKHN0YXJ0ID4gbGVuKSB7XG4gICAgc3RhcnQgPSBsZW5cbiAgfVxuXG4gIGlmIChlbmQgPCAwKSB7XG4gICAgZW5kICs9IGxlblxuICAgIGlmIChlbmQgPCAwKSBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgdmFyIG5ld0J1ZiA9IHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZClcbiAgLy8gUmV0dXJuIGFuIGF1Z21lbnRlZCBgVWludDhBcnJheWAgaW5zdGFuY2VcbiAgbmV3QnVmLl9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgcmV0dXJuIG5ld0J1ZlxufVxuXG4vKlxuICogTmVlZCB0byBtYWtlIHN1cmUgdGhhdCBidWZmZXIgaXNuJ3QgdHJ5aW5nIHRvIHdyaXRlIG91dCBvZiBib3VuZHMuXG4gKi9cbmZ1bmN0aW9uIGNoZWNrT2Zmc2V0IChvZmZzZXQsIGV4dCwgbGVuZ3RoKSB7XG4gIGlmICgob2Zmc2V0ICUgMSkgIT09IDAgfHwgb2Zmc2V0IDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ29mZnNldCBpcyBub3QgdWludCcpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBsZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdUcnlpbmcgdG8gYWNjZXNzIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludExFID0gZnVuY3Rpb24gcmVhZFVJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXRdXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIGldICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnRCRSA9IGZ1bmN0aW9uIHJlYWRVSW50QkUgKG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gdGhpc1tvZmZzZXRdIHwgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiByZWFkVUludDE2QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKCh0aGlzW29mZnNldF0pIHxcbiAgICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSkgK1xuICAgICAgKHRoaXNbb2Zmc2V0ICsgM10gKiAweDEwMDAwMDApXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkJFID0gZnVuY3Rpb24gcmVhZFVJbnQzMkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdICogMHgxMDAwMDAwKSArXG4gICAgKCh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgIHRoaXNbb2Zmc2V0ICsgM10pXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludExFID0gZnVuY3Rpb24gcmVhZEludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBieXRlTGVuZ3RoID0gYnl0ZUxlbmd0aCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCBieXRlTGVuZ3RoLCB0aGlzLmxlbmd0aClcblxuICB2YXIgaSA9IGJ5dGVMZW5ndGhcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1pXVxuICB3aGlsZSAoaSA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWldICogbXVsXG4gIH1cbiAgbXVsICo9IDB4ODBcblxuICBpZiAodmFsID49IG11bCkgdmFsIC09IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKVxuXG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIHJlYWRJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDEsIHRoaXMubGVuZ3RoKVxuICBpZiAoISh0aGlzW29mZnNldF0gJiAweDgwKSkgcmV0dXJuICh0aGlzW29mZnNldF0pXG4gIHJldHVybiAoKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gcmVhZEludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgMV0gfCAodGhpc1tvZmZzZXRdIDw8IDgpXG4gIHJldHVybiAodmFsICYgMHg4MDAwKSA/IHZhbCB8IDB4RkZGRjAwMDAgOiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRJbnQzMkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAodGhpc1tvZmZzZXRdKSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgM10gPDwgMjQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiByZWFkSW50MzJCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgNCwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiBpZWVlNzU0LnJlYWQodGhpcywgb2Zmc2V0LCB0cnVlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIHJlYWRGbG9hdEJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCA1MiwgOClcbn1cblxuZnVuY3Rpb24gY2hlY2tJbnQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgZXh0LCBtYXgsIG1pbikge1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihidWYpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJ1ZmZlclwiIGFyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXIgaW5zdGFuY2UnKVxuICBpZiAodmFsdWUgPiBtYXggfHwgdmFsdWUgPCBtaW4pIHRocm93IG5ldyBSYW5nZUVycm9yKCdcInZhbHVlXCIgYXJndW1lbnQgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBtYXhCeXRlcyA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoKSAtIDFcbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBtYXhCeXRlcywgMClcbiAgfVxuXG4gIHZhciBtdWwgPSAxXG4gIHZhciBpID0gMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKHZhbHVlIC8gbXVsKSAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnRCRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbWF4Qnl0ZXMgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCkgLSAxXG4gICAgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbWF4Qnl0ZXMsIDApXG4gIH1cblxuICB2YXIgaSA9IGJ5dGVMZW5ndGggLSAxXG4gIHZhciBtdWwgPSAxXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICh2YWx1ZSAvIG11bCkgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiB3cml0ZVVJbnQ4ICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHhmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MTZCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVVSW50MzJCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDE2KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludExFID0gZnVuY3Rpb24gd3JpdGVJbnRMRSAodmFsdWUsIG9mZnNldCwgYnl0ZUxlbmd0aCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCAoOCAqIGJ5dGVMZW5ndGgpIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIGlmICh2YWx1ZSA8IDAgJiYgc3ViID09PSAwICYmIHRoaXNbb2Zmc2V0ICsgaSAtIDFdICE9PSAwKSB7XG4gICAgICBzdWIgPSAxXG4gICAgfVxuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAoKHZhbHVlIC8gbXVsKSA+PiAwKSAtIHN1YiAmIDB4RkZcbiAgfVxuXG4gIHJldHVybiBvZmZzZXQgKyBieXRlTGVuZ3RoXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlSW50QkUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgdmFyIGxpbWl0ID0gTWF0aC5wb3coMiwgKDggKiBieXRlTGVuZ3RoKSAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IDBcbiAgdGhpc1tvZmZzZXQgKyBpXSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoLS1pID49IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICBpZiAodmFsdWUgPCAwICYmIHN1YiA9PT0gMCAmJiB0aGlzW29mZnNldCArIGkgKyAxXSAhPT0gMCkge1xuICAgICAgc3ViID0gMVxuICAgIH1cbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uIHdyaXRlSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDEsIDB4N2YsIC0weDgwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmYgKyB2YWx1ZSArIDFcbiAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiB3cml0ZUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAyLCAweDdmZmYsIC0weDgwMDApXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uIHdyaXRlSW50MzJMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSA+Pj4gMjQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgPj4+IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmICh2YWx1ZSA8IDApIHZhbHVlID0gMHhmZmZmZmZmZiArIHZhbHVlICsgMVxuICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDI0KVxuICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgdGhpc1tvZmZzZXQgKyAyXSA9ICh2YWx1ZSA+Pj4gOClcbiAgdGhpc1tvZmZzZXQgKyAzXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignSW5kZXggb3V0IG9mIHJhbmdlJylcbiAgaWYgKG9mZnNldCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdJbmRleCBvdXQgb2YgcmFuZ2UnKVxufVxuXG5mdW5jdGlvbiB3cml0ZUZsb2F0IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0ID4+PiAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCA+Pj4gMFxuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgY2hlY2tJRUVFNzU0KGJ1ZiwgdmFsdWUsIG9mZnNldCwgOCwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbiAgcmV0dXJuIG9mZnNldCArIDhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gd3JpdGVEb3VibGVMRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5ICh0YXJnZXQsIHRhcmdldFN0YXJ0LCBzdGFydCwgZW5kKSB7XG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXRTdGFydCA+PSB0YXJnZXQubGVuZ3RoKSB0YXJnZXRTdGFydCA9IHRhcmdldC5sZW5ndGhcbiAgaWYgKCF0YXJnZXRTdGFydCkgdGFyZ2V0U3RhcnQgPSAwXG4gIGlmIChlbmQgPiAwICYmIGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuIDBcbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgdGhpcy5sZW5ndGggPT09IDApIHJldHVybiAwXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBpZiAodGFyZ2V0U3RhcnQgPCAwKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3RhcmdldFN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICB9XG4gIGlmIChzdGFydCA8IDAgfHwgc3RhcnQgPj0gdGhpcy5sZW5ndGgpIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgaWYgKGVuZCA8IDApIHRocm93IG5ldyBSYW5nZUVycm9yKCdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAodGFyZ2V0Lmxlbmd0aCAtIHRhcmdldFN0YXJ0IDwgZW5kIC0gc3RhcnQpIHtcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgKyBzdGFydFxuICB9XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG4gIHZhciBpXG5cbiAgaWYgKHRoaXMgPT09IHRhcmdldCAmJiBzdGFydCA8IHRhcmdldFN0YXJ0ICYmIHRhcmdldFN0YXJ0IDwgZW5kKSB7XG4gICAgLy8gZGVzY2VuZGluZyBjb3B5IGZyb20gZW5kXG4gICAgZm9yIChpID0gbGVuIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0U3RhcnRdID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICB9IGVsc2UgaWYgKGxlbiA8IDEwMDApIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBVaW50OEFycmF5LnByb3RvdHlwZS5zZXQuY2FsbChcbiAgICAgIHRhcmdldCxcbiAgICAgIHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSxcbiAgICAgIHRhcmdldFN0YXJ0XG4gICAgKVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBVc2FnZTpcbi8vICAgIGJ1ZmZlci5maWxsKG51bWJlclssIG9mZnNldFssIGVuZF1dKVxuLy8gICAgYnVmZmVyLmZpbGwoYnVmZmVyWywgb2Zmc2V0WywgZW5kXV0pXG4vLyAgICBidWZmZXIuZmlsbChzdHJpbmdbLCBvZmZzZXRbLCBlbmRdXVssIGVuY29kaW5nXSlcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbCwgc3RhcnQsIGVuZCwgZW5jb2RpbmcpIHtcbiAgLy8gSGFuZGxlIHN0cmluZyBjYXNlczpcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHR5cGVvZiBzdGFydCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGVuY29kaW5nID0gc3RhcnRcbiAgICAgIHN0YXJ0ID0gMFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBlbmQgPT09ICdzdHJpbmcnKSB7XG4gICAgICBlbmNvZGluZyA9IGVuZFxuICAgICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgICB9XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBjb2RlID0gdmFsLmNoYXJDb2RlQXQoMClcbiAgICAgIGlmIChjb2RlIDwgMjU2KSB7XG4gICAgICAgIHZhbCA9IGNvZGVcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGVuY29kaW5nICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZW5jb2RpbmcgbXVzdCBiZSBhIHN0cmluZycpXG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdzdHJpbmcnICYmICFCdWZmZXIuaXNFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICB9XG4gIH0gZWxzZSBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICB2YWwgPSB2YWwgJiAyNTVcbiAgfVxuXG4gIC8vIEludmFsaWQgcmFuZ2VzIGFyZSBub3Qgc2V0IHRvIGEgZGVmYXVsdCwgc28gY2FuIHJhbmdlIGNoZWNrIGVhcmx5LlxuICBpZiAoc3RhcnQgPCAwIHx8IHRoaXMubGVuZ3RoIDwgc3RhcnQgfHwgdGhpcy5sZW5ndGggPCBlbmQpIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignT3V0IG9mIHJhbmdlIGluZGV4JylcbiAgfVxuXG4gIGlmIChlbmQgPD0gc3RhcnQpIHtcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgc3RhcnQgPSBzdGFydCA+Pj4gMFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IHRoaXMubGVuZ3RoIDogZW5kID4+PiAwXG5cbiAgaWYgKCF2YWwpIHZhbCA9IDBcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHtcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgKytpKSB7XG4gICAgICB0aGlzW2ldID0gdmFsXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IEJ1ZmZlci5pc0J1ZmZlcih2YWwpXG4gICAgICA/IHZhbFxuICAgICAgOiBuZXcgQnVmZmVyKHZhbCwgZW5jb2RpbmcpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IDA7IGkgPCBlbmQgLSBzdGFydDsgKytpKSB7XG4gICAgICB0aGlzW2kgKyBzdGFydF0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbi8vIEhFTFBFUiBGVU5DVElPTlNcbi8vID09PT09PT09PT09PT09PT1cblxudmFyIElOVkFMSURfQkFTRTY0X1JFID0gL1teKy8wLTlBLVphLXotX10vZ1xuXG5mdW5jdGlvbiBiYXNlNjRjbGVhbiAoc3RyKSB7XG4gIC8vIE5vZGUgc3RyaXBzIG91dCBpbnZhbGlkIGNoYXJhY3RlcnMgbGlrZSBcXG4gYW5kIFxcdCBmcm9tIHRoZSBzdHJpbmcsIGJhc2U2NC1qcyBkb2VzIG5vdFxuICBzdHIgPSBzdHIudHJpbSgpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSAobGVhZFN1cnJvZ2F0ZSAtIDB4RDgwMCA8PCAxMCB8IGNvZGVQb2ludCAtIDB4REMwMCkgKyAweDEwMDAwXG4gICAgfSBlbHNlIGlmIChsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAvLyB2YWxpZCBibXAgY2hhciwgYnV0IGxhc3QgY2hhciB3YXMgYSBsZWFkXG4gICAgICBpZiAoKHVuaXRzIC09IDMpID4gLTEpIGJ5dGVzLnB1c2goMHhFRiwgMHhCRiwgMHhCRClcbiAgICB9XG5cbiAgICBsZWFkU3Vycm9nYXRlID0gbnVsbFxuXG4gICAgLy8gZW5jb2RlIHV0ZjhcbiAgICBpZiAoY29kZVBvaW50IDwgMHg4MCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAxKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKGNvZGVQb2ludClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4ODAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgfCAweEMwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMDAwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAzKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDIHwgMHhFMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4NiAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgJiAweDNGIHwgMHg4MFxuICAgICAgKVxuICAgIH0gZWxzZSBpZiAoY29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gNCkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4MTIgfCAweEYwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHhDICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQnKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBieXRlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyArK2kpIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyLCB1bml0cykge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGlmICgodW5pdHMgLT0gMikgPCAwKSBicmVha1xuXG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoYmFzZTY0Y2xlYW4oc3RyKSlcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKGkgKyBvZmZzZXQgPj0gZHN0Lmxlbmd0aCkgfHwgKGkgPj0gc3JjLmxlbmd0aCkpIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuLy8gQXJyYXlCdWZmZXJzIGZyb20gYW5vdGhlciBjb250ZXh0IChpLmUuIGFuIGlmcmFtZSkgZG8gbm90IHBhc3MgdGhlIGBpbnN0YW5jZW9mYCBjaGVja1xuLy8gYnV0IHRoZXkgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgdmFsaWQuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvaXNzdWVzLzE2NlxuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlciAob2JqKSB7XG4gIHJldHVybiBvYmogaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fFxuICAgIChvYmogIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IgIT0gbnVsbCAmJiBvYmouY29uc3RydWN0b3IubmFtZSA9PT0gJ0FycmF5QnVmZmVyJyAmJlxuICAgICAgdHlwZW9mIG9iai5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJylcbn1cblxuLy8gTm9kZSAwLjEwIHN1cHBvcnRzIGBBcnJheUJ1ZmZlcmAgYnV0IGxhY2tzIGBBcnJheUJ1ZmZlci5pc1ZpZXdgXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyAob2JqKSB7XG4gIHJldHVybiAodHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJykgJiYgQXJyYXlCdWZmZXIuaXNWaWV3KG9iailcbn1cblxuZnVuY3Rpb24gbnVtYmVySXNOYU4gKG9iaikge1xuICByZXR1cm4gb2JqICE9PSBvYmogLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zZWxmLWNvbXBhcmVcbn1cbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gSWYgb2JqLmhhc093blByb3BlcnR5IGhhcyBiZWVuIG92ZXJyaWRkZW4sIHRoZW4gY2FsbGluZ1xuLy8gb2JqLmhhc093blByb3BlcnR5KHByb3ApIHdpbGwgYnJlYWsuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMTcwN1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxcywgc2VwLCBlcSwgb3B0aW9ucykge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgdmFyIG9iaiA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcXMgIT09ICdzdHJpbmcnIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgcmVnZXhwID0gL1xcKy9nO1xuICBxcyA9IHFzLnNwbGl0KHNlcCk7XG5cbiAgdmFyIG1heEtleXMgPSAxMDAwO1xuICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5tYXhLZXlzID09PSAnbnVtYmVyJykge1xuICAgIG1heEtleXMgPSBvcHRpb25zLm1heEtleXM7XG4gIH1cblxuICB2YXIgbGVuID0gcXMubGVuZ3RoO1xuICAvLyBtYXhLZXlzIDw9IDAgbWVhbnMgdGhhdCB3ZSBzaG91bGQgbm90IGxpbWl0IGtleXMgY291bnRcbiAgaWYgKG1heEtleXMgPiAwICYmIGxlbiA+IG1heEtleXMpIHtcbiAgICBsZW4gPSBtYXhLZXlzO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIHZhciB4ID0gcXNbaV0ucmVwbGFjZShyZWdleHAsICclMjAnKSxcbiAgICAgICAgaWR4ID0geC5pbmRleE9mKGVxKSxcbiAgICAgICAga3N0ciwgdnN0ciwgaywgdjtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAga3N0ciA9IHguc3Vic3RyKDAsIGlkeCk7XG4gICAgICB2c3RyID0geC5zdWJzdHIoaWR4ICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtzdHIgPSB4O1xuICAgICAgdnN0ciA9ICcnO1xuICAgIH1cblxuICAgIGsgPSBkZWNvZGVVUklDb21wb25lbnQoa3N0cik7XG4gICAgdiA9IGRlY29kZVVSSUNvbXBvbmVudCh2c3RyKTtcblxuICAgIGlmICghaGFzT3duUHJvcGVydHkob2JqLCBrKSkge1xuICAgICAgb2JqW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgb2JqW2tdLnB1c2godik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtrXSA9IFtvYmpba10sIHZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnlQcmltaXRpdmUgPSBmdW5jdGlvbih2KSB7XG4gIHN3aXRjaCAodHlwZW9mIHYpIHtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcmV0dXJuIHY7XG5cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIHJldHVybiB2ID8gJ3RydWUnIDogJ2ZhbHNlJztcblxuICAgIGNhc2UgJ251bWJlcic6XG4gICAgICByZXR1cm4gaXNGaW5pdGUodikgPyB2IDogJyc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaiwgc2VwLCBlcSwgbmFtZSkge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIG9iaiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBtYXAob2JqZWN0S2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICB2YXIga3MgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKGspKSArIGVxO1xuICAgICAgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgICByZXR1cm4gbWFwKG9ialtrXSwgZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUodikpO1xuICAgICAgICB9KS5qb2luKHNlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9ialtrXSkpO1xuICAgICAgfVxuICAgIH0pLmpvaW4oc2VwKTtcblxuICB9XG5cbiAgaWYgKCFuYW1lKSByZXR1cm4gJyc7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG5hbWUpKSArIGVxICtcbiAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqKSk7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGYpO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSByZXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmRlY29kZSA9IGV4cG9ydHMucGFyc2UgPSByZXF1aXJlKCcuL2RlY29kZScpO1xuZXhwb3J0cy5lbmNvZGUgPSBleHBvcnRzLnN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vZW5jb2RlJyk7XG4iLCJcclxuLyoqXHJcbiAqIEV4cG9zZSBgRW1pdHRlcmAuXHJcbiAqL1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgbW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xyXG59XHJcblxyXG4vKipcclxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXHJcbiAqXHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcclxuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXHJcbiAqIEByZXR1cm4ge09iamVjdH1cclxuICogQGFwaSBwcml2YXRlXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XHJcbiAgZm9yICh2YXIga2V5IGluIEVtaXR0ZXIucHJvdG90eXBlKSB7XHJcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XHJcbiAgfVxyXG4gIHJldHVybiBvYmo7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxyXG4gKlxyXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XHJcbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xyXG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICAodGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW10pXHJcbiAgICAucHVzaChmbik7XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXHJcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxyXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuXHJcbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pe1xyXG4gIGZ1bmN0aW9uIG9uKCkge1xyXG4gICAgdGhpcy5vZmYoZXZlbnQsIG9uKTtcclxuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgfVxyXG5cclxuICBvbi5mbiA9IGZuO1xyXG4gIHRoaXMub24oZXZlbnQsIG9uKTtcclxuICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxyXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXHJcbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUub2ZmID1cclxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxyXG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxyXG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcclxuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XHJcblxyXG4gIC8vIGFsbFxyXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyBzcGVjaWZpYyBldmVudFxyXG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG4gIGlmICghY2FsbGJhY2tzKSByZXR1cm4gdGhpcztcclxuXHJcbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xyXG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcclxuICAgIGRlbGV0ZSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxyXG4gIHZhciBjYjtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xyXG4gICAgY2IgPSBjYWxsYmFja3NbaV07XHJcbiAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xyXG4gICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG4vKipcclxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcGFyYW0ge01peGVkfSAuLi5cclxuICogQHJldHVybiB7RW1pdHRlcn1cclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpe1xyXG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcclxuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxyXG4gICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xyXG5cclxuICBpZiAoY2FsbGJhY2tzKSB7XHJcbiAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXHJcbiAqXHJcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxyXG4gKiBAcmV0dXJuIHtBcnJheX1cclxuICogQGFwaSBwdWJsaWNcclxuICovXHJcblxyXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XHJcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xyXG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cclxuICpcclxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XHJcbiAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG5cclxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xyXG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xyXG59O1xyXG4iLCIvKipcbiAqIFJvb3QgcmVmZXJlbmNlIGZvciBpZnJhbWVzLlxuICovXG5cbnZhciByb290O1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7IC8vIEJyb3dzZXIgd2luZG93XG4gIHJvb3QgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJykgeyAvLyBXZWIgV29ya2VyXG4gIHJvb3QgPSBzZWxmO1xufSBlbHNlIHsgLy8gT3RoZXIgZW52aXJvbm1lbnRzXG4gIGNvbnNvbGUud2FybihcIlVzaW5nIGJyb3dzZXItb25seSB2ZXJzaW9uIG9mIHN1cGVyYWdlbnQgaW4gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRcIik7XG4gIHJvb3QgPSB0aGlzO1xufVxuXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2NvbXBvbmVudC1lbWl0dGVyJyk7XG52YXIgUmVxdWVzdEJhc2UgPSByZXF1aXJlKCcuL3JlcXVlc3QtYmFzZScpO1xudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnLi9pcy1vYmplY3QnKTtcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnLi9pcy1mdW5jdGlvbicpO1xudmFyIFJlc3BvbnNlQmFzZSA9IHJlcXVpcmUoJy4vcmVzcG9uc2UtYmFzZScpO1xudmFyIHNob3VsZFJldHJ5ID0gcmVxdWlyZSgnLi9zaG91bGQtcmV0cnknKTtcblxuLyoqXG4gKiBOb29wLlxuICovXG5cbmZ1bmN0aW9uIG5vb3AoKXt9O1xuXG4vKipcbiAqIEV4cG9zZSBgcmVxdWVzdGAuXG4gKi9cblxudmFyIHJlcXVlc3QgPSBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihtZXRob2QsIHVybCkge1xuICAvLyBjYWxsYmFja1xuICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgdXJsKSB7XG4gICAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QoJ0dFVCcsIG1ldGhvZCkuZW5kKHVybCk7XG4gIH1cblxuICAvLyB1cmwgZmlyc3RcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHJldHVybiBuZXcgZXhwb3J0cy5SZXF1ZXN0KCdHRVQnLCBtZXRob2QpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBleHBvcnRzLlJlcXVlc3QobWV0aG9kLCB1cmwpO1xufVxuXG5leHBvcnRzLlJlcXVlc3QgPSBSZXF1ZXN0O1xuXG4vKipcbiAqIERldGVybWluZSBYSFIuXG4gKi9cblxucmVxdWVzdC5nZXRYSFIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmIChyb290LlhNTEh0dHBSZXF1ZXN0XG4gICAgICAmJiAoIXJvb3QubG9jYXRpb24gfHwgJ2ZpbGU6JyAhPSByb290LmxvY2F0aW9uLnByb3RvY29sXG4gICAgICAgICAgfHwgIXJvb3QuQWN0aXZlWE9iamVjdCkpIHtcbiAgICByZXR1cm4gbmV3IFhNTEh0dHBSZXF1ZXN0O1xuICB9IGVsc2Uge1xuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTWljcm9zb2Z0LlhNTEhUVFAnKTsgfSBjYXRjaChlKSB7fVxuICAgIHRyeSB7IHJldHVybiBuZXcgQWN0aXZlWE9iamVjdCgnTXN4bWwyLlhNTEhUVFAuNi4wJyk7IH0gY2F0Y2goZSkge31cbiAgICB0cnkgeyByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01zeG1sMi5YTUxIVFRQLjMuMCcpOyB9IGNhdGNoKGUpIHt9XG4gICAgdHJ5IHsgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNc3htbDIuWE1MSFRUUCcpOyB9IGNhdGNoKGUpIHt9XG4gIH1cbiAgdGhyb3cgRXJyb3IoXCJCcm93c2VyLW9ubHkgdmVyaXNvbiBvZiBzdXBlcmFnZW50IGNvdWxkIG5vdCBmaW5kIFhIUlwiKTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBsZWFkaW5nIGFuZCB0cmFpbGluZyB3aGl0ZXNwYWNlLCBhZGRlZCB0byBzdXBwb3J0IElFLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG52YXIgdHJpbSA9ICcnLnRyaW1cbiAgPyBmdW5jdGlvbihzKSB7IHJldHVybiBzLnRyaW0oKTsgfVxuICA6IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHMucmVwbGFjZSgvKF5cXHMqfFxccyokKS9nLCAnJyk7IH07XG5cbi8qKlxuICogU2VyaWFsaXplIHRoZSBnaXZlbiBgb2JqYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZXJpYWxpemUob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgdmFyIHBhaXJzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCBvYmpba2V5XSk7XG4gIH1cbiAgcmV0dXJuIHBhaXJzLmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBIZWxwcyAnc2VyaWFsaXplJyB3aXRoIHNlcmlhbGl6aW5nIGFycmF5cy5cbiAqIE11dGF0ZXMgdGhlIHBhaXJzIGFycmF5LlxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHBhaXJzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge01peGVkfSB2YWxcbiAqL1xuXG5mdW5jdGlvbiBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2YWwpIHtcbiAgaWYgKHZhbCAhPSBudWxsKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgdmFsLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICBwdXNoRW5jb2RlZEtleVZhbHVlUGFpcihwYWlycywga2V5LCB2KTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsKSkge1xuICAgICAgZm9yKHZhciBzdWJrZXkgaW4gdmFsKSB7XG4gICAgICAgIHB1c2hFbmNvZGVkS2V5VmFsdWVQYWlyKHBhaXJzLCBrZXkgKyAnWycgKyBzdWJrZXkgKyAnXScsIHZhbFtzdWJrZXldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KVxuICAgICAgICArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodmFsID09PSBudWxsKSB7XG4gICAgcGFpcnMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHBvc2Ugc2VyaWFsaXphdGlvbiBtZXRob2QuXG4gKi9cblxuIHJlcXVlc3Quc2VyaWFsaXplT2JqZWN0ID0gc2VyaWFsaXplO1xuXG4gLyoqXG4gICogUGFyc2UgdGhlIGdpdmVuIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBgc3RyYC5cbiAgKlxuICAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICogQGFwaSBwcml2YXRlXG4gICovXG5cbmZ1bmN0aW9uIHBhcnNlU3RyaW5nKHN0cikge1xuICB2YXIgb2JqID0ge307XG4gIHZhciBwYWlycyA9IHN0ci5zcGxpdCgnJicpO1xuICB2YXIgcGFpcjtcbiAgdmFyIHBvcztcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gcGFpcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBwYWlyID0gcGFpcnNbaV07XG4gICAgcG9zID0gcGFpci5pbmRleE9mKCc9Jyk7XG4gICAgaWYgKHBvcyA9PSAtMSkge1xuICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyKV0gPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqW2RlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKDAsIHBvcykpXSA9XG4gICAgICAgIGRlY29kZVVSSUNvbXBvbmVudChwYWlyLnNsaWNlKHBvcyArIDEpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEV4cG9zZSBwYXJzZXIuXG4gKi9cblxucmVxdWVzdC5wYXJzZVN0cmluZyA9IHBhcnNlU3RyaW5nO1xuXG4vKipcbiAqIERlZmF1bHQgTUlNRSB0eXBlIG1hcC5cbiAqXG4gKiAgICAgc3VwZXJhZ2VudC50eXBlcy54bWwgPSAnYXBwbGljYXRpb24veG1sJztcbiAqXG4gKi9cblxucmVxdWVzdC50eXBlcyA9IHtcbiAgaHRtbDogJ3RleHQvaHRtbCcsXG4gIGpzb246ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgeG1sOiAnYXBwbGljYXRpb24veG1sJyxcbiAgdXJsZW5jb2RlZDogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICdmb3JtJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcsXG4gICdmb3JtLWRhdGEnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuLyoqXG4gKiBEZWZhdWx0IHNlcmlhbGl6YXRpb24gbWFwLlxuICpcbiAqICAgICBzdXBlcmFnZW50LnNlcmlhbGl6ZVsnYXBwbGljYXRpb24veG1sJ10gPSBmdW5jdGlvbihvYmope1xuICogICAgICAgcmV0dXJuICdnZW5lcmF0ZWQgeG1sIGhlcmUnO1xuICogICAgIH07XG4gKlxuICovXG5cbiByZXF1ZXN0LnNlcmlhbGl6ZSA9IHtcbiAgICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBzZXJpYWxpemUsXG4gICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5XG4gfTtcblxuIC8qKlxuICAqIERlZmF1bHQgcGFyc2Vycy5cbiAgKlxuICAqICAgICBzdXBlcmFnZW50LnBhcnNlWydhcHBsaWNhdGlvbi94bWwnXSA9IGZ1bmN0aW9uKHN0cil7XG4gICogICAgICAgcmV0dXJuIHsgb2JqZWN0IHBhcnNlZCBmcm9tIHN0ciB9O1xuICAqICAgICB9O1xuICAqXG4gICovXG5cbnJlcXVlc3QucGFyc2UgPSB7XG4gICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOiBwYXJzZVN0cmluZyxcbiAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnBhcnNlXG59O1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBoZWFkZXIgYHN0cmAgaW50b1xuICogYW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1hcHBlZCBmaWVsZHMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VIZWFkZXIoc3RyKSB7XG4gIHZhciBsaW5lcyA9IHN0ci5zcGxpdCgvXFxyP1xcbi8pO1xuICB2YXIgZmllbGRzID0ge307XG4gIHZhciBpbmRleDtcbiAgdmFyIGxpbmU7XG4gIHZhciBmaWVsZDtcbiAgdmFyIHZhbDtcblxuICBsaW5lcy5wb3AoKTsgLy8gdHJhaWxpbmcgQ1JMRlxuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsaW5lcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGxpbmUgPSBsaW5lc1tpXTtcbiAgICBpbmRleCA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgIGZpZWxkID0gbGluZS5zbGljZSgwLCBpbmRleCkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWwgPSB0cmltKGxpbmUuc2xpY2UoaW5kZXggKyAxKSk7XG4gICAgZmllbGRzW2ZpZWxkXSA9IHZhbDtcbiAgfVxuXG4gIHJldHVybiBmaWVsZHM7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYG1pbWVgIGlzIGpzb24gb3IgaGFzICtqc29uIHN0cnVjdHVyZWQgc3ludGF4IHN1ZmZpeC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWltZVxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGlzSlNPTihtaW1lKSB7XG4gIHJldHVybiAvW1xcLytdanNvblxcYi8udGVzdChtaW1lKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBSZXNwb25zZWAgd2l0aCB0aGUgZ2l2ZW4gYHhocmAuXG4gKlxuICogIC0gc2V0IGZsYWdzICgub2ssIC5lcnJvciwgZXRjKVxuICogIC0gcGFyc2UgaGVhZGVyXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogIEFsaWFzaW5nIGBzdXBlcmFnZW50YCBhcyBgcmVxdWVzdGAgaXMgbmljZTpcbiAqXG4gKiAgICAgIHJlcXVlc3QgPSBzdXBlcmFnZW50O1xuICpcbiAqICBXZSBjYW4gdXNlIHRoZSBwcm9taXNlLWxpa2UgQVBJLCBvciBwYXNzIGNhbGxiYWNrczpcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJykuZW5kKGZ1bmN0aW9uKHJlcyl7fSk7XG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvJywgZnVuY3Rpb24ocmVzKXt9KTtcbiAqXG4gKiAgU2VuZGluZyBkYXRhIGNhbiBiZSBjaGFpbmVkOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqICBPciBwYXNzZWQgdG8gYC5zZW5kKClgOlxuICpcbiAqICAgICAgcmVxdWVzdFxuICogICAgICAgIC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgLnNlbmQoeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogIE9yIHBhc3NlZCB0byBgLnBvc3QoKWA6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0pXG4gKiAgICAgICAgLmVuZChmdW5jdGlvbihyZXMpe30pO1xuICpcbiAqIE9yIGZ1cnRoZXIgcmVkdWNlZCB0byBhIHNpbmdsZSBjYWxsIGZvciBzaW1wbGUgY2FzZXM6XG4gKlxuICogICAgICByZXF1ZXN0XG4gKiAgICAgICAgLnBvc3QoJy91c2VyJywgeyBuYW1lOiAndGonIH0sIGZ1bmN0aW9uKHJlcyl7fSk7XG4gKlxuICogQHBhcmFtIHtYTUxIVFRQUmVxdWVzdH0geGhyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9uc1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gUmVzcG9uc2UocmVxKSB7XG4gIHRoaXMucmVxID0gcmVxO1xuICB0aGlzLnhociA9IHRoaXMucmVxLnhocjtcbiAgLy8gcmVzcG9uc2VUZXh0IGlzIGFjY2Vzc2libGUgb25seSBpZiByZXNwb25zZVR5cGUgaXMgJycgb3IgJ3RleHQnIGFuZCBvbiBvbGRlciBicm93c2Vyc1xuICB0aGlzLnRleHQgPSAoKHRoaXMucmVxLm1ldGhvZCAhPSdIRUFEJyAmJiAodGhpcy54aHIucmVzcG9uc2VUeXBlID09PSAnJyB8fCB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd0ZXh0JykpIHx8IHR5cGVvZiB0aGlzLnhoci5yZXNwb25zZVR5cGUgPT09ICd1bmRlZmluZWQnKVxuICAgICA/IHRoaXMueGhyLnJlc3BvbnNlVGV4dFxuICAgICA6IG51bGw7XG4gIHRoaXMuc3RhdHVzVGV4dCA9IHRoaXMucmVxLnhoci5zdGF0dXNUZXh0O1xuICB2YXIgc3RhdHVzID0gdGhpcy54aHIuc3RhdHVzO1xuICAvLyBoYW5kbGUgSUU5IGJ1ZzogaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gIGlmIChzdGF0dXMgPT09IDEyMjMpIHtcbiAgICAgIHN0YXR1cyA9IDIwNDtcbiAgfVxuICB0aGlzLl9zZXRTdGF0dXNQcm9wZXJ0aWVzKHN0YXR1cyk7XG4gIHRoaXMuaGVhZGVyID0gdGhpcy5oZWFkZXJzID0gcGFyc2VIZWFkZXIodGhpcy54aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpO1xuICAvLyBnZXRBbGxSZXNwb25zZUhlYWRlcnMgc29tZXRpbWVzIGZhbHNlbHkgcmV0dXJucyBcIlwiIGZvciBDT1JTIHJlcXVlc3RzLCBidXRcbiAgLy8gZ2V0UmVzcG9uc2VIZWFkZXIgc3RpbGwgd29ya3MuIHNvIHdlIGdldCBjb250ZW50LXR5cGUgZXZlbiBpZiBnZXR0aW5nXG4gIC8vIG90aGVyIGhlYWRlcnMgZmFpbHMuXG4gIHRoaXMuaGVhZGVyWydjb250ZW50LXR5cGUnXSA9IHRoaXMueGhyLmdldFJlc3BvbnNlSGVhZGVyKCdjb250ZW50LXR5cGUnKTtcbiAgdGhpcy5fc2V0SGVhZGVyUHJvcGVydGllcyh0aGlzLmhlYWRlcik7XG5cbiAgaWYgKG51bGwgPT09IHRoaXMudGV4dCAmJiByZXEuX3Jlc3BvbnNlVHlwZSkge1xuICAgIHRoaXMuYm9keSA9IHRoaXMueGhyLnJlc3BvbnNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYm9keSA9IHRoaXMucmVxLm1ldGhvZCAhPSAnSEVBRCdcbiAgICAgID8gdGhpcy5fcGFyc2VCb2R5KHRoaXMudGV4dCA/IHRoaXMudGV4dCA6IHRoaXMueGhyLnJlc3BvbnNlKVxuICAgICAgOiBudWxsO1xuICB9XG59XG5cblJlc3BvbnNlQmFzZShSZXNwb25zZS5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBib2R5IGBzdHJgLlxuICpcbiAqIFVzZWQgZm9yIGF1dG8tcGFyc2luZyBvZiBib2RpZXMuIFBhcnNlcnNcbiAqIGFyZSBkZWZpbmVkIG9uIHRoZSBgc3VwZXJhZ2VudC5wYXJzZWAgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge01peGVkfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVzcG9uc2UucHJvdG90eXBlLl9wYXJzZUJvZHkgPSBmdW5jdGlvbihzdHIpe1xuICB2YXIgcGFyc2UgPSByZXF1ZXN0LnBhcnNlW3RoaXMudHlwZV07XG4gIGlmKHRoaXMucmVxLl9wYXJzZXIpIHtcbiAgICByZXR1cm4gdGhpcy5yZXEuX3BhcnNlcih0aGlzLCBzdHIpO1xuICB9XG4gIGlmICghcGFyc2UgJiYgaXNKU09OKHRoaXMudHlwZSkpIHtcbiAgICBwYXJzZSA9IHJlcXVlc3QucGFyc2VbJ2FwcGxpY2F0aW9uL2pzb24nXTtcbiAgfVxuICByZXR1cm4gcGFyc2UgJiYgc3RyICYmIChzdHIubGVuZ3RoIHx8IHN0ciBpbnN0YW5jZW9mIE9iamVjdClcbiAgICA/IHBhcnNlKHN0cilcbiAgICA6IG51bGw7XG59O1xuXG4vKipcbiAqIFJldHVybiBhbiBgRXJyb3JgIHJlcHJlc2VudGF0aXZlIG9mIHRoaXMgcmVzcG9uc2UuXG4gKlxuICogQHJldHVybiB7RXJyb3J9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlLnByb3RvdHlwZS50b0Vycm9yID0gZnVuY3Rpb24oKXtcbiAgdmFyIHJlcSA9IHRoaXMucmVxO1xuICB2YXIgbWV0aG9kID0gcmVxLm1ldGhvZDtcbiAgdmFyIHVybCA9IHJlcS51cmw7XG5cbiAgdmFyIG1zZyA9ICdjYW5ub3QgJyArIG1ldGhvZCArICcgJyArIHVybCArICcgKCcgKyB0aGlzLnN0YXR1cyArICcpJztcbiAgdmFyIGVyciA9IG5ldyBFcnJvcihtc2cpO1xuICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVyci5tZXRob2QgPSBtZXRob2Q7XG4gIGVyci51cmwgPSB1cmw7XG5cbiAgcmV0dXJuIGVycjtcbn07XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZWAuXG4gKi9cblxucmVxdWVzdC5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlcXVlc3RgIHdpdGggdGhlIGdpdmVuIGBtZXRob2RgIGFuZCBgdXJsYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFJlcXVlc3QobWV0aG9kLCB1cmwpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9xdWVyeSA9IHRoaXMuX3F1ZXJ5IHx8IFtdO1xuICB0aGlzLm1ldGhvZCA9IG1ldGhvZDtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIHRoaXMuaGVhZGVyID0ge307IC8vIHByZXNlcnZlcyBoZWFkZXIgbmFtZSBjYXNlXG4gIHRoaXMuX2hlYWRlciA9IHt9OyAvLyBjb2VyY2VzIGhlYWRlciBuYW1lcyB0byBsb3dlcmNhc2VcbiAgdGhpcy5vbignZW5kJywgZnVuY3Rpb24oKXtcbiAgICB2YXIgZXJyID0gbnVsbDtcbiAgICB2YXIgcmVzID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICByZXMgPSBuZXcgUmVzcG9uc2Uoc2VsZik7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBlcnIgPSBuZXcgRXJyb3IoJ1BhcnNlciBpcyB1bmFibGUgdG8gcGFyc2UgdGhlIHJlc3BvbnNlJyk7XG4gICAgICBlcnIucGFyc2UgPSB0cnVlO1xuICAgICAgZXJyLm9yaWdpbmFsID0gZTtcbiAgICAgIC8vIGlzc3VlICM2NzU6IHJldHVybiB0aGUgcmF3IHJlc3BvbnNlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICBpZiAoc2VsZi54aHIpIHtcbiAgICAgICAgLy8gaWU5IGRvZXNuJ3QgaGF2ZSAncmVzcG9uc2UnIHByb3BlcnR5XG4gICAgICAgIGVyci5yYXdSZXNwb25zZSA9IHR5cGVvZiBzZWxmLnhoci5yZXNwb25zZVR5cGUgPT0gJ3VuZGVmaW5lZCcgPyBzZWxmLnhoci5yZXNwb25zZVRleHQgOiBzZWxmLnhoci5yZXNwb25zZTtcbiAgICAgICAgLy8gaXNzdWUgIzg3NjogcmV0dXJuIHRoZSBodHRwIHN0YXR1cyBjb2RlIGlmIHRoZSByZXNwb25zZSBwYXJzaW5nIGZhaWxzXG4gICAgICAgIGVyci5zdGF0dXMgPSBzZWxmLnhoci5zdGF0dXMgPyBzZWxmLnhoci5zdGF0dXMgOiBudWxsO1xuICAgICAgICBlcnIuc3RhdHVzQ29kZSA9IGVyci5zdGF0dXM7IC8vIGJhY2t3YXJkcy1jb21wYXQgb25seVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXJyLnJhd1Jlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgZXJyLnN0YXR1cyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzZWxmLmNhbGxiYWNrKGVycik7XG4gICAgfVxuXG4gICAgc2VsZi5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG5cbiAgICB2YXIgbmV3X2VycjtcbiAgICB0cnkge1xuICAgICAgaWYgKCFzZWxmLl9pc1Jlc3BvbnNlT0socmVzKSkge1xuICAgICAgICBuZXdfZXJyID0gbmV3IEVycm9yKHJlcy5zdGF0dXNUZXh0IHx8ICdVbnN1Y2Nlc3NmdWwgSFRUUCByZXNwb25zZScpO1xuICAgICAgICBuZXdfZXJyLm9yaWdpbmFsID0gZXJyO1xuICAgICAgICBuZXdfZXJyLnJlc3BvbnNlID0gcmVzO1xuICAgICAgICBuZXdfZXJyLnN0YXR1cyA9IHJlcy5zdGF0dXM7XG4gICAgICB9XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBuZXdfZXJyID0gZTsgLy8gIzk4NSB0b3VjaGluZyByZXMgbWF5IGNhdXNlIElOVkFMSURfU1RBVEVfRVJSIG9uIG9sZCBBbmRyb2lkXG4gICAgfVxuXG4gICAgLy8gIzEwMDAgZG9uJ3QgY2F0Y2ggZXJyb3JzIGZyb20gdGhlIGNhbGxiYWNrIHRvIGF2b2lkIGRvdWJsZSBjYWxsaW5nIGl0XG4gICAgaWYgKG5ld19lcnIpIHtcbiAgICAgIHNlbGYuY2FsbGJhY2sobmV3X2VyciwgcmVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5jYWxsYmFjayhudWxsLCByZXMpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogTWl4aW4gYEVtaXR0ZXJgIGFuZCBgUmVxdWVzdEJhc2VgLlxuICovXG5cbkVtaXR0ZXIoUmVxdWVzdC5wcm90b3R5cGUpO1xuUmVxdWVzdEJhc2UoUmVxdWVzdC5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFNldCBDb250ZW50LVR5cGUgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMueG1sID0gJ2FwcGxpY2F0aW9uL3htbCc7XG4gKlxuICogICAgICByZXF1ZXN0LnBvc3QoJy8nKVxuICogICAgICAgIC50eXBlKCd4bWwnKVxuICogICAgICAgIC5zZW5kKHhtbHN0cmluZylcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiAgICAgIHJlcXVlc3QucG9zdCgnLycpXG4gKiAgICAgICAgLnR5cGUoJ2FwcGxpY2F0aW9uL3htbCcpXG4gKiAgICAgICAgLnNlbmQoeG1sc3RyaW5nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uKHR5cGUpe1xuICB0aGlzLnNldCgnQ29udGVudC1UeXBlJywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBY2NlcHQgdG8gYHR5cGVgLCBtYXBwaW5nIHZhbHVlcyBmcm9tIGByZXF1ZXN0LnR5cGVzYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHN1cGVyYWdlbnQudHlwZXMuanNvbiA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAqXG4gKiAgICAgIHJlcXVlc3QuZ2V0KCcvYWdlbnQnKVxuICogICAgICAgIC5hY2NlcHQoJ2pzb24nKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxdWVzdC5nZXQoJy9hZ2VudCcpXG4gKiAgICAgICAgLmFjY2VwdCgnYXBwbGljYXRpb24vanNvbicpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGFjY2VwdFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmFjY2VwdCA9IGZ1bmN0aW9uKHR5cGUpe1xuICB0aGlzLnNldCgnQWNjZXB0JywgcmVxdWVzdC50eXBlc1t0eXBlXSB8fCB0eXBlKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCBBdXRob3JpemF0aW9uIGZpZWxkIHZhbHVlIHdpdGggYHVzZXJgIGFuZCBgcGFzc2AuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBbcGFzc10gb3B0aW9uYWwgaW4gY2FzZSBvZiB1c2luZyAnYmVhcmVyJyBhcyB0eXBlXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB3aXRoICd0eXBlJyBwcm9wZXJ0eSAnYXV0bycsICdiYXNpYycgb3IgJ2JlYXJlcicgKGRlZmF1bHQgJ2Jhc2ljJylcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24odXNlciwgcGFzcywgb3B0aW9ucyl7XG4gIGlmICh0eXBlb2YgcGFzcyA9PT0gJ29iamVjdCcgJiYgcGFzcyAhPT0gbnVsbCkgeyAvLyBwYXNzIGlzIG9wdGlvbmFsIGFuZCBjYW4gc3Vic3RpdHV0ZSBmb3Igb3B0aW9uc1xuICAgIG9wdGlvbnMgPSBwYXNzO1xuICB9XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7XG4gICAgICB0eXBlOiAnZnVuY3Rpb24nID09PSB0eXBlb2YgYnRvYSA/ICdiYXNpYycgOiAnYXV0bycsXG4gICAgfVxuICB9XG5cbiAgc3dpdGNoIChvcHRpb25zLnR5cGUpIHtcbiAgICBjYXNlICdiYXNpYyc6XG4gICAgICB0aGlzLnNldCgnQXV0aG9yaXphdGlvbicsICdCYXNpYyAnICsgYnRvYSh1c2VyICsgJzonICsgcGFzcykpO1xuICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnYXV0byc6XG4gICAgICB0aGlzLnVzZXJuYW1lID0gdXNlcjtcbiAgICAgIHRoaXMucGFzc3dvcmQgPSBwYXNzO1xuICAgIGJyZWFrO1xuICAgICAgXG4gICAgY2FzZSAnYmVhcmVyJzogLy8gdXNhZ2Ugd291bGQgYmUgLmF1dGgoYWNjZXNzVG9rZW4sIHsgdHlwZTogJ2JlYXJlcicgfSlcbiAgICAgIHRoaXMuc2V0KCdBdXRob3JpemF0aW9uJywgJ0JlYXJlciAnICsgdXNlcik7XG4gICAgYnJlYWs7ICBcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIHF1ZXJ5LXN0cmluZyBgdmFsYC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgIHJlcXVlc3QuZ2V0KCcvc2hvZXMnKVxuICogICAgIC5xdWVyeSgnc2l6ZT0xMCcpXG4gKiAgICAgLnF1ZXJ5KHsgY29sb3I6ICdibHVlJyB9KVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbih2YWwpe1xuICBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkgdmFsID0gc2VyaWFsaXplKHZhbCk7XG4gIGlmICh2YWwpIHRoaXMuX3F1ZXJ5LnB1c2godmFsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFF1ZXVlIHRoZSBnaXZlbiBgZmlsZWAgYXMgYW4gYXR0YWNobWVudCB0byB0aGUgc3BlY2lmaWVkIGBmaWVsZGAsXG4gKiB3aXRoIG9wdGlvbmFsIGBvcHRpb25zYCAob3IgZmlsZW5hbWUpLlxuICpcbiAqIGBgYCBqc1xuICogcmVxdWVzdC5wb3N0KCcvdXBsb2FkJylcbiAqICAgLmF0dGFjaCgnY29udGVudCcsIG5ldyBCbG9iKFsnPGEgaWQ9XCJhXCI+PGIgaWQ9XCJiXCI+aGV5ITwvYj48L2E+J10sIHsgdHlwZTogXCJ0ZXh0L2h0bWxcIn0pKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmaWVsZFxuICogQHBhcmFtIHtCbG9ifEZpbGV9IGZpbGVcbiAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3QucHJvdG90eXBlLmF0dGFjaCA9IGZ1bmN0aW9uKGZpZWxkLCBmaWxlLCBvcHRpb25zKXtcbiAgaWYgKGZpbGUpIHtcbiAgICBpZiAodGhpcy5fZGF0YSkge1xuICAgICAgdGhyb3cgRXJyb3IoXCJzdXBlcmFnZW50IGNhbid0IG1peCAuc2VuZCgpIGFuZCAuYXR0YWNoKClcIik7XG4gICAgfVxuXG4gICAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQoZmllbGQsIGZpbGUsIG9wdGlvbnMgfHwgZmlsZS5uYW1lKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLl9nZXRGb3JtRGF0YSA9IGZ1bmN0aW9uKCl7XG4gIGlmICghdGhpcy5fZm9ybURhdGEpIHtcbiAgICB0aGlzLl9mb3JtRGF0YSA9IG5ldyByb290LkZvcm1EYXRhKCk7XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2Zvcm1EYXRhO1xufTtcblxuLyoqXG4gKiBJbnZva2UgdGhlIGNhbGxiYWNrIHdpdGggYGVycmAgYW5kIGByZXNgXG4gKiBhbmQgaGFuZGxlIGFyaXR5IGNoZWNrLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtSZXNwb25zZX0gcmVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5jYWxsYmFjayA9IGZ1bmN0aW9uKGVyciwgcmVzKXtcbiAgLy8gY29uc29sZS5sb2codGhpcy5fcmV0cmllcywgdGhpcy5fbWF4UmV0cmllcylcbiAgaWYgKHRoaXMuX21heFJldHJpZXMgJiYgdGhpcy5fcmV0cmllcysrIDwgdGhpcy5fbWF4UmV0cmllcyAmJiBzaG91bGRSZXRyeShlcnIsIHJlcykpIHtcbiAgICByZXR1cm4gdGhpcy5fcmV0cnkoKTtcbiAgfVxuXG4gIHZhciBmbiA9IHRoaXMuX2NhbGxiYWNrO1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuXG4gIGlmIChlcnIpIHtcbiAgICBpZiAodGhpcy5fbWF4UmV0cmllcykgZXJyLnJldHJpZXMgPSB0aGlzLl9yZXRyaWVzIC0gMTtcbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgfVxuXG4gIGZuKGVyciwgcmVzKTtcbn07XG5cbi8qKlxuICogSW52b2tlIGNhbGxiYWNrIHdpdGggeC1kb21haW4gZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuY3Jvc3NEb21haW5FcnJvciA9IGZ1bmN0aW9uKCl7XG4gIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1JlcXVlc3QgaGFzIGJlZW4gdGVybWluYXRlZFxcblBvc3NpYmxlIGNhdXNlczogdGhlIG5ldHdvcmsgaXMgb2ZmbGluZSwgT3JpZ2luIGlzIG5vdCBhbGxvd2VkIGJ5IEFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiwgdGhlIHBhZ2UgaXMgYmVpbmcgdW5sb2FkZWQsIGV0Yy4nKTtcbiAgZXJyLmNyb3NzRG9tYWluID0gdHJ1ZTtcblxuICBlcnIuc3RhdHVzID0gdGhpcy5zdGF0dXM7XG4gIGVyci5tZXRob2QgPSB0aGlzLm1ldGhvZDtcbiAgZXJyLnVybCA9IHRoaXMudXJsO1xuXG4gIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cbi8vIFRoaXMgb25seSB3YXJucywgYmVjYXVzZSB0aGUgcmVxdWVzdCBpcyBzdGlsbCBsaWtlbHkgdG8gd29ya1xuUmVxdWVzdC5wcm90b3R5cGUuYnVmZmVyID0gUmVxdWVzdC5wcm90b3R5cGUuY2EgPSBSZXF1ZXN0LnByb3RvdHlwZS5hZ2VudCA9IGZ1bmN0aW9uKCl7XG4gIGNvbnNvbGUud2FybihcIlRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBUaGlzIHRocm93cywgYmVjYXVzZSBpdCBjYW4ndCBzZW5kL3JlY2VpdmUgZGF0YSBhcyBleHBlY3RlZFxuUmVxdWVzdC5wcm90b3R5cGUucGlwZSA9IFJlcXVlc3QucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oKXtcbiAgdGhyb3cgRXJyb3IoXCJTdHJlYW1pbmcgaXMgbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIHZlcnNpb24gb2Ygc3VwZXJhZ2VudFwiKTtcbn07XG5cbi8qKlxuICogQ29tcG9zZSBxdWVyeXN0cmluZyB0byBhcHBlbmQgdG8gcmVxLnVybFxuICpcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cblJlcXVlc3QucHJvdG90eXBlLl9hcHBlbmRRdWVyeVN0cmluZyA9IGZ1bmN0aW9uKCl7XG4gIHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5LmpvaW4oJyYnKTtcbiAgaWYgKHF1ZXJ5KSB7XG4gICAgdGhpcy51cmwgKz0gKHRoaXMudXJsLmluZGV4T2YoJz8nKSA+PSAwID8gJyYnIDogJz8nKSArIHF1ZXJ5O1xuICB9XG5cbiAgaWYgKHRoaXMuX3NvcnQpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLnVybC5pbmRleE9mKCc/Jyk7XG4gICAgaWYgKGluZGV4ID49IDApIHtcbiAgICAgIHZhciBxdWVyeUFyciA9IHRoaXMudXJsLnN1YnN0cmluZyhpbmRleCArIDEpLnNwbGl0KCcmJyk7XG4gICAgICBpZiAoaXNGdW5jdGlvbih0aGlzLl9zb3J0KSkge1xuICAgICAgICBxdWVyeUFyci5zb3J0KHRoaXMuX3NvcnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlcnlBcnIuc29ydCgpO1xuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSB0aGlzLnVybC5zdWJzdHJpbmcoMCwgaW5kZXgpICsgJz8nICsgcXVlcnlBcnIuam9pbignJicpO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBDaGVjayBpZiBgb2JqYCBpcyBhIGhvc3Qgb2JqZWN0LFxuICogd2UgZG9uJ3Qgd2FudCB0byBzZXJpYWxpemUgdGhlc2UgOilcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblJlcXVlc3QucHJvdG90eXBlLl9pc0hvc3QgPSBmdW5jdGlvbiBfaXNIb3N0KG9iaikge1xuICAvLyBOYXRpdmUgb2JqZWN0cyBzdHJpbmdpZnkgdG8gW29iamVjdCBGaWxlXSwgW29iamVjdCBCbG9iXSwgW29iamVjdCBGb3JtRGF0YV0sIGV0Yy5cbiAgcmV0dXJuIG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iaiAmJiAhQXJyYXkuaXNBcnJheShvYmopICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJztcbn1cblxuLyoqXG4gKiBJbml0aWF0ZSByZXF1ZXN0LCBpbnZva2luZyBjYWxsYmFjayBgZm4ocmVzKWBcbiAqIHdpdGggYW4gaW5zdGFuY2VvZiBgUmVzcG9uc2VgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oZm4pe1xuICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgY29uc29sZS53YXJuKFwiV2FybmluZzogLmVuZCgpIHdhcyBjYWxsZWQgdHdpY2UuIFRoaXMgaXMgbm90IHN1cHBvcnRlZCBpbiBzdXBlcmFnZW50XCIpO1xuICB9XG4gIHRoaXMuX2VuZENhbGxlZCA9IHRydWU7XG5cbiAgLy8gc3RvcmUgY2FsbGJhY2tcbiAgdGhpcy5fY2FsbGJhY2sgPSBmbiB8fCBub29wO1xuXG4gIC8vIHF1ZXJ5c3RyaW5nXG4gIHRoaXMuX2FwcGVuZFF1ZXJ5U3RyaW5nKCk7XG5cbiAgcmV0dXJuIHRoaXMuX2VuZCgpO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuX2VuZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciB4aHIgPSB0aGlzLnhociA9IHJlcXVlc3QuZ2V0WEhSKCk7XG4gIHZhciBkYXRhID0gdGhpcy5fZm9ybURhdGEgfHwgdGhpcy5fZGF0YTtcblxuICB0aGlzLl9zZXRUaW1lb3V0cygpO1xuXG4gIC8vIHN0YXRlIGNoYW5nZVxuICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgcmVhZHlTdGF0ZSA9IHhoci5yZWFkeVN0YXRlO1xuICAgIGlmIChyZWFkeVN0YXRlID49IDIgJiYgc2VsZi5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dChzZWxmLl9yZXNwb25zZVRpbWVvdXRUaW1lcik7XG4gICAgfVxuICAgIGlmICg0ICE9IHJlYWR5U3RhdGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBJbiBJRTksIHJlYWRzIHRvIGFueSBwcm9wZXJ0eSAoZS5nLiBzdGF0dXMpIG9mZiBvZiBhbiBhYm9ydGVkIFhIUiB3aWxsXG4gICAgLy8gcmVzdWx0IGluIHRoZSBlcnJvciBcIkNvdWxkIG5vdCBjb21wbGV0ZSB0aGUgb3BlcmF0aW9uIGR1ZSB0byBlcnJvciBjMDBjMDIzZlwiXG4gICAgdmFyIHN0YXR1cztcbiAgICB0cnkgeyBzdGF0dXMgPSB4aHIuc3RhdHVzIH0gY2F0Y2goZSkgeyBzdGF0dXMgPSAwOyB9XG5cbiAgICBpZiAoIXN0YXR1cykge1xuICAgICAgaWYgKHNlbGYudGltZWRvdXQgfHwgc2VsZi5fYWJvcnRlZCkgcmV0dXJuO1xuICAgICAgcmV0dXJuIHNlbGYuY3Jvc3NEb21haW5FcnJvcigpO1xuICAgIH1cbiAgICBzZWxmLmVtaXQoJ2VuZCcpO1xuICB9O1xuXG4gIC8vIHByb2dyZXNzXG4gIHZhciBoYW5kbGVQcm9ncmVzcyA9IGZ1bmN0aW9uKGRpcmVjdGlvbiwgZSkge1xuICAgIGlmIChlLnRvdGFsID4gMCkge1xuICAgICAgZS5wZXJjZW50ID0gZS5sb2FkZWQgLyBlLnRvdGFsICogMTAwO1xuICAgIH1cbiAgICBlLmRpcmVjdGlvbiA9IGRpcmVjdGlvbjtcbiAgICBzZWxmLmVtaXQoJ3Byb2dyZXNzJywgZSk7XG4gIH1cbiAgaWYgKHRoaXMuaGFzTGlzdGVuZXJzKCdwcm9ncmVzcycpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHhoci5vbnByb2dyZXNzID0gaGFuZGxlUHJvZ3Jlc3MuYmluZChudWxsLCAnZG93bmxvYWQnKTtcbiAgICAgIGlmICh4aHIudXBsb2FkKSB7XG4gICAgICAgIHhoci51cGxvYWQub25wcm9ncmVzcyA9IGhhbmRsZVByb2dyZXNzLmJpbmQobnVsbCwgJ3VwbG9hZCcpO1xuICAgICAgfVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgLy8gQWNjZXNzaW5nIHhoci51cGxvYWQgZmFpbHMgaW4gSUUgZnJvbSBhIHdlYiB3b3JrZXIsIHNvIGp1c3QgcHJldGVuZCBpdCBkb2Vzbid0IGV4aXN0LlxuICAgICAgLy8gUmVwb3J0ZWQgaGVyZTpcbiAgICAgIC8vIGh0dHBzOi8vY29ubmVjdC5taWNyb3NvZnQuY29tL0lFL2ZlZWRiYWNrL2RldGFpbHMvODM3MjQ1L3htbGh0dHByZXF1ZXN0LXVwbG9hZC10aHJvd3MtaW52YWxpZC1hcmd1bWVudC13aGVuLXVzZWQtZnJvbS13ZWItd29ya2VyLWNvbnRleHRcbiAgICB9XG4gIH1cblxuICAvLyBpbml0aWF0ZSByZXF1ZXN0XG4gIHRyeSB7XG4gICAgaWYgKHRoaXMudXNlcm5hbWUgJiYgdGhpcy5wYXNzd29yZCkge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlLCB0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgeGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsLCB0cnVlKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIHNlZSAjMTE0OVxuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKGVycik7XG4gIH1cblxuICAvLyBDT1JTXG4gIGlmICh0aGlzLl93aXRoQ3JlZGVudGlhbHMpIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuXG4gIC8vIGJvZHlcbiAgaWYgKCF0aGlzLl9mb3JtRGF0YSAmJiAnR0VUJyAhPSB0aGlzLm1ldGhvZCAmJiAnSEVBRCcgIT0gdGhpcy5tZXRob2QgJiYgJ3N0cmluZycgIT0gdHlwZW9mIGRhdGEgJiYgIXRoaXMuX2lzSG9zdChkYXRhKSkge1xuICAgIC8vIHNlcmlhbGl6ZSBzdHVmZlxuICAgIHZhciBjb250ZW50VHlwZSA9IHRoaXMuX2hlYWRlclsnY29udGVudC10eXBlJ107XG4gICAgdmFyIHNlcmlhbGl6ZSA9IHRoaXMuX3NlcmlhbGl6ZXIgfHwgcmVxdWVzdC5zZXJpYWxpemVbY29udGVudFR5cGUgPyBjb250ZW50VHlwZS5zcGxpdCgnOycpWzBdIDogJyddO1xuICAgIGlmICghc2VyaWFsaXplICYmIGlzSlNPTihjb250ZW50VHlwZSkpIHtcbiAgICAgIHNlcmlhbGl6ZSA9IHJlcXVlc3Quc2VyaWFsaXplWydhcHBsaWNhdGlvbi9qc29uJ107XG4gICAgfVxuICAgIGlmIChzZXJpYWxpemUpIGRhdGEgPSBzZXJpYWxpemUoZGF0YSk7XG4gIH1cblxuICAvLyBzZXQgaGVhZGVyIGZpZWxkc1xuICBmb3IgKHZhciBmaWVsZCBpbiB0aGlzLmhlYWRlcikge1xuICAgIGlmIChudWxsID09IHRoaXMuaGVhZGVyW2ZpZWxkXSkgY29udGludWU7XG5cbiAgICBpZiAodGhpcy5oZWFkZXIuaGFzT3duUHJvcGVydHkoZmllbGQpKVxuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoZmllbGQsIHRoaXMuaGVhZGVyW2ZpZWxkXSk7XG4gIH1cblxuICBpZiAodGhpcy5fcmVzcG9uc2VUeXBlKSB7XG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9IHRoaXMuX3Jlc3BvbnNlVHlwZTtcbiAgfVxuXG4gIC8vIHNlbmQgc3R1ZmZcbiAgdGhpcy5lbWl0KCdyZXF1ZXN0JywgdGhpcyk7XG5cbiAgLy8gSUUxMSB4aHIuc2VuZCh1bmRlZmluZWQpIHNlbmRzICd1bmRlZmluZWQnIHN0cmluZyBhcyBQT1NUIHBheWxvYWQgKGluc3RlYWQgb2Ygbm90aGluZylcbiAgLy8gV2UgbmVlZCBudWxsIGhlcmUgaWYgZGF0YSBpcyB1bmRlZmluZWRcbiAgeGhyLnNlbmQodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnID8gZGF0YSA6IG51bGwpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR0VUIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5nZXQgPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ0dFVCcsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnF1ZXJ5KGRhdGEpO1xuICBpZiAoZm4pIHJlcS5lbmQoZm4pO1xuICByZXR1cm4gcmVxO1xufTtcblxuLyoqXG4gKiBIRUFEIGB1cmxgIHdpdGggb3B0aW9uYWwgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR8RnVuY3Rpb259IFtkYXRhXSBvciBmblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5oZWFkID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdIRUFEJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogT1BUSU9OUyBxdWVyeSB0byBgdXJsYCB3aXRoIG9wdGlvbmFsIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfEZ1bmN0aW9ufSBbZGF0YV0gb3IgZm5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3Qub3B0aW9ucyA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnT1BUSU9OUycsIHVybCk7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkYXRhKSBmbiA9IGRhdGEsIGRhdGEgPSBudWxsO1xuICBpZiAoZGF0YSkgcmVxLnNlbmQoZGF0YSk7XG4gIGlmIChmbikgcmVxLmVuZChmbik7XG4gIHJldHVybiByZXE7XG59O1xuXG4vKipcbiAqIERFTEVURSBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVsKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnREVMRVRFJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbnJlcXVlc3RbJ2RlbCddID0gZGVsO1xucmVxdWVzdFsnZGVsZXRlJ10gPSBkZWw7XG5cbi8qKlxuICogUEFUQ0ggYHVybGAgd2l0aCBvcHRpb25hbCBgZGF0YWAgYW5kIGNhbGxiYWNrIGBmbihyZXMpYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge01peGVkfSBbZGF0YV1cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtmbl1cbiAqIEByZXR1cm4ge1JlcXVlc3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbnJlcXVlc3QucGF0Y2ggPSBmdW5jdGlvbih1cmwsIGRhdGEsIGZuKXtcbiAgdmFyIHJlcSA9IHJlcXVlc3QoJ1BBVENIJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUE9TVCBgdXJsYCB3aXRoIG9wdGlvbmFsIGBkYXRhYCBhbmQgY2FsbGJhY2sgYGZuKHJlcylgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7TWl4ZWR9IFtkYXRhXVxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxucmVxdWVzdC5wb3N0ID0gZnVuY3Rpb24odXJsLCBkYXRhLCBmbil7XG4gIHZhciByZXEgPSByZXF1ZXN0KCdQT1NUJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG5cbi8qKlxuICogUFVUIGB1cmxgIHdpdGggb3B0aW9uYWwgYGRhdGFgIGFuZCBjYWxsYmFjayBgZm4ocmVzKWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtNaXhlZHxGdW5jdGlvbn0gW2RhdGFdIG9yIGZuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbZm5dXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5yZXF1ZXN0LnB1dCA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgZm4pe1xuICB2YXIgcmVxID0gcmVxdWVzdCgnUFVUJywgdXJsKTtcbiAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGRhdGEpIGZuID0gZGF0YSwgZGF0YSA9IG51bGw7XG4gIGlmIChkYXRhKSByZXEuc2VuZChkYXRhKTtcbiAgaWYgKGZuKSByZXEuZW5kKGZuKTtcbiAgcmV0dXJuIHJlcTtcbn07XG4iLCIvKipcbiAqIENoZWNrIGlmIGBmbmAgaXMgYSBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGZuKSB7XG4gIHZhciB0YWcgPSBpc09iamVjdChmbikgPyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZm4pIDogJyc7XG4gIHJldHVybiB0YWcgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvbjtcbiIsIi8qKlxuICogQ2hlY2sgaWYgYG9iamAgaXMgYW4gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgcmV0dXJuIG51bGwgIT09IG9iaiAmJiAnb2JqZWN0JyA9PT0gdHlwZW9mIG9iajtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdDtcbiIsIi8qKlxuICogTW9kdWxlIG9mIG1peGVkLWluIGZ1bmN0aW9ucyBzaGFyZWQgYmV0d2VlbiBub2RlIGFuZCBjbGllbnQgY29kZVxuICovXG52YXIgaXNPYmplY3QgPSByZXF1aXJlKCcuL2lzLW9iamVjdCcpO1xuXG4vKipcbiAqIEV4cG9zZSBgUmVxdWVzdEJhc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEJhc2U7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgUmVxdWVzdEJhc2VgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gUmVxdWVzdEJhc2Uob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIFJlcXVlc3RCYXNlLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gUmVxdWVzdEJhc2UucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBDbGVhciBwcmV2aW91cyB0aW1lb3V0LlxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2xlYXJUaW1lb3V0ID0gZnVuY3Rpb24gX2NsZWFyVGltZW91dCgpe1xuICBjbGVhclRpbWVvdXQodGhpcy5fdGltZXIpO1xuICBjbGVhclRpbWVvdXQodGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpO1xuICBkZWxldGUgdGhpcy5fdGltZXI7XG4gIGRlbGV0ZSB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lcjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE92ZXJyaWRlIGRlZmF1bHQgcmVzcG9uc2UgYm9keSBwYXJzZXJcbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHRvIGNvbnZlcnQgaW5jb21pbmcgZGF0YSBpbnRvIHJlcXVlc3QuYm9keVxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlKGZuKXtcbiAgdGhpcy5fcGFyc2VyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgZm9ybWF0IG9mIGJpbmFyeSByZXNwb25zZSBib2R5LlxuICogSW4gYnJvd3NlciB2YWxpZCBmb3JtYXRzIGFyZSAnYmxvYicgYW5kICdhcnJheWJ1ZmZlcicsXG4gKiB3aGljaCByZXR1cm4gQmxvYiBhbmQgQXJyYXlCdWZmZXIsIHJlc3BlY3RpdmVseS5cbiAqXG4gKiBJbiBOb2RlIGFsbCB2YWx1ZXMgcmVzdWx0IGluIEJ1ZmZlci5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC5yZXNwb25zZVR5cGUoJ2Jsb2InKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmVzcG9uc2VUeXBlID0gZnVuY3Rpb24odmFsKXtcbiAgdGhpcy5fcmVzcG9uc2VUeXBlID0gdmFsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogT3ZlcnJpZGUgZGVmYXVsdCByZXF1ZXN0IGJvZHkgc2VyaWFsaXplclxuICpcbiAqIFRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgdG8gY29udmVydCBkYXRhIHNldCB2aWEgLnNlbmQgb3IgLmF0dGFjaCBpbnRvIHBheWxvYWQgdG8gc2VuZFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5zZXJpYWxpemUgPSBmdW5jdGlvbiBzZXJpYWxpemUoZm4pe1xuICB0aGlzLl9zZXJpYWxpemVyID0gZm47XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGltZW91dHMuXG4gKlxuICogLSByZXNwb25zZSB0aW1lb3V0IGlzIHRpbWUgYmV0d2VlbiBzZW5kaW5nIHJlcXVlc3QgYW5kIHJlY2VpdmluZyB0aGUgZmlyc3QgYnl0ZSBvZiB0aGUgcmVzcG9uc2UuIEluY2x1ZGVzIEROUyBhbmQgY29ubmVjdGlvbiB0aW1lLlxuICogLSBkZWFkbGluZSBpcyB0aGUgdGltZSBmcm9tIHN0YXJ0IG9mIHRoZSByZXF1ZXN0IHRvIHJlY2VpdmluZyByZXNwb25zZSBib2R5IGluIGZ1bGwuIElmIHRoZSBkZWFkbGluZSBpcyB0b28gc2hvcnQgbGFyZ2UgZmlsZXMgbWF5IG5vdCBsb2FkIGF0IGFsbCBvbiBzbG93IGNvbm5lY3Rpb25zLlxuICpcbiAqIFZhbHVlIG9mIDAgb3IgZmFsc2UgbWVhbnMgbm8gdGltZW91dC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcnxPYmplY3R9IG1zIG9yIHtyZXNwb25zZSwgcmVhZCwgZGVhZGxpbmV9XG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRpbWVvdXQgPSBmdW5jdGlvbiB0aW1lb3V0KG9wdGlvbnMpe1xuICBpZiAoIW9wdGlvbnMgfHwgJ29iamVjdCcgIT09IHR5cGVvZiBvcHRpb25zKSB7XG4gICAgdGhpcy5fdGltZW91dCA9IG9wdGlvbnM7XG4gICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGZvcih2YXIgb3B0aW9uIGluIG9wdGlvbnMpIHtcbiAgICBzd2l0Y2gob3B0aW9uKSB7XG4gICAgICBjYXNlICdkZWFkbGluZSc6XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSBvcHRpb25zLmRlYWRsaW5lO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3Jlc3BvbnNlJzpcbiAgICAgICAgdGhpcy5fcmVzcG9uc2VUaW1lb3V0ID0gb3B0aW9ucy5yZXNwb25zZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb25zb2xlLndhcm4oXCJVbmtub3duIHRpbWVvdXQgb3B0aW9uXCIsIG9wdGlvbik7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgbnVtYmVyIG9mIHJldHJ5IGF0dGVtcHRzIG9uIGVycm9yLlxuICpcbiAqIEZhaWxlZCByZXF1ZXN0cyB3aWxsIGJlIHJldHJpZWQgJ2NvdW50JyB0aW1lcyBpZiB0aW1lb3V0IG9yIGVyci5jb2RlID49IDUwMC5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gY291bnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUucmV0cnkgPSBmdW5jdGlvbiByZXRyeShjb3VudCl7XG4gIC8vIERlZmF1bHQgdG8gMSBpZiBubyBjb3VudCBwYXNzZWQgb3IgdHJ1ZVxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCBjb3VudCA9PT0gdHJ1ZSkgY291bnQgPSAxO1xuICBpZiAoY291bnQgPD0gMCkgY291bnQgPSAwO1xuICB0aGlzLl9tYXhSZXRyaWVzID0gY291bnQ7XG4gIHRoaXMuX3JldHJpZXMgPSAwO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0cnkgcmVxdWVzdFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl9yZXRyeSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuXG4gIC8vIG5vZGVcbiAgaWYgKHRoaXMucmVxKSB7XG4gICAgdGhpcy5yZXEgPSBudWxsO1xuICAgIHRoaXMucmVxID0gdGhpcy5yZXF1ZXN0KCk7XG4gIH1cblxuICB0aGlzLl9hYm9ydGVkID0gZmFsc2U7XG4gIHRoaXMudGltZWRvdXQgPSBmYWxzZTtcblxuICByZXR1cm4gdGhpcy5fZW5kKCk7XG59O1xuXG4vKipcbiAqIFByb21pc2Ugc3VwcG9ydFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlc29sdmVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZWplY3RdXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fVxuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gdGhlbihyZXNvbHZlLCByZWplY3QpIHtcbiAgaWYgKCF0aGlzLl9mdWxsZmlsbGVkUHJvbWlzZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAodGhpcy5fZW5kQ2FsbGVkKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJXYXJuaW5nOiBzdXBlcmFnZW50IHJlcXVlc3Qgd2FzIHNlbnQgdHdpY2UsIGJlY2F1c2UgYm90aCAuZW5kKCkgYW5kIC50aGVuKCkgd2VyZSBjYWxsZWQuIE5ldmVyIGNhbGwgLmVuZCgpIGlmIHlvdSB1c2UgcHJvbWlzZXNcIik7XG4gICAgfVxuICAgIHRoaXMuX2Z1bGxmaWxsZWRQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oaW5uZXJSZXNvbHZlLCBpbm5lclJlamVjdCl7XG4gICAgICBzZWxmLmVuZChmdW5jdGlvbihlcnIsIHJlcyl7XG4gICAgICAgIGlmIChlcnIpIGlubmVyUmVqZWN0KGVycik7IGVsc2UgaW5uZXJSZXNvbHZlKHJlcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gdGhpcy5fZnVsbGZpbGxlZFByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xufVxuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuY2F0Y2ggPSBmdW5jdGlvbihjYikge1xuICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgY2IpO1xufTtcblxuLyoqXG4gKiBBbGxvdyBmb3IgZXh0ZW5zaW9uXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmbikge1xuICBmbih0aGlzKTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5vayA9IGZ1bmN0aW9uKGNiKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgY2IpIHRocm93IEVycm9yKFwiQ2FsbGJhY2sgcmVxdWlyZWRcIik7XG4gIHRoaXMuX29rQ2FsbGJhY2sgPSBjYjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuX2lzUmVzcG9uc2VPSyA9IGZ1bmN0aW9uKHJlcykge1xuICBpZiAoIXJlcykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmICh0aGlzLl9va0NhbGxiYWNrKSB7XG4gICAgcmV0dXJuIHRoaXMuX29rQ2FsbGJhY2socmVzKTtcbiAgfVxuXG4gIHJldHVybiByZXMuc3RhdHVzID49IDIwMCAmJiByZXMuc3RhdHVzIDwgMzAwO1xufTtcblxuXG4vKipcbiAqIEdldCByZXF1ZXN0IGhlYWRlciBgZmllbGRgLlxuICogQ2FzZS1pbnNlbnNpdGl2ZS5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgcmV0dXJuIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogR2V0IGNhc2UtaW5zZW5zaXRpdmUgaGVhZGVyIGBmaWVsZGAgdmFsdWUuXG4gKiBUaGlzIGlzIGEgZGVwcmVjYXRlZCBpbnRlcm5hbCBBUEkuIFVzZSBgLmdldChmaWVsZClgIGluc3RlYWQuXG4gKlxuICogKGdldEhlYWRlciBpcyBubyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5IGJ5IHRoZSBzdXBlcmFnZW50IGNvZGUgYmFzZSlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZmllbGRcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICogQGRlcHJlY2F0ZWRcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZ2V0SGVhZGVyID0gUmVxdWVzdEJhc2UucHJvdG90eXBlLmdldDtcblxuLyoqXG4gKiBTZXQgaGVhZGVyIGBmaWVsZGAgdG8gYHZhbGAsIG9yIG11bHRpcGxlIGZpZWxkcyB3aXRoIG9uZSBvYmplY3QuXG4gKiBDYXNlLWluc2Vuc2l0aXZlLlxuICpcbiAqIEV4YW1wbGVzOlxuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCgnQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKVxuICogICAgICAgIC5zZXQoJ1gtQVBJLUtleScsICdmb29iYXInKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spO1xuICpcbiAqICAgICAgcmVxLmdldCgnLycpXG4gKiAgICAgICAgLnNldCh7IEFjY2VwdDogJ2FwcGxpY2F0aW9uL2pzb24nLCAnWC1BUEktS2V5JzogJ2Zvb2JhcicgfSlcbiAqICAgICAgICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGZpZWxkXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGZpZWxkLCB2YWwpe1xuICBpZiAoaXNPYmplY3QoZmllbGQpKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGZpZWxkKSB7XG4gICAgICB0aGlzLnNldChrZXksIGZpZWxkW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuICB0aGlzLl9oZWFkZXJbZmllbGQudG9Mb3dlckNhc2UoKV0gPSB2YWw7XG4gIHRoaXMuaGVhZGVyW2ZpZWxkXSA9IHZhbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBoZWFkZXIgYGZpZWxkYC5cbiAqIENhc2UtaW5zZW5zaXRpdmUuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiAgICAgIHJlcS5nZXQoJy8nKVxuICogICAgICAgIC51bnNldCgnVXNlci1BZ2VudCcpXG4gKiAgICAgICAgLmVuZChjYWxsYmFjayk7XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS51bnNldCA9IGZ1bmN0aW9uKGZpZWxkKXtcbiAgZGVsZXRlIHRoaXMuX2hlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbiAgZGVsZXRlIHRoaXMuaGVhZGVyW2ZpZWxkXTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdyaXRlIHRoZSBmaWVsZCBgbmFtZWAgYW5kIGB2YWxgLCBvciBtdWx0aXBsZSBmaWVsZHMgd2l0aCBvbmUgb2JqZWN0XG4gKiBmb3IgXCJtdWx0aXBhcnQvZm9ybS1kYXRhXCIgcmVxdWVzdCBib2RpZXMuXG4gKlxuICogYGBgIGpzXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoJ2ZvbycsICdiYXInKVxuICogICAuZW5kKGNhbGxiYWNrKTtcbiAqXG4gKiByZXF1ZXN0LnBvc3QoJy91cGxvYWQnKVxuICogICAuZmllbGQoeyBmb286ICdiYXInLCBiYXo6ICdxdXgnIH0pXG4gKiAgIC5lbmQoY2FsbGJhY2spO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ3xCbG9ifEZpbGV8QnVmZmVyfGZzLlJlYWRTdHJlYW19IHZhbFxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuZmllbGQgPSBmdW5jdGlvbihuYW1lLCB2YWwpIHtcblxuICAvLyBuYW1lIHNob3VsZCBiZSBlaXRoZXIgYSBzdHJpbmcgb3IgYW4gb2JqZWN0LlxuICBpZiAobnVsbCA9PT0gbmFtZSB8fCAgdW5kZWZpbmVkID09PSBuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCcuZmllbGQobmFtZSwgdmFsKSBuYW1lIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9kYXRhKSB7XG4gICAgY29uc29sZS5lcnJvcihcIi5maWVsZCgpIGNhbid0IGJlIHVzZWQgaWYgLnNlbmQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICB9XG5cbiAgaWYgKGlzT2JqZWN0KG5hbWUpKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG5hbWUpIHtcbiAgICAgIHRoaXMuZmllbGQoa2V5LCBuYW1lW2tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICBmb3IgKHZhciBpIGluIHZhbCkge1xuICAgICAgdGhpcy5maWVsZChuYW1lLCB2YWxbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHZhbCBzaG91bGQgYmUgZGVmaW5lZCBub3dcbiAgaWYgKG51bGwgPT09IHZhbCB8fCB1bmRlZmluZWQgPT09IHZhbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignLmZpZWxkKG5hbWUsIHZhbCkgdmFsIGNhbiBub3QgYmUgZW1wdHknKTtcbiAgfVxuICBpZiAoJ2Jvb2xlYW4nID09PSB0eXBlb2YgdmFsKSB7XG4gICAgdmFsID0gJycgKyB2YWw7XG4gIH1cbiAgdGhpcy5fZ2V0Rm9ybURhdGEoKS5hcHBlbmQobmFtZSwgdmFsKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFib3J0IHRoZSByZXF1ZXN0LCBhbmQgY2xlYXIgcG90ZW50aWFsIHRpbWVvdXQuXG4gKlxuICogQHJldHVybiB7UmVxdWVzdH1cbiAqIEBhcGkgcHVibGljXG4gKi9cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCl7XG4gIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbiAgdGhpcy5fYWJvcnRlZCA9IHRydWU7XG4gIHRoaXMueGhyICYmIHRoaXMueGhyLmFib3J0KCk7IC8vIGJyb3dzZXJcbiAgdGhpcy5yZXEgJiYgdGhpcy5yZXEuYWJvcnQoKTsgLy8gbm9kZVxuICB0aGlzLmNsZWFyVGltZW91dCgpO1xuICB0aGlzLmVtaXQoJ2Fib3J0Jyk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbmFibGUgdHJhbnNtaXNzaW9uIG9mIGNvb2tpZXMgd2l0aCB4LWRvbWFpbiByZXF1ZXN0cy5cbiAqXG4gKiBOb3RlIHRoYXQgZm9yIHRoaXMgdG8gd29yayB0aGUgb3JpZ2luIG11c3Qgbm90IGJlXG4gKiB1c2luZyBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiIHdpdGggYSB3aWxkY2FyZCxcbiAqIGFuZCBhbHNvIG11c3Qgc2V0IFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctQ3JlZGVudGlhbHNcIlxuICogdG8gXCJ0cnVlXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUud2l0aENyZWRlbnRpYWxzID0gZnVuY3Rpb24ob24pe1xuICAvLyBUaGlzIGlzIGJyb3dzZXItb25seSBmdW5jdGlvbmFsaXR5LiBOb2RlIHNpZGUgaXMgbm8tb3AuXG4gIGlmKG9uPT11bmRlZmluZWQpIG9uID0gdHJ1ZTtcbiAgdGhpcy5fd2l0aENyZWRlbnRpYWxzID0gb247XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIG1heCByZWRpcmVjdHMgdG8gYG5gLiBEb2VzIG5vdGluZyBpbiBicm93c2VyIFhIUiBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gblxuICogQHJldHVybiB7UmVxdWVzdH0gZm9yIGNoYWluaW5nXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5yZWRpcmVjdHMgPSBmdW5jdGlvbihuKXtcbiAgdGhpcy5fbWF4UmVkaXJlY3RzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbnZlcnQgdG8gYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCAobm90IEpTT04gc3RyaW5nKSBvZiBzY2FsYXIgcHJvcGVydGllcy5cbiAqIE5vdGUgYXMgdGhpcyBtZXRob2QgaXMgZGVzaWduZWQgdG8gcmV0dXJuIGEgdXNlZnVsIG5vbi10aGlzIHZhbHVlLFxuICogaXQgY2Fubm90IGJlIGNoYWluZWQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBkZXNjcmliaW5nIG1ldGhvZCwgdXJsLCBhbmQgZGF0YSBvZiB0aGlzIHJlcXVlc3RcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCl7XG4gIHJldHVybiB7XG4gICAgbWV0aG9kOiB0aGlzLm1ldGhvZCxcbiAgICB1cmw6IHRoaXMudXJsLFxuICAgIGRhdGE6IHRoaXMuX2RhdGEsXG4gICAgaGVhZGVyczogdGhpcy5faGVhZGVyXG4gIH07XG59O1xuXG5cbi8qKlxuICogU2VuZCBgZGF0YWAgYXMgdGhlIHJlcXVlc3QgYm9keSwgZGVmYXVsdGluZyB0aGUgYC50eXBlKClgIHRvIFwianNvblwiIHdoZW5cbiAqIGFuIG9iamVjdCBpcyBnaXZlbi5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiAgICAgICAvLyBtYW51YWwganNvblxuICogICAgICAgcmVxdWVzdC5wb3N0KCcvdXNlcicpXG4gKiAgICAgICAgIC50eXBlKCdqc29uJylcbiAqICAgICAgICAgLnNlbmQoJ3tcIm5hbWVcIjpcInRqXCJ9JylcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBhdXRvIGpzb25cbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAuc2VuZCh7IG5hbWU6ICd0aicgfSlcbiAqICAgICAgICAgLmVuZChjYWxsYmFjaylcbiAqXG4gKiAgICAgICAvLyBtYW51YWwgeC13d3ctZm9ybS11cmxlbmNvZGVkXG4gKiAgICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAgLnR5cGUoJ2Zvcm0nKVxuICogICAgICAgICAuc2VuZCgnbmFtZT10aicpXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogICAgICAgLy8gYXV0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAqICAgICAgIHJlcXVlc3QucG9zdCgnL3VzZXInKVxuICogICAgICAgICAudHlwZSgnZm9ybScpXG4gKiAgICAgICAgIC5zZW5kKHsgbmFtZTogJ3RqJyB9KVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGRlZmF1bHRzIHRvIHgtd3d3LWZvcm0tdXJsZW5jb2RlZFxuICogICAgICByZXF1ZXN0LnBvc3QoJy91c2VyJylcbiAqICAgICAgICAuc2VuZCgnbmFtZT10b2JpJylcbiAqICAgICAgICAuc2VuZCgnc3BlY2llcz1mZXJyZXQnKVxuICogICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhXG4gKiBAcmV0dXJuIHtSZXF1ZXN0fSBmb3IgY2hhaW5pbmdcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLnNlbmQgPSBmdW5jdGlvbihkYXRhKXtcbiAgdmFyIGlzT2JqID0gaXNPYmplY3QoZGF0YSk7XG4gIHZhciB0eXBlID0gdGhpcy5faGVhZGVyWydjb250ZW50LXR5cGUnXTtcblxuICBpZiAodGhpcy5fZm9ybURhdGEpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiLnNlbmQoKSBjYW4ndCBiZSB1c2VkIGlmIC5hdHRhY2goKSBvciAuZmllbGQoKSBpcyB1c2VkLiBQbGVhc2UgdXNlIG9ubHkgLnNlbmQoKSBvciBvbmx5IC5maWVsZCgpICYgLmF0dGFjaCgpXCIpO1xuICB9XG5cbiAgaWYgKGlzT2JqICYmICF0aGlzLl9kYXRhKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSBbXTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICAgIHRoaXMuX2RhdGEgPSB7fTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZGF0YSAmJiB0aGlzLl9kYXRhICYmIHRoaXMuX2lzSG9zdCh0aGlzLl9kYXRhKSkge1xuICAgIHRocm93IEVycm9yKFwiQ2FuJ3QgbWVyZ2UgdGhlc2Ugc2VuZCBjYWxsc1wiKTtcbiAgfVxuXG4gIC8vIG1lcmdlXG4gIGlmIChpc09iaiAmJiBpc09iamVjdCh0aGlzLl9kYXRhKSkge1xuICAgIGZvciAodmFyIGtleSBpbiBkYXRhKSB7XG4gICAgICB0aGlzLl9kYXRhW2tleV0gPSBkYXRhW2tleV07XG4gICAgfVxuICB9IGVsc2UgaWYgKCdzdHJpbmcnID09IHR5cGVvZiBkYXRhKSB7XG4gICAgLy8gZGVmYXVsdCB0byB4LXd3dy1mb3JtLXVybGVuY29kZWRcbiAgICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnZm9ybScpO1xuICAgIHR5cGUgPSB0aGlzLl9oZWFkZXJbJ2NvbnRlbnQtdHlwZSddO1xuICAgIGlmICgnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyA9PSB0eXBlKSB7XG4gICAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YVxuICAgICAgICA/IHRoaXMuX2RhdGEgKyAnJicgKyBkYXRhXG4gICAgICAgIDogZGF0YTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fZGF0YSA9ICh0aGlzLl9kYXRhIHx8ICcnKSArIGRhdGE7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICB9XG5cbiAgaWYgKCFpc09iaiB8fCB0aGlzLl9pc0hvc3QoZGF0YSkpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGRlZmF1bHQgdG8ganNvblxuICBpZiAoIXR5cGUpIHRoaXMudHlwZSgnanNvbicpO1xuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBTb3J0IGBxdWVyeXN0cmluZ2AgYnkgdGhlIHNvcnQgZnVuY3Rpb25cbiAqXG4gKlxuICogRXhhbXBsZXM6XG4gKlxuICogICAgICAgLy8gZGVmYXVsdCBvcmRlclxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoKVxuICogICAgICAgICAuZW5kKGNhbGxiYWNrKVxuICpcbiAqICAgICAgIC8vIGN1c3RvbWl6ZWQgc29ydCBmdW5jdGlvblxuICogICAgICAgcmVxdWVzdC5nZXQoJy91c2VyJylcbiAqICAgICAgICAgLnF1ZXJ5KCduYW1lPU5pY2snKVxuICogICAgICAgICAucXVlcnkoJ3NlYXJjaD1NYW5ueScpXG4gKiAgICAgICAgIC5zb3J0UXVlcnkoZnVuY3Rpb24oYSwgYil7XG4gKiAgICAgICAgICAgcmV0dXJuIGEubGVuZ3RoIC0gYi5sZW5ndGg7XG4gKiAgICAgICAgIH0pXG4gKiAgICAgICAgIC5lbmQoY2FsbGJhY2spXG4gKlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHNvcnRcbiAqIEByZXR1cm4ge1JlcXVlc3R9IGZvciBjaGFpbmluZ1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5SZXF1ZXN0QmFzZS5wcm90b3R5cGUuc29ydFF1ZXJ5ID0gZnVuY3Rpb24oc29ydCkge1xuICAvLyBfc29ydCBkZWZhdWx0IHRvIHRydWUgYnV0IG90aGVyd2lzZSBjYW4gYmUgYSBmdW5jdGlvbiBvciBib29sZWFuXG4gIHRoaXMuX3NvcnQgPSB0eXBlb2Ygc29ydCA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogc29ydDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEludm9rZSBjYWxsYmFjayB3aXRoIHRpbWVvdXQgZXJyb3IuXG4gKlxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuUmVxdWVzdEJhc2UucHJvdG90eXBlLl90aW1lb3V0RXJyb3IgPSBmdW5jdGlvbihyZWFzb24sIHRpbWVvdXQsIGVycm5vKXtcbiAgaWYgKHRoaXMuX2Fib3J0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGVyciA9IG5ldyBFcnJvcihyZWFzb24gKyB0aW1lb3V0ICsgJ21zIGV4Y2VlZGVkJyk7XG4gIGVyci50aW1lb3V0ID0gdGltZW91dDtcbiAgZXJyLmNvZGUgPSAnRUNPTk5BQk9SVEVEJztcbiAgZXJyLmVycm5vID0gZXJybm87XG4gIHRoaXMudGltZWRvdXQgPSB0cnVlO1xuICB0aGlzLmFib3J0KCk7XG4gIHRoaXMuY2FsbGJhY2soZXJyKTtcbn07XG5cblJlcXVlc3RCYXNlLnByb3RvdHlwZS5fc2V0VGltZW91dHMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIGRlYWRsaW5lXG4gIGlmICh0aGlzLl90aW1lb3V0ICYmICF0aGlzLl90aW1lcikge1xuICAgIHRoaXMuX3RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgc2VsZi5fdGltZW91dEVycm9yKCdUaW1lb3V0IG9mICcsIHNlbGYuX3RpbWVvdXQsICdFVElNRScpO1xuICAgIH0sIHRoaXMuX3RpbWVvdXQpO1xuICB9XG4gIC8vIHJlc3BvbnNlIHRpbWVvdXRcbiAgaWYgKHRoaXMuX3Jlc3BvbnNlVGltZW91dCAmJiAhdGhpcy5fcmVzcG9uc2VUaW1lb3V0VGltZXIpIHtcbiAgICB0aGlzLl9yZXNwb25zZVRpbWVvdXRUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHNlbGYuX3RpbWVvdXRFcnJvcignUmVzcG9uc2UgdGltZW91dCBvZiAnLCBzZWxmLl9yZXNwb25zZVRpbWVvdXQsICdFVElNRURPVVQnKTtcbiAgICB9LCB0aGlzLl9yZXNwb25zZVRpbWVvdXQpO1xuICB9XG59XG4iLCJcbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbi8qKlxuICogRXhwb3NlIGBSZXNwb25zZUJhc2VgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gUmVzcG9uc2VCYXNlO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYFJlc3BvbnNlQmFzZWAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBSZXNwb25zZUJhc2Uob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufVxuXG4vKipcbiAqIE1peGluIHRoZSBwcm90b3R5cGUgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIFJlc3BvbnNlQmFzZS5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IFJlc3BvbnNlQmFzZS5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIEdldCBjYXNlLWluc2Vuc2l0aXZlIGBmaWVsZGAgdmFsdWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZpZWxkXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cblJlc3BvbnNlQmFzZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oZmllbGQpe1xuICAgIHJldHVybiB0aGlzLmhlYWRlcltmaWVsZC50b0xvd2VyQ2FzZSgpXTtcbn07XG5cbi8qKlxuICogU2V0IGhlYWRlciByZWxhdGVkIHByb3BlcnRpZXM6XG4gKlxuICogICAtIGAudHlwZWAgdGhlIGNvbnRlbnQgdHlwZSB3aXRob3V0IHBhcmFtc1xuICpcbiAqIEEgcmVzcG9uc2Ugb2YgXCJDb250ZW50LVR5cGU6IHRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIlxuICogd2lsbCBwcm92aWRlIHlvdSB3aXRoIGEgYC50eXBlYCBvZiBcInRleHQvcGxhaW5cIi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRIZWFkZXJQcm9wZXJ0aWVzID0gZnVuY3Rpb24oaGVhZGVyKXtcbiAgICAvLyBUT0RPOiBtb2FyIVxuICAgIC8vIFRPRE86IG1ha2UgdGhpcyBhIHV0aWxcblxuICAgIC8vIGNvbnRlbnQtdHlwZVxuICAgIHZhciBjdCA9IGhlYWRlclsnY29udGVudC10eXBlJ10gfHwgJyc7XG4gICAgdGhpcy50eXBlID0gdXRpbHMudHlwZShjdCk7XG5cbiAgICAvLyBwYXJhbXNcbiAgICB2YXIgcGFyYW1zID0gdXRpbHMucGFyYW1zKGN0KTtcbiAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB0aGlzW2tleV0gPSBwYXJhbXNba2V5XTtcblxuICAgIHRoaXMubGlua3MgPSB7fTtcblxuICAgIC8vIGxpbmtzXG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKGhlYWRlci5saW5rKSB7XG4gICAgICAgICAgICB0aGlzLmxpbmtzID0gdXRpbHMucGFyc2VMaW5rcyhoZWFkZXIubGluayk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gaWdub3JlXG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXQgZmxhZ3Mgc3VjaCBhcyBgLm9rYCBiYXNlZCBvbiBgc3RhdHVzYC5cbiAqXG4gKiBGb3IgZXhhbXBsZSBhIDJ4eCByZXNwb25zZSB3aWxsIGdpdmUgeW91IGEgYC5va2Agb2YgX190cnVlX19cbiAqIHdoZXJlYXMgNXh4IHdpbGwgYmUgX19mYWxzZV9fIGFuZCBgLmVycm9yYCB3aWxsIGJlIF9fdHJ1ZV9fLiBUaGVcbiAqIGAuY2xpZW50RXJyb3JgIGFuZCBgLnNlcnZlckVycm9yYCBhcmUgYWxzbyBhdmFpbGFibGUgdG8gYmUgbW9yZVxuICogc3BlY2lmaWMsIGFuZCBgLnN0YXR1c1R5cGVgIGlzIHRoZSBjbGFzcyBvZiBlcnJvciByYW5naW5nIGZyb20gMS4uNVxuICogc29tZXRpbWVzIHVzZWZ1bCBmb3IgbWFwcGluZyByZXNwb25kIGNvbG9ycyBldGMuXG4gKlxuICogXCJzdWdhclwiIHByb3BlcnRpZXMgYXJlIGFsc28gZGVmaW5lZCBmb3IgY29tbW9uIGNhc2VzLiBDdXJyZW50bHkgcHJvdmlkaW5nOlxuICpcbiAqICAgLSAubm9Db250ZW50XG4gKiAgIC0gLmJhZFJlcXVlc3RcbiAqICAgLSAudW5hdXRob3JpemVkXG4gKiAgIC0gLm5vdEFjY2VwdGFibGVcbiAqICAgLSAubm90Rm91bmRcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gc3RhdHVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5SZXNwb25zZUJhc2UucHJvdG90eXBlLl9zZXRTdGF0dXNQcm9wZXJ0aWVzID0gZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB2YXIgdHlwZSA9IHN0YXR1cyAvIDEwMCB8IDA7XG5cbiAgICAvLyBzdGF0dXMgLyBjbGFzc1xuICAgIHRoaXMuc3RhdHVzID0gdGhpcy5zdGF0dXNDb2RlID0gc3RhdHVzO1xuICAgIHRoaXMuc3RhdHVzVHlwZSA9IHR5cGU7XG5cbiAgICAvLyBiYXNpY3NcbiAgICB0aGlzLmluZm8gPSAxID09IHR5cGU7XG4gICAgdGhpcy5vayA9IDIgPT0gdHlwZTtcbiAgICB0aGlzLnJlZGlyZWN0ID0gMyA9PSB0eXBlO1xuICAgIHRoaXMuY2xpZW50RXJyb3IgPSA0ID09IHR5cGU7XG4gICAgdGhpcy5zZXJ2ZXJFcnJvciA9IDUgPT0gdHlwZTtcbiAgICB0aGlzLmVycm9yID0gKDQgPT0gdHlwZSB8fCA1ID09IHR5cGUpXG4gICAgICAgID8gdGhpcy50b0Vycm9yKClcbiAgICAgICAgOiBmYWxzZTtcblxuICAgIC8vIHN1Z2FyXG4gICAgdGhpcy5hY2NlcHRlZCA9IDIwMiA9PSBzdGF0dXM7XG4gICAgdGhpcy5ub0NvbnRlbnQgPSAyMDQgPT0gc3RhdHVzO1xuICAgIHRoaXMuYmFkUmVxdWVzdCA9IDQwMCA9PSBzdGF0dXM7XG4gICAgdGhpcy51bmF1dGhvcml6ZWQgPSA0MDEgPT0gc3RhdHVzO1xuICAgIHRoaXMubm90QWNjZXB0YWJsZSA9IDQwNiA9PSBzdGF0dXM7XG4gICAgdGhpcy5mb3JiaWRkZW4gPSA0MDMgPT0gc3RhdHVzO1xuICAgIHRoaXMubm90Rm91bmQgPSA0MDQgPT0gc3RhdHVzO1xufTtcbiIsInZhciBFUlJPUl9DT0RFUyA9IFtcbiAgJ0VDT05OUkVTRVQnLFxuICAnRVRJTUVET1VUJyxcbiAgJ0VBRERSSU5GTycsXG4gICdFU09DS0VUVElNRURPVVQnXG5dO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHJlcXVlc3Qgc2hvdWxkIGJlIHJldHJpZWQuXG4gKiAoQm9ycm93ZWQgZnJvbSBzZWdtZW50aW8vc3VwZXJhZ2VudC1yZXRyeSlcbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJcbiAqIEBwYXJhbSB7UmVzcG9uc2V9IFtyZXNdXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzaG91bGRSZXRyeShlcnIsIHJlcykge1xuICBpZiAoZXJyICYmIGVyci5jb2RlICYmIH5FUlJPUl9DT0RFUy5pbmRleE9mKGVyci5jb2RlKSkgcmV0dXJuIHRydWU7XG4gIGlmIChyZXMgJiYgcmVzLnN0YXR1cyAmJiByZXMuc3RhdHVzID49IDUwMCkgcmV0dXJuIHRydWU7XG4gIC8vIFN1cGVyYWdlbnQgdGltZW91dFxuICBpZiAoZXJyICYmICd0aW1lb3V0JyBpbiBlcnIgJiYgZXJyLmNvZGUgPT0gJ0VDT05OQUJPUlRFRCcpIHJldHVybiB0cnVlO1xuICBpZiAoZXJyICYmICdjcm9zc0RvbWFpbicgaW4gZXJyKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufTtcbiIsIlxuLyoqXG4gKiBSZXR1cm4gdGhlIG1pbWUgdHlwZSBmb3IgdGhlIGdpdmVuIGBzdHJgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uKHN0cil7XG4gIHJldHVybiBzdHIuc3BsaXQoLyAqOyAqLykuc2hpZnQoKTtcbn07XG5cbi8qKlxuICogUmV0dXJuIGhlYWRlciBmaWVsZCBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMucGFyYW1zID0gZnVuY3Rpb24oc3RyKXtcbiAgcmV0dXJuIHN0ci5zcGxpdCgvICo7ICovKS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBzdHIpe1xuICAgIHZhciBwYXJ0cyA9IHN0ci5zcGxpdCgvICo9ICovKTtcbiAgICB2YXIga2V5ID0gcGFydHMuc2hpZnQoKTtcbiAgICB2YXIgdmFsID0gcGFydHMuc2hpZnQoKTtcblxuICAgIGlmIChrZXkgJiYgdmFsKSBvYmpba2V5XSA9IHZhbDtcbiAgICByZXR1cm4gb2JqO1xuICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFBhcnNlIExpbmsgaGVhZGVyIGZpZWxkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnBhcnNlTGlua3MgPSBmdW5jdGlvbihzdHIpe1xuICByZXR1cm4gc3RyLnNwbGl0KC8gKiwgKi8pLnJlZHVjZShmdW5jdGlvbihvYmosIHN0cil7XG4gICAgdmFyIHBhcnRzID0gc3RyLnNwbGl0KC8gKjsgKi8pO1xuICAgIHZhciB1cmwgPSBwYXJ0c1swXS5zbGljZSgxLCAtMSk7XG4gICAgdmFyIHJlbCA9IHBhcnRzWzFdLnNwbGl0KC8gKj0gKi8pWzFdLnNsaWNlKDEsIC0xKTtcbiAgICBvYmpbcmVsXSA9IHVybDtcbiAgICByZXR1cm4gb2JqO1xuICB9LCB7fSk7XG59O1xuXG4vKipcbiAqIFN0cmlwIGNvbnRlbnQgcmVsYXRlZCBmaWVsZHMgZnJvbSBgaGVhZGVyYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVyXG4gKiBAcmV0dXJuIHtPYmplY3R9IGhlYWRlclxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5jbGVhbkhlYWRlciA9IGZ1bmN0aW9uKGhlYWRlciwgc2hvdWxkU3RyaXBDb29raWUpe1xuICBkZWxldGUgaGVhZGVyWydjb250ZW50LXR5cGUnXTtcbiAgZGVsZXRlIGhlYWRlclsnY29udGVudC1sZW5ndGgnXTtcbiAgZGVsZXRlIGhlYWRlclsndHJhbnNmZXItZW5jb2RpbmcnXTtcbiAgZGVsZXRlIGhlYWRlclsnaG9zdCddO1xuICBpZiAoc2hvdWxkU3RyaXBDb29raWUpIHtcbiAgICBkZWxldGUgaGVhZGVyWydjb29raWUnXTtcbiAgfVxuICByZXR1cm4gaGVhZGVyO1xufTsiLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ3N1cGVyYWdlbnQnLCAncXVlcnlzdHJpbmcnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnc3VwZXJhZ2VudCcpLCByZXF1aXJlKCdxdWVyeXN0cmluZycpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCA9IGZhY3Rvcnkocm9vdC5zdXBlcmFnZW50LCByb290LnF1ZXJ5c3RyaW5nKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oc3VwZXJhZ2VudCwgcXVlcnlzdHJpbmcpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtb2R1bGUgQXBpQ2xpZW50XHJcbiAgICogQHZlcnNpb24gMS4xLjNcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogTWFuYWdlcyBsb3cgbGV2ZWwgY2xpZW50LXNlcnZlciBjb21tdW5pY2F0aW9ucywgcGFyYW1ldGVyIG1hcnNoYWxsaW5nLCBldGMuIFRoZXJlIHNob3VsZCBub3QgYmUgYW55IG5lZWQgZm9yIGFuXHJcbiAgICogYXBwbGljYXRpb24gdG8gdXNlIHRoaXMgY2xhc3MgZGlyZWN0bHkgLSB0aGUgKkFwaSBhbmQgbW9kZWwgY2xhc3NlcyBwcm92aWRlIHRoZSBwdWJsaWMgQVBJIGZvciB0aGUgc2VydmljZS4gVGhlXHJcbiAgICogY29udGVudHMgb2YgdGhpcyBmaWxlIHNob3VsZCBiZSByZWdhcmRlZCBhcyBpbnRlcm5hbCBidXQgYXJlIGRvY3VtZW50ZWQgZm9yIGNvbXBsZXRlbmVzcy5cclxuICAgKiBAYWxpYXMgbW9kdWxlOkFwaUNsaWVudFxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBiYXNlIFVSTCBhZ2FpbnN0IHdoaWNoIHRvIHJlc29sdmUgZXZlcnkgQVBJIGNhbGwncyAocmVsYXRpdmUpIHBhdGguXHJcbiAgICAgKiBAdHlwZSB7U3RyaW5nfVxyXG4gICAgICogQGRlZmF1bHQgaHR0cDovL2xvY2FsaG9zdDo4MDgwL3YyXHJcbiAgICAgKi9cclxuICAgIHRoaXMuYmFzZVBhdGggPSAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3YyJy5yZXBsYWNlKC9cXC8rJC8sICcnKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2RzIHRvIGJlIGluY2x1ZGVkIGZvciBhbGwgQVBJIGNhbGxzLlxyXG4gICAgICogQHR5cGUge0FycmF5LjxTdHJpbmc+fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmF1dGhlbnRpY2F0aW9ucyA9IHtcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkZWZhdWx0IEhUVFAgaGVhZGVycyB0byBiZSBpbmNsdWRlZCBmb3IgYWxsIEFQSSBjYWxscy5cclxuICAgICAqIEB0eXBlIHtBcnJheS48U3RyaW5nPn1cclxuICAgICAqIEBkZWZhdWx0IHt9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZGVmYXVsdEhlYWRlcnMgPSB7fTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBkZWZhdWx0IEhUVFAgdGltZW91dCBmb3IgYWxsIEFQSSBjYWxscy5cclxuICAgICAqIEB0eXBlIHtOdW1iZXJ9XHJcbiAgICAgKiBAZGVmYXVsdCA2MDAwMFxyXG4gICAgICovXHJcbiAgICB0aGlzLnRpbWVvdXQgPSA2MDAwMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIElmIHNldCB0byBmYWxzZSBhbiBhZGRpdGlvbmFsIHRpbWVzdGFtcCBwYXJhbWV0ZXIgaXMgYWRkZWQgdG8gYWxsIEFQSSBHRVQgY2FsbHMgdG9cclxuICAgICAqIHByZXZlbnQgYnJvd3NlciBjYWNoaW5nXHJcbiAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cclxuICAgICAqIEBkZWZhdWx0IHRydWVcclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWNoZSA9IHRydWU7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJZiBzZXQgdG8gdHJ1ZSwgdGhlIGNsaWVudCB3aWxsIHNhdmUgdGhlIGNvb2tpZXMgZnJvbSBlYWNoIHNlcnZlclxyXG4gICAgICogcmVzcG9uc2UsIGFuZCByZXR1cm4gdGhlbSBpbiB0aGUgbmV4dCByZXF1ZXN0LlxyXG4gICAgICogQGRlZmF1bHQgZmFsc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5lbmFibGVDb29raWVzID0gZmFsc2U7XHJcblxyXG4gICAgLypcclxuICAgICAqIFVzZWQgdG8gc2F2ZSBhbmQgcmV0dXJuIGNvb2tpZXMgaW4gYSBub2RlLmpzIChub24tYnJvd3Nlcikgc2V0dGluZyxcclxuICAgICAqIGlmIHRoaXMuZW5hYmxlQ29va2llcyBpcyBzZXQgdG8gdHJ1ZS5cclxuICAgICAqL1xyXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgIHRoaXMuYWdlbnQgPSBuZXcgc3VwZXJhZ2VudC5hZ2VudCgpO1xyXG4gICAgfVxyXG5cclxuICAgICAgLypcclxuICAgICAgICogQWxsb3cgdXNlciB0byBvdmVycmlkZSBzdXBlcmFnZW50IGFnZW50XHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLnJlcXVlc3RBZ2VudCA9IG51bGw7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBmb3IgYW4gYWN0dWFsIHBhcmFtZXRlci5cclxuICAgKiBAcGFyYW0gcGFyYW0gVGhlIGFjdHVhbCBwYXJhbWV0ZXIuXHJcbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiA8Y29kZT5wYXJhbTwvY29kZT4uXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUucGFyYW1Ub1N0cmluZyA9IGZ1bmN0aW9uKHBhcmFtKSB7XHJcbiAgICBpZiAocGFyYW0gPT0gdW5kZWZpbmVkIHx8IHBhcmFtID09IG51bGwpIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gICAgaWYgKHBhcmFtIGluc3RhbmNlb2YgRGF0ZSkge1xyXG4gICAgICByZXR1cm4gcGFyYW0udG9KU09OKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyYW0udG9TdHJpbmcoKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBCdWlsZHMgZnVsbCBVUkwgYnkgYXBwZW5kaW5nIHRoZSBnaXZlbiBwYXRoIHRvIHRoZSBiYXNlIFVSTCBhbmQgcmVwbGFjaW5nIHBhdGggcGFyYW1ldGVyIHBsYWNlLWhvbGRlcnMgd2l0aCBwYXJhbWV0ZXIgdmFsdWVzLlxyXG4gICAqIE5PVEU6IHF1ZXJ5IHBhcmFtZXRlcnMgYXJlIG5vdCBoYW5kbGVkIGhlcmUuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggdG8gYXBwZW5kIHRvIHRoZSBiYXNlIFVSTC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gcGF0aFBhcmFtcyBUaGUgcGFyYW1ldGVyIHZhbHVlcyB0byBhcHBlbmQuXHJcbiAgICogQHJldHVybnMge1N0cmluZ30gVGhlIGVuY29kZWQgcGF0aCB3aXRoIHBhcmFtZXRlciB2YWx1ZXMgc3Vic3RpdHV0ZWQuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUuYnVpbGRVcmwgPSBmdW5jdGlvbihwYXRoLCBwYXRoUGFyYW1zKSB7XHJcbiAgICBpZiAoIXBhdGgubWF0Y2goL15cXC8vKSkge1xyXG4gICAgICBwYXRoID0gJy8nICsgcGF0aDtcclxuICAgIH1cclxuICAgIHZhciB1cmwgPSB0aGlzLmJhc2VQYXRoICsgcGF0aDtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB1cmwgPSB1cmwucmVwbGFjZSgvXFx7KFtcXHctXSspXFx9L2csIGZ1bmN0aW9uKGZ1bGxNYXRjaCwga2V5KSB7XHJcbiAgICAgIHZhciB2YWx1ZTtcclxuICAgICAgaWYgKHBhdGhQYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgIHZhbHVlID0gX3RoaXMucGFyYW1Ub1N0cmluZyhwYXRoUGFyYW1zW2tleV0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhbHVlID0gZnVsbE1hdGNoO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gdXJsO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSBnaXZlbiBjb250ZW50IHR5cGUgcmVwcmVzZW50cyBKU09OLjxicj5cclxuICAgKiBKU09OIGNvbnRlbnQgdHlwZSBleGFtcGxlczo8YnI+XHJcbiAgICogPHVsPlxyXG4gICAqIDxsaT5hcHBsaWNhdGlvbi9qc29uPC9saT5cclxuICAgKiA8bGk+YXBwbGljYXRpb24vanNvbjsgY2hhcnNldD1VVEY4PC9saT5cclxuICAgKiA8bGk+QVBQTElDQVRJT04vSlNPTjwvbGk+XHJcbiAgICogPC91bD5cclxuICAgKiBAcGFyYW0ge1N0cmluZ30gY29udGVudFR5cGUgVGhlIE1JTUUgY29udGVudCB0eXBlIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiA8Y29kZT5jb250ZW50VHlwZTwvY29kZT4gcmVwcmVzZW50cyBKU09OLCBvdGhlcndpc2UgPGNvZGU+ZmFsc2U8L2NvZGU+LlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLmlzSnNvbk1pbWUgPSBmdW5jdGlvbihjb250ZW50VHlwZSkge1xyXG4gICAgcmV0dXJuIEJvb2xlYW4oY29udGVudFR5cGUgIT0gbnVsbCAmJiBjb250ZW50VHlwZS5tYXRjaCgvXmFwcGxpY2F0aW9uXFwvanNvbig7LiopPyQvaSkpO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENob29zZXMgYSBjb250ZW50IHR5cGUgZnJvbSB0aGUgZ2l2ZW4gYXJyYXksIHdpdGggSlNPTiBwcmVmZXJyZWQ7IGkuZS4gcmV0dXJuIEpTT04gaWYgaW5jbHVkZWQsIG90aGVyd2lzZSByZXR1cm4gdGhlIGZpcnN0LlxyXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGNvbnRlbnRUeXBlc1xyXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBjaG9zZW4gY29udGVudCB0eXBlLCBwcmVmZXJyaW5nIEpTT04uXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUuanNvblByZWZlcnJlZE1pbWUgPSBmdW5jdGlvbihjb250ZW50VHlwZXMpIHtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29udGVudFR5cGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmICh0aGlzLmlzSnNvbk1pbWUoY29udGVudFR5cGVzW2ldKSkge1xyXG4gICAgICAgIHJldHVybiBjb250ZW50VHlwZXNbaV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBjb250ZW50VHlwZXNbMF07XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIGdpdmVuIHBhcmFtZXRlciB2YWx1ZSByZXByZXNlbnRzIGZpbGUtbGlrZSBjb250ZW50LlxyXG4gICAqIEBwYXJhbSBwYXJhbSBUaGUgcGFyYW1ldGVyIHRvIGNoZWNrLlxyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSA8Y29kZT50cnVlPC9jb2RlPiBpZiA8Y29kZT5wYXJhbTwvY29kZT4gcmVwcmVzZW50cyBhIGZpbGUuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUuaXNGaWxlUGFyYW0gPSBmdW5jdGlvbihwYXJhbSkge1xyXG4gICAgLy8gZnMuUmVhZFN0cmVhbSBpbiBOb2RlLmpzIGFuZCBFbGVjdHJvbiAoYnV0IG5vdCBpbiBydW50aW1lIGxpa2UgYnJvd3NlcmlmeSlcclxuICAgIGlmICh0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICB2YXIgZnM7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgZnMgPSByZXF1aXJlKCdmcycpO1xyXG4gICAgICB9IGNhdGNoIChlcnIpIHt9XHJcbiAgICAgIGlmIChmcyAmJiBmcy5SZWFkU3RyZWFtICYmIHBhcmFtIGluc3RhbmNlb2YgZnMuUmVhZFN0cmVhbSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyBCdWZmZXIgaW4gTm9kZS5qc1xyXG4gICAgaWYgKHR5cGVvZiBCdWZmZXIgPT09ICdmdW5jdGlvbicgJiYgcGFyYW0gaW5zdGFuY2VvZiBCdWZmZXIpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICAvLyBCbG9iIGluIGJyb3dzZXJcclxuICAgIGlmICh0eXBlb2YgQmxvYiA9PT0gJ2Z1bmN0aW9uJyAmJiBwYXJhbSBpbnN0YW5jZW9mIEJsb2IpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICAvLyBGaWxlIGluIGJyb3dzZXIgKGl0IHNlZW1zIEZpbGUgb2JqZWN0IGlzIGFsc28gaW5zdGFuY2Ugb2YgQmxvYiwgYnV0IGtlZXAgdGhpcyBmb3Igc2FmZSlcclxuICAgIGlmICh0eXBlb2YgRmlsZSA9PT0gJ2Z1bmN0aW9uJyAmJiBwYXJhbSBpbnN0YW5jZW9mIEZpbGUpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogTm9ybWFsaXplcyBwYXJhbWV0ZXIgdmFsdWVzOlxyXG4gICAqIDx1bD5cclxuICAgKiA8bGk+cmVtb3ZlIG5pbHM8L2xpPlxyXG4gICAqIDxsaT5rZWVwIGZpbGVzIGFuZCBhcnJheXM8L2xpPlxyXG4gICAqIDxsaT5mb3JtYXQgdG8gc3RyaW5nIHdpdGggYHBhcmFtVG9TdHJpbmdgIGZvciBvdGhlciBjYXNlczwvbGk+XHJcbiAgICogPC91bD5cclxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBwYXJhbXMgVGhlIHBhcmFtZXRlcnMgYXMgb2JqZWN0IHByb3BlcnRpZXMuXHJcbiAgICogQHJldHVybnMge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBub3JtYWxpemVkIHBhcmFtZXRlcnMuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUubm9ybWFsaXplUGFyYW1zID0gZnVuY3Rpb24ocGFyYW1zKSB7XHJcbiAgICB2YXIgbmV3UGFyYW1zID0ge307XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gcGFyYW1zKSB7XHJcbiAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBwYXJhbXNba2V5XSAhPSB1bmRlZmluZWQgJiYgcGFyYW1zW2tleV0gIT0gbnVsbCkge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcmFtc1trZXldO1xyXG4gICAgICAgIGlmICh0aGlzLmlzRmlsZVBhcmFtKHZhbHVlKSB8fCBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG4gICAgICAgICAgbmV3UGFyYW1zW2tleV0gPSB2YWx1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbmV3UGFyYW1zW2tleV0gPSB0aGlzLnBhcmFtVG9TdHJpbmcodmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ld1BhcmFtcztcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBFbnVtZXJhdGlvbiBvZiBjb2xsZWN0aW9uIGZvcm1hdCBzZXBhcmF0b3Igc3RyYXRlZ2llcy5cclxuICAgKiBAZW51bSB7U3RyaW5nfVxyXG4gICAqIEByZWFkb25seVxyXG4gICAqL1xyXG4gIGV4cG9ydHMuQ29sbGVjdGlvbkZvcm1hdEVudW0gPSB7XHJcbiAgICAvKipcclxuICAgICAqIENvbW1hLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5jc3Y8L2NvZGU+XHJcbiAgICAgKiBAY29uc3RcclxuICAgICAqL1xyXG4gICAgQ1NWOiAnLCcsXHJcbiAgICAvKipcclxuICAgICAqIFNwYWNlLXNlcGFyYXRlZCB2YWx1ZXMuIFZhbHVlOiA8Y29kZT5zc3Y8L2NvZGU+XHJcbiAgICAgKiBAY29uc3RcclxuICAgICAqL1xyXG4gICAgU1NWOiAnICcsXHJcbiAgICAvKipcclxuICAgICAqIFRhYi1zZXBhcmF0ZWQgdmFsdWVzLiBWYWx1ZTogPGNvZGU+dHN2PC9jb2RlPlxyXG4gICAgICogQGNvbnN0XHJcbiAgICAgKi9cclxuICAgIFRTVjogJ1xcdCcsXHJcbiAgICAvKipcclxuICAgICAqIFBpcGUofCktc2VwYXJhdGVkIHZhbHVlcy4gVmFsdWU6IDxjb2RlPnBpcGVzPC9jb2RlPlxyXG4gICAgICogQGNvbnN0XHJcbiAgICAgKi9cclxuICAgIFBJUEVTOiAnfCcsXHJcbiAgICAvKipcclxuICAgICAqIE5hdGl2ZSBhcnJheS4gVmFsdWU6IDxjb2RlPm11bHRpPC9jb2RlPlxyXG4gICAgICogQGNvbnN0XHJcbiAgICAgKi9cclxuICAgIE1VTFRJOiAnbXVsdGknXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQnVpbGRzIGEgc3RyaW5nIHJlcHJlc2VudGF0aW9uIG9mIGFuIGFycmF5LXR5cGUgYWN0dWFsIHBhcmFtZXRlciwgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBjb2xsZWN0aW9uIGZvcm1hdC5cclxuICAgKiBAcGFyYW0ge0FycmF5fSBwYXJhbSBBbiBhcnJheSBwYXJhbWV0ZXIuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50LkNvbGxlY3Rpb25Gb3JtYXRFbnVtfSBjb2xsZWN0aW9uRm9ybWF0IFRoZSBhcnJheSBlbGVtZW50IHNlcGFyYXRvciBzdHJhdGVneS5cclxuICAgKiBAcmV0dXJucyB7U3RyaW5nfEFycmF5fSBBIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGUgc3VwcGxpZWQgY29sbGVjdGlvbiwgdXNpbmcgdGhlIHNwZWNpZmllZCBkZWxpbWl0ZXIuIFJldHVybnNcclxuICAgKiA8Y29kZT5wYXJhbTwvY29kZT4gYXMgaXMgaWYgPGNvZGU+Y29sbGVjdGlvbkZvcm1hdDwvY29kZT4gaXMgPGNvZGU+bXVsdGk8L2NvZGU+LlxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlLmJ1aWxkQ29sbGVjdGlvblBhcmFtID0gZnVuY3Rpb24gYnVpbGRDb2xsZWN0aW9uUGFyYW0ocGFyYW0sIGNvbGxlY3Rpb25Gb3JtYXQpIHtcclxuICAgIGlmIChwYXJhbSA9PSBudWxsKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgc3dpdGNoIChjb2xsZWN0aW9uRm9ybWF0KSB7XHJcbiAgICAgIGNhc2UgJ2Nzdic6XHJcbiAgICAgICAgcmV0dXJuIHBhcmFtLm1hcCh0aGlzLnBhcmFtVG9TdHJpbmcpLmpvaW4oJywnKTtcclxuICAgICAgY2FzZSAnc3N2JzpcclxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZykuam9pbignICcpO1xyXG4gICAgICBjYXNlICd0c3YnOlxyXG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCdcXHQnKTtcclxuICAgICAgY2FzZSAncGlwZXMnOlxyXG4gICAgICAgIHJldHVybiBwYXJhbS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5qb2luKCd8Jyk7XHJcbiAgICAgIGNhc2UgJ211bHRpJzpcclxuICAgICAgICAvLyByZXR1cm4gdGhlIGFycmF5IGRpcmVjdGx5IGFzIFN1cGVyQWdlbnQgd2lsbCBoYW5kbGUgaXQgYXMgZXhwZWN0ZWRcclxuICAgICAgICByZXR1cm4gcGFyYW0ubWFwKHRoaXMucGFyYW1Ub1N0cmluZyk7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGNvbGxlY3Rpb24gZm9ybWF0OiAnICsgY29sbGVjdGlvbkZvcm1hdCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQXBwbGllcyBhdXRoZW50aWNhdGlvbiBoZWFkZXJzIHRvIHRoZSByZXF1ZXN0LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSByZXF1ZXN0IFRoZSByZXF1ZXN0IG9iamVjdCBjcmVhdGVkIGJ5IGEgPGNvZGU+c3VwZXJhZ2VudCgpPC9jb2RlPiBjYWxsLlxyXG4gICAqIEBwYXJhbSB7QXJyYXkuPFN0cmluZz59IGF1dGhOYW1lcyBBbiBhcnJheSBvZiBhdXRoZW50aWNhdGlvbiBtZXRob2QgbmFtZXMuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUuYXBwbHlBdXRoVG9SZXF1ZXN0ID0gZnVuY3Rpb24ocmVxdWVzdCwgYXV0aE5hbWVzKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgYXV0aE5hbWVzLmZvckVhY2goZnVuY3Rpb24oYXV0aE5hbWUpIHtcclxuICAgICAgdmFyIGF1dGggPSBfdGhpcy5hdXRoZW50aWNhdGlvbnNbYXV0aE5hbWVdO1xyXG4gICAgICBzd2l0Y2ggKGF1dGgudHlwZSkge1xyXG4gICAgICAgIGNhc2UgJ2Jhc2ljJzpcclxuICAgICAgICAgIGlmIChhdXRoLnVzZXJuYW1lIHx8IGF1dGgucGFzc3dvcmQpIHtcclxuICAgICAgICAgICAgcmVxdWVzdC5hdXRoKGF1dGgudXNlcm5hbWUgfHwgJycsIGF1dGgucGFzc3dvcmQgfHwgJycpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAnYXBpS2V5JzpcclxuICAgICAgICAgIGlmIChhdXRoLmFwaUtleSkge1xyXG4gICAgICAgICAgICB2YXIgZGF0YSA9IHt9O1xyXG4gICAgICAgICAgICBpZiAoYXV0aC5hcGlLZXlQcmVmaXgpIHtcclxuICAgICAgICAgICAgICBkYXRhW2F1dGgubmFtZV0gPSBhdXRoLmFwaUtleVByZWZpeCArICcgJyArIGF1dGguYXBpS2V5O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIGRhdGFbYXV0aC5uYW1lXSA9IGF1dGguYXBpS2V5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChhdXRoWydpbiddID09PSAnaGVhZGVyJykge1xyXG4gICAgICAgICAgICAgIHJlcXVlc3Quc2V0KGRhdGEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHJlcXVlc3QucXVlcnkoZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgJ29hdXRoMic6XHJcbiAgICAgICAgICBpZiAoYXV0aC5hY2Nlc3NUb2tlbikge1xyXG4gICAgICAgICAgICByZXF1ZXN0LnNldCh7J0F1dGhvcml6YXRpb24nOiAnQmVhcmVyICcgKyBhdXRoLmFjY2Vzc1Rva2VufSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGF1dGhlbnRpY2F0aW9uIHR5cGU6ICcgKyBhdXRoLnR5cGUpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBEZXNlcmlhbGl6ZXMgYW4gSFRUUCByZXNwb25zZSBib2R5IGludG8gYSB2YWx1ZSBvZiB0aGUgc3BlY2lmaWVkIHR5cGUuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIEEgU3VwZXJBZ2VudCByZXNwb25zZSBvYmplY3QuXHJcbiAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5LjxTdHJpbmc+fE9iamVjdC48U3RyaW5nLCBPYmplY3Q+fEZ1bmN0aW9uKX0gcmV0dXJuVHlwZSBUaGUgdHlwZSB0byByZXR1cm4uIFBhc3MgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlc1xyXG4gICAqIG9yIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgYSBjb21wbGV4IHR5cGUuIFBhc3MgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgdHlwZSBuYW1lIHRvIHJldHVybiBhbiBhcnJheSBvZiB0aGF0IHR5cGUuIFRvXHJcbiAgICogcmV0dXJuIGFuIG9iamVjdCwgcGFzcyBhbiBvYmplY3Qgd2l0aCBvbmUgcHJvcGVydHkgd2hvc2UgbmFtZSBpcyB0aGUga2V5IHR5cGUgYW5kIHdob3NlIHZhbHVlIGlzIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlIHR5cGU6XHJcbiAgICogYWxsIHByb3BlcnRpZXMgb24gPGNvZGU+ZGF0YTxjb2RlPiB3aWxsIGJlIGNvbnZlcnRlZCB0byB0aGlzIHR5cGUuXHJcbiAgICogQHJldHVybnMgQSB2YWx1ZSBvZiB0aGUgc3BlY2lmaWVkIHR5cGUuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGUuZGVzZXJpYWxpemUgPSBmdW5jdGlvbiBkZXNlcmlhbGl6ZShyZXNwb25zZSwgcmV0dXJuVHlwZSkge1xyXG4gICAgaWYgKHJlc3BvbnNlID09IG51bGwgfHwgcmV0dXJuVHlwZSA9PSBudWxsIHx8IHJlc3BvbnNlLnN0YXR1cyA9PSAyMDQpIHtcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICAvLyBSZWx5IG9uIFN1cGVyQWdlbnQgZm9yIHBhcnNpbmcgcmVzcG9uc2UgYm9keS5cclxuICAgIC8vIFNlZSBodHRwOi8vdmlzaW9ubWVkaWEuZ2l0aHViLmlvL3N1cGVyYWdlbnQvI3BhcnNpbmctcmVzcG9uc2UtYm9kaWVzXHJcbiAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmJvZHk7XHJcbiAgICBpZiAoZGF0YSA9PSBudWxsIHx8ICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGRhdGEubGVuZ3RoID09PSAndW5kZWZpbmVkJyAmJiAhT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoKSkge1xyXG4gICAgICAvLyBTdXBlckFnZW50IGRvZXMgbm90IGFsd2F5cyBwcm9kdWNlIGEgYm9keTsgdXNlIHRoZSB1bnBhcnNlZCByZXNwb25zZSBhcyBhIGZhbGxiYWNrXHJcbiAgICAgIGRhdGEgPSByZXNwb25zZS50ZXh0O1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhLCByZXR1cm5UeXBlKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvbi5cclxuICAgKiBAY2FsbGJhY2sgbW9kdWxlOkFwaUNsaWVudH5jYWxsQXBpQ2FsbGJhY2tcclxuICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAqIEBwYXJhbSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBJbnZva2VzIHRoZSBSRVNUIHNlcnZpY2UgdXNpbmcgdGhlIHN1cHBsaWVkIHNldHRpbmdzIGFuZCBwYXJhbWV0ZXJzLlxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBiYXNlIFVSTCB0byBpbnZva2UuXHJcbiAgICogQHBhcmFtIHtTdHJpbmd9IGh0dHBNZXRob2QgVGhlIEhUVFAgbWV0aG9kIHRvIHVzZS5cclxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBTdHJpbmc+fSBwYXRoUGFyYW1zIEEgbWFwIG9mIHBhdGggcGFyYW1ldGVycyBhbmQgdGhlaXIgdmFsdWVzLlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0LjxTdHJpbmcsIE9iamVjdD59IHF1ZXJ5UGFyYW1zIEEgbWFwIG9mIHF1ZXJ5IHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cclxuICAgKiBAcGFyYW0ge09iamVjdC48U3RyaW5nLCBPYmplY3Q+fSBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgQSBtYXAgb2YgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXHJcbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gaGVhZGVyUGFyYW1zIEEgbWFwIG9mIGhlYWRlciBwYXJhbWV0ZXJzIGFuZCB0aGVpciB2YWx1ZXMuXHJcbiAgICogQHBhcmFtIHtPYmplY3QuPFN0cmluZywgT2JqZWN0Pn0gZm9ybVBhcmFtcyBBIG1hcCBvZiBmb3JtIHBhcmFtZXRlcnMgYW5kIHRoZWlyIHZhbHVlcy5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gYm9keVBhcmFtIFRoZSB2YWx1ZSB0byBwYXNzIGFzIHRoZSByZXF1ZXN0IGJvZHkuXHJcbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gYXV0aE5hbWVzIEFuIGFycmF5IG9mIGF1dGhlbnRpY2F0aW9uIHR5cGUgbmFtZXMuXHJcbiAgICogQHBhcmFtIHtBcnJheS48U3RyaW5nPn0gY29udGVudFR5cGVzIEFuIGFycmF5IG9mIHJlcXVlc3QgTUlNRSB0eXBlcy5cclxuICAgKiBAcGFyYW0ge0FycmF5LjxTdHJpbmc+fSBhY2NlcHRzIEFuIGFycmF5IG9mIGFjY2VwdGFibGUgcmVzcG9uc2UgTUlNRSB0eXBlcy5cclxuICAgKiBAcGFyYW0geyhTdHJpbmd8QXJyYXl8T2JqZWN0RnVuY3Rpb24pfSByZXR1cm5UeXBlIFRoZSByZXF1aXJlZCB0eXBlIHRvIHJldHVybjsgY2FuIGJlIGEgc3RyaW5nIGZvciBzaW1wbGUgdHlwZXMgb3IgdGhlXHJcbiAgICogY29uc3RydWN0b3IgZm9yIGEgY29tcGxleCB0eXBlLlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH5jYWxsQXBpQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbi5cclxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgU3VwZXJBZ2VudCByZXF1ZXN0IG9iamVjdC5cclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZS5jYWxsQXBpID0gZnVuY3Rpb24gY2FsbEFwaShwYXRoLCBodHRwTWV0aG9kLCBwYXRoUGFyYW1zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgYm9keVBhcmFtLCBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5UeXBlLCBjYWxsYmFjaykge1xyXG5cclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICB2YXIgdXJsID0gdGhpcy5idWlsZFVybChwYXRoLCBwYXRoUGFyYW1zKTtcclxuICAgIHZhciByZXF1ZXN0ID0gc3VwZXJhZ2VudChodHRwTWV0aG9kLCB1cmwpO1xyXG5cclxuICAgIC8vIGFwcGx5IGF1dGhlbnRpY2F0aW9uc1xyXG4gICAgdGhpcy5hcHBseUF1dGhUb1JlcXVlc3QocmVxdWVzdCwgYXV0aE5hbWVzKTtcclxuXHJcbiAgICAgIC8vIHNldCBjb2xsZWN0aW9uIHF1ZXJ5IHBhcmFtZXRlcnNcclxuICAgICAgZm9yICh2YXIga2V5IGluIGNvbGxlY3Rpb25RdWVyeVBhcmFtcykge1xyXG4gICAgICAgICAgaWYgKGNvbGxlY3Rpb25RdWVyeVBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgICAgdmFyIHBhcmFtID0gY29sbGVjdGlvblF1ZXJ5UGFyYW1zW2tleV07XHJcbiAgICAgICAgICAgICAgaWYgKHBhcmFtLmNvbGxlY3Rpb25Gb3JtYXQgPT09ICdjc3YnKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIFN1cGVyQWdlbnQgbm9ybWFsbHkgcGVyY2VudC1lbmNvZGVzIGFsbCByZXNlcnZlZCBjaGFyYWN0ZXJzIGluIGEgcXVlcnkgcGFyYW1ldGVyLiBIb3dldmVyLFxyXG4gICAgICAgICAgICAgICAgICAvLyBjb21tYXMgYXJlIHVzZWQgYXMgZGVsaW1pdGVycyBmb3IgdGhlICdjc3YnIGNvbGxlY3Rpb25Gb3JtYXQgc28gdGhleSBtdXN0IG5vdCBiZSBlbmNvZGVkLiBXZVxyXG4gICAgICAgICAgICAgICAgICAvLyBtdXN0IHRoZXJlZm9yZSBjb25zdHJ1Y3QgYW5kIGVuY29kZSAnY3N2JyBjb2xsZWN0aW9uIHF1ZXJ5IHBhcmFtZXRlcnMgbWFudWFsbHkuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChwYXJhbS52YWx1ZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbS52YWx1ZS5tYXAodGhpcy5wYXJhbVRvU3RyaW5nKS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKCcsJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0LnF1ZXJ5KGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCIgKyB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAvLyBBbGwgb3RoZXIgY29sbGVjdGlvbiBxdWVyeSBwYXJhbWV0ZXJzIHNob3VsZCBiZSB0cmVhdGVkIGFzIG9yZGluYXJ5IHF1ZXJ5IHBhcmFtZXRlcnMuXHJcbiAgICAgICAgICAgICAgICAgIHF1ZXJ5UGFyYW1zW2tleV0gPSB0aGlzLmJ1aWxkQ29sbGVjdGlvblBhcmFtKHBhcmFtLnZhbHVlLCBwYXJhbS5jb2xsZWN0aW9uRm9ybWF0KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAvLyBzZXQgcXVlcnkgcGFyYW1ldGVyc1xyXG4gICAgaWYgKGh0dHBNZXRob2QudG9VcHBlckNhc2UoKSA9PT0gJ0dFVCcgJiYgdGhpcy5jYWNoZSA9PT0gZmFsc2UpIHtcclxuICAgICAgICBxdWVyeVBhcmFtc1snXyddID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICB9XHJcbiAgICByZXF1ZXN0LnF1ZXJ5KHRoaXMubm9ybWFsaXplUGFyYW1zKHF1ZXJ5UGFyYW1zKSk7XHJcblxyXG4gICAgLy8gc2V0IGhlYWRlciBwYXJhbWV0ZXJzXHJcbiAgICByZXF1ZXN0LnNldCh0aGlzLmRlZmF1bHRIZWFkZXJzKS5zZXQodGhpcy5ub3JtYWxpemVQYXJhbXMoaGVhZGVyUGFyYW1zKSk7XHJcblxyXG5cclxuICAgICAgLy8gc2V0IHJlcXVlc3RBZ2VudCBpZiBpdCBpcyBzZXQgYnkgdXNlclxyXG4gICAgICBpZiAodGhpcy5yZXF1ZXN0QWdlbnQpIHtcclxuICAgICAgICAgIHJlcXVlc3QuYWdlbnQodGhpcy5yZXF1ZXN0QWdlbnQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgLy8gc2V0IHJlcXVlc3QgdGltZW91dFxyXG4gICAgcmVxdWVzdC50aW1lb3V0KHRoaXMudGltZW91dCk7XHJcblxyXG4gICAgdmFyIGNvbnRlbnRUeXBlID0gdGhpcy5qc29uUHJlZmVycmVkTWltZShjb250ZW50VHlwZXMpO1xyXG4gICAgaWYgKGNvbnRlbnRUeXBlKSB7XHJcbiAgICAgIC8vIElzc3VlIHdpdGggc3VwZXJhZ2VudCBhbmQgbXVsdGlwYXJ0L2Zvcm0tZGF0YSAoaHR0cHM6Ly9naXRodWIuY29tL3Zpc2lvbm1lZGlhL3N1cGVyYWdlbnQvaXNzdWVzLzc0NilcclxuICAgICAgaWYoY29udGVudFR5cGUgIT0gJ211bHRpcGFydC9mb3JtLWRhdGEnKSB7XHJcbiAgICAgICAgcmVxdWVzdC50eXBlKGNvbnRlbnRUeXBlKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIGlmICghcmVxdWVzdC5oZWFkZXJbJ0NvbnRlbnQtVHlwZSddKSB7XHJcbiAgICAgIHJlcXVlc3QudHlwZSgnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjb250ZW50VHlwZSA9PT0gJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpIHtcclxuICAgICAgcmVxdWVzdC5zZW5kKHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeSh0aGlzLm5vcm1hbGl6ZVBhcmFtcyhmb3JtUGFyYW1zKSkpO1xyXG4gICAgfSBlbHNlIGlmIChjb250ZW50VHlwZSA9PSAnbXVsdGlwYXJ0L2Zvcm0tZGF0YScpIHtcclxuICAgICAgdmFyIF9mb3JtUGFyYW1zID0gdGhpcy5ub3JtYWxpemVQYXJhbXMoZm9ybVBhcmFtcyk7XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBfZm9ybVBhcmFtcykge1xyXG4gICAgICAgIGlmIChfZm9ybVBhcmFtcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICBpZiAodGhpcy5pc0ZpbGVQYXJhbShfZm9ybVBhcmFtc1trZXldKSkge1xyXG4gICAgICAgICAgICAvLyBmaWxlIGZpZWxkXHJcbiAgICAgICAgICAgIHJlcXVlc3QuYXR0YWNoKGtleSwgX2Zvcm1QYXJhbXNba2V5XSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXF1ZXN0LmZpZWxkKGtleSwgX2Zvcm1QYXJhbXNba2V5XSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKGJvZHlQYXJhbSkge1xyXG4gICAgICByZXF1ZXN0LnNlbmQoYm9keVBhcmFtKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgYWNjZXB0ID0gdGhpcy5qc29uUHJlZmVycmVkTWltZShhY2NlcHRzKTtcclxuICAgIGlmIChhY2NlcHQpIHtcclxuICAgICAgcmVxdWVzdC5hY2NlcHQoYWNjZXB0KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmV0dXJuVHlwZSA9PT0gJ0Jsb2InKSB7XHJcbiAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlKCdibG9iJyk7XHJcbiAgICB9IGVsc2UgaWYgKHJldHVyblR5cGUgPT09ICdTdHJpbmcnKSB7XHJcbiAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlKCdzdHJpbmcnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBdHRhY2ggcHJldmlvdXNseSBzYXZlZCBjb29raWVzLCBpZiBlbmFibGVkXHJcbiAgICBpZiAodGhpcy5lbmFibGVDb29raWVzKXtcclxuICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgdGhpcy5hZ2VudC5hdHRhY2hDb29raWVzKHJlcXVlc3QpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHJlcXVlc3Qud2l0aENyZWRlbnRpYWxzKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgcmVxdWVzdC5lbmQoZnVuY3Rpb24oZXJyb3IsIHJlc3BvbnNlKSB7XHJcbiAgICAgIGlmIChjYWxsYmFjaykge1xyXG4gICAgICAgIHZhciBkYXRhID0gbnVsbDtcclxuICAgICAgICBpZiAoIWVycm9yKSB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBkYXRhID0gX3RoaXMuZGVzZXJpYWxpemUocmVzcG9uc2UsIHJldHVyblR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoX3RoaXMuZW5hYmxlQ29va2llcyAmJiB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyl7XHJcbiAgICAgICAgICAgICAgX3RoaXMuYWdlbnQuc2F2ZUNvb2tpZXMocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgZXJyb3IgPSBlcnI7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiByZXF1ZXN0O1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFBhcnNlcyBhbiBJU08tODYwMSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgYSBkYXRlIHZhbHVlLlxyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIGRhdGUgdmFsdWUgYXMgYSBzdHJpbmcuXHJcbiAgICogQHJldHVybnMge0RhdGV9IFRoZSBwYXJzZWQgZGF0ZSBvYmplY3QuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wYXJzZURhdGUgPSBmdW5jdGlvbihzdHIpIHtcclxuICAgIHJldHVybiBuZXcgRGF0ZShzdHIucmVwbGFjZSgvVC9pLCAnICcpKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb252ZXJ0cyBhIHZhbHVlIHRvIHRoZSBzcGVjaWZpZWQgdHlwZS5cclxuICAgKiBAcGFyYW0geyhTdHJpbmd8T2JqZWN0KX0gZGF0YSBUaGUgZGF0YSB0byBjb252ZXJ0LCBhcyBhIHN0cmluZyBvciBvYmplY3QuXHJcbiAgICogQHBhcmFtIHsoU3RyaW5nfEFycmF5LjxTdHJpbmc+fE9iamVjdC48U3RyaW5nLCBPYmplY3Q+fEZ1bmN0aW9uKX0gdHlwZSBUaGUgdHlwZSB0byByZXR1cm4uIFBhc3MgYSBzdHJpbmcgZm9yIHNpbXBsZSB0eXBlc1xyXG4gICAqIG9yIHRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgYSBjb21wbGV4IHR5cGUuIFBhc3MgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgdHlwZSBuYW1lIHRvIHJldHVybiBhbiBhcnJheSBvZiB0aGF0IHR5cGUuIFRvXHJcbiAgICogcmV0dXJuIGFuIG9iamVjdCwgcGFzcyBhbiBvYmplY3Qgd2l0aCBvbmUgcHJvcGVydHkgd2hvc2UgbmFtZSBpcyB0aGUga2V5IHR5cGUgYW5kIHdob3NlIHZhbHVlIGlzIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlIHR5cGU6XHJcbiAgICogYWxsIHByb3BlcnRpZXMgb24gPGNvZGU+ZGF0YTxjb2RlPiB3aWxsIGJlIGNvbnZlcnRlZCB0byB0aGlzIHR5cGUuXHJcbiAgICogQHJldHVybnMgQW4gaW5zdGFuY2Ugb2YgdGhlIHNwZWNpZmllZCB0eXBlIG9yIG51bGwgb3IgdW5kZWZpbmVkIGlmIGRhdGEgaXMgbnVsbCBvciB1bmRlZmluZWQuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb252ZXJ0VG9UeXBlID0gZnVuY3Rpb24oZGF0YSwgdHlwZSkge1xyXG4gICAgaWYgKGRhdGEgPT09IG51bGwgfHwgZGF0YSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICByZXR1cm4gZGF0YVxyXG5cclxuICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICBjYXNlICdCb29sZWFuJzpcclxuICAgICAgICByZXR1cm4gQm9vbGVhbihkYXRhKTtcclxuICAgICAgY2FzZSAnSW50ZWdlcic6XHJcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KGRhdGEsIDEwKTtcclxuICAgICAgY2FzZSAnTnVtYmVyJzpcclxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChkYXRhKTtcclxuICAgICAgY2FzZSAnU3RyaW5nJzpcclxuICAgICAgICByZXR1cm4gU3RyaW5nKGRhdGEpO1xyXG4gICAgICBjYXNlICdEYXRlJzpcclxuICAgICAgICByZXR1cm4gdGhpcy5wYXJzZURhdGUoU3RyaW5nKGRhdGEpKTtcclxuICAgICAgY2FzZSAnQmxvYic6XHJcbiAgICAgIFx0cmV0dXJuIGRhdGE7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IE9iamVjdCkge1xyXG4gICAgICAgICAgLy8gZ2VuZXJpYyBvYmplY3QsIHJldHVybiBkaXJlY3RseVxyXG4gICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgLy8gZm9yIG1vZGVsIHR5cGUgbGlrZTogVXNlclxyXG4gICAgICAgICAgcmV0dXJuIHR5cGUuY29uc3RydWN0RnJvbU9iamVjdChkYXRhKTtcclxuICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodHlwZSkpIHtcclxuICAgICAgICAgIC8vIGZvciBhcnJheSB0eXBlIGxpa2U6IFsnU3RyaW5nJ11cclxuICAgICAgICAgIHZhciBpdGVtVHlwZSA9IHR5cGVbMF07XHJcbiAgICAgICAgICByZXR1cm4gZGF0YS5tYXAoZnVuY3Rpb24oaXRlbSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXhwb3J0cy5jb252ZXJ0VG9UeXBlKGl0ZW0sIGl0ZW1UeXBlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHR5cGUgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAvLyBmb3IgcGxhaW4gb2JqZWN0IHR5cGUgbGlrZTogeydTdHJpbmcnOiAnSW50ZWdlcid9XHJcbiAgICAgICAgICB2YXIga2V5VHlwZSwgdmFsdWVUeXBlO1xyXG4gICAgICAgICAgZm9yICh2YXIgayBpbiB0eXBlKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlLmhhc093blByb3BlcnR5KGspKSB7XHJcbiAgICAgICAgICAgICAga2V5VHlwZSA9IGs7XHJcbiAgICAgICAgICAgICAgdmFsdWVUeXBlID0gdHlwZVtrXTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgICAgICAgZm9yICh2YXIgayBpbiBkYXRhKSB7XHJcbiAgICAgICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KGspKSB7XHJcbiAgICAgICAgICAgICAgdmFyIGtleSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShrLCBrZXlUeXBlKTtcclxuICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBleHBvcnRzLmNvbnZlcnRUb1R5cGUoZGF0YVtrXSwgdmFsdWVUeXBlKTtcclxuICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyBmb3IgdW5rbm93biB0eXBlLCByZXR1cm4gdGhlIGRhdGEgZGlyZWN0bHlcclxuICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IG1hcCBvciBhcnJheSBtb2RlbCBmcm9tIFJFU1QgZGF0YS5cclxuICAgKiBAcGFyYW0gZGF0YSB7T2JqZWN0fEFycmF5fSBUaGUgUkVTVCBkYXRhLlxyXG4gICAqIEBwYXJhbSBvYmoge09iamVjdHxBcnJheX0gVGhlIHRhcmdldCBvYmplY3Qgb3IgYXJyYXkuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqLCBpdGVtVHlwZSkge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoaSkpXHJcbiAgICAgICAgICBvYmpbaV0gPSBleHBvcnRzLmNvbnZlcnRUb1R5cGUoZGF0YVtpXSwgaXRlbVR5cGUpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmb3IgKHZhciBrIGluIGRhdGEpIHtcclxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShrKSlcclxuICAgICAgICAgIG9ialtrXSA9IGV4cG9ydHMuY29udmVydFRvVHlwZShkYXRhW2tdLCBpdGVtVHlwZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBUaGUgZGVmYXVsdCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uLlxyXG4gICAqIEB0eXBlIHttb2R1bGU6QXBpQ2xpZW50fVxyXG4gICAqL1xyXG4gIGV4cG9ydHMuaW5zdGFuY2UgPSBuZXcgZXhwb3J0cygpO1xyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9QYXJhbWV0ZXJMaXN0J10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9QYXJhbWV0ZXJMaXN0JykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQnVpbGRBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCk7XHJcbiAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgUGFyYW1ldGVyTGlzdCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLyoqXHJcbiAgICogQnVpbGQgc2VydmljZS5cclxuICAgKiBAbW9kdWxlIGFwaS9CdWlsZEFwaVxyXG4gICAqIEB2ZXJzaW9uIDEuMS4zXHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgQnVpbGRBcGkuIFxyXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL0J1aWxkQXBpXHJcbiAgICogQGNsYXNzXHJcbiAgICogQHBhcmFtIHttb2R1bGU6QXBpQ2xpZW50fSBbYXBpQ2xpZW50XSBPcHRpb25hbCBBUEkgY2xpZW50IGltcGxlbWVudGF0aW9uIHRvIHVzZSxcclxuICAgKiBkZWZhdWx0IHRvIHtAbGluayBtb2R1bGU6QXBpQ2xpZW50I2luc3RhbmNlfSBpZiB1bnNwZWNpZmllZC5cclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKGFwaUNsaWVudCkge1xyXG4gICAgdGhpcy5hcGlDbGllbnQgPSBhcGlDbGllbnQgfHwgQXBpQ2xpZW50Lmluc3RhbmNlO1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgYnVpbGRBTk4gb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvQnVpbGRBcGl+YnVpbGRBTk5DYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBwYXNzZXMgYWxsIGxlYXJuaW5nIGFuZCBBTk4gcGFyYW1ldGVycyB0byB0aGUgc2VydmVyXHJcbiAgICAgKiBJbmNsdWRlcyBsZWFybmluZyBwYXJhbWV0ZXJzIGFuZCBBTk4gdG9wb2xvZ3lcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGlucHV0UGFyYW1ldGVycyBvYmplY3Qgd2l0aCBhbGwgdHVuYWJsZSBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvQnVpbGRBcGl+YnVpbGRBTk5DYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5idWlsZEFOTiA9IGZ1bmN0aW9uKGlucHV0UGFyYW1ldGVycywgY2FsbGJhY2spIHtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gaW5wdXRQYXJhbWV0ZXJzO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVycycgaXMgc2V0XHJcbiAgICAgIGlmIChpbnB1dFBhcmFtZXRlcnMgPT09IHVuZGVmaW5lZCB8fCBpbnB1dFBhcmFtZXRlcnMgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lucHV0UGFyYW1ldGVycycgd2hlbiBjYWxsaW5nIGJ1aWxkQU5OXCIpO1xyXG4gICAgICB9XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvYnVpbGQvYnVpbGRBTk4nLCAnUE9TVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRBTk5QYXJhbWV0ZXIgb3BlcmF0aW9uLlxyXG4gICAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9CdWlsZEFwaX5nZXRBTk5QYXJhbWV0ZXJDYWxsYmFja1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogcmV0dXJucyB0aGUgcGFyYW1ldGVyIHNldCBvZiB0aGUgY3JlYXRlZCBBTk5cclxuICAgICAgICogcmV0dXJucyBhIG9iamVjdCBvZiB0eXBlIFBhcmFtZXRlckxpc3RcclxuICAgICAgICogQHBhcmFtIHttb2R1bGU6YXBpL0J1aWxkQXBpfmdldEFOTlBhcmFtZXRlckNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH1cclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuZ2V0QU5OUGFyYW1ldGVyID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuXHJcbiAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xyXG5cclxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFBhcmFtZXRlckxpc3Q7XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgICAgICAgJy9idWlsZC9nZXRBTk5QYXJhbWV0ZXInLCAnR0VUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbnB1dFNoYXBlIG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0J1aWxkQXBpfmdldElucHV0U2hhcGVDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7QXJyYXkuPCdOdW1iZXInPn0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIHRoZSBpbnB1dCBzaGFwZSBvZiB0aGUgdHJhaW4gZGF0YVxyXG4gICAgICogcmV0dXJucyB0aGUgaW5wdXQgc2hhcGUgb2YgdGhlIHRyYWluIGRhdGFcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgb2YgdGhlIGRhdGFzZXQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9CdWlsZEFwaX5nZXRJbnB1dFNoYXBlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBBcnJheS48J051bWJlcic+fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldElucHV0U2hhcGUgPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xyXG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICAgJ2RhdGFzZXRfbmFtZSc6IG9wdHNbJ2RhdGFzZXROYW1lJ10sXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBbJ051bWJlciddO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy9idWlsZC9nZXRJbnB1dFNoYXBlJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS4zXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0ltYWdlRGF0YSddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvSW1hZ2VEYXRhJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuTG9hZEFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5JbWFnZURhdGEpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIEltYWdlRGF0YSkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLyoqXHJcbiAgICogTG9hZCBzZXJ2aWNlLlxyXG4gICAqIEBtb2R1bGUgYXBpL0xvYWRBcGlcclxuICAgKiBAdmVyc2lvbiAxLjEuM1xyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IExvYWRBcGkuIFxyXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL0xvYWRBcGlcclxuICAgKiBAY2xhc3NcclxuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxyXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XHJcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XHJcblxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0QXZhaWxhYmxlRGF0YVNldHMgb3BlcmF0aW9uLlxyXG4gICAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEF2YWlsYWJsZURhdGFTZXRzQ2FsbGJhY2tcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAgICogQHBhcmFtIHtBcnJheS48J1N0cmluZyc+fSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogZ2V0IGF2YWlsYWJsZSBkYXRhIHNldHNcclxuICAgICAgICogcmV0dXJucyBhIGxpc3Qgb2YgYXZhaWxhYmxlIGRhdGEgc2V0IGZpbGVzXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEF2YWlsYWJsZURhdGFTZXRzQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIEFycmF5LjwnU3RyaW5nJz59XHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLmdldEF2YWlsYWJsZURhdGFTZXRzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuXHJcbiAgICAgICAgICB2YXIgcGF0aFBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xyXG5cclxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFsnU3RyaW5nJ107XHJcblxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgICAgICAgJy9sb2FkL2dldEF2YWlsYWJsZURhdGFTZXRzJywgJ0dFVCcsXHJcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0SW1hZ2VCYXRjaCBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQmF0Y2hDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIGlucHV0L291dHB1dCBpbWFnZXNcclxuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5iYXRjaFNpemUgZGVmaW5lcyB0aGUgbnVtYmVyIG9mIHJldHVybiBpbWFnZXMgKGRlZmF1bHQgdG8gMTAwKVxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcclxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJhdGNoQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldEltYWdlQmF0Y2ggPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xyXG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdiYXRjaF9zaXplJzogb3B0c1snYmF0Y2hTaXplJ10sXHJcbiAgICAgICAgJ2RhdGFzZXRuYW1lJzogb3B0c1snZGF0YXNldG5hbWUnXSxcclxuICAgICAgICAnc29ydF9ieSc6IG9wdHNbJ3NvcnRCeSddLFxyXG4gICAgICAgICdmaWx0ZXInOiBvcHRzWydmaWx0ZXInXSxcclxuICAgICAgICAgICdvdXRwdXQnOiBvcHRzWydvdXRwdXQnXSxcclxuICAgICAgfTtcclxuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IEltYWdlRGF0YTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvbG9hZC9nZXRJbWFnZUJhdGNoJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZUJ5SWQgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZUJ5SWRDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGEgc2luZ2xlIGlucHV0L291dHB1dCBpbWFnZVxyXG4gICAgICogaW1hZ2VzIGFyZSBlbmNvZGVkIGFzIHBuZyBieXRlIHN0cmluZ3NcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBkZWZpbmVzIHRoZSBpZCBvZiB0aGUgaW1hZ2VzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0bmFtZSBuYW1lIGZvciBkYXRhc2V0IG9uIHRoZSBzZXJ2ZXIgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLnNvcnRCeSBkZWZpbmVzIHRoZSBzb3J0aW5nIG9mIHRoZSBpbnB1dCBpbWFnZXNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmZpbHRlciB0aGUgdmFsdWVzIHdoaWNoIHNob3VsZCBiZSBmaWx0ZXJlZCAod2hpdGVsaXN0KVxyXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCBpZiB0cnVlIHJldHVybnMgQUUgb3V0cHV0IEltYWdlcyBpbnN0ZWFkIG9mIGlucHV0IEltYWdlcyAoZGVmYXVsdCB0byBmYWxzZSlcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldEltYWdlQnlJZENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL0ltYWdlRGF0YX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZXRJbWFnZUJ5SWQgPSBmdW5jdGlvbihpZCwgb3B0cywgY2FsbGJhY2spIHtcclxuICAgICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaWQnIGlzIHNldFxyXG4gICAgICBpZiAoaWQgPT09IHVuZGVmaW5lZCB8fCBpZCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaWQnIHdoZW4gY2FsbGluZyBnZXRJbWFnZUJ5SWRcIik7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdpZCc6IGlkLFxyXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXHJcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcclxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXHJcbiAgICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvZ2V0SW1hZ2VCeUlkJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRJbWFnZXMgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZXNDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGEgc3Vic2V0IG9mIGlucHV0L291dHB1dCBpbWFnZXNcclxuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gc3RhcnRJZHggbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gZW5kSWR4IG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlclxyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgcGFyYW1ldGVyc1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcclxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRJbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0SW1hZ2VzID0gZnVuY3Rpb24oc3RhcnRJZHgsIGVuZElkeCwgb3B0cywgY2FsbGJhY2spIHtcclxuICAgICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc3RhcnRJZHgnIGlzIHNldFxyXG4gICAgICBpZiAoc3RhcnRJZHggPT09IHVuZGVmaW5lZCB8fCBzdGFydElkeCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc3RhcnRJZHgnIHdoZW4gY2FsbGluZyBnZXRJbWFnZXNcIik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdlbmRJZHgnIGlzIHNldFxyXG4gICAgICBpZiAoZW5kSWR4ID09PSB1bmRlZmluZWQgfHwgZW5kSWR4ID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdlbmRJZHgnIHdoZW4gY2FsbGluZyBnZXRJbWFnZXNcIik7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdzdGFydF9pZHgnOiBzdGFydElkeCxcclxuICAgICAgICAnZW5kX2lkeCc6IGVuZElkeCxcclxuICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxyXG4gICAgICAgICdzb3J0X2J5Jzogb3B0c1snc29ydEJ5J10sXHJcbiAgICAgICAgJ2ZpbHRlcic6IG9wdHNbJ2ZpbHRlciddLFxyXG4gICAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxyXG4gICAgICB9O1xyXG4gICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy9sb2FkL2dldEltYWdlcycsICdHRVQnLFxyXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldExhdGVudFJlcHJlc2VudGF0aW9uQnlJZCBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+Z2V0TGF0ZW50UmVwcmVzZW50YXRpb25CeUlkQ2FsbGJhY2tcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogcmV0dXJucyBhIHNpbmdsZSBsYXRlbnQgcmVwcmVzZW50YXRpb24gYXMgKClsaXN0IG9mKSBwbmcgaW1hZ2VzXHJcbiAgICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXHJcbiAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBkZWZpbmVzIHRoZSBpZCBvZiB0aGUgaW1hZ2VzXHJcbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9Mb2FkQXBpfmdldExhdGVudFJlcHJlc2VudGF0aW9uQnlJZENhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxyXG4gICAgICAgKi9cclxuICAgICAgdGhpcy5nZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWQgPSBmdW5jdGlvbiAoaWQsIG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2lkJyBpcyBzZXRcclxuICAgICAgICAgIGlmIChpZCA9PT0gdW5kZWZpbmVkIHx8IGlkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpZCcgd2hlbiBjYWxsaW5nIGdldExhdGVudFJlcHJlc2VudGF0aW9uQnlJZFwiKTtcclxuICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAnaWQnOiBpZCxcclxuICAgICAgICAgICAgICAnZGF0YXNldG5hbWUnOiBvcHRzWydkYXRhc2V0bmFtZSddLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XHJcblxyXG4gICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gSW1hZ2VEYXRhO1xyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICAgICAgICcvbG9hZC9nZXRMYXRlbnRSZXByZXNlbnRhdGlvbkJ5SWQnLCAnR0VUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRSYW5kb21JbWFnZXMgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIHRoZSBuZXh0IGJhdGNoIG9mIGlucHV0L291dHB1dCBpbWFnZXNcclxuICAgICAqIGltYWdlcyBhcmUgZW5jb2RlZCBhcyBwbmcgYnl0ZSBzdHJpbmdzXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge051bWJlcn0gb3B0cy5iYXRjaFNpemUgZGVmaW5lcyB0aGUgbnVtYmVyIG9mIHJldHVybiBpbWFnZXMgKGRlZmF1bHQgdG8gMTAwKVxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG9wdHMuZGF0YXNldG5hbWUgbmFtZSBmb3IgZGF0YXNldCBvbiB0aGUgc2VydmVyIChkZWZhdWx0IHRvIHRyYWluX2RhdGEpXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5zb3J0QnkgZGVmaW5lcyB0aGUgc29ydGluZyBvZiB0aGUgaW5wdXQgaW1hZ2VzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5maWx0ZXIgdGhlIHZhbHVlcyB3aGljaCBzaG91bGQgYmUgZmlsdGVyZWQgKHdoaXRlbGlzdClcclxuICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0cy5vdXRwdXQgaWYgdHJ1ZSByZXR1cm5zIEFFIG91dHB1dCBJbWFnZXMgaW5zdGVhZCBvZiBpbnB1dCBJbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5nZXRSYW5kb21JbWFnZXNDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9JbWFnZURhdGF9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0UmFuZG9tSW1hZ2VzID0gZnVuY3Rpb24ob3B0cywgY2FsbGJhY2spIHtcclxuICAgICAgb3B0cyA9IG9wdHMgfHwge307XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAnYmF0Y2hfc2l6ZSc6IG9wdHNbJ2JhdGNoU2l6ZSddLFxyXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXHJcbiAgICAgICAgJ3NvcnRfYnknOiBvcHRzWydzb3J0QnknXSxcclxuICAgICAgICAnZmlsdGVyJzogb3B0c1snZmlsdGVyJ10sXHJcbiAgICAgICAgICAnb3V0cHV0Jzogb3B0c1snb3V0cHV0J10sXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZURhdGE7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL2xvYWQvZ2V0UmFuZG9tSW1hZ2VzJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBsb2FkRmlsZSBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9Mb2FkQXBpfmxvYWRGaWxlQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTG9hZCBhIHRyYWluL3Rlc3QgZGF0YSBmaWxlXHJcbiAgICAgKiBMb2FkIGEgZGF0YSBmaWxlIGluIGRpZmZlcmVudCBkYXRhIGZvcm1hdHNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBmaWxlbmFtZSBcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXRuYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxyXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLnJlYWRMYWJlbHMgdHJ1ZSB0byByZWFkIGxhYmVscyAoZGVmYXVsdCB0byBmYWxzZSlcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFUeXBlIGRldGVybWluZXMgdGhlIGRhdGEgZm9ybWF0IG9mIHRoZSBpbnB1dCBmaWxlIChkZWZhdWx0IHRvIGF1dG8pXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5sb2FkRmlsZUNhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICovXHJcbiAgICB0aGlzLmxvYWRGaWxlID0gZnVuY3Rpb24oZmlsZW5hbWUsIG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2ZpbGVuYW1lJyBpcyBzZXRcclxuICAgICAgaWYgKGZpbGVuYW1lID09PSB1bmRlZmluZWQgfHwgZmlsZW5hbWUgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ2ZpbGVuYW1lJyB3aGVuIGNhbGxpbmcgbG9hZEZpbGVcIik7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdmaWxlbmFtZSc6IGZpbGVuYW1lLFxyXG4gICAgICAgICdkYXRhc2V0bmFtZSc6IG9wdHNbJ2RhdGFzZXRuYW1lJ10sXHJcbiAgICAgICAgJ3JlYWRfbGFiZWxzJzogb3B0c1sncmVhZExhYmVscyddLFxyXG4gICAgICAgICAgJ2RhdGFfdHlwZSc6IG9wdHNbJ2RhdGFUeXBlJ10sXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy9sb2FkL2xvYWRGaWxlJywgJ1BPU1QnLFxyXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgcmVzZXRBbGxCYXRjaEluZGljZXMgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX5yZXNldEFsbEJhdGNoSW5kaWNlc0NhbGxiYWNrXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJlc2V0cyBhbGwgYmF0Y2ggaW5kaWNlcyBvZiBhbGwgaW1hZ2Ugc2V0c1xyXG4gICAgICogcmVzZXRzIGFsbCBiYXRjaCBpbmRpY2VzIG9mIGFsbCBpbWFnZSBzZXRzXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5yZXNldEFsbEJhdGNoSW5kaWNlc0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICovXHJcbiAgICB0aGlzLnJlc2V0QWxsQmF0Y2hJbmRpY2VzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuYXBpQ2xpZW50LmNhbGxBcGkoXHJcbiAgICAgICAgJy9sb2FkL3Jlc2V0QWxsQmF0Y2hJbmRpY2VzJywgJ1BPU1QnLFxyXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgcmVzZXRCYXRjaEluZGV4IG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL0xvYWRBcGl+cmVzZXRCYXRjaEluZGV4Q2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmVzZXRzIHRoZSBiYXRjaCBpbmRleCBvZiB0aGUgaW1hZ2Ugc2V0XHJcbiAgICAgKiByZXNldHMgdGhlIGJhdGNoIGluZGV4IG9mIHRoZSBpbWFnZSBzZXRcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRzLmRhdGFzZXROYW1lIG5hbWUgZm9yIGRhdGFzZXQgb24gdGhlIHNlcnZlciAoZGVmYXVsdCB0byB0cmFpbl9kYXRhKVxyXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBvcHRzLm91dHB1dCByZXNldCBvdXRwdXQgaW1hZ2UgYmF0Y2ggaW5kZXggaW5zdGVhZCBvZiBpbnB1dCBpbWFnZXMgKGRlZmF1bHQgdG8gZmFsc2UpXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX5yZXNldEJhdGNoSW5kZXhDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXNldEJhdGNoSW5kZXggPSBmdW5jdGlvbihvcHRzLCBjYWxsYmFjaykge1xyXG4gICAgICBvcHRzID0gb3B0cyB8fCB7fTtcclxuICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICdkYXRhc2V0X25hbWUnOiBvcHRzWydkYXRhc2V0TmFtZSddLFxyXG4gICAgICAgICAgJ291dHB1dCc6IG9wdHNbJ291dHB1dCddLFxyXG4gICAgICB9O1xyXG4gICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvbG9hZC9yZXNldEJhdGNoSW5kZXgnLCAnUE9TVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSB1cGxvYWRGaWxlIG9wZXJhdGlvbi5cclxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvTG9hZEFwaX51cGxvYWRGaWxlQ2FsbGJhY2tcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAgICogQHBhcmFtIGRhdGEgVGhpcyBvcGVyYXRpb24gZG9lcyBub3QgcmV0dXJuIGEgdmFsdWUuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogdXBsb2FkcyBhIGRhdGEgZmlsZVxyXG4gICAgICAgKiBMb2FkIGEgZGF0YSBmaWxlIGluIGRpZmZlcmVudCBkYXRhIGZvcm1hdHNcclxuICAgICAgICogQHBhcmFtIHtGaWxlfSB1cGZpbGUgVGhlIGZpbGUgdG8gdXBsb2FkLlxyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvTG9hZEFwaX51cGxvYWRGaWxlQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLnVwbG9hZEZpbGUgPSBmdW5jdGlvbiAodXBmaWxlLCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAndXBmaWxlJyBpcyBzZXRcclxuICAgICAgICAgIGlmICh1cGZpbGUgPT09IHVuZGVmaW5lZCB8fCB1cGZpbGUgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3VwZmlsZScgd2hlbiBjYWxsaW5nIHVwbG9hZEZpbGVcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICd1cGZpbGUnOiB1cGZpbGVcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnbXVsdGlwYXJ0L2Zvcm0tZGF0YSddO1xyXG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbXTtcclxuICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gbnVsbDtcclxuXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICAgICAnL2xvYWQvdXBsb2FkRmlsZScsICdQT1NUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS4zXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlJywgJ21vZGVsL1RyYWluU3RhdHVzJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlRyYWluQXBpID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlByb2Nlc3NlZEltYWdlRGF0YSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5TdGF0dXMpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFByb2Nlc3NlZEltYWdlRGF0YSwgVHJhaW5QZXJmb3JtYW5jZSwgVHJhaW5TdGF0dXMpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIFRyYWluIHNlcnZpY2UuXHJcbiAgICogQG1vZHVsZSBhcGkvVHJhaW5BcGlcclxuICAgKiBAdmVyc2lvbiAxLjEuM1xyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFRyYWluQXBpLiBcclxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9UcmFpbkFwaVxyXG4gICAqIEBjbGFzc1xyXG4gICAqIEBwYXJhbSB7bW9kdWxlOkFwaUNsaWVudH0gW2FwaUNsaWVudF0gT3B0aW9uYWwgQVBJIGNsaWVudCBpbXBsZW1lbnRhdGlvbiB0byB1c2UsXHJcbiAgICogZGVmYXVsdCB0byB7QGxpbmsgbW9kdWxlOkFwaUNsaWVudCNpbnN0YW5jZX0gaWYgdW5zcGVjaWZpZWQuXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbihhcGlDbGllbnQpIHtcclxuICAgIHRoaXMuYXBpQ2xpZW50ID0gYXBpQ2xpZW50IHx8IEFwaUNsaWVudC5pbnN0YW5jZTtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGNvbnRyb2xUcmFpbmluZyBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5jb250cm9sVHJhaW5pbmdDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHRyYWluaW5nXHJcbiAgICAgKiB1c2VzIGEgc3RyaW5nIGVudW1cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1RyYWluU3RhdHVzfSB0cmFpblN0YXR1cyBuZXcgc3RhdHVzIGZvciB0cmFpbmluZ1xyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1RyYWluQXBpfmNvbnRyb2xUcmFpbmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICovXHJcbiAgICB0aGlzLmNvbnRyb2xUcmFpbmluZyA9IGZ1bmN0aW9uKHRyYWluU3RhdHVzLCBjYWxsYmFjaykge1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSB0cmFpblN0YXR1cztcclxuXHJcbiAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgaXMgc2V0XHJcbiAgICAgIGlmICh0cmFpblN0YXR1cyA9PT0gdW5kZWZpbmVkIHx8IHRyYWluU3RhdHVzID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICd0cmFpblN0YXR1cycgd2hlbiBjYWxsaW5nIGNvbnRyb2xUcmFpbmluZ1wiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3RyYWluL2NvbnRyb2xUcmFpbmluZycsICdQT1NUJyxcclxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFByb2Nlc3NlZEltYWdlRGF0YSBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRQcm9jZXNzZWRJbWFnZURhdGFDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiByZXR1cm5zIGEgc3Vic2V0IG9mIHRoZSBjdXJyZW50IHRyYWluIGltYWdlcyBhbmQgdGhlIGNvcnJlc3BvbmRpbmcgbGF0ZW50IHJlcHJlc2VudGF0aW9uIGFuZCBvdXRwdXRcclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHtOdW1iZXJ9IHNldFNpemUgc2l6ZSBvZiB0aGUgaW1hZ2Ugc3Vic2V0XHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHJhaW5BcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YSA9IGZ1bmN0aW9uKHNldFNpemUsIGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XHJcbiAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YVwiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemUsXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBQcm9jZXNzZWRJbWFnZURhdGE7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3RyYWluL2dldFByb2Nlc3NlZEltYWdlRGF0YScsICdHRVQnLFxyXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHJhaW5QZXJmb3JtYW5jZSBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UcmFpbkFwaX5nZXRUcmFpblBlcmZvcm1hbmNlQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2Ygc2NhbGFyIHRyYWluIHZhcmlhYmxlc1xyXG4gICAgICogYXMgbGlzdCBvZiBkaWN0c1xyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1RyYWluQXBpfmdldFRyYWluUGVyZm9ybWFuY2VDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqIGRhdGEgaXMgb2YgdHlwZToge0BsaW5rIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldFRyYWluUGVyZm9ybWFuY2UgPSBmdW5jdGlvbihjYWxsYmFjaykge1xyXG4gICAgICB2YXIgcG9zdEJvZHkgPSBudWxsO1xyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IFRyYWluUGVyZm9ybWFuY2U7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3RyYWluL2dldFRyYWluUGVyZm9ybWFuY2UnLCAnR0VUJyxcclxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4xLjNcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvUGFyYW1ldGVyTGlzdCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblN0YXR1cyddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSwgcmVxdWlyZSgnLi4vbW9kZWwvUGFyYW1ldGVyTGlzdCcpLCByZXF1aXJlKCcuLi9tb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnKSwgcmVxdWlyZSgnLi4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuLi9tb2RlbC9UcmFpblN0YXR1cycpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlR1bmVBcGkgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUGFyYW1ldGVyTGlzdCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuUHJvY2Vzc2VkSW1hZ2VEYXRhLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyk7XHJcbiAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCwgUGFyYW1ldGVyTGlzdCwgUHJvY2Vzc2VkSW1hZ2VEYXRhLCBUcmFpblBlcmZvcm1hbmNlLCBUcmFpblN0YXR1cykge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLyoqXHJcbiAgICogVHVuZSBzZXJ2aWNlLlxyXG4gICAqIEBtb2R1bGUgYXBpL1R1bmVBcGlcclxuICAgKiBAdmVyc2lvbiAxLjEuM1xyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFR1bmVBcGkuIFxyXG4gICAqIEBhbGlhcyBtb2R1bGU6YXBpL1R1bmVBcGlcclxuICAgKiBAY2xhc3NcclxuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxyXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XHJcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XHJcblxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgYnVpbGRHcmlkU2VhcmNoQU5OIG9wZXJhdGlvbi5cclxuICAgICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5idWlsZEdyaWRTZWFyY2hBTk5DYWxsYmFja1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICAgKiBAcGFyYW0gZGF0YSBUaGlzIG9wZXJhdGlvbiBkb2VzIG5vdCByZXR1cm4gYSB2YWx1ZS5cclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICAgKi9cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBwYXNzZXMgYWxsIGxlYXJuaW5nIGFuZCBBTk4gcGFyYW1ldGVycyB0byB0aGUgc2VydmVyXHJcbiAgICAgICAqIEluY2x1ZGVzIGxlYXJuaW5nIHBhcmFtZXRlcnMgYW5kIEFOTiB0b3BvbG9neSBhcyBsaXN0c1xyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBpbnB1dFBhcmFtZXRlckxpc3RzIG9iamVjdCB3aXRoIGFsbCB0dW5hYmxlIHBhcmFtZXRlciBsaXN0c1xyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5idWlsZEdyaWRTZWFyY2hBTk5DYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuYnVpbGRHcmlkU2VhcmNoQU5OID0gZnVuY3Rpb24gKGlucHV0UGFyYW1ldGVyTGlzdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgICB2YXIgcG9zdEJvZHkgPSBpbnB1dFBhcmFtZXRlckxpc3RzO1xyXG5cclxuICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdpbnB1dFBhcmFtZXRlckxpc3RzJyBpcyBzZXRcclxuICAgICAgICAgIGlmIChpbnB1dFBhcmFtZXRlckxpc3RzID09PSB1bmRlZmluZWQgfHwgaW5wdXRQYXJhbWV0ZXJMaXN0cyA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnaW5wdXRQYXJhbWV0ZXJMaXN0cycgd2hlbiBjYWxsaW5nIGJ1aWxkR3JpZFNlYXJjaEFOTlwiKTtcclxuICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcclxuXHJcbiAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBudWxsO1xyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICAgICAgICcvdHVuZS9idWlsZEdyaWRTZWFyY2hBTk4nLCAnUE9TVCcsXHJcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgY29udHJvbFR1bmluZyBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9UdW5lQXBpfmNvbnRyb2xUdW5pbmdDYWxsYmFja1xyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGVycm9yIEVycm9yIG1lc3NhZ2UsIGlmIGFueS5cclxuICAgICAqIEBwYXJhbSBkYXRhIFRoaXMgb3BlcmF0aW9uIGRvZXMgbm90IHJldHVybiBhIHZhbHVlLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzdGFydHMsIHBhdXNlcyBhbmQgc3RvcHMgdGhlIHR1bmluZ1xyXG4gICAgICogdXNlcyBhIHN0cmluZyBlbnVtXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblN0YXR1c30gdHJhaW5TdGF0dXMgbmV3IHN0YXR1cyBmb3IgdHJhaW5pbmdcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmNvbnRyb2xUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAqL1xyXG4gICAgdGhpcy5jb250cm9sVHVuaW5nID0gZnVuY3Rpb24odHJhaW5TdGF0dXMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IHRyYWluU3RhdHVzO1xyXG5cclxuICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyBpcyBzZXRcclxuICAgICAgaWYgKHRyYWluU3RhdHVzID09PSB1bmRlZmluZWQgfHwgdHJhaW5TdGF0dXMgPT09IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3RyYWluU3RhdHVzJyB3aGVuIGNhbGxpbmcgY29udHJvbFR1bmluZ1wiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IG51bGw7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICcvdHVuZS9jb250cm9sVHVuaW5nJywgJ1BPU1QnLFxyXG4gICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nIG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGF9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAqL1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogcmV0dXJucyBhIHN1YnNldCBvZiB0aGUgY3VycmVudCB0cmFpbiBpbWFnZXMgYW5kIHRoZSBjb3JyZXNwb25kaW5nIGxhdGVudCByZXByZXNlbnRhdGlvbiBhbmQgb3V0cHV0XHJcbiAgICAgKiBcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBzZXRTaXplIHNpemUgb2YgdGhlIGltYWdlIHN1YnNldFxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZyA9IGZ1bmN0aW9uKHNldFNpemUsIGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XHJcbiAgICAgIGlmIChzZXRTaXplID09PSB1bmRlZmluZWQgfHwgc2V0U2l6ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mQ3VycmVudFR1bmluZ1wiKTtcclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIHZhciBwYXRoUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAnc2V0U2l6ZSc6IHNldFNpemUsXHJcbiAgICAgIH07XHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBQcm9jZXNzZWRJbWFnZURhdGE7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAnL3R1bmUvZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZyBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZ0NhbGxiYWNrXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgICAqL1xyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIHJldHVybnMgYSBzdWJzZXQgb2YgdGhlIGN1cnJlbnQgdHJhaW4gaW1hZ2VzIGFuZCB0aGUgY29ycmVzcG9uZGluZyBsYXRlbnQgcmVwcmVzZW50YXRpb24gYW5kIG91dHB1dFxyXG4gICAgICAgKlxyXG4gICAgICAgKiBAcGFyYW0ge051bWJlcn0gc2V0U2l6ZSBzaXplIG9mIHRoZSBpbWFnZSBzdWJzZXRcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZyA9IGZ1bmN0aW9uIChzZXRTaXplLCBtb2RlbElkLCBjYWxsYmFjaykge1xyXG4gICAgICAgICAgdmFyIHBvc3RCb2R5ID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnc2V0U2l6ZScgaXMgc2V0XHJcbiAgICAgICAgICBpZiAoc2V0U2l6ZSA9PT0gdW5kZWZpbmVkIHx8IHNldFNpemUgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ3NldFNpemUnIHdoZW4gY2FsbGluZyBnZXRQcm9jZXNzZWRJbWFnZURhdGFPZlNwZWNpZmljVHVuaW5nXCIpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyBpcyBzZXRcclxuICAgICAgICAgIGlmIChtb2RlbElkID09PSB1bmRlZmluZWQgfHwgbW9kZWxJZCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnbW9kZWxJZCcgd2hlbiBjYWxsaW5nIGdldFByb2Nlc3NlZEltYWdlRGF0YU9mU3BlY2lmaWNUdW5pbmdcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgJ3NldFNpemUnOiBzZXRTaXplLFxyXG4gICAgICAgICAgICAgICdtb2RlbElkJzogbW9kZWxJZCxcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgZm9ybVBhcmFtcyA9IHt9O1xyXG5cclxuICAgICAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgcmV0dXJuVHlwZSA9IFByb2Nlc3NlZEltYWdlRGF0YTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICAgICAnL3R1bmUvZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhT2ZTcGVjaWZpY1R1bmluZycsICdHRVQnLFxyXG4gICAgICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldFRyYWluUGVyZm9ybWFuY2VPZkN1cnJlbnRUdW5pbmcgb3BlcmF0aW9uLlxyXG4gICAgICogQGNhbGxiYWNrIG1vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIG5leHQgYmF0Y2ggb2Ygc2NhbGFyIHRyYWluIHZhcmlhYmxlc1xyXG4gICAgICogYXMgbGlzdCBvZiBkaWN0c1xyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZU9mQ3VycmVudFR1bmluZyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG5cclxuICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge307XHJcbiAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBmb3JtUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciBhY2NlcHRzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvdHVuZS9nZXRUcmFpblBlcmZvcm1hbmNlT2ZDdXJyZW50VHVuaW5nJywgJ0dFVCcsXHJcbiAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZyBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdDYWxsYmFja1xyXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gZXJyb3IgRXJyb3IgbWVzc2FnZSwgaWYgYW55LlxyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXNwb25zZSBUaGUgY29tcGxldGUgSFRUUCByZXNwb25zZS5cclxuICAgICAgICovXHJcblxyXG4gICAgICAvKipcclxuICAgICAgICogcmV0dXJucyB0aGUgY29tcGxldGUgc2V0IG9mIHNjYWxhciB0cmFpbiB2YXJpYWJsZXMgdG8gYSBnaXZlbiBtb2RlbFxyXG4gICAgICAgKiBhcyBsaXN0IG9mIGRpY3RzXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtb2RlbElkIG1vZGVsIGlkIG9mIHRoZSBleHNwZWN0ZWQgcGFyYW1ldGVyIHNldFxyXG4gICAgICAgKiBAcGFyYW0ge21vZHVsZTphcGkvVHVuZUFwaX5nZXRUcmFpblBlcmZvcm1hbmNlT2ZTcGVjaWZpY1R1bmluZ0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24sIGFjY2VwdGluZyB0aHJlZSBhcmd1bWVudHM6IGVycm9yLCBkYXRhLCByZXNwb25zZVxyXG4gICAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cclxuICAgICAgICovXHJcbiAgICAgIHRoaXMuZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmcgPSBmdW5jdGlvbiAobW9kZWxJZCwgY2FsbGJhY2spIHtcclxuICAgICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIGlzIHNldFxyXG4gICAgICAgICAgaWYgKG1vZGVsSWQgPT09IHVuZGVmaW5lZCB8fCBtb2RlbElkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmdcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XHJcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgJ21vZGVsSWQnOiBtb2RlbElkLFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBoZWFkZXJQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBmb3JtUGFyYW1zID0ge307XHJcblxyXG4gICAgICAgICAgdmFyIGF1dGhOYW1lcyA9IFtdO1xyXG4gICAgICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgICAgIHZhciByZXR1cm5UeXBlID0gVHJhaW5QZXJmb3JtYW5jZTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICAgICAnL3R1bmUvZ2V0VHJhaW5QZXJmb3JtYW5jZU9mU3BlY2lmaWNUdW5pbmcnLCAnR0VUJyxcclxuICAgICAgICAgICAgICBwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcywgY29sbGVjdGlvblF1ZXJ5UGFyYW1zLCBoZWFkZXJQYXJhbXMsIGZvcm1QYXJhbXMsIHBvc3RCb2R5LFxyXG4gICAgICAgICAgICAgIGF1dGhOYW1lcywgY29udGVudFR5cGVzLCBhY2NlcHRzLCByZXR1cm5UeXBlLCBjYWxsYmFja1xyXG4gICAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLyoqXHJcbiAgICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlY2VpdmUgdGhlIHJlc3VsdCBvZiB0aGUgZ2V0VHVuZVBhcmFtZXRlciBvcGVyYXRpb24uXHJcbiAgICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1R1bmVBcGl+Z2V0VHVuZVBhcmFtZXRlckNhbGxiYWNrXHJcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IGRhdGEgVGhlIGRhdGEgcmV0dXJuZWQgYnkgdGhlIHNlcnZpY2UgY2FsbC5cclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICAgKi9cclxuXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiByZXR1cm5zIHRoZSBwYXJhbWV0ZXIgc2V0IG9mIHRoZSBBTk4gd2l0aCB0aGUgZ2l2ZW4gbW9kZWwgaWRcclxuICAgICAgICogcmV0dXJucyBhIG9iamVjdCBvZiB0eXBlIFBhcmFtZXRlckxpc3RcclxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IG1vZGVsSWQgbW9kZWwgaWQgb2YgdGhlIGV4c3BlY3RlZCBwYXJhbWV0ZXIgc2V0XHJcbiAgICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9UdW5lQXBpfmdldFR1bmVQYXJhbWV0ZXJDYWxsYmFja30gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uLCBhY2NlcHRpbmcgdGhyZWUgYXJndW1lbnRzOiBlcnJvciwgZGF0YSwgcmVzcG9uc2VcclxuICAgICAgICogZGF0YSBpcyBvZiB0eXBlOiB7QGxpbmsgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9XHJcbiAgICAgICAqL1xyXG4gICAgICB0aGlzLmdldFR1bmVQYXJhbWV0ZXIgPSBmdW5jdGlvbiAobW9kZWxJZCwgY2FsbGJhY2spIHtcclxuICAgICAgICAgIHZhciBwb3N0Qm9keSA9IG51bGw7XHJcblxyXG4gICAgICAgICAgLy8gdmVyaWZ5IHRoZSByZXF1aXJlZCBwYXJhbWV0ZXIgJ21vZGVsSWQnIGlzIHNldFxyXG4gICAgICAgICAgaWYgKG1vZGVsSWQgPT09IHVuZGVmaW5lZCB8fCBtb2RlbElkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdtb2RlbElkJyB3aGVuIGNhbGxpbmcgZ2V0VHVuZVBhcmFtZXRlclwiKTtcclxuICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgdmFyIHBhdGhQYXJhbXMgPSB7fTtcclxuICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAnbW9kZWxJZCc6IG1vZGVsSWQsXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgdmFyIGNvbGxlY3Rpb25RdWVyeVBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7fTtcclxuXHJcbiAgICAgICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgICAgICB2YXIgY29udGVudFR5cGVzID0gWydhcHBsaWNhdGlvbi9qc29uJ107XHJcbiAgICAgICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICAgICAgdmFyIHJldHVyblR5cGUgPSBQYXJhbWV0ZXJMaXN0O1xyXG5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICAgICAgICcvdHVuZS9nZXRUdW5lUGFyYW1ldGVyJywgJ0dFVCcsXHJcbiAgICAgICAgICAgICAgcGF0aFBhcmFtcywgcXVlcnlQYXJhbXMsIGNvbGxlY3Rpb25RdWVyeVBhcmFtcywgaGVhZGVyUGFyYW1zLCBmb3JtUGFyYW1zLCBwb3N0Qm9keSxcclxuICAgICAgICAgICAgICBhdXRoTmFtZXMsIGNvbnRlbnRUeXBlcywgYWNjZXB0cywgcmV0dXJuVHlwZSwgY2FsbGJhY2tcclxuICAgICAgICAgICk7XHJcbiAgICAgIH1cclxuICB9O1xyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzJywgJ21vZGVsL0NsdXN0ZXJpbmcnLCAnbW9kZWwvSW1hZ2UnLCAnbW9kZWwvUG9pbnQyRCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuLi9tb2RlbC9DbHVzdGVyUGFyYW1ldGVycycpLCByZXF1aXJlKCcuLi9tb2RlbC9DbHVzdGVyaW5nJyksIHJlcXVpcmUoJy4uL21vZGVsL0ltYWdlJyksIHJlcXVpcmUoJy4uL21vZGVsL1BvaW50MkQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlZpc3VhbGl6ZUFwaSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyUGFyYW1ldGVycywgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ2x1c3RlcmluZywgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBvaW50MkQpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbiAoQXBpQ2xpZW50LCBDbHVzdGVyUGFyYW1ldGVycywgQ2x1c3RlcmluZywgSW1hZ2UsIFBvaW50MkQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIFZpc3VhbGl6ZSBzZXJ2aWNlLlxyXG4gICAqIEBtb2R1bGUgYXBpL1Zpc3VhbGl6ZUFwaVxyXG4gICAqIEB2ZXJzaW9uIDEuMS4zXHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgVmlzdWFsaXplQXBpLiBcclxuICAgKiBAYWxpYXMgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGlcclxuICAgKiBAY2xhc3NcclxuICAgKiBAcGFyYW0ge21vZHVsZTpBcGlDbGllbnR9IFthcGlDbGllbnRdIE9wdGlvbmFsIEFQSSBjbGllbnQgaW1wbGVtZW50YXRpb24gdG8gdXNlLFxyXG4gICAqIGRlZmF1bHQgdG8ge0BsaW5rIG1vZHVsZTpBcGlDbGllbnQjaW5zdGFuY2V9IGlmIHVuc3BlY2lmaWVkLlxyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oYXBpQ2xpZW50KSB7XHJcbiAgICB0aGlzLmFwaUNsaWVudCA9IGFwaUNsaWVudCB8fCBBcGlDbGllbnQuaW5zdGFuY2U7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcmVjZWl2ZSB0aGUgcmVzdWx0IG9mIHRoZSBnZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50IG9wZXJhdGlvbi5cclxuICAgICAqIEBjYWxsYmFjayBtb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50Q2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9JbWFnZX0gZGF0YSBUaGUgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VydmljZSBjYWxsLlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHJlc3BvbnNlIFRoZSBjb21wbGV0ZSBIVFRQIHJlc3BvbnNlLlxyXG4gICAgICovXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBnZW5lcmF0ZXMgdGhlIEFFIG91dHB1dCBmcm9tIGEgZ2l2ZW4gcG9pbnQgb2YgdGhlIHNhbXBsZSBkaXN0cmlidXRpb25cclxuICAgICAqIFxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gcG9pbnQyRCAyRCBQb2ludCBvZiB0aGUgc2FtcGxlIGRpc3RyaWJ1dGlvblxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6YXBpL1Zpc3VhbGl6ZUFwaX5nZW5lcmF0ZUltYWdlRnJvbVNpbmdsZVBvaW50Q2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvSW1hZ2V9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZ2VuZXJhdGVJbWFnZUZyb21TaW5nbGVQb2ludCA9IGZ1bmN0aW9uKHBvaW50MkQsIGNhbGxiYWNrKSB7XHJcbiAgICAgIHZhciBwb3N0Qm9keSA9IHBvaW50MkQ7XHJcblxyXG4gICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAncG9pbnQyRCcgaXMgc2V0XHJcbiAgICAgIGlmIChwb2ludDJEID09PSB1bmRlZmluZWQgfHwgcG9pbnQyRCA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAncG9pbnQyRCcgd2hlbiBjYWxsaW5nIGdlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnRcIik7XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICAgIHZhciBjb2xsZWN0aW9uUXVlcnlQYXJhbXMgPSB7fTtcclxuICAgICAgdmFyIGhlYWRlclBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIGZvcm1QYXJhbXMgPSB7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgYXV0aE5hbWVzID0gW107XHJcbiAgICAgIHZhciBjb250ZW50VHlwZXMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIGFjY2VwdHMgPSBbJ2FwcGxpY2F0aW9uL2pzb24nXTtcclxuICAgICAgdmFyIHJldHVyblR5cGUgPSBJbWFnZTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmFwaUNsaWVudC5jYWxsQXBpKFxyXG4gICAgICAgICcvdmlzdWFsaXplL2dlbmVyYXRlSW1hZ2VGcm9tU2luZ2xlUG9pbnQnLCAnR0VUJyxcclxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWNlaXZlIHRoZSByZXN1bHQgb2YgdGhlIGdldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZyBvcGVyYXRpb24uXHJcbiAgICAgKiBAY2FsbGJhY2sgbW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nQ2FsbGJhY2tcclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBlcnJvciBFcnJvciBtZXNzYWdlLCBpZiBhbnkuXHJcbiAgICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBkYXRhIFRoZSBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZXJ2aWNlIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gcmVzcG9uc2UgVGhlIGNvbXBsZXRlIEhUVFAgcmVzcG9uc2UuXHJcbiAgICAgKi9cclxuXHJcbiAgICAvKipcclxuICAgICAqIHJldHVybnMgdGhlIGNsdXN0ZXJpbmcgb2YgdGhlIGxhdGVudCByZXByZXNlbnRhdGlvbiBvZiBhIGhpZGRlbiBsYXllclxyXG4gICAgICogcmV0dXJucyB0aGUgY2x1c3RlcmluZyBvZiB0aGUgbGF0ZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgaGlkZGVuIGxheWVyXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gYWxnb3JpdGhtIGRldGVybWluZXMgdGhlIGNsdXRlcmluZyBhbGdvcml0aG1cclxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkaW1lbnNpb25SZWR1Y3Rpb24gZGV0ZXJtaW5lcyB0aGUgYWxnb3JpdGhtIGZvciBkaW0gcmVkdWN0aW9uXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBwYXJhbWV0ZXJzXHJcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gb3B0cy5kYXRhc2V0TmFtZSBkZXRlcm1pbmVzIHRoZSBkYXRhc2V0IHdoaWNoIHNob3VsZCBiZSBjbHVzdGVyZWQgKGRlZmF1bHQgdG8gdHJhaW5fZGF0YSlcclxuICAgICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRzLmxheWVyIGRldGVybWluZXMgdGhlIGhpZGRlbiBsYXllclxyXG4gICAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnN9IG9wdHMuY2x1c3RlclBhcmFtZXRlcnMgZGV0ZXJtaW5lcyB0aGUgY2x1dGVyaW5nIHBhcmFtZXRlcnNcclxuICAgICAqIEBwYXJhbSB7bW9kdWxlOmFwaS9WaXN1YWxpemVBcGl+Z2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiwgYWNjZXB0aW5nIHRocmVlIGFyZ3VtZW50czogZXJyb3IsIGRhdGEsIHJlc3BvbnNlXHJcbiAgICAgKiBkYXRhIGlzIG9mIHR5cGU6IHtAbGluayBtb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ31cclxuICAgICAqL1xyXG4gICAgdGhpcy5nZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmcgPSBmdW5jdGlvbiAoYWxnb3JpdGhtLCBkaW1lbnNpb25SZWR1Y3Rpb24sIG9wdHMsIGNhbGxiYWNrKSB7XHJcbiAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xyXG4gICAgICAgIHZhciBwb3N0Qm9keSA9IG9wdHNbJ2NsdXN0ZXJQYXJhbWV0ZXJzJ107XHJcblxyXG4gICAgICAgIC8vIHZlcmlmeSB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdhbGdvcml0aG0nIGlzIHNldFxyXG4gICAgICAgIGlmIChhbGdvcml0aG0gPT09IHVuZGVmaW5lZCB8fCBhbGdvcml0aG0gPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyB0aGUgcmVxdWlyZWQgcGFyYW1ldGVyICdhbGdvcml0aG0nIHdoZW4gY2FsbGluZyBnZXRIaWRkZW5MYXllckxhdGVudENsdXN0ZXJpbmdcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyB2ZXJpZnkgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZGltZW5zaW9uUmVkdWN0aW9uJyBpcyBzZXRcclxuICAgICAgICBpZiAoZGltZW5zaW9uUmVkdWN0aW9uID09PSB1bmRlZmluZWQgfHwgZGltZW5zaW9uUmVkdWN0aW9uID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgdGhlIHJlcXVpcmVkIHBhcmFtZXRlciAnZGltZW5zaW9uUmVkdWN0aW9uJyB3aGVuIGNhbGxpbmcgZ2V0SGlkZGVuTGF5ZXJMYXRlbnRDbHVzdGVyaW5nXCIpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICB2YXIgcGF0aFBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICAgICAgJ2FsZ29yaXRobSc6IGFsZ29yaXRobSxcclxuICAgICAgICAnZGF0YXNldF9uYW1lJzogb3B0c1snZGF0YXNldE5hbWUnXSxcclxuICAgICAgICAgICdkaW1lbnNpb25fcmVkdWN0aW9uJzogZGltZW5zaW9uUmVkdWN0aW9uLFxyXG4gICAgICAgICAgJ2xheWVyJzogb3B0c1snbGF5ZXInXSxcclxuICAgICAgfTtcclxuICAgICAgICB2YXIgY29sbGVjdGlvblF1ZXJ5UGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgaGVhZGVyUGFyYW1zID0ge1xyXG4gICAgICB9O1xyXG4gICAgICB2YXIgZm9ybVBhcmFtcyA9IHtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBhdXRoTmFtZXMgPSBbXTtcclxuICAgICAgdmFyIGNvbnRlbnRUeXBlcyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgYWNjZXB0cyA9IFsnYXBwbGljYXRpb24vanNvbiddO1xyXG4gICAgICB2YXIgcmV0dXJuVHlwZSA9IENsdXN0ZXJpbmc7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcy5hcGlDbGllbnQuY2FsbEFwaShcclxuICAgICAgICAgICcvdmlzdWFsaXplL2dldEhpZGRlbkxheWVyTGF0ZW50Q2x1c3RlcmluZycsICdQT1NUJyxcclxuICAgICAgICAgIHBhdGhQYXJhbXMsIHF1ZXJ5UGFyYW1zLCBjb2xsZWN0aW9uUXVlcnlQYXJhbXMsIGhlYWRlclBhcmFtcywgZm9ybVBhcmFtcywgcG9zdEJvZHksXHJcbiAgICAgICAgYXV0aE5hbWVzLCBjb250ZW50VHlwZXMsIGFjY2VwdHMsIHJldHVyblR5cGUsIGNhbGxiYWNrXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4xLjNcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9DbHVzdGVyUGFyYW1ldGVycycsICdtb2RlbC9DbHVzdGVyaW5nJywgJ21vZGVsL0Nvc3RGdW5jdGlvbicsICdtb2RlbC9JbWFnZScsICdtb2RlbC9JbWFnZURhdGEnLCAnbW9kZWwvTGVhcm5pbmdSYXRlJywgJ21vZGVsL1BhcmFtZXRlckxpc3QnLCAnbW9kZWwvUG9pbnQyRCcsICdtb2RlbC9Qcm9jZXNzZWRJbWFnZURhdGEnLCAnbW9kZWwvUmFuZG9tRnVuY3Rpb24nLCAnbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50JywgJ21vZGVsL1RyYWluU3RhdHVzJywgJ2FwaS9CdWlsZEFwaScsICdhcGkvTG9hZEFwaScsICdhcGkvVHJhaW5BcGknLCAnYXBpL1R1bmVBcGknLCAnYXBpL1Zpc3VhbGl6ZUFwaSddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vbW9kZWwvQ2x1c3RlclBhcmFtZXRlcnMnKSwgcmVxdWlyZSgnLi9tb2RlbC9DbHVzdGVyaW5nJyksIHJlcXVpcmUoJy4vbW9kZWwvQ29zdEZ1bmN0aW9uJyksIHJlcXVpcmUoJy4vbW9kZWwvSW1hZ2UnKSwgcmVxdWlyZSgnLi9tb2RlbC9JbWFnZURhdGEnKSwgcmVxdWlyZSgnLi9tb2RlbC9MZWFybmluZ1JhdGUnKSwgcmVxdWlyZSgnLi9tb2RlbC9QYXJhbWV0ZXJMaXN0JyksIHJlcXVpcmUoJy4vbW9kZWwvUG9pbnQyRCcpLCByZXF1aXJlKCcuL21vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YScpLCByZXF1aXJlKCcuL21vZGVsL1JhbmRvbUZ1bmN0aW9uJyksIHJlcXVpcmUoJy4vbW9kZWwvVHJhaW5QZXJmb3JtYW5jZScpLCByZXF1aXJlKCcuL21vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQnKSwgcmVxdWlyZSgnLi9tb2RlbC9UcmFpblN0YXR1cycpLCByZXF1aXJlKCcuL2FwaS9CdWlsZEFwaScpLCByZXF1aXJlKCcuL2FwaS9Mb2FkQXBpJyksIHJlcXVpcmUoJy4vYXBpL1RyYWluQXBpJyksIHJlcXVpcmUoJy4vYXBpL1R1bmVBcGknKSwgcmVxdWlyZSgnLi9hcGkvVmlzdWFsaXplQXBpJykpO1xyXG4gIH1cclxufShmdW5jdGlvbiAoQXBpQ2xpZW50LCBDbHVzdGVyUGFyYW1ldGVycywgQ2x1c3RlcmluZywgQ29zdEZ1bmN0aW9uLCBJbWFnZSwgSW1hZ2VEYXRhLCBMZWFybmluZ1JhdGUsIFBhcmFtZXRlckxpc3QsIFBvaW50MkQsIFByb2Nlc3NlZEltYWdlRGF0YSwgUmFuZG9tRnVuY3Rpb24sIFRyYWluUGVyZm9ybWFuY2UsIFRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQsIFRyYWluU3RhdHVzLCBCdWlsZEFwaSwgTG9hZEFwaSwgVHJhaW5BcGksIFR1bmVBcGksIFZpc3VhbGl6ZUFwaSkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgLyoqXHJcbiAgICogV2ViVUlfdG9fYnVpbGRfdHJhaW5fYW5kX3R1bmVfYV9Db252b2x1dGlvbmFsX0F1dG9lbmNvZGVyLjxicj5cclxuICAgKiBUaGUgPGNvZGU+aW5kZXg8L2NvZGU+IG1vZHVsZSBwcm92aWRlcyBhY2Nlc3MgdG8gY29uc3RydWN0b3JzIGZvciBhbGwgdGhlIGNsYXNzZXMgd2hpY2ggY29tcHJpc2UgdGhlIHB1YmxpYyBBUEkuXHJcbiAgICogPHA+XHJcbiAgICogQW4gQU1EIChyZWNvbW1lbmRlZCEpIG9yIENvbW1vbkpTIGFwcGxpY2F0aW9uIHdpbGwgZ2VuZXJhbGx5IGRvIHNvbWV0aGluZyBlcXVpdmFsZW50IHRvIHRoZSBmb2xsb3dpbmc6XHJcbiAgICogPHByZT5cclxuICAgKiB2YXIgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0gcmVxdWlyZSgnaW5kZXgnKTsgLy8gU2VlIG5vdGUgYmVsb3cqLlxyXG4gICAqIHZhciB4eHhTdmMgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlh4eEFwaSgpOyAvLyBBbGxvY2F0ZSB0aGUgQVBJIGNsYXNzIHdlJ3JlIGdvaW5nIHRvIHVzZS5cclxuICAgKiB2YXIgeXl5TW9kZWwgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLll5eSgpOyAvLyBDb25zdHJ1Y3QgYSBtb2RlbCBpbnN0YW5jZS5cclxuICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcclxuICAgKiAuLi5cclxuICAgKiB2YXIgenp6ID0geHh4U3ZjLmRvU29tZXRoaW5nKHl5eU1vZGVsKTsgLy8gSW52b2tlIHRoZSBzZXJ2aWNlLlxyXG4gICAqIC4uLlxyXG4gICAqIDwvcHJlPlxyXG4gICAqIDxlbT4qTk9URTogRm9yIGEgdG9wLWxldmVsIEFNRCBzY3JpcHQsIHVzZSByZXF1aXJlKFsnaW5kZXgnXSwgZnVuY3Rpb24oKXsuLi59KVxyXG4gICAqIGFuZCBwdXQgdGhlIGFwcGxpY2F0aW9uIGxvZ2ljIHdpdGhpbiB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uPC9lbT5cclxuICAgKiA8L3A+XHJcbiAgICogPHA+XHJcbiAgICogQSBub24tQU1EIGJyb3dzZXIgYXBwbGljYXRpb24gKGRpc2NvdXJhZ2VkKSBtaWdodCBkbyBzb21ldGhpbmcgbGlrZSB0aGlzOlxyXG4gICAqIDxwcmU+XHJcbiAgICogdmFyIHh4eFN2YyA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuWHh4QXBpKCk7IC8vIEFsbG9jYXRlIHRoZSBBUEkgY2xhc3Mgd2UncmUgZ29pbmcgdG8gdXNlLlxyXG4gICAqIHZhciB5eXkgPSBuZXcgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLll5eSgpOyAvLyBDb25zdHJ1Y3QgYSBtb2RlbCBpbnN0YW5jZS5cclxuICAgKiB5eXlNb2RlbC5zb21lUHJvcGVydHkgPSAnc29tZVZhbHVlJztcclxuICAgKiAuLi5cclxuICAgKiB2YXIgenp6ID0geHh4U3ZjLmRvU29tZXRoaW5nKHl5eU1vZGVsKTsgLy8gSW52b2tlIHRoZSBzZXJ2aWNlLlxyXG4gICAqIC4uLlxyXG4gICAqIDwvcHJlPlxyXG4gICAqIDwvcD5cclxuICAgKiBAbW9kdWxlIGluZGV4XHJcbiAgICogQHZlcnNpb24gMS4xLjNcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIEFwaUNsaWVudCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOkFwaUNsaWVudH1cclxuICAgICAqL1xyXG4gICAgQXBpQ2xpZW50OiBBcGlDbGllbnQsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBDbHVzdGVyUGFyYW1ldGVycyBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfVxyXG4gICAgICovXHJcbiAgICBDbHVzdGVyUGFyYW1ldGVyczogQ2x1c3RlclBhcmFtZXRlcnMsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBDbHVzdGVyaW5nIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ31cclxuICAgICAqL1xyXG4gICAgQ2x1c3RlcmluZzogQ2x1c3RlcmluZyxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIENvc3RGdW5jdGlvbiBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbn1cclxuICAgICAqL1xyXG4gICAgQ29zdEZ1bmN0aW9uOiBDb3N0RnVuY3Rpb24sXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBUaGUgSW1hZ2UgbW9kZWwgY29uc3RydWN0b3IuXHJcbiAgICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0ltYWdlfVxyXG4gICAgICAgKi9cclxuICAgICAgSW1hZ2U6IEltYWdlLFxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgSW1hZ2VEYXRhIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvSW1hZ2VEYXRhfVxyXG4gICAgICovXHJcbiAgICBJbWFnZURhdGE6IEltYWdlRGF0YSxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIExlYXJuaW5nUmF0ZSBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZX1cclxuICAgICAqL1xyXG4gICAgTGVhcm5pbmdSYXRlOiBMZWFybmluZ1JhdGUsXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBUaGUgUGFyYW1ldGVyTGlzdCBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvUGFyYW1ldGVyTGlzdH1cclxuICAgICAgICovXHJcbiAgICAgIFBhcmFtZXRlckxpc3Q6IFBhcmFtZXRlckxpc3QsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBQb2ludDJEIG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvUG9pbnQyRH1cclxuICAgICAqL1xyXG4gICAgUG9pbnQyRDogUG9pbnQyRCxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFByb2Nlc3NlZEltYWdlRGF0YSBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX1cclxuICAgICAqL1xyXG4gICAgUHJvY2Vzc2VkSW1hZ2VEYXRhOiBQcm9jZXNzZWRJbWFnZURhdGEsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBSYW5kb21GdW5jdGlvbiBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9ufVxyXG4gICAgICovXHJcbiAgICBSYW5kb21GdW5jdGlvbjogUmFuZG9tRnVuY3Rpb24sXHJcbiAgICAgIC8qKlxyXG4gICAgICAgKiBUaGUgVHJhaW5QZXJmb3JtYW5jZSBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZX1cclxuICAgICAgICovXHJcbiAgICAgIFRyYWluUGVyZm9ybWFuY2U6IFRyYWluUGVyZm9ybWFuY2UsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50IG1vZGVsIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludH1cclxuICAgICAqL1xyXG4gICAgVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludDogVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCxcclxuICAgICAgLyoqXHJcbiAgICAgICAqIFRoZSBUcmFpblN0YXR1cyBtb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgICAgICogQHByb3BlcnR5IHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9XHJcbiAgICAgICAqL1xyXG4gICAgICBUcmFpblN0YXR1czogVHJhaW5TdGF0dXMsXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBCdWlsZEFwaSBzZXJ2aWNlIGNvbnN0cnVjdG9yLlxyXG4gICAgICogQHByb3BlcnR5IHttb2R1bGU6YXBpL0J1aWxkQXBpfVxyXG4gICAgICovXHJcbiAgICBCdWlsZEFwaTogQnVpbGRBcGksXHJcbiAgICAvKipcclxuICAgICAqIFRoZSBMb2FkQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvTG9hZEFwaX1cclxuICAgICAqL1xyXG4gICAgTG9hZEFwaTogTG9hZEFwaSxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFRyYWluQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvVHJhaW5BcGl9XHJcbiAgICAgKi9cclxuICAgIFRyYWluQXBpOiBUcmFpbkFwaSxcclxuICAgIC8qKlxyXG4gICAgICogVGhlIFR1bmVBcGkgc2VydmljZSBjb25zdHJ1Y3Rvci5cclxuICAgICAqIEBwcm9wZXJ0eSB7bW9kdWxlOmFwaS9UdW5lQXBpfVxyXG4gICAgICovXHJcbiAgICBUdW5lQXBpOiBUdW5lQXBpLFxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgVmlzdWFsaXplQXBpIHNlcnZpY2UgY29uc3RydWN0b3IuXHJcbiAgICAgKiBAcHJvcGVydHkge21vZHVsZTphcGkvVmlzdWFsaXplQXBpfVxyXG4gICAgICovXHJcbiAgICBWaXN1YWxpemVBcGk6IFZpc3VhbGl6ZUFwaVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS4zXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkNsdXN0ZXJQYXJhbWV0ZXJzID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBDbHVzdGVyUGFyYW1ldGVycyBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9DbHVzdGVyUGFyYW1ldGVyc1xyXG4gICAqIEB2ZXJzaW9uIDEuMS4zXHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+Q2x1c3RlclBhcmFtZXRlcnM8L2NvZGU+LlxyXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvQ2x1c3RlclBhcmFtZXRlcnNcclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+Q2x1c3RlclBhcmFtZXRlcnM8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cclxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXHJcbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0NsdXN0ZXJQYXJhbWV0ZXJzfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkNsdXN0ZXJQYXJhbWV0ZXJzPC9jb2RlPiBpbnN0YW5jZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xyXG5cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25fY2x1c3RlcnMnKSkge1xyXG4gICAgICAgIG9ialsnbl9jbHVzdGVycyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbl9jbHVzdGVycyddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2luaXQnKSkge1xyXG4gICAgICAgIG9ialsnaW5pdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5pdCddLCAnU3RyaW5nJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ25faW5pdCcpKSB7XHJcbiAgICAgICAgb2JqWyduX2luaXQnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25faW5pdCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heF9pdGVyJykpIHtcclxuICAgICAgICBvYmpbJ21heF9pdGVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhfaXRlciddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3RvbCcpKSB7XHJcbiAgICAgICAgb2JqWyd0b2wnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3RvbCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJykpIHtcclxuICAgICAgICBvYmpbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydwcmVjb21wdXRlX2Rpc3RhbmNlcyddLCAnU3RyaW5nJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3ZlcmJvc2UnKSkge1xyXG4gICAgICAgIG9ialsndmVyYm9zZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsndmVyYm9zZSddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV9zdGF0ZScpKSB7XHJcbiAgICAgICAgb2JqWydyYW5kb21fc3RhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9zdGF0ZSddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NvcHlfeCcpKSB7XHJcbiAgICAgICAgb2JqWydjb3B5X3gnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NvcHlfeCddLCAnQm9vbGVhbicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCduX2pvYnMnKSkge1xyXG4gICAgICAgIG9ialsnbl9qb2JzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyduX2pvYnMnXSwgJ051bWJlcicpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhbGdvcml0aG0nKSkge1xyXG4gICAgICAgIG9ialsnYWxnb3JpdGhtJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydhbGdvcml0aG0nXSwgJ1N0cmluZycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBuX2NsdXN0ZXJzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fY2x1c3RlcnMnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IGluaXRcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnaW5pdCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbl9pbml0XHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25faW5pdCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWF4X2l0ZXJcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4X2l0ZXInXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHRvbFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyd0b2wnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHByZWNvbXB1dGVfZGlzdGFuY2VzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ByZWNvbXB1dGVfZGlzdGFuY2VzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSB2ZXJib3NlXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3ZlcmJvc2UnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IHJhbmRvbV9zdGF0ZVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydyYW5kb21fc3RhdGUnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtCb29sZWFufSBjb3B5X3hcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnY29weV94J10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBuX2pvYnNcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbl9qb2JzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7U3RyaW5nfSBhbGdvcml0aG1cclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnYWxnb3JpdGhtJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Qb2ludDJEJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL1BvaW50MkQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5DbHVzdGVyaW5nID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBvaW50MkQpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIFBvaW50MkQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBDbHVzdGVyaW5nIG1vZGVsIG1vZHVsZS5cclxuICAgKiBAbW9kdWxlIG1vZGVsL0NsdXN0ZXJpbmdcclxuICAgKiBAdmVyc2lvbiAxLjEuM1xyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+LlxyXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ1xyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+Q2x1c3RlcmluZzwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxyXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ2x1c3RlcmluZ30gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9DbHVzdGVyaW5nfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkNsdXN0ZXJpbmc8L2NvZGU+IGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWluWCcpKSB7XHJcbiAgICAgICAgb2JqWydtaW5YJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtaW5YJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4WCcpKSB7XHJcbiAgICAgICAgb2JqWydtYXhYJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhYJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWluWScpKSB7XHJcbiAgICAgICAgb2JqWydtaW5ZJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtaW5ZJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbWF4WScpKSB7XHJcbiAgICAgICAgb2JqWydtYXhZJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXhZJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbkNsdXN0ZXJzJykpIHtcclxuICAgICAgICBvYmpbJ25DbHVzdGVycyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbkNsdXN0ZXJzJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncG9pbnRzJykpIHtcclxuICAgICAgICBvYmpbJ3BvaW50cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncG9pbnRzJ10sIFtQb2ludDJEXSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvYmo7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1pblhcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbWluWCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbWF4WFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydtYXhYJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBtaW5ZXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ21pblknXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IG1heFlcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4WSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbkNsdXN0ZXJzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25DbHVzdGVycyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvUG9pbnQyRD59IHBvaW50c1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydwb2ludHMnXSA9IHVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Db3N0RnVuY3Rpb24gPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XG4gICd1c2Ugc3RyaWN0JztcblxuXG5cblxuICAvKipcbiAgICogVGhlIENvc3RGdW5jdGlvbiBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvQ29zdEZ1bmN0aW9uXG4gICAqIEB2ZXJzaW9uIDEuMS4zXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkNvc3RGdW5jdGlvbjwvY29kZT4uXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvQ29zdEZ1bmN0aW9uXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG5cbiAgfTtcblxuICAvKipcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPkNvc3RGdW5jdGlvbjwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvQ29zdEZ1bmN0aW9ufSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Db3N0RnVuY3Rpb259IFRoZSBwb3B1bGF0ZWQgPGNvZGU+Q29zdEZ1bmN0aW9uPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2Nvc3RfZnVuY3Rpb24nKSkge1xuICAgICAgICBvYmpbJ2NmX2Nvc3RfZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX2Nvc3RfZnVuY3Rpb24nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX21heF92YWwnKSkge1xuICAgICAgICBvYmpbJ2NmX21heF92YWwnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2NmX21heF92YWwnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfZmlsdGVyX3NpemUnKSkge1xuICAgICAgICBvYmpbJ2NmX2ZpbHRlcl9zaXplJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9maWx0ZXJfc2l6ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl9maWx0ZXJfc2lnbWEnKSkge1xuICAgICAgICBvYmpbJ2NmX2ZpbHRlcl9zaWdtYSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfZmlsdGVyX3NpZ21hJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2NmX2sxJykpIHtcbiAgICAgICAgb2JqWydjZl9rMSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY2ZfazEnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2ZfazInKSkge1xuICAgICAgICBvYmpbJ2NmX2syJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl9rMiddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdjZl93ZWlnaHRzJykpIHtcbiAgICAgICAgb2JqWydjZl93ZWlnaHRzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjZl93ZWlnaHRzJ10sIFtbJ051bWJlciddXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBjZl9jb3N0X2Z1bmN0aW9uXG4gICAqIEBkZWZhdWx0ICdzcXVhcmVkX3BpeGVsX2Rpc3RhbmNlJ1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2Nvc3RfZnVuY3Rpb24nXSA9ICdzcXVhcmVkX3BpeGVsX2Rpc3RhbmNlJztcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9tYXhfdmFsXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfbWF4X3ZhbCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGNmX2ZpbHRlcl9zaXplXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY2ZfZmlsdGVyX3NpemUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9maWx0ZXJfc2lnbWFcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9maWx0ZXJfc2lnbWEnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBjZl9rMVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX2sxJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gY2ZfazJcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydjZl9rMiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gY2Zfd2VpZ2h0c1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2NmX3dlaWdodHMnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4xLjNcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICBkZWZpbmUoWydBcGlDbGllbnQnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCk7XHJcbiAgfVxyXG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcblxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIEltYWdlIG1vZGVsIG1vZHVsZS5cclxuICAgKiBAbW9kdWxlIG1vZGVsL0ltYWdlXHJcbiAgICogQHZlcnNpb24gMS4xLjNcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5JbWFnZTwvY29kZT4uXHJcbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9JbWFnZVxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+SW1hZ2U8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cclxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXHJcbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0ltYWdlfSBUaGUgcG9wdWxhdGVkIDxjb2RlPkltYWdlPC9jb2RlPiBpbnN0YW5jZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xyXG5cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2J5dGVzdHJpbmcnKSkge1xyXG4gICAgICAgIG9ialsnYnl0ZXN0cmluZyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYnl0ZXN0cmluZyddLCAnU3RyaW5nJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lkJykpIHtcclxuICAgICAgICBvYmpbJ2lkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydpZCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdCcpKSB7XHJcbiAgICAgICAgICAgIG9ialsnY29zdCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnY29zdCddLCAnTnVtYmVyJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gYnl0ZXN0cmluZ1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydieXRlc3RyaW5nJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSBpZFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydpZCddID0gdW5kZWZpbmVkO1xyXG4gICAgLyoqXHJcbiAgICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGNvc3RcclxuICAgICAqL1xyXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2Nvc3QnXSA9IHVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qKlxyXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqIFdlYlVJIHRvIGJ1aWxkLCB0cmFpbiBhbmQgdHVuZSBhIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICpcclxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS4zXHJcbiAqIENvbnRhY3Q6IGxlb24uc2NodWV0ekBzdHVkZW50LnVuaS10dWViaW5nZW4uZGVcclxuICpcclxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxyXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc3dhZ2dlci1hcGkvc3dhZ2dlci1jb2RlZ2VuLmdpdFxyXG4gKlxyXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcclxuICpcclxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxyXG4gKlxyXG4gKi9cclxuXHJcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XHJcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxyXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50JywgJ21vZGVsL0ltYWdlJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpLCByZXF1aXJlKCcuL0ltYWdlJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxyXG4gICAgaWYgKCFyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlcikge1xyXG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xyXG4gICAgfVxyXG4gICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2VEYXRhID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkltYWdlKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50LCBJbWFnZSkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcblxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIEltYWdlRGF0YSBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9JbWFnZURhdGFcclxuICAgKiBAdmVyc2lvbiAxLjEuM1xyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPkltYWdlRGF0YTwvY29kZT4uXHJcbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9JbWFnZURhdGFcclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG5cclxuXHJcblxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5JbWFnZURhdGE8L2NvZGU+IGZyb20gYSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCwgb3B0aW9uYWxseSBjcmVhdGluZyBhIG5ldyBpbnN0YW5jZS5cclxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxyXG4gICAqIEBwYXJhbSB7bW9kdWxlOm1vZGVsL0ltYWdlRGF0YX0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9JbWFnZURhdGF9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+SW1hZ2VEYXRhPC9jb2RlPiBpbnN0YW5jZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihkYXRhLCBvYmopIHtcclxuICAgIGlmIChkYXRhKSB7XHJcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xyXG5cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ251bUltYWdlcycpKSB7XHJcbiAgICAgICAgb2JqWydudW1JbWFnZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bUltYWdlcyddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3Jlc1gnKSkge1xyXG4gICAgICAgIG9ialsncmVzWCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmVzWCddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3Jlc1knKSkge1xyXG4gICAgICAgIG9ialsncmVzWSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsncmVzWSddLCAnTnVtYmVyJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2ltYWdlcycpKSB7XHJcbiAgICAgICAgb2JqWydpbWFnZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2ltYWdlcyddLCBbSW1hZ2VdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gbnVtSW1hZ2VzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ251bUltYWdlcyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0gcmVzWFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydyZXNYJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSByZXNZXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3Jlc1knXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0ltYWdlPn0gaW1hZ2VzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2ltYWdlcyddID0gdW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcblxyXG5cclxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS4zXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkxlYXJuaW5nUmF0ZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcbiAgfVxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG5cblxuXG4gIC8qKlxuICAgKiBUaGUgTGVhcm5pbmdSYXRlIG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9MZWFybmluZ1JhdGVcbiAgICogQHZlcnNpb24gMS4xLjNcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+TGVhcm5pbmdSYXRlPC9jb2RlPi5cbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9MZWFybmluZ1JhdGVcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuXG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+TGVhcm5pbmdSYXRlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgYmVhcmluZyBwcm9wZXJ0aWVzIG9mIGludGVyZXN0LlxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9MZWFybmluZ1JhdGV9IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZX0gVGhlIHBvcHVsYXRlZCA8Y29kZT5MZWFybmluZ1JhdGU8L2NvZGU+IGluc3RhbmNlLlxuICAgKi9cbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIG9iaiA9IG9iaiB8fCBuZXcgZXhwb3J0cygpO1xuXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGVhcm5pbmdfcmF0ZV9mdW5jdGlvbicpKSB7XG4gICAgICAgIG9ialsnbGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiddLCAnU3RyaW5nJyk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJykpIHtcbiAgICAgICAgb2JqWydscl9pbml0aWFsX2xlYXJuaW5nX3JhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2luaXRpYWxfbGVhcm5pbmdfcmF0ZSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9kZWNheV9zdGVwcycpKSB7XG4gICAgICAgIG9ialsnbHJfZGVjYXlfc3RlcHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2RlY2F5X3N0ZXBzJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX2RlY2F5X3JhdGUnKSkge1xuICAgICAgICBvYmpbJ2xyX2RlY2F5X3JhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2RlY2F5X3JhdGUnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfc3RhaXJjYXNlJykpIHtcbiAgICAgICAgb2JqWydscl9zdGFpcmNhc2UnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX3N0YWlyY2FzZSddLCBbJ0Jvb2xlYW4nXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfYm91bmRhcmllcycpKSB7XG4gICAgICAgIG9ialsnbHJfYm91bmRhcmllcyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfYm91bmRhcmllcyddLCBbWydOdW1iZXInXV0pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3ZhbHVlcycpKSB7XG4gICAgICAgIG9ialsnbHJfdmFsdWVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl92YWx1ZXMnXSwgW1snTnVtYmVyJ11dKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdscl9lbmRfbGVhcm5pbmdfcmF0ZScpKSB7XG4gICAgICAgIG9ialsnbHJfZW5kX2xlYXJuaW5nX3JhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xyX2VuZF9sZWFybmluZ19yYXRlJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2xyX3Bvd2VyJykpIHtcbiAgICAgICAgb2JqWydscl9wb3dlciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbHJfcG93ZXInXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbHJfY3ljbGUnKSkge1xuICAgICAgICBvYmpbJ2xyX2N5Y2xlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydscl9jeWNsZSddLCBbJ0Jvb2xlYW4nXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlciB7U3RyaW5nfSBsZWFybmluZ19yYXRlX2Z1bmN0aW9uXG4gICAqIEBkZWZhdWx0ICdzdGF0aWMnXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbGVhcm5pbmdfcmF0ZV9mdW5jdGlvbiddID0gJ3N0YXRpYyc7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfaW5pdGlhbF9sZWFybmluZ19yYXRlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbHJfZGVjYXlfc3RlcHNcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9kZWNheV9zdGVwcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2RlY2F5X3JhdGVcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydscl9kZWNheV9yYXRlJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48Qm9vbGVhbj59IGxyX3N0YWlyY2FzZVxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX3N0YWlyY2FzZSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gbHJfYm91bmRhcmllc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX2JvdW5kYXJpZXMnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxBcnJheS48TnVtYmVyPj59IGxyX3ZhbHVlc1xuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX3ZhbHVlcyddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGxyX2VuZF9sZWFybmluZ19yYXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfZW5kX2xlYXJuaW5nX3JhdGUnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBscl9wb3dlclxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2xyX3Bvd2VyJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48Qm9vbGVhbj59IGxyX2N5Y2xlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbHJfY3ljbGUnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4xLjNcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9Db3N0RnVuY3Rpb24nLCAnbW9kZWwvTGVhcm5pbmdSYXRlJywgJ21vZGVsL1JhbmRvbUZ1bmN0aW9uJ10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vQ29zdEZ1bmN0aW9uJyksIHJlcXVpcmUoJy4vTGVhcm5pbmdSYXRlJyksIHJlcXVpcmUoJy4vUmFuZG9tRnVuY3Rpb24nKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlBhcmFtZXRlckxpc3QgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQ29zdEZ1bmN0aW9uLCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5MZWFybmluZ1JhdGUsIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlJhbmRvbUZ1bmN0aW9uKTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24gKEFwaUNsaWVudCwgQ29zdEZ1bmN0aW9uLCBMZWFybmluZ1JhdGUsIFJhbmRvbUZ1bmN0aW9uKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBUaGUgUGFyYW1ldGVyTGlzdCBtb2RlbCBtb2R1bGUuXHJcbiAgICogQG1vZHVsZSBtb2RlbC9QYXJhbWV0ZXJMaXN0XHJcbiAgICogQHZlcnNpb24gMS4xLjNcclxuICAgKi9cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIG5ldyA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPi5cclxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3RcclxuICAgKiBAY2xhc3NcclxuICAgKi9cclxuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIF90aGlzID0gdGhpcztcclxuXHJcblxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5QYXJhbWV0ZXJMaXN0PC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXHJcbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cclxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9QYXJhbWV0ZXJMaXN0fSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXHJcbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1BhcmFtZXRlckxpc3R9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+UGFyYW1ldGVyTGlzdDwvY29kZT4gaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcclxuXHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdpbnB1dF9zaGFwZScpKSB7XHJcbiAgICAgICAgb2JqWydpbnB1dF9zaGFwZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5wdXRfc2hhcGUnXSwgW1snTnVtYmVyJ11dKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbnVtYmVyX29mX3N0YWNrcycpKSB7XHJcbiAgICAgICAgb2JqWydudW1iZXJfb2Zfc3RhY2tzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydudW1iZXJfb2Zfc3RhY2tzJ10sIFtbJ051bWJlciddXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2ZpbHRlcl9zaXplcycpKSB7XHJcbiAgICAgICAgb2JqWydmaWx0ZXJfc2l6ZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2ZpbHRlcl9zaXplcyddLCBbWydOdW1iZXInXV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtaXJyb3Jfd2VpZ2h0cycpKSB7XHJcbiAgICAgICAgb2JqWydtaXJyb3Jfd2VpZ2h0cyddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWlycm9yX3dlaWdodHMnXSwgWydCb29sZWFuJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdhY3RpdmF0aW9uX2Z1bmN0aW9uJykpIHtcclxuICAgICAgICBvYmpbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSwgWydTdHJpbmcnXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2JhdGNoX3NpemUnKSkge1xyXG4gICAgICAgIG9ialsnYmF0Y2hfc2l6ZSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYmF0Y2hfc2l6ZSddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbl9lcG9jaHMnKSkge1xyXG4gICAgICAgIG9ialsnbl9lcG9jaHMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ25fZXBvY2hzJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCd1c2VfdGVuc29yYm9hcmQnKSkge1xyXG4gICAgICAgIG9ialsndXNlX3RlbnNvcmJvYXJkJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd1c2VfdGVuc29yYm9hcmQnXSwgJ0Jvb2xlYW4nKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgndmVyYm9zZScpKSB7XHJcbiAgICAgICAgb2JqWyd2ZXJib3NlJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd2ZXJib3NlJ10sICdCb29sZWFuJyk7XHJcbiAgICAgIH1cclxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGVhcm5pbmdfcmF0ZV9kaWN0JykpIHtcclxuICAgICAgICAgICAgb2JqWydsZWFybmluZ19yYXRlX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xlYXJuaW5nX3JhdGVfZGljdCddLCBbTGVhcm5pbmdSYXRlXSk7XHJcbiAgICAgIH1cclxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY29zdF9mdW5jdGlvbl9kaWN0JykpIHtcclxuICAgICAgICAgICAgb2JqWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Nvc3RfZnVuY3Rpb25fZGljdCddLCBbQ29zdEZ1bmN0aW9uXSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ29wdGltaXplcicpKSB7XHJcbiAgICAgICAgb2JqWydvcHRpbWl6ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ29wdGltaXplciddLCBbJ1N0cmluZyddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbW9tZW50dW0nKSkge1xyXG4gICAgICAgIG9ialsnbW9tZW50dW0nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ21vbWVudHVtJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV93ZWlnaHRzX2RpY3QnKSkge1xyXG4gICAgICAgICAgICBvYmpbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSwgW1JhbmRvbUZ1bmN0aW9uXSk7XHJcbiAgICAgIH1cclxuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgncmFuZG9tX2JpYXNlc19kaWN0JykpIHtcclxuICAgICAgICAgICAgb2JqWydyYW5kb21fYmlhc2VzX2RpY3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3JhbmRvbV9iaWFzZXNfZGljdCddLCBbUmFuZG9tRnVuY3Rpb25dKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2Vzc2lvbl9zYXZlcl9wYXRoJykpIHtcclxuICAgICAgICBvYmpbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc2Vzc2lvbl9zYXZlcl9wYXRoJ10sICdTdHJpbmcnKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbG9hZF9wcmV2X3Nlc3Npb24nKSkge1xyXG4gICAgICAgIG9ialsnbG9hZF9wcmV2X3Nlc3Npb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xvYWRfcHJldl9zZXNzaW9uJ10sICdCb29sZWFuJyk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbicpKSB7XHJcbiAgICAgICAgb2JqWydzZXNzaW9uX3NhdmVfZHVyYXRpb24nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3Nlc3Npb25fc2F2ZV9kdXJhdGlvbiddLCBbJ051bWJlciddKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbnVtX3Rlc3RfcGljdHVyZXMnKSkge1xyXG4gICAgICAgIG9ialsnbnVtX3Rlc3RfcGljdHVyZXMnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ251bV90ZXN0X3BpY3R1cmVzJ10sIFsnTnVtYmVyJ10pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPEFycmF5LjxOdW1iZXI+Pn0gaW5wdXRfc2hhcGVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnaW5wdXRfc2hhcGUnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBudW1iZXJfb2Zfc3RhY2tzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ251bWJlcl9vZl9zdGFja3MnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPE51bWJlcj4+fSBmaWx0ZXJfc2l6ZXNcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnZmlsdGVyX3NpemVzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPEJvb2xlYW4+fSBtaXJyb3Jfd2VpZ2h0c1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydtaXJyb3Jfd2VpZ2h0cyddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxTdHJpbmc+fSBhY3RpdmF0aW9uX2Z1bmN0aW9uXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2FjdGl2YXRpb25fZnVuY3Rpb24nXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gYmF0Y2hfc2l6ZVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydiYXRjaF9zaXplJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG5fZXBvY2hzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ25fZXBvY2hzJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gdXNlX3RlbnNvcmJvYXJkXHJcbiAgICogQGRlZmF1bHQgdHJ1ZVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyd1c2VfdGVuc29yYm9hcmQnXSA9IHRydWU7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7Qm9vbGVhbn0gdmVyYm9zZVxyXG4gICAqIEBkZWZhdWx0IHRydWVcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsndmVyYm9zZSddID0gdHJ1ZTtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0xlYXJuaW5nUmF0ZT59IGxlYXJuaW5nX3JhdGVfZGljdFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydsZWFybmluZ19yYXRlX2RpY3QnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL0Nvc3RGdW5jdGlvbj59IGNvc3RfZnVuY3Rpb25fZGljdFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydjb3N0X2Z1bmN0aW9uX2RpY3QnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48U3RyaW5nPn0gb3B0aW1pemVyXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ29wdGltaXplciddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBtb21lbnR1bVxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydtb21lbnR1bSddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb24+fSByYW5kb21fd2VpZ2h0c19kaWN0XHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV93ZWlnaHRzX2RpY3QnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9uPn0gcmFuZG9tX2JpYXNlc19kaWN0XHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV9iaWFzZXNfZGljdCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gc2Vzc2lvbl9zYXZlcl9wYXRoXHJcbiAgICogQGRlZmF1bHQgJy4vc2F2ZS8nXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3Nlc3Npb25fc2F2ZXJfcGF0aCddID0gJy4vc2F2ZS8nO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0Jvb2xlYW59IGxvYWRfcHJldl9zZXNzaW9uXHJcbiAgICogQGRlZmF1bHQgZmFsc2VcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbG9hZF9wcmV2X3Nlc3Npb24nXSA9IGZhbHNlO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBzZXNzaW9uX3NhdmVfZHVyYXRpb25cclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnc2Vzc2lvbl9zYXZlX2R1cmF0aW9uJ10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG51bV90ZXN0X3BpY3R1cmVzXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ251bV90ZXN0X3BpY3R1cmVzJ10gPSB1bmRlZmluZWQ7XHJcblxyXG5cclxuXHJcbiAgcmV0dXJuIGV4cG9ydHM7XHJcbn0pKTtcclxuXHJcblxyXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qb2ludDJEID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQpIHtcclxuICAndXNlIHN0cmljdCc7XHJcblxyXG5cclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRoZSBQb2ludDJEIG1vZGVsIG1vZHVsZS5cclxuICAgKiBAbW9kdWxlIG1vZGVsL1BvaW50MkRcclxuICAgKiBAdmVyc2lvbiAxLjEuM1xyXG4gICAqL1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlBvaW50MkQ8L2NvZGU+LlxyXG4gICAqIEBhbGlhcyBtb2R1bGU6bW9kZWwvUG9pbnQyRFxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuXHJcblxyXG5cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+UG9pbnQyRDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxyXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUG9pbnQyRH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxyXG4gICAqIEByZXR1cm4ge21vZHVsZTptb2RlbC9Qb2ludDJEfSBUaGUgcG9wdWxhdGVkIDxjb2RlPlBvaW50MkQ8L2NvZGU+IGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneCcpKSB7XHJcbiAgICAgICAgb2JqWyd4J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd4J10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgneScpKSB7XHJcbiAgICAgICAgb2JqWyd5J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd5J10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnY2x1c3RlcicpKSB7XHJcbiAgICAgICAgb2JqWydjbHVzdGVyJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydjbHVzdGVyJ10sICdOdW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge051bWJlcn0geFxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyd4J10gPSB1bmRlZmluZWQ7XHJcbiAgLyoqXHJcbiAgICogQG1lbWJlciB7TnVtYmVyfSB5XHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3knXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtOdW1iZXJ9IGNsdXN0ZXJcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnY2x1c3RlciddID0gdW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcblxyXG5cclxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4xLjNcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICBkZWZpbmUoWydBcGlDbGllbnQnLCAnbW9kZWwvSW1hZ2UnXSwgZmFjdG9yeSk7XHJcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xyXG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vSW1hZ2UnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5Qcm9jZXNzZWRJbWFnZURhdGEgPSBmYWN0b3J5KHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLkFwaUNsaWVudCwgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuSW1hZ2UpO1xyXG4gIH1cclxufSh0aGlzLCBmdW5jdGlvbihBcGlDbGllbnQsIEltYWdlKSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcblxyXG5cclxuICAvKipcclxuICAgKiBUaGUgUHJvY2Vzc2VkSW1hZ2VEYXRhIG1vZGVsIG1vZHVsZS5cclxuICAgKiBAbW9kdWxlIG1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YVxyXG4gICAqIEB2ZXJzaW9uIDEuMS4zXHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UHJvY2Vzc2VkSW1hZ2VEYXRhPC9jb2RlPi5cclxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YVxyXG4gICAqIEBjbGFzc1xyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG5cclxuXHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogQ29uc3RydWN0cyBhIDxjb2RlPlByb2Nlc3NlZEltYWdlRGF0YTwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxyXG4gICAqIENvcGllcyBhbGwgcmVsZXZhbnQgcHJvcGVydGllcyBmcm9tIDxjb2RlPmRhdGE8L2NvZGU+IHRvIDxjb2RlPm9iajwvY29kZT4gaWYgc3VwcGxpZWQgb3IgYSBuZXcgaW5zdGFuY2UgaWYgbm90LlxyXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBwbGFpbiBKYXZhU2NyaXB0IG9iamVjdCBiZWFyaW5nIHByb3BlcnRpZXMgb2YgaW50ZXJlc3QuXHJcbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUHJvY2Vzc2VkSW1hZ2VEYXRhfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXHJcbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1Byb2Nlc3NlZEltYWdlRGF0YX0gVGhlIHBvcHVsYXRlZCA8Y29kZT5Qcm9jZXNzZWRJbWFnZURhdGE8L2NvZGU+IGluc3RhbmNlLlxyXG4gICAqL1xyXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xyXG4gICAgaWYgKGRhdGEpIHtcclxuICAgICAgb2JqID0gb2JqIHx8IG5ldyBleHBvcnRzKCk7XHJcblxyXG4gICAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdlcG9jaCcpKSB7XHJcbiAgICAgICAgICAgIG9ialsnZXBvY2gnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Vwb2NoJ10sICdOdW1iZXInKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3N0ZXAnKSkge1xyXG4gICAgICAgICAgICBvYmpbJ3N0ZXAnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3N0ZXAnXSwgJ051bWJlcicpO1xyXG4gICAgICAgIH1cclxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2lucHV0TGF5ZXInKSkge1xyXG4gICAgICAgIG9ialsnaW5wdXRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnaW5wdXRMYXllciddLCBbSW1hZ2VdKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGF0ZW50TGF5ZXInKSkge1xyXG4gICAgICAgICAgb2JqWydsYXRlbnRMYXllciddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbGF0ZW50TGF5ZXInXSwgW1tJbWFnZV1dKTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnb3V0cHV0TGF5ZXInKSkge1xyXG4gICAgICAgIG9ialsnb3V0cHV0TGF5ZXInXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ291dHB1dExheWVyJ10sIFtJbWFnZV0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb2JqO1xyXG4gIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEBtZW1iZXIge051bWJlcn0gZXBvY2hcclxuICAgICAqL1xyXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ2Vwb2NoJ10gPSB1bmRlZmluZWQ7XHJcbiAgICAvKipcclxuICAgICAqIEBtZW1iZXIge051bWJlcn0gc3RlcFxyXG4gICAgICovXHJcbiAgICBleHBvcnRzLnByb3RvdHlwZVsnc3RlcCddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+fSBpbnB1dExheWVyXHJcbiAgICovXHJcbiAgZXhwb3J0cy5wcm90b3R5cGVbJ2lucHV0TGF5ZXInXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtBcnJheS48QXJyYXkuPG1vZHVsZTptb2RlbC9JbWFnZT4+fSBsYXRlbnRMYXllclxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydsYXRlbnRMYXllciddID0gdW5kZWZpbmVkO1xyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge0FycmF5Ljxtb2R1bGU6bW9kZWwvSW1hZ2U+fSBvdXRwdXRMYXllclxyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWydvdXRwdXRMYXllciddID0gdW5kZWZpbmVkO1xyXG5cclxuXHJcblxyXG4gIHJldHVybiBleHBvcnRzO1xyXG59KSk7XHJcblxyXG5cclxuIiwiLyoqXG4gKiBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXG4gKlxuICogT3BlbkFQSSBzcGVjIHZlcnNpb246IDEuMS4zXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXG4gKlxuICogTk9URTogVGhpcyBjbGFzcyBpcyBhdXRvIGdlbmVyYXRlZCBieSB0aGUgc3dhZ2dlciBjb2RlIGdlbmVyYXRvciBwcm9ncmFtLlxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcbiAqXG4gKiBTd2FnZ2VyIENvZGVnZW4gdmVyc2lvbjogMi4zLjFcbiAqXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXG4gKlxuICovXG5cbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgZGVmaW5lKFsnQXBpQ2xpZW50J10sIGZhY3RvcnkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgLy8gQ29tbW9uSlMtbGlrZSBlbnZpcm9ubWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJy4uL0FwaUNsaWVudCcpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBCcm93c2VyIGdsb2JhbHMgKHJvb3QgaXMgd2luZG93KVxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XG4gICAgfVxuICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyLlJhbmRvbUZ1bmN0aW9uID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBSYW5kb21GdW5jdGlvbiBtb2RlbCBtb2R1bGUuXG4gICAqIEBtb2R1bGUgbW9kZWwvUmFuZG9tRnVuY3Rpb25cbiAgICogQHZlcnNpb24gMS4xLjNcbiAgICovXG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+UmFuZG9tRnVuY3Rpb248L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9uXG4gICAqIEBjbGFzc1xuICAgKi9cbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG5cblxuXG5cblxuXG5cblxuXG4gIH07XG5cbiAgLyoqXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5SYW5kb21GdW5jdGlvbjwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvUmFuZG9tRnVuY3Rpb259IG9iaiBPcHRpb25hbCBpbnN0YW5jZSB0byBwb3B1bGF0ZS5cbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1JhbmRvbUZ1bmN0aW9ufSBUaGUgcG9wdWxhdGVkIDxjb2RlPlJhbmRvbUZ1bmN0aW9uPC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3JhbmRvbV9mdW5jdGlvbicpKSB7XG4gICAgICAgIG9ialsncmFuZG9tX2Z1bmN0aW9uJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydyYW5kb21fZnVuY3Rpb24nXSwgJ1N0cmluZycpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2FscGhhJykpIHtcbiAgICAgICAgb2JqWydhbHBoYSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYWxwaGEnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnYmV0YScpKSB7XG4gICAgICAgIG9ialsnYmV0YSddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnYmV0YSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtZWFuJykpIHtcbiAgICAgICAgb2JqWydtZWFuJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtZWFuJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3N0ZGRldicpKSB7XG4gICAgICAgIG9ialsnc3RkZGV2J10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydzdGRkZXYnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnbGFtJykpIHtcbiAgICAgICAgb2JqWydsYW0nXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2xhbSddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtaW52YWwnKSkge1xuICAgICAgICBvYmpbJ21pbnZhbCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbWludmFsJ10sIFsnTnVtYmVyJ10pO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ21heHZhbCcpKSB7XG4gICAgICAgIG9ialsnbWF4dmFsJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWydtYXh2YWwnXSwgWydOdW1iZXInXSk7XG4gICAgICB9XG4gICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eSgnc2VlZCcpKSB7XG4gICAgICAgIG9ialsnc2VlZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnc2VlZCddLCBbJ051bWJlciddKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHJhbmRvbV9mdW5jdGlvblxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3JhbmRvbV9mdW5jdGlvbiddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IGFscGhhXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYWxwaGEnXSA9IHVuZGVmaW5lZDtcbiAgLyoqXG4gICAqIEBtZW1iZXIge0FycmF5LjxOdW1iZXI+fSBiZXRhXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnYmV0YSddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7QXJyYXkuPE51bWJlcj59IG1lYW5cbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydtZWFuJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gc3RkZGV2XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc3RkZGV2J10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbGFtXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbGFtJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbWludmFsXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWludmFsJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gbWF4dmFsXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnbWF4dmFsJ10gPSB1bmRlZmluZWQ7XG4gIC8qKlxuICAgKiBAbWVtYmVyIHtBcnJheS48TnVtYmVyPn0gc2VlZFxuICAgKi9cbiAgZXhwb3J0cy5wcm90b3R5cGVbJ3NlZWQnXSA9IHVuZGVmaW5lZDtcblxuXG5cbiAgcmV0dXJuIGV4cG9ydHM7XG59KSk7XG5cblxuIiwiLyoqXHJcbiAqIENvbnZvbHV0aW9uYWwgQXV0b2VuY29kZXJcclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKlxyXG4gKiBPcGVuQVBJIHNwZWMgdmVyc2lvbjogMS4xLjNcclxuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxyXG4gKlxyXG4gKiBOT1RFOiBUaGlzIGNsYXNzIGlzIGF1dG8gZ2VuZXJhdGVkIGJ5IHRoZSBzd2FnZ2VyIGNvZGUgZ2VuZXJhdG9yIHByb2dyYW0uXHJcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XHJcbiAqXHJcbiAqIFN3YWdnZXIgQ29kZWdlbiB2ZXJzaW9uOiAyLjMuMVxyXG4gKlxyXG4gKiBEbyBub3QgZWRpdCB0aGUgY2xhc3MgbWFudWFsbHkuXHJcbiAqXHJcbiAqL1xyXG5cclxuKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcclxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXHJcbiAgICAgIGRlZmluZShbJ0FwaUNsaWVudCcsICdtb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50J10sIGZhY3RvcnkpO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxyXG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnLi4vQXBpQ2xpZW50JyksIHJlcXVpcmUoJy4vVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCcpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcclxuICAgIGlmICghcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIpIHtcclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIgPSB7fTtcclxuICAgIH1cclxuICAgICAgcm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuVHJhaW5QZXJmb3JtYW5jZSA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50LCByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24gKEFwaUNsaWVudCwgVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludCkge1xyXG4gICd1c2Ugc3RyaWN0JztcclxuXHJcblxyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogVGhlIFRyYWluUGVyZm9ybWFuY2UgbW9kZWwgbW9kdWxlLlxyXG4gICAqIEBtb2R1bGUgbW9kZWwvVHJhaW5QZXJmb3JtYW5jZVxyXG4gICAqIEB2ZXJzaW9uIDEuMS4zXHJcbiAgICovXHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSBuZXcgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZTwvY29kZT4uXHJcbiAgICogQGFsaWFzIG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlXHJcbiAgICogQGNsYXNzXHJcbiAgICovXHJcbiAgdmFyIGV4cG9ydHMgPSBmdW5jdGlvbigpIHtcclxuICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcblxyXG5cclxuXHJcblxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbnN0cnVjdHMgYSA8Y29kZT5UcmFpblBlcmZvcm1hbmNlPC9jb2RlPiBmcm9tIGEgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QsIG9wdGlvbmFsbHkgY3JlYXRpbmcgYSBuZXcgaW5zdGFuY2UuXHJcbiAgICogQ29waWVzIGFsbCByZWxldmFudCBwcm9wZXJ0aWVzIGZyb20gPGNvZGU+ZGF0YTwvY29kZT4gdG8gPGNvZGU+b2JqPC9jb2RlPiBpZiBzdXBwbGllZCBvciBhIG5ldyBpbnN0YW5jZSBpZiBub3QuXHJcbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cclxuICAgKiBAcGFyYW0ge21vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlfSBvYmogT3B0aW9uYWwgaW5zdGFuY2UgdG8gcG9wdWxhdGUuXHJcbiAgICogQHJldHVybiB7bW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2V9IFRoZSBwb3B1bGF0ZWQgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZTwvY29kZT4gaW5zdGFuY2UuXHJcbiAgICovXHJcbiAgZXhwb3J0cy5jb25zdHJ1Y3RGcm9tT2JqZWN0ID0gZnVuY3Rpb24oZGF0YSwgb2JqKSB7XHJcbiAgICBpZiAoZGF0YSkge1xyXG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcclxuXHJcbiAgICAgIGlmIChkYXRhLmhhc093blByb3BlcnR5KCdtb2RlbF9pZCcpKSB7XHJcbiAgICAgICAgb2JqWydtb2RlbF9pZCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnbW9kZWxfaWQnXSwgJ1N0cmluZycpO1xyXG4gICAgICB9XHJcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3RyYWluX3N0YXR1cycpKSB7XHJcbiAgICAgICAgICAgIG9ialsndHJhaW5fc3RhdHVzJ10gPSBBcGlDbGllbnQuY29udmVydFRvVHlwZShkYXRhWyd0cmFpbl9zdGF0dXMnXSwgJ1N0cmluZycpO1xyXG4gICAgICB9XHJcbiAgICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3RyYWluX3BlcmZvcm1hbmNlX2RhdGEnKSkge1xyXG4gICAgICAgICAgICBvYmpbJ3RyYWluX3BlcmZvcm1hbmNlX2RhdGEnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3RyYWluX3BlcmZvcm1hbmNlX2RhdGEnXSwgW1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnRdKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9iajtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBtZW1iZXIge1N0cmluZ30gbW9kZWxfaWRcclxuICAgKi9cclxuICBleHBvcnRzLnByb3RvdHlwZVsnbW9kZWxfaWQnXSA9IHVuZGVmaW5lZDtcclxuICAvKipcclxuICAgKiBAbWVtYmVyIHtTdHJpbmd9IHRyYWluX3N0YXR1c1xyXG4gICAqL1xyXG4gIGV4cG9ydHMucHJvdG90eXBlWyd0cmFpbl9zdGF0dXMnXSA9IHVuZGVmaW5lZDtcclxuICAgIC8qKlxyXG4gICAgICogQG1lbWJlciB7QXJyYXkuPG1vZHVsZTptb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50Pn0gdHJhaW5fcGVyZm9ybWFuY2VfZGF0YVxyXG4gICAqL1xyXG4gICAgZXhwb3J0cy5wcm90b3R5cGVbJ3RyYWluX3BlcmZvcm1hbmNlX2RhdGEnXSA9IHVuZGVmaW5lZDtcclxuXHJcblxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qKlxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICogV2ViVUkgdG8gYnVpbGQsIHRyYWluIGFuZCB0dW5lIGEgQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxuICpcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xuICogQ29udGFjdDogbGVvbi5zY2h1ZXR6QHN0dWRlbnQudW5pLXR1ZWJpbmdlbi5kZVxuICpcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zd2FnZ2VyLWFwaS9zd2FnZ2VyLWNvZGVnZW4uZ2l0XG4gKlxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXG4gKlxuICogRG8gbm90IGVkaXQgdGhlIGNsYXNzIG1hbnVhbGx5LlxuICpcbiAqL1xuXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIC8vIENvbW1vbkpTLWxpa2UgZW52aXJvbm1lbnRzIHRoYXQgc3VwcG9ydCBtb2R1bGUuZXhwb3J0cywgbGlrZSBOb2RlLlxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XG4gICAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2RlciA9IHt9O1xuICAgIH1cbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50ID0gZmFjdG9yeShyb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5BcGlDbGllbnQpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uKEFwaUNsaWVudCkge1xuICAndXNlIHN0cmljdCc7XG5cblxuXG5cbiAgLyoqXG4gICAqIFRoZSBUcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50IG1vZGVsIG1vZHVsZS5cbiAgICogQG1vZHVsZSBtb2RlbC9UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50XG4gICAqIEB2ZXJzaW9uIDEuMS4zXG4gICAqL1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgbmV3IDxjb2RlPlRyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnQ8L2NvZGU+LlxuICAgKiBAYWxpYXMgbW9kdWxlOm1vZGVsL1RyYWluUGVyZm9ybWFuY2VEYXRhUG9pbnRcbiAgICogQGNsYXNzXG4gICAqL1xuICB2YXIgZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cblxuXG5cblxuICB9O1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RzIGEgPGNvZGU+VHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludDwvY29kZT4gZnJvbSBhIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0LCBvcHRpb25hbGx5IGNyZWF0aW5nIGEgbmV3IGluc3RhbmNlLlxuICAgKiBDb3BpZXMgYWxsIHJlbGV2YW50IHByb3BlcnRpZXMgZnJvbSA8Y29kZT5kYXRhPC9jb2RlPiB0byA8Y29kZT5vYmo8L2NvZGU+IGlmIHN1cHBsaWVkIG9yIGEgbmV3IGluc3RhbmNlIGlmIG5vdC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIHBsYWluIEphdmFTY3JpcHQgb2JqZWN0IGJlYXJpbmcgcHJvcGVydGllcyBvZiBpbnRlcmVzdC5cbiAgICogQHBhcmFtIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludH0gb2JqIE9wdGlvbmFsIGluc3RhbmNlIHRvIHBvcHVsYXRlLlxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5QZXJmb3JtYW5jZURhdGFQb2ludH0gVGhlIHBvcHVsYXRlZCA8Y29kZT5UcmFpblBlcmZvcm1hbmNlRGF0YVBvaW50PC9jb2RlPiBpbnN0YW5jZS5cbiAgICovXG4gIGV4cG9ydHMuY29uc3RydWN0RnJvbU9iamVjdCA9IGZ1bmN0aW9uKGRhdGEsIG9iaikge1xuICAgIGlmIChkYXRhKSB7XG4gICAgICBvYmogPSBvYmogfHwgbmV3IGV4cG9ydHMoKTtcblxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Vwb2NoJykpIHtcbiAgICAgICAgb2JqWydlcG9jaCddID0gQXBpQ2xpZW50LmNvbnZlcnRUb1R5cGUoZGF0YVsnZXBvY2gnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ3N0ZXAnKSkge1xuICAgICAgICBvYmpbJ3N0ZXAnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ3N0ZXAnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2Nvc3QnKSkge1xuICAgICAgICBvYmpbJ2Nvc3QnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2Nvc3QnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgICAgaWYgKGRhdGEuaGFzT3duUHJvcGVydHkoJ2N1cnJlbnRMZWFybmluZ1JhdGUnKSkge1xuICAgICAgICBvYmpbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSA9IEFwaUNsaWVudC5jb252ZXJ0VG9UeXBlKGRhdGFbJ2N1cnJlbnRMZWFybmluZ1JhdGUnXSwgJ051bWJlcicpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXIge051bWJlcn0gZXBvY2hcbiAgICovXG4gIGV4cG9ydHMucHJvdG90eXBlWydlcG9jaCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBzdGVwXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnc3RlcCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjb3N0XG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY29zdCddID0gdW5kZWZpbmVkO1xuICAvKipcbiAgICogQG1lbWJlciB7TnVtYmVyfSBjdXJyZW50TGVhcm5pbmdSYXRlXG4gICAqL1xuICBleHBvcnRzLnByb3RvdHlwZVsnY3VycmVudExlYXJuaW5nUmF0ZSddID0gdW5kZWZpbmVkO1xuXG5cblxuICByZXR1cm4gZXhwb3J0cztcbn0pKTtcblxuXG4iLCIvKipcclxuICogQ29udm9sdXRpb25hbCBBdXRvZW5jb2RlclxyXG4gKiBXZWJVSSB0byBidWlsZCwgdHJhaW4gYW5kIHR1bmUgYSBDb252b2x1dGlvbmFsIEF1dG9lbmNvZGVyXHJcbiAqXHJcbiAqIE9wZW5BUEkgc3BlYyB2ZXJzaW9uOiAxLjEuM1xyXG4gKiBDb250YWN0OiBsZW9uLnNjaHVldHpAc3R1ZGVudC51bmktdHVlYmluZ2VuLmRlXHJcbiAqXHJcbiAqIE5PVEU6IFRoaXMgY2xhc3MgaXMgYXV0byBnZW5lcmF0ZWQgYnkgdGhlIHN3YWdnZXIgY29kZSBnZW5lcmF0b3IgcHJvZ3JhbS5cclxuICogaHR0cHM6Ly9naXRodWIuY29tL3N3YWdnZXItYXBpL3N3YWdnZXItY29kZWdlbi5naXRcclxuICpcclxuICogU3dhZ2dlciBDb2RlZ2VuIHZlcnNpb246IDIuMy4xXHJcbiAqXHJcbiAqIERvIG5vdCBlZGl0IHRoZSBjbGFzcyBtYW51YWxseS5cclxuICpcclxuICovXHJcblxyXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xyXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cclxuICAgIGRlZmluZShbJ0FwaUNsaWVudCddLCBmYWN0b3J5KTtcclxuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XHJcbiAgICAvLyBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsIGxpa2UgTm9kZS5cclxuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCcuLi9BcGlDbGllbnQnKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZ2xvYmFscyAocm9vdCBpcyB3aW5kb3cpXHJcbiAgICBpZiAoIXJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyKSB7XHJcbiAgICAgIHJvb3QuQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0ge307XHJcbiAgICB9XHJcbiAgICByb290LkNvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpblN0YXR1cyA9IGZhY3Rvcnkocm9vdC5Db252b2x1dGlvbmFsQXV0b2VuY29kZXIuQXBpQ2xpZW50KTtcclxuICB9XHJcbn0odGhpcywgZnVuY3Rpb24oQXBpQ2xpZW50KSB7XHJcbiAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuXHJcbiAgLyoqXHJcbiAgICogRW51bSBjbGFzcyBUcmFpblN0YXR1cy5cclxuICAgKiBAZW51bSB7fVxyXG4gICAqIEByZWFkb25seVxyXG4gICAqL1xyXG4gIHZhciBleHBvcnRzID0ge1xyXG4gICAgLyoqXHJcbiAgICAgKiB2YWx1ZTogXCJzdGFydFwiXHJcbiAgICAgKiBAY29uc3RcclxuICAgICAqL1xyXG4gICAgXCJzdGFydFwiOiBcInN0YXJ0XCIsXHJcbiAgICAvKipcclxuICAgICAqIHZhbHVlOiBcInBhdXNlXCJcclxuICAgICAqIEBjb25zdFxyXG4gICAgICovXHJcbiAgICBcInBhdXNlXCI6IFwicGF1c2VcIixcclxuICAgIC8qKlxyXG4gICAgICogdmFsdWU6IFwic3RvcFwiXHJcbiAgICAgKiBAY29uc3RcclxuICAgICAqL1xyXG4gICAgXCJzdG9wXCI6IFwic3RvcFwiLFxyXG4gICAgLyoqXHJcbiAgICAgKiB2YWx1ZTogXCJyZXN1bWVcIlxyXG4gICAgICogQGNvbnN0XHJcbiAgICAgKi9cclxuICAgIFwicmVzdW1lXCI6IFwicmVzdW1lXCIgIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFJldHVybnMgYSA8Y29kZT5UcmFpblN0YXR1czwvY29kZT4gZW51bSB2YWx1ZSBmcm9tIGEgSmF2YXNjcmlwdCBvYmplY3QgbmFtZS5cclxuICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgcGxhaW4gSmF2YVNjcmlwdCBvYmplY3QgY29udGFpbmluZyB0aGUgbmFtZSBvZiB0aGUgZW51bSB2YWx1ZS5cclxuICAgKiBAcmV0dXJuIHttb2R1bGU6bW9kZWwvVHJhaW5TdGF0dXN9IFRoZSBlbnVtIDxjb2RlPlRyYWluU3RhdHVzPC9jb2RlPiB2YWx1ZS5cclxuICAgKi9cclxuICBleHBvcnRzLmNvbnN0cnVjdEZyb21PYmplY3QgPSBmdW5jdGlvbihvYmplY3QpIHtcclxuICAgIHJldHVybiBvYmplY3Q7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZXhwb3J0cztcclxufSkpO1xyXG5cclxuXHJcbiIsIi8qXHJcbkluY2x1ZGVzXHJcbiAqL1xyXG52YXIgQ29udm9sdXRpb25hbEF1dG9lbmNvZGVyID0gcmVxdWlyZSgnY29udm9sdXRpb25hbF9hdXRvZW5jb2RlcicpO1xyXG5cclxuLypcclxuR2xvYmFsIHZhcmlhYmxlc1xyXG4gKi9cclxudmFyIHRyYWluQXBpID0gbmV3IENvbnZvbHV0aW9uYWxBdXRvZW5jb2Rlci5UcmFpbkFwaSgpO1xyXG52YXIgbG9hZEFwaSA9IG5ldyBDb252b2x1dGlvbmFsQXV0b2VuY29kZXIuTG9hZEFwaSgpO1xyXG5cclxuXHJcbnZhciB0cmFpblRpbWVyO1xyXG5cclxuLypcclxuQVBJIHRlc3RcclxuICovXHJcbmZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdBUEkgY2FsbGVkIHN1Y2Nlc3NmdWxseS4nKTtcclxuICAgIH1cclxufVxyXG5cclxubG9hZEFwaS5yZXNldEFsbEJhdGNoSW5kaWNlcyhjYWxsYmFjayk7XHJcblxyXG4vKlxyXG5HbG9iYWwgdmFyaWFibGVzXHJcbiAqL1xyXG52YXIgY3VycmVudFRyYWluSW1hZ2VFcG9jaCA9IDA7XHJcblxyXG4vKlxyXG5DaGFydHNcclxuICovXHJcbnZhciBjb3N0Q2hhcnQgPSBuZXcgTGluZUNoYXJ0KFwiY2hhcnRzXCIsIDUwMCwgNTAwLCBcInN0ZXBcIiwgXCJjb3N0XCIsIFwic3RlcHNcIiwgXCJjb3N0XCIsIHsnY29zdCc6ICdsaWdodGJsdWUnfSk7XHJcbi8vIGFkZCBsaW5lIGJyZWFrXHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhcnRzXCIpLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJiclwiKSk7XHJcbnZhciBsZWFybmluZ1JhdGVDaGFydCA9IG5ldyBMaW5lQ2hhcnQoXCJjaGFydHNcIiwgNTAwLCA1MDAsIFwic3RlcFwiLCBcImN1cnJlbnRMZWFybmluZ1JhdGVcIiwgXCJzdGVwc1wiLCBcImxlYXJuaW5nIHJhdGVcIixcclxuICAgIHsnbGVhcm5pbmcgcmF0ZSc6ICdsaWdodGJsdWUnfSk7XHJcbi8vIGFkZCBsaW5lIGJyZWFrXHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhcnRzXCIpLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJiclwiKSk7XHJcbnZhciBlcG9jaEltYWdlcyA9ICBuZXcgSW1hZ2VHcmlkKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhcnRzXCIpLCA5KTtcclxuXHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUcmFpbkltYWdlcygpIHtcclxuICAgIHZhciBjYWxsYmFjayA9IGZ1bmN0aW9uIChlcnJvciwgZGF0YSwgcmVzcG9uc2UpIHtcclxuICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coZGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvL2dldCBpbWFnZSBwYW5lXHJcbiAgICAgICAgICAgIHZhciBpbWFnZUdyaWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImltYWdlR3JpZFwiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHJlbW92ZSBhbGwgcHJldmlvdXMgZWxlbWVudHM6XHJcbiAgICAgICAgICAgIGltYWdlR3JpZC5pbm5lckhUTUwgPSBcIlwiO1xyXG5cclxuICAgICAgICAgICAgLy8gYWRkIGltYWdlIHBhaXJzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5pbnB1dExheWVyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgbmV3IHRhYmxlIHJvdzpcclxuICAgICAgICAgICAgICAgIHZhciB0YWJsZVJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0clwiKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIGNlbGwgZm9yIGlucHV0IGltYWdlXHJcbiAgICAgICAgICAgICAgICB2YXIgaW5wdXRDZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBpbnB1dCBpbWFnZSBvYmplY3RcclxuICAgICAgICAgICAgICAgIHZhciBuZXdJbnB1dEltYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgICAgICAgICAgICAgIG5ld0lucHV0SW1hZ2UuaWQgPSBcIklucHV0SW1hZ2VfXCIgKyBkYXRhLmlucHV0TGF5ZXJbaV0uaWQ7XHJcbiAgICAgICAgICAgICAgICBuZXdJbnB1dEltYWdlLnNyYyA9IFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgZGF0YS5pbnB1dExheWVyW2ldLmJ5dGVzdHJpbmcuc3Vic3RyaW5nKDIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5pbnB1dExheWVyW2ldLmJ5dGVzdHJpbmcubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgICAgICAgICBuZXdJbnB1dEltYWdlLnN0eWxlLndpZHRoID0gXCIxNjBweFwiO1xyXG4gICAgICAgICAgICAgICAgbmV3SW5wdXRJbWFnZS5jbGFzcyA9IFwiaW1hZ2VUaHVtYm5haWxcIjtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBhcHBlbmQgbmV3IGltYWdlIHRvIGltYWdlIGdyaWRcclxuICAgICAgICAgICAgICAgIGlucHV0Q2VsbC5hcHBlbmRDaGlsZChuZXdJbnB1dEltYWdlKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlUm93LmFwcGVuZENoaWxkKGlucHV0Q2VsbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBsYXRlbnQgaW1hZ2Ugb2JqZWN0XHJcbiAgICAgICAgICAgICAgICB2YXIgbGF0ZW50Q2VsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZFwiKTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgZGF0YS5sYXRlbnRMYXllcltpXS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdMYXRlbnRJbWFnZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3TGF0ZW50SW1hZ2UuaWQgPSBcIkxhdGVudEltYWdlX1wiICsgZGF0YS5sYXRlbnRMYXllcltpXVtqXS5pZCArIFwiX1wiICsgajtcclxuICAgICAgICAgICAgICAgICAgICBuZXdMYXRlbnRJbWFnZS5zcmMgPSBcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxcIiArIGRhdGEubGF0ZW50TGF5ZXJbaV1bal0uYnl0ZXN0cmluZy5zdWJzdHJpbmcoMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5sYXRlbnRMYXllcltpXVtqXS5ieXRlc3RyaW5nLmxlbmd0aCAtIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0xhdGVudEltYWdlLnN0eWxlLndpZHRoID0gXCI0MHB4XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3TGF0ZW50SW1hZ2UuY2xhc3MgPSBcImltYWdlVGh1bWJuYWlsXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYXBwZW5kIG5ldyBpbWFnZSBkaXYgdG8gaW1hZ2UgZ3JpZFxyXG4gICAgICAgICAgICAgICAgICAgIGxhdGVudENlbGwuYXBwZW5kQ2hpbGQobmV3TGF0ZW50SW1hZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoaiArIDEpICUgNCA9PT0gMCkgeyAvL01hdGguY2VpbChNYXRoLnNxcnQoZGF0YS5sYXRlbnRMYXllcltpXS5sZW5ndGgpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXRlbnRDZWxsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2JyJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBhcHBlbmQgbmV3IGltYWdlIGRpdiB0byBpbWFnZSBncmlkXHJcbiAgICAgICAgICAgICAgICB0YWJsZVJvdy5hcHBlbmRDaGlsZChsYXRlbnRDZWxsKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLyovLyBhZGQgZXZlbnRMaXN0ZW5lclxyXG4gICAgICAgICAgICAgICAgLy8gY2hhbmdlIHByZXZpZXcgdmlld1xyXG4gICAgICAgICAgICAgICAgbmV3SW5wdXRJbWFnZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaW1hZ2VQcmV2aWV3XCIpLnNyYyA9IHRoaXMuc3JjO1xyXG4gICAgICAgICAgICAgICAgfSk7Ki9cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgY2VsbCBmb3IgaW5wdXQgaW1hZ2VcclxuICAgICAgICAgICAgICAgIHZhciBvdXRwdXRDZWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBvdXRwdXQgaW1hZ2Ugb2JqZWN0XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV3T3V0cHV0SW1hZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3T3V0cHV0SW1hZ2UuaWQgPSBcIk91dHB1dEltYWdlX1wiICsgZGF0YS5vdXRwdXRMYXllcltpXS5pZDtcclxuICAgICAgICAgICAgICAgIG5ld091dHB1dEltYWdlLnNyYyA9IFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LFwiICsgZGF0YS5vdXRwdXRMYXllcltpXS5ieXRlc3RyaW5nLnN1YnN0cmluZygyLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEub3V0cHV0TGF5ZXJbaV0uYnl0ZXN0cmluZy5sZW5ndGggLSAxKTtcclxuICAgICAgICAgICAgICAgIG5ld091dHB1dEltYWdlLnN0eWxlLndpZHRoID0gXCIxNjBweFwiO1xyXG4gICAgICAgICAgICAgICAgbmV3T3V0cHV0SW1hZ2UuY2xhc3MgPSBcImltYWdlVGh1bWJuYWlsXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gYXBwZW5kIG5ldyBpbWFnZSB0byBpbWFnZSBncmlkXHJcbiAgICAgICAgICAgICAgICBvdXRwdXRDZWxsLmFwcGVuZENoaWxkKG5ld091dHB1dEltYWdlKTtcclxuICAgICAgICAgICAgICAgIHRhYmxlUm93LmFwcGVuZENoaWxkKG91dHB1dENlbGwpO1xyXG5cclxuICAgICAgICAgICAgICAgIGltYWdlR3JpZC5hcHBlbmRDaGlsZCh0YWJsZVJvdyk7XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgLy9hZGQgaW1hZ2VzIGVwb2Nod2lzZVxyXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuZXBvY2ggPiBjdXJyZW50VHJhaW5JbWFnZUVwb2NoKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9jcmVhdGUgbmV3IGNvbHVtbjpcclxuICAgICAgICAgICAgICAgIGVwb2NoSW1hZ2VzLmFkZE5ld0ltYWdlQ29sdW1uKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgICAgIGN1cnJlbnRUcmFpbkltYWdlRXBvY2ggPSBkYXRhLmVwb2NoO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgdHJhaW5BcGkuZ2V0UHJvY2Vzc2VkSW1hZ2VEYXRhKDksIGNhbGxiYWNrKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVHJhaW5TdGF0aXN0aWNzKCkge1xyXG4gICAgdmFyIGNhbGxiYWNrID0gZnVuY3Rpb24gKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgLy91cGRhdGUgY29zdCBkaWFncmFtXHJcbiAgICAgICAgICAgIGlmIChkYXRhLnRyYWluX3BlcmZvcm1hbmNlX2RhdGEubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29zdENoYXJ0LmFwcGVuZERhdGEoeydjb3N0JzogZGF0YS50cmFpbl9wZXJmb3JtYW5jZV9kYXRhfSk7XHJcbiAgICAgICAgICAgICAgICBsZWFybmluZ1JhdGVDaGFydC5hcHBlbmREYXRhKHsnbGVhcm5pbmcgcmF0ZSc6IGRhdGEudHJhaW5fcGVyZm9ybWFuY2VfZGF0YX0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGF0YS50cmFpbl9zdGF0dXMgPT09IFwiZmluaXNoZWRcIikge1xyXG4gICAgICAgICAgICAgICAgLy8gc3RvcCB1cGRhdGUgdGltZXJcclxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodHJhaW5UaW1lcik7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gcHJpbnQgc3RhdHVzXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWluaW5nIGZpbmlzaGVkXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGaW5hbCBzdGVwOiBcIiArIGNvc3RDaGFydC5nZXRMYXRlc3RYVmFsdWUoJ2Nvc3QnKSk7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3BvbnNlTGFiZWxcIikudGV4dENvbnRlbnQgPSBcIlRyYWluaW5nIGZpbmlzaGVkLiAgRmluYWwgc3RlcDogXCJcclxuICAgICAgICAgICAgICAgICAgICArIGNvc3RDaGFydC5nZXRMYXRlc3RYVmFsdWUoJ2Nvc3QnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH07XHJcblxyXG4gICAgdHJhaW5BcGkuZ2V0VHJhaW5QZXJmb3JtYW5jZShjYWxsYmFjayk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVZpZXcoKSB7XHJcbiAgICAvLyB1cGRhdGUgdHJhaW4gaW1hZ2VzOlxyXG4gICAgdXBkYXRlVHJhaW5JbWFnZXMoKTtcclxuXHJcbiAgICAvLyB1cGRhdGUgY2hhcnRzOlxyXG4gICAgdXBkYXRlVHJhaW5TdGF0aXN0aWNzKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN0YXJ0VHJhaW5pbmcoKSB7XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsbGJhY2soZXJyb3IsIGRhdGEsIHJlc3BvbnNlKSB7XHJcbiAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzcG9uc2VMYWJlbFwiKS50ZXh0Q29udGVudCA9IHJlc3BvbnNlLnRleHQ7XHJcblxyXG4gICAgICAgICAgICAvLyBzdGFydCB1cGRhdGUgdGltZXJcclxuICAgICAgICAgICAgdHJhaW5UaW1lciA9IHNldEludGVydmFsKHVwZGF0ZVZpZXcsIDUwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRyYWluQXBpLmNvbnRyb2xUcmFpbmluZygnXCJzdGFydFwiJywgY2FsbGJhY2spO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gc3RvcFRyYWluaW5nKCkge1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGxiYWNrKGVycm9yLCBkYXRhLCByZXNwb25zZSkge1xyXG4gICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3BvbnNlTGFiZWxcIikudGV4dENvbnRlbnQgPSByZXNwb25zZS50ZXh0O1xyXG5cclxuICAgICAgICAgICAgLy8gc3RvcCB1cGRhdGUgdGltZXJcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0cmFpblRpbWVyKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdHJhaW5BcGkuY29udHJvbFRyYWluaW5nKCdcInN0b3BcIicsIGNhbGxiYWNrKTtcclxufVxyXG5cclxuXHJcbi8qXHJcbmF0dGFjaCBFdmVudCBMaXN0ZW5lclxyXG4gKi9cclxuXHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RhcnRUcmFpbmluZ1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgc3RhcnRUcmFpbmluZyk7XHJcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3RvcFRyYWluaW5nXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzdG9wVHJhaW5pbmcpO1xyXG5cclxuXHJcblxyXG4iXX0=
