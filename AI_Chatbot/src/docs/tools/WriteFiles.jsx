import { FileEdit, FilePlus, FolderOpen, ArrowRight, AlertCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const CAPABILITIES = [
    { icon: FilePlus, title: "Create Files", desc: "Create new local files using assistant-generated content." },
    { icon: FileEdit, title: "Edit & Overwrite", desc: "Modify existing files by editing, replacing, or appending content." },
    { icon: FolderOpen, title: "Read Access", desc: "Read local file contents to provide additional context and workspace awareness." },
];

const EXAMPLE_QUERIES = [
    { phrase: "Create a README.md for my project", result: "Generates and writes README.md to the current dir" },
    { phrase: "Save this code to utils.py", result: "Writes the discussed code block to utils.py" },
    { phrase: "Read the contents of config.json", result: "Returns the file content for context" },
    { phrase: "Update my .env file to add a new variable", result: "Appends the variable to the file after confirmation" },
    { phrase: "Save a summary of this conversation to notes.txt", result: "Creates notes.txt with the session summary" },
];

export default function WriteFiles() {
    return (
        <div className="space-y-14">
            <section className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                    <FileText size={12} /> Read & Write Files
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-neutral-100">File Management</h1>
                <p className="text-base text-zinc-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
                    Read, create, edit, and manage local files directly through the assistant interface with confirmation required for write operations.
                </p>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Tool Functions</h2>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_2fr] text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-neutral-500 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <span>Function</span><span className="pl-6">Description</span>
                    </div>
                    {[
                        { name: "Read File", desc: "Read the full content of a local file and return it as text." },
                        { name: "Write File", desc: "Write or overwrite a file at a given path with the provided content." },
                    ].map(({ name, desc }) => (
                        <div key={name} className="grid grid-cols-[1fr_2fr] items-center px-5 py-3.5 border-b border-zinc-200 dark:border-neutral-800 last:border-0 bg-zinc-100 dark:bg-neutral-800/20 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all gap-4">
                            <span className="text-sm font-mono text-cyan-300">{name}</span>
                            <span className="text-xs text-zinc-600 dark:text-neutral-400 pl-6">{desc}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-5">Capabilities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="p-5 rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 hover:bg-zinc-200 dark:hover:bg-neutral-800/50 transition-all hover:-translate-y-0.5">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                                <Icon size={15} className="text-cyan-400" />
                            </div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-neutral-100 mb-1">{title}</p>
                            <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
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
                        Preview of file reading, writing, and overwrite confirmation inside the interface.
                    </p>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-neutral-700 bg-white dark:bg-neutral-900/40 h-[320px] flex items-center justify-center">
                    <p className="text-xs text-zinc-500 dark:text-neutral-600">
                        Preview Placeholder
                    </p>
                </div>
            </section>


            <section>
                <h2 className="text-base font-semibold text-zinc-800 dark:text-neutral-200 mb-2">Example Usage</h2>
                <p className="text-xs text-zinc-500 dark:text-neutral-500 mb-5">Example prompts that trigger the file management tools.</p>
                <div className="rounded-xl border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-800/30 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto] text-xs font-semibold uppercase tracking-wider text-cyan-400 px-5 py-3 border-b border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
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

            <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 flex gap-4">
                <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium text-cyan-300 mb-1">File Overwrite Warning</p>
                    <p className="text-xs text-zinc-600 dark:text-neutral-400 leading-relaxed">
                        Writing to an existing file may overwrite its current contents. Review the target file path and generated content before confirming any write operation.
                    </p>
                </div>
            </section>

            <section className="pt-4 border-t border-zinc-200 dark:border-neutral-800 flex flex-wrap gap-3">
                <Link
                    to="/docs"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 dark:bg-neutral-800 hover:bg-zinc-200 dark:hover:bg-neutral-700 border border-zinc-300 dark:border-neutral-700 text-zinc-800 dark:text-neutral-200 text-sm font-medium transition-all"
                >
                    Back to Introduction
                </Link>

                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-sm font-medium transition-all"
                >
                    Exit Documentation
                </Link>
            </section>
        </div>
    );
}
