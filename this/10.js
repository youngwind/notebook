/**
 * Created by youngwind on 2016/10/20.
 */

function foo(something) {
    console.log(this.a, something);
    return this.a + something;
}

var obj = {
    a: 2
};

var bar = foo.bind(obj);

var b = bar(3);
console.log(b);