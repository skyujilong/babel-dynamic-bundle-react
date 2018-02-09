'use strict';
let babel = require('babel-core');
import template from "babel-types";
let pluginParseImport = require('babel-plugin-syntax-dynamic-import');

let code = `
    import dynamic from '../dynamic/fn';
    let test = "hello world";
    let Demo = dynamic(import(
        //hello commnet
        /* webpackChunkName: "dynamic" */'./dynamic.jsx'/*瑟2*/), 'dynamic');
    function a(){}
    a();
`;
const inspect = require('util').inspect;
const path = require('path');
const fs = require("fs");

const TYPE_IMPORT = 'Import';
//webpack包名 正则匹配
const chunkNameReg = /webpackChunkName\:\s*"([^"]+)"/;

const buildImport = template(`
  (new Promise((resolve) => {
    require.ensure([], (require) => {
      resolve(require(SOURCE));
    });
  }))
`);

let codeResult = babel.transform(code, {
    plugins: [pluginParseImport, {
        visitor: {
            Identifier(path) {
                // console.log(path.node.name);
            },
            Import(path) {
                // console.log('xxxx');
                // console.log(path);
                // console.log(path.node.name);
            },
            ImportDeclaration(path) {
                // console.log(path);
            },
            ImportDeclaration(path) {
                // console.log(path.container);
            },
            CallExpression(p, state) {
                if (p.node.callee.type === TYPE_IMPORT) {
                    // console.log(path);
                    // console.log(path.container);
                    // console.log(path.container[0].arguments);
                    // console.log(path.node.arguments[0]);
                    // console.log(path.node.arguments);
                    // console.log(state.file.opts.filename);
                    fs.writeFile(path.resolve(__dirname, './node.json'), inspect(p.node), function (err) {
                        console.log('write done');
                    });
                    
                    //获取 注释的value值
                    let webpackChunkName = '';
                    if (p.node.arguments[0].leadingComments && p.node.arguments[0].leadingComments > 0) {
                        for (let comment of p.node.arguments[0].leadingComments) {
                            //是 /* */的 要求符合webpack的 webpackChunkName的注释标准
                            if (comment.type !== 'CommentBlock') {
                                let {
                                    value
                                } = comment;
                                webpackChunkName = chunkNameReg.exec(value);
                            }
                        }
                    }
                    console.log(webpackChunkName);
                    console.log(p.node.arguments);
                    
                }

                const newImport = buildImport({
                    SOURCE: p.parentPath.node.arguments,
                });
                p.parentPath.replaceWith(newImport);
            }

        }
    }]
})

console.log(codeResult.code);