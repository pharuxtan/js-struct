let Reader = require("./binary/Reader");
let Writer = require("./binary/Writer");
let types = require("./types");
let BigEval = new (require('bigeval'))();

let swap_types = ["uint16", "int16", "uint32", "int32", "uint64", "int64"];

let struct = class Struct {
  #struct = {};
  #definitions = [];
  #orgDefs;
  #initialized;
  #recursive;
  #name = "";

  constructor(...definitions){
    this.#orgDefs = definitions;
    if(typeof definitions.slice(-1)[0] == "string"){
      this.#name = definitions.slice(-1)[0];
      definitions = definitions.slice(0, -1);
    }
    for(let definition of definitions){
      let {type, name, data, struct_t, bigendian} = Object.getPrototypeOf(definition);
      if(!this.#recursive) this.#recursive = typeof data == "string";
      this.#struct[name] = undefined;
      this[name] = undefined;
      let def = {type, name, struct_t, bigendian};
      Object.defineProperty(def, "data", {
        configurable: false,
        enumerable: true,
        get: () => {
          if(typeof data == "string"){
            let getValue = (key) => {
              key = key.split(".");
              let obj = this.#struct[key[0]];
              for(let i=1; i<key.length; i++) obj = obj[key[i]];
              return Number(obj);
            }
            if(data.startsWith("=")){
              let keys = data.match(/\$[_$a-z][\w.$]*/g);
              let calc = data.slice(1);
              for(let i=0; i<keys.length; i++)
                calc = calc.replace(keys[i], getValue(keys[i].slice(1)));
              return BigEval.exec(calc)
            }
            return getValue(data);
          }
          return data;
        }
      });
      this.#definitions.push(def);
      Object.defineProperty(this, name, {
        configurable: false,
        enumerable: true,
        get: () => this.#struct[name],
        set: (value) => {
          if(this.#recursive) throw new Error("Recursive Struct are Read-Only");
          if(["char", "uchar", "schar"].includes(type)){
            if(typeof value != "string") value = value.join("");
            this.#struct[name] = value.padEnd(data, "\0")
            return true;
          }
          this.#struct[name] = value
          return true
        }
      });
    }
  }

  [Symbol.for("Struct.read")](buffer){
    let struct_t = new Struct(...this.#orgDefs);
    struct_t[Symbol.for("read")](buffer);
    return struct_t;
  }

  [Symbol.for("read")](reader){
    if(!(reader instanceof Reader)) reader = new Reader(reader);
    for(let {type, name, data, struct_t, bigendian} of this.#definitions){
      if(type == "struct"){
        if(data){
          let array = Array(data);
          for(let i=0; i<data; i++){
            let s = new Struct(...struct_t[Symbol.for("definitions")]);
            s[Symbol.for("read")](reader);
            array[i] = s;
          }
          this.#struct[name] = array;
        } else {
          let s = new Struct(...struct_t[Symbol.for("definitions")]);
          s[Symbol.for("read")](reader);
          this.#struct[name] = s;
        }
      } else {
        if(data){
          let array = Array(data);
          if(type == "int8") array = new Int8Array(data);
          if(type == "uint8") array = new Uint8Array(data);
          if(type == "int16") array = new Int16Array(data);
          if(type == "uint16") array = new Uint16Array(data);
          if(type == "int32") array = new Int32Array(data);
          if(type == "uint32") array = new Uint32Array(data);
          if(type == "int64") array = new BigInt64Array(data);
          if(type == "uint64") array = new BigUint64Array(data);
          if(type == "float") array = new Float32Array(data);
          if(type == "double") array = new Float64Array(data);
          for(let i=0; i<data; i++) array[i] = reader[type](!bigendian);
          this.#struct[name] = array;
        } else this.#struct[name] = reader[type](!bigendian);
        if(["char", "uchar", "schar"].includes(type) && data) this.#struct[name] = this.#struct[name].join("");
        if(swap_types.includes(type) && bigendian){
          if(data){
            for(let i=0; i<data; i++){
              if(type == "int16") this.#struct[name][i] = bswap16(this.#struct[name][i]);
              if(type == "uint16") this.#struct[name][i] = bswap16(this.#struct[name][i]);
              if(type == "int32") this.#struct[name][i] = bswap32(this.#struct[name][i]);
              if(type == "uint32") this.#struct[name][i] = bswap32(this.#struct[name][i]);
              if(type == "int64") this.#struct[name][i] = bswap64(this.#struct[name][i]);
              if(type == "uint64") this.#struct[name][i] = bswap64(this.#struct[name][i]);
            }
          } else {
            if(type == "int16") this.#struct[name] = bswap16(this.#struct[name]);
            if(type == "uint16") this.#struct[name] = bswap16(this.#struct[name]);
            if(type == "int32") this.#struct[name] = bswap32(this.#struct[name]);
            if(type == "uint32") this.#struct[name] = bswap32(this.#struct[name]);
            if(type == "int64") this.#struct[name] = bswap64(this.#struct[name]);
            if(type == "uint64") this.#struct[name] = bswap64(this.#struct[name]);
          }
        }
      }
    }
    this.#initialized = true;
  }

  [Symbol.for("buffer")](writer){
    if(!writer) writer = new Writer(new Uint8Array(this[Symbol.for("size")]));
    if(!this.#initialized){
      for(let i=0; i<this[Symbol.for("size")]; i++) writer.uint8(0);
      return writer.buffer;
    };
    for(let {type, name, data, bigendian} of this.#definitions){
      if(type == "struct"){
        if(data) this.#struct[name].map(struct_t => struct_t[Symbol.for("buffer")](writer));
        else this.#struct[name][Symbol.for("buffer")](writer);
      } else if(["char", "uchar", "schar"].includes(type)){
        let chars = this.#struct[name].split("");
        for(let char of chars) writer[type](char);
      } else {
        if(data){
          for(let value of this.#struct[name]){
            if(swap_types.includes(type) && bigendian){
              if(type == "int16") writer[type](bswap16(value, true));
              if(type == "uint16") writer[type](bswap16(value));
              if(type == "int32") writer[type](bswap32(value, true));
              if(type == "uint32") writer[type](bswap32(value));
              if(type == "int64") writer[type](bswap64(value, true));
              if(type == "uint64") writer[type](bswap64(value));
            } else writer[type](value, bigendian);
          }
        } else {
          if(swap_types.includes(type) && bigendian){
            if(type == "int16") writer[type](bswap16(this.#struct[name], true));
            if(type == "uint16") writer[type](bswap16(this.#struct[name]));
            if(type == "int32") writer[type](bswap32(this.#struct[name], true));
            if(type == "uint32") writer[type](bswap32(this.#struct[name]));
            if(type == "int64") writer[type](bswap64(this.#struct[name], true));
            if(type == "uint64") writer[type](bswap64(this.#struct[name]));
          } else writer[type](this.#struct[name], bigendian);
        }
      }
    }
    return writer.buffer;
  }

  get [Symbol.for("json")](){
    let self = this;
    let clazz = class {
      constructor(){
        if(!self.#initialized) return;
        for(let {type, data, name} of self.#definitions){
          if(type == "struct"){
            if(data) this[name] = self.#struct[name].map(struct_t => struct_t[Symbol.for("json")]);
            else this[name] = self.#struct[name][Symbol.for("json")];
          } else this[name] = self.#struct[name];
        }
      }
    };
    Object.defineProperty(clazz, 'name', {value: this.#name});
    return new clazz;
  }

  get [Symbol.for("definitions")](){return this.#orgDefs}

  get [Symbol.for("size")](){
    if(this.#recursive){
      if(!this.#initialized) throw new Error("Can't get size on not readed recursive Struct");
      let size = 0;
      for(let {name, type, data} of this.#definitions){
        for(let i=0; i<(data ? data : 1); i++){
          if(["char", "bool", "int8", "uint8"].includes(type)) size++;
          if(["int16", "uint16"].includes(type)) size += 2;
          if(["int32", "uint32", "float"].includes(type)) size += 4;
          if(["int64", "uint64", "double"].includes(type)) size += 8;
          if(type == "struct"){
            if(data) size += this.#struct[name][i][Symbol.for("size")];
            else size += this.#struct[name][Symbol.for("size")];
          }
        }
      }
      return size;
    } else {
      let size = 0;
      for(let {type, data, struct_t} of this.#definitions){
        if(!data) data = 1;
        for(let i=0; i<data; i++){
          if(["char", "bool", "int8", "uint8"].includes(type)) size++;
          if(["int16", "uint16"].includes(type)) size += 2;
          if(["int32", "uint32", "float"].includes(type)) size += 4;
          if(["int64", "uint64", "double"].includes(type)) size += 8;
          if(type == "struct") size += struct_t[Symbol.for("size")];
        }
      }
      return size;
    }
  }

  get [Symbol.for("recursive")]() { return this.#recursive }
  get [Symbol.for("initialized")]() { return this.#initialized }

  get [Symbol.toStringTag]() { return this.#name }
}

function createProxy(type, struct_t, name = "", data = false){
  return new Proxy({}, {
    get(target, prop){
      if(typeof prop == "symbol") return target[prop];
      if(["-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(prop.substring(0, 1))){
        if(isNaN(Number(prop)) || Number(prop) <= 0) return createProxy(type, struct_t, name, data);
        return createProxy(type, struct_t, name, Number(prop));
      }
      if(name == "") return createProxy(type, struct_t, prop, data);
      if(prop != "") return createProxy(type, struct_t, name, prop);
      return createProxy(type, struct_t, name, data);
    },
    set(){
      return true;
    },
    getPrototypeOf(){
      return {type, name, data, struct_t};
    }
  });
}

function Struct(...args){
  if(!(args[0] instanceof struct)) return new struct(...args);
  return createProxy("struct", args[0]);
}

Struct.prototype = struct.prototype;

Struct.read = function read(struct_t, buffer){ return struct_t[Symbol.for("Struct.read")](buffer) }
Struct.json = function json(struct_t){ return struct_t[Symbol.for("json")] }
Struct.sizeof = function json(struct_t){ return struct_t[Symbol.for("size")] }
Struct.buffer = function buffer(struct_t){ return struct_t[Symbol.for("buffer")]() }
Struct.isRecursive = function recursive(struct_t){ return struct_t[Symbol.for("recursive")] }
Struct.isInitialized = function initialized(struct_t){ return struct_t[Symbol.for("initialized")] }

function bswap16(val, signed){
  let n = (val & 0xFF) << 8 | ((val >>> 8) & 0xFF);
  return signed ? new Int16Array([n])[0] : n;
}

function bswap32(val, signed){
  let n = ((val & 0xFF) * 0x1000000) + ((((val >>> 8) & 0xFF) << 16) | (((val >>> 16) & 0xFF) << 8) | ((val >>> 24) & 0xFF));
  return signed ? new Int32Array([n])[0] : n;
}

function bswap64(val, signed){
  let llo = Number(val & 0xffffffffn);
  let hi = (llo & 0xFF) * 2 ** 24 +
    ((llo >>> 8) & 0xFF) * 2 ** 16 +
    ((llo >>> 16) & 0xFF) * 2 ** 8 +
    ((llo >>> 24) & 0xFF)

  let lhi = Number(val >> 32n & 0xffffffffn);
  let lo = (lhi & 0xFF) * 2 ** 24 +
    ((lhi >>> 8) & 0xFF) * 2 ** 16 +
    ((lhi >>> 16) & 0xFF) * 2 ** 8 +
    ((lhi >>> 24) & 0xFF)

  let n = (BigInt(hi) << 32n) + BigInt(lo);
  return signed ? new BigInt64Array([n])[0] : n;
}

module.exports = {
  Struct,
  bswap16,
  bswap32,
  bswap64,
  ...types
};
