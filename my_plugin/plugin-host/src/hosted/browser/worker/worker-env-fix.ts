//设置worker环境下process的polyfill
/* eslint-disable @typescript-eslint/no-explicit-any */
const globalSelf = self as any;

if (typeof globalSelf.process === 'undefined') {
    globalSelf.process = {
        browser: true, //保证使用浏览器环境的crypto
        env: {},
        version: '0.0.1',
        versions: {},
        nextTick: (fn: Function, ...args: any[]) => {
            setTimeout(() => fn(...args), 0);
        }
    };
}

//尝试拦截crypto模块
if (typeof globalSelf.crypto === 'undefined' && typeof self.crypto !== 'undefined') {
    globalSelf.crypto = self.crypto;
}
