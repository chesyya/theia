import { interfaces } from '@theia/core/shared/inversify';
import { ClipboardMain } from '../../common';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';

export class ClipboardMainImpl implements ClipboardMain {

    protected readonly clipboardService: ClipboardService;

    constructor(container: interfaces.Container) {
        this.clipboardService = container.get(ClipboardService);
    }

    async $readText(): Promise<string> {
        const result = await this.clipboardService.readText();
        return result;
    }

    async $writeText(value: string): Promise<void> {
        await this.clipboardService.writeText(value);
    }

}
