"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  MapPin,
  Copy,
  Globe2,
  Compass,
  Network,
  Clock,
  Info,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  LayoutDashboard,
  ShieldCheck,
  Radio,
  Building,
  Server,
  X,
  Crosshair,
  BarChart3,
  History as HistoryIcon,
  Settings,
  ChevronDown,
  Layers,
  Code2,
  ArrowUpRight,
  ExternalLink,
  Laptop,
  LocateFixed,
  Sparkles,
  Navigation
} from "lucide-react";
import { Toaster, toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import History from "@/components/History";
import AuthModal from "@/components/AuthModal";
import UserMenu from "@/components/UserMenu";

// Dynamically import Leaflet Map to disable Server Side Rendering (SSR)
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col items-center justify-center animate-pulse">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-sm text-neutral-500 font-medium">Loading interactive map module...</p>
    </div>
  ),
});

interface GeolocationResult {
  query: string;
  ip: string;
  resolved: boolean;
  city: string;
  region: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  org: string;
  asn: string;
  zip_code: string;
  provider: string;
}

interface HistoryItem {
  query: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  country_code: string;
  isp: string;
  timestamp: string;
}

export default function Home() {
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeolocationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [localTime, setLocalTime] = useState("");
  const [activeTab, setActiveTab] = useState<"map" | "overview" | "technical" | "history">("map");
  const [activeNav, setActiveNav] = useState<string>("dashboard");

  // Authentication state
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role: string;
    initials: string;
  } | null>({
    name: "Fizza Ali",
    email: "fizza.ali@geotrack.io",
    role: "Administrator",
    initials: "FA",
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Load history & auth from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("geotrack_history");
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      const savedUser = localStorage.getItem("geotrack_user");
      if (savedUser !== null) {
        setUser(savedUser ? JSON.parse(savedUser) : null);
      }
    } catch (e) {
      console.error("Failed to load session:", e);
    }

    // Run initial lookup for user's IP
    detectMyLocation(true);
  }, []);

  const handleLoginSuccess = (userData: {
    name: string;
    email: string;
    role: string;
    initials: string;
  }) => {
    setUser(userData);
    localStorage.setItem("geotrack_user", JSON.stringify(userData));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.setItem("geotrack_user", "");
    toast.success("Signed out successfully.");
  };

  // Update real-time clock based on target geolocation timezone
  useEffect(() => {
    if (!result?.timezone) return;

    const updateClock = () => {
      try {
        const timeStr = new Date().toLocaleTimeString("en-US", {
          timeZone: result.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        setLocalTime(timeStr);
      } catch (e) {
        setLocalTime(new Date().toLocaleTimeString());
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [result?.timezone]);

  // Save history to localStorage
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("geotrack_history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save search history:", e);
    }
  };

  // Perform Geolocation API query
  const handleLookup = async (targetQuery: string, skipHistory = false) => {
    const trimmed = targetQuery.trim();
    if (!trimmed) {
      toast.error("Please enter an IP address or domain name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/geolocate?query=${encodeURIComponent(trimmed)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Lookup failed. Please check IP format or domain.");
      }

      setResult(data);
      setSearchInput(trimmed);

      // Add to search history if not skipped
      if (!skipHistory) {
        const historyItem: HistoryItem = {
          query: trimmed,
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          country_code: data.country_code,
          isp: data.isp,
          timestamp: new Date().toISOString(),
        };

        const filteredHistory = history.filter(
          (h) => h.query.toLowerCase() !== trimmed.toLowerCase()
        );
        saveHistory([historyItem, ...filteredHistory].slice(0, 30));
      }

      toast.success(`Located: ${data.city || "Unknown"}, ${data.country || "Unknown"}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      toast.error(err.message || "Geolocation fetch error.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect client IP
  const detectMyLocation = async (onLoad = false) => {
    setLoading(true);
    try {
      const response = await fetch("/api/my-ip");
      const data = await response.json();
      if (data.ip) {
        setSearchInput(data.ip);
        await handleLookup(data.ip, onLoad);
      } else {
        throw new Error("Unable to read client IP.");
      }
    } catch (err: any) {
      setError("Unable to auto-detect location. Enter an IP address manually.");
      if (!onLoad) toast.error("IP auto-detection failed.");
    } finally {
      setLoading(false);
    }
  };

  // Detect Exact Device GPS Location via HTML5 Geolocation API + Reverse Geocoding
  const detectExactGpsLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    toast.info("Requesting precise GPS coordinates from your device...", { duration: 4000 });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        try {
          // 1. Fetch client IP & ISP metadata for context
          let clientIp = "";
          let ispInfo = {
            isp: "Unknown ISP",
            org: "Local Network",
            asn: "Unknown",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
          };

          try {
            const ipRes = await fetch("/api/my-ip");
            const ipData = await ipRes.json();
            if (ipData.ip) {
              clientIp = ipData.ip;
              const geoRes = await fetch(`/api/geolocate?query=${encodeURIComponent(clientIp)}`);
              if (geoRes.ok) {
                const geoData = await geoRes.json();
                ispInfo = {
                  isp: geoData.isp || ispInfo.isp,
                  org: geoData.org || ispInfo.org,
                  asn: geoData.asn || ispInfo.asn,
                  timezone: geoData.timezone || ispInfo.timezone,
                };
              }
            }
          } catch (e) {
            console.warn("Could not fetch IP metadata for GPS pinpoint:", e);
          }

          // 2. Reverse geocode the exact coordinates
          const revRes = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          const revData = await revRes.json();

          const exactResult: GeolocationResult = {
            query: `Exact Device GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            ip: clientIp || "Exact Device Coordinates",
            resolved: false,
            city: revData.city || "Exact Location",
            region: revData.region || "Punjab",
            country: revData.country || "Pakistan",
            country_code: revData.country_code || "PK",
            latitude,
            longitude,
            timezone: ispInfo.timezone,
            isp: ispInfo.isp,
            org: `${ispInfo.org} (GPS Pinpoint ±${Math.round(accuracy)}m)`,
            asn: ispInfo.asn,
            zip_code: revData.zip_code || "Unknown",
            provider: revData.provider || "Device GPS (High Accuracy)",
          };

          setResult(exactResult);
          setSearchInput(`${exactResult.city}, ${exactResult.region}`);

          // Save to search history
          const historyItem: HistoryItem = {
            query: `📍 ${exactResult.city}, ${exactResult.region}`,
            ip: exactResult.ip,
            city: exactResult.city,
            region: exactResult.region,
            country: exactResult.country,
            country_code: exactResult.country_code,
            isp: exactResult.isp,
            timestamp: new Date().toISOString(),
          };
          const filteredHistory = history.filter(
            (h) => !h.query.includes(exactResult.city)
          );
          saveHistory([historyItem, ...filteredHistory].slice(0, 30));

          toast.success(`🎯 Exact Location Pinpointed: ${exactResult.city}, ${exactResult.region} (Accuracy: ±${Math.round(accuracy)}m)`);
        } catch (err: any) {
          console.error("GPS Reverse Geocoding failed:", err);
          toast.error("Failed to resolve address for GPS coordinates.");
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        setLoading(false);
        console.error("Geolocation error:", geoError);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please allow location access in your browser pop-up to get exact Sahiwal coordinates.");
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          toast.error("Location information is currently unavailable on this device.");
        } else if (geoError.code === geoError.TIMEOUT) {
          toast.error("Device GPS request timed out.");
        } else {
          toast.error("An error occurred while retrieving device location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const handleClearHistory = () => {
    saveHistory([]);
    toast.success("Search history cleared.");
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Generate Flag Emoji
  const getFlag = (code: string) => {
    if (code === "UN" || !code) return "🏳️";
    const codePoints = code
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    try {
      return String.fromCodePoint(...codePoints);
    } catch (e) {
      return "🏳️";
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0B0F19] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      <Toaster position="bottom-right" richColors />

      {/* --- TOP NAVBAR --- */}
      <header className="w-full bg-white dark:bg-[#111827] border-b border-neutral-200/80 dark:border-neutral-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <MapPin size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight font-display text-neutral-900 dark:text-white">
                GeoTrack
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-200 dark:border-blue-900 uppercase">
                PRO
              </span>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-400 hidden sm:block">
              Advanced full-stack geolocation hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* User Menu / Sign In */}
          <UserMenu
            user={user}
            onSignInClick={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
          />
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* --- MAIN LAYOUT (SIDEBAR + CONTENT) --- */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto p-4 sm:p-6 gap-6">
        
        {/* --- LEFT SIDEBAR NAVIGATION --- */}
        <aside className="w-full md:w-56 shrink-0 flex flex-col justify-between gap-6">
          <div className="space-y-1">
            <button
              onClick={() => { setActiveNav("dashboard"); setActiveTab("map"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === "dashboard"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveNav("lookup"); setActiveTab("overview"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === "lookup"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              }`}
            >
              <Search size={18} />
              <span>IP Lookup</span>
            </button>

            <button
              onClick={() => { setActiveNav("locations"); setActiveTab("map"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === "locations"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              }`}
            >
              <MapPin size={18} />
              <span>Locations</span>
            </button>

            <button
              onClick={() => { setActiveNav("analytics"); setActiveTab("history"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === "analytics"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              }`}
            >
              <BarChart3 size={18} />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => { setActiveNav("history"); setActiveTab("history"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === "history"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              }`}
            >
              <HistoryIcon size={18} />
              <span>History</span>
            </button>

            <button
              onClick={() => { setActiveNav("settings"); setActiveTab("technical"); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeNav === "settings"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              }`}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </div>

          {/* System Online Badge */}
          <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                System Online
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 pl-5">
              All services operational
            </p>
          </div>
        </aside>

        {/* --- MAIN CENTER CONTENT AREA --- */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Dashboard Header Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white font-display">
              Geolocation Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Lookup IP addresses and explore location intelligence data
            </p>
          </div>

          {/* --- TOP 4 METRIC CARDS --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: IP Address */}
            <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Laptop size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-400 font-medium">IP Address</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-sm text-neutral-900 dark:text-white truncate font-mono">
                    {result?.ip || "Detecting..."}
                  </span>
                  {result?.ip && (
                    <button
                      onClick={() => copyToClipboard(result.ip, "IP Address")}
                      className="text-neutral-400 hover:text-blue-600 p-0.5 transition-colors"
                      title="Copy IP"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Location */}
            <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-400 font-medium">Location</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                    {result ? `${result.city || "Unknown"}, ${result.country || "Unknown"}` : "Locating..."}
                  </span>
                  {result?.country_code && (
                    <span className="text-sm shrink-0">{getFlag(result.country_code)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: ISP / Network */}
            <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Network size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-400 font-medium">ISP / Network</p>
                <p className="font-bold text-sm text-neutral-900 dark:text-white truncate mt-0.5">
                  {result?.isp || result?.org || "Network Info"}
                </p>
              </div>
            </div>

            {/* Card 4: Timezone */}
            <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-neutral-400 font-medium">Timezone</p>
                <p className="font-bold text-sm text-neutral-900 dark:text-white truncate mt-0.5 font-mono">
                  {localTime || "00:00:00"}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">
                  {result?.timezone || "UTC"}
                </p>
              </div>
            </div>

          </div>

          {/* --- SEARCH & AUTO-DETECT BAR --- */}
          <div className="flex flex-col gap-2">
            <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-2 sm:p-2.5 shadow-sm flex flex-col lg:flex-row items-center gap-2">
              <div className="relative flex-1 w-full flex items-center">
                <Search size={18} className="absolute left-3.5 text-neutral-400" />
                <input
                  id="search-input-main"
                  type="text"
                  placeholder="Enter IP v4/v6, domain, or city name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup(searchInput)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-transparent text-sm focus:outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-600 p-0.5"
                    title="Clear input"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto shrink-0">
                {/* Button 1: Exact Device GPS */}
                <button
                  onClick={detectExactGpsLocation}
                  disabled={loading}
                  title="Pinpoint your exact device GPS location (Sahiwal)"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <LocateFixed size={15} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  <span>📍 Exact GPS</span>
                </button>

                {/* Button 2: Auto-Detect ISP IP */}
                <button
                  onClick={() => detectMyLocation(false)}
                  disabled={loading}
                  title="Detect your Public IP and ISP Gateway"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Crosshair size={15} className="text-blue-600" />
                  <span>Auto-Detect IP</span>
                </button>

                {/* Button 3: Search */}
                <button
                  onClick={() => handleLookup(searchInput)}
                  disabled={loading}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Search size={15} />
                  <span>{loading ? "Searching..." : "Search Address"}</span>
                </button>
              </div>
            </div>

            {/* Smart Location Advisor Callout */}
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-[12px] text-neutral-600 dark:text-neutral-300">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">i</span>
                <span>
                  <strong className="text-neutral-900 dark:text-white font-medium">ISP Routing:</strong> Pakistani ISPs (PTCL, Jazz, Nayatel) route regional IP pools via Karachi. Click <button onClick={detectExactGpsLocation} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5">📍 Exact GPS</button> to pinpoint your real Sahiwal location.
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">GPS Ready</span>
              </div>
            </div>
          </div>

          {/* --- TABS & CENTER WORKSPACE + RIGHT PANEL --- */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            
            {/* Center Area (Tabs & Map/Views) - 8 cols */}
            <div className="xl:col-span-8 flex flex-col gap-4">
              
              {/* Tab Switcher Pills */}
              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("map")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "map"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <MapPin size={15} />
                  <span>Map</span>
                </button>

                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "overview"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Layers size={15} />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab("technical")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "technical"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <Code2 size={15} />
                  <span>Technical</span>
                </button>

                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "history"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <BarChart3 size={15} />
                  <span>History & Analytics</span>
                </button>
              </div>

              {/* TAB CONTENT: MAP */}
              {activeTab === "map" && (
                <div className="flex flex-col gap-4">
                  {result ? (
                    <Map
                      lat={result.latitude}
                      lon={result.longitude}
                      city={result.city}
                      country={result.country}
                      isp={result.isp}
                      ip={result.ip}
                    />
                  ) : (
                    <div className="w-full h-[480px] bg-white dark:bg-[#111827] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-center text-neutral-400 text-sm">
                      Detecting location coordinates...
                    </div>
                  )}

                  {/* Accuracy Note Callout Banner */}
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 flex items-start gap-3">
                    <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                        Accuracy Note
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-400/80 mt-0.5 leading-relaxed">
                        IP-based geolocation points to server infrastructure routing and is accurate within a city or region. For exact device tracking, real GPS modules are required.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: OVERVIEW */}
              {activeTab === "overview" && result && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                      <Globe2 size={16} className="text-blue-600" /> Geographic Position
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500">Coordinates</span>
                        <span className="font-mono font-semibold">{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500">Postal / ZIP</span>
                        <span className="font-semibold">{result.zip_code || "N/A"}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500">Timezone</span>
                        <span className="font-semibold">{result.timezone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                      <Network size={16} className="text-cyan-600" /> Network Infrastructure
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500">Autonomous System</span>
                        <span className="font-mono font-semibold">{result.asn}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500">Organization</span>
                        <span className="font-semibold truncate max-w-[180px]">{result.org}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-neutral-100 dark:border-neutral-800">
                        <span className="text-neutral-500">Data Source</span>
                        <span className="font-semibold text-blue-600">{result.provider}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TECHNICAL JSON */}
              {activeTab === "technical" && result && (
                <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Raw JSON Telemetry Payload
                    </h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result, null, 2), "JSON Payload")}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      <Copy size={13} /> Copy JSON
                    </button>
                  </div>
                  <pre className="bg-neutral-900 text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed max-h-[450px]">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}

              {/* TAB CONTENT: HISTORY & ANALYTICS */}
              {activeTab === "history" && (
                <div className="bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                  <History
                    history={history}
                    onSelect={(query) => handleLookup(query)}
                    onClear={handleClearHistory}
                  />
                </div>
              )}

            </div>

            {/* --- RIGHT SIDEBAR: "LOCATION INTELLIGENCE" PANEL - 4 cols --- */}
            <div className="xl:col-span-4 bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-5 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <MapPin size={18} className="text-blue-600" />
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  Location Intelligence
                </h2>
              </div>

              {/* Top Key Attributes */}
              <div className="space-y-3.5 text-xs">
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-neutral-500 font-medium">
                    <Laptop size={15} className="text-blue-500 shrink-0" />
                    <span>IP Address</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-neutral-800 dark:text-neutral-100">
                    <span>{result?.ip || "---"}</span>
                    {result?.ip && (
                      <button
                        onClick={() => copyToClipboard(result.ip, "IP Address")}
                        className="text-neutral-400 hover:text-blue-600"
                        title="Copy IP"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-neutral-500 font-medium">
                    <MapPin size={15} className="text-emerald-500 shrink-0" />
                    <span>Location</span>
                  </div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-100 text-right">
                    {result ? `${result.city || "Unknown"}, ${result.country || "Unknown"}` : "---"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-neutral-500 font-medium">
                    <Network size={15} className="text-cyan-500 shrink-0" />
                    <span>ISP / Network</span>
                  </div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-100 text-right truncate max-w-[150px]">
                    {result?.isp || result?.org || "---"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-neutral-500 font-medium">
                    <Clock size={15} className="text-indigo-500 shrink-0" />
                    <span>Timezone</span>
                  </div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-100 text-right">
                    {localTime ? `${localTime} (${result?.timezone || "UTC"})` : "---"}
                  </span>
                </div>

              </div>

              {/* Geographic Breakdowns */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3 text-xs">
                
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Building size={14} className="text-neutral-400" /> Country
                  </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                    {result?.country_code && <span>{getFlag(result.country_code)}</span>}
                    {result?.country || "---"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Layers size={14} className="text-neutral-400" /> Region
                  </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-100">
                    {result?.region || "---"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <MapPin size={14} className="text-neutral-400" /> City
                  </span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-100">
                    {result?.city || "---"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Compass size={14} className="text-neutral-400" /> Latitude
                  </span>
                  <span className="font-bold font-mono text-neutral-800 dark:text-neutral-100">
                    {result ? result.latitude.toFixed(4) : "---"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Compass size={14} className="text-neutral-400" /> Longitude
                  </span>
                  <span className="font-bold font-mono text-neutral-800 dark:text-neutral-100">
                    {result ? result.longitude.toFixed(4) : "---"}
                  </span>
                </div>

              </div>

              {/* Additional Details */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3 text-xs">
                <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Additional Details
                </h3>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Building size={14} className="text-neutral-400" /> Organization
                  </span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100 truncate max-w-[150px]">
                    {result?.org || result?.isp || "---"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Server size={14} className="text-neutral-400" /> AS Number
                  </span>
                  <span className="font-semibold font-mono text-neutral-800 dark:text-neutral-100">
                    {result?.asn || "---"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Radio size={14} className="text-neutral-400" /> IP Type
                  </span>
                  <span className="font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded text-[11px]">
                    {result?.ip && result.ip.includes(":") ? "IPv6" : "IPv4"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium flex items-center gap-2">
                    <Network size={14} className="text-neutral-400" /> Connection Type
                  </span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                    Fixed Line
                  </span>
                </div>

              </div>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}
