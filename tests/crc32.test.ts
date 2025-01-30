import { crc32 } from '../src/hash';
import { u32hex } from '../src/util';

test('crc32(string)', () => {
    expect(u32hex(crc32('Hello, World!'))).toBe('EC4AC3D0');
    expect(u32hex(crc32('I Hate This Life!'))).toBe('3BF874E0');
    expect(u32hex(crc32(''))).toBe('00000000');
    expect(u32hex(crc32('meow meow'))).toBe('D2624711');
});