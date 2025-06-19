import { NextResponse } from 'next/server';

function extractFigmaFileKey(figmaUrl: string): string {
    const match = figmaUrl.match(/(?:file|proto|design)\/([a-zA-Z0-9]+)/);
    if (!match || !match[1]) throw new Error('Invalid Figma URL');
    return match[1];
}

async function fetchFigmaFile(fileKey: string, accessToken: string) {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: {
            'X-Figma-Token': accessToken,
        },
    });

    if (!response.ok) {
        throw new Error(`Figma API error: ${response.status}`);
    }

    return await response.json();
}

function preprocessFigmaData(data: any) {
    return {
        name: data.name,
        components: data.components,
        topLevelFrames: data.document.children.map((node: any) => ({
            id: node.id,
            name: node.name,
            type: node.type,
            children: node.children?.slice(0, 10), // Limit to top N nodes
        })),
    };
}

export async function generateCodeWithGemini(prompt: string, figmaData: any) {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'model',
                        parts: [{ text: prompt }],
                    },
                    {
                        role: 'user',
                        parts: [{ text: JSON.stringify(figmaData, null, 2) }],
                    },
                ],
            }),
        }
    );

    const result = await response.json();

    if (result?.error?.code === 400) {
        return NextResponse.json(
            {
                error: 'Failed to generate code',
                message: result.error.message,
            },
            { status: 500 }
        );
    }
    return result.candidates?.[0]?.content?.parts?.[0]?.text;
}

export async function POST(request: Request) {
    try {
        const { figmaUrl } = await request.json();
        const fileKey = extractFigmaFileKey(figmaUrl);
        const accessToken = process.env.FIGMA_ACCESS_TOKEN;

        const rawFigmaData = await fetchFigmaFile(fileKey, accessToken!);
        const simplifiedFigma = preprocessFigmaData(rawFigmaData);

        const systemPrompt = `
You are an expert front-end developer that converts high-fidelity Figma designs into clean, responsive HTML and Tailwind CSS. Your goal is to produce semantic, accessible, and production-ready code.

Instructions:
- Use modern Tailwind CSS (latest stable version) with best practices.
- Ensure responsive design using Tailwind’s responsive utilities (e.g. sm:, md:, lg:, xl:).
- Use semantic HTML structure: header, nav, main, section, article, footer, etc.
- Add meaningful alt text to all images.
- Do NOT use inline styles or custom CSS classes unless necessary.
- Optimize for accessibility (aria attributes where appropriate, keyboard navigability, etc.).
- Keep layout and utility classes minimal and efficient.
- Do NOT include placeholder Figma metadata or IDs.
- If mobile and desktop variants differ, implement responsive breakpoints appropriately.
- If the layout contains repeating content (e.g. cards, menu items), code at least one instance clearly.
- Do not add JavaScript unless explicitly required by the layout (e.g., dropdown, carousel).
- Comment the code minimally but meaningfully if complex sections exist.
- Output a complete HTML structure unless the user asks for partial snippets.
- Striclty do not miss any components which is mentioned in figma file.
`;

        const code = await generateCodeWithGemini(
            systemPrompt,
            simplifiedFigma
        );

        return NextResponse.json({ code });
    } catch (error) {
        console.error('Error generating code:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate code',
                message: (error as Error).message,
            },
            { status: 500 }
        );
    }
}
