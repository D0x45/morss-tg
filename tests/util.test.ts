import { findHostInFeedInput } from '../src/util';

test('findHostInFeedInput(string)', () => {
    expect(findHostInFeedInput('https://google.com/'))
        .toBe('google.com');
    expect(findHostInFeedInput('http://WwW.GoOgLe.CoM/'))
        .toBe('www.google.com');
    expect(findHostInFeedInput(':items=||*[class=wrapper]||li|a/https://staniks.github.io/articles'))
        .toBe('staniks.github.io');
    expect(findHostInFeedInput(':items=||*[class=wrapper]||li|a/http://staniks.github.io/articles'))
        .toBe('staniks.github.io');
    expect(findHostInFeedInput('https://timotijhof.net/feed/'))
        .toBe('timotijhof.net');
    expect(() => findHostInFeedInput('ftp://timotijhof.net/feed/'))
        .toThrow();
    expect(() => findHostInFeedInput(''))
        .toThrow();
    expect(() => findHostInFeedInput('httpz://timotijhof.net/feed/'))
        .toThrow();
});
