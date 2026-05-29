/**
 * AWS 凭证刷新模块
 *
 * 本文件处理 AWS 共享配置文件的缓存刷新，确保 Bedrock API 调用使用最新凭证。
 *
 * 刷新逻辑：
 * - 仅在使用共享配置文件（非静态环境变量）时刷新
 * - 跳过 AWS_BEDROCK_SKIP_AUTH 和 AWS_BEARER_TOKEN_BEDROCK 场景
 * - 通过 loadSharedConfigFiles({ ignoreCache: true }) 强制重新读取
 *
 * 为什么需要刷新：
 * AWS SSO 临时凭证可能在会话期间过期，
 * 通过在每次 API 调用前刷新配置缓存，
 * 确保能获取到最新的 SSO token 或 assume role 凭证。
 */
type SharedIniFileLoader = {
  loadSharedConfigFiles(init?: { ignoreCache?: boolean }): Promise<unknown>;
};

let sharedIniFileLoaderForTest: SharedIniFileLoader | null | undefined;

function hasStaticAwsCredentialEnv(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
}

export function shouldRefreshAwsSharedConfigCacheForBedrock(env: NodeJS.ProcessEnv): boolean {
  if (env.AWS_BEDROCK_SKIP_AUTH === "1" || env.AWS_BEARER_TOKEN_BEDROCK) {
    return false;
  }
  return !hasStaticAwsCredentialEnv(env);
}

async function loadSharedIniFileLoader(): Promise<SharedIniFileLoader> {
  if (sharedIniFileLoaderForTest !== undefined) {
    if (!sharedIniFileLoaderForTest) {
      throw new Error("AWS shared INI file loader unavailable");
    }
    return sharedIniFileLoaderForTest;
  }
  return (await import("@smithy/shared-ini-file-loader")) as SharedIniFileLoader;
}

export async function refreshAwsSharedConfigCacheForBedrock(
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (!shouldRefreshAwsSharedConfigCacheForBedrock(env)) {
    return;
  }
  const loader = await loadSharedIniFileLoader();
  await loader.loadSharedConfigFiles({ ignoreCache: true });
}

export function setAwsSharedIniFileLoaderForTest(
  loader: SharedIniFileLoader | null | undefined,
): void {
  sharedIniFileLoaderForTest = loader;
}
