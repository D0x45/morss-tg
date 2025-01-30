# morss-tg
this is a cloudflare worker script that basically takes a list of feed urls, and
based on the configured cron frequency decides which feed url it has to fetch
at the time it's running.

my approach to saving cpu time and computation (since i'm using the free plan and
i don't intend on paying :p) was to create a `build.js` script which compiles
the list of `feeds.txt` in a few steps:

- read `feeds.txt` and clear the empty lines or the lines that start with `#`
- if there's a `WORKER_CRON` environment variable is provided, parse it
- if there's no `WORKER_CRON` environment variable is provided, calculate the needed
  time frequency.
- then the build script creates the `wrangler.toml` needed by wrangler to publish
  the worker. (i had to make this part a compile-time step since i wanted to
  use sensitive info like kv storage id or worker name hidden)
- the build script also produces a `src/data.json` which is imported by `src/index.ts`
  (see the `DataJSON` interface in `src/util.ts` )
- now the ESBuild bundles the files in `src` and outputs a single `dist/worker.js`
  that is the ACTUAL worker entry point used by `wrangler`

# secrets
to let people fork this repo and publish their changes publicly without worrying
about api keys and sensitive info, the ci workflows uses Github Secrets.
(github secrets get redacted in the build logs or outputs):
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `DST_CHAT`
- `TG_API_TOKEN`
- `WORKER_KV_ID`
- `WORKER_NAME`
these secret variable names are pretty self-explanatory except `DST_CHAT`! fill
this variable value with the `@username` or numeric `chat_id` of a Telegram chat.
(NOTE that these chat ids must be valid to Telegram's bot api)

# environment variables
there are three plain text environment variables that are not sensitive:

- `POST_MARKUP`, Telegram bot api's `parse_mode` field (e.g. `HTML`)
- `WORKER_CRON`, an optional cron string (e.g. `*/5 * * * *`). if not provided
  the build script generates one based on the feeds count.
- `POST_FMT`, the format string containing `{TITLE}`, `{URL}`, `{DESC}` and/or `{TIME}`
