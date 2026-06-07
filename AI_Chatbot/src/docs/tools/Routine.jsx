import { Zap, ListChecks, Play, ArrowRight, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import RoutinePreview from "../../assets/routine-preview.png";

const FEATURES = [
    {
        icon: ListChecks,
        title: "Sequential Workflows",
        desc: "Create routines with multiple ordered actions and execution steps.",
    },
    {
        icon: Clock,
        title: "Automation",
        desc: "Reduce repetitive work by reusing saved assistant workflows.",
    },
    {
        icon: Play,
        title: "One-Click Execution",
        desc: "Execute complete workflows directly from the assistant interface.",
    },
    {
        icon: Zap,
        title: "Tool Integration",
        desc: "Routines can combine multiple assistant tools within a single workflow.",
    },
];

export default function Routine() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Zap size={12} />
                    Workflow Automation
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Routine
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Create reusable assistant workflows that automate repetitive actions,
                    multi-step tasks, and structured interactions.
                </p>
            </section>

            {/* Capabilities */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-emerald-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Routine Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Routine Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Preview of routine workflows, execution flow, and automation controls.
                    </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <img
                        src={RoutinePreview}
                        alt="Routine interface preview"
                        className="w-full object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                    />
                </div>
            </section>

            {/* Example Workflow */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">
                    Workflow Example
                </h2>

                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">
                    Example of a multi-step assistant routine.
                </p>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {[
                        "Search the web for AI news",
                        "Summarize the latest updates",
                        "Generate a short productivity report",
                        "Compile and organize the final workflow results"
                    ].map((step, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[11px] text-emerald-400 font-medium shrink-0">
                                {i + 1}
                            </div>

                            <span className="text-sm text-zinc-700 dark:text-neutral-300">
                                {step}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Note */}
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">Execution Safety</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Routines still follow the assistant permission system. Sensitive actions and tool executions may require user approval before continuing.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/tools/task-planner"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all"
                >
                    Next: Task Planner <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
