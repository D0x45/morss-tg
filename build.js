// @ts-check
// this is the build script :)
const { readFileSync, writeFileSync } = require('fs');
const { build } = require('esbuild');

// constant options
const MIN_CRON_SPAN   = 5; // in minutes, the minimum cron job trigger
const FEED_LIST_INPUT = './feeds.txt'; // feeds file
const SRC_ENTRY       = './src/index.ts'; // entry file to compile for esbuild
const WORKER_MAIN     = './dist/worker.js'; // actual code generated after esbuild compiles
const DATA_JSON       = './src/data.json'; // output data.json that index.ts imports
const KV_BINDING      = 'KV_STORAGE'; // the hardcoded value in worker's code

const __env = {
    'WORKER_NAME':  process.env.WORKER_NAME,
    'WORKER_KV_ID': process.env.WORKER_KV_ID,
    'POST_FMT':     process.env.POST_FMT || '<b>{TITLE}</b>\n{URL}',
    'POST_MARKUP':  process.env.POST_MARKUP || 'HTML',
    'TG_API_TOKEN': process.env.TG_API_TOKEN,
    'DST_CHAT':     process.env.DST_CHAT,
    // cron trigger can be absent, so the build script will
    // calculate it based on the items list
    'WORKER_CRON': process.env.WORKER_CRON || '~'
};

/**
 * rounds the cron frequency to the nearest multiple of MIN_CRON_SPAN
 * @param {number} feedCount
 * @param {number} [min]
 * @see https://stackoverflow.com/questions/3254047/round-number-up-to-the-nearest-multiple-of-3
 */
function calcCronFreq(feedCount, min = undefined) {
    const n = typeof min !== 'number' ? 1 : min;
    if (feedCount <= 0 || n < 1 || n > 60)
        throw new Error(`invalid value feedCount=${feedCount}, n=${n}`);
    const c = Math.floor( Math.floor(1440 / feedCount) / n ) * n;
    if (c < n)
        throw new Error(`frequency of ${c} minutes is less than ${n}`);
    return c;
}

function parseCronStringToMinutes(cron) {
    const [minute, hour, day, month, dayOfWeek] = cron.split(' ', 5);

    if (minute !== '*') {
        const a = (+minute.split('/').at(1) || 0);
        if (a < 1 || a > 59)
            throw new Error('minute should be 1-59');
        return a;
    }

    return 1;
}

function convertMinutesToCronString(m) {
    // there is no toher way of enforcing the HOUR parameter
    // unless the worker itself checks for that...
    m %= 60;
    if (m <= 1) return '* * * * *';
    return `*/${m} * * * *`;
}

const makeSureParamsAreNotUndefined = async () => {
    for (const k in __env) {
        const i = __env[k];
        if (i === null || i === undefined || (typeof i === 'string' && i.length === 0))
            throw new Error(`__env[${k}] has no value!`);
    }
};

const createDataJSON = async () => {
    /** @type {Partial<import('./src/util').DataJSON>} */
    const data = {
        tgAPIToken: __env.TG_API_TOKEN,
        destChatId: __env.DST_CHAT,
        postFormat: __env.POST_FMT,
        postParseMode: __env.POST_MARKUP,
        cronTriggerFreqMinutes: 0,
        feeds: []
    };

    const contentBuffer = readFileSync(FEED_LIST_INPUT, "utf8");

    data.feeds = contentBuffer.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && l.at(0) !== '#');

    if (data.feeds.length === 0)
        throw new Error(`feeds list empty. make sure there are actual rss urls in ${FEED_LIST_INPUT}`);

    if (__env.WORKER_CRON === '~') {
        data.cronTriggerFreqMinutes = calcCronFreq(data.feeds.length, MIN_CRON_SPAN);
        __env.WORKER_CRON = convertMinutesToCronString(data.cronTriggerFreqMinutes);
    } else {
        data.cronTriggerFreqMinutes = parseCronStringToMinutes(__env.WORKER_CRON);
    }

    console.debug(data);
    writeFileSync(DATA_JSON, JSON.stringify(data));
};

const createWranglerTOML = async () => {
    writeFileSync('wrangler.toml',
        `name = "${__env.WORKER_NAME}"\n` +
        `main = "${WORKER_MAIN}"\n` +
        'compatibility_date = "2022-07-12"\n' +
        'no_bundle = true\n' +
        'minify = false\n' +
        `kv_namespaces = [{ binding = "${KV_BINDING}", id = "${__env.WORKER_KV_ID}" }]\n` +
        '[triggers]\n' +
        `crons = [ "${__env.WORKER_CRON}" ]\n`
    );
};

const buildWithESBuild = async () =>
    await build({
        logLevel: 'info',
        entryPoints: [ SRC_ENTRY ],
        bundle: true,
        platform: 'neutral',
        target: 'es2020',
        format: 'esm',
        minify: true,
        // wrangler takes this file as the worker entry:
        outfile: WORKER_MAIN,
        sourcemap: false,
    });

/** @param {Array<() => Promise<any>>} items */
const resolveInOrder = async (items) => {
    for (const f of items)
        await f();
};

if (require.main === module) {
    resolveInOrder([
        makeSureParamsAreNotUndefined,
        createDataJSON,
        createWranglerTOML,
        buildWithESBuild
    ]).catch(err => {
        console.error(err.stack);
        process.exitCode = 1;
    });
} else {
    module.exports = {
        calcCronFreq,
        parseCronStringToMinutes,
        convertMinutesToCronString
    };
}
