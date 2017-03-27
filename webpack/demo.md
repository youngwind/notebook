# 前言
webpack，如今最为流行的构建工具。我虽常用webpack，却一直对其实现一无所知。
今天，通过学习webpack的源码，我们一步步实现一个简单版本的webpack，源码在[这里](https://github.com/youngwind/fake-webpack)。

# 目标
**要完成什么功能呢?**
虽然webpack现在是一个庞大的构建工具，但是它最初最主要的目标是**能够在浏览器端复用符合CommonJS规范的模块**，
这一点可以从[第一个commit](https://github.com/webpack/webpack/tree/2e1460036c5349951da86c582006c7787c56c543)中看出来。
所以，我们不考虑复杂的loader和插件等等机制,将精力集中在一个最简单最核心的问题上：**将符合CommonJS规范的模块打包成一个JS文件，以供浏览器执行使用。**

PS:如果你从来没有看过webpack构建出来的bundle.js的内部结构,请务必对其有所了解再往下阅读,参考资料:
1. https://github.com/youngwind/blog/issues/64
2. https://segmentfault.com/a/1190000006814420

我们实际要实现的例子可参考[这里](https://github.com/youngwind/fake-webpack/tree/master/examples/simple),
最后构建出来的结果参考这里的[output.js](https://github.com/youngwind/fake-webpack/blob/master/examples/simple/output.js)

# 两步走
仔细观察output.js,我们能够发现,实现webpack大概有两个步骤:
1. 分析模块的依赖关系(如example依赖于a、b、c)
2. 根据依赖关系,拼接生成output.js

# 分析依赖关系
不难发现,第一个难点就是:**如何分析模块间的依赖关系。**
CommonJS不同于CMD,是不会提前定义所依赖的模块的。CommonJS的特点就是用到的时候再require。
举个例子,入口`example.js`的内容如下:
```js
let a = require('a');
let b = require('b');
let c = require('c');
a();
b();
c();
```
如何知道:**example依赖于a、b和c呢?**
一个最简单的思路就是正则匹配:通过正则,匹配出有多少个require。但是这种做法有两个明显的缺点。
1. 如果require语句被注释掉,也会匹配到
2. 考虑到可扩展性,如果require的参数是一个表达式(如'a'+'b'),或者是一个变量require(name),显然正则就非常难以处理。

所以,不能使用正则这种粗暴的方法。怎么办呢?
答案是**使用分析工具如(esprima、acorn)将JS字符串转换成抽象语法树(AST)**
这部分的核心代码是[parse.js](https://github.com/youngwind/fake-webpack/blob/1bfcd0edf1/lib/parse.js)

# 如何找到模块
当我们得到了依赖关系之后,下一个问题就是:"如何找到模块"
举个例子:
```js
let a = require('a');
```
就这么一个语句,所谓`a`模块到底指的是哪个js文件?
这个问题就像是我们平常在使用npm包一样, `require('a-npm-package')`,程序首先会在当前目录的`node_modules`文件夹下寻找,
如果找不到,那么往上一层,接着上层的`node_modules`里面找。
如果还找不到,那么继续往上一层,知道找到或者直至根目录都找不到。

所以,就这么一个简单的`require('a')`语句,我们需要编写特定的查找逻辑,这部分的核心代码是[resolve.js](https://github.com/youngwind/fake-webpack/blob/1bfcd0edf1/lib/resolve.js)

# 拼接output.js
在解决了`模块依赖`与`模块查找`的问题之后,我们会得到一个依赖关系对象`depTree`,它的结构为:
```json
{
    "modules": {
        "/Users/youngwind/www/fake-webpack/examples/simple/example.js": {
            "id": 0,
            "filename": "/Users/youngwind/www/fake-webpack/examples/simple/example.js",
            "name": "/Users/youngwind/www/fake-webpack/examples/simple/example.js",
            "requires": [
                {
                    "name": "a",
                    "nameRange": [
                        16,
                        19
                    ],
                    "id": 1
                },
                {
                    "name": "b",
                    "nameRange": [
                        38,
                        41
                    ],
                    "id": 2
                },
                {
                    "name": "c",
                    "nameRange": [
                        60,
                        63
                    ],
                    "id": 3
                }
            ],
            "source": "let a = require('a');\nlet b = require('b');\nlet c = require('c');\na();\nb();\nc();\n"
        },
        "/Users/youngwind/www/fake-webpack/examples/simple/a.js": {
            "id": 1,
            "filename": "/Users/youngwind/www/fake-webpack/examples/simple/a.js",
            "name": "a",
            "requires": [],
            "source": "// module a\n\nmodule.exports = function () {\n    console.log('a')\n};"
        },
        "/Users/youngwind/www/fake-webpack/examples/simple/b.js": {
            "id": 2,
            "filename": "/Users/youngwind/www/fake-webpack/examples/simple/b.js",
            "name": "b",
            "requires": [],
            "source": "// module b\n\nmodule.exports = function () {\n    console.log('b')\n};"
        },
        "/Users/youngwind/www/fake-webpack/examples/simple/node_modules/c.js": {
            "id": 3,
            "filename": "/Users/youngwind/www/fake-webpack/examples/simple/node_modules/c.js",
            "name": "c",
            "requires": [],
            "source": "module.exports = function () {\n    console.log('c')\n}"
        }
    },
    "mapModuleNameToId": {
        "/Users/youngwind/www/fake-webpack/examples/simple/example.js": 0,
        "a": 1,
        "b": 2,
        "c": 3
    }
}
```
依据这个`depTree`,我们便可以完成output.js的编写。
其中有一个需要注意的地方:**构建出来的output.js,模块的标志并非模块名,而是模块的id。因此,我们需要将模块名替换成模块id。**
举个例子: 将`let a = require('a');`替换成`let a = require(/* a */1)`;
这部分的核心代码是[writeChunk.js]()和[writeSource.js]()

至此,我们就完成了一个非常简单的webpack了。

# 遗留问题
1. 尚未处理`require('a' + 'b')`这样的情况
2. 逐层往上查找模块(resolve.js)有待完善
3. 如何做自动watch的功能?
4. 如何做loader或者插件的机制?
5. ……

# 参考资料
1. https://lihuanghe.github.io/2016/05/30/webpack-event.html













