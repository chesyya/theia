// import { rejects } from 'assert';
// import { strictEqual } from 'assert/strict';
// import { promises as fs } from 'fs';
// import { generateUuid } from '@theia/core/lib/common/uuid';
// import { isENOENT } from '../../common/errors';

// describe('errors', () => {
//     describe('errno-exception', () => {
//         it('should be ENOENT error', async () => {
//             await rejects(fs.readFile(generateUuid()), reason => isENOENT(reason));
//         });

//         it('should not be ENOENT error (no code)', () => {
//             strictEqual(isENOENT(new Error('I am not ENOENT')), false);
//         });

//         it('should not be ENOENT error (other code)', async () => {
//             await rejects(fs.readdir(__filename), reason => !isENOENT(reason));
//         });
//     });
// });

describe("todo", () => {
    test.todo("todo")
})