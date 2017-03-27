====草稿===

# 前言
继上一篇,介绍了一个最简单的webpack实现之后,今天,我们来更加深入一些,看看如何实现`code-splitting`功能,最后实现的代码请参考这里。
具体的`code-splitting`好处以及如何使用,在这里不再赘述,请直接参考官方文档。

其实回到最初,我们能发现,webpack也是参考自modeles-webmake,但其余modules-webmake的一大区别就是`code-splitting`功能。

> webpack as originally intended as fork for webmake for @medikoo so it shared several ideas with it.
So big credit goes to medikoo.
The design of webmake causes all modules with the same name to overlap. This can be problematic if different submodules rely on specific versions of the same module. The behaivior also differs from the behaivior of node.js, because node.js installs a module for each instance in submodules and webmake cause them the merge into a single module which is only installed once. In webpack this is not the case.

出处: https://github.com/webpack/webpack/tree/2e1460036c5349951da86c582006c7787c56c543#medikoomodules-webmake

# 目标
一般来说,`code-splitting`有两层含义。

1. 将第三方类库单独打包成vendor.js以提高缓存命中率 (这一点我们不做考虑)
2. 将项目本身的代码切割成若干部分,然后在特定的时机进行特定的加载。 (我们只研究这一点)

这里有一个问题:什么叫特定的时机呢?→ 比如一个单页面应用在切换router的时候,比如在响应某个事件的时候。
然而,如果要考虑特定时机才加载的话,那实在是复杂了些。我们再把目标精简一些:
不考虑在特定时机进行加载。只考虑如果将原先集中到一个output.js中的代码,按照某种规则切割成若干个js文件,然后分开加载。
举个例子:原先只加载output.js,现在把代码分割到3个文件中,先加载output.js,然后output.js又会自动触发平行加载1.output.js和2.output.js。

嗯,这个目标还算难度适中,那就是这个目标吧!下面我们一一来看看都有哪些难点。

# 切割点的选择
既然要将一份代码切割成若干份代码,总得有个切割的标识吧,从哪儿开始切呢?
webpack在其文档中提到,使用`require.ensure`作为切割点。
然而,我用了nodejs挺长时间了,怎么不知道CommonJS规范中还有`require.ensure`这一个用法?
而事实上nodejs也是不支持`require.ensure`的。
后来我在标准中找到了答案:http://wiki.commonjs.org/wiki/Modules/Async/A
从中我们可以看到,commonjs虽然是一个同步加载的规范,但其也是有异步加载相关的内容的。只不过这条内容只停留在PROPOSAL(建议)阶段,
并未最终进入标准,所以nodejs并没有实现它,而webpack将其作为切割点(本质上也是异步加载);

ok,现在我们已经明白,为什么要使用`require.ensure`作为切割点了。
下一个问题是:如何根据切割点对代码进行切割?下面举个例子。

# 例子
```js
// example.js
var a = require("a");
var b = require("b");
a();
require.ensure(["c"], function(require) {
    require("b")();
    var d = require("d");
    var c = require('c');
    c();
    d();
});

require.ensure(['e'], function (require) {
   require('f')();
});
```
对于这个example.js文件来说,有两个切割点,所以这份代码将被切割为3份,也就是说,到时候有三个文件:
output.js, 1.output.js, 2.output.js

这里有两个关键问题:

1. 如何做到加载了output.js之后会自动加载1.output.js和2.output.js? → jsonp
2. 三个output.js应该各自包含哪些代码?也就是说,整个项目一共包含example和a~f共7个模块的代码,
  这7个模块应该如何分布到这三个文件中?总不能都挤在一块吧,所以这里需要一定的算法。

我们来重点看第二个问题。

# module与chunk
我在刚刚开始使用webpack的时候,傻傻分不清这两个概念。现在我可以说:
上面提到的例子中,有3个chunk(分别是output.js,1.output.js和2.output.js),有7个module(分别是example和a~f)。

所以,他们之间的关系是:一个chunk包含若干个module,但同一个module不能重复被不同chunk包含(避免代码冗余)。

观察上面的例子,得出以下结论:
1. chunk0(也就是主chunk,也就是output.js)应该包含example.js本身以及a、b共三个模块。
2. chunk1(1.output.js)是从chunk0中切割出来的,所以chunk0是chunk1的parent。
3. 本来chunk1应该包含c,b,d是三个module的,但是由于c已经被其父chunk所包含,所以,应该将c从chunk1中移除。
4. chunk2(2.output.js)是从chunk0中切割出来的,所以chunk0是chunk2的parent。
5. chunk2包含e、f两个module

所以,最终构建出来的depTree大概如下:

至此,我们已经大概确定了要实现的数据结构。下面就只剩下两个问题了。
1. 如何实现构造这样的数据结构?
2. 如何根据这样的数据结构拼接三个output.js文件?

对于第一个问题,其大概的算法流程如下:
1. 识别处理require.ensure
2. 根据各个已经处理好的module信息,构建出三个chunk

我们一步一步来。

# 识别与处理require.ensure
如何识别出require.ensure呢?自然是使用强大的esprima解析工具了。关键代码如下:
```js
// parse.js

if (expression.callee && expression.callee.type === 'MemberExpression'
    && expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'require'
    && expression.callee.property.type === 'Identifier' && expression.callee.property.name === 'ensure'
    && expression.arguments && expression.arguments.length >= 1) {

    // 处理require.ensure的依赖参数部分
    let param = parseStringArray(expression.arguments[0])
    let newModule = {
        requires: [],
        namesRange: expression.arguments[0].range
    };
    param.forEach(module => {
        newModule.requires.push({
            name: module
        });
    });

    module.asyncs = module.asyncs || [];
    module.asyncs.push(newModule);

    module = newModule;

    // 处理require.ensure的函数体部分
    if(expression.arguments.length > 1) {
        walkExpression(module, expression.arguments[1]);
    }
}
```
因此,对于module来说,require会被写到requires属性中,require.ensure会被写到asyncs属性中。举个例子,下面是example.js最终解析的结果。
```json
{
  "requires": [
    {
      "name": "a",
      "nameRange": [
        16,
        19
      ]
    },
    {
      "name": "b",
      "nameRange": [
        38,
        41
      ]
    }
  ],
  "asyncs": [
    {
      "requires": [
        {
          "name": "c"
        },
        {
          "name": "b",
          "nameRange": [
            103,
            106
          ]
        },
        {
          "name": "d",
          "nameRange": [
            131,
            134
          ]
        },
        {
          "name": "c",
          "nameRange": [
            157,
            160
          ]
        }
      ],
      "namesRange": [
        64,
        69
      ]
    },
    {
      "requires": [
        {
          "name": "e"
        },
        {
          "name": "f",
          "nameRange": [
            240,
            243
          ]
        }
      ],
      "namesRange": [
        201,
        206
      ]
    }
  ],
  "source": "var a = require(\"a\");\nvar b = require(\"b\");\na();\nrequire.ensure([\"c\"], function(require) {\n    require(\"b\")();\n    var d = require(\"d\");\n    var c = require('c');\n    c();\n    d();\n});\n\nrequire.ensure(['e'], function (require) {\n   require('f')();\n});"
}
```
由此数据结构我们可以看到:

1. example依赖于a和b
2. example有两个require.ensure
3. 第一个require.ensure包含三个require,分别是c,b,d;
4. 第二个require.ensure包含两个require,分别是e、f

# chunks的构建
完成了各个模块的require和require.ensure的处理,我们将得到如下的数据结构:
给出build之前的数据结构
(缺图)

我们想要从中整理出的chunks结构如下:
(缺图)

然而,这样的chunks还不能满足要求。我们在上面提到过,需要将那些属于parent-chunk的module移除出去。
在这个例子中,本来module b(id是2)属于chunk1,但是由于module b 已经被chunk1的父chunk(chunk0)包含了,所以需要将module b移除。
关键代码如下:
```js
function removeParentsModules(depTree, chunk) {
    if (!chunk.parents) return depTree;
    for (let moduleId in chunk.modules) {
        if (!chunk.modules.hasOwnProperty(moduleId)) continue;
        chunk.parents.forEach(parentId => {
            if (depTree.chunks[parentId].modules[moduleId]) {
                chunk.modules[moduleId] = 'in-parent';
            }
        })
    }
    return depTree;
}
```
最终整理出来的chunks的数据结构如下图所示:
//缺图

至此,经历千辛万苦,我们终于得到了chunks,下面就是最后一步了:拼接几个output.js

# 由chunks拼接处三个output.js
这一步无非是一些循环与判断,具体的逻辑可以自己看代码。
这里说一个比较精彩的地方,那就是模块名替换为模块id的算法。

