'use client';

import React, { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Copy } from 'lucide-react';
import 'katex/dist/katex.min.css';

type MarkdownRendererProps = {
    content: string;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
    content,
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, []);

    return (
        <div className="prose max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSanitize]}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const lang = match?.[1] ?? 'text';
                        const codeString = String(children).replace(/\n$/, '');

                        if (!inline && match) {
                            return (
                                <div className="relative group">
                                    <div className="flex items-center justify-between bg-zinc-800 text-white px-4 py-2 text-sm font-mono rounded-t">
                                        <span>{lang.toUpperCase()}</span>
                                        <button
                                            className="flex items-center space-x-1 hover:text-blue-400"
                                            onClick={() =>
                                                handleCopy(codeString)
                                            }
                                        >
                                            <Copy className="w-4 h-4" />
                                            <span className="text-xs">
                                                {copied ? 'Copied' : 'Copy'}
                                            </span>
                                        </button>
                                    </div>
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language={lang}
                                        PreTag="div"
                                        className="!rounded-t-none"
                                        {...props}
                                    >
                                        {codeString}
                                    </SyntaxHighlighter>
                                </div>
                            );
                        }

                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
