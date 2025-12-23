import { DebugSessionContributionRegistry, DebugSessionContribution } from '@theia/debug/lib/browser/debug-session-contribution';
import { injectable, inject, named, postConstruct } from '@theia/core/shared/inversify';
import { ContributionProvider } from '@theia/core/lib/common/contribution-provider';
import { Disposable } from '@theia/core/lib/common/disposable';

/**
 * Debug session contribution registrator.
 */
export interface PluginDebugSessionContributionRegistrator {
    /**
     * Registers [DebugSessionContribution](#DebugSessionContribution).
     * @param contrib contribution
     */
    registerDebugSessionContribution(contrib: DebugSessionContribution): Disposable;

    /**
     * Unregisters [DebugSessionContribution](#DebugSessionContribution).
     * @param debugType the debug type
     */
    unregisterDebugSessionContribution(debugType: string): void;
}

/**
 * Plugin debug session contribution registry implementation with functionality
 * to register / unregister plugin contributions.
 */
@injectable()
export class PluginDebugSessionContributionRegistry implements DebugSessionContributionRegistry, PluginDebugSessionContributionRegistrator {
    protected readonly contribs = new Map<string, DebugSessionContribution>();

    @inject(ContributionProvider) @named(DebugSessionContribution)
    protected readonly contributions: ContributionProvider<DebugSessionContribution>;

    @postConstruct()
    protected init(): void {
        for (const contrib of this.contributions.getContributions()) {
            this.contribs.set(contrib.debugType, contrib);
        }
    }

    get(debugType: string): DebugSessionContribution | undefined {
        return this.contribs.get(debugType);
    }

    registerDebugSessionContribution(contrib: DebugSessionContribution): Disposable {
        const { debugType } = contrib;

        if (this.contribs.has(debugType)) {
            console.warn(`Debug session contribution already registered for ${debugType}`);
            return Disposable.NULL;
        }

        this.contribs.set(debugType, contrib);
        return Disposable.create(() => this.unregisterDebugSessionContribution(debugType));
    }

    unregisterDebugSessionContribution(debugType: string): void {
        this.contribs.delete(debugType);
    }
}
