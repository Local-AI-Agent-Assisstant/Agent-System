import {
    Brain, LifeBuoy, Mic, FileText, Network, Wrench,
    ArrowRight, Cpu, Zap, Globe
} from "lucide-react";
import { Link } from "react-router-dom";

const FEATURE_CARDS = [
    {
        icon: Zap,
        color: "emerald",
        title: "Installation",
        desc: "Set up the assistant, configure your environment, and get the backend running locally.",
        href: "/docs/installation",
    },
    {
        icon: Wrench,
        color: "orange",
        title: "Tool System",
        desc: "Integrated tools for productivity, automation, search, file handling, and system interaction.",
        href: "/docs/tools",
    },
    {
        icon: Mic,
        color: "sky",
        title: "Voice Assistant",
        desc: "Real-time voice interaction with speech recognition and local text-to-speech responses.",
        href: "/docs/voice",
    },
    {
        icon: FileText,
        color: "indigo",
        title: "File Analysis",
        desc: "Upload documents and images for summarization, analysis, and AI-assisted querying.",
        href: "/docs/files",
    },
    {
        icon: Network,
        color: "violet",
        title: "Architecture",
        desc: "Overview of the assistant backend, tool execution flow, and system communication.",
        href: "/docs/mcp",
    },
    {
        icon: LifeBuoy,
        color: "rose",
        title: "Troubleshooting",
        desc: "Diagnose common issues, error codes, and configuration problems with the assistant.",
        href: "/docs/troubleshooting",
    },
];

const COLOR_MAP = {
    emerald: {
        bg: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
        icon: "text-emerald-400",
        border: "border-emerald-500/20",
        glow: "group-hover:shadow-emerald-500/10",
    },
    orange: {
        bg: "bg-orange-500/10 group-hover:bg-orange-500/20",
        icon: "text-orange-400",
        border: "border-orange-500/20",
        glow: "group-hover:shadow-orange-500/10",
    },
    sky: {
        bg: "bg-sky-500/10 group-hover:bg-sky-500/20",
        icon: "text-sky-400",
        border: "border-sky-500/20",
        glow: "group-hover:shadow-sky-500/10",
    },
    amber: {
        bg: "bg-amber-500/10 group-hover:bg-amber-500/20",
        icon: "text-amber-400",
        border: "border-amber-500/20",
        glow: "group-hover:shadow-amber-500/10",
    },
    rose: {
        bg: "bg-rose-500/10 group-hover:bg-rose-500/20",
        icon: "text-rose-400",
        border: "border-rose-500/20",
        glow: "group-hover:shadow-rose-500/10",
    },
    violet: {
        bg: "bg-violet-500/10 group-hover:bg-violet-500/20",
        icon: "text-violet-400",
        border: "border-violet-500/20",
        glow: "group-hover:shadow-violet-500/10",
    },
    indigo: {
        bg: "bg-indigo-500/10 group-hover:bg-indigo-500/20",
        icon: "text-indigo-400",
        border: "border-indigo-500/20",
        glow: "group-hover:shadow-indigo-500/10",
    },
};

const OVERVIEW_ITEMS = [
    {
        icon: Brain,
        title: "AI Assistant",
        desc: "Handles conversations, responses, and smart interactions.",
    },
    {
        icon: Wrench,
        title: "Integrated Tools",
        desc: "Provides productivity, automation, file handling, and utility tools.",
    },
    {
        icon: Mic,
        title: "Voice Interaction",
        desc: "Supports speech input and spoken AI responses.",
    },
    {
        icon: FileText,
        title: "File Processing",
        desc: "Analyze documents, images, and uploaded files directly inside conversations.",
    },
    {
        icon: Globe,
        title: "Real-Time Responses",
        desc: "Streams responses and updates dynamically while interacting with the assistant.",
    },
    {
        icon: Cpu,
        title: "Local AI Support",
        desc: "Supports local AI runtimes and private on-device processing.",
    },
];

function FeatureCard({ icon: Icon, color, title, desc, href }) {
    const c = COLOR_MAP[color];
    return (
        <Link
            to={href}
            className={[
                "group relative p-5 rounded-xl border bg-zinc-100 dark:bg-neutral-800/40 backdrop-blur-sm",
                "transition-all duration-200 cursor-pointer",
                "hover:bg-zinc-200 dark:hover:bg-neutral-800/70",
                "border-zinc-200 dark:border-neutral-800",
                "dark:hover:border-neutral-700 hover:shadow-xl hover:-translate-y-0.5",
                c.border,
                c.glow,
            ].join(" ")}
        >
            <div className={["w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors", c.bg].join(" ")}>
                <Icon size={20} className={c.icon} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1.5">{title}</h3>
            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
        </Link>
    );
}

export default function Introduction() {
    return (
        <div className="space-y-16">
            {/* ── Hero ── */}
            <section className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    AI Assistant Platform
                </div>

                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100 leading-tight">
                    Welcome to the{" "}
                    <span className="bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
                        Documentation
                    </span>
                </h1>

                <p className="text-lg text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    A local AI assistant with voice interaction, task planning, file analysis,
                    and extensible tools powered by an MCP-based backend.
                </p>

                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/docs/Installation"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                    >
                        Get Started <ArrowRight size={15} />
                    </Link>
                    <Link
                        to="/docs/mcp"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-colors"
                    >
                        Architecture
                    </Link>
                </div>
            </section>

            {/* ── Feature Cards ── */}
            <section>
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-neutral-200 mb-6">
                    What's inside
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FEATURE_CARDS.map((card) => (
                        <FeatureCard key={card.title} {...card} />
                    ))}
                </div>
            </section>

            {/* ── System Overview ── */}
            <section>
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-neutral-200 mb-2">
                    System Overview
                </h2>
                <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
                    Main features and capabilities of the assistant.
                </p>
                <div className="divide-y divide-zinc-200 dark:divide-neutral-800 rounded-xl border border-zinc-200 dark:border-neutral-800 overflow-hidden">
                    {OVERVIEW_ITEMS.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="flex items-start gap-4 px-5 py-4 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-zinc-200 dark:bg-neutral-700/50 flex items-center justify-center">
                                <Icon size={15} className="text-zinc-500 dark:text-neutral-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-800 dark:text-neutral-200 mb-0.5">{title}</p>
                                <p className="text-xs text-zinc-500 dark:text-neutral-500 leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Footer nudge ── */}
            <section className="pb-10 border-t border-zinc-200 dark:border-neutral-800 pt-8">
                <p className="text-sm text-zinc-500 dark:text-neutral-500">
                    Start with{" "}
                    <Link to="/docs/installation" className="text-violet-400 hover:underline">
                        Installation
                    </Link>{" "}
                    if this is your first time using the project.
                </p>
            </section>
        </div>
    );
}
