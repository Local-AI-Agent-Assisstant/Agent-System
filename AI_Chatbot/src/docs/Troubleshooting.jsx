import { LifeBuoy, AlertCircle, CheckCircle2, Terminal, RefreshCw, Wifi, Mic, Wrench, Cpu, Github } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Preview1 from "../assets/Troubleshooting-1.png";
import Preview2 from "../assets/Troubleshooting-2.png";

const ISSUES = [
    {
        icon: Wifi,
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        problem: "Backend connection unavailable",
        causes: [
            "The backend server isn't running.",
            "The server crashed on startup (missing dependency, port conflict).",
        ],
        fixes: [
            <>
                Run{" "}
                <code className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-neutral-900 text-sky-400 font-mono text-xs">
                    python server.py
                </code>{" "}
                in your backend directory.
            </>,
            "Check the terminal for Python errors and fix any missing imports.",
            "Make sure port 8000 isn't already in use by another process.",
        ],
    },
    {
        icon: Terminal,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        problem: "AI responses stop or fail to complete",
        causes: [
            "The LLM model isn't running or isn't reachable.",
            "Ollama service stopped in the background.",
        ],
        fixes: [
            "Run ollama serve in a separate terminal to ensure the model server is active.",
            "Run ollama list to confirm your model is pulled locally.",
            "Check the backend terminal for LLM connection errors.",
        ],
    },
    {
        icon: Mic,
        color: "text-sky-400",
        bg: "bg-sky-500/10",
        problem: "Voice input is not detected",
        causes: [
            "Whisper STT model not loaded or path misconfigured.",
            "Browser microphone permission was denied.",
        ],
        fixes: [
            "In your browser, go to Settings → Site permissions → Microphone and allow access.",
            "Verify that the speech recognition model is installed and configured correctly.",
            "Check the backend logs for whisper-related errors after a voice send.",
        ],
    },
    {
        icon: RefreshCw,
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        problem: "Tool permission request interrupted the response",
        causes: [
            "You left the permission dialog open for more than 60 seconds.",
            "The backend timed out waiting for a permission response.",
        ],
        fixes: [
            "Permission requests automatically expire after 60 seconds if no response is received.",
            "If it keeps happening, try resetting permissions via the Tools sidebar.",
        ],
    },
    {
        icon: Wrench,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        problem: "Tool permissions are not being remembered",
        causes: [
            "The backend session was restarted, clearing in-memory permissions.",
            "Stored browser permissions were cleared.",
        ],
        fixes: [
            "Stored permissions may take a moment to restore after the backend reconnects.",
            "If permissions don't restore, open the Tools sidebar and re-enable each tool manually.",
        ],
    },
    {
        icon: Cpu,
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        problem: "Model responses are extremely slow",
        causes: [
            "The selected model is too large for your hardware.",
            "The model is running entirely on CPU.",
            "System memory is insufficient for the active model.",
        ],
        fixes: [
            "Try a smaller or quantized model.",
            "Verify GPU acceleration is configured correctly.",
            "Close unnecessary applications to free system memory.",
        ],
    },
];

function IssueCard({ icon: Icon, color, bg, problem, causes, fixes }) {
    return (
        <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden transition-all hover:border-zinc-300 dark:hover:border-neutral-700">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-zinc-200 dark:bg-neutral-800/50 border-b border-zinc-200 dark:border-neutral-800">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={14} className={color} />
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100">{problem}</p>
            </div>

            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-neutral-800">
                {/* Causes */}
                <div className="px-5 py-4 bg-zinc-100 dark:bg-neutral-800/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 mb-3">Possible Causes</p>
                    <ul className="space-y-2">
                        {causes.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                                <AlertCircle size={12} className="text-rose-400 shrink-0 mt-0.5" />
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Fixes */}
                <div className="px-5 py-4 bg-white dark:bg-neutral-800/10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 mb-3">How to Fix</p>
                    <ul className="space-y-2">
                        {fixes.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                                <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default function Troubleshooting() {

    const [activePreview, setActivePreview] = useState(0);

    const previewImages = [
        Preview1,
        Preview2,
    ];

    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                    <LifeBuoy size={12} />
                    Troubleshooting
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Troubleshooting
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Common issues and how to resolve them. If your problem isn't listed here,
                    check the backend terminal logs first. They usually point directly to the cause.
                </p>
            </section>

            {/* Issues */}
            <section className="space-y-5">
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200">Known Issues & Fixes</h2>
                {ISSUES.map((issue) => (
                    <IssueCard key={issue.problem} {...issue} />
                ))}
            </section>

            {/* Troubleshooting Preview */}
            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-1">
                        Troubleshooting Preview
                    </h2>

                    <p className="text-xs text-zinc-500 dark:text-neutral-500">
                        Example error states, permission dialogs, and backend connection issues.
                    </p>
                </div>

                <div className="space-y-3">
                    {/* Main Preview */}
                    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                        <img
                            src={previewImages[activePreview]}
                            alt="Troubleshooting Preview"
                            className="w-full object-cover transition-all duration-300"
                        />
                    </div>

                    {/* Thumbnails */}
                    <div className="flex flex-wrap gap-2">
                        {previewImages.map((image, i) => (
                            <button
                                key={i}
                                onClick={() => setActivePreview(i)}
                                className={[
                                    "overflow-hidden rounded-lg border transition-all",
                                    activePreview === i
                                        ? "border-rose-500 ring-1 ring-rose-500/30"
                                        : "border-zinc-200 dark:border-neutral-800 hover:border-zinc-400 dark:hover:border-neutral-600",
                                ].join(" ")}
                            >
                                <img
                                    src={image}
                                    alt={`Preview ${i + 1}`}
                                    className="w-24 h-16 object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* General advice */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-4">General Debugging Checklist</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {[
                        "Is the backend server running correctly?",
                        "Is Ollama (or your LLM backend) running and reachable?",
                        "Does the browser have microphone permission granted?",
                        "Are there any errors in the backend terminal output?",
                        <>
                            Did you install all Python requirements{" "}
                            <code className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-neutral-900 text-emerald-400 font-mono text-xs">
                                pip install -r requirements.txt
                            </code>
                            ?
                        </>,
                        <>
                            Were frontend dependencies installed successfully with{" "}
                            <code className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-neutral-900 text-sky-400 font-mono text-xs">
                                npm install
                            </code>
                            ?
                        </>,
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <div className="w-4 h-4 rounded border border-zinc-300 dark:border-neutral-700 shrink-0 flex items-center justify-center">
                                <span className="text-zinc-500 dark:text-neutral-600 text-xs font-mono">{i + 1}</span>
                            </div>
                            <span className="text-sm text-zinc-700 dark:text-neutral-300">{item}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Community & Repository */}
            <section className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 flex gap-4">
                <LifeBuoy size={18} className="text-indigo-400 shrink-0 mt-0.5" />

                <div>
                    <p className="text-sm font-medium text-indigo-300 mb-1">
                        Project Repository
                    </p>

                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed mb-3">
                        Check the GitHub repository for updates, issue tracking, installation guidance, and additional project information.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <a
                            href="YOUR_GITHUB_LINK"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-xs font-medium transition-colors"
                        >
                            <Github size={14} /> GitHub Repository
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800 flex flex-wrap gap-3">
                <Link
                    to="/docs"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-colors"
                >
                    ← Back to Introduction
                </Link>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-sm font-medium transition-all"
                >
                    Exit Documentation
                </Link>
            </section>
        </div>
    );
}
