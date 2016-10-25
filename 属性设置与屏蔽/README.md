myObject是一个对象, 当我们对它进行如下操作时:
```js
myObject.foo = "bar";
```
实际上到底发生了什么?
下面的几个例子,你能全部答对并知晓原理吗?

```js
let myObject = {
	"foo":"哈哈哈"
};
myObject.foo = "bar";
console.log(myObject);
console.log(myObject.foo);
```

```js
let anotherObject = {
    "foo": "哈哈哈"
};
let myObject = Object.create(anotherObject);
myObject.foo = "bar";
console.log(myObject);
console.log(myObject.foo);
```

```js
let anotherObject = {};
Object.defineProperty(anotherObject, "foo", {
	enumerable: true,
	configurable: true,
	writable: false,
	value: "哈哈哈"
});
let myObject = Object.create(anotherObject);
myObject.foo = "bar";
console.log(myObject);
console.log(myObject.foo);
```

```js
"use strict";
let anotherObject = {};
Object.defineProperty(anotherObject, "foo", {
	enumerable: true,
	configurable: true,
	writable: false,
	value: "哈哈哈"
});
let myObject = Object.create(anotherObject);
myObject.foo = "bar";
console.log(myObject);
console.log(myObject.foo);
```

```js
let anotherObject = {
  set foo(val) {
    this.__foo__ = val;
  }
};
let myObject = Object.create(anotherObject);
myObject.foo = "bar";
console.log(myObject);
console.log(myObject.foo);
```

```js
let anotherObject = {
	a: 2
};
let myObject = Object.create(anotherObject);
myObject.a++;
console.log(anotherObject);
console.log(myObject);
```