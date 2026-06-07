import { MousePointerClick, Keyboard, Monitor, ArrowRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const FUNCTIONS = [
    {
        name: "read screen",
        desc: "Extract readable and interactive elements from the currently active window.",
    },
    {
        name: "click",
        desc: "Locate and interact with visible UI elements through Windows accessibility APIs.",
    },
    {
        name: "type",
        desc: "Type text into a designated field or the active window.",
    },
    {
        name: "get clipboard",
        desc: "Retrieve the current text contents of the system clipboard.",
    },
    {
        name: "wait",
        desc: "Pause execution to allow UI animations or transitions to complete.",
    },
];

const CAPABILITIES = [
    {
        icon: Monitor,
        title: "Screen Reading",
        desc: "The AI can analyze the accessibility tree of active windows to understand the UI layout and find elements.",
    },
    {
        icon: MousePointerClick,
        title: "Element Interaction",
        desc: "Interact with buttons, links, tabs, and other accessible UI elements inside applications.    ",
    },
    {
        icon: Keyboard,
        title: "Automated Typing",
        desc: "Type text into active applications and input fields for automation workflows.",
    },
];

const EXAMPLE_QUERIES = [
    {
        phrase: "Read what is currently on my screen.",
        result: "The assistant analyzes the active window and returns detected text and interactive elements.",
    },
    {
        phrase: "Click the send button.",
        result: "The assistant searches for the visible button and performs a click action.",
    },
    {
        phrase: "Type 'Hello world' into the search bar.",
        result: "Focuses the search bar and inputs the specified text.",
    },
];

export default function ComputerControl() {
    return (
        <div className="space-y-14">
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                    <MousePointerClick size={12} /> UI Automation
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">Computer Control</h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Allow the assistant to interact with desktop applications by reading screen elements, clicking buttons, and typing text through the Windows UI.
                </p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-indigo-400" />
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
                            <span className="text-sm font-mono text-indigo-400">
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
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">Example prompts that trigger the computer control tool.</p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-indigo-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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

            <section className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-indigo-300 mb-1">
                        Screen Accessibility Requirements
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        This tool relies on Windows UI Automation. It requires target elements to be exposed to the accessibility tree. Games and custom-rendered canvas applications may not be supported.
                    </p>
                </div>
            </section>

            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link to="/docs/tools/system-actions" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all">
                    Next: System Actions <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
