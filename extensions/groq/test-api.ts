/**
 * Groq 测试 API 导出
 *
 * 本文件重新导出 Groq 媒体理解提供者，供测试模块使用。
 * 这种分离导出的模式确保测试代码可以独立访问提供者实例，
 * 而不需要经过完整的插件注册流程。
 */
export { groqMediaUnderstandingProvider } from "./media-understanding-provider.js";
