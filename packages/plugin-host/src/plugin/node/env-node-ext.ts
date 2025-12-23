import { injectable } from '@theia/core/shared/inversify';
import * as mac from 'macaddress';
import { EnvExtImpl } from '../env';
import { createHash } from 'crypto';
import { generateUuid } from '@theia/core/lib/common/uuid';
import fs = require('fs');

/**
 * Provides machineId using mac address. It's only possible on node side
 * Extending the common class
 */
@injectable()
export class EnvNodeExtImpl extends EnvExtImpl {

    private macMachineId: string;
    private _isNewAppInstall: boolean;

    constructor() {
        super();

        mac.one((err, macAddress) => {
            if (err) {
                this.macMachineId = generateUuid();
            } else {
                this.macMachineId = createHash('sha256').update(macAddress, 'utf8').digest('hex');
            }
        });
        this._isNewAppInstall = this.computeIsNewAppInstall();
    }

    /**
     * override machineID
     */
    override get machineId(): string {
        return this.macMachineId;
    }

    get isNewAppInstall(): boolean {
        return this._isNewAppInstall;
    }

    private computeIsNewAppInstall(): boolean {
        const creation = fs.statSync(__filename).birthtimeMs;
        const current = Date.now();
        const dayMs = 24 * 3600 * 1000;
        return (current - creation) < dayMs;
    }
}
