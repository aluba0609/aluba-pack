let fs = require('fs');
let path = require('path');
class Compiler{
    constructor(config){
        //entry output
        this.config=config
        //需要保存入口文件的路径
        this.entryId;//'./src/index.js'
        //需要保存所有的模块依赖
        this.modules = {};
        this.entry = config.entry;//入口路径
        this.root = process.cwd();//工作路径(npx 时候的路径)
    }
    getSource(){
        let content = fs.readFileSync(modulePath,'utf8');
        return content
    }
    //解析源码
    parse(source,parentPath){
        console.log(source,parentPath)
    }
    buildModule(modulePath,isEntry){
        //拿到模块的内容
        let source= this.getSource(modulePath)
        //模块id modulePath = modulePath-this.root
        let moduleName='./'+path.relative(this.root,modulePath);//获取相对路径 src/index.js
        console.log(source,moduleName);

        if(isEntry){
            this.entryId = moduleName;//保存入口的名字
        }
        //解析需要把source源码进行改造 返回一个依赖列表
        let {sourceCode,dependencies}=this.parse(source,path.dirname(modulePath)) // ./src
        //把相对路径和模块中的内容 对应起来
        this.modules[moduleName]=sourceCode
    }
    emitFile(){//发射文件

    }
    run(){console.log(process.cwd())
        //执行 并且创建模块的依赖关系
        this.buildModule(path.resolve(this.root,this.entry),true);
        
        //发射一个文件 打包的文件
        this.emitFile();
    }
}
module.exports=Compiler