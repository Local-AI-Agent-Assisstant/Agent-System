import { Network, Server, Cpu, GitBranch, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import ArchitectureDiagram from "../assets/architecture-diagram.png";

const LAYERS = [
    {
        icon: Cpu,
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        title: "Frontend Interface",
        desc: "Handles conversations, voice interaction, file uploads, and user interface controls.",
    },
    {
        icon: Network,
        color: "text-sky-400",
        bg: "bg-sky-500/10",
        title: "Backend API",
        desc: "Processes requests, manages communication, and streams responses in real time.",
    },
    {
        icon: Server,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        title: "Tools System",
        desc: "Provides integrated assistant tools such as search, planner, weather, email, and file management.",
    },
    {
        icon: GitBranch,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        title: "AI Models",
        desc: "Power conversational responses, reasoning, voice interactions, and contextual understanding.",
    },
];

export default function McpArchitecture() {
    return (
        <div className="space-y-16">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
                    <Network size={12} />
                    Architecture
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    System Architecture
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    The assistant architecture connects the user interface, AI models,
                    voice systems, and integrated tools into a unified workflow.
                </p>
            </section>

            {/* Architecture layers */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-6">
                    Core Components
                </h2>

                <div className="flex flex-col gap-0 max-w-3xl">
                    {LAYERS.map(({ icon: Icon, color, bg, title, desc }, i) => (
                        <div key={i} className="flex gap-4">
                            {/* Timeline */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-9 h-9 rounded-full border border-zinc-300 dark:border-neutral-700 ${bg} flex items-center justify-center shrink-0`}
                                >
                                    <Icon size={15} className={color} />
                                </div>

                                {i !== LAYERS.length - 1 && (
                                    <div className="w-px flex-1 bg-zinc-200 dark:bg-neutral-800" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="pb-8 pt-1">
                                <h3 className={`text-sm font-semibold mb-1 ${color}`}>
                                    {title}
                                </h3>

                                <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                                    {desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Architecture Diagram */}
            <section className="space-y-4">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Architecture Diagram
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        High-level overview of the assistant architecture, AI workflow, and integrated tool system.
                    </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                    <img
                        src={ArchitectureDiagram}
                        alt="AI Assistant Architecture Diagram"
                        className="w-full object-cover transition-transform duration-300 hover:scale-[1.01]"
                    />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-neutral-600 text-center">
                    Simplified overview of the assistant workflow and integrated systems.
                </p>
            </section>

            {/* Assistant Workflow */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-4">Assistant Workflow</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {[
                        "User sends a message or voice request through the assistant interface.",
                        "The backend processes the request and forwards it to the AI system.",
                        "The assistant analyzes the request and determines whether tools are required.",
                        "Integrated tools execute supported actions such as search, planning, or file analysis.",
                        "Results are combined with the conversation context.",
                        "The assistant generates and streams the final response back to the interface.",
                    ].map((step, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <span className="text-xs font-mono text-zinc-500 dark:text-neutral-600 mt-0.5 w-4 shrink-0">{i + 1}.</span>
                            <span className="text-sm text-zinc-700 dark:text-neutral-300">{step}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Permission architecture */}
            <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 flex gap-4">
                <ShieldCheck size={18} className="text-violet-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-violet-300 mb-1">Permission Architecture</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Sensitive tools and actions may require user approval before execution to ensure safe interaction with the local system.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/troubleshooting"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-colors"
                >
                    Next: Troubleshooting
                </Link>
            </section>
        </div>
    );
}
