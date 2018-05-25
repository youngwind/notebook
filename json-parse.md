# 前言
在日常项目中，JSON 数据的反序列化，我们经常使用 JSON.parse 。如果让你自己去实现 JSON.parse ，你会怎么做呢？
下面我们通过学习 JSON 之父写的 JSON-js 源码，来解答这个问题。

# Eval

json 是一种通用的数据交换格式，最初脱胎于 Javascript，是 JS 的子集，所以我们可以直接使用 eval 运行 json 数据，得到对象。
```js
var obj = eval("(" + json + ")");  // 添加括号使 json 数据编程表达式
```
就一行代码就解决问题，是不是很爽？

然而，如果直接这么写的话，会有 xss 漏洞，设想 json 是一段可执行的恶意 JS 代码。怎么办呢？我们可以正则对参数进行校验。
```
// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;

    if (
                    rx_one.test(
                        text
                            .replace(rx_two, "@")
                            .replace(rx_three, "]")
                            .replace(rx_four, "")
                    )
                ) {


                    var obj = eval("(" + text + ")");

                }
```
问题的关键是这几个过滤的正则怎么写？我将上面的注意翻译一下。

1. 将反斜杠替换成 @
2. 将简单值替换成 ]，包括 "abc", 123
3. 将逗号后面的[ ，冒号后面的 [ 和 json 开头的 [，都删除掉
4. 如果最终的字符串只包含 ]、，、：和{ 和 }，那么这就是一个安全的 json 数据，可以给 eval 执行，否则就报错。

我的正则一向写得一般般，所以我找了个工具帮助我理解。https://regexper.com 通过它可以可视化地显示正则的逻辑，比如 rx_three 的逻辑如下图所示

// 此处缺图

这里有一点要提一下，比如 rx_three 里面有 (?:) 这样的结构，这是正则的不捕获分组，如果不使用它的话，在过滤一个很大的 json 的时候，会生成很多没有意义的缓存变量，
参考这里：

另附参考资料：https://www.zhihu.com/question/19853431

1. https://www.zhihu.com/question/20591877
2. https://zhuanlan.zhihu.com/p/29958439

# 递归
除了 Eval，我们还可以用递归的方式实现。不过 Eval 是将 json 一股脑儿塞进去，而递归就得让我们逐字符地去扫描，判断。
```
 var next = function (c) {

// If a c parameter is provided, verify that it matches the current character.

        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }

// Get the next character. When there are no more characters,
// return the empty string.

        ch = text.charAt(at);
        at += 1;
        return ch;
    };
```

具体的实现逻辑细致而全面，需要读者自行 debug 代码调试。不过这里我要着重提一点的就是：这种方法里面隐含着第三种的实现实现方式：状态机。

比如
```js
switch (ch) {
        case "t":
            next("t");
            next("r");
            next("u");
            next("e");
            return true;
        case "f":
            next("f");
            next("a");
            next("l");
            next("s");
            next("e");
            return false;
        case "n":
            next("n");
            next("u");
            next("l");
            next("l");
            return null;
        }
```
如果 value 值不是数字，也不是字符串，那么它可能就是 Boolean 或 null 了。如果是 t 开头的，那么后续的三个字母必须是 t、u、e，否则就报错。
这便是状态机的一种表现，t 状态下，输入必须是 r，否则退出。

这里可以参考文章：https://juejin.im/post/5a46e174518825698e726486

# 状态机
状态机名字起得很抽象，但是其实它的应用是非常广泛的，比如正则引擎、词法分析、甚至字符串匹配中的 KMP 算法也能用它解释。因为它代表是一种本质的数学逻辑：
在A状态下，如果输入是B的话，那么输出是C。
我们以  {a:1, b:2} 为例，看看不同状态之间是如何转移的。


同时，我们也能看到广泛用了访问者模式，比如下面
```js
var string = {   // The actions for string tokens
        go: function () {
            state = "ok";
        },
        firstokey: function () {
            key = value;
            state = "colon";
        },
        okey: function () {
            key = value;
            state = "colon";
        },
        ovalue: function () {
            state = "ocomma";
        },
        firstavalue: function () {
            state = "acomma";
        },
        avalue: function () {
            state = "acomma";
        }
    };
```

# JSON.stringify
说完了 JSON.parse 的实现，顺便也附上 JSON.stringify 的实现吧
// 缺 MDN 的代码

