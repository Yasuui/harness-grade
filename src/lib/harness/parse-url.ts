export type ParsedSource =
  | {
      type: "github";
      owner: string;
      repo: string;
      ref?: string;
      file?: string;
      url: string;
    }
  | { type: "web"; url: string }
  | { type: "paste" }
  | { type: "empty" };

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);
const RAW_HOSTS = new Set(["raw.githubusercontent.com"]);

export function parseSource(raw: string): ParsedSource {
  const trimmed = raw.trim();
  if (!trimmed) return { type: "empty" };

  const shorthand = trimmed.match(
    /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:@([A-Za-z0-9._/-]+))?$/,
  );
  if (shorthand && !trimmed.includes("://") && !trimmed.includes(".")) {
    const owner = shorthand[1];
    const repo = shorthand[2];
    const ref = shorthand[3];
    return {
      type: "github",
      owner,
      repo,
      ref,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return { type: "empty" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { type: "empty" };
  }

  const host = url.hostname.toLowerCase();

  if (GITHUB_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const repo = parts[1]?.replace(/\.git$/, "");
    if (!owner || !repo) return { type: "web", url: url.toString() };
    let ref: string | undefined;
    let file: string | undefined;
    if (parts[2] === "tree" && parts[3]) {
      ref = parts[3];
      if (parts.length > 4) file = parts.slice(4).join("/");
    } else if (parts[2] === "blob" && parts[3]) {
      ref = parts[3];
      file = parts.slice(4).join("/");
    }
    return {
      type: "github",
      owner,
      repo,
      ref,
      file,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  if (RAW_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const owner = parts[0];
    const repo = parts[1];
    const ref = parts[2];
    const file = parts.slice(3).join("/");
    if (owner && repo) {
      return {
        type: "github",
        owner,
        repo,
        ref,
        file,
        url: `https://github.com/${owner}/${repo}`,
      };
    }
  }

  return { type: "web", url: url.toString() };
}

const PRIVATE_HOST =
  /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|\[::1\]|.*\.local$|.*\.internal$)/i;

export function isBlockedHost(hostname: string): boolean {
  return PRIVATE_HOST.test(hostname);
}

export function assertSafeHttpUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("That host cannot be fetched");
  }
  return url;
}
