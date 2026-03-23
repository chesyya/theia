# Theia Webview HTTPS 根证书导入验证步骤（Windows）

本文用于验证下面这条链路是否成立：

- 客户端执行 PowerShell 脚本
- 脚本从指定位置读取根证书文件
- 脚本把根证书导入 Windows 证书中心
- 浏览器后续可以信任 Theia Webview 使用的 HTTPS 证书

当前仓库中用于验证的脚本文件：

- [`scripts/import-theia-webview-root-ca.ps1`](/root/theia/scripts/import-theia-webview-root-ca.ps1)

注意：

- 当前脚本要求显式传入根证书文件路径。
- 传入的证书文件应当是你们实际使用的根证书或应被导入 Root 的 CA 证书。

## 1. 准备

在 Windows 客户端机器上：

1. 以管理员身份打开 `PowerShell`
2. 将脚本文件复制到本机，例如：

```powershell
C:\import-theia-webview-root-ca.ps1
```

3. 将根证书文件也复制到本机，例如：

```powershell
C:\root-ca.crt
```

## 2. 执行脚本

在管理员 PowerShell 中执行：

```powershell
powershell -ExecutionPolicy Bypass -File C:\import-theia-webview-root-ca.ps1 -CertificatePath C:\root-ca.crt
```

如果脚本执行成功，通常会输出类似内容：

```text
Imported certificate subject: CN=Your Root CA
Installed Theia webview root certificate to LocalMachine\Root.
Please fully restart your browser before reopening Theia.
```

## 3. 验证证书是否已导入

### 方法 A：PowerShell 查询

执行：

```powershell
Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -like '*Your Root CA*' }
```

如果能查到记录，说明证书已经导入到：

- `LocalMachine\Root`
- 即“本地计算机 -> 受信任的根证书颁发机构”

如果想看更详细的信息：

```powershell
Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -like '*Your Root CA*' } | Format-List Subject,Thumbprint,NotAfter
```

### 方法 B：图形界面查看

执行：

```powershell
certlm.msc
```

然后依次查看：

1. `受信任的根证书颁发机构`
2. `证书`

在列表里查找：

证书名称以你传入的实际根证书 Subject 为准。

## 4. 验证浏览器侧效果

完成证书导入后：

1. 完全关闭浏览器
2. 重新打开浏览器
3. 访问 Theia 的 `https` 地址
4. 打开一个会通过 webview 动态加载 JS / local resources 的页面

预期结果：

- 不再出现 `Service Worker ... SSL certificate error`
- 原来因为证书问题无法加载的 webview 动态资源恢复正常

## 5. 失败排查

### 情况 1：脚本提示需要管理员权限

说明当前 PowerShell 不是管理员模式。

处理方式：

- 关闭当前窗口
- 以管理员身份重新打开 `PowerShell`
- 重新执行脚本

### 情况 2：证书已导入，但浏览器仍报证书错误

常见原因：

1. 服务器实际证书不是由该根证书签发
2. 服务器证书 SAN 不覆盖 webview host
3. 浏览器未读取系统证书库
4. 导入的是错误证书，不是真实根证书

### 情况 3：证书已导入，但仍不是预期证书

说明传入的 `CertificatePath` 不是你们真正使用的根证书，或者导入了错误证书。

需要重新确认：

- 传入的文件路径是否正确
- 文件内容是否为真实根证书
- 服务器证书是否确实由该根证书签发

## 6. 正式版上线前必须做的事

1. 准备真实根证书文件
2. 用未信任该证书的客户端重新验证一次
3. 确认 Theia 主页面和 webview host 都被该证书链正确覆盖
4. 确认导入后浏览器访问不再出现 webview SSL 错误
