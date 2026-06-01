import { Terminal, ShieldAlert, ArrowRight, AlertCircle, Code2 } from "lucide-react";
import { Link } from "react-router-dom";

const FUNCTIONS = [
    {
        name: "ipconfig",
        desc: "Retrieve local network configuration information.",
    },
    {
        name: "netstat",
        desc: "Display active network connections and listening ports.",
    },
    {
        name: "wifi status",
        desc: "Show current wireless adapter and connection information.",
    },
    {
        name: "system info",
        desc: "Retrieve general Windows system information.",
    },
    {
        name: "ping",
        desc: "Test connectivity to a remote host.",
    },
];

const CAPABILITIES = [
    {
        icon: Terminal,
        title: "Network Diagnostics",
        desc: "Inspect network adapters, active connections, interface status, and connectivity information.",
    },
    {
        icon: Code2,
        title: "System Information",
        desc: "Retrieve local system, hardware, and device information using predefined diagnostic tools.",
    },
    {
        icon: ShieldAlert,
        title: "Restricted Execution",
        desc: "Only predefined diagnostic commands are available to ensure safe system interaction.",
    },
];

const EXAMPLE_QUERIES = [

    {
        phrase: "Show my network configuration",
        result: "Returns local IP and adapter information",
    },
    {
        phrase: "Check active network connections",
        result: "Displays current network connections and ports",
    },
    {
        phrase: "Show Wi-Fi adapter status",
        result: "Returns wireless interface information",
    },
    {
        phrase: "Ping google.com",
        result: "Tests network connectivity to the host",
    },
    {
        phrase: "Show detailed system information",
        result: "Returns Windows system details",
    },
];

export default function SystemCommands() {
    return (
        <div className="space-y-14">
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                    <Terminal size={12} /> System Diagnostics
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">System Commands</h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Access predefined system diagnostics, network tools, and device information directly through the AI assistant interface.
                </p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-rose-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Tool Functions</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Function</span><span className="pl-6">Description</span>
                    </div>
                    {FUNCTIONS.map(({ name, desc }) => (
                        <div
                            key={name}
                            className="grid grid-cols-[1fr_2fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm font-mono text-rose-300">
                                {name}
                            </span>

                            <span className="text-xs text-zinc-600 dark:text-neutral-400 pl-6">
                                {desc}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Interface Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Interface Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Preview of system diagnostics, network information, and command confirmation inside the interface.
                    </p>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40 h-[320px] flex items-center justify-center">
                    <p className="text-xs text-zinc-500 dark:text-neutral-600">
                        Preview Placeholder
                    </p>
                </div>
            </section>


            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Example Usage</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">Example prompts that trigger the system diagnostics tool.</p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-rose-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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

            <section className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />

                <div>
                    <p className="text-sm font-medium text-rose-300 mb-1">
                        Restricted Access
                    </p>

                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        The diagnostics tool only allows predefined system and network commands. Arbitrary shell execution and file modification are restricted.
                    </p>
                </div>
            </section>

            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link to="/docs/tools/write-files" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all">
                    Next: File Management <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
