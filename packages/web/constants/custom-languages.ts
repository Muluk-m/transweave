/**
 * 自定义语言配置（临时存储，主要用于回退和缓存）
 * 实际数据从 Project.languageLabels 字段获取
 */
export const CustomLanguages: Record<string, string> = {};

/**
 * 统一获取语言显示名称的工具函数
 * @param code 语言代码
 * @param projectLanguageLabels 项目级别的自定义语言标签（从 Project.languageLabels 传入）
 * @returns 语言的中文备注，如果没有则返回 code 本身
 */
export function getLanguageLabel(
  code: string,
  projectLanguageLabels?: Record<string, string>
): string {
  // 动态导入 Languages 避免循环依赖
  const { Languages } = require('./languages');
  
  // 优先从内置语言中查找
  if (Languages.has(code)) {
    return Languages.raw(code)?.label || code;
  }
  
  // 然后从项目级别的自定义语言中查找
  if (projectLanguageLabels && projectLanguageLabels[code]) {
    return projectLanguageLabels[code];
  }
  
  // 再从全局临时存储中查找（用于回退）
  if (CustomLanguages[code]) {
    return CustomLanguages[code];
  }
  
  // 都找不到则返回 code 本身
  return code;
}

/**
 * 格式化语言显示（带 code）
 * @param code 语言代码
 * @param projectLanguageLabels 项目级别的自定义语言标签
 * @returns 格式化后的显示字符串，如 "中文 (zh-CN)"
 */
export function formatLanguageDisplay(
  code: string,
  projectLanguageLabels?: Record<string, string>
): string {
  const label = getLanguageLabel(code, projectLanguageLabels);
  return `${label} (${code})`;
}

/**
 * 检查是否为内置语言
 * @param code 语言代码
 * @returns 是否为内置语言
 */
export function isBuiltInLanguage(code: string): boolean {
  const { Languages } = require('./languages');
  return Languages.has(code);
}

/**
 * 检查是否为自定义语言
 * @param code 语言代码
 * @returns 是否为自定义语言
 */
export function isCustomLanguage(code: string): boolean {
  return code in CustomLanguages;
}
