// *****************************************************************************
// 测试签名基础的API兼容性分析器
// Test Signature-Based API Compatibility Analyzer
// *****************************************************************************

import {
    IdeApiDeclarationGenerator,
    PluginApiUsageExtractor,
    SignatureCompatibilityChecker
} from './signature-based-analyzer';

async function main() {
    const pluginPath = process.argv[2] || '/root/theia/plugins/simple-demo';
    const theiaPluginPath = process.argv[3]; // Optional: path to @theia/plugin package

    console.log('🔍 签名基础的API兼容性分析');
    console.log('Signature-Based API Compatibility Analysis\n');
    console.log('='.repeat(80));
    console.log(`\n插件路径 (Plugin Path): ${pluginPath}`);
    if (theiaPluginPath) {
        console.log(`Theia Plugin Path: ${theiaPluginPath}`);
    }
    console.log('\n' + '='.repeat(80));

    try {
        // Step 1: 生成 IDE API 声明
        console.log('\n📦 步骤 1: 生成 IDE API 声明 (Generating IDE API Declaration)...\n');

        const ideGenerator = new IdeApiDeclarationGenerator();
        const ideDeclaration = await ideGenerator.generateDeclaration(theiaPluginPath);
        await ideGenerator.saveDeclaration(ideDeclaration, './out.json')

        console.log(`✅ 成功生成 IDE API 声明`);
        console.log(`   - API 数量: ${Object.keys(ideDeclaration.apis).length}`);
        console.log(`   - 版本: ${ideDeclaration.version}`);
        console.log(`   - 生成时间: ${ideDeclaration.generatedAt}`);

        // 显示前10个API的详细信息
        console.log('\n   示例 API (前10个):');
        const apiNames = Object.keys(ideDeclaration.apis).slice(0, 10);
        for (const apiName of apiNames) {
            const api = ideDeclaration.apis[apiName];
            console.log(`     • ${apiName} [${api.kind}]`);
            if (api.signature) {
                const params = api.signature.parameters.map(p =>
                    `${p.name}${p.optional ? '?' : ''}: ${p.type}`
                ).join(', ');
                console.log(`       签名: (${params}) => ${api.signature.returnType}`);
            }
            if (api.methods) {
                const methodCount = Object.keys(api.methods).length;
                console.log(`       方法数: ${methodCount}`);
            }
        }

        // 不保存 IDE API 声明（不需要生成文件）

        // Step 2: 提取插件 API 使用
        console.log('\n' + '='.repeat(80));
        console.log('\n📋 步骤 2: 提取插件 API 使用 (Extracting Plugin API Usage)...\n');

        const usageExtractor = new PluginApiUsageExtractor();
        const pluginUsage = await usageExtractor.extractUsage(pluginPath);

        console.log(`✅ 成功提取插件 API 使用`);
        console.log(`   - 插件 ID: ${pluginUsage.pluginId}`);
        console.log(`   - 插件版本: ${pluginUsage.pluginVersion}`);
        console.log(`   - 使用的 API 数量: ${pluginUsage.usedApis.length}`);

        // 按 API 名称分组显示
        console.log('\n   使用的 API 列表:');
        const apiUsageMap = new Map<string, typeof pluginUsage.usedApis>();
        for (const usage of pluginUsage.usedApis) {
            const key = usage.apiName;
            if (!apiUsageMap.has(key)) {
                apiUsageMap.set(key, []);
            }
            apiUsageMap.get(key)!.push(usage);
        }

        for (const [apiName, usages] of apiUsageMap) {
            console.log(`\n     • ${apiName}:`);
            const grouped = new Map<string, typeof usages>();
            for (const usage of usages) {
                const memberKey = usage.memberPath?.join('.') || '(直接使用)';
                if (!grouped.has(memberKey)) {
                    grouped.set(memberKey, []);
                }
                grouped.get(memberKey)!.push(usage);
            }

            for (const [memberKey, memberUsages] of grouped) {
                const types = [...new Set(memberUsages.map(u => u.usageType))];
                const locations = memberUsages.flatMap(u => u.locations);
                console.log(`       - ${memberKey}`);
                console.log(`         类型: ${types.join(', ')}`);
                console.log(`         位置: ${locations.length} 个`);
                if (locations.length > 0 && locations.length <= 3) {
                    locations.forEach(loc => {
                        console.log(`           ${loc.file}:${loc.line}`);
                    });
                }
            }
        }

        // 不保存插件使用信息（不需要生成文件）

        // Step 3: 兼容性检查
        console.log('\n' + '='.repeat(80));
        console.log('\n🔍 步骤 3: 兼容性检查 (Compatibility Check)...\n');

        const checker = new SignatureCompatibilityChecker();
        const compatibilityResult = checker.checkCompatibility(pluginUsage, ideDeclaration);

        if (compatibilityResult.compatible) {
            console.log('✅ 插件与当前 IDE 完全兼容！');
        } else {
            console.log('❌ 发现不兼容问题：\n');

            // 只显示第一个错误（因为是早期退出，只会有一个）
            const issue = compatibilityResult.issues[0];
            console.log(`   API: ${issue.apiName}`);
            if (issue.memberPath && issue.memberPath.length > 0) {
                console.log(`   成员: ${issue.memberPath.join('.')}`);
            }
            console.log(`   问题: ${issue.issue}`);
            if (issue.pluginUsage?.locations && issue.pluginUsage.locations.length > 0) {
                console.log(`   位置: ${issue.pluginUsage.locations[0].file}:${issue.pluginUsage.locations[0].line}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log(`\n最终结果: ${compatibilityResult.compatible ? '✅ 兼容' : '❌ 不兼容'}`);
        console.log('='.repeat(80) + '\n');

        // 返回状态码
        process.exit(compatibilityResult.compatible ? 0 : 1);

    } catch (error) {
        console.error('\n❌ 错误:', error);
        if (error instanceof Error) {
            console.error('   消息:', error.message);
            console.error('   堆栈:', error.stack);
        }
        process.exit(1);
    }
}

main();
