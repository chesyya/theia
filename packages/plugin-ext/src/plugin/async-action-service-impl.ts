import { injectable } from '@theia/core/shared/inversify';
import { Disposable } from '@theia/core/lib/common/disposable';
import { AsyncActionBackendService, AsyncActionItem, ActionContext, IActionProvider } from '../common/async-action-protocol';

interface RegisteredProvider {
    id: string;
    instance: IActionProvider;
}

@injectable()
export class AsyncActionBackendServiceImpl implements AsyncActionBackendService {

    // Map<AnchorId, Set<RegisteredProvider>>
    private readonly providers = new Map<string, Set<RegisteredProvider>>();

    public registerProvider(anchorId: string, provider: IActionProvider): Disposable {
        const providerId = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const wrapper: RegisteredProvider = { id: providerId, instance: provider };

        if (!this.providers.has(anchorId)) {
            this.providers.set(anchorId, new Set());
        }
        this.providers.get(anchorId)!.add(wrapper);

        return Disposable.create(() => {
            const set = this.providers.get(anchorId);
            if (set) {
                set.delete(wrapper);
                if (set.size === 0) {
                    this.providers.delete(anchorId);
                }
            }
        });
    }

    async $getActions(context: ActionContext): Promise<AsyncActionItem[]> {
        const anchors = this.providers.get(context.anchorId);
        if (!anchors || anchors.size === 0) {
            return [];
        }

        const allItems: AsyncActionItem[] = [];
        const promises = Array.from(anchors).map(async (wrapper) => {
            try {
                const items = await wrapper.instance.provideActions(context);
                return items.map(item => ({
                    ...item,
                    _providerId: wrapper.id
                }));
            } catch (error) {
                console.error(`Provider ${wrapper.id} failed:`, error);
                return [];
            }
        });

        const results = await Promise.all(promises);
        results.forEach(r => allItems.push(...r));
        return allItems;
    }

    async $executeAction(providerId: string, actionId: string, context: ActionContext): Promise<void> {
        for (const sets of this.providers.values()) {
            for (const wrapper of sets) {
                if (wrapper.id === providerId) {
                    await wrapper.instance.resolveAction(actionId, context);
                    return;
                }
            }
        }
        throw new Error(`Provider ${providerId} not found`);
    }
}
