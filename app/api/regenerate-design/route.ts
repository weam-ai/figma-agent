import { NextResponse } from 'next/server';
import { generateCodeWithGemini } from '../generate-from-figma/route';

export async function POST(request: Request) {
    try {
        const { figmaUrl, previousCode } = await request.json();

        if (!figmaUrl || !previousCode) {
            return NextResponse.json(
                { error: 'Figma URL and previous code are required' },
                { status: 400 }
            );
        }

        const prompt = `
    You are a Figma-to-code expert. The user is not satisfied with the previous code generation.
    
    Figma URL: ${figmaUrl}
    
    Previous code:
    ${previousCode}
    
    Create an improved version with:
    - Better visual design
    - More modern UI elements
    - Improved spacing and layout
    - Better color scheme
    - More attention to detail
    
    Rules:
    - Use Tailwind CSS for styling
    - Make it responsive
    - Only include the HTML content (no <!DOCTYPE>, <html>, <head>, or <body> tags)
    - Do not include any JavaScript
    
    Return ONLY the improved HTML code with Tailwind classes.
  `;

        const code = await generateCodeWithGemini(prompt, previousCode);

        return NextResponse.json({ code });
    } catch (error) {
        console.error('Error regenerating design:', error);
        return NextResponse.json(
            { error: 'Failed to regenerate design' },
            { status: 500 }
        );
    }
}
