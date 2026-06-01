import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { Copy, Check } from "lucide-react";

function CopyButton({ code }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={handleCopy}
            data-tooltip={copied ? "Copied!" : "Copy code"}
            data-tooltip-pos="bottom"
            className={
                "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all " +
                (copied
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-white/10 text-neutral-300 border border-white/10 hover:bg-white/20")
            }
        >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied!" : "Copy"}
        </button>
    );
}

function extractText(node) {
    if (typeof node === "string") return node;

    if (Array.isArray(node)) {
        return node.map(extractText).join("");
    }

    if (node?.props?.children) {
        return extractText(node.props.children);
    }

    return "";
}

function CodeBlock({ children, className }) {
    const code = extractText(children).replace(/\n$/, "");
    const language = className?.replace("language-", "") || "";

    return (
        <div className="relative group my-3 overflow-hidden rounded-xl border border-neutral-700">
            <div className="flex items-center justify-between px-4 py-2 bg-neutral-800/90 border-b border-neutral-700">
                <span className="text-[11px] text-neutral-400 font-mono">
                    {language || "code"}
                </span>

                <CopyButton code={code} />
            </div>

            <pre className="overflow-x-auto m-0 px-4 py-3">
                <code className={className || ""}>
                    {children}
                </code>
            </pre>
        </div>
    );
}

export function MarkdownMessage({ content, isDark }) {
    if (!content) return null;
    const text =
        typeof content === "string"
            ? content
            : content?.response ?? JSON.stringify(content);

    const cleanedText = text.replace(
        /\((https?:\/\/[^\s)]+)\.\)/g,
        "($1)."
    );

    return (
        <div className={`markdown-body prose-sm max-w-none ${isDark ? "markdown-dark" : "markdown-light"}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Code blocks
                    code({ node, inline, className, children, ...props }) {
                        if (inline) {
                            return (
                                <code
                                    className={
                                        "px-1.5 py-0.5 rounded text-[0.85em] font-mono " +
                                        (isDark
                                            ? "bg-neutral-700 text-amber-300"
                                            : "bg-zinc-200 text-rose-600")
                                    }
                                    {...props}
                                >
                                    {children}
                                </code>
                            );
                        }
                        return <CodeBlock className={className}>{children}</CodeBlock>;
                    },

                    // Headings
                    h1: ({ children }) => (
                        <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mt-3 mb-1.5">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>
                    ),

                    // Paragraph (using div to prevent HTML spec errors when nested blocks occur)
                    p: ({ children }) => (
                        <div className="mb-3 last:mb-0 leading-relaxed">{children}</div>
                    ),

                    // Lists
                    ul: ({ children }) => (
                        <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                    ),

                    // Blockquote
                    blockquote: ({ children }) => (
                        <blockquote
                            className={
                                "border-l-4 pl-4 my-3 italic " +
                                (isDark
                                    ? "border-neutral-500 text-neutral-400"
                                    : "border-zinc-400 text-zinc-500")
                            }
                        >
                            {children}
                        </blockquote>
                    ),

                    // Links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                        >
                            {children}
                        </a>
                    ),

                    // Horizontal rule
                    hr: () => (
                        <hr
                            className={
                                "my-4 border-t " +
                                (isDark ? "border-neutral-700" : "border-zinc-300")
                            }
                        />
                    ),

                    // Tables
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                            <table
                                className={
                                    "w-full text-sm border-collapse rounded-lg overflow-hidden " +
                                    (isDark ? "border border-neutral-700" : "border border-zinc-300")
                                }
                            >
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead
                            className={isDark ? "bg-neutral-800" : "bg-zinc-100"}
                        >
                            {children}
                        </thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-2 text-left font-semibold border-b border-neutral-700">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td
                            className={
                                "px-3 py-2 border-b " +
                                (isDark ? "border-neutral-800" : "border-zinc-200")
                            }
                        >
                            {children}
                        </td>
                    ),

                    // Strong / Em
                    strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                }}
            >
                {cleanedText}
            </ReactMarkdown>
        </div>
    );
}
