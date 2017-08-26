# 前言
最近研究了一番 HTTPS，网上已有很多写得不错的文章，我也不想再赘述。所以就想，不如就直接画图吧。

# 图解
此处缺很多图

# 误区
我在研究这个主题的时候，觉得有几个点特别容易误解：

1. "公钥是用来加密的，私钥是用来解密的。"这句话是没错，但是并没有指出问题的全部。公钥和私钥不是以谁加密谁解密来区分的，是以谁公开，谁不公开为区分的。
另外，公钥和私钥，都可以用来加密和解密，不过他们是对应关系而已。同一对钥匙，公钥加密只能私钥解密，私钥加密只能公钥解密。那为什么人们常说"公钥加密，私钥解密"呢？
因为在实际应用中，一般都不会用私钥进行加密，为什么？因为公钥是公开的呀！用私钥加密的话，大家都知道，这不跟没加密一个样嘛。
2. 证书与证书中心。人们常说："要想与某域名进行 HTTPS 通信，就得安装域名对应的证书"，其实这是个误解。我们安装到电脑上的是证书中心，某域名对应的证书是每次都在网络上进行传输的，
本地安装的证书中心的作用是为了解密通过网络得到的证书，且判断其是否被伪造和修改。

# 参考资料：
先后顺序有点重要

1. [关于互联网流量劫持分析及可选的解决方案](https://my.oschina.net/leejun2005/blog/614612), By xrzs
1. [密码学笔记](http://www.ruanyifeng.com/blog/2006/12/notes_on_cryptography.html), By 阮一峰
2. [对称加密算法 VS 非对称加密算法](http://blog.loveyoung.me/2016/02/19/%E7%99%BD%E8%AF%9D%E8%A7%A3%E9%87%8A-%E5%AF%B9%E7%A7%B0%E5%8A%A0%E5%AF%86%E7%AE%97%E6%B3%95-%E9%9D%9E%E5%AF%B9%E7%A7%B0%E5%8A%A0%E5%AF%86%E7%AE%97%E6%B3%95.html), By loveyoung
3. [密码技术系列 Part 1 - 对称加密](http://bignerdcoding.com/archives/31.html), By BigNerdCoding
4. [如何用通俗易懂的话来解释非对称加密](https://www.zhihu.com/question/33645891/answer/192604856), By ThreatHunter
4. [XOR 加密简介](http://www.ruanyifeng.com/blog/2017/05/xor.html), By 阮一峰
5. [RSA算法原理（一）](http://www.ruanyifeng.com/blog/2013/06/rsa_algorithm_part_one.html), By 阮一峰
6. [RSA算法原理（二）](http://www.ruanyifeng.com/blog/2013/07/rsa_algorithm_part_two.html), By 阮一峰
7. [数字签名是什么？](http://www.ruanyifeng.com/blog/2011/08/what_is_a_digital_signature.html), By 阮一峰
7. [看完还不懂HTTPS我直播吃翔](http://blog.csdn.net/winwill2012/article/details/71774469), By winwill2012
8. [关于HTTPS，你需要知道的全部](http://www.jianshu.com/p/fb6035dbaf8b), By rushjs
12. [深入HTTPS系列一（HTTP&HTTPS）](http://www.jianshu.com/p/a677fecec927), By muice
10. [HTTPS为什么安全 &分析 HTTPS 连接建立全过程](http://www.jianshu.com/p/0d8575b132a8), By kaitoulee
9. [SSL/TLS协议运行机制的概述](http://www.ruanyifeng.com/blog/2014/02/ssl_tls.html), By 阮一峰
11. [浅谈Charles抓取HTTPS原理](http://www.jianshu.com/p/405f9d76f8c4), By rushjs
13. [Nodejs创建HTTPS服务器](http://blog.fens.me/nodejs-https-server/), By 张丹