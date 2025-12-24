/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
// copied and modified from https://github.com/microsoft/vscode/blob/ba40bd16433d5a817bfae15f3b4350e18f144af4/src/vs/workbench/contrib/webview/browser/pre/host.js
// @ts-check
(function () {
    const id = document.location.search.match(/\bid=([\w-]+)/)[1];

    const hostMessaging = new class HostMessaging {
        constructor() {
            this.handlers = new Map();
            window.addEventListener('message', e => {
                // Note: `window.parent === window` when there is no parent...
                const sourceIsSelfOrParentFrame = e.source === window.parent;
                let sourceIsChildFrame = false;
                for (let i = 0; i < window.frames.length; i++) {
                    const frame = window.frames[i];
                    if (e.origin === frame.origin) {
                        sourceIsChildFrame = true;
                        break;
                    }
                }
                if (sourceIsChildFrame && e.data && (e.data.command === 'onmessage' || e.data.command === 'do-update-state' || e.data.command === 'onconsole')) {
                    this.postMessage(e.data.command, e.data.data);
                } else if (sourceIsChildFrame || sourceIsSelfOrParentFrame) {
                    const channel = e.data.channel;
                    const handler = this.handlers.get(channel);
                    if (handler) {
                        handler(e, e.data.args);
                    } else {
                        console.error('no handler for ', e);
                    }
                }
            });
        }

        postMessage(channel, data) {
            window.parent.postMessage({ target: id, channel, data }, '*');
            let currentWindow = window;
            while (currentWindow.parent !== currentWindow) {
                currentWindow = currentWindow.parent;
                if (currentWindow.opener) {
                    currentWindow.opener.postMessage({ target: id, channel, data, fromSecondary: true }, '*');
                }
            }
        }

        onMessage(channel, handler) {
            this.handlers.set(channel, handler);
        }
    }();

    const workerReady = new Promise(async (resolveWorkerReady) => {
        if (!areServiceWorkersEnabled()) {
            console.error('Service Workers are not enabled. Webviews will not work properly');
            return resolveWorkerReady();
        }

        const expectedWorkerVersion = 1;

        navigator.serviceWorker.register('service-worker.js').then(async registration => {
            await navigator.serviceWorker.ready;

            const versionHandler = (event) => {
                if (event.data.channel !== 'version') {
                    return;
                }

                navigator.serviceWorker.removeEventListener('message', versionHandler);
                if (event.data.version === expectedWorkerVersion) {
                    return resolveWorkerReady();
                } else {
                    // If we have the wrong version, try once to unregister and re-register
                    return registration.update()
                        .then(() => navigator.serviceWorker.ready)
                        .finally(resolveWorkerReady);
                }
            };
            navigator.serviceWorker.addEventListener('message', versionHandler);
            registration.active.postMessage({ channel: 'version' });
        });

        const forwardFromHostToWorker = (channel) => {
            hostMessaging.onMessage(channel, event => {
                navigator.serviceWorker.ready.then(registration => {
                    registration.active.postMessage({ channel: channel, data: event.data.args });
                });
            });
        };
        forwardFromHostToWorker('did-load-resource');
        forwardFromHostToWorker('did-load-localhost');

        navigator.serviceWorker.addEventListener('message', event => {
            if (['load-resource', 'load-localhost'].includes(event.data.channel)) {
                hostMessaging.postMessage(event.data.channel, event.data);
            }
        });
    });

    function areServiceWorkersEnabled() {
        try {
            return !!navigator.serviceWorker;
        } catch (e) {
            return false;
        }
    }

    window.createWebviewManager({
        postMessage: hostMessaging.postMessage.bind(hostMessaging),
        onMessage: hostMessaging.onMessage.bind(hostMessaging),
        ready: workerReady,
        fakeLoad: true
    });
}());
