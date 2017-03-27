# Why
最近参考[requirejs](https://github.com/requirejs/requirejs)的API，自己动手实现了一个简单的异步模块加载器[fake-requirejs](https://github.com/youngwind/fake-requirejs)。
为什么要做这样一个东西呢？
原因是：我一直觉得自己对模块化这方面的理解不够深入，即便用了很长时间的webpack，看了很多关于[模块化的发展历史](https://huangxuan.me/js-module-7day/#/)、amd，commonjs和cmd规范之争这类文章,
但我依然觉得自己的理解流于表面。所以决定自己动手实现一个。
本来一开始的目标是webpack的，但是后来考虑到webpack是建立在模块化基础上的一个构建工具，我希望能够刻意地区分开构建与模块化这两个概念,
因为这有助于我集中有限的精力研究模块化这一个概念。所以后来决定实现requirejs,这是一个相对来说比较简单的异步模块加载器。
虽然现在使用它的人已经越来越少了,但是因为其简单和纯粹,倒是非常适合现在的我。

请确保掌握了requirejs的基本用法再往下阅读。

# Module原型的设计
我一开始就在想如何实现`require`函数和`define`函数,但是后来我发现我错了,因为这陷入了`面向过程编程`的误区,正确的方式应该是`面向对象编程`。
所以,我重新进行了思考: **这里有哪些类型的对象呢?**
答案: **至少有模块(Module)这一类对象**


那这类对象有哪些数据呢?
```js
Module.id       // 模块id
Module.name     // 模块名字
Module.src      // 模块的真实的uri路径
Module.dep      // 模块的依赖
Module.cb       // 模块的成功回调函数
Module.errorFn  // 模块的失败回调函数
Module.STATUS   // 模块的状态(等待中、正在网络请求、准备执行、执行成功、出现错误……)
```

有哪些对应的操作这些数据的方法呢?
```js
Module.prototype.init           // 初始化,用来赋予各种基本值
Module.prototype.fetch          // 通过网络请求,获取模块
Module.prototype.analyzeDep     // 分析模块都有哪些依赖
Module.prototype.execute        // 运算该模块
```

## 依赖分析与处理
顺着上面的思路,我们会发现有一个难点:**就是如何分析和处理模块的依赖?**
举个例子:
```js
// 入口main.js
require(['a', 'b'], function (a, b) {
    a.hi();
    b.goodbye();
}, function () {
    console.error('Something wrong with the dependent modules.');
});
```
我们要做到:**当模块a和b都准备好之后,再执行成功回调函数;一旦a或b有任意一个失败,都执行失败回调函数。**
这个跟`Promise.all`和`Promise.race`很像,但这一次我们是要实现它们。怎么办呢?

一开始我想了一个笨方法, 既然二维的难以处理,那么我们将a和b拼接成一个字符串,然后压成一维的,然后不就能直接使用观察者模式了吗?
所以当时我是[这么做的](https://github.com/youngwind/fake-requirejs/blob/master/_fake-require.js#L92-L109),
这种这么繁琐的方法就不多加赘述了,下面讲讲我寻找到的更好的方法:**记数法**。

分两步走。

第一步,为Module原型新增Module.depCount属性,初始值为该模块依赖模块数组的长度。每当有一个依赖模块准备好了,那么depCount--。
这样,当depCount===0的时候,就说明该模块所有依赖都准备好了,可以开始执行该模块。
第二步,A模块准备好之后,如何得知哪些模块依赖于A,从而修改那些模块的depCount呢? →引入一个mapDepToModule对象,用于映射依赖模块到被依赖模块之间的关系。
结构如下图所示。
// 此处缺图。
举个例子:当模块a准备好之后,我们就遍历mapDepToModule['a']对应的数组,这样就能修改被依赖模块的depCount。

下面是一个关键的代码:
```js
Module.prototype.analyzeDep = function () {
        // .......
        let depCount = this.dep ? this.dep.length : 0;
        Object.defineProperty(this, 'depCount', {
            get() {
                return depCount;
            },
            set(newDepCount) {
                depCount = newDepCount;
                if (newDepCount === 0) {
                    console.log(`模块${this.name}的依赖已经全部准备好`);
                    this.execute();
                }
            }
        });
        this.depCount = depCount;
        // ....
    };
```

```js
// 当模块的状态改变到已执行成功地阶段,那么让依赖这个模块的所有模块的depCount--
Object.defineProperty(this, 'status', {
                get () {
                    return status;
                },
                set (newStatus) {
                    status = newStatus;
                    if (status === 5) {
                        // 该模块已经executed
                        let depedModules = mapDepToModuleOrTask[this.name];
                        if (!depedModules) return;
                        depedModules.forEach((module) => {
                            setTimeout(() => {
                                module.depCount--;
                            });
                        });
                    }
                }
            })
```
这样的实现是否更优雅一些?

# 循环依赖
虽然我们都说循环依赖是一种不好的现象,应该尽量避免。但是,随着项目越滚越大,谁又能保证一定不会出现?
所以,作为一个合格的模块加载器,必须解决循环依赖的问题。
那么,让我们先来看看别人是怎么处理的。
[Commonjs和ES6的循环依赖](http://www.ruanyifeng.com/blog/2015/11/circular-dependency.html)
[seajs的循环依赖](https://github.com/seajs/seajs/issues/732)
[requirejs的循环依赖](http://requirejs.cn/docs/api.html#circular)

这里我们不讨论各种做法孰优孰劣,我们只关注:
**在已经实现的demo版本的基础上,如何实现[API文档中那样的功能](http://requirejs.cn/docs/api.html#circular)?**

观察下面的例子:a与b出现循环依赖
```js
// main.js
require(['a','b'], function (a, b) {
    a.hi();
    b.goodbye();
}, function () {
    console.error('Something wrong with the dependent modules.');
});

```
```js
// a.js
define(['b'],function (b) {
    var hi = function () {
        console.log('hi');
    };

    b.goodbye();
    return {
        hi: hi
    }
});
```
```js
// b.js
define(['require', 'a'], function (require) {
    var goodbye = function () {
        console.log('goodbye');
    };

    require(['a'], function (a) {
        a.hi();
    });

    return {
        goodbye: goodbye
    }
});
```
我们能看到:模块b的回调函数中,并不能直接引用到a,需要使用`require`方法包住。
那么问题来了:在原先的设计中, 每一个`define`、每一个`require`都是跟一个模块一一对应的。
但是,现在在模块b的回调函数中,又出现require(['a']),这显然不能把a当做一个新模块来对待啊!

至此,我发现原先只有一个原型Module已经不能承载这个功能了,我需要另一个原型,我将它命名为:`任务(Task)`。
每一次调用`require`,相当于新建一个任务。这个任务的功能是:当任务的所有依赖都准备好之后,执行该任务的成功回调函数。
有没有发现这个`Task`原型与`Module`很像?它们都有依赖、回调、状态,都需要分析依赖、执行等方法。
所以,我让`Task`继承了`Module`。

关键代码如下:
```js
// before
require = function (dep, cb, errorFn) {
        // mainEntryModule是主入口模块
        modules[mainEntryModule.name] = mainEntryModule;
        mainEntryModule.dep = dep;
        mainEntryModule.cb = cb;
        mainEntryModule.errorFn = errorFn;
        mainEntryModule.analyzeDep();
    };



// after
require = function (dep, cb, errorFn) {
        let task = new Task(dep, cb, errorFn);
        task.analyzeDep();
    };

```

至此,我们就完成了一个简单的异步模块加载器。
