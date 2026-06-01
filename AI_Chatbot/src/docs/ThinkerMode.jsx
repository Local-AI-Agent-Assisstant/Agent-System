import { Brain, AlertCircle, ArrowRight, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";

const MODES = [
    {
        icon: Brain,
        title: "Advanced Reasoning",
        desc: "Breaks down complex requests into multiple reasoning steps before generating a response.",
    },
    {
        icon: Lightbulb,
        title: "Multi-Step Analysis",
        desc: "Evaluates different approaches, solutions, and outcomes for more accurate responses.",
    },
    {
        icon: Brain,
        title: "Tool-Aware Thinking",
        desc: "Combines reasoning with integrated assistant tools when solving advanced tasks.",
    },
    {
        icon: Lightbulb,
        title: "Enhanced Problem Solving",
        desc: "Improves performance on coding, research, planning, and analytical tasks.",
    },
];

export default function ThinkerMode() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
                    <Brain size={12} />
                    Advanced Reasoning
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Thinker Mode
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Thinker Mode enhances the assistant with deeper reasoning, structured analysis,
                    multi-step problem solving, and advanced response generation for complex tasks.
                </p>
            </section>

            {/* Features */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MODES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-violet-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Thinking Indicator */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-4">
                    Thinking Indicator
                </h2>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {[
                        "The assistant displays a live thinking indicator while processing complex requests.",
                        "Reasoning steps and progress updates may appear during advanced analysis tasks.",
                        "Thinker Mode is designed for coding, planning, research, and complex problem solving.",
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <span className="text-xs font-mono text-zinc-500 dark:text-neutral-600 mt-0.5 w-4 shrink-0">
                                {i + 1}.
                            </span>

                            <span className="text-sm text-zinc-700 dark:text-neutral-300">
                                {item}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Preview picture  subtitle: Preview of the assistant processing a complex request using Thinker Mode. */}


            {/* Note */}
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">Processing Time</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Responses may take longer while Thinker Mode is active because the assistant performs deeper reasoning and multi-step analysis before generating a final response.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/files"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all"
                >
                    Next: Files & Uploads <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
