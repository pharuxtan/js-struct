let ieee754 = require("ieee754")

class Writer {
  position = 0;

  constructor(buffer){
    this.buffer = buffer;
  }

  bool(b){
    this.buffer[this.position++] = b ? 1 : 0;
  }

  char(c){
    this.buffer[this.position++] = c.charCodeAt();
  }

  uchar(c){ this.char(c) }

  schar(c){ this.char(c) }

  uint8(i){
    this.buffer[this.position++] = i;
  }

  int8(i){ this.uint8(i) }

  uint16(i){
    this.buffer[this.position++] = i & 0xFF;
    this.buffer[this.position++] = (i >>> 8);
  }

  int16(i){ this.uint16(i) }

  uint32(i){
    this.uint16(i);
    this.buffer[this.position++] = (i >>> 16);
    this.buffer[this.position++] = (i >>> 24);
  }

  int32(i){ this.uint32(i) }

  uint64(i){
    let lo = Number(i & 0xffffffffn);
    this.buffer[this.position++] = lo;
    lo = lo >> 8;
    this.buffer[this.position++] = lo;
    lo = lo >> 8;
    this.buffer[this.position++] = lo;
    lo = lo >> 8;
    this.buffer[this.position++] = lo;
    let hi = Number(i >> 32n & 0xffffffffn);
    this.buffer[this.position++] = hi;
    hi = hi >> 8;
    this.buffer[this.position++] = hi;
    hi = hi >> 8;
    this.buffer[this.position++] = hi;
    hi = hi >> 8;
    this.buffer[this.position++] = hi;
  }

  int64(i){ this.uint64(i) }

  float(f, le = true){
    return ieee754.write(this.buffer, f, (this.position += 4) - 4, le, 23, 4);
  }

  double(d, le = true){
    return ieee754.write(this.buffer, d, (this.position += 4) - 4, le, 52, 8);
  }
}

module.exports = Writer;
