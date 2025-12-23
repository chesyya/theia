import { MaybePromise } from '@theia/core/lib/common';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { inject, injectable } from '@theia/core/shared/inversify';
import { SecondaryWindowHandler } from '@theia/core/lib/browser/secondary-window-handler';
import { WebviewWidget } from './webview';

@injectable()
export class WebviewSecondaryWindowSupport implements FrontendApplicationContribution {
    @inject(SecondaryWindowHandler)
    protected readonly secondaryWindowHandler: SecondaryWindowHandler;

    onStart(app: FrontendApplication): MaybePromise<void> {
        this.secondaryWindowHandler.onDidAddWidget(([widget, win]) => {
            if (widget instanceof WebviewWidget) {
                const script = win.document.createElement('script');
                script.text = `
                        window.addEventListener('message', e => {
                        // Only process messages from Theia main window
                        if (e.source === window.opener) {
                            // Delegate message to iframe
                            const frame = window.document.getElementsByTagName('iframe').item(0);
                            if (frame) {
                                frame.contentWindow?.postMessage({ ...e.data }, '*');
                            }
                        }
                        }); `;
                win.document.head.append(script);
            }
        });
    }
}
