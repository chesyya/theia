import { DebugAdapterSessionImpl } from '@theia/debug/lib/common/debug-adapter-session';
import * as theia from '@baosky/plugin';
import { DebugAdapter } from '@theia/debug/lib/common/debug-model';
import { DebugChannel } from '@theia/debug/lib/common/debug-service';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Server debug adapter session.
 */
export class PluginDebugAdapterSession extends DebugAdapterSessionImpl implements theia.DebugSession {

    constructor(
        override readonly debugAdapter: DebugAdapter,
        protected readonly tracker: theia.DebugAdapterTracker,
        protected readonly theiaSession: theia.DebugSession) {

        super(theiaSession.id, debugAdapter);
    }

    get parentSession(): theia.DebugSession | undefined {
        return this.theiaSession.parentSession;
    }

    get type(): string {
        return this.theiaSession.type;
    }
    get name(): string {
        return this.theiaSession.name;
    };
    get workspaceFolder(): theia.WorkspaceFolder | undefined {
        return this.theiaSession.workspaceFolder;
    };
    get configuration(): theia.DebugConfiguration {
        return this.theiaSession.configuration;
    };

    override async start(channel: DebugChannel): Promise<void> {
        if (this.tracker.onWillStartSession) {
            this.tracker.onWillStartSession();
        }
        await super.start(channel);
    }

    override async stop(): Promise<void> {
        if (this.tracker.onWillStopSession) {
            this.tracker.onWillStopSession();
        }
        await super.stop();
    }

    async customRequest(command: string, args?: any): Promise<any> {
        return this.theiaSession.customRequest(command, args);
    }

    async getDebugProtocolBreakpoint(breakpoint: theia.Breakpoint): Promise<theia.DebugProtocolBreakpoint | undefined> {
        return this.theiaSession.getDebugProtocolBreakpoint(breakpoint);
    }

    protected override onDebugAdapterError(error: Error): void {
        if (this.tracker.onError) {
            this.tracker.onError(error);
        }
        super.onDebugAdapterError(error);
    }

    protected override send(message: string): void {
        try {
            super.send(message);
        } finally {
            if (this.tracker.onDidSendMessage) {
                this.tracker.onDidSendMessage(JSON.parse(message));
            }
        }
    }

    protected override write(message: string): void {
        if (this.tracker.onWillReceiveMessage) {
            this.tracker.onWillReceiveMessage(JSON.parse(message));
        }
        super.write(message);
    }

    protected override onDebugAdapterExit(): void {
        if (this.tracker.onExit) {
            this.tracker.onExit(undefined, undefined);
        }
        super.onDebugAdapterExit();
    }
}
