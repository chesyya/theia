/**
 * This file can be edited to customize webpack configuration.
 * To reset delete this file and rerun theia build again.
 */
// @ts-check
const path = require('path');
const configs = require('./gen-webpack.config.js');
const nodeConfig = require('./gen-webpack.node.config.js');

/**
 * Expose bundled modules on window.theia.moduleName namespace, e.g.
 * window['theia']['@theia/core/lib/common/uri'].
 * Such syntax can be used by external code, for instance, for testing.
 */
configs[0].module.rules.push({
    test: /\.js$/,
    loader: require.resolve('@theia/application-manager/lib/expose-loader')
});

// ⭐ 启用持久化文件系统缓存 - 可加速构建5-20倍
configs.forEach(config => {
    // Webpack 5 持久化缓存配置
    config.cache = {
        type: 'filesystem',
        // 缓存目录设置在monorepo根目录，所有examples共享
        cacheDirectory: path.resolve(__dirname, '../../node_modules/.cache/webpack'),
        buildDependencies: {
            // 当webpack配置文件改变时，自动失效缓存
            config: [__filename, path.resolve(__dirname, 'gen-webpack.config.js')]
        },
        // 未使用的缓存条目保留30天
        maxAge: 1000 * 60 * 60 * 24 * 30,
        // 缓存名称，避免不同配置冲突
        name: config.name || 'default'
    };

    // Watch模式优化（防止卡死）
    if (!config.watchOptions) {
        config.watchOptions = {};
    }
    config.watchOptions = {
        ...config.watchOptions,
        // 忽略node_modules，减少监听文件数
        ignored: /node_modules/,
        // 文件变化后等待300ms再构建（防抖）
        aggregateTimeout: 300,
        // 不使用轮询（除非文件监听不工作）
        poll: false,
    };

    // 开发模式性能优化
    if (config.mode === 'development') {
        config.optimization = {
            ...config.optimization,
            // 跳过某些优化步骤以加快构建
            removeAvailableModules: false,
            removeEmptyChunks: false,
            splitChunks: false,
        };
    }
});

module.exports = [
    ...configs,
    nodeConfig.config
];
