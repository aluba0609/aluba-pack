let path=require('path');
let fs=require('fs');
let babylon = require('babylon');
let traverse = require('@babel/traverse').default;
let t = require('@babel/types');
let generator = require('@babel/generator').default;
let ejs=require('ejs')

class Compiler{
    constructor(config){
        this.config=config;
        this.entryId;
        this.entry=config.entry.index;
        this.modules={};
        this.root=process.cwd()
    }
    getSource(modulePath){
        let content=fs.readFileSync(modulePath,'utf8');
        return content
    }
    parse(source,parentPath){
        let ast=babylon.parse(source)
        let dependencies=[];
        traverse(ast,{
            CallExpression(p){
                let node = p.node;
                if(node.callee.name ==='require'){
                    node.callee.name='__webpack_require__';
                    let moduleName = node.arguments[0].value;
                    moduleName=moduleName+(path.extname(moduleName)?'':'.js');
                    moduleName='./'+path.join(parentPath,moduleName);
                    dependencies.push(moduleName);
                    node.arguments=[t.stringLiteral(moduleName)]
                    // console.log('+++++++++++++',node.arguments)
                }
                
            }
        })
        let sourceCode=generator(ast).code;
        console.log('+++++++++++++',sourceCode)
        return{sourceCode,dependencies}
    }
    buildModule(modulePath,isEntry){
        let source=this.getSource(modulePath)
        let moduleName='./'+path.relative(this.root,modulePath)
        if(isEntry){
            this.entryId=moduleName;
        }
        let {sourceCode,dependencies}=this.parse(source,path.dirname(moduleName))
        this.modules[moduleName]=sourceCode
        dependencies.forEach((dep)=>{
            // console.log(path.join(this.root,dep))
            this.buildModule(path.join(this.root,dep),false)
        })
        // console.log(this.modules)
    }
    emitFile(){
        let main=path.join(this.config.output.path,this.config.output.filename)

        let templateEjs=this.getSource(path.join(__dirname,'main.ejs'));
        let code = ejs.render(templateEjs,{entryId:this.entryId,modules:this.modules});
        this.assets={};
        this.assets[main]=code;
        fs.writeFileSync(main,this.assets[main])
    }
    run(){
        this.buildModule(path.resolve(this.root,this.entry),true)
        this.emitFile()
    }
}
module.exports=Compiler