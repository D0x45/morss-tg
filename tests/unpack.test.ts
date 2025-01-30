import { unpackFeedInfo } from "../src/util";

test('packFeedInfo', () => {
    expect(unpackFeedInfo('0000000000000001'))
        .toStrictEqual({
            lastTry: 0,
            lastOK: 1,
            fetchedCRC32Hashes: []
        });

    expect(unpackFeedInfo('0000001000000011'))
        .toStrictEqual({
            lastTry: 16,
            lastOK: 17,
            fetchedCRC32Hashes: []
        });

    expect(unpackFeedInfo('000000FF000000FF'))
        .toStrictEqual({
            lastTry: 255,
            lastOK: 255,
            fetchedCRC32Hashes: []
        });

    expect(unpackFeedInfo('000000FF000000FF00000000'))
        .toStrictEqual({
            lastTry: 255,
            lastOK: 255,
            fetchedCRC32Hashes: [0]
        });

    expect(unpackFeedInfo('000000FF000000FF000000FF000000000000000F'))
        .toStrictEqual({
            lastTry: 255,
            lastOK: 255,
            fetchedCRC32Hashes: [255,0,15]
        });
});
