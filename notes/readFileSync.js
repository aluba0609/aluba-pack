let fs=require('fs')
let path='D:/项目/vue/git/webpack/src/index.js'
let content=fs.readFileSync(path,'utf8')//反斜杠会报错
console.log(content)