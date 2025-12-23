
import { normalize, join } from './path';


describe('Path implementation:', () => {

    it('should normalize \'/foo/bar//baz/asdf/quux/..\'', () => {
        const result = normalize('/foo/bar//baz/asdf/quux/..');
        expect(result).toBe('/foo/bar/baz/asdf');
    });

    it('should normalize \'/foo/bar//baz/asdf/../quux/\'', () => {
        const result = normalize('/foo/bar//baz/asdf/../quux/');
        expect(result).toBe('/foo/bar/baz/quux/');
    });

    it('should join(/foo, bar, baz/asdf, quux, ..)', () => {
        const result = join('/foo', 'bar', 'baz/asdf', 'quux', '..');
        expect(result).toBe('/foo/bar/baz/asdf');
    });

});
