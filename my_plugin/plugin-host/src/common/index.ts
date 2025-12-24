// Here we expose types from @theia/plugin, so it becomes a direct dependency
export * from './plugin-protocol';
export * from './plugin-api-rpc';
export * from './plugin-ext-api-contribution';

import { registerMsgPackExtensions } from './rpc-protocol';

registerMsgPackExtensions();
