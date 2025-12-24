import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class PluginTerminalRegistry {

    startCallback: (id: string) => Promise<string>;

    start(profileId: string): Promise<string> {
        return this.startCallback(profileId);
    }
}
