import pino from "pino";

/**
 * ANSI 颜色代码
 */
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	dim: "\x1b[2m",
	// 前景色
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	// 背景色
	bgBlack: "\x1b[40m",
	bgRed: "\x1b[41m",
	bgGreen: "\x1b[42m",
	bgYellow: "\x1b[43m",
	bgBlue: "\x1b[44m",
	bgMagenta: "\x1b[45m",
	bgCyan: "\x1b[46m",
	bgWhite: "\x1b[47m",
} as const;

/**
 * 创建 pino 日志实例
 * @param options 日志配置选项
 * @returns pino 日志实例
 */
export function createLogger(options?: {
	name?: string;
	level?: string;
}) {
	const isDevelopment = process.env.DEVELOPMENT_MODE === "true";

	const logger = pino({
		name: options?.name,
		level: options?.level || (isDevelopment ? "debug" : "info"),
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
				ignore: "pid,hostname",
				sync: true, // 使用同步模式，确保日志立即输出
			},
		},
	});

	// 添加自定义的result方法,与原来的logger兼容
	const loggerWithResult = logger as typeof logger & {
		result: typeof logger.info;
		success: (message: string) => void;
		box: (title: string, content: string[], width?: number) => void;
		divider: (char?: string, width?: number) => void;
		progress: (current: number, total: number, label?: string) => void;
		raw: (message: string) => void;
		flush: () => Promise<void>;
	};

	loggerWithResult.result = logger.info.bind(logger);

	// 刷新日志缓冲区,确保所有日志都已输出
	loggerWithResult.flush = async () => {
		// pino-pretty 虽然设置了同步模式,但仍可能有微小延迟
		// 等待足够时间确保日志完全输出
		await new Promise((resolve) => setTimeout(resolve, 300));
	};

	// 原始输出方法，用于不需要时间戳的输出（如进度条、box等）
	loggerWithResult.raw = (message: string) => {
		process.stdout.write(message);
	};

	// 成功日志 (绿色)
	loggerWithResult.success = (message: string) => {
		logger.info(`${colors.green}${message}${colors.reset}`);
	};

	// 带边框的信息框
	loggerWithResult.box = (title: string, content: string[], width = 80) => {
		const topBorder = `╔${"═".repeat(width - 2)}╗`;
		const bottomBorder = `╚${"═".repeat(width - 2)}╝`;
		const emptyLine = `║${" ".repeat(width - 2)}║`;

		const lines: string[] = [];
		lines.push(`\n${colors.cyan}${topBorder}${colors.reset}`);

		// 标题居中
		const titlePadding = Math.floor((width - 2 - title.length) / 2);
		const titleLine = `║${" ".repeat(titlePadding)}${colors.bright}${title}${colors.reset}${" ".repeat(width - 2 - titlePadding - title.length)}${colors.cyan}║${colors.reset}`;
		lines.push(titleLine);

		lines.push(`${colors.cyan}${emptyLine}${colors.reset}`);

		// 内容行
		for (const line of content) {
			// 移除 ANSI 代码来计算实际长度
			// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI 转义码需要使用控制字符
			const strippedLine = line.replace(/\x1b\[[0-9;]*m/g, "");
			const padding = " ".repeat(Math.max(0, width - 2 - strippedLine.length));
			lines.push(
				`${colors.cyan}║${colors.reset}${line}${padding}${colors.cyan}║${colors.reset}`,
			);
		}

		lines.push(`${colors.cyan}${bottomBorder}${colors.reset}\n`);

		// 使用 raw 方法输出，避免 pino 添加时间戳
		loggerWithResult.raw(lines.join("\n"));
	};

	// 分隔线
	loggerWithResult.divider = (char = "─", width = 80) => {
		loggerWithResult.raw(
			`${colors.dim}${char.repeat(width)}${colors.reset}\n`,
		);
	};

	// 进度条
	loggerWithResult.progress = (current: number, total: number, label = "") => {
		const percentage = Math.round((current / total) * 100);
		const filledWidth = Math.floor((current / total) * 30);
		const emptyWidth = 30 - filledWidth;
		const progressBar = `[${"█".repeat(filledWidth)}${" ".repeat(emptyWidth)}]`;

		const progressText = label
			? `${label} ${progressBar} ${current}/${total} (${percentage}%)`
			: `${progressBar} ${current}/${total} (${percentage}%)`;

		// 清除当前行并使用 \r 回到行首实现进度条动态更新
		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(`${colors.cyan}${progressText}${colors.reset}`);

		// 完成时换行
		if (current === total) {
			process.stdout.write("\n");
		}
	};

	return loggerWithResult;
}

// 创建默认日志实例
const defaultLogger = createLogger();

// 导出默认日志实例的方法
export const debug = defaultLogger.debug.bind(defaultLogger);
export const info = defaultLogger.info.bind(defaultLogger);
export const warn = defaultLogger.warn.bind(defaultLogger);
export const error = defaultLogger.error.bind(defaultLogger);
export const result = defaultLogger.info.bind(defaultLogger); // 兼容原有的result方法
export const success = defaultLogger.success.bind(defaultLogger);
export const box = defaultLogger.box.bind(defaultLogger);
export const divider = defaultLogger.divider.bind(defaultLogger);
export const progress = defaultLogger.progress.bind(defaultLogger);
export const raw = defaultLogger.raw.bind(defaultLogger);
export const flush = defaultLogger.flush.bind(defaultLogger);

// 创建命名空间日志实例的工具函数
export const useLogger = (namespace?: string) =>
	createLogger({ name: namespace });

// 导出颜色常量供其他模块使用
export { colors };
