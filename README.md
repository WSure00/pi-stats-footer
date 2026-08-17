# pi-stats-footer

A compact, responsive two-line status footer for [pi](https://pi.dev).

```text
Claude · high │ ↑20k ↓1.5k │ cache 90% │ ctx 16%/1M │ $0.13 │ working 5s
task Refactor the payment module…
```

## Features

- Model name + thinking level
- Session token totals (↑ input / ↓ output)
- Prompt cache hit rate
- Context window usage with color thresholds (green < 60%, yellow ≥ 60%, red ≥ 80%)
- Session cost
- Live working timer while the agent runs
- Current task (last user message) on a second, dimmed line
- Width-aware rendering: segments drop gracefully on narrow terminals

## Install

From git:

```bash
pi install git:github.com/YOUR_USER/pi-stats-footer
```

From a local clone:

```bash
pi install /path/to/pi-stats-footer
```

Try without installing:

```bash
pi -e /path/to/pi-stats-footer
```

Manage with `pi config` (enable/disable) and `pi remove <source>` (uninstall).

## License

MIT
