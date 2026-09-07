import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";

const dnsLookup = promisify(dns.lookup);

// In-memory cache for resolved IP locations (TTL = 1 hour)
interface CachedData {
  timestamp: number;
  data: any;
}

const CACHE = new Map<string, CachedData>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper to check valid IP (IPv4 or IPv6)
function isValidIp(ip: string): boolean {
  const ipv4Pattern =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6Pattern =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

// Clean and resolve domain or return raw IP
async function resolveDomain(query: string): Promise<string | null> {
  let clean = query.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, "");
  clean = clean.split("/")[0].split(":")[0];

  if (isValidIp(clean)) {
    return clean;
  }

  try {
    const result = await dnsLookup(clean);
    return result.address || null;
  } catch {
    return null;
  }
}

// Provider 1: ip-api.com
async function fetchIpApi(ip: string) {
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === "success") {
      return {
        ip: data.query || ip,
        city: data.city || "Unknown",
        region: data.regionName || "Unknown",
        country: data.country || "Unknown",
        country_code: data.countryCode || "UN",
        latitude: typeof data.lat === "number" ? data.lat : 0,
        longitude: typeof data.lon === "number" ? data.lon : 0,
        timezone: data.timezone || "UTC",
        isp: data.isp || "Unknown",
        org: data.org || "Unknown",
        asn: data.as || "Unknown",
        zip_code: data.zip || "Unknown",
        provider: "ip-api.com",
      };
    }
  } catch (e) {
    console.error("ip-api.com error:", e);
  }
  return null;
}

// Provider 2: ipapi.co
async function fetchIpapiCo(ip: string) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "GeoTrackApp/1.0" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.error) {
      return {
        ip: data.ip || ip,
        city: data.city || "Unknown",
        region: data.region || "Unknown",
        country: data.country_name || "Unknown",
        country_code: data.country_code || "UN",
        latitude: typeof data.latitude === "number" ? data.latitude : 0,
        longitude: typeof data.longitude === "number" ? data.longitude : 0,
        timezone: data.timezone || "UTC",
        isp: data.org || "Unknown",
        org: data.org || "Unknown",
        asn: data.asn || "Unknown",
        zip_code: data.postal || "Unknown",
        provider: "ipapi.co",
      };
    }
  } catch (e) {
    console.error("ipapi.co error:", e);
  }
  return null;
}

// Provider 3: ipinfo.io
async function fetchIpinfoIo(ip: string) {
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const loc = (data.loc || "0,0").split(",");
    const lat = parseFloat(loc[0]) || 0;
    const lon = parseFloat(loc[1]) || 0;

    return {
      ip: data.ip || ip,
      city: data.city || "Unknown",
      region: data.region || "Unknown",
      country: data.country || "Unknown",
      country_code: data.country || "UN",
      latitude: lat,
      longitude: lon,
      timezone: data.timezone || "UTC",
      isp: data.org || "Unknown",
      org: data.org || "Unknown",
      asn: data.org ? data.org.split(" ")[0] : "Unknown",
      zip_code: data.postal || "Unknown",
      provider: "ipinfo.io",
    };
  } catch (e) {
    console.error("ipinfo.io error:", e);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();

  if (!query) {
    return NextResponse.json(
      { detail: "Query parameter cannot be empty." },
      { status: 400 }
    );
  }

  // 1. Resolve host or IP
  const targetIp = await resolveDomain(query);
  if (!targetIp) {
    return NextResponse.json(
      { detail: `Failed to resolve hostname or invalid IP address: '${query}'` },
      { status: 400 }
    );
  }

  // 2. Check in-memory cache
  const now = Date.now();
  const cached = CACHE.get(targetIp);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cached.data,
      query,
    });
  }

  // 3. Fallback chain across providers
  const providers = [fetchIpApi, fetchIpapiCo, fetchIpinfoIo];
  let geoData = null;

  for (const fetcher of providers) {
    geoData = await fetcher(targetIp);
    if (geoData) break;
  }

  if (!geoData) {
    return NextResponse.json(
      { detail: "All geolocation providers failed or are rate-limited. Please try again later." },
      { status: 502 }
    );
  }

  const result = {
    ...geoData,
    query,
    resolved: query.toLowerCase() !== targetIp.toLowerCase() && !isValidIp(query),
  };

  // Store in cache
  CACHE.set(targetIp, { timestamp: now, data: result });

  return NextResponse.json(result);
}
