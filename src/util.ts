export interface FeedInfo {
	lastTry: number,
	lastOK: number,
	fetchedCRC32Hashes: number[],
}

export interface RSSFeedItem {
    title?: string,
    url?: string,
    desc?: string,
    content?: string,
    time?: string,
}

export interface Env {
	KV_STORAGE: KVNamespace<string>
}

export interface DataJSON {
    tgAPIToken: string,
    destChatId: string,
    postFormat: string,
    postParseMode: string,
    cronTriggerFreqMinutes: number,
    feeds: string[]
}

export function time(): number {
    return ~~(Date.now()/1000);
}

export function DEBUG(...args: any[]): void {
    return console.debug(`[${new Date().toISOString()}] [#]`, ...args);
}

export function ERROR(...args: any[]): void {
    return console.error(`[${new Date().toISOString()}] [~]`, ...args);
}

export function WARN(...args: any[]): void {
    return console.error(`[${new Date().toISOString()}] [!]`, ...args);
}

export async function getFeed(feedOptionWithUrl: string): Promise<RSSFeedItem[] | null> {
    try {
        // support having options like :items=... in the input
        if (feedOptionWithUrl.at(0) !== ':')
            feedOptionWithUrl = `/${feedOptionWithUrl}`;

        const response = await fetch(`https://morss.it/:proxy:format=json:cors${feedOptionWithUrl}`);

        if (!response.ok || response.status !== 200)
            throw `status not ok = ${response.status}`;

        const json = await response.json<{
            title?: string,
            desc?: string,
            items?: RSSFeedItem[]
        }>();

        if (
            json && 'items' in json
            && json.items !== undefined
            && Array.isArray(json['items'])
        ) return json.items;

        throw `something went wrong!`;
    } catch (e) {
        ERROR('getFeed(', feedOptionWithUrl , '):', e);
    }
    return null;
}

export async function bot(
    token: string,
    method: string,
    params: Record<string, string>
): Promise<boolean> {
    try {
        const data = new FormData();

        for (const k in params)
        data.set(k, params[k]!);

        const response = await fetch(
            `https://api.telegram.org/bot${token}/${method}`,
            { body: data, method: 'POST' }
        );

        const json = await response.json<{ ok?: boolean }>();

        return !!json && 'ok' in json && json['ok'];
    } catch (e) {
        ERROR('bot(-,', method , ',' , params, '):', e);
    }
    return false;
}

export function findHostInFeedInput(line: string): string {
    const a = line.indexOf('http://');
    const b = line.indexOf('https://');
    const starts = (a < 0) ? ((b >= 0) ? b : -1) : a;
    DEBUG('findHostInFeedInput(',line,') a=', a, 'b=', b, 'starts=', starts);
    const url = new URL(line.slice(starts));
    return url.host.toLowerCase();
}

export function u32hex(c: number): string {
    return ((c < 0) ? (c+0xFFFFFFFF+1) : c).toString(16).toUpperCase().padStart(8, '0');
}

export function packFeedInfo(f: FeedInfo): string {
    // pack all these into one long string
    // TODO: maybe use Variable Length Encoding ?
    return [f.lastTry, f.lastOK, ...f.fetchedCRC32Hashes]
                .map(u32hex).join('');
    //               ^^^^^^
    // these values must be all 32-bit, which means at some point the
    // unix timestamp used here will overflow!
    // also negative values get screwed. sooo... oops :p
}

export function unpackFeedInfo(s: string): FeedInfo {
    if (s.length < 16 || s.length & 7)
        throw new Error('packed string too short or length not a multiple of 8!');

    const info: FeedInfo = {
        lastTry: parseInt(s.slice(0, 8), 16),
        lastOK: parseInt(s.slice(8, 16), 16),
        fetchedCRC32Hashes: []
    };

    for (let i = 16; i < s.length; i += 8)
        info.fetchedCRC32Hashes.push(
            parseInt(s.slice(i, i + 8), 16)
        );

    return info;
}
