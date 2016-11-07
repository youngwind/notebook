# 疑问
最早接触mixin的概念, 是在使用React的时候。那时候对mixin的认知是这样的:
React不同的组件类可能需要相同的功能,比如一样的`getDefaultProps`, 比如一样的`componentDidMount`。
就如同[这篇文章](https://segmentfault.com/a/1190000003016446)中所说的。
> 我们知道，到处重复地编写同样的代码是不好的。为了将同样的功能添加到多个组件当中，你需要将这些通用的功能包装成一个mixin，然后导入到你的模块中。

那时候我以为mixin是React独创的一个概念,直到后来我在另外的很多资料中也发现mixin的踪影,比如[Vue中也有mixin](https://vuejs.org.cn/guide/mixins.html)。仔细研究一番,才猛地发现:**原来mixin是一种思想,广泛存在,也有多个变种。**。
ok,让我们从头梳理一遍。

# 由来
关于JS中mixin是怎么来的,有两派观点。一派是**模仿类**,另一派是**多重继承**。

## 模仿类
众所周知,JS没有类。为什么JS设计之初就没有类,为什么JS非要通过"别扭"的原型链来实现继承呢?
这个答案可以在[阮一峰老师的这篇文章](http://www.ruanyifeng.com/blog/2011/06/designing_ideas_of_inheritance_mechanism_in_javascript.html)中找到。
真正的类在继承中是复制的。因此,虽然JS中没有类,但是无法阻挡众多的JS开发者模仿类的复制行为,由此诞生了mixin(混入)。
举个例子,Vehicle是一个交通工具"类",Car是一个小汽车"类",本来Car应该是通过原型链继承于Vehicle。
但是,下面的代码却没有这么做,它选择将Vehicle类的方法都复制到Car的属性中。(当然,避开了同名属性)。
```js
function mixin(sourceObj, targetObj){
    for(let key in sourceObj){
        if(!(key in targetObj)){
            targetObj[key] = sourceObj[key];
        }
    }
    return targetObj;
}

let Vehicle = {
    engines: 1,
    ignition () {
        console.log("Turning on my engine.");
    },
    drive () {
        this.ignition();
        console.log("Steering and moving forward!");
    }
};

let Car = mixin(Vehicle, {
    wheels: 4,
    drive () {
        Vehicle.drive.call(this);
        console.log(`Rolling on all ${this.wheels} wheels`);
    }
})
```
我们进一步思考: 我们最终想要得到的结果是Car能够方法到Vehicle的属性,比如ignition。
如果是通过常见的原型链,Car固然能访问到ignition,不过那是通过原型链向上查找才找到的。
如果是通过不常见的mixin,Car也能访问到ignition,不过这次是直接在Car的属性上找到的。
所以,这就是为了模仿类的复制所产生的mixin。下面我们来看另一派的观点。

## 多重继承
在面向对象的语言中(如C++,Java和JavaScript),单一继承都是非常常见的。
但是,如果想同时继承多于一个结构,例如容许"猫"在继承"动物"的同时,又想继承"宠物",那怎么办呢?这就是的概念。
C++支持多重继承,Java和JavaScript都不支持。为什么?因为多重继承是一把双刃剑,在解决问题的同事,却又增加了程序的复杂性和含糊性,比如典型的[钻石问题](http://blog.csdn.net/tounaobun/article/details/8443228)。
虽然Java和JavaScript都不支持多重继承,但是,多重继承所要解决的问题依然存在。那么他们各自又是如何解决的呢?
Java的解决方案是:通过原生的接口继承来间接实现多重继承。
JS的解决方案是: 原生JS没有解决方案。所以,众多JS开发者引入了mixin来解决这个问题。
举个例子。如下面代码所示,有两个超类,SuperType和AnotherSuperType,一个子类SubType。
现在,我想让子类SubType实例化的某个对象obj也拥有AnotherSuperType的sayHi方法。
```js
function SuperType(name){
    this.name = name;
}

function SubType(name) {
    SuperType.call(this, name);
}

SubType.prototype = new SuperType();
SubType.prototype.constructor = SubType;

let obj = new SubType("youngwind");

function mixin(sourceObj, targetObj){
    for(let key in sourceObj){
        if(!(key in targetObj)) {
           targetObj[key] = sourceObj[key];
        }
    }
}

function AnotherrSuperType(){};

AnotherrSuperType.prototype.sayHi = function() {
    console.log(`hi,${this.name}.`);
}

let anotherObj = new AnotherrSuperType();

mixin(anotherObj, obj);

obj.sayHi();  // hi...
```
所以,这就是为了解决多重继承所产生的mixin。

## 异曲同工
纵观上面两派的观点,虽然各自要解决的问题和应用场景都不同,但是,有一处是相同的:
那就是mixin(混合)本质上是将一个对象的属性拷贝到另一个对象上面去,其实就是对象的融合。
这时候我们回过头来思考"为什么React和Vue中都有mixin",就变得容易理解多了。

很多js库都有类似的功能,一般都会定义在util工具类中,有时候会叫做`extend`。
另外,Object.assign也是对象融合常用的方法,mixin和Object.assign一个重大的区别在于:
mixin会把原型链上的属性一并复制过去(因为`for...in`),而Object.assign则不会。

# 考虑是否写寄生式继承

# ES7的装饰器
为什么我会由mixin联想到ES7的装饰器呢?
因为我记得以前用React的时候,还是用老的语法,`const demo = React.createClass`,那时候是可以用mixin的。
后来React用ES6重写之后,就有了`class demo extends React.Component`这样的写法,这时候就用不了mixin了。
为什么会这样呢?大概说来,就是ES6的class写法不支持,具体的可以参考[这篇文章](https://zhuanlan.zhihu.com/p/20361937)。
也正式由此我发现了[ES7的装饰器功能](http://es6.ruanyifeng.com/#docs/decorator),仔细看过一些,但是并未能完全掌握。
而且这个功能太高级了,距离我目前的生产环境太远了,于我而言意义并不大,所以就先作罢,暂不深究。然而,正是这个名字"装饰器",让我发现了非常有价值的东西,
那就是设计模式中的装饰器模式。

# 装饰器模式
从一件简单的例子入手。
现在有一个现成的函数(别人早就写好了),我们需要往里面添加功能,做一些额外的事情。
```js
// 修改前
let doSomething = function() {
  console.log(1);
}


// 修改后
let doSomething = function() {
  console.log(1);
  console.log(2);
}
```

这种做法最为简单粗暴,但是却违反的[开放-封闭原则](https://zh.wikipedia.org/wiki/%E5%BC%80%E9%97%AD%E5%8E%9F%E5%88%99),并非正途。
我们来看更好的解决方案。
```js
let doSomething = function() {
  console.log(1);
}

let _doSomething = doSomething;

doSomething = function() {
  _doSomething();
  console.log(2);
}

doSomething();
```
这就是装饰者模式:为对象/函数动态地增加职责,又不直接修改这个对象/函数本身。
然而,我们也能看到这个方案的坏处:需要一个临时变量来储存原函数。这看起来问题不大。
但是,随着要装饰的函数越来越多,需要创建的临时变量呈线性增长,这问题就大了。
有什么解决办法吗?请看下面的例子。
```js
Function.prototype.before = function(beforefn){
    let _self = this;
    return function(){
        beforefn.apply(this, arguments);
        return _self.apply(this, arguments);
    }
}

Function.prototype.after = function(afterfn){
    let _self = this;
    return function(){
        let ret = _self.apply(this, arguments);
        afterfn.apply(this, arguments);
        return ret;
    }
}

let doSomething = function() {
  console.log(1);
}

doSomething = doSomething.before(() => {
    console.log(3);
}).after(() => {
    console.log(2);
});


doSomething();  // 输出 312
```

在书中,还有很多更加生动的例子,比如数据打点,比如表单验证,推荐直接阅读原作。

# 总结
无论是mixin还是寄生继承,还是装饰者模式,我们能看到他们之间的共同点:就不修改原先的类/函数/对象的前提下,为新的对象/函数添加其他的职责。
以达到"开发-封闭原则"和"单子职责原则"。