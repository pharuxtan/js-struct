<div align="center">
    <h1>JS Struct</h1>
  	<p>JS Struct replicates the C Struct functionality to make buffer easier to read and write </p> 
</div>

---

<!-- TOC -->

- [Basic installation and usage](#basic-installation-and-usage)
- [Class: Struct](#class-struct)
  - [new Struct(...types[, name])](#new-structtypes-name)
  - [`static` read(struct, buffer)](#static-readstruct-buffer)
  - [`static` json(struct)](#static-jsonstruct)
  - [`static` buffer(struct)](#static-bufferstruct)
  - [`static` sizeof(struct)](#static-sizeofstruct)
  - [`static` isRecursive(struct)](#static-isrecursivestruct)
  - [`static` isInitialized(struct)](#static-isinitializedstruct)
  - [`static` isStruct(struct)](#static-isstructstruct)
- [Types](#types)
- [Byte swapping](#byte-swapping)
- [Recursive Structures (experimental)](#recursive-structures-experimental)
- [LICENSE](#license)

<!-- /TOC -->

---

## Basic installation

You can install this package either by using npm or by downloading the source from GitHub and requiring it directly.

To install using npm open your terminal (or command line), make sure you're in your application directory and execute the following command:

```console
npm install js-c-struct
```

You can then start using the package by requiring it from your application as such:

```js
const { Struct } = require('js-c-struct');
```

**⚠️ There is no error handler for now, use this package carefully ⚠️**

## Class: Struct

### new Struct(...definitions[, name])

- `...definitions` : `<Proxy<T>[]>` The definitions of the structure. See [Types](#types) for more information
- `name` : `<String>` The name of the structure.
- Returns : `<Struct>`

Create a new structure.

```js
const { Struct, types: { int, byte } } = require('js-c-struct');

let Hashize = new Struct(
  int.size,
  byte.crc32[4]
, "Hashize");
```

### `static` read(struct, buffer)

- `struct`: `<Struct>` The structure you want to affect the buffer
- `buffer` : `<TypedArray>` | `<Buffer>` The buffer you want to affect
- Returns : `<Struct>`

Read the buffer with the definitions gave in the constructor and make a new readed structure of it.

```js
let buffer = new Uint8Array([0x9a, 0x02, 0x00, 0x00, 0x3a, 0x45, 0xf4, 0xc5]);
let hashize = Struct.read(Hashize, buffer);
```

### `static` json(struct)

- `struct`: `<Struct>` The structure you want to extract the JSON
- Returns : `<Class>`

Extract the data of the structure into a json.\
⚠️ Can only be done after reading the structure\
The returned object is a class because of the name you can give to the structure, but it doesn't change anything. 😉

```js
console.log( Struct.json(hashize) );
// Hashize {
//   size: 666,
//   crc32: Uint8Array(4) [ 58, 69, 244, 197 ]
// }
```

### `static` buffer(struct)

- `struct`: `<Struct>` The structure you want to extract the Buffer
- Returns : `<Uint8Array>`

Extract the data of the structure into an Uint8Array.\
⚠️ Can only be done after reading the structure\
Can be nice if you want to modify some values in the structure and get the buffer back.\
(⚠️ Editing structures can only be done on non recursive one)

```js
hashize.size = 42;

console.log( Struct.buffer(hashize) );
// Uint8Array(8) [42, 0, 0, 0, 58, 69, 244, 197]
```

### `static` sizeof(struct)

- `struct` : `<Struct>` The structure you want the size
- Returns : `<Number>`

Return the size of the structure.\
⚠️ On recursive struct this function can only be done after reading the structure

```js
console.log( Struct.sizeof(Hashize) ); // it work too with hashize
// 8
```

### `static` isInitialized(struct)

- `struct` : `<Struct>` The structure you want to see the state
- Returns : `<boolean>`

Know if the structure is readed or not

```js
console.log( Struct.isInitialized(hashize) ) // true
console.log( Struct.isInitialized(Hashize) ) // false
```

### `static` isRecursive(struct)

- `struct` : `<Struct>` The structure you want to see if it is a Recursive Structure
- Returns : `<boolean>`

Know if the structure is recursive or not

```js
console.log( Struct.isRecursive(Hashize) ) // false
// false

let Name = new Struct(
  int.length,
  int.name["length"]
);

console.log( Struct.isRecursive(Name) ) // true
```

### `static` isStruct(struct)

- `struct` : `<Struct>` The structure you want to test
- Returns : `<boolean>`

Returns `true` if `struct` is a `Struct`, `false` otherwise.

```js
let struct = new Struct( /* ... */ );
let uint8array = new Uint8Array();
console.log( Struct.isStruct(struct) );
// true
console.log( Struct.isStruct(uint8array) );
// false
```

## Types

To understand types we need first to understand how struct is formed in c:

```c
struct Person {
  int age;
  char name[16];
  struct Family family; // a structure Family need to be defined before
} 
// The next is optional, it is only used to declare a new type in C, but in JS we don't need that, but imagine that we can make it by naming our Struct
typedef Person person_t
```

With that example, you understand what is `...definitions` in the [Struct constructor](#new-structtypes-name)\
To create c like definitions like this in javascript, i use [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), so `int age` become `int.age` and `char name[16]` become `char.name[16]`

So now you're surely asking, how struct definitions are made ?\
To do struct definition, you need to use the Struct class but not creating a new one with `new` expression, just creating it like a normal function. So `struct Family family` become `Struct(Family).family`

The above example in c, will look like this
```js
let Person = new Struct(
  int.age,
  char.name[16],
  Struct(Family).family // Same as C, a structure Family need to be defined before
, "person_t") // Structure name is optional, it is used for JSON logging, to know what struct correspond an object
```

To import above types you need to do
```js
let { Struct, types: { int, char } } = require("js-c-struct");
```

Default types are\
`char`, `bool`, `int8`, `uint8`, `byte`, `sbyte`, `int16`,\
`uint16`, `int32`, `uint32`, `int64`, `uint64`, `float` and `double`\
(⚠️ `byte` is uint8 and `sbyte` is int8, `int64` and `uint64` are BigInt values)

Generic C types are also present but declined by data models.\
There is 5 data models: `C Standard`, `LP32`, `ILP32`, `LLP64` and `LP64`\
[See more info here.](https://en.cppreference.com/w/cpp/language/types)

To import these special type replace `types` above with `standard`, `lp32`, `ilp32`, `llp64` or `lp64`. Keep in mind that all default types are present in each models and that `types` import is the same as `ilp32`\
These models import `short`, `int`, `long` and `long long` (that can be done via `long.long`)

There are too, two special type: `signed` and `unsigned`.

These special types accept 6 types: `char`, `byte`, `short`, `int`, `long` and `long long`.

So if you want to create a uint32 with ILP32 model, you need to do:
```js
const { ilp32: { unsigned } } = require("js-c-struct");

unsigned.int.definition;

// You can also do
const { ilp32: { unsigned: { int } } } = require("js-c-struct");

int.definition;
```

Or a uint64 with LLP64 ?
```js
const { llp64: { unsigned } } = require("js-c-struct");

unsigned.long.long.definition;
```

Note that all types can be imported with `_t`at the end (for faster c to js conversion)

## Byte swapping

Swapping byte is made after reading the struct in C by doing `bswap16`, `bswap32` or `bswap64` functions, these functions can be imported in js-struct like this:

```js
const { bswap16, bswap32, bswap64 } = require("js-c-struct");
```

But it is boring to do a new variable for swapping the bytes from little to big right ?\
This is why by adding `...` before your definition, it will make it big endian in the structure.

Example:
```js
let LittleBigEndian = new Struct(
  int.little,
  ...int.big
);
```

## Recursive Structure (experimental)

⚠️ Recursive structures are read-only because their size is unpredictable and modify certain values need to modify another one, there will surely be a system later to make writing possible.

Recursive structure are structure that read the length value directly with a previous readed one.\
For example if i have created a definition called `nameLen` in the structure before, i need to do `char.name["nameLen"]` to get the right char array of the name.

Imagine now that we have a partition with block_size of 4096 bits, and that we have a file with a block_length of X blocks in the partition. The solution is simple, you can do `byte.file["=$block_length*$block_size"]` or `byte.file["=$block_length*4096"]` if block_size is not defined and already known.

<a id="license" rel="license" href="https://github.com/pharuxtan/js-struct/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-%23707070?style=for-the-badge" alt="license"></a>