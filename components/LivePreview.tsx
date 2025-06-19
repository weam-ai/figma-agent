'use client';

import { useEffect, useRef } from 'react';

type LivePreviewProps = {
    markdown: string;
};

function extractHTMLCode(markdown: string): string {
    const codeBlockRegex = /```(?:html)?\n([\s\S]*?)```/g;
    let match;
    let code = '';

    while ((match = codeBlockRegex.exec(markdown)) !== null) {
        code += match[1] + '\n';
    }

    return code || markdown;
}

export function LivePreview({ markdown }: LivePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const code = extractHTMLCode(markdown);

        if (iframeRef.current) {
            const iframe = iframeRef.current;
            const doc =
                iframe.contentDocument || iframe.contentWindow?.document;

            if (doc) {
                doc.open();
                doc.write(code);
                doc.close();
            }
        }
    }, [markdown]);

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Live Preview</h2>
            </div>
            <div className="h-[600px] relative">
                <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    title="Live Preview"
                />
            </div>
        </div>
    );
}
