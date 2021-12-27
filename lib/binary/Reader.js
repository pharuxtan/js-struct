let ieee754 = require("ieee754")

class Reader {
  position = 0;

  constructor(buffer){
    this.ubuffer = new Uint8Array(buffer);
    this.sbuffer = new Int8Array(this.ubuffer);
  }

  bool(){
    return this.uint8() > 0;
  }

  char(){
    return String.fromCharCode(this.uint8());
  }

  uchar(){ return this.char() }

  schar(){ return this.char() }

  int8(){
    return this.sbuffer[this.position++];
  }

  uint8(){
    return this.ubuffer[this.position++];
  }

  uint16(){
    return this.uint8() | this.uint8() << 8;
  }

  int16(){
    return new Int16Array([this.uint16()])[0];
  }

  uint32(){
    return (this.uint8() | this.uint8() << 8 | this.uint8() << 16) + this.uint8() * 0x1000000
  }

  int32(){
    return new Int32Array([this.uint32()])[0];
  }

  uint64(){
    let lo = BigInt(this.uint32());
    let hi = BigInt(this.uint32());
    return hi << 32n | lo;
  }

  int64(){
    return new BigInt64Array([this.uint64()])[0];
  }

  float(le = true){
    return ieee754.read(this.ubuffer, (this.position += 4) - 4, le, 23, 4);
  }

  double(le = true){
    return ieee754.read(this.ubuffer, (this.position += 4) - 4, le, 52, 8);
  }
}

module.exports = Reader;
