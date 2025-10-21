/**
 * 前端插件包装器
 * Theia 前端插件需要将导出放到全局变量中
 * 全局变量名格式: publisher_pluginname
 */

// 加载编译后的前端模块
const frontendModule = require('./frontend');

// 将模块导出到全局变量
// Theia 会通过 frontendModuleName (theia_simple_demo) 来访问
if (typeof self !== 'undefined') {
    self['theia_simple_demo'] = frontendModule;
} else if (typeof window !== 'undefined') {
    window['theia_simple_demo'] = frontendModule;
} else if (typeof global !== 'undefined') {
    global['theia_simple_demo'] = frontendModule;
}
