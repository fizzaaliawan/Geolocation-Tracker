from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import requests
import socket
import time
import re

app = FastAPI(
    title="IP Geolocation Tracker API",
    description="Backend API for geolocating IP addresses and resolving domains.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Next.js can run on various local ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for IP locations (TTL = 1 hour)
# Cache format: { "ip_or_domain": (timestamp, result_dict) }
CACHE = {}
CACHE_TTL = 3600  # 1 hour

class GeolocationResponse(BaseModel):
    query: str = Field(..., description="The queried IP address or domain name")
    ip: str = Field(..., description="The resolved target IP address")
    resolved: bool = Field(False, description="True if a domain was resolved to an IP")
    city: str = Field("Unknown", description="City name")
    region: str = Field("Unknown", description="Region or state name")
    country: str = Field("Unknown", description="Country name")
    country_code: str = Field("UN", description="Two-letter ISO country code")
    latitude: float = Field(0.0, description="Latitude coordinate")
    longitude: float = Field(0.0, description="Longitude coordinate")
    timezone: str = Field("UTC", description="IANA Timezone string")
    isp: str = Field("Unknown", description="Internet Service Provider")
    org: str = Field("Unknown", description="Organization name")
    asn: str = Field("Unknown", description="Autonomous System Number")
    zip_code: str = Field("Unknown", description="Postal/ZIP code")
    provider: str = Field(..., description="The metadata source provider")

def resolve_domain(query: str) -> Optional[str]:
    """Resolves a hostname to an IP address. Returns None if invalid or cannot resolve."""
    # Clean query (remove protocols, paths, etc.)
    clean_query = query.strip().lower()
    clean_query = re.sub(r'^https?://', '', clean_query)
    clean_query = clean_query.split('/')[0].split(':')[0]
    
    # Check if already IP address
    if is_valid_ip(clean_query):
        return clean_query
        
    try:
        ip = socket.gethostbyname(clean_query)
        return ip
    except socket.gaierror:
        return None

def is_valid_ip(ip: str) -> bool:
    """Checks if a string is a valid IPv4 or IPv6 address."""
    # Simple check for IPv4
    try:
        socket.inet_pton(socket.AF_INET, ip)
        return True
    except socket.error:
        pass
    # Simple check for IPv6
    try:
        socket.inet_pton(socket.AF_INET6, ip)
        return True
    except socket.error:
        return False

# --- Geolocation Provider Implementations ---

def fetch_ip_api(ip: str) -> Optional[dict]:
    """Fetch from ip-api.com (Free, 45 requests/min)"""
    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query"
        r = requests.get(url, timeout=3)
        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "success":
                return {
                    "ip": data.get("query", ip),
                    "city": data.get("city", "Unknown") or "Unknown",
                    "region": data.get("regionName", "Unknown") or "Unknown",
                    "country": data.get("country", "Unknown") or "Unknown",
                    "country_code": data.get("countryCode", "UN") or "UN",
                    "latitude": data.get("lat", 0.0),
                    "longitude": data.get("lon", 0.0),
                    "timezone": data.get("timezone", "UTC") or "UTC",
                    "isp": data.get("isp", "Unknown") or "Unknown",
                    "org": data.get("org", "Unknown") or "Unknown",
                    "asn": data.get("as", "Unknown") or "Unknown",
                    "zip_code": data.get("zip", "Unknown") or "Unknown",
                    "provider": "ip-api.com"
                }
    except Exception as e:
        print(f"ip-api.com error: {e}")
    return None

def fetch_ipapi_co(ip: str) -> Optional[dict]:
    """Fetch from ipapi.co (Free, 1000 requests/day)"""
    try:
        url = f"https://ipapi.co/{ip}/json/"
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, timeout=3)
        if r.status_code == 200:
            data = r.json()
            if "error" not in data:
                return {
                    "ip": data.get("ip", ip),
                    "city": data.get("city", "Unknown") or "Unknown",
                    "region": data.get("region", "Unknown") or "Unknown",
                    "country": data.get("country_name", "Unknown") or "Unknown",
                    "country_code": data.get("country_code", "UN") or "UN",
                    "latitude": data.get("latitude", 0.0),
                    "longitude": data.get("longitude", 0.0),
                    "timezone": data.get("timezone", "UTC") or "UTC",
                    "isp": data.get("org", "Unknown") or "Unknown",
                    "org": data.get("org", "Unknown") or "Unknown",
                    "asn": data.get("asn", "Unknown") or "Unknown",
                    "zip_code": data.get("postal", "Unknown") or "Unknown",
                    "provider": "ipapi.co"
                }
    except Exception as e:
        print(f"ipapi.co error: {e}")
    return None

def fetch_ipinfo_io(ip: str) -> Optional[dict]:
    """Fetch from ipinfo.io (Free tier, 50k requests/month)"""
    try:
        url = f"https://ipinfo.io/{ip}/json"
        r = requests.get(url, timeout=3)
        if r.status_code == 200:
            data = r.json()
            loc = data.get("loc", "0,0").split(",")
            lat = float(loc[0]) if len(loc) > 0 else 0.0
            lon = float(loc[1]) if len(loc) > 1 else 0.0
            return {
                "ip": data.get("ip", ip),
                "city": data.get("city", "Unknown") or "Unknown",
                "region": data.get("region", "Unknown") or "Unknown",
                "country": data.get("country", "Unknown") or "Unknown",
                "country_code": data.get("country", "UN") or "UN",
                "latitude": lat,
                "longitude": lon,
                "timezone": data.get("timezone", "UTC") or "UTC",
                "isp": data.get("org", "Unknown") or "Unknown",
                "org": data.get("org", "Unknown") or "Unknown",
                "asn": data.get("org", "Unknown").split(" ")[0] if data.get("org") else "Unknown",
                "zip_code": data.get("postal", "Unknown") or "Unknown",
                "provider": "ipinfo.io"
            }
    except Exception as e:
        print(f"ipinfo.io error: {e}")
    return None

# --- Main API Endpoints ---

@app.get("/api/geolocate", response_model=GeolocationResponse)
def geolocate(query: str):
    """
    Geolocate an IP address or resolve a domain name first and then geolocate it.
    Uses sequential failovers across multiple free Geolocation APIs.
    """
    query = query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    # 1. Resolve domain or IP
    target_ip = resolve_domain(query)
    if not target_ip:
        raise HTTPException(status_code=400, detail=f"Failed to resolve host or invalid IP address: '{query}'")

    # 2. Check Cache
    current_time = time.time()
    if target_ip in CACHE:
        timestamp, cached_data = CACHE[target_ip]
        if current_time - timestamp < CACHE_TTL:
            cached_data["query"] = query  # Update query to match original request
            return cached_data

    # 3. Fallback polling mechanism across geolocation providers
    providers = [fetch_ip_api, fetch_ipapi_co, fetch_ipinfo_io]
    geo_data = None
    
    for provider_fn in providers:
        geo_data = provider_fn(target_ip)
        if geo_data:
            break

    if not geo_data:
        raise HTTPException(status_code=502, detail="All geolocation providers failed or rate-limited. Please try again later.")

    # Format output
    result = {
        **geo_data,
        "query": query,
        "resolved": (query.lower() != target_ip.lower() and not is_valid_ip(query))
    }

    # Store in cache
    CACHE[target_ip] = (current_time, result)

    return result

@app.get("/api/my-ip")
def get_client_ip(request: Request):
    """
    Detects the public client IP address based on request headers.
    Falls back to a public lookup if running locally on localhost/loopback.
    """
    # Check headers standard for proxies/CDN
    headers_to_check = [
        "x-forwarded-for",
        "x-real-ip",
        "cf-connecting-ip",
        "fastly-client-ip",
        "true-client-ip"
    ]
    
    detected_ip = None
    for header in headers_to_check:
        val = request.headers.get(header)
        if val:
            # If multiple IPs (X-Forwarded-For: client, proxy1, proxy2), take first
            first_ip = val.split(",")[0].strip()
            if is_valid_ip(first_ip) and not first_ip.startswith("127.") and not first_ip.startswith("192.168.") and not first_ip.startswith("10."):
                detected_ip = first_ip
                break
                
    if not detected_ip:
        # Request client address
        client_host = request.client.host if request.client else None
        if client_host and is_valid_ip(client_host) and not client_host.startswith("127.") and not client_host.startswith("::1"):
            detected_ip = client_host

    # Fallback to fetching server public IP if executing on local dev without public routing headers
    if not detected_ip:
        try:
            r = requests.get("https://api.ipify.org?format=json", timeout=3)
            detected_ip = r.json().get("ip")
        except:
            detected_ip = "127.0.0.1"

    return {"ip": detected_ip}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
