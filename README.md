# pi-stats-footer

A compact, responsive **two-line status footer** for [pi](https://pi.dev).
It shows model, tokens, cache hit rate, context usage, cost, run timer,
turn count and the current task — all at a glance while pi works.

```text
Claude Sonnet · high │ ↑20.4k ↓1.5k │ cache 90% │ ctx 16%/1M │ $0.13 │ working 0:05
-> turn 3 │ Refactor the payment module to use the new billing API…
```
<img width="1274" height="96" alt="image" src="https://github.com/user-attachments/assets/c2919cc3-3268-40b5-8851-a13686891f53" />

## Features

### Line 1 — session stats

| Segment | Example | Description |
| --- | --- | --- |
| Model + thinking level | `Claude Sonnet · high` | Current model name (accent color) plus the thinking level, colored per level via theme colors (`thinkingOff` … `thinkingMax`). |
| Session tokens | `↑20.4k ↓1.5k` | Total input (`↑`) and output (`↓`) tokens for the whole session, summed from assistant messages, tool results, branch summaries and compactions. |
| Cache hit rate | `cache 90%` | Prompt-cache hit rate = `cacheRead / (input + cacheRead + cacheWrite)`. Shows `-` when there is no prompt traffic yet. |
| Context usage | `ctx 16%/1M` | Current context window usage as percent / window size, color-coded: green `< 60%`, yellow `≥ 60%`, red `≥ 80%`. Shows `ctx ?/…` when unknown. |
| Session cost | `$0.13` | Accumulated cost of the session (`$0.003` precision below $1). |
| Working timer | `working 0:05` | Live elapsed time of the current agent run (ticks every second); freezes at the final duration once the agent settles (`1:02:03` style once over an hour). |

### Line 2 — current progress

| Segment | Example | Description |
| --- | --- | --- |
| Turn count | `-> turn 3` | Number of user messages on the current branch. Already counts the prompt you just submitted, even before it is persisted to the session. |
| Current task | `Refactor the payment…` | Your last user message, sanitized to a single line and truncated with `…` to fit the terminal width. |

### Behavior

- **Width-aware rendering** — segments are fitted to the terminal width in
  priority order (model first); lower-priority segments drop out gracefully on
  narrow terminals instead of wrapping. The model segment is hard-truncated
  with `…` only if it alone is wider than the terminal.
- **Live updates** — re-renders on branch changes, messages, model/thinking
  level switches and session info changes, plus a 1s ticker while the agent
  runs.
- **Never crashes the TUI** — rendering is fully defensive; on any unexpected
  state the footer simply returns nothing.
- Token counts are formatted compactly: `999`, `9.9k`, `20k`, `1.5M`.

## Styling

The footer uses your pi theme; no hard-coded colors:

- **Model name, `->`, `turn N`, `working` timer** — `accent`
- **Tokens, cache rate, cost, task text** — `dim`
- **Separators (` │ `)** — `borderMuted`
- **Thinking level** — `thinkingOff` / `thinkingMinimal` / `thinkingLow` /
  `thinkingMedium` / `thinkingHigh` / `thinkingXhigh` / `thinkingMax`
  (falls back to `thinkingHigh` if a theme omits `thinkingMax`)
- **Context usage** — `success` (< 60%), `warning` (≥ 60%), `error` (≥ 80%),
  `dim` when unknown

## Install

From npm (recommended):

```bash
pi install npm:pi-stats-footer
pi install npm:pi-stats-footer@0.3.1   # pinned version
```

From git:

```bash
pi install git:github.com/WSure00/pi-stats-footer
```

From a local clone:

```bash
pi install /path/to/pi-stats-footer
```

Try without installing:

```bash
pi -e /path/to/pi-stats-footer
```

### Manage

```bash
pi config                       # enable/disable the extension
pi update npm:pi-stats-footer   # update
pi remove npm:pi-stats-footer   # uninstall
```

## npm

<https://www.npmjs.com/package/pi-stats-footer>

```bash
npm view pi-stats-footer
```

## License

MIT
