"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, ShieldCheck, ChevronDown, Key } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface UserMenuProps {
  user: UserProfile | null;
  onSignInClick: () => void;
  onSignOut: () => void;
}

export default function UserMenu({ user, onSignInClick, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={onSignInClick}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
      >
        <User size={14} />
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 pl-3 border-l border-neutral-200 dark:border-neutral-800 hover:opacity-80 transition-opacity focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-[#1E293B] dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
          {user.initials || "FA"}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-tight">
            {user.name}
          </span>
          <span className="text-[10px] text-neutral-400">
            {user.role}
          </span>
        </div>
        <ChevronDown size={14} className="text-neutral-400 hidden md:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-60 bg-white dark:bg-[#111827] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-2 animate-fade-in text-neutral-800 dark:text-neutral-200">
          {/* Header Info */}
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 mb-1">
            <p className="text-xs font-bold text-neutral-900 dark:text-white">{user.name}</p>
            <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-900">
              <ShieldCheck size={12} />
              <span>{user.role}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-0.5 text-xs">
            <button
              onClick={() => {
                setIsOpen(false);
                toast.info("Account settings panel opened.");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors text-left"
            >
              <Settings size={14} />
              <span>Account Settings</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                toast.info("API Key: geotrack_live_948194a28f");
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors text-left"
            >
              <Key size={14} />
              <span>API Access Keys</span>
            </button>
          </div>

          {/* Sign Out Button */}
          <div className="pt-1 mt-1 border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left font-medium text-xs"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
