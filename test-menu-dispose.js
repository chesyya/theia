// 测试脚本：验证 registerSubmenu 返回的 Disposable 是否有效
// 这个脚本应该在浏览器控制台中运行

console.log('=== 测试 registerSubmenu Disposable ===');

// 获取 MenuModelRegistry
const menuRegistry = window['theia'].container.get(Symbol.for('MenuModelRegistry'));
const MAIN_MENU_BAR = ['menubar'];

// 测试 1: 第一次注册应该返回真正的 Disposable
const testMenuPath = [...MAIN_MENU_BAR, 'test-menu-' + Date.now()];
console.log('测试路径:', testMenuPath);

const disposable1 = menuRegistry.registerSubmenu(testMenuPath, 'Test Menu');
console.log('第一次注册返回的 disposable:', disposable1);
console.log('是否是 Disposable.NULL?', disposable1 === menuRegistry.constructor.Disposable?.NULL);

// 检查菜单是否存在
const menu1 = menuRegistry.getMenu(MAIN_MENU_BAR);
const testNode1 = menu1.children.find(c => c.id === testMenuPath[1]);
console.log('注册后菜单节点存在?', !!testNode1);
console.log('菜单节点 label:', testNode1?.label);

// Dispose
disposable1.dispose();

// 检查菜单是否被删除
const menu2 = menuRegistry.getMenu(MAIN_MENU_BAR);
const testNode2 = menu2.children.find(c => c.id === testMenuPath[1]);
console.log('Dispose 后菜单节点存在?', !!testNode2);

if (testNode2) {
    console.error('❌ 测试失败: Dispose 后菜单节点仍然存在!');
} else {
    console.log('✅ 测试成功: Dispose 后菜单节点已删除!');
}

// 测试 2: 第二次注册相同路径应该返回 Disposable.NULL
const disposable2 = menuRegistry.registerSubmenu(testMenuPath, 'Test Menu Again');
const disposable3 = menuRegistry.registerSubmenu(testMenuPath, 'Test Menu Again');
console.log('\n第二次注册同一路径，是否返回 Disposable.NULL?',
    disposable3.dispose === (() => {}) || disposable3.dispose.toString().includes('NULL'));

console.log('\n=== 测试完成 ===');
