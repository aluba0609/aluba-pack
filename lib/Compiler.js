let fs = require('fs');
let path = require('path');
let babylon=require('babylon')
let traverse=require('@babel/traverse').default
let t=require('@babel/types')
let generator=require('@babel/generator').default
let ejs=require('ejs');
let {SyncHook}=require('tapable')
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
        this.hooks={
            entryOption:new SyncHook(),
            compile:new SyncHook(),
            afterCompile:new SyncHook(),
            afterPlugin:new SyncHook(),
            run:new SyncHook(),
            emit:new SyncHook(),
            done:new SyncHook(),
        }
        //如果传递了plugins参数
        let plugins= this.config.plugins;
        if(Array.isArray(plugins)){
            plugins.forEach(plugin=>{
                plugin.apply(this)
            })
        }
        this.hooks.afterPlugin.call()
    }
    getSource(modulePath){
        // console.log("modulePath:",modulePath)
        let content = fs.readFileSync(modulePath,'utf8');
        let rules =this.config.module.rules;
        for(let i=0;i<rules.length;i++){//拿到每个规则来处理
            let rule=rules[i];
            let{test,use}=rule;
            // console.log(test,modulePath)
            let len=use.length-1
            if(test.test(modulePath)){//这个模块需要通过loader来转化
                function normalLoader(){
                    let loader=require(use[len--]);//loader获取对应的loader函数
                    content=loader(content)
                    if(len>=0){//递归调用loader 实现转化功能
                        normalLoader()
                        // console.log(content)
                    }
                }
                normalLoader()
            }
        }
        return content
    }
    //解析源码
    parse(source,parentPath){
        console.log("source:",source)

        let ast=babylon.parse(source)
        // console.log("ast:",ast)
        let dependencies=[];//依赖的数组
        traverse(ast,{
            CallExpression(p){//require()或者其他调用
                debugger
                let node=p.node//对应的节点
                // console.info(node)
                if(node.callee.name=='require'){
                    node.callee.name='__webpack_require__';
                    let moduleName=node.arguments[0].value;//取到的就是模块的引用名字 './index'
                    // console.log(moduleName)
                    moduleName=moduleName+(path.extname(moduleName)?'':'.js')//  ./index.js
                    // console.log(path.extname(moduleName))
                    moduleName = './'+path.join(parentPath,moduleName)//./src/index.js
                    dependencies.push(moduleName)
                    // console.log(dependencies)
                    // console.log(t.stringLiteral(moduleName))
                    // console.log(node.arguments)
                    node.arguments=[t.stringLiteral(moduleName)]
                    // console.log(node.arguments)
                }
            }
        })
        // console.log('traverse',ast)
        let sourceCode=generator(ast).code
        // console.log(generator(ast))
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
        this.hooks.run.call();
        this.hooks.compile.call();

        //执行 并且创建模块的依赖关系
        this.buildModule(path.resolve(this.root,this.entry),true);
        this.hooks.afterCompile.call();

        // console.log('this.modules,this.entryId:',this.modules,this.entryId)
        //发射一个文件 打包的文件
        this.emitFile();
        this.hooks.emit.call();
        this.hooks.done.call();

    }
}
module.exports=Compiler