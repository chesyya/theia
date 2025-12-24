// FIXME:
// import { Container } from '@theia/core/shared/inversify';
// import { DebugSession } from '@baosky/plugin';
// import * as chai from 'chai';
// import { ProxyIdentifier, RPCProtocol } from '../../../common/rpc-protocol';

// import { DebugExtImpl } from '../../debug/debug-ext';

// const expect = chai.expect;

// describe('Debug API', () => {

//     describe('#asDebugSourceURI', () => {

//         const mockRPCProtocol: RPCProtocol = {
//             getProxy<T>(_proxyId: ProxyIdentifier<T>): T {
//                 return {} as T;
//             },
//             set<T, R extends T>(_id: ProxyIdentifier<T>, instance: R): R {
//                 return instance;
//             },
//             dispose(): void {
//                 // Nothing
//             }
//         };

//         const container = new Container();
//         container.bind(RPCProtocol).toConstantValue(mockRPCProtocol);
//         container.bind(DebugExtImpl).toSelf().inSingletonScope();
//         const debug = container.get(DebugExtImpl);

//         it('should use sourceReference, path and sessionId', () => {
//             const source = {
//                 sourceReference: 3,
//                 path: 'test/path'
//             };
//             const session = { id: 'test-session' } as DebugSession;
//             const uri = debug.asDebugSourceUri(source, session);
//             expect(uri.toString(true)).to.be.equal('debug:test/path?ref=3&session=test-session');
//         });

//         it('should use sourceReference', () => {
//             const source = {
//                 sourceReference: 5
//             };
//             const uri = debug.asDebugSourceUri(source);
//             expect(uri.toString(true)).to.be.equal('debug:?ref=5');
//         });

//         it('should use sourceReference and session', () => {
//             const source = {
//                 sourceReference: 5
//             };
//             const session = { id: 'test-session' } as DebugSession;
//             const uri = debug.asDebugSourceUri(source, session);
//             expect(uri.toString(true)).to.be.equal('debug:?ref=5&session=test-session');
//         });

//         it('should use sourceReference and path', () => {
//             const source = {
//                 sourceReference: 4,
//                 path: 'test/path'
//             };
//             const uri = debug.asDebugSourceUri(source);
//             expect(uri.toString(true)).to.be.equal('debug:test/path?ref=4');
//         });

//         it('should use path', () => {
//             const source = {
//                 path: 'scheme:/full/path'
//             };
//             const uri = debug.asDebugSourceUri(source);
//             expect(uri.toString(true)).to.be.equal('scheme:/full/path');
//         });

//         it('should use file path', () => {
//             const source = {
//                 path: '/full/path'
//             };
//             const uri = debug.asDebugSourceUri(source);
//             expect(uri.toString(true)).to.be.equal('file:///full/path');
//         });
//     });
// });

// FIXME:
describe("todo", () => {
    test.todo("")
})