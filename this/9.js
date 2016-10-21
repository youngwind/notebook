/**
 * Created by youngwind on 2016/10/20.
 */


function foo() {
    console.log(this.a);
}

var obj = {
    a: 2
};

foo.call(obj);