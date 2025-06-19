'use client';

import { useState } from 'react';
import { Editor } from '@monaco-editor/react';

type CodePreviewProps = {
    code: string;
};

export function CodePreview({ code }: CodePreviewProps) {
    const [language, setLanguage] = useState<'html' | 'css'>('html');

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Generated Code</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setLanguage('html')}
                            className={`px-3 py-1 rounded ${
                                language === 'html'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            HTML
                        </button>
                    </div>
                </div>
            </div>
            <div className="h-[600px]">
                <Editor
                    height="100%"
                    defaultLanguage={language}
                    value={code}
                    theme="vs-dark"
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                    }}
                />
            </div>
        </div>
    );
}
