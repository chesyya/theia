# 推荐插件接口使用说明

## 功能概述

现在可以通过配置接口 URL 来动态获取推荐插件列表，而不是在代码中写死。系统会在页面刷新时自动从接口获取推荐插件列表。

## 配置方法

### 方式 1: 通过 settings.json 配置

在用户或工作区的 `settings.json` 中添加配置：

```json
{
  "extensions.recommendedApiUrl": "https://your-api-server.com/api/recommended-extensions"
}
```

### 方式 2: 通过 UI 设置

1. 打开设置页面（File > Preferences > Settings）
2. 搜索 `extensions.recommendedApiUrl`
3. 输入接口 URL

## 接口要求

### 请求格式

- **方法**: GET
- **Headers**:
  ```
  Accept: application/json
  Content-Type: application/json
  ```

### 响应格式

接口需要返回以下 JSON 格式的数据：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "eamodio.gitlens"
  ],
  "unwantedRecommendations": [
    "old.deprecated-extension"
  ]
}
```

**字段说明**：

- `recommendations` (必填): 推荐插件 ID 列表，格式为 `publisher.extensionName`
- `unwantedRecommendations` (可选): 不推荐的插件 ID 列表

## 工作原理

### 初始化顺序

根据优化后的代码，插件初始化顺序为：

1. **已安装插件** 优先初始化（避免数据冲突）
2. **搜索结果和推荐列表** 并行初始化

### 推荐列表数据来源

推荐列表会从以下来源合并数据（按优先级）：

1. **配置文件** (`.vscode/extensions.json`):
   ```json
   {
     "recommendations": ["extension1", "extension2"],
     "unwantedRecommendations": ["old-extension"]
   }
   ```

2. **接口数据** (配置的 `extensions.recommendedApiUrl`):
   - 页面刷新时自动调用
   - 与配置文件数据合并

3. **默认推荐** (代码中的 defaultValue):
   - 如果上述来源都没有数据，使用默认推荐列表

### 数据合并规则

- 所有来源的推荐插件会合并到一起（去重）
- 如果已安装，推荐列表中会自动过滤掉
- `unwantedRecommendations` 会从最终列表中移除

## 接口示例

### 示例 1: Node.js/Express 接口

```javascript
app.get('/api/recommended-extensions', (req, res) => {
  res.json({
    recommendations: [
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'eamodio.gitlens'
    ],
    unwantedRecommendations: []
  });
});
```

### 示例 2: Spring Boot 接口

```java
@GetMapping("/api/recommended-extensions")
public Map<String, Object> getRecommendedExtensions() {
    Map<String, Object> response = new HashMap<>();
    response.put("recommendations", Arrays.asList(
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "eamodio.gitlens"
    ));
    response.put("unwantedRecommendations", Collections.emptyList());
    return response;
}
```

### 示例 3: Python/Flask 接口

```python
@app.route('/api/recommended-extensions')
def get_recommended_extensions():
    return jsonify({
        'recommendations': [
            'dbaeumer.vscode-eslint',
            'esbenp.prettier-vscode',
            'eamodio.gitlens'
        ],
        'unwantedRecommendations': []
    })
```

## 错误处理

- 如果接口 URL 未配置，系统会打印警告日志，使用配置文件中的推荐列表
- 如果接口调用失败，系统会打印错误日志，继续使用配置文件中的推荐列表
- 即使接口失败，不会影响其他功能的正常使用

## 调试

查看控制台日志，可以看到以下信息：

```
[VSXRecommendedApi] 从接口获取推荐插件列表: https://your-api-server.com/api/recommended-extensions
[VSXRecommendedApi] 成功获取 3 个推荐插件
```

或错误日志：

```
[VSXRecommendedApi] 推荐插件接口 URL 未配置，返回空列表
[VSXRecommendedApi] 获取推荐插件列表失败: Error: ...
[VSXExtensionsModel] 从接口获取推荐插件失败: Error: ...
```

## 注意事项

1. **接口性能**: 接口会在页面刷新时调用，建议接口响应时间控制在 1-2 秒内
2. **缓存策略**: 如需缓存，可以在接口服务端实现
3. **安全性**: 如果接口需要认证，可以在 `VSXRecommendedApiServiceImpl` 中添加认证逻辑
4. **数据优先级**: 本地已安装插件的数据优先于接口数据，避免数据不一致

## 相关文件

- 接口定义: `/packages/vsx-registry/src/common/vsx-recommended-api.ts`
- 接口实现: `/packages/vsx-registry/src/browser/vsx-recommended-api-impl.ts`
- 数据模型: `/packages/vsx-registry/src/browser/vsx-extensions-model.ts`
- 配置项: `/packages/vsx-registry/src/browser/vsx-extensions-preferences.ts`
