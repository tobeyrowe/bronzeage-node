/*!
 * encoding.js - encoding utils for decentraland
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2016, Christopher Jeffrey (MIT License).
 * Copyright (c) 2016-2017, Manuel Araoz (MIT License).
 * https://github.com/decentraland/decentraland-node
 */

'use strict';

var assert = require('assert');
var BN = require('bn.js');
var encoding = exports;

/**
 * UINT32_MAX
 * @const {BN}
 */

encoding.U32_MAX = new BN(0xffffffff);

/**
 * UINT64_MAX
 * @const {BN}
 */

encoding.U64_MAX = new BN('ffffffffffffffff', 'hex');

/**
 * Max safe integer (53 bits).
 * @const {Number}
 * @default
 */

encoding.MAX_SAFE_INTEGER = 0x1fffffffffffff;

/**
 * Max 52 bit integer (safe for additions).
 * `(MAX_SAFE_INTEGER - 1) / 2`
 * @const {Number}
 * @default
 */

encoding.MAX_SAFE_ADDITION = 0xfffffffffffff;

/**
 * Read uint64 as a js number.
 * @private
 * @param {Buffer} data
 * @param {Number} off
 * @param {Boolean} force53 - Read only 53 bits, but maintain the sign.
 * @param {Boolean} be
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding._readU64 = function _readU64(data, off, force53, be) {
  var hi, lo;

  if (be) {
    hi = data.readUInt32BE(off, true);
    lo = data.readUInt32BE(off + 4, true);
  } else {
    hi = data.readUInt32LE(off + 4, true);
    lo = data.readUInt32LE(off, true);
  }

  if (force53)
    hi &= 0x1fffff;

  assert((hi & 0xffe00000) === 0, 'Number exceeds 2^53-1');

  return (hi * 0x100000000) + lo;
};

/**
 * Read uint64le as a js number.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.readU64 = function readU64(data, off) {
  return encoding._readU64(data, off, false, false);
};

/**
 * Read uint64be as a js number.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.readU64BE = function readU64BE(data, off) {
  return encoding._readU64(data, off, false, true);
};

/**
 * Read uint64le as a js number (limit at 53 bits).
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.readU53 = function readU53(data, off) {
  return encoding._readU64(data, off, true, false);
};

/**
 * Read uint64be as a js number (limit at 53 bits).
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.readU53BE = function readU53BE(data, off) {
  return encoding._readU64(data, off, true, true);
};

/**
 * Read int64 as a js number.
 * @private
 * @param {Buffer} data
 * @param {Number} off
 * @param {Boolean} force53 - Read only 53 bits, but maintain the sign.
 * @param {Boolean} be
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding._read64 = function _read64(data, off, force53, be) {
  var hi, lo;

  if (be) {
    hi = data.readUInt32BE(off, true);
    lo = data.readUInt32BE(off + 4, true);
  } else {
    hi = data.readUInt32LE(off + 4, true);
    lo = data.readUInt32LE(off, true);
  }

  if (hi & 0x80000000) {
    hi = ~hi >>> 0;
    lo = ~lo >>> 0;

    if (force53)
      hi &= 0x1fffff;

    assert((hi & 0xffe00000) === 0, 'Number exceeds 2^53-1');

    return -(hi * 0x100000000 + lo + 1);
  }

  if (force53)
    hi &= 0x1fffff;

  assert((hi & 0xffe00000) === 0, 'Number exceeds 2^53-1');

  return hi * 0x100000000 + lo;
};

/**
 * Read int64be as a js number.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.read64 = function read64(data, off) {
  return encoding._read64(data, off, false, false);
};

/**
 * Read int64be as a js number.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.read64BE = function read64BE(data, off) {
  return encoding._read64(data, off, false, true);
};

/**
 * Read int64be as a js number (limit at 53 bits).
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.read53 = function read53(data, off) {
  return encoding._read64(data, off, true, false);
};

/**
 * Read int64be as a js number (limit at 53 bits).
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.read53BE = function read53BE(data, off) {
  return encoding._read64(data, off, true, true);
};

/**
 * Write a javascript number as an int64.
 * @private
 * @param {Buffer} dst
 * @param {Number} num
 * @param {Number} off
 * @param {Boolean} be
 * @returns {Number} Buffer offset.
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding._write64 = function _write64(dst, num, off, be) {
  var negative = num < 0;
  var hi, lo;

  if (negative) {
    num = -num;
    num -= 1;
  }

  assert(num <= encoding.MAX_SAFE_INTEGER, 'Number exceeds 2^53-1');

  lo = num % 0x100000000;
  hi = (num - lo) / 0x100000000;

  if (negative) {
    hi = ~hi >>> 0;
    lo = ~lo >>> 0;
  }

  if (be) {
    dst[off++] = hi >>> 24;
    dst[off++] = (hi >> 16) & 0xff;
    dst[off++] = (hi >> 8) & 0xff;
    dst[off++] = hi & 0xff;

    dst[off++] = lo >>> 24;
    dst[off++] = (lo >> 16) & 0xff;
    dst[off++] = (lo >> 8) & 0xff;
    dst[off++] = lo & 0xff;
  } else {
    dst[off++] = lo & 0xff;
    dst[off++] = (lo >> 8) & 0xff;
    dst[off++] = (lo >> 16) & 0xff;
    dst[off++] = lo >>> 24;

    dst[off++] = hi & 0xff;
    dst[off++] = (hi >> 8) & 0xff;
    dst[off++] = (hi >> 16) & 0xff;
    dst[off++] = hi >>> 24;
  }

  return off;
};

/**
 * Write a javascript number as a uint64le.
 * @param {Buffer} dst
 * @param {Number} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.writeU64 = function writeU64(dst, num, off) {
  return encoding._write64(dst, num, off, false);
};

/**
 * Write a javascript number as a uint64be.
 * @param {Buffer} dst
 * @param {Number} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.writeU64BE = function writeU64BE(dst, num, off) {
  return encoding._write64(dst, num, off, true);
};

/**
 * Write a javascript number as an int64le.
 * @param {Buffer} dst
 * @param {Number} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.write64 = function write64(dst, num, off) {
  return encoding._write64(dst, num, off, false);
};

/**
 * Write a javascript number as an int64be.
 * @param {Buffer} dst
 * @param {Number} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 * @throws on num > MAX_SAFE_INTEGER
 */

encoding.write64BE = function write64BE(dst, num, off) {
  return encoding._write64(dst, num, off, true);
};

/**
 * Read uint64le.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {BN}
 */

encoding.readU64BN = function readU64BN(data, off) {
  var num = data.slice(off, off + 8);
  return new BN(num, 'le');
};

/**
 * Read uint64be.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {BN}
 */

encoding.readU64BEBN = function readU64BEBN(data, off) {
  var num = data.slice(off, off + 8);
  return new BN(num, 'be');
};

/**
 * Read int64le.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {BN}
 */

encoding.read64BN = function read64BN(data, off) {
  var num = data.slice(off, off + 8);

  if (num[num.length - 1] & 0x80)
    return new BN(num, 'le').notn(64).addn(1).neg();

  return new BN(num, 'le');
};
/**
 * Read int64be.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {BN}
 */

encoding.read64BEBN = function read64BEBN(data, off) {
  var num = data.slice(off, off + 8);

  if (num[0] & 0x80)
    return new BN(num, 'be').notn(64).addn(1).neg();

  return new BN(num, 'be');
};

/**
 * Write int64le.
 * @private
 * @param {Buffer} dst
 * @param {BN} num
 * @param {Number} off
 * @param {Boolean} be
 * @returns {Number} Buffer offset.
 */

encoding._write64BN = function _write64BN(dst, num, off, be) {
  var i;

  if (num.bitLength() <= 53)
    return encoding._write64(dst, num.toNumber(), off, be);

  if (num.bitLength() > 64)
    num = num.uand(encoding.U64_MAX);

  if (num.isNeg())
    num = num.neg().inotn(64).iaddn(1);

  num = num.toArray(be ? 'be' : 'le', 8);

  for (i = 0; i < num.length; i++)
    dst[off++] = num[i];

  return off;
};

/**
 * Write uint64le.
 * @param {Buffer} dst
 * @param {BN} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.writeU64BN = function writeU64BN(dst, num, off) {
  return encoding._write64BN(dst, num, off, false);
};

/**
 * Write uint64be.
 * @param {Buffer} dst
 * @param {BN} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.writeU64BEBN = function writeU64BEBN(dst, num, off) {
  return encoding._write64BN(dst, num, off, true);
};

/**
 * Write int64le.
 * @param {Buffer} dst
 * @param {BN} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.write64BN = function write64BN(dst, num, off) {
  return encoding._write64BN(dst, num, off, false);
};

/**
 * Write int64be.
 * @param {Buffer} dst
 * @param {BN} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.write64BEBN = function write64BEBN(dst, num, off) {
  return encoding._write64BN(dst, num, off, true);
};

/**
 * Read a varint.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Object}
 */

encoding.readVarint = function readVarint(data, off) {
  var value, size;

  assert(off < data.length);

  switch (data[off]) {
    case 0xff:
      size = 9;
      assert(off + size <= data.length);
      value = encoding.readU64(data, off + 1);
      assert(value > 0xffffffff);
      break;
    case 0xfe:
      size = 5;
      assert(off + size <= data.length);
      value = data.readUInt32LE(off + 1, true);
      assert(value > 0xffff);
      break;
    case 0xfd:
      size = 3;
      assert(off + size <= data.length);
      value = data[off + 1] | (data[off + 2] << 8);
      assert(value >= 0xfd);
      break;
    default:
      size = 1;
      value = data[off];
      break;
  }

  return new Varint(size, value);
};

/**
 * Write a varint.
 * @param {Buffer} dst
 * @param {Number} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.writeVarint = function writeVarint(dst, num, off) {
  if (num < 0xfd) {
    dst[off++] = num & 0xff;
    return off;
  }

  if (num <= 0xffff) {
    dst[off++] = 0xfd;
    dst[off++] = num & 0xff;
    dst[off++] = (num >> 8) & 0xff;
    return off;
  }

  if (num <= 0xffffffff) {
    dst[off++] = 0xfe;
    dst[off++] = num & 0xff;
    dst[off++] = (num >> 8) & 0xff;
    dst[off++] = (num >> 16) & 0xff;
    dst[off++] = num >>> 24;
    return off;
  }

  dst[off++] = 0xff;
  off = encoding.writeU64(dst, num, off);
  return off;
};

/**
 * Read a varint size.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 */

encoding.skipVarint = function skipVarint(data, off) {
  assert(off < data.length);

  switch (data[off]) {
    case 0xff:
      return 9;
    case 0xfe:
      return 5;
    case 0xfd:
      return 3;
    default:
      return 1;
  }
};

/**
 * Calculate size of varint.
 * @param {Number} num
 * @returns {Number} size
 */

encoding.sizeVarint = function sizeVarint(num) {
  if (num < 0xfd)
    return 1;

  if (num <= 0xffff)
    return 3;

  if (num <= 0xffffffff)
    return 5;

  return 9;
};

/**
 * Read a varint.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Object}
 */

encoding.readVarintBN = function readVarintBN(data, off) {
  var result, value, size;

  assert(off < data.length);

  switch (data[off]) {
    case 0xff:
      size = 9;
      assert(off + size <= data.length);
      value = encoding.readU64BN(data, off + 1);
      assert(value.bitLength() > 32);
      return new Varint(size, value);
    default:
      result = encoding.readVarint(data, off);
      result.value = new BN(result.value);
      return result;
  }
};

/**
 * Write a varint.
 * @param {Buffer} dst
 * @param {BN} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.writeVarintBN = function writeVarintBN(dst, num, off) {
  if (num.bitLength() > 32) {
    dst[off++] = 0xff;
    off = encoding.writeU64BN(dst, num, off);
    return off;
  }

  return encoding.writeVarint(dst, num.toNumber(), off);
};

/**
 * Calculate size of varint.
 * @param {BN} num
 * @returns {Number} size
 */

encoding.sizeVarintBN = function sizeVarintBN(num) {
  if (num.bitLength() > 32)
    return 9;

  return encoding.sizeVarint(num.toNumber());
};

/**
 * Read a varint (type 2).
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Object}
 */

encoding.readVarint2 = function readVarint2(data, off) {
  var num = 0;
  var size = 0;
  var ch;

  for (;;) {
    assert(off < data.length);

    ch = data[off++];
    size++;

    assert(num < 0x3fffffffffff, 'Number exceeds 2^53-1.');

    num = (num * 0x80) + (ch & 0x7f);

    if ((ch & 0x80) === 0)
      break;

    num++;
  }

  return new Varint(size, num);
};

/**
 * Write a varint (type 2).
 * @param {Buffer} dst
 * @param {Number} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.writeVarint2 = function writeVarint2(dst, num, off) {
  var tmp = [];
  var len = 0;

  for (;;) {
    tmp[len] = (num & 0x7f) | (len ? 0x80 : 0x00);
    if (num <= 0x7f)
      break;
    num = ((num - (num % 0x80)) / 0x80) - 1;
    len++;
  }

  assert(off + len <= dst.length);

  do {
    dst[off++] = tmp[len];
  } while (len--);

  return off;
};

/**
 * Read a varint size.
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Number}
 */

encoding.skipVarint2 = function skipVarint2(data, off) {
  var size = 0;
  var ch;

  for (;;) {
    assert(off < data.length);
    ch = data[off++];
    size++;
    if ((ch & 0x80) === 0)
      break;
  }

  return size;
};

/**
 * Calculate size of varint (type 2).
 * @param {Number} num
 * @returns {Number} size
 */

encoding.sizeVarint2 = function sizeVarint2(num) {
  var size = 0;

  for (;;) {
    size++;
    if (num <= 0x7f)
      break;
    num = ((num - (num % 0x80)) / 0x80) - 1;
  }

  return size;
};

/**
 * Read a varint (type 2).
 * @param {Buffer} data
 * @param {Number} off
 * @returns {Object}
 */

encoding.readVarint2BN = function readVarint2BN(data, off) {
  var num = 0;
  var size = 0;
  var ch;

  while (num < 0x3fffffffffff) {
    assert(off < data.length);

    ch = data[off++];
    size++;

    num = (num * 0x80) + (ch & 0x7f);

    if ((ch & 0x80) === 0)
      return new Varint(size, new BN(num));

    num++;
  }

  num = new BN(num);

  for (;;) {
    assert(off < data.length);

    ch = data[off++];
    size++;

    assert(num.bitLength() <= 64, 'Number exceeds 64 bits.');

    num.iushln(7).iaddn(ch & 0x7f);

    if ((ch & 0x80) === 0)
      break;

    num.iaddn(1);
  }

  return new Varint(size, num);
};

/**
 * Write a varint (type 2).
 * @param {Buffer} dst
 * @param {BN} num
 * @param {Number} off
 * @returns {Number} Buffer offset.
 */

encoding.writeVarint2BN = function writeVarint2BN(dst, num, off) {
  var tmp = [];
  var len = 0;

  if (num.bitLength() <= 53)
    return encoding.writeVarint2(dst, num.toNumber());

  for (;;) {
    tmp[len] = (num.words[0] & 0x7f) | (len ? 0x80 : 0x00);
    if (num.cmpn(0x7f) <= 0)
      break;
    num.iushrn(7).isubn(1);
    len++;
  }

  assert(off + len <= dst.length);

  do {
    dst[off++] = tmp[len];
  } while (len--);

  return off;
};

/**
 * Calculate size of varint (type 2).
 * @param {BN} num
 * @returns {Number} size
 */

encoding.sizeVarint2BN = function sizeVarint2BN(num) {
  var size = 0;

  if (num.bitLength() <= 53)
    return encoding.sizeVarint(num.toNumber());

  num = num.clone();

  for (;;) {
    size++;
    if (num.cmpn(0x7f) <= 0)
      break;
    num.iushrn(7).isubn(1);
  }

  return size;
};

/**
 * Serialize number as a u8.
 * @param {Number} num
 * @returns {Buffer}
 */

encoding.U8 = function U8(num) {
  var data = new Buffer(1);
  data[0] = num >>> 0;
  return data;
};

/**
 * Serialize number as a u32le.
 * @param {Number} num
 * @returns {Buffer}
 */

encoding.U32 = function U32(num) {
  var data = new Buffer(4);
  data.writeUInt32LE(num, 0, true);
  return data;
};

/**
 * Serialize number as a u32be.
 * @param {Number} num
 * @returns {Buffer}
 */

encoding.U32BE = function U32BE(num) {
  var data = new Buffer(4);
  data.writeUInt32BE(num, 0, true);
  return data;
};

/**
 * Get size of varint-prefixed bytes.
 * @param {Buffer} data
 * @returns {Number}
 */

encoding.sizeVarBytes = function sizeVarBytes(data) {
  return encoding.sizeVarint(data.length) + data.length;
};

/**
 * Get size of varint-prefixed length.
 * @param {Number} len
 * @returns {Number}
 */

encoding.sizeVarlen = function sizeVarlen(len) {
  return encoding.sizeVarint(len) + len;
};

/**
 * Get size of varint-prefixed string.
 * @param {String} str
 * @returns {Number}
 */

encoding.sizeVarString = function sizeVarString(str, enc) {
  var len;

  if (typeof str !== 'string')
    return encoding.sizeVarBytes(str);

  len = Buffer.byteLength(str, enc);

  return encoding.sizeVarint(len) + len;
};

/*
 * Helpers
 */

function Varint(size, value) {
  this.size = size;
  this.value = value;
}
