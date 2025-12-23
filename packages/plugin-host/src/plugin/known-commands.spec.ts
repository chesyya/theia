// import * as assert from 'assert';
// import { KnownCommands } from './known-commands';
// import { Position, URI } from './types-impl';
// import { fromPosition } from './type-converters';

// describe('Known Command Conversions', () => {

//     it('Should convert position correctly', () => {

//         // given
//         const commandID = 'editor.action.rename';
//         const uri = URI.parse('file://my_theia_location');
//         const line = 61;
//         const character = 22;
//         const position = new Position(line, character); // vscode type position

//         assert.ok(KnownCommands.mapped(commandID));

//         // when
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         KnownCommands.map(commandID, [uri, position], (mappedID: string, mappedArgs: any[]) => {

//             // then
//             assert.strictEqual(commandID, mappedID);
//             assert.strictEqual(mappedArgs.length, 2);
//             assert.deepStrictEqual(uri, mappedArgs[0]);

//             const expectedMonacoPosition = fromPosition(position);
//             assert.deepStrictEqual(expectedMonacoPosition, mappedArgs[1]);
//         });

//     });

// });

// FIXME:
describe("todo", () => {
    test.todo("")
})