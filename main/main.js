let path=require('path');
let fs=require('fs');
const { parse } = require('path');
class Compiler{
    constructor(config){
        this.config=config;
        this.entryId;
        this.entry=config.entry.index;
        this.root=process.cwd()
    }
    getSource(modulePath){
        let content=fs.readFileSync(modulePath);
        return content
    }
    buildModule(modulePath,isEntry){
        let source=this.getSource(modulePath)
        let moduleName='./'+path.relative(this.root,modulePath)
        if(isEntry){
            this.entryId=moduleName;
        }
        let {sourceCode,dependencies}=this.parse(source,path.dirname(moduleName))
        this.modules[moduleName]=sourceCode
    }
    run(){
        this.buildModule(path.resolve(this.root,this.entry),true)
    }
}
module.exports=Compiler