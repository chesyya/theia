export module '@theia/plugin' {
    export namespace actionProvider {
        export interface ActionContext {
            anchorId: string;
            uri?: string;
            [key: string]: any;
        }

        export interface ActionItem {
            id: string;
            label: string;
            icon?: string;
            tooltip?: string;
            visible?: boolean;
            enabled?: boolean;
        }

        export interface ActionProvider {
            provideActions(context: ActionContext): Promise<ActionItem[]>;
            resolveAction(actionId: string, context: ActionContext): Promise<void>;
        }

        export function registerActionProvider(anchorId: string, provider: ActionProvider): Disposable;
    }
}
