import { Brain, AlertCircle, ArrowRight, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import ThinkerPreview from "../assets/Thinker-preview.mp4";

const MODES = [
    {
        icon: Brain,
        title: "Advanced Reasoning",
        desc: "Breaks down complex requests into multiple reasoning steps before generating a final response.",
    },
    {
        icon: Lightbulb,
        title: "Multi-Step Analysis",
        desc: "Analyzes complex tasks through multiple steps, strategies, and reasoning paths.",
    },
    {
        icon: Brain,
        title: "Tool-Aware Thinking",
        desc: "Combines reasoning with integrated assistant tools when solving complex tasks.",
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                    <Brain size={12} />
                    Advanced Reasoning
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Thinker Mode
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Thinker Mode enhances the assistant with deeper reasoning, structured analysis,
                    multi-step problem solving, and extended reasoning workflows for complex tasks.
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
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-cyan-400" />
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
                        "Reasoning progress and intermediate steps may appear during deeper analysis tasks.",
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

            {/* Thinker Mode Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Thinker mode Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Preview of the assistant processing a complex request using Thinker Mode.
                    </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        controls={false}
                        controlsList="nodownload nofullscreen noremoteplayback"
                        className="w-full object-cover pointer-events-none transition-transform duration-300 hover:scale-[1.01]"
                    >
                        <source src={ThinkerPreview} type="video/mp4" />
                    </video>
                </div>
            </section>


            {/* Note */}
            <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-cyan-300 mb-1">Processing Time</p>
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
