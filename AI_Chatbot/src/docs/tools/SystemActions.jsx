import { MonitorPlay, XSquare, Zap, ArrowRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const FUNCTIONS = [
    {
        name: "open program",
        desc: "Launch an application, file, or folder by name or absolute path.",
    },
    {
        name: "close program",
        desc: "Close running applications while protecting critical system processes.",
    },
];

const CAPABILITIES = [
    {
        icon: MonitorPlay,
        title: "Program Launching",
        desc: "Instantly open installed software like Chrome, Calculator, or local files and folders.",
    },
    {
        icon: XSquare,
        title: "Process Termination",
        desc: "Close running or unresponsive applications using controlled system actions.",
    },
    {
        icon: Zap,
        title: "Smart Path Resolution",
        desc: "Automatically locates installed applications, common folders, and executable paths.",
    },
];

const EXAMPLE_QUERIES = [
    {
        phrase: "Open Calculator",
        result: "Launches the Windows Calculator app.",
    },
    {
        phrase: "Close Microsoft Word",
        result: "Closes the Microsoft Word application.",
    },
    {
        phrase: "Open my documents folder",
        result: "Opens the Documents directory in File Explorer.",
    },
];

export default function SystemActions() {
    return (
        <div className="space-y-14">
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
                    <MonitorPlay size={12} /> Application Control
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">System Actions</h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Interact with the operating system to open, close, and manage local applications, files, and folders.
                </p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-orange-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Available Functions</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Function</span><span className="pl-6">Description</span>
                    </div>
                    {FUNCTIONS.map(({ name, desc }) => (
                        <div
                            key={name}
                            className="grid grid-cols-[1fr_2fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm font-mono text-orange-400">
                                {name}
                            </span>
                            <span className="text-xs text-zinc-600 dark:text-neutral-400 pl-6">
                                {desc}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Example Usage</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">Example prompts that trigger the system actions tool.</p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-orange-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Example Prompt</span><span>Assistant Response</span>
                    </div>
                    {EXAMPLE_QUERIES.map(({ phrase, result }, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4">
                            <span className="text-sm text-zinc-800 dark:text-neutral-200 font-mono">&ldquo;{phrase}&rdquo;</span>
                            <span className="text-xs text-zinc-500 dark:text-neutral-500 text-right whitespace-nowrap">{result}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-orange-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-orange-300 mb-1">
                        Safe Termination Restrictions
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        The close process function maintains a strict blacklist of critical system processes (like explorer.exe and svchost.exe) to ensure system stability and prevent accidental termination of essential Windows services.
                    </p>
                </div>
            </section>

            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link to="/docs/tools/system-commands" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all">
                    Next: System Commands <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
