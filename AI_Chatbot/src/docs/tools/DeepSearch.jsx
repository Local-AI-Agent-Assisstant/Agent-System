import { Globe, Search, Link2, ArrowRight, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const CAPABILITIES = [
    {
        icon: Search,
        title: "Live Deep Search",
        desc: "Search external web sources for recent information and publicly available content.",
    },
    {
        icon: Link2,
        title: "URL Content Fetching",
        desc: "Retrieve and process webpage content directly from provided URLs.",
    },
    {
        icon: Globe,
        title: "Multi-Source Results",
        desc: "Results include source references and external links when available.",
    },
];

const EXAMPLE_QUERIES = [
    { phrase: "What's the latest news about AI?", result: "Returns recent Deep Search results" },
    { phrase: "Search for Python async tutorials", result: "Returns ranked search results with links" },
    { phrase: "Read the content of https://example.com", result: "Fetches and returns the full page text" },
    { phrase: "Search for the latest NVIDIA AI announcements", result: "Returns search results for NVIDIA AI news" },
    { phrase: "Find the official docs for React Router v7", result: "Returns the most relevant documentation link" },
];

export default function DeepSearch() {
    return (
        <div className="space-y-14">
            {/* Header */}
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium">
                    <Globe size={12} />
                    Live Web Access
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">
                    Deep Search
                </h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Search the web, retrieve live information, and access external content directly through the assistant.
                </p>
            </section>

            {/* Tool names */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Available Functions</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Function</span>
                        <span className="pl-6">Description</span>
                    </div>
                    {[
                        { name: "web search", desc: "Search the internet and return ranked results with source links." },
                        { name: "read url", desc: "Fetch and extract the full text content of any given URL." },
                    ].map(({ name, desc }) => (
                        <div
                            key={name}
                            className="grid grid-cols-[1fr_2fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm font-mono text-sky-300">{name}</span>
                            <span className="text-xs text-zinc-600 dark:text-neutral-400 pl-6">{desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Capabilities */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5"
                        >
                            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-sky-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tool Functions*/}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Tool Functions</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Function</span>
                        <span className="pl-6">Description</span>
                    </div>
                    {[
                        { name: "web search", desc: "Search external sources for recent information, news, and publicly available content." },
                        { name: "read url", desc: "Retrieve and process webpage content directly from public URLs." },
                    ].map(({ name, desc }) => (
                        <div
                            key={name}
                            className="grid grid-cols-[1fr_2fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm font-mono text-sky-300">{name}</span>
                            <span className="text-xs text-zinc-600 dark:text-neutral-400 pl-6">{desc}</span>
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
                        Example Deep Search responses and URL content retrieval inside the chat interface.
                    </p>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40 h-[320px] flex items-center justify-center">
                    <p className="text-xs text-zinc-500 dark:text-neutral-600">
                        Preview Placeholder
                    </p>
                </div>
            </section>

            {/* Example queries */}
            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Example Usage</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">
                    These are examples of what you can say to trigger the Deep Search tool.
                </p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-sky-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Example Prompt</span>
                        <span>Assistant Response</span>
                    </div>
                    {EXAMPLE_QUERIES.map(({ phrase, result }, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[1fr_auto] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4"
                        >
                            <span className="text-sm text-zinc-800 dark:text-neutral-200 font-mono">&ldquo;{phrase}&rdquo;</span>
                            <span className="text-xs text-zinc-500 dark:text-neutral-500 text-right whitespace-nowrap">{result}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Permission note */}
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-amber-300 mb-1">Permission required</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Web search requires confirmation before executing by default. You can set it to "Always allow" to bypass repeated confirmation requests for the current session.
                    </p>
                </div>
            </section>

            {/* Next */}
            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800">
                <Link
                    to="/docs/tools/email"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all"
                >
                    Next: Email Integration <ArrowRight size={14} />
                </Link>
            </section>
        </div>
    );
}
