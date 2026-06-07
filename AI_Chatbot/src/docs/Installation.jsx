import { Terminal, CheckCircle2, AlertCircle, ArrowRight, Zap, Copy, Check } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const STEPS = [
    {
        number: "01",
        title: "Create the Python environment",
        desc: "Initialize and activate a virtual environment for backend dependencies.",
        code:
            `python -m venv venv \n
venv\\Scripts\\activate`,
    },

    {
        number: "02",
        title: "Install backend dependencies",
        desc: "Install the required Python packages used by the MCP server and AI systems.",
        code:
            `pip install -r requirements.txt`,
    },

    {
        number: "03",
        title: "Install frontend dependencies",
        desc: "Install the packages required by the React interface.",
        code:
            `npm install`,
    },

    {
        number: "04",
        title: "Install and configure the LLM runtime",
        desc: "Set up a local language model runtime and download at least one compatible model.",
        code:
            `ollama pull [MODEL NAME]`,
    },

    {
        number: "05",
        title: "Start the application",
        desc: "Start the backend server and launch the assistant interface.",
        code:
            `python server.py`,
    },
];

const REQUIRED_REQ = [
    {
        name: "Python 3.10+",
        url: "https://www.python.org/",
    },
    {
        name: "Node.js 18+",
        url: "https://nodejs.org/",
    },
    {
        name: "npm 9+",
    },
    {
        name: "A local language model runtime",
    },
];

const OPTIONAL_REQ = [
    {
        name: "FFmpeg",
        url: "https://ffmpeg.org/",
    },
    {
        name: "Whisper",
        url: "https://github.com/openai/whisper",
    },
    {
        name: "Piper TTS",
        url: "https://github.com/rhasspy/piper",
    },
    {
        name: "Tesseract OCR",
        url: "https://github.com/UB-Mannheim/tesseract/wiki",
    },
];

const LLM_RUNTIMES = [
    {
        name: "Ollama",
        url: "https://ollama.com/",
    },
    {
        name: "LM Studio",
        url: "https://lmstudio.ai/",
    },
    {
        name: "Llama.cpp",
        url: "https://github.com/ggml-org/llama.cpp",
    },
    {
        name: "Custom local runtimes",
    },
];

function CodeBlock({ code }) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    return (
        <div className="mt-3 rounded-lg border border-zinc-200 dark:border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <Terminal size={13} className="text-zinc-500 dark:text-neutral-500" />
                    <span className="text-xs text-zinc-500 dark:text-neutral-500 font-mono">
                        terminal
                    </span>
                </div>

                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-neutral-500 hover:text-zinc-900 dark:hover:text-neutral-300 transition-colors"
                >
                    {copied ? (
                        <>
                            <Check size={13} />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy size={13} />
                            Copy
                        </>
                    )}
                </button>
            </div>

            <pre className="px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono leading-relaxed overflow-x-auto whitespace-pre bg-zinc-50 dark:bg-neutral-950">
                {code}
            </pre>
        </div>
    );
}


export default function GettingStarted() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                    <Zap size={12} />
                    Local Installation
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Installation
                </h1>
                <div className="space-y-2 max-w-2xl">
                    <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Install and configure the dependencies required to run the assistant locally.
                    </p>

                    <p className="text-sm text-zinc-500 dark:text-neutral-500 leading-relaxed">
                        The assistant supports both local AI runtimes and cloud-based AI providers.
                    </p>
                </div>
            </section>

            {/* Required Requirements */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200">
                        Required
                    </h2>

                    <span className="text-xs text-zinc-500 dark:text-neutral-500">
                        Clicking them opens their official website.
                    </span>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {REQUIRED_REQ.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <CheckCircle2
                                size={15}
                                className="text-emerald-400 shrink-0"
                            />
                            {item.url ? (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-zinc-700 dark:text-neutral-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                                >
                                    {item.name}
                                </a>
                            ) : (
                                <span className="text-sm text-zinc-700 dark:text-neutral-300">
                                    {item.name}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Optional Requirements */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200">
                        Optional Components
                    </h2>

                    <span className="text-xs text-zinc-500 dark:text-neutral-500">
                        Clicking them opens their official website.
                    </span>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {OPTIONAL_REQ.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <CheckCircle2
                                size={15}
                                className="text-emerald-400 shrink-0"
                            />
                            {item.url ? (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-zinc-700 dark:text-neutral-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                                >
                                    {item.name}
                                </a>
                            ) : (
                                <span className="text-sm text-zinc-700 dark:text-neutral-300">
                                    {item.name}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Supported LLM Runtimes */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200">
                        Supported LLM Runtimes
                    </h2>

                    <span className="text-xs text-zinc-500 dark:text-neutral-500">
                        Clicking them opens their official website.
                    </span>
                </div>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    {LLM_RUNTIMES.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 last:border-0 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                            <CheckCircle2
                                size={15}
                                className="text-emerald-400 shrink-0"
                            />

                            {item.url ? (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-zinc-700 dark:text-neutral-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                                >
                                    {item.name}
                                </a>
                            ) : (
                                <span className="text-sm text-zinc-700 dark:text-neutral-300">
                                    {item.name}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Project Structure */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-4">
                    Project Structure
                </h2>

                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30">
                        <p className="text-sm font-medium text-zinc-800 dark:text-neutral-200 mb-1">
                            AI_Chatbot/
                        </p>

                        <p className="text-xs text-zinc-500 dark:text-neutral-500">
                            Frontend React application and user interface.
                        </p>
                    </div>

                    <div className="px-5 py-4 bg-zinc-100 dark:bg-neutral-800/30">
                        <p className="text-sm font-medium text-zinc-800 dark:text-neutral-200 mb-1">
                            MCP_server/
                        </p>

                        <p className="text-xs text-zinc-500 dark:text-neutral-500">
                            Backend server, AI processing, and tools system.
                        </p>
                    </div>
                </div>
            </section>

            {/* Steps */}
            <section className="space-y-6">
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200">Setup Process</h2>
                {STEPS.map(({ number, title, desc, code }) => (
                    <div key={number} className="flex gap-5">
                        <div className="shrink-0 flex flex-col items-center">
                            <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-neutral-800 border border-zinc-300 dark:border-neutral-700 flex items-center justify-center text-xs font-bold text-zinc-500 dark:text-neutral-400 font-mono">
                                {number}
                            </div>
                            <div className="w-px flex-1 bg-zinc-200 dark:bg-neutral-800 mt-2" />
                        </div>
                        <div className="pb-8 flex-1">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</h3>
                            <p className="text-xs text-zinc-600 dark:text-neutral-500 leading-relaxed">{desc}</p>
                            <CodeBlock code={code} />
                        </div>
                    </div>
                ))}
            </section>

            {/* Runtime Note */}
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-4">
                <AlertCircle
                    size={18}
                    className="text-amber-400 shrink-0 mt-0.5"
                />

                <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">
                        Runtime Requirement
                    </p>

                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed mb-2">
                        Local runtimes require downloading at least one language model before starting the application.
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed mb-2">
                        Large language models may require significant RAM or GPU resources depending on the selected model size.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <p className="text-sm text-zinc-500 dark:text-neutral-500 mb-3">Next Sections:</p>
                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/docs/tools"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-colors"
                    >
                        Tools System <ArrowRight size={14} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
