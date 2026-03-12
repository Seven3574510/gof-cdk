import CryptoJS from "crypto-js";
import { useLogger } from "./logger";
import type { InputObject } from "./types";

// 创建日志记录器
const logger = useLogger("Utils");

/**
 * 睡眠函数
 * @param ms 睡眠毫秒数
 * @returns {Promise<void>} 延迟Promise
 */
export const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 生成带签名的请求对象（兼容中文CDK，避免签名计算异常）
 * @param inputObject 原始请求对象
 * @param signSalt 签名盐
 * @returns {InputObject & { sign: string }} 带签名的请求对象
 */
export function generateSignedObject(
	inputObject: InputObject,
	signSalt: string,
): InputObject & { sign: string } {
	try {
		const sortedQueryString = Object.keys(inputObject)
			.sort()
			.map((key) => {
				let value = inputObject[key];
				// 处理值：对象转JSON，基础类型转字符串
				value = typeof value === "object" 
					? JSON.stringify(value) 
					: String(value);
				// 关键修改：对中文/特殊字符做URI编码，保证签名一致性
				const encodedValue = encodeURIComponent(value);
				return `${key}=${encodedValue}`;
			})
			.join("&");

		const sign = CryptoJS.MD5(sortedQueryString + signSalt).toString();

		return { sign, ...inputObject };
	} catch (error) {
		logger.error({ err: error }, "生成签名对象时出错");
		throw new Error(
			`生成签名失败: ${error instanceof Error ? error.message : "未知错误"}`,
		);
	}
}

/**
 * 安全地解析JSON
 * @param json JSON字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析后的对象
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
	try {
		return JSON.parse(json) as T;
	} catch (error) {
		logger.warn(
			`解析JSON失败，使用默认值: ${error instanceof Error ? error.message : "未知错误"}`,
		);
		return defaultValue;
	}
}

/**
 * 检测字符串（如CDK）是否包含中文
 * @param str 要检测的字符串
 * @returns {boolean} 包含中文返回true，否则false
 */
export function hasChineseChar(str: string): boolean {
	if (typeof str !== "string") return false;
	// 匹配所有常见中文字符（简体+繁体）
	const chineseReg = /[\u4e00-\u9fa5\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}]/u;
	return chineseReg.test(str);
}

/**
 * 过滤字符串中的所有中文（保留其他字符）
 * @param str 要过滤的字符串
 * @returns {string} 过滤后的字符串
 */
export function filterChineseChar(str: string): string {
	if (typeof str !== "string") return str;
	const chineseReg = /[\u4e00-\u9fa5\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\u{2ceb0}-\u{2ebef}\u{30000}-\u{3134f}]/gu;
	return str.replace(chineseReg, "");
}