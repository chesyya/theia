import { ContainerModule } from '@theia/core/shared/inversify';
import { bindHostedBackend } from './hosted/node/plugin-ext-hosted-backend-module';
import { bindMainBackend } from './main/node/plugin-ext-backend-module';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bindMainBackend(bind, unbind, isBound, rebind);
    bindHostedBackend(bind);
});
