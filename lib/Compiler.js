let fs = require('fs');
let path = require('path');
let babylon=require('babylon')
let traverse=require('@babel/traverse').default
let t=require('@babel/types')
let generator=require('@babel/generator').default
let ejs=require('ejs');
//babylon  主要就是把源码 转换成ast
//@babel/traverse 便利节点
//@babel/types 替换 便利后的节点
//@babel/generator 替换后的节点 生成
class Compiler{
    constructor(config){
        //entry output
        this.config=config
        //需要保存入口文件的路径
        this.entryId;//'./src/index.js'
        //需要保存所有的模块依赖
        this.modules = {};
        this.entry = config.entry.index;//入口路径
        this.root = process.cwd();//工作路径(npx 时候的路径)
    }
    getSource(modulePath){
        // console.log("modulePath:",modulePath)
        let content = fs.readFileSync(modulePath,'utf8');
        return content
    }
    //解析源码
    parse(source,parentPath){
        let ast=babylon.parse(source)
        let dependencies=[];//依赖的数组
        traverse(ast,{
            CallExpression(p){//require()或者其他调用
                let node=p.node//对应的节点
                if(node.callee.name=='require'){
                    node.callee.name='__webpack_require__';
                    let moduleName=node.arguments[0].value;//取到的就是模块的引用名字 './index'
                    moduleName=moduleName+(path.extname(moduleName)?'':'.js')//  ./index.js
                    moduleName = './'+path.join(parentPath,moduleName)//./src/index.js
                    dependencies.push(moduleName)
                    node.arguments=[t.stringLiteral(moduleName)]
                }
            }
        })
        let sourceCode=generator(ast).code
        return {sourceCode,dependencies}
    }
    buildModule(modulePath,isEntry){
        //拿到模块的内容
        let source= this.getSource(modulePath)
        // console.log("source:",source)

        //模块id moduleName = modulePath-this.root
        let moduleName='./'+path.relative(this.root,modulePath);//获取相对路径 src/index.js
        // console.log("moduleName:",moduleName)
        
        if(isEntry){
            this.entryId = moduleName;//保存入口的名字
        }
        //解析需要把source源码进行改造 返回一个依赖列表
        let {sourceCode,dependencies}=this.parse(source,path.dirname(moduleName)) // ./src
        // console.log('sourceCode,dependencies:',sourceCode,dependencies)
        //把相对路径和模块中的内容 对应起来
        this.modules[moduleName]=sourceCode;

        dependencies.forEach(dep=>{//附模块的加载 递归加载
            this.buildModule(path.join(this.root,dep),false)
        })
    }
    emitFile(){//发射文件
        //用数据渲染我们的
        //拿到 输出到哪个目录下 
        let main=path.join(this.config.output.path,this.config.output.filename);//输出路径
        let templateStr=this.getSource(path.join(__dirname,'main.ejs'));//模板路径
        let code=ejs.render(templateStr,{entryId:this.entryId,modules:this.modules})
        this.assets={};
        //资源中 路径对应的代码
        this.assets[main]=code;
        fs.writeFileSync(main,this.assets[main])
    }
    run(){
        //执行 并且创建模块的依赖关系
        this.buildModule(path.resolve(this.root,this.entry),true);
        // console.log('this.modules,this.entryId:',this.modules,this.entryId)
        //发射一个文件 打包的文件
        this.emitFile();
    }
}
module.exports=Compiler