const DEFAULT_LOGIN_TITLE = "NAS \u6587\u4ef6\u6d4f\u89c8\u5668";

export function getLoginTitle(configuredName: string): string {
  const normalizedName = configuredName.trim();

  return normalizedName && normalizedName !== "File Browser"
    ? normalizedName
    : DEFAULT_LOGIN_TITLE;
}

export function getLogoutReasonText(reason: unknown): string {
  if (reason == null) {
    return "";
  }

  switch (reason) {
    case "unknown":
      return "\u60a8\u5df2\u9000\u51fa\u767b\u5f55";
    case "logout":
      return "\u5df2\u6210\u529f\u9000\u51fa\u767b\u5f55";
    case "expired":
      return "\u4f1a\u8bdd\u5df2\u8fc7\u671f\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55";
    default:
      return "\u8bf7\u91cd\u65b0\u767b\u5f55";
  }
}
