import { NextRequest, NextResponse } from "next/server";

function isValidIp(ip: string): boolean {
  const ipv4Pattern =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6Pattern =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

export async function GET(request: NextRequest) {
  // Check headers standard for proxies, CDNs, and Vercel/Cloudflare
  const headersToCheck = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "fastly-client-ip",
    "true-client-ip",
  ];

  let detectedIp: string | null = null;

  for (const header of headersToCheck) {
    const val = request.headers.get(header);
    if (val) {
      const firstIp = val.split(",")[0].trim();
      if (
        isValidIp(firstIp) &&
        !firstIp.startsWith("127.") &&
        !firstIp.startsWith("192.168.") &&
        !firstIp.startsWith("10.") &&
        firstIp !== "::1"
      ) {
        detectedIp = firstIp;
        break;
      }
    }
  }

  // Fallback to external IP provider if running on localhost development
  if (!detectedIp) {
    try {
      const res = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        detectedIp = data.ip;
      }
    } catch {
      detectedIp = "127.0.0.1";
    }
  }

  return NextResponse.json({ ip: detectedIp || "127.0.0.1" });
}
