/**
 * Created by youngwind on 2016/10/20.
 */

// 严格模式下运行foo, this默认绑定到undefined
function foo(){
    "use strict";
    console.log(this.a);
}

var a = 2;
foo();


