import { crc32 } from './hash';
import {
	type FeedInfo,
	type Env,
	type DataJSON,
	time, bot, getFeed, u32hex,
	findHostInFeedInput,
	DEBUG, WARN, ERROR,
	packFeedInfo, unpackFeedInfo,
} from './util';

// read compile-time data made by build script
import { default as __UNTYPED_DATA } from './data.json';

const DATA: DataJSON = __UNTYPED_DATA;

// i have started to store the packed version of FeedInfo inside the metadata
// since it's limited to 4KiB and apparently much faster.
// anyway this value is just a placeholder for now :)
const KV_VALUE_PLACEHOLDER = ':D';

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext
	): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (request.method === 'GET' && pathname === '/ls') {
			const items: Record<string, any> = {};

			for (const feedItem of DATA.feeds) {
				const feedItemHostCRC32 = u32hex(crc32(findHostInFeedInput(feedItem)));
				const feedStorageKey = `F:${feedItemHostCRC32}`;

				const data = await env.KV_STORAGE.getWithMetadata(feedStorageKey);

				items[feedItemHostCRC32] = (typeof data.metadata === 'string')
					? { ...unpackFeedInfo(data.metadata), feedItem }
					: null;
			}

			return new Response(
				JSON.stringify(items),
				{headers: {'Content-Type': 'application/json'}}
			);
		}

		return new Response(`${request.method} ${request.url}`);
	},

	async scheduled(
		_controller: ScheduledController,
		env: Env,
		_ctx: ExecutionContext
	): Promise<void> {
		const cronFreqMinutes = +DATA.cronTriggerFreqMinutes;
		// cron job is set for every X minute
		// every X minutes makes Z=(60/X) times in each hour
		// a day has 24 hours
		// thus worker is invoked Y=(Z*24) times a day
		// the feeds array must be (Y) items maximum
		const now = new Date();
		const minutesSinceMidnight = (now.getHours() * 60) + now.getMinutes();
		const currentFeedIndex = (~~(minutesSinceMidnight / cronFreqMinutes)) % DATA.feeds.length;
		const currentFeedUrl = DATA.feeds[currentFeedIndex]!;
		const feedUrlHostCRC32 = u32hex(crc32(
				// fix for feedUrls like ":items=||*[class=wrapper]||li|a/https://staniks.github.io/articles"
				// should only hash the url part -------------------------^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
				// since the morss.it option part may change later
				findHostInFeedInput(currentFeedUrl)
			));
		const feedStorageKey = `F:${feedUrlHostCRC32}`;

		DEBUG(
			'cronFreqMinutes=', cronFreqMinutes,
			',now=', now,
			',minutesSinceMidnight=', minutesSinceMidnight
		);
		DEBUG(
			'currentFeedIndex=', currentFeedIndex,
			',DATA.feeds.length=', DATA.feeds.length,
			',feedUrl=', currentFeedUrl,
			',feedStorageKey=', feedStorageKey
		);

		const meta = (await env.KV_STORAGE.getWithMetadata(feedStorageKey))?.metadata;

		const feedInfo: FeedInfo = (typeof meta === 'string')
				? unpackFeedInfo(meta) // unpack from stored metadata
				: { lastTry: time(), lastOK: 0, fetchedCRC32Hashes: [] };

		DEBUG('meta=', meta, 'feedInfo=', feedInfo);

		const feedItems = await getFeed(currentFeedUrl);

		feedInfo!.lastTry = time();

		if (feedItems == null || feedItems.length == 0) {
			return WARN('empty feed items? possibly. ending...');
		} else {
			feedInfo!.lastOK = feedInfo!.lastTry;

			// since new items are at the end, process those first :)
			for (let i = feedItems.length-1; i >= 0; --i) {
				const feedItem = feedItems[i]!;
				const feedItemID: number = crc32(feedItem.url || feedItem.title || '');

				DEBUG('feedItem=', feedItem, 'feedItemID=', feedItemID);

				if (feedInfo!.fetchedCRC32Hashes.includes(feedItemID)) {
					DEBUG(`feedItemID=${feedItemID} is duplicate :#`);
					continue;
				}

				const ok = await bot(DATA.tgAPIToken, 'sendMessage', {
					chat_id: DATA.destChatId,
					text: DATA.postFormat
							.replaceAll('\\n', '\n')
							.replaceAll('{TITLE}', feedItem.title || '[RSS_TITLE]')
							.replaceAll('{URL}', feedItem.url || '[RSS_URL]')
							.replaceAll('{DESC}', feedItem.desc || '[RSS_DESC]')
							// .replaceAll('{CONTENT}', f.content || '[RSS_CONTENT]')
							.replaceAll('{TIME}', feedItem.time || '[RSS_TIME]'),
					parse_mode: DATA.postParseMode,
					link_preview_options: JSON.stringify({prefer_large_media: true})
				});

				if (!ok) {
					ERROR('there was an error submitting the post :(')
					continue;
				}

				// success!
				feedInfo!.fetchedCRC32Hashes.push(feedItemID);
			}

			// save the last 50 items and prevent this array getting bigger
			if (feedInfo!.fetchedCRC32Hashes.length > 50)
				feedInfo!.fetchedCRC32Hashes = feedInfo.fetchedCRC32Hashes.slice(-50);
		}

		await env.KV_STORAGE.put(
			feedStorageKey, KV_VALUE_PLACEHOLDER,
			{ metadata: packFeedInfo(feedInfo) }
		);
	}
};
