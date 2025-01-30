import { packFeedInfo } from "../src/util";

test('packFeedInfo', () => {
    expect(packFeedInfo({
        lastTry: 0,
        lastOK: 1,
        fetchedCRC32Hashes: []
    })).toBe('0000000000000001');

    expect(packFeedInfo({
        lastTry: 16,
        lastOK: 17,
        fetchedCRC32Hashes: []
    })).toBe('0000001000000011');

    expect(packFeedInfo({
        lastTry: 255,
        lastOK: 255,
        fetchedCRC32Hashes: []
    })).toBe('000000FF000000FF');

    expect(packFeedInfo({
        lastTry: 255,
        lastOK: 255,
        fetchedCRC32Hashes: [0]
    })).toBe('000000FF000000FF00000000');

    expect(packFeedInfo({
        lastTry: 255,
        lastOK: 255,
        fetchedCRC32Hashes: [255,0,15]
    })).toBe('000000FF000000FF000000FF000000000000000F');
});
