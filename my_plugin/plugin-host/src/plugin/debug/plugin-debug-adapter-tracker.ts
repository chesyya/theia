/* eslint-disable @typescript-eslint/no-explicit-any */

import * as theia from '@baosky/plugin';

export class PluginDebugAdapterTracker implements theia.DebugAdapterTracker {
    constructor(protected readonly trackers: theia.DebugAdapterTracker[]) { }

    static async create(session: theia.DebugSession, trackerFactories: [string, theia.DebugAdapterTrackerFactory][]): Promise<PluginDebugAdapterTracker> {
        const trackers: theia.DebugAdapterTracker[] = [];

        const factories = trackerFactories.filter(tuple => tuple[0] === '*' || tuple[0] === session.type).map(tuple => tuple[1]);
        for (const factory of factories) {
            const tracker = await factory.createDebugAdapterTracker(session);
            if (tracker) {
                trackers.push(tracker);
            }
        }

        return new PluginDebugAdapterTracker(trackers);
    }

    onWillStartSession(): void {
        this.trackers.forEach(tracker => {
            if (tracker.onWillStartSession) {
                tracker.onWillStartSession();
            }
        });
    }

    onWillReceiveMessage(message: any): void {
        this.trackers.forEach(tracker => {
            if (tracker.onWillReceiveMessage) {
                tracker.onWillReceiveMessage(message);
            }
        });
    }

    onDidSendMessage(message: any): void {
        this.trackers.forEach(tracker => {
            if (tracker.onDidSendMessage) {
                tracker.onDidSendMessage(message);
            }
        });
    }

    onWillStopSession(): void {
        this.trackers.forEach(tracker => {
            if (tracker.onWillStopSession) {
                tracker.onWillStopSession();
            }
        });
    }

    onError(error: Error): void {
        this.trackers.forEach(tracker => {
            if (tracker.onError) {
                tracker.onError(error);
            }
        });
    }

    onExit(code: number | undefined, signal: string | undefined): void {
        this.trackers.forEach(tracker => {
            if (tracker.onExit) {
                tracker.onExit(code, signal);
            }
        });
    }
}
