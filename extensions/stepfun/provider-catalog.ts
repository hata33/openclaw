/**
 * StepFun（阶跃星辰）Provider 目录配置
 *
 * 本文件定义阶跃星辰提供者的模型目录和常量：
 * 1. Provider ID：stepfun（标准）和 stepfun-plan（推理计划）
 * 2. 四个端点 URL：中国区/国际区 × 标准/Step Plan
 * 3. 默认模型引用：step-3.5-flash
 * 4. 目录构建函数：从插件清单（openclaw.plugin.json）解析模型列表
 *
 * 阶跃星辰的 API 端点按区域（cn/intl）和服务类型（standard/plan）组合。
 */
import { buildManifestModelProviderConfig } from "openclaw/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "openclaw/plugin-sdk/provider-model-shared";
import manifest from "./openclaw.plugin.json" with { type: "json" };

export const STEPFUN_PROVIDER_ID = "stepfun";
export const STEPFUN_PLAN_PROVIDER_ID = "stepfun-plan";

export const STEPFUN_STANDARD_CN_BASE_URL = "https://api.stepfun.com/v1";
export const STEPFUN_STANDARD_INTL_BASE_URL = "https://api.stepfun.ai/v1";
export const STEPFUN_PLAN_CN_BASE_URL = "https://api.stepfun.com/step_plan/v1";
export const STEPFUN_PLAN_INTL_BASE_URL = "https://api.stepfun.ai/step_plan/v1";

const STEPFUN_DEFAULT_MODEL_ID = "step-3.5-flash";
export const STEPFUN_DEFAULT_MODEL_REF = `${STEPFUN_PROVIDER_ID}/${STEPFUN_DEFAULT_MODEL_ID}`;
export const STEPFUN_PLAN_DEFAULT_MODEL_REF = `${STEPFUN_PLAN_PROVIDER_ID}/${STEPFUN_DEFAULT_MODEL_ID}`;

type StepFunManifestProviderId = keyof typeof manifest.modelCatalog.providers;

function buildStepFunManifestProvider(
  providerId: StepFunManifestProviderId,
  baseUrl: string,
): ModelProviderConfig {
  const provider = buildManifestModelProviderConfig({
    providerId,
    catalog: manifest.modelCatalog.providers[providerId],
  });
  return provider.baseUrl === baseUrl ? provider : { ...provider, baseUrl };
}

export function buildStepFunProvider(
  baseUrl: string = STEPFUN_STANDARD_INTL_BASE_URL,
): ModelProviderConfig {
  return buildStepFunManifestProvider(STEPFUN_PROVIDER_ID, baseUrl);
}

export function buildStepFunPlanProvider(
  baseUrl: string = STEPFUN_PLAN_INTL_BASE_URL,
): ModelProviderConfig {
  return buildStepFunManifestProvider(STEPFUN_PLAN_PROVIDER_ID, baseUrl);
}
