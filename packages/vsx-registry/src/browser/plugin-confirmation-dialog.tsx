import * as React from '@theia/core/shared/react';
import * as markdownit from '@theia/core/shared/markdown-it';
import * as DOMPurify from '@theia/core/shared/dompurify';
import { DialogProps } from '@theia/core/lib/browser/dialogs';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';
import { injectable, inject } from '@theia/core/shared/inversify';
import { PluginInstallInfo } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { nls } from '@theia/core/lib/common/nls';

export const PluginConfirmationDialogFactory = Symbol('PluginConfirmationDialogFactory');
export interface PluginConfirmationDialogFactory {
    (props: PluginConfirmationDialogProps): PluginConfirmationDialog;
}

@injectable()
export class PluginConfirmationDialogProps extends DialogProps {
    readonly pluginInfo: PluginInstallInfo;
}

@injectable()
export class PluginConfirmationDialog extends ReactDialog<boolean> {

    constructor(
        @inject(PluginConfirmationDialogProps) protected override readonly props: PluginConfirmationDialogProps
    ) {
        super(props);
        this.appendAcceptButton(nls.localize('plugin.install.confirm', 'Install'));
        this.appendCloseButton(nls.localize('plugin.install.cancel', 'Cancel'));
    }

    protected render(): React.ReactNode {
        const { model, apiDescription, installationDeclaration } = this.props.pluginInfo;

        // Render Markdown
        const mdRenderer = markdownit({ html: true });
        const rawHtml = installationDeclaration ? mdRenderer.render(installationDeclaration) : '';
        const safeHtml = DOMPurify.sanitize(rawHtml);

        // Format API Description
        let apiElements: React.ReactNode[] = [];
        if (apiDescription) {
            try {
                const obj = JSON.parse(apiDescription);
                if (typeof obj === 'object' && obj !== null) {
                    apiElements = Object.entries(obj).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: '8px', lineHeight: '1.4' }}>
                            <span style={{ fontWeight: 'bold', fontFamily: 'var(--theia-code-font-family, monospace)', color: 'var(--theia-textLinkForeground)' }}>{key}</span>
                            <span style={{ margin: '0 8px' }}>:</span>
                            <span>{String(value)}</span>
                        </div>
                    ));
                }
            } catch (e) {
                // Fallback for invalid JSON
                apiElements.push(<div key="error">{String(apiDescription)}</div>);
            }
        }
        
        return (
            <div style={{ display: 'flex', width: '900px', height: '600px', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1em', paddingBottom: '10px', borderBottom: '1px solid var(--theia-border)' }}>
                    {model.displayName || model.name} <span style={{fontWeight: 'normal', fontSize: '0.9em', color: 'var(--theia-descriptionForeground)'}}>v{model.version} by {model.publisher}</span>
                </div>
                
                <div style={{ display: 'flex', flex: 1, flexDirection: 'row', gap: '20px', minHeight: 0 }}>
                    {/* Left: Installation Declaration (Markdown) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <h3 style={{marginTop: 0, fontSize: '1em', textTransform: 'uppercase', color: 'var(--theia-descriptionForeground)'}}>
                            {nls.localize('plugin.install.declaration', 'Installation Declaration')}
                        </h3>
                        <div style={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            border: '1px solid var(--theia-border)', 
                            padding: '15px',
                            backgroundColor: 'var(--theia-editor-background)',
                            userSelect: 'text'
                        }}>
                            {installationDeclaration ? (
                                <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: safeHtml }} />
                            ) : (
                                <div style={{fontStyle: 'italic', color: 'var(--theia-descriptionForeground)', textAlign: 'center', marginTop: '20px'}}>
                                    {nls.localize('plugin.install.noDeclaration', 'No installation declaration (INSTALL.md) found.')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: API Description (List) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <h3 style={{marginTop: 0, fontSize: '1em', textTransform: 'uppercase', color: 'var(--theia-descriptionForeground)'}}>
                            {nls.localize('plugin.install.apiDescription', 'API Usage Description')}
                        </h3>
                        <div style={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            border: '1px solid var(--theia-border)', 
                            padding: '15px',
                            backgroundColor: 'var(--theia-editor-background)',
                            fontSize: '13px',
                            userSelect: 'text'
                        }}>
                            {apiElements.length > 0 ? (
                                <div>{apiElements}</div>
                            ) : (
                                <div style={{fontStyle: 'italic', color: 'var(--theia-descriptionForeground)', textAlign: 'center', marginTop: '20px'}}>
                                    {nls.localize('plugin.install.noApiDescription', 'No API description (api-description.json) found.')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    get value(): boolean {
        return true;
    }
}
