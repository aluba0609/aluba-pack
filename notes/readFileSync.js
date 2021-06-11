let fs=require('fs')

// let mypath1='D:\项目\vue\git\webpack\src\index.js'
let mypath2='D:/项目/vue/git/webpack/src/index.js'
let content=fs.readFileSync(mypath2,'utf8')//反斜杠会报错
console.log('content:',content)

let path=require('path')
let dirnamepath=path.dirname(mypath2)
console.log('dirnamepath:',dirnamepath)
