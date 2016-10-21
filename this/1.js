/**
 * Created by youngwind on 2016/10/20.
 */

// 默认绑定: 当调用使用不带任何修饰的函数时触发,
// 所谓不带任何修饰, 包括没有"new",没有call、apply、bind,没有obj.这样的

function foo(){
    console.log(this.a);
}

var a = 2;

foo();
