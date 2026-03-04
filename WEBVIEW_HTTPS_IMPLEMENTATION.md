# Theia Webview HTTPS 实施步骤（可直接执行）

本文目标：解决 `webview` 报错  
`Failed to register a ServiceWorker ... SSL certificate error`

适用场景：
- 你当前通过浏览器访问 Theia（不是 Electron）。
- 你需要 webview 正常渲染。
- 你希望安装包部署后用户尽量无感。

---

## 0. 先理解一个关键点

如果你走 HTTPS，Theia 主页面和 webview 可能使用不同 host：

- IDE 主页面：`https://localhost:5577`
- Webview 页面：`https://<uuid>.webview.localhost:5577/webview/index.html?...`

因此证书必须覆盖 webview host，否则 Service Worker 会失败。

如果你走 HTTP（例如 `http://localhost:3000`），通常不会触发 TLS 证书校验。

---

## 1. 你要决定的部署模式

### 模式 A（本地安装包，localhost）
- IDE host：`localhost`
- Webview host：`<uuid>.webview.localhost`
- 证书 SAN 需要：
  - `DNS:localhost`
  - `DNS:*.webview.localhost`

### 模式 B（正式域名，推荐生产）
- IDE host：`ide.example.com`
- Webview host：`<uuid>.webview.ide.example.com`
- 证书 SAN 需要：
  - `DNS:ide.example.com`
  - `DNS:*.webview.ide.example.com`

---

## 2. 在哪里设置 Theia 的 webview host 规则

变量名：`THEIA_WEBVIEW_EXTERNAL_ENDPOINT`

隔离模式（你当前需要）：

```bash
export THEIA_WEBVIEW_EXTERNAL_ENDPOINT='{{uuid}}.webview.{{hostname}}'
```

说明：
- 不设置时默认也是这个值。
- 建议显式写入启动脚本或 systemd，避免环境不一致。

---

## 3. HTTP/HTTPS 双入口说明（你当前就是这种）

你可以同时保留两种访问：

- 开发入口：`http://localhost:3000`
- 安全入口：`https://localhost:5577`（由 Nginx 反代到 3000）

建议：
- 日常开发调试功能时用 `http://localhost:3000`。
- 验证发布环境与证书链时用 `https://localhost:5577`。

注意：
- 你遇到的 `ServiceWorker ... SSL certificate error` 只会在 HTTPS 证书链有问题时出现。

---

## 4. 模式 A：localhost 安装包完整步骤

以下命令在 **服务器机器终端** 执行（你当前运行 Theia 的机器）。

### 4.1 创建证书目录

```bash
sudo mkdir -p /etc/theia/certs
cd /etc/theia/certs
```

### 4.2 生成本地 CA（只生成一次）

```bash
sudo openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout theia-local-ca.key \
  -out theia-local-ca.crt \
  -subj "/CN=Theia Local CA"
```

### 4.3 写服务器证书配置文件（必须含 SAN）

创建文件：`/etc/theia/certs/localhost-webview.cnf`

```ini
[ req ]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[ dn ]
CN = localhost

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost
DNS.2 = *.webview.localhost
```

### 4.4 生成服务器私钥和 CSR

```bash
sudo openssl req -new -nodes \
  -newkey rsa:2048 \
  -keyout theia-server.key \
  -out theia-server.csr \
  -config localhost-webview.cnf
```

### 4.5 用本地 CA 签发服务器证书

```bash
sudo openssl x509 -req \
  -in theia-server.csr \
  -CA theia-local-ca.crt \
  -CAkey theia-local-ca.key \
  -CAcreateserial \
  -out theia-server.crt \
  -days 825 \
  -sha256 \
  -extfile localhost-webview.cnf \
  -extensions req_ext
```

### 4.6 导入 CA 到麒麟系统信任库（必须）

```bash
sudo cp /etc/theia/certs/theia-local-ca.crt /usr/local/share/ca-certificates/theia-local-ca.crt
sudo update-ca-certificates
```

### 4.7 配置 Nginx（HTTPS 入口）

创建文件：`/etc/nginx/conf.d/theia.conf`

```nginx
server {
  listen 5577 ssl http2;
  server_name localhost *.webview.localhost;

  ssl_certificate     /etc/theia/certs/theia-server.crt;
  ssl_certificate_key /etc/theia/certs/theia-server.key;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4.8 启动 Theia 时显式设置变量

如果你是命令行启动：

```bash
export THEIA_WEBVIEW_EXTERNAL_ENDPOINT='{{uuid}}.webview.{{hostname}}'
cd /root/theia/examples/browser
yarn start
```

如果你是 systemd 启动，编辑服务文件（示例）：

`/etc/systemd/system/theia.service`

```ini
[Service]
Environment=THEIA_WEBVIEW_EXTERNAL_ENDPOINT={{uuid}}.webview.{{hostname}}
```

然后：

```bash
sudo systemctl daemon-reload
sudo systemctl restart theia
```

### 4.9 验证

1) 看证书 SAN 是否正确：

```bash
openssl x509 -in /etc/theia/certs/theia-server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

应包含：
- `DNS:localhost`
- `DNS:*.webview.localhost`

2) 浏览器打开：
- `https://localhost:5577`
- 打开一个 webview

3) DevTools Console 不应再出现：
- `Failed to register a ServiceWorker ... SSL certificate error`

---

## 5. 模式 B：正式域名实施步骤（生产推荐）

### 5.1 DNS

在 DNS 平台添加：
- `ide.example.com` -> 服务器 IP
- `*.webview.ide.example.com` -> 服务器 IP

### 5.2 申请证书（去哪里申请）

可选渠道：
- 公网：Let's Encrypt（推荐）
- 企业内网：企业 CA / AD CS / 内部证书平台

证书 SAN 至少需要：
- `ide.example.com`
- `*.webview.ide.example.com`

### 5.3 Nginx 使用该证书

`server_name ide.example.com *.webview.ide.example.com;`

### 5.4 Theia 设置

```bash
export THEIA_WEBVIEW_EXTERNAL_ENDPOINT='{{uuid}}.webview.{{hostname}}'
```

### 5.5 客户端信任

公网 CA 一般自动信任；内网 CA 需要批量下发根证书到终端信任库。

---

## 6. 复现措施（你之前那套 bad cert 方法）

用途：稳定复现 `ServiceWorker ... SSL certificate error`，便于测试修复是否生效。

执行位置：服务器机器终端。

### 6.1 生成“错误证书”（故意不匹配 localhost）

```bash
mkdir -p /tmp/theia-bad-cert && cd /tmp/theia-bad-cert
openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes \
  -keyout bad.key -out bad.crt \
  -subj "/CN=example.com"
```

### 6.2 启动本地 HTTPS 代理（5577 -> 3000）

```bash
npx local-ssl-proxy --source 5577 --target 3000 --cert bad.crt --key bad.key
```

### 6.3 打开浏览器访问

`https://localhost:5577`

你会看到地址栏不安全/红锁。

### 6.4 打开 webview 并观察报错

在 IDE 执行 webview 命令，打开浏览器 DevTools Console，通常会看到：

`Failed to register a ServiceWorker ... SSL certificate error`

### 6.5 结束复现环境

停止 `local-ssl-proxy` 进程，恢复到正常 nginx/证书环境。

---

## 7. 安装包里应该准备什么

如果你做的是 `localhost` 本地安装包，建议打包以下内容：

- `/opt/theia/certs/theia-local-ca.crt`
- `/opt/theia/certs/theia-server.crt`
- `/opt/theia/certs/theia-server.key`
- `/opt/theia/nginx/theia.conf`（Nginx 模板）
- `/opt/theia/scripts/install-cert.sh`（导入 CA）
- `/opt/theia/scripts/install-service-env.sh`（写入 systemd 环境变量）

安装程序执行顺序建议：
1. 拷贝文件
2. 安装 CA 到系统信任库
3. 写 Nginx 配置并 reload
4. 写 Theia 服务环境变量
5. 重启 Theia
6. 执行验证脚本

---

## 8. 常见误区

1) “Nginx 已经是 https，为什么还报 SSL 错？”  
因为 HTTPS 只代表加密，不代表浏览器信任该证书。

2) “证书是绑定 URL 吗？”  
不是。证书匹配的是 host（域名/IP），不是路径。

3) “webview 有独立证书吗？”  
没有。webview 仍然使用你 HTTPS 入口返回的证书。

4) “http fetch 能成功，为啥 webview 还失败？”  
webview 失败点是 `service-worker.js` 的 HTTPS 证书校验，不是你的业务 fetch。

---

## 9. 快速排障命令

```bash
# 看当前是否显式设置了 webview endpoint 变量
echo "$THEIA_WEBVIEW_EXTERNAL_ENDPOINT"

# 看证书 SAN
openssl x509 -in /etc/theia/certs/theia-server.crt -noout -text | grep -A1 "Subject Alternative Name"

# 模拟指定 SNI 握手（webview 子域）
openssl s_client -connect localhost:5577 -servername test.webview.localhost </dev/null
```
