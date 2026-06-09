import { useState } from "react";
import { Wrench, ShieldCheck, ToggleRight, AlertCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ToolsPreview from "../assets/tools-preview.mp4";

const TOOLS = [
    {
        name: "Computer Control",
        category: "System",
        desc: "Automate Windows UI by reading the screen, clicking elements, and typing text.",
        href: "/docs/tools/computer-control",
    },
    {
        name: "System Actions",
        category: "System",
        desc: "Open and close programs, files, and folders on your computer.",
        href: "/docs/tools/system-actions",
    },
    {
        name: "System Commands",
        category: "System",
        desc: "Run local system commands and retrieve system information.",
        href: "/docs/tools/system-commands",
    },
    {
        name: "Web Search",
        category: "Web",
        desc: "Search the web, retrieve online information, and analyze search results.",
        href: "/docs/tools/deep-search",
    },
    {
        name: "Routine Manager",
        category: "Planner",
        desc: "Create and manage recurring routines, schedules, and daily activities.",
        href: "/docs/tools/routine",
    },
    {
        name: "Task Planner",
        category: "Planner",
        desc: "Create, organize, and manage tasks and productivity plans.",
        href: "/docs/tools/task-planner"
    },
    {
        name: "Email Integration",
        category: "Email",
        desc: "Send and manage emails directly through the assistant.",
        href: "/docs/tools/email",
    },
    {
        name: "Weather",
        category: "Web",
        desc: "Get weather forecasts, live conditions, and smart recommendations.",
        href: "/docs/tools/weather",
    },
    {
        name: "Calculator",
        category: "Utility",
        desc: "Perform calculations, unit conversions, and currency conversions.",
        href: "/docs/tools/calculator",
    },
    {
        name: "File Management",
        category: "Files",
        desc: "Create, read, edit, analyze, and manage local files directly through the assistant.",
        href: "/docs/tools/write-files",
    },
];

const CATEGORY_COLORS = {
    Web: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    Email: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Files: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    System: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    Planner: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    Utility: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export default function ToolsSystem() {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
                    <Wrench size={12} />
                    Integrated Tools
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Tools System
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    The assistant includes integrated tools for productivity, automation, web access,
                    file management, task organization, and local system interaction.
                </p>
            </section>

            {/* Permission model */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Tool Permissions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            icon: ShieldCheck,
                            color: "text-emerald-400",
                            bg: "bg-emerald-500/10",
                            title: "Ask every time",
                            desc: "Default. Tool execution requires confirmation before running.",
                        },
                        {
                            icon: ToggleRight,
                            color: "text-violet-400",
                            bg: "bg-violet-500/10",
                            title: "Always allow",
                            desc: "Allows the selected tool to run without repeated confirmation during the current session.",
                        },
                        {
                            icon: AlertCircle,
                            color: "text-rose-400",
                            bg: "bg-rose-500/10",
                            title: "Deny",
                            desc: "The request is rejected and the tool call is cancelled.",
                        },
                    ].map(({ icon: Icon, color, bg, title, desc }) => (
                        <div key={title} className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors">
                            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                                <Icon size={15} className={color} />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tool registry */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Integrated Tools</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">
                    Tools can be individually enabled, disabled, and managed through the assistant interface.
                </p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_2fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Tool</span>
                        <span>Category</span>
                        <span className="pl-6">Description</span>
                    </div>
                    {TOOLS.map(({ name, category, desc, href }) => (
                        <Link
                            to={href}
                            key={name}
                            className="group grid grid-cols-[1fr_auto_2fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:border-l hover:border-l-orange-400 hover:translate-x-0.5 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm font-mono text-zinc-800 dark:text-neutral-200">{name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[category]}`}>
                                {category}
                            </span>
                            <span className="text-xs text-zinc-600 dark:text-neutral-400 pl-6">{desc}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Interface Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Tools Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Preview of the tools sidebar and permission system.
                    </p>
                </div>

                <div
                    onClick={() => setIsOpen(true)}
                    className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 cursor-pointer"
                >
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        controls={false}
                        className="w-full object-cover transition-transform duration-300 hover:scale-[1.01]"
                    >
                        <source src={ToolsPreview} type="video/mp4" />
                    </video>
                </div>
            </section>

            {/* Fullscreen Preview */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        className="w-auto h-auto max-w-[85vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
                    >
                        <source src={ToolsPreview} type="video/mp4" />
                    </video>
                </div>
            )}

            {/* Reset tip */}
            <section className="rounded-xl border border-zinc-300 dark:border-neutral-700/50 bg-zinc-100 dark:bg-neutral-800/30 p-5 flex gap-4">
                <Wrench size={16} className="text-zinc-600 dark:text-neutral-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-neutral-200 mb-1">Resetting permissions</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Resetting permissions clears all previously approved tool permissions for the current environment.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/voice"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-colors"
                >
                    Next: Voice Assistant <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
