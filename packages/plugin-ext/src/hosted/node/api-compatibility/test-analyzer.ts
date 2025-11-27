// *****************************************************************************
// 测试 API 提取器
// *****************************************************************************

import { TsMorphApiExtractor } from './api-extractor-ts-morph';
import * as path from 'path';

async function main() {
    const pluginPath = process.argv[2] || '/root/theia/plugins/simple-demo';

    console.log('🔍 使用 ts-morph API 提取器分析插件...\n');
    console.log(`插件路径: ${pluginPath}\n`);
    console.log('='.repeat(60));

    try {
        const extractor = new TsMorphApiExtractor();

        // 提取 API
        const metadata = await extractor.extractApis(pluginPath);

        console.log('\n✅ 分析完成！\n');
        console.log('='.repeat(60));
        console.log('\n📊 分析结果:\n');

        // 基本信息
        console.log(`插件 ID: ${metadata.pluginId}`);
        console.log(`插件版本: ${metadata.pluginVersion}`);
        console.log(`分析文件数: ${metadata.analyzedFiles.length}`);
        console.log(`找到的 API 数量: ${metadata.apis.length}\n`);

        // API 列表
        console.log('📦 使用的 API:');
        for (const api of metadata.apis) {
            console.log(`  • ${api}`);
        }

        // 详细信息
        console.log('\n📋 详细使用信息:\n');
        for (const api of metadata.apis) {
            const details = metadata.apiUsageDetails[api];
            console.log(`  ${api}:`);
            console.log(`    导入方式: ${details.importTypes.join(', ')}`);

            if (details.members.length > 0) {
                console.log(`    访问的成员: ${details.members.join(', ')}`);
            } else {
                console.log(`    访问的成员: (无)`);
            }

            if (details.aliases.length > 0) {
                console.log(`    别名: ${details.aliases.join(', ')}`);
            }

            console.log(`    使用次数: ${details.usageCount}`);
            console.log('');
        }

        // 分析的文件
        console.log('📁 分析的文件:');
        for (const file of metadata.analyzedFiles) {
            console.log(`  • ${file}`);
        }

        // 保存为 JSON
        const outputPath = path.join(pluginPath, 'api-metadata.json');
        await extractor.exportToJson(metadata, outputPath);

        console.log(`\n💾 元数据已保存到: ${outputPath}`);

        // 清理
        extractor.cleanup();

    } catch (error) {
        console.error('❌ 错误:', error);
        process.exit(1);
    }
}

main();
