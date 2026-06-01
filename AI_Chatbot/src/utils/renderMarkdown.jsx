export function renderMarkdown(text) {
    if (!text) return null;
    if (typeof text !== "string") text = text?.response || JSON.stringify(text);

    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
        const tokens = [];
        const pattern = /(\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s)]+))/g;
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(line)) !== null) {
            if (match.index > lastIndex) tokens.push(line.slice(lastIndex, match.index));

            if (match[0].startsWith("**")) {
                tokens.push(<strong key={`b-${lineIdx}-${match.index}`}>{match[2]}</strong>);
            } else if (match[3] !== undefined) {
                const href = match[4];
                const isDownload = href.includes("/api/download/");
                const fileName = isDownload ? href.split("/").pop() : undefined;
                tokens.push(
                    <a key={`a-${lineIdx}-${match.index}`} href={href} target="_blank" rel="noopener noreferrer"
                        {...(isDownload ? { download: fileName } : {})}
                        style={{ color: "#60a5fa", textDecoration: "none", wordBreak: "break-all" }}>
                        {match[3]}
                    </a>
                );
            } else {
                const href = match[5];
                const isDownload = href.includes("/api/download/");
                const fileName = isDownload ? href.split("/").pop() : undefined;
                const label = isDownload ? `⬇ ${fileName}` : href;
                tokens.push(
                    <a key={`u-${lineIdx}-${match.index}`} href={href} target="_blank" rel="noopener noreferrer"
                        {...(isDownload ? { download: fileName } : {})}
                        style={{ color: "#60a5fa", textDecoration: "none", wordBreak: "break-all" }}>
                        {label}
                    </a>
                );
            }
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) tokens.push(line.slice(lastIndex));
        return (
            <span key={`line-${lineIdx}`}>
                {tokens.length > 0 ? tokens : line}
                {lineIdx < lines.length - 1 && <br />}
            </span>
        );
    });
}
