import { NextResponse } from 'next/server';
export const claudeCodeGenerator = async (
    codePrompt: string,
    designCode: string
): Promise<string | undefined> => {
    const apiKey = process.env.CLAUDE_API_KEY;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey as string,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-3-7-sonnet-latest',
            max_tokens: 64000,
            temperature: 0.2,
            system: codePrompt,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: designCode,
                        },
                    ],
                },
            ],
        }),
    });

    const result = await response.json();

    return result?.content?.[0]?.text;
};

export async function POST(request: Request) {
    try {
        const { designCode, componentPrompt } = await request.json();

        if (!designCode || !componentPrompt) {
            return NextResponse.json(
                { error: 'Design code and component prompt are required' },
                { status: 400 }
            );
        }

        const systemPrompt = `
You are a professional frontend developer assistant. Your task is to convert complete raw HTML code into fully modular and scalable React components using:

- React (latest stable version)
- TypeScript (use only \`type\` aliases, NOT \`interface\`)
- Tailwind CSS for styling
- shadcn/ui for common UI patterns (e.g., buttons, inputs, dialogs)
- Functional components only
- Proper use of hooks like \`useMemo\`, \`useCallback\`
- Apply \`React.memo\` where suitable to optimize rendering

Important Rules:
- Each HTML section should be separated into reusable and meaningful components (e.g., Header, Footer etc.).
- Maintain semantic HTML and preserve all existing styles.
- The final code must contain absolutely all lines and parts of the original HTML (no trimming or summarizing).
- All components must be combined into a final \`App.tsx\` (or \`Page.tsx\`) file.
- Every component must be maintainable, reusable, and well-structured.
- Use accessibility best practices (aria-labels, roles if present).
- Include meaningful typing with TypeScript, use \`type\` aliases (not \`interface\`).
- Optimize performance with \`React.memo\`, \`useMemo\`, and \`useCallback\` wherever applicable.

Output the complete code of each component as TypeScript (TSX), including imports. Maintain exact structure and design fidelity to the original HTML.
`;

        const code = await claudeCodeGenerator(systemPrompt, designCode);

        return NextResponse.json({ code });
    } catch (error) {
        console.error('Error generating components:', error);
        return NextResponse.json(
            { error: 'Failed to generate components' },
            { status: 500 }
        );
    }
}
