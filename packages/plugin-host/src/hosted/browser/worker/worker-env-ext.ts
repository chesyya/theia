import { injectable } from '@theia/core/shared/inversify';
import { EnvExtImpl } from '../../../plugin/env';

/**
 * Worker specific implementation not returning any FileSystem details
 * Extending the common class
 */
@injectable()
export class WorkerEnvExtImpl extends EnvExtImpl {

    constructor() {
        super();
    }

    override get appRoot(): string {
        // The documentation indicates that this should be an empty string
        return '';
    }

    get isNewAppInstall(): boolean {
        return false;
    }

}
