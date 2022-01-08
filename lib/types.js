let data_models = {
  standard: {
    short: 16,
    int: 16,
    long: 32
  },
  lp32: {
    short: 16,
    int: 16,
    long: 32
  },
  ilp32: {
    short: 16,
    int: 32,
    long: 32
  },
  llp64: {
    short: 16,
    int: 32,
    long: 32
  },
  lp64: {
    short: 16,
    int: 32,
    long: 64
  }
}

function createProxy(type, long = false, name = "", data = false, bigendian = false){
  return new Proxy({}, {
    get(_, prop){
      if(prop == Symbol.iterator)
        return function* () { yield createProxy(type, long, name, data, true) };
      prop = String(prop);
      if(type.startsWith("unsigned")){
        let model = type.split(" ")[1];
        prop = prop.replace(/_t$/, "");
        if(prop == "char") return createProxy("uchar", long, name, data, bigendian);
        if(prop == "byte") return createProxy("uint8", long, name, data, bigendian);
        if(prop == "short") return createProxy("uint"+data_models[model].short, long, name, data, bigendian);
        if(prop == "int") return createProxy("uint"+data_models[model].int, long, name, data, bigendian);
        if(prop == "long") return createProxy("uint"+data_models[model].long, true, name, data, bigendian);
      } if(type.startsWith("signed")){
        let model = type.split(" ")[1];
        prop = prop.replace(/_t$/, "");
        if(prop == "char") return createProxy("schar", long, name, data, bigendian);
        if(prop == "byte") return createProxy("int8", long, name, data, bigendian);
        if(prop == "short") return createProxy("int"+data_models[model].short, long, name, data, bigendian);
        if(prop == "int") return createProxy("int"+data_models[model].int, long, name, data, bigendian);
        if(prop == "long") return createProxy("int"+data_models[model].long, true, name, data, bigendian);
      }
      if(long && prop == "long") return createProxy(type.replace("32", "64"), false, name, data, bigendian)
      if(["short", "int", "long"].includes(prop)) return createProxy(type, long, name, data, bigendian);
      if(["-", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(prop.substring(0, 1))){
        if(isNaN(Number(prop)) || Number(prop) <= 0) return createProxy(type, long, name, data, bigendian);
        return createProxy(type, long, name, Number(prop), bigendian);
      }
      if(name == "") return createProxy(type, long, prop, data, bigendian);
      if(prop != "") return createProxy(type, long, name, prop, bigendian);
      return createProxy(type, long, name, data, bigendian);
    },
    set(){
      return true;
    },
    getPrototypeOf(){
      return {type, name, data, bigendian};
    }
  })
}

let types = {
  char: createProxy("char"),
  bool: createProxy("bool"),
  int8: createProxy("int8"),
  uint8: createProxy("uint8"),
  byte: createProxy("uint8"),
  sbyte: createProxy("int8"),
  int16: createProxy("int16"),
  uint16: createProxy("uint16"),
  int32: createProxy("int32"),
  uint32: createProxy("uint32"),
  int64: createProxy("int64"),
  uint64: createProxy("uint64"),
  float: createProxy("float"),
  double: createProxy("double")
}

for(let key of Object.keys(types))
  types[key+"_t"] = types[key];

function createType(model){
  let t = {
    short: createProxy("int"+data_models[model].short),
    int: createProxy("int"+data_models[model].int),
    long: createProxy("int"+data_models[model].long, true),
    signed: createProxy("signed "+model),
    unsigned: createProxy("unsigned "+model),
    ...types
  }
  for(let key of Object.keys(t))
    t[key+"_t"] = t[key];
  return t;
}

exports.standard = createType("standard");
exports.lp32 = createType("lp32");
exports.ilp32 = exports.types = createType("ilp32");
exports.llp64 = createType("llp64");
exports.lp64 = createType("lp64");
