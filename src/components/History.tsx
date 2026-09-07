"use client";

import { useEffect, useState } from "react";
import { Trash2, Download, History as HistoryIcon, BarChart3, Globe2, Network, ShieldCheck } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

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

interface HistoryProps {
  history: HistoryItem[];
  onSelect: (query: string) => void;
  onClear: () => void;
}

const COLORS = ["#3b82f6", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981"];

export default function History({ history, onSelect, onClear }: HistoryProps) {
  const [mounted, setMounted] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"list" | "charts">("list");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-neutral-500 animate-pulse">Loading Analytics & History...</div>
      </div>
    );
  }

  // --- Export Handlers ---
  const exportToJSON = () => {
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geotrack_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    if (history.length === 0) return;
    const headers = ["Query", "IP", "City", "Region", "Country", "Country Code", "ISP", "Timestamp"];
    const rows = history.map((item) => [
      `"${item.query}"`,
      `"${item.ip}"`,
      `"${item.city}"`,
      `"${item.region}"`,
      `"${item.country}"`,
      `"${item.country_code}"`,
      `"${item.isp}"`,
      `"${item.timestamp}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geotrack_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Aggregation logic for charts ---
  const getCountryData = () => {
    const counts: Record<string, number> = {};
    history.forEach((h) => {
      counts[h.country] = (counts[h.country] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getISPData = () => {
    const counts: Record<string, number> = {};
    history.forEach((h) => {
      // Shorten long ISP names
      const shortIsp = h.isp.split(" ")[0].slice(0, 15);
      counts[shortIsp] = (counts[shortIsp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // top 5
  };

  const countryData = getCountryData();
  const ispData = getISPData();

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-4">
        <div className="flex gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab("list")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer w-1/2 sm:w-auto ${
              activeSubTab === "list"
                ? "bg-white dark:bg-neutral-800 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-350"
            }`}
          >
            <HistoryIcon size={16} />
            History Log
          </button>
          <button
            onClick={() => setActiveSubTab("charts")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer w-1/2 sm:w-auto ${
              activeSubTab === "charts"
                ? "bg-white dark:bg-neutral-800 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-350"
            }`}
          >
            <BarChart3 size={16} />
            Visual Insights
          </button>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-semibold cursor-pointer"
              title="Export CSV"
            >
              <Download size={14} />
              CSV
            </button>
            <button
              onClick={exportToJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 hover:bg-neutral-50 dark:hover:bg-neutral-850 text-xs font-semibold cursor-pointer"
              title="Export JSON"
            >
              <Download size={14} />
              JSON
            </button>
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold cursor-pointer ml-2"
              title="Clear History"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <HistoryIcon size={48} className="text-neutral-300 dark:text-neutral-700 mb-3 animate-pulse" />
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-lg">No search history</h3>
          <p className="text-sm text-neutral-500 max-w-sm mt-1">
            Perform IP lookups or resolve domains above to populate history logs and analytics.
          </p>
        </div>
      ) : activeSubTab === "list" ? (
        <div className="flex-1 overflow-y-auto max-h-[380px] pr-1">
          <div className="space-y-2.5">
            {history.map((item, index) => (
              <div
                key={index}
                onClick={() => onSelect(item.query)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800/80 bg-white/50 dark:bg-neutral-900/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 hover:border-blue-300 dark:hover:border-blue-900/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-sm font-semibold group-hover:scale-105 transition-transform">
                    {item.country_code !== "UN" ? (
                      <span className="text-lg" title={item.country}>
                        {item.country_code
                          .toUpperCase()
                          .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))}
                      </span>
                    ) : (
                      <Globe2 size={16} />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.query}
                    </div>
                    <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                      <span>{item.city || "Unknown City"}</span>
                      <span className="w-1 h-1 rounded-full bg-neutral-350" />
                      <span className="max-w-[120px] truncate" title={item.isp}>
                        {item.isp}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {item.query !== item.ip && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-mono">
                      {item.ip}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
          {/* Country Pie Chart */}
          <div className="p-4 rounded-xl border border-neutral-250/60 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-900/30 flex flex-col">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe2 size={14} />
              Queries by Country
            </h4>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={countryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {countryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ISP Share Bar Chart */}
          <div className="p-4 rounded-xl border border-neutral-250/60 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-900/30 flex flex-col">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Network size={14} />
              Top Network Providers (ISPs)
            </h4>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ispData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} tickLine={false} axisLine={false} style={{ fontSize: "11px" }} />
                  <Tooltip
                    cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                    {ispData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
