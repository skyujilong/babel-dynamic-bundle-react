'use strict';
let babel = require('babel-core');
const template = require('babel-template');
let pluginParseImport = require('babel-plugin-syntax-dynamic-import');

const inspect = require('util').inspect;
const path = require('path');
const fs = require("fs");

const TYPE_IMPORT = 'Import';
//webpack包名 正则匹配
const chunkNameReg = /webpackChunkName\:\s*["']([^"']+)["']/;

const buildImport = (params) => template(`
    (()=>{
        let promise = '${params.webpackChunkName}' ?  
            (new Promise((resolve) => {
                require.ensure([], (require) => {
                    let m = require(SOURCE);
                    m = m.default || m;
                    resolve(m);
                }, '${params.webpackChunkName}');
            })) : 
            (new Promise((resolve) => {
                require.ensure([], (require) => {
                    let m = require(SOURCE);
                    m = m.default || m;
                    resolve(m);
                });
            }));
        promise.keyPath = '${params.sourceFilePath}';
        return promise;
    })()
`);
const fileDirReg = new RegExp(path.sep + '+' + '[^' + path.sep + ']+$');

module.exports = () => ({
    inherits: pluginParseImport,
    visitor: {
        CallExpression(p, state) {
            //相对路径继续
            if (p.node.callee.type === TYPE_IMPORT && p.node.arguments[0].value[0] === '.') {
                //获取 注释的value值
                let webpackChunkName = '';
                //获取 webpackChunkName
                if (p.node.arguments[0].leadingComments && p.node.arguments[0].leadingComments.length > 0) {
                    for (let comment of p.node.arguments[0].leadingComments) {
                        //是 /* */的 要求符合webpack的 webpackChunkName的注释标准
                        if (comment.type === 'CommentBlock' && chunkNameReg.test(comment.value)) {
                            let {
                                value
                            } = comment;
                            webpackChunkName = chunkNameReg.exec(value)[1];
                            break;
                        }
                    }
                }
                //生成路径，去除 后缀名为index.js|jsx的
                let sourceFilePath = path.resolve(state.file.opts.filename.replace(fileDirReg, ''), p.node.arguments[0].value.replace(/(index){0,1}\.(js|jsx)$/, '').replace(/[/\\]$/, ''));
                let newImport = buildImport({
                    webpackChunkName,
                    sourceFilePath
                })({
                    SOURCE: p.node.arguments
                });
                p.replaceWith(newImport);

            }
        }
    }
})
