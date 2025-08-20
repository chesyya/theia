#!/usr/bin/env node

// 验证授权状态显示修复
// 这个脚本检查我们的修复是否正确：
// 1. 未授权插件应该显示像disabled一样的样式但文字为'未授权'
// 2. 移除了'checking authorization...'显示

const fs = require('fs');
const path = require('path');

console.log('🔍 验证授权显示修复...');

// 检查vsx-extension.tsx修改
const extensionFile = '/root/theia/packages/vsx-registry/src/browser/vsx-extension.tsx';
const extensionContent = fs.readFileSync(extensionFile, 'utf8');

console.log('\n✅ 检查未授权插件显示修复:');

// 检查未授权插件使用disabled样式但显示'unauthorized'文字
if (extensionContent.includes("{authorized === false && <span className='disabled'>({nls.localize('theia/vsx-registry/unauthorized', 'unauthorized')})</span>}")) {
    console.log('✅ 未授权插件正确使用disabled样式显示"unauthorized"');
} else {
    console.log('❌ 未授权插件显示不正确');
}

// 检查移除了checking authorization显示
if (!extensionContent.includes('checking authorization') && !extensionContent.includes('checking-auth')) {
    console.log('✅ 已移除"checking authorization..."显示');
} else {
    console.log('❌ 仍然包含"checking authorization..."显示');
}

// 检查简化的render方法
if (extensionContent.includes("const className = `theia-vsx-extension noselect`;") && 
    !extensionContent.includes('statusClass') && 
    !extensionContent.includes('authorizationState === \'pending\'')) {
    console.log('✅ render方法已简化，移除复杂的状态类逻辑');
} else {
    console.log('❌ render方法仍然包含复杂的状态类逻辑');
}

// 检查CSS修改
const cssFile = '/root/theia/packages/vsx-registry/src/browser/style/index.css';
const cssContent = fs.readFileSync(cssFile, 'utf8');

console.log('\n✅ 检查CSS样式修复:');

// 检查移除了复杂的未授权样式
if (!cssContent.includes('.theia-vsx-extension.unauthorized') && 
    !cssContent.includes('auth-pending') && 
    !cssContent.includes('unauthorized-indicator')) {
    console.log('✅ 已移除复杂的未授权样式，使用原生disabled样式');
} else {
    console.log('❌ 仍然包含复杂的未授权样式');
}

// 检查保留了基本的disabled样式
if (cssContent.includes('.theia-vsx-extension-content .disabled')) {
    console.log('✅ 保留了原生disabled样式');
} else {
    console.log('❌ 缺少原生disabled样式');
}

console.log('\n🎯 修复验证总结:');
console.log('1. 未授权插件现在使用和disabled相同的样式');
console.log('2. 显示文字为"unauthorized"而不是"disabled"');
console.log('3. 移除了"checking authorization..."显示');
console.log('4. 简化了代码，移除了复杂的CSS类和样式');

console.log('\n📋 测试状态:');
console.log('- test-plugin应该显示为未授权状态');
console.log('- 在VSX Registry的Builtin部分应该可以看到');
console.log('- 显示样式应该和disabled插件相同但标记为"unauthorized"');