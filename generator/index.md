生成器的引入给js带来了一种全新的功能: 一个函数可以分多次执行。
执行生成器函数generator的结果是产生一个迭代器iterator。
生成器就是这样一类特殊的函数,不是非得执行完,也可以一次或多次启动和停止。

生成器函数虽然是一个特殊的函数,但它依然是函数,依然能够接受参数,返回值,如下所示。
```js
function* foo(x,y){
	return x * y;
}

let it = foo(6, 7);
let res = it.next();
console.log(res.value)
```

不仅如此,生成器还有更强大的消息传递功能
```js
function* foo(x){
	let y = x * (yield);
	return y;
}

let it = foo(6);
let res = it.next();
console.log(res)
res = it.next(7);
console.log(res);
```

```js
function* foo(x){
	let y = x * (yield "Hello");
	return y;
}

let it = foo(6);
let res = it.next();
console.log(res.value);

res = it.next(7);  // 这里不传参数,又会怎么样?
console.log(res.value);
```