// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
const vhost = require('vhost');
import * as express from '@theia/core/shared/express';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { WebviewExternalEndpoint } from '../common/webview-protocol';
import { environment } from '@theia/core/shared/@theia/application-package/lib/environment';
import { WsRequestValidatorContribution } from '@theia/core/lib/node/ws-request-validators';
import { MaybePromise } from '@theia/core/lib/common';
import { ApplicationPackage } from '@theia/core/shared/@theia/application-package';
import { BackendRemoteService } from '@theia/core/lib/node/remote/backend-remote-service';

@injectable()
export class PluginApiContribution implements BackendApplicationContribution, WsRequestValidatorContribution {

    static readonly WEBVIEW_CERTIFICATE_ROUTE_PREFIX = '/webview/certificate';
    static readonly WEBVIEW_CERTIFICATE_SCRIPT_PATH = `${PluginApiContribution.WEBVIEW_CERTIFICATE_ROUTE_PREFIX}/install/linux.sh`;
    static readonly WEBVIEW_CERTIFICATE_WINDOWS_SCRIPT_PATH = `${PluginApiContribution.WEBVIEW_CERTIFICATE_ROUTE_PREFIX}/install/windows.ps1`;
    static readonly WEBVIEW_CERTIFICATE_CA_PATH = `${PluginApiContribution.WEBVIEW_CERTIFICATE_ROUTE_PREFIX}/root-ca.crt`;

    protected webviewExternalEndpointRegExp: RegExp;

    protected serveSameOrigin: boolean = false;

    @inject(ApplicationPackage)
    protected readonly applicationPackage: ApplicationPackage;

    @inject(BackendRemoteService)
    protected readonly remoteService: BackendRemoteService;

    @postConstruct()
    protected init(): void {
        const webviewExternalEndpoint = this.webviewExternalEndpoint();
        console.log(`Configuring to accept webviews on '${webviewExternalEndpoint}' hostname.`);
        this.webviewExternalEndpointRegExp = new RegExp(webviewExternalEndpoint, 'i');
    }

    configure(app: express.Application): void {
        const webviewApp = express();
        webviewApp.use('/webview', express.static(path.join(this.applicationPackage.projectPath, 'lib', 'webview', 'pre')));
        this.configureCertificateSupportRoutes(app);
        this.configureCertificateSupportRoutes(webviewApp);
        if (this.remoteService.isRemoteServer()) {
            // Any request to `subdomain.localhost:port/webview/...` will get redirected to the remote system.
            // However, it will get redirected directly to the `localhost:remotePort` address, losing the subdomain info.
            // In this case, we simply serve the webviews on a path.
            app.use(webviewApp);
        } else {
            app.use(vhost(this.webviewExternalEndpointRegExp, webviewApp));
        }
    }

    allowWsUpgrade(request: http.IncomingMessage): MaybePromise<boolean> {
        if (request.headers.origin && !this.serveSameOrigin) {
            const origin = url.parse(request.headers.origin);
            if (origin.host && this.webviewExternalEndpointRegExp.test(origin.host)) {
                // If the origin comes from the WebViews, refuse:
                return false;
            }
        }
        return true;
    }

    protected configureCertificateSupportRoutes(app: express.Application): void {
        app.get(PluginApiContribution.WEBVIEW_CERTIFICATE_CA_PATH, (_request, response) => {
            const certificate = this.readConfiguredWebviewCertificate();
            if (!certificate) {
                response.status(404).type('text/plain').send('Webview root certificate is not configured.');
                return;
            }

            response.setHeader('Content-Disposition', `attachment; filename="${certificate.fileName}"`);
            response.type('application/x-pem-file').send(certificate.content);
        });

        app.get(PluginApiContribution.WEBVIEW_CERTIFICATE_SCRIPT_PATH, (_request, response) => {
            const certificate = this.readConfiguredWebviewCertificate();
            if (!certificate) {
                response.status(404).type('text/plain').send('Webview root certificate is not configured.');
                return;
            }

            response.setHeader('Content-Disposition', 'attachment; filename="install-theia-webview-root-ca.sh"');
            response.type('application/x-sh').send(this.createLinuxCertificateInstallScript(certificate));
        });

        app.get(PluginApiContribution.WEBVIEW_CERTIFICATE_WINDOWS_SCRIPT_PATH, (_request, response) => {
            const certificate = this.readConfiguredWebviewCertificate();
            if (!certificate) {
                response.status(404).type('text/plain').send('Webview root certificate is not configured.');
                return;
            }

            response.setHeader('Content-Disposition', 'attachment; filename="install-theia-webview-root-ca.ps1"');
            response.type('text/plain').send(this.createWindowsCertificateInstallScript(certificate));
        });
    }

    protected readConfiguredWebviewCertificate(): { content: string, fileName: string } | undefined {
        const certificatePath = process.env.THEIA_WEBVIEW_CA_CERT_PATH;
        if (!certificatePath) {
            return undefined;
        }

        try {
            const content = fs.readFileSync(certificatePath, 'utf8');
            return {
                content,
                fileName: path.basename(certificatePath)
            };
        } catch (error) {
            console.error(`Failed to read THEIA_WEBVIEW_CA_CERT_PATH '${certificatePath}':`, error);
            return undefined;
        }
    }

    protected createLinuxCertificateInstallScript(certificate: { content: string, fileName: string }): string {
        const trustFileName = process.env.THEIA_WEBVIEW_CA_CERT_FILENAME || certificate.fileName || 'theia-webview-root-ca.crt';
        return `#!/usr/bin/env bash
set -euo pipefail

CERT_FILE_NAME='${trustFileName.replace(/'/g, `'\\''`)}'
TEMP_DIR="$(mktemp -d)"
CERT_PATH="$TEMP_DIR/$CERT_FILE_NAME"
TARGET_PATH="/usr/local/share/ca-certificates/$CERT_FILE_NAME"

cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

cat <<'EOF_CERT' > "$CERT_PATH"
${certificate.content.trim()}
EOF_CERT

if [ "$(id -u)" -ne 0 ]; then
    echo "This script must run with administrator privileges."
    echo "Please rerun it with: sudo bash $0"
    exit 1
fi

install -m 0644 "$CERT_PATH" "$TARGET_PATH"
update-ca-certificates

echo
echo "Installed Theia Webview root certificate to: $TARGET_PATH"
echo "Please fully restart your browser before reopening Theia."
`;
    }

    protected createWindowsCertificateInstallScript(certificate: { content: string, fileName: string }): string {
        const trustFileName = process.env.THEIA_WEBVIEW_CA_CERT_FILENAME || certificate.fileName || 'theia-webview-root-ca.crt';
        const escapedCertificate = certificate.content.replace(/`/g, '``');
        const escapedFileName = trustFileName.replace(/'/g, "''");
        return `$ErrorActionPreference = 'Stop'

$certFileName = '${escapedFileName}'
$tempDir = Join-Path $env:TEMP ('theia-webview-cert-' + [guid]::NewGuid().ToString())
$certPath = Join-Path $tempDir $certFileName

function Test-IsAdministrator {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
    Write-Error 'Please rerun this script in an elevated PowerShell window.'
}

New-Item -ItemType Directory -Path $tempDir | Out-Null
@'
${escapedCertificate.trim()}
'@ | Set-Content -Path $certPath -Encoding ascii

Import-Certificate -FilePath $certPath -CertStoreLocation 'Cert:\\LocalMachine\\Root' | Out-Null

Write-Host ''
Write-Host "Installed Theia Webview root certificate to the LocalMachine Root store."
Write-Host 'Please fully restart your browser before reopening Theia.'
`;
    }

    protected webviewExternalEndpointPattern(): string {
        let endpointPattern;
        if (environment.electron.is()) {
            endpointPattern = WebviewExternalEndpoint.defaultPattern;
        } else {
            endpointPattern = process.env[WebviewExternalEndpoint.pattern] || WebviewExternalEndpoint.defaultPattern;
        }
        if (endpointPattern === '{{hostname}}') {
            this.serveSameOrigin = true;
        }
        return endpointPattern;
    }

    /**
     * Returns a RegExp pattern matching the expected WebView endpoint's host.
     */
    protected webviewExternalEndpoint(): string {
        return `^${this.webviewExternalEndpointPattern()
            .replace(/\./g, '\\.')
            .replace('{{uuid}}', '.+')
            .replace('{{hostname}}', '.+')}$`;
    }
}
