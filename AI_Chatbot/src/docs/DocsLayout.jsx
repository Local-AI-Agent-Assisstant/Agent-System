import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { BookOpen, Zap, Brain, Mic, Wrench, Network, FolderOpen, LifeBuoy, ChevronRight, ArrowLeft, Menu, X, Globe, Calculator, Mail, Terminal, FileEdit, CloudSun, MousePointerClick, MonitorPlay } from "lucide-react";

const CONTENTS_ITEMS = [
    { label: "Introduction", icon: BookOpen, to: "/docs" },
    { label: "Installation", icon: Zap, to: "/docs/installation" },
    { label: "Tools System", icon: Wrench, to: "/docs/tools" },
    { label: "Voice Assistant", icon: Mic, to: "/docs/voice" },
    { label: "Thinker Mode", icon: Brain, to: "/docs/thinker" },
    { label: "Files & Uploads", icon: FolderOpen, to: "/docs/files" },
    { label: "Architecture", icon: Network, to: "/docs/mcp" },
    { label: "Troubleshooting", icon: LifeBuoy, to: "/docs/troubleshooting" },
];

const TOOLS_ITEMS = [
    { label: "Computer Control", icon: MousePointerClick, to: "/docs/tools/computer-control" },
    { label: "System Actions", icon: MonitorPlay, to: "/docs/tools/system-actions" },
    { label: "System Commands", icon: Terminal, to: "/docs/tools/system-commands" },
    { label: "Web Search", icon: Globe, to: "/docs/tools/web-search" },
    { label: "Routine", icon: Zap, to: "/docs/tools/routine" },
    { label: "Task Planner", icon: Brain, to: "/docs/tools/task-planner" },
    { label: "Email Integration", icon: Mail, to: "/docs/tools/email" },
    { label: "Weather", icon: CloudSun, to: "/docs/tools/weather" },
    { label: "Calculator", icon: Calculator, to: "/docs/tools/calculator" },
    { label: "File Management", icon: FileEdit, to: "/docs/tools/write-files" },
];

function NavSection({ label, items, onClose }) {
    return (
        <div>
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-neutral-500">
                {label}
            </p>

            <div className="flex flex-col gap-0.5 mb-6">
                {items.map(({ label: itemLabel, icon: Icon, to }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/docs"}
                        onClick={onClose}
                        className={({ isActive }) =>
                            [
                                "group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150",
                                isActive
                                    ? "bg-zinc-200 dark:bg-neutral-700/60 text-zinc-900 dark:text-neutral-100"
                                    : "text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-neutral-100 hover:bg-zinc-100 dark:hover:bg-neutral-800/60",
                            ].join(" ")
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={15}
                                    className={
                                        isActive
                                            ? "text-violet-500"
                                            : "text-zinc-400 dark:text-neutral-500 group-hover:text-zinc-700 dark:group-hover:text-neutral-300 transition-colors"
                                    }
                                />

                                <span className="flex-1">
                                    {itemLabel}
                                </span>

                                {isActive && (
                                    <ChevronRight
                                        size={13}
                                        className="text-zinc-400 dark:text-neutral-500"
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
}

export default function DocsLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const theme = localStorage.getItem("theme") || "dark";
        document.documentElement.classList.toggle("dark", theme === "dark");
    }, []);

    const bg = "bg-white dark:bg-neutral-900";
    const text = "text-zinc-900 dark:text-neutral-100";
    const border = "border-zinc-200 dark:border-neutral-800";
    const hdr = "bg-white/80 dark:bg-neutral-900/80";
    const muted = "text-zinc-500 dark:text-neutral-400";
    const divider = "bg-zinc-200 dark:bg-neutral-800";

    return (
        <div
            className={`min-h-screen ${bg} ${text} flex flex-col transition-colors duration-200`}
        >
            {/* Top bar */}
            <header
                className={`sticky top-0 z-40 h-14 flex items-center gap-4 px-4 border-b ${border} ${hdr} backdrop-blur-md`}
            >
                <button
                    onClick={() => navigate("/")}
                    className={`flex items-center gap-1.5 text-sm ${muted} hover:text-zinc-900 dark:hover:text-neutral-100 transition-colors`}
                >
                    <ArrowLeft size={15} />
                    Back to App
                </button>

                <div className={`w-px h-5 ${divider}`} />

                <span className="text-sm font-semibold tracking-wide text-zinc-800 dark:text-neutral-200">
                    Documentation
                </span>

                {/* Mobile hamburger */}
                <button
                    className={`ml-auto md:hidden ${muted} hover:text-current transition`}
                    onClick={() => setSidebarOpen((p) => !p)}
                >
                    {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </header>

            <div className="flex flex-1 min-h-0 relative">
                {/* Sidebar */}
                <aside
                    className={[
                        "fixed md:sticky top-14 z-30 h-[calc(100vh-3.5rem)]",
                        `w-64 shrink-0 ${bg} border-r ${border}`,
                        "overflow-y-auto no-scrollbar transition-transform duration-300",
                        sidebarOpen
                            ? "translate-x-0"
                            : "-translate-x-full md:translate-x-0",
                    ].join(" ")}
                >
                    <nav className="py-6 px-3 flex flex-col gap-0">
                        <NavSection
                            label="Contents"
                            items={CONTENTS_ITEMS}
                            onClose={() => setSidebarOpen(false)}
                        />

                        <div className={`h-px ${divider} mb-6`} />

                        <NavSection
                            label="Tools"
                            items={TOOLS_ITEMS}
                            onClose={() => setSidebarOpen(false)}
                        />
                    </nav>
                </aside>

                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-20 bg-black/50 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <main className="flex-1 min-w-0 px-6 md:px-12 lg:px-20 py-10 max-w-4xl mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}