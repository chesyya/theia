import { interfaces } from '@theia/core/shared/inversify';
import { Disposable, DisposableCollection } from '@theia/core/lib/common/disposable';
import * as types from '../../plugin/types-impl';
import { StatusBarMessageRegistryMain } from '../../common/plugin-api-rpc';
import { StatusBar, StatusBarAlignment, StatusBarEntry } from '@theia/core/lib/browser/status-bar/status-bar';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { MarkdownString } from '@theia/core/lib/common/markdown-rendering';

export class StatusBarMessageRegistryMainImpl implements StatusBarMessageRegistryMain, Disposable {
    private readonly delegate: StatusBar;
    private readonly entries = new Map<string, StatusBarEntry>();
    private readonly toDispose = new DisposableCollection(
        Disposable.create(() => { /* mark as not disposed */ })
    );

    protected readonly colorRegistry: ColorRegistry;

    constructor(container: interfaces.Container) {
        this.delegate = container.get(StatusBar);
        this.colorRegistry = container.get(ColorRegistry);
    }

    dispose(): void {
        this.toDispose.dispose();
    }

    async $setMessage(id: string,
        name: string | undefined,
        text: string | undefined,
        priority: number,
        alignment: number,
        color: string | undefined,
        backgroundColor: string | undefined,
        tooltip: string | MarkdownString | undefined,
        command: string | undefined,
        accessibilityInformation: types.AccessibilityInformation,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: any[] | undefined): Promise<void> {
        const ariaLabel = accessibilityInformation?.label;
        const role = accessibilityInformation?.role;

        const entry = {
            name,
            text: text || '',
            ariaLabel,
            role,
            priority,
            alignment: alignment === types.StatusBarAlignment.Left ? StatusBarAlignment.LEFT : StatusBarAlignment.RIGHT,
            color: color && (this.colorRegistry.getCurrentColor(color) || color),
            // In contrast to color, the backgroundColor must be a theme color. Thus, do not hand in the plain string if it cannot be resolved.
            backgroundColor: backgroundColor && (this.colorRegistry.getCurrentColor(backgroundColor)),
            tooltip,
            command,
            accessibilityInformation,
            args
        };

        this.entries.set(id, entry);
        await this.delegate.setElement(id, entry);
        if (this.toDispose.disposed) {
            this.$dispose(id);
        } else {
            this.toDispose.push(Disposable.create(() => this.$dispose(id)));
        }
    }

    $dispose(id: string): void {
        const entry = this.entries.get(id);
        if (entry) {
            this.entries.delete(id);
            this.delegate.removeElement(id);
        }
    }

}
