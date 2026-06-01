import { Brain, Plus, Calendar, Clock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import PlannerPreview from "../../assets/planner-preview.png";

const COMMANDS = [
    { phrase: "Add a task to review my report", result: "Creates a new pending task" },
    { phrase: "Mark 'review report' as done", result: "Marks the task complete" },
    { phrase: "Move this task to tomorrow", result: "Defers the task to the next day" },
    { phrase: "What do I have today?", result: "Lists all tasks scheduled for today" },
    { phrase: "Delete the meeting task", result: "Removes the task permanently" },
    { phrase: "Schedules a future planner task", result: "Creates a task with a future date" },
];

const FEATURES = [
    {
        icon: Plus,
        title: "Task Creation",
        desc: "Create and organize tasks naturally through conversation.",
    },
    {
        icon: Calendar,
        title: "Smart Scheduling",
        desc: "Automatically organize and schedule tasks by date and priority.",
    },
    {
        icon: Clock,
        title: "Deferred Tasks",
        desc: "Reschedule or defer tasks without losing progress.",
    },
    {
        icon: CheckCircle2,
        title: "Completion Tracking",
        desc: "Track completed, pending, and upcoming tasks efficiently.",
    },
];

export default function PlannerGuide() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium">
                    <Brain size={12} />
                    Task Management
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Task Planner
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Manage tasks, schedules, and productivity workflows directly through conversational interaction with the AI assistant.
                </p>
            </section>

            {/* Capablities */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-violet-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</h3>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Planner Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Interface Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Preview of the planner sidebar and task organization.
                    </p>
                </div>

                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <img
                        src={PlannerPreview}
                        alt="Planner interface preview"
                        className="w-full object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                    />
                </div>
            </section>

            {/* Command reference */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Example Commands</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">
                    These are examples of what you can say. Commands can be phrased in different ways.
                </p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-violet-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Example Prompt</span>
                        <span>Assistant Action</span>
                    </div>
                    {COMMANDS.map(({ phrase, result }, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1fr_auto] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm text-zinc-800 dark:text-neutral-200 font-mono">
                                &ldquo;{phrase}&rdquo;
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-neutral-500 text-right whitespace-nowrap">{result}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Planner sidebar note */}
            <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                <div className="flex items-start gap-3">
                    <Brain size={16} className="text-violet-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-violet-300 mb-1">Planner Sidebar</p>
                        <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                            The planner sidebar provides quick access to pending tasks, upcoming schedules, and task management actions.
                        </p>
                    </div>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/tools/routine"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all"
                >
                    Next: Routine Manager <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
