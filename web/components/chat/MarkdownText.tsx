import React from 'react';

export default function MarkdownText({ content }: { content: string }) {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    const renderInline = (text: string, key: string): React.ReactNode => {
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={`${key}-b${i}`} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
            } else if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={`${key}-em${i}`} className="italic text-gray-600">{part.slice(1, -1)}</em>;
            } else if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={`${key}-c${i}`} className="bg-gray-100 px-1 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.match(/^[-*•]\s/)) {
            const listItems: string[] = [];
            while (i < lines.length && lines[i].match(/^[-*•]\s/)) {
                listItems.push(lines[i].replace(/^[-*•]\s/, ''));
                i++;
            }
            elements.push(
                <ul key={`ul-${i}`} className="list-disc pl-5 my-1 space-y-0.5">
                    {listItems.map((item, idx) => (
                        <li key={idx} className="text-[15px]">{renderInline(item, `li-${i}-${idx}`)}</li>
                    ))}
                </ul>
            );
        } else if (line.match(/^#+\s/)) {
            const headingText = line.replace(/^#+\s/, '');
            elements.push(<p key={`h-${i}`} className="font-semibold text-gray-900 mb-1">{headingText}</p>);
            i++;
        } else if (line.trim() === '') {
            i++;
        } else {
            elements.push(<p key={`p-${i}`} className="mb-1.5">{renderInline(line, `p-${i}`)}</p>);
            i++;
        }
    }
    return <>{elements}</>;
}
