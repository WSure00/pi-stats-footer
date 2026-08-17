/** Compact, responsive two-line status footer for pi. */

import type { AssistantMessage, Usage } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

type UsageTotals = Pick<
	Usage,
	"input" | "output" | "cacheRead" | "cacheWrite"
> & {
	cost: number;
};

type RenderTui = { requestRender(force?: boolean): void };

const THINKING_THEME_COLOR = {
	off: "thinkingOff",
	minimal: "thinkingMinimal",
	low: "thinkingLow",
	medium: "thinkingMedium",
	high: "thinkingHigh",
	xhigh: "thinkingXhigh",
	max: "thinkingMax",
} as const;

export function formatTokens(count: number): string {
	if (count < 1_000) return String(count);
	if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

export function formatDuration(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1_000));
	const hours = Math.floor(totalSeconds / 3_600);
	const minutes = Math.floor((totalSeconds % 3_600) / 60);
	const seconds = totalSeconds % 60;
	if (hours > 0) return `${hours}h${minutes}m${seconds}s`;
	if (minutes > 0) return `${minutes}m${seconds}s`;
	return `${seconds}s`;
}

function emptyUsageTotals(): UsageTotals {
	return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
}

function addUsage(totals: UsageTotals, usage: Usage | undefined): void {
	if (!usage) return;
	totals.input += usage.input;
	totals.output += usage.output;
	totals.cacheRead += usage.cacheRead;
	totals.cacheWrite += usage.cacheWrite;
	totals.cost += usage.cost.total;
}

export function collectSessionStats(entries: readonly SessionEntry[]): {
	usage: UsageTotals;
} {
	const usage = emptyUsageTotals();

	for (const entry of entries) {
		if (entry.type === "message" && entry.message.role === "assistant") {
			const message = entry.message as AssistantMessage;
			addUsage(usage, message.usage);
			continue;
		}
		if (entry.type === "message" && entry.message.role === "toolResult") {
			addUsage(usage, entry.message.usage);
			continue;
		}
		if (entry.type === "branch_summary" || entry.type === "compaction") {
			addUsage(usage, entry.usage);
		}
	}

	return { usage };
}

export function calculateCacheHitRate(usage: UsageTotals): number | null {
	const promptTokens = usage.input + usage.cacheRead + usage.cacheWrite;
	return promptTokens > 0 ? (usage.cacheRead / promptTokens) * 100 : null;
}

function sanitizeStatusText(text: string): string {
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}

function messageText(content: unknown): string {
	if (typeof content === "string") return sanitizeStatusText(content);
	if (!Array.isArray(content)) return "";
	return sanitizeStatusText(
		content
			.flatMap((part) => {
				if (
					typeof part === "object" &&
					part !== null &&
					(part as { type?: unknown }).type === "text" &&
					typeof (part as { text?: unknown }).text === "string"
				) {
					return [(part as { text: string }).text];
				}
				return [];
			})
			.join(" "),
	);
}

function findLastUserTask(entries: readonly SessionEntry[]): string {
	for (let index = entries.length - 1; index >= 0; index--) {
		const entry = entries[index];
		if (entry.type === "message" && entry.message.role === "user") {
			return messageText(entry.message.content);
		}
	}
	return "";
}

function joinSegments(segments: string[], separator: string): string {
	return segments.filter(Boolean).join(separator);
}

function fitSegments(
	segments: string[],
	separator: string,
	width: number,
): string {
	if (width <= 0 || segments.length === 0) return "";
	// The first segment (model + thinking level) has top priority. If it
	// alone is wider than the terminal, show a truncated prefix of it
	// instead of skipping it in favor of lower-priority segments.
	if (visibleWidth(segments[0]) > width) {
		return truncateToWidth(segments[0], width, "...");
	}
	const fitted: string[] = [segments[0]];
	for (const segment of segments.slice(1)) {
		const candidate = joinSegments([...fitted, segment], separator);
		if (visibleWidth(candidate) <= width) fitted.push(segment);
	}
	return truncateToWidth(joinSegments(fitted, separator), width, "");
}

export default function statsFooter(pi: ExtensionAPI) {
	let tuiRef: RenderTui | null = null;
	let timer: ReturnType<typeof setInterval> | null = null;
	let runStart: number | null = null;
	let lastRunDuration = 0;
	let lastTask = "";

	const rerender = () => tuiRef?.requestRender();
	const stopTimer = () => {
		if (timer !== null) clearInterval(timer);
		timer = null;
	};

	pi.on("session_start", (_event, ctx) => {
		stopTimer();
		runStart = null;
		lastRunDuration = 0;
		lastTask = findLastUserTask(ctx.sessionManager.getBranch() as SessionEntry[]);
		if (ctx.mode !== "tui") return;

		ctx.ui.setFooter((tui, theme, footerData) => {
			tuiRef = tui;
			const unsubscribeBranch = footerData.onBranchChange(rerender);

			return {
				dispose() {
					unsubscribeBranch();
					stopTimer();
					tuiRef = null;
				},
				invalidate() {},
				render(width: number): string[] {
					if (width <= 0) return [];
					const entries = ctx.sessionManager.getEntries() as SessionEntry[];
					const { usage } = collectSessionStats(entries);
					const cacheRate = calculateCacheHitRate(usage);
					const context = ctx.getContextUsage();
					const contextWindow =
						context?.contextWindow ?? ctx.model?.contextWindow ?? 0;
					const contextPercent = context?.percent ?? null;

					let contextColor: "dim" | "success" | "warning" | "error" = "dim";
					if (contextPercent !== null) {
						if (contextPercent >= 80) contextColor = "error";
						else if (contextPercent >= 60) contextColor = "warning";
						else contextColor = "success";
					}

					const modelName = ctx.model?.name || ctx.model?.id || "no-model";
					const thinkingLevel = ctx.thinkingLevel || "off";
					const contextText =
						contextPercent === null
							? `ctx ?/${formatTokens(contextWindow)}`
							: `ctx ${contextPercent.toFixed(0)}%/${formatTokens(contextWindow)}`;
					const separator = theme.fg("borderMuted", " │ ");
					const elapsed =
						runStart === null ? lastRunDuration : Date.now() - runStart;
					const thinkingColor =
						THINKING_THEME_COLOR[
							thinkingLevel as keyof typeof THINKING_THEME_COLOR
						] ?? "thinkingMedium";
					let thinkingText: string;
					try {
						thinkingText = `* ${theme.fg(thinkingColor, thinkingLevel)}`;
					} catch {
						// thinkingMax is optional in themes; fall back to a vivid level.
						thinkingText = `* ${theme.fg("thinkingHigh", thinkingLevel)}`;
					}
					const statsLine = fitSegments(
						[
							`${theme.fg("accent", modelName)} ${thinkingText}`,
							theme.fg(
								"dim",
								`↑${formatTokens(usage.input)} ↓${formatTokens(usage.output)}`,
							),
							theme.fg(
								"dim",
								`cache ${cacheRate === null ? "-" : `${cacheRate.toFixed(0)}%`}`,
							),
							theme.fg(contextColor, contextText),
							theme.fg("dim", `$${usage.cost.toFixed(usage.cost < 1 ? 3 : 2)}`),
							theme.fg("accent", `working ${formatDuration(elapsed)}`),
						],
						separator,
						width,
					);

					const arrow = theme.fg("accent", "->");
					const taskBudget = Math.max(0, width - visibleWidth(arrow) - 1);
					const taskBody = truncateToWidth(lastTask || "*", taskBudget, "...");
					const progressLine = `${arrow} ${theme.fg("dim", taskBody)}`;

					// Safety net: never return a line wider than the terminal.
					return [statsLine, progressLine].map((line) =>
						truncateToWidth(line, width, ""),
					);
				},
			};
		});
	});

	pi.on("agent_start", () => {
		if (runStart === null) runStart = Date.now();
		lastRunDuration = 0;
		stopTimer();
		timer = setInterval(rerender, 1_000);
		rerender();
	});
	pi.on("before_agent_start", (event) => {
		lastTask = sanitizeStatusText(event.prompt);
		rerender();
	});
	pi.on("agent_settled", () => {
		if (runStart !== null) lastRunDuration = Date.now() - runStart;
		runStart = null;
		stopTimer();
		rerender();
	});
	pi.on("session_shutdown", () => {
		stopTimer();
		tuiRef = null;
		runStart = null;
		lastRunDuration = 0;
	});
	pi.on("message_end", rerender);
	pi.on("thinking_level_select", rerender);
	pi.on("model_select", rerender);
	pi.on("session_info_changed", rerender);
}
