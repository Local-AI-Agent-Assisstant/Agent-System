import { useEffect, useState, useRef } from "react";
import { getModel, setModel, getVoices, setVoice } from "../../api/ChatApi";
import { useNavigate } from "react-router-dom";

function Header({
  isDark,
  apiStatus,
  isSidebarOpen,
  setIsSidebarOpen,
  handleNewChat,
  handleClearChat,
  toggleTheme,
  isToolSidebarOpen,
  setIsToolSidebarOpen,
  isPlannerOpen,
  setIsPlannerOpen,
  plannerTaskCount,
}) {

  const [model, setModelState] = useState("...");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [activeProvider, setActiveProvider] = useState("ollama");
  const menuRef = useRef(null);

  const [voices, setVoices] = useState([]);
  const [activeVoice, setActiveVoice] = useState("...");
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const voiceMenuRef = useRef(null);

  const navigate = useNavigate();

  // 5-minute localStorage cache for static startup data (model / provider / voices)
  // Avoids re-fetching these on every remount or React StrictMode double-invoke.
  const STATIC_CACHE_KEY = "header_static_cache";
  const STATIC_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in ms

  const readStaticCache = () => {
    try {
      const raw = localStorage.getItem(STATIC_CACHE_KEY);
      if (!raw) return null;
      const { ts, model, provider, voices, activeVoice } = JSON.parse(raw);
      if (Date.now() - ts > STATIC_CACHE_TTL) return null; // stale
      return { model, provider, voices, activeVoice };
    } catch { return null; }
  };

  const writeStaticCache = (model, provider, voices, activeVoice) => {
    try {
      localStorage.setItem(STATIC_CACHE_KEY, JSON.stringify({
        ts: Date.now(), model, provider, voices, activeVoice
      }));
    } catch { /* ignore quota errors */ }
  };

  useEffect(() => {
    // Try cache first — avoids any network round-trip on remounts
    const cached = readStaticCache();
    if (cached) {
      setModelState(cached.model);
      setActiveProvider(cached.provider);
      setVoices(cached.voices);
      setActiveVoice(cached.activeVoice);
      return; // cache hit — skip fetch
    }

    // Cache miss or stale — fetch from backend once
    let cancelled = false;
    Promise.all([
      getModel().catch(() => null),
      fetch("http://localhost:8000/api/providers").then(r => r.json()).catch(() => null),
      getVoices().catch(() => null),
    ]).then(([modelRes, providerRes, voicesRes]) => {
      if (cancelled) return;
      const m = modelRes?.model ?? "...";
      const p = providerRes?.active ?? "ollama";
      const v = voicesRes?.ok ? voicesRes.voices : [];
      const av = voicesRes?.ok ? voicesRes.active : "...";
      setModelState(m);
      setActiveProvider(p);
      setVoices(v);
      setActiveVoice(av);
      writeStaticCache(m, p, v, av);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — static startup data only



  const handleModelSelect = async (m, provider) => {
    const formData = new FormData();
    formData.append("provider", provider);
    await fetch("http://localhost:8000/api/providers/switch", {
      method: "POST",
      body: formData
    });
    setActiveProvider(provider);
    await setModel(m);
    setModelState(m);
    setShowModelMenu(false);
    // Invalidate cache so next mount fetches the updated selection
    localStorage.removeItem(STATIC_CACHE_KEY);
  };

  const handleVoiceSelect = async (v) => {
    await setVoice(v);
    setActiveVoice(v);
    setShowVoiceMenu(false);
    // Invalidate cache so next mount fetches the updated selection
    localStorage.removeItem(STATIC_CACHE_KEY);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowModelMenu(false);
      }
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target)) {
        setShowVoiceMenu(false);
      }
    }

    if (showModelMenu || showVoiceMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModelMenu, showVoiceMenu]);

  const isCloud = model.includes("cloud");
  const modelLabel = `${isCloud ? "Cloud" : "Local"} • ${model}`;

  // header word-button style (same as your Clear/Dark mode)
  const headerWordBtn = (extra = "") =>
    "text-[11px] px-3 py-1 rounded-full border transition " +
    extra +
    (isDark
      ? " border-neutral-700 text-neutral-200 hover:bg-neutral-800"
      : " border-zinc-300 text-zinc-700 hover:bg-zinc-200");

  // API badge style: same shape/size as headerWordBtn, but colored
  const apiBadgeClass =
    "text-[11px] px-3 py-1 rounded-full border transition flex items-center gap-2 " +
    (apiStatus === "online"
      ? isDark
        ? "border-emerald-700 text-emerald-200 bg-emerald-900/20"
        : "border-emerald-300 text-emerald-700 bg-emerald-50"
      : apiStatus === "offline"
        ? isDark
          ? "border-red-700 text-red-200 bg-red-900/20"
          : "border-red-300 text-red-700 bg-red-50"
        : isDark
          ? "border-neutral-700 text-neutral-200 bg-neutral-800"
          : "border-zinc-300 text-zinc-700 bg-white");

  const apiDotClass =
    "w-2 h-2 rounded-full " +
    (apiStatus === "online"
      ? "bg-emerald-400"
      : apiStatus === "offline"
        ? "bg-red-400"
        : "bg-zinc-400");

  const apiLabel =
    apiStatus === "online"
      ? "Online"
      : apiStatus === "offline"
        ? "Offline"
        : "Checking";

  return (
    <div>
      {/* FULL-WIDTH HEADER (corners) */}
      <div
        className={
          "px-4 pt-4 pb-3 border-b " +
          (isDark
            ? "bg-neutral-900 border-neutral-800"
            : "bg-zinc-100 border-zinc-200")
        }
      >
        <div className="relative flex items-center w-full">
          {/* LEFT */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((v) => !v)}
              className={headerWordBtn()}
            >
              {isSidebarOpen ? "Hide chats" : "Chats"}
            </button>

            <button
              type="button"
              onClick={handleNewChat}
              className={headerWordBtn()}
            >
              New chat
            </button>

            <button
              type="button"
              onClick={handleClearChat}
              className={headerWordBtn()}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => navigate("/docs")}
              className={headerWordBtn()}
            >
              Docs
            </button>
          </div>

          {/* CENTER */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center flex flex-col items-center">
            <h1 className="text-sm font-semibold">AI Agent</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p
                onClick={() => { setShowModelMenu(v => !v); setShowVoiceMenu(false); }}
                className="text-[11px] opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
              >
                {modelLabel}
              </p>
              <span className="text-[10px] opacity-30">•</span>
              <p
                onClick={() => { setShowVoiceMenu(v => !v); setShowModelMenu(false); }}
                className="text-[11px] opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
              >
                Voice: {activeVoice.replace("en_US-", "").replace("-medium", "")}
              </p>
            </div>
          </div>

          {showModelMenu && (
            <div
              ref={menuRef}
              className={
                "absolute top-12 left-1/2 -translate-x-1/2 z-50 w-52 rounded-xl border shadow-2xl overflow-hidden " +
                (isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-zinc-200")
              }>


              {/* Local Ollama */}
              <div className={
                "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider opacity-50 text-left " +
                (isDark ? "text-neutral-300" : "text-zinc-500")
              }>
                Local (Ollama)
              </div>
              <div className="pb-2">
                {["qwen2.5-coder:7b", "qwen2.5:7b", "qwen3:8b", "deepseek-r1:7b", "deepseek-coder:6.7b"].map(m => {
                  const isActive = model === m && activeProvider === "ollama";
                  return (
                    <button
                      key={m}
                      onClick={() => handleModelSelect(m, "ollama")}
                      className={
                        "w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors " +
                        (isActive
                          ? (isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-700")
                          : (isDark ? "hover:bg-neutral-700 text-neutral-200" : "hover:bg-zinc-100 text-zinc-800"))
                      }
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-[13px]">{m}</span>
                      </div>
                      {isActive && <span className="ml-auto text-purple-400 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className={"mx-3 my-1 border-t " + (isDark ? "border-neutral-700" : "border-zinc-200")} />

              {/* Cloud */}
              <div className={
                "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider opacity-50 text-left " +
                (isDark ? "text-neutral-300" : "text-zinc-500")
              }>
                Cloud (Ollama)
              </div>
              <div className="pb-2">
                {["gpt-oss:120b-cloud", "deepseek-v3.1:671b-cloud", "qwen3-coder:480b-cloud", "qwen3-vl:235b-cloud"].map(m => {
                  const isActive = model === m && activeProvider === "ollama";
                  let badge = null;
                  if (m.includes("gpt") || m.includes("deepseek")) badge = { text: "thinking", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30" };
                  else if (m.includes("coder")) badge = { text: "coder", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30" };
                  else if (m.includes("vl")) badge = { text: "vision", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" };

                  return (
                    <button
                      key={m}
                      onClick={() => handleModelSelect(m, "ollama")}
                      className={
                        "w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors " +
                        (isActive
                          ? (isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-700")
                          : (isDark ? "hover:bg-neutral-700 text-neutral-200" : "hover:bg-zinc-100 text-zinc-800"))
                      }
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-[10px]">{m}</span>
                        {badge && (
                          <span className={`text-[8px] leading-none px-1.5 py-[3px] rounded-full ${badge.color}`}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      {isActive && <span className="ml-auto text-purple-400 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>

            </div>
          )}

          {showVoiceMenu && (
            <div
              ref={voiceMenuRef}
              className={
                "absolute top-12 left-1/2 -translate-x-1/2 z-50 w-52 rounded-xl border shadow-2xl overflow-hidden " +
                (isDark ? "bg-neutral-800 border-neutral-700" : "bg-white border-zinc-200")
              }>
              <div className={
                "px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider opacity-50 text-left " +
                (isDark ? "text-neutral-300" : "text-zinc-500")
              }>
                Installed Voices
              </div>
              <div className="pb-2 max-h-64 overflow-y-auto">
                {voices.map(v => {
                  const isActive = activeVoice === v;
                  return (
                    <button
                      key={v}
                      onClick={() => handleVoiceSelect(v)}
                      className={
                        "w-full flex items-center gap-3 px-3 py-1.5 text-sm transition-colors " +
                        (isActive
                          ? (isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-700")
                          : (isDark ? "hover:bg-neutral-700 text-neutral-200" : "hover:bg-zinc-100 text-zinc-800"))
                      }
                    >
                      <span className="font-medium text-[13px] text-left truncate">{v}</span>
                      {isActive && <span className="ml-auto text-purple-400 text-xs shrink-0">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT */}
          <div className="ml-auto mr-2 flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className={apiBadgeClass}>
              <span className={apiDotClass} />
              API {apiLabel}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className={
                "text-[11px] px-3 py-1 rounded-full border transition " +
                (isDark
                  ? "bg-neutral-800 border-neutral-700"
                  : "bg-white border-zinc-300")
              }
            >
              {isDark ? "Light mode" : "Dark mode"}
            </button>

            <button
              type="button"
              onClick={() => setIsPlannerOpen(v => !v)}
              className={
                "text-[11px] px-3 py-1 rounded-full border transition flex items-center gap-1.5 " +
                (isPlannerOpen
                  ? isDark
                    ? "bg-neutral-800 border-neutral-600"
                    : "bg-zinc-200 border-zinc-400"
                  : isDark
                    ? "border-neutral-700 hover:bg-neutral-800"
                    : "border-zinc-300 hover:bg-zinc-200")
              }
            >
              Planner
              {plannerTaskCount > 0 && (
                <span className="bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {plannerTaskCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsToolSidebarOpen(v => !v)}
              className={
                "text-[11px] px-3 py-1 rounded-full border transition " +
                (isToolSidebarOpen
                  ? isDark
                    ? "bg-neutral-800 border-neutral-600"
                    : "bg-zinc-200 border-zinc-400"
                  : isDark
                    ? "border-neutral-700 hover:bg-neutral-800"
                    : "border-zinc-300 hover:bg-zinc-200")
              }
            >
              Tools
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
