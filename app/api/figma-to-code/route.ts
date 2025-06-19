import { NextResponse } from 'next/server';
import { generateCodeWithGemini } from '../generate-from-figma/route';

function extractFigmaFileKey(figmaUrl: string): string {
    const match = figmaUrl.match(/(?:file|proto|design)\/([a-zA-Z0-9]+)/);
    if (!match || !match[1]) throw new Error('Invalid Figma URL');
    return match[1];
}

async function fetchFigmaFile(fileKey: string, accessToken: string) {
    // Fetch the file data
    const fileResponse = await fetch(
        `https://api.figma.com/v1/files/${fileKey}`,
        {
            headers: {
                'X-Figma-Token': accessToken,
            },
        }
    );

    if (!fileResponse.ok) {
        throw new Error(`Figma API error (file): ${fileResponse.status}`);
    }

    const fileData = await fileResponse.json();

    // Get all nodes in the document to capture more details
    const nodeIds = getAllNodeIds(fileData.document);

    // Fetch node details in batches (Figma API has limits)
    const nodeData = await fetchNodeDetails(fileKey, nodeIds, accessToken);

    return {
        fileData,
        nodeData,
    };
}

function getAllNodeIds(document: any): string[] {
    const ids: string[] = [];

    function traverse(node: any) {
        if (node.id) {
            ids.push(node.id);
        }

        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(document);

    // Limit to a reasonable number to avoid API limits
    // return ids.slice(0, 100);
    return ids;
}

async function fetchNodeDetails(
    fileKey: string,
    nodeIds: string[],
    accessToken: string
) {
    // Split into batches of 50 (Figma API limit)
    const batches = [];
    for (let i = 0; i < nodeIds.length; i += 50) {
        batches.push(nodeIds.slice(i, i + 50));
    }

    const results: any = {};

    for (const batch of batches) {
        const nodeIdsParam = batch.join(',');
        const response = await fetch(
            `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIdsParam}`,
            {
                headers: {
                    'X-Figma-Token': accessToken,
                },
            }
        );

        if (!response.ok) {
            console.warn(`Figma API error (nodes): ${response.status}`);
            continue;
        }

        const data = await response.json();
        Object.assign(results, data.nodes);
    }

    return results;
}

async function fetchFigmaImages(
    fileKey: string,
    nodeIds: string[],
    accessToken: string
) {
    try {
        // const nodeIdsParam = nodeIds.slice(0, 50).join(","); // Limit to 50 nodes
        const nodeIdsParam = nodeIds.join(',');
        const response = await fetch(
            `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIdsParam}&format=png`,
            {
                headers: {
                    'X-Figma-Token': accessToken,
                },
            }
        );

        if (!response.ok) {
            console.warn(`Figma API error (images): ${response.status}`);
            return {};
        }

        const data = await response.json();
        return data.images || {};
    } catch (error) {
        console.error('Error fetching Figma images:', error);
        return {};
    }
}

function extractDesignTokens(fileData: any) {
    // Extract colors, typography, spacing, etc.
    const tokens = {
        colors: new Set<string>(),
        fontFamilies: new Set<string>(),
        fontSizes: new Set<number>(),
        spacing: new Set<number>(),
        borderRadii: new Set<number>(),
    };

    function traverse(node: any) {
        // Extract colors
        if (node.fills && node.fills.length > 0) {
            for (const fill of node.fills) {
                if (fill.type === 'SOLID' && fill.color) {
                    const { r, g, b } = fill.color;
                    const hex = rgbToHex(r * 255, g * 255, b * 255);
                    tokens.colors.add(hex);
                }
            }
        }

        // Extract typography
        if (node.style) {
            if (node.style.fontFamily)
                tokens.fontFamilies.add(node.style.fontFamily);
            if (node.style.fontSize) tokens.fontSizes.add(node.style.fontSize);
        }

        // Extract spacing
        if (node.absoluteBoundingBox) {
            if (node.paddingLeft) tokens.spacing.add(node.paddingLeft);
            if (node.paddingRight) tokens.spacing.add(node.paddingRight);
            if (node.paddingTop) tokens.spacing.add(node.paddingTop);
            if (node.paddingBottom) tokens.spacing.add(node.paddingBottom);
        }

        // Extract border radii
        if (node.cornerRadius) {
            tokens.borderRadii.add(node.cornerRadius);
        }

        // Traverse children
        if (node.children) {
            for (const child of node.children) {
                traverse(child);
            }
        }
    }

    traverse(fileData.document);

    // Convert Sets to Arrays
    return {
        colors: Array.from(tokens.colors),
        fontFamilies: Array.from(tokens.fontFamilies),
        fontSizes: Array.from(tokens.fontSizes),
        spacing: Array.from(tokens.spacing),
        borderRadii: Array.from(tokens.borderRadii),
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    return (
        '#' +
        [r, g, b]
            .map((x) => Math.round(x).toString(16).padStart(2, '0'))
            .join('')
    );
}

function preprocessFigmaData(data: any, nodeData: any, imageUrls: any) {
    // Extract design tokens
    const designTokens = extractDesignTokens(data);

    // Get main frames (usually pages or artboards)
    const mainFrames = data.document.children
        .filter((node: any) => node.type === 'FRAME' || node.type === 'CANVAS')
        .map((node: any) => {
            return {
                id: node.id,
                name: node.name,
                type: node.type,
                width: node.absoluteBoundingBox?.width,
                height: node.absoluteBoundingBox?.height,
                children: processChildren(node.children, nodeData, imageUrls),
            };
        });

    return {
        name: data.name,
        lastModified: data.lastModified,
        version: data.version,
        designTokens,
        // mainFrames: mainFrames.slice(0, 5), // Limit to first 5 frames for simplicity
        mainFrames,
    };
}

function processChildren(
    children: any[],
    nodeData: any,
    imageUrls: any,
    depth = 0,
    maxDepth = 3
) {
    if (!children || depth > maxDepth) return [];

    return children.map((child) => {
        // Get detailed node data if available
        const detailedNode = nodeData[child.id]?.document;
        const node = detailedNode || child;

        const result: any = {
            id: node.id,
            name: node.name,
            type: node.type,
        };

        // Add position and size if available
        if (node.absoluteBoundingBox) {
            result.position = {
                x: node.absoluteBoundingBox.x,
                y: node.absoluteBoundingBox.y,
            };
            result.size = {
                width: node.absoluteBoundingBox.width,
                height: node.absoluteBoundingBox.height,
            };
        }

        // Add style properties
        if (node.fills && node.fills.length > 0) {
            const solidFill = node.fills.find(
                (fill: any) => fill.type === 'SOLID'
            );
            if (solidFill && solidFill.color) {
                const { r, g, b } = solidFill.color;
                result.backgroundColor = rgbToHex(r * 255, g * 255, b * 255);
                if (solidFill.opacity !== undefined) {
                    result.opacity = solidFill.opacity;
                }
            }
        }

        // Add border properties
        if (node.strokes && node.strokes.length > 0) {
            const stroke = node.strokes[0];
            if (stroke.type === 'SOLID' && stroke.color) {
                const { r, g, b } = stroke.color;
                result.borderColor = rgbToHex(r * 255, g * 255, b * 255);
                result.borderWidth = node.strokeWeight;
            }
        }

        if (node.type === 'VECTOR' && imageUrls[node.id]) {
            result.imageUrl = imageUrls[node.id];
            result.type = 'VECTOR_IMAGE'; // custom flag for your frontend to interpret
        }

        // Add corner radius
        if (node.cornerRadius) {
            result.borderRadius = node.cornerRadius;
        }

        // Add text properties
        if (node.type === 'TEXT') {
            result.text = node.characters;
            if (node.style) {
                result.textStyle = {
                    fontFamily: node.style.fontFamily,
                    fontSize: node.style.fontSize,
                    fontWeight: node.style.fontWeight,
                    textAlignHorizontal: node.style.textAlignHorizontal,
                    textAlignVertical: node.style.textAlignVertical,
                };

                if (node.fills && node.fills.length > 0) {
                    const textFill = node.fills.find(
                        (fill: any) => fill.type === 'SOLID'
                    );
                    if (textFill && textFill.color) {
                        const { r, g, b } = textFill.color;
                        result.textStyle.color = rgbToHex(
                            r * 255,
                            g * 255,
                            b * 255
                        );
                    }
                }
            }
        }

        // Add image URL if available
        if (
            (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') &&
            imageUrls[node.id]
        ) {
            result.imageUrl = imageUrls[node.id];
        }

        if (node.children?.some((child) => child.isMask)) {
            result.isMaskGroup = true;
        }

        if (result.isMaskGroup) {
            const maskNode = node.children.find((child) => child.isMask);
            const contentNode = node.children.find((child) => !child.isMask);

            if (
                contentNode?.type === 'RECTANGLE' ||
                contentNode?.type === 'VECTOR'
            ) {
                const imageUrl = imageUrls[contentNode.id];
                if (imageUrl) {
                    result.maskedImage = {
                        imageUrl,
                        maskId: maskNode?.id,
                        contentId: contentNode.id,
                    };
                }
            }
        }

        // Process children recursively
        if (node.children && node.children.length > 0) {
            result.children = processChildren(
                node.children,
                nodeData,
                imageUrls,
                depth + 1,
                maxDepth
            );
        }

        return result;
    });
}

export async function POST(request: Request) {
    try {
        const { figmaUrl } = await request.json();

        if (!figmaUrl) {
            return NextResponse.json(
                { error: 'Figma URL is required' },
                { status: 400 }
            );
        }

        const fileKey = extractFigmaFileKey(figmaUrl);
        const accessToken = process.env.FIGMA_ACCESS_TOKEN;

        if (!accessToken) {
            return NextResponse.json(
                { error: 'Figma access token is not configured' },
                { status: 500 }
            );
        }

        // Fetch Figma file data
        const { fileData, nodeData } = await fetchFigmaFile(
            fileKey,
            accessToken
        );

        // Get image URLs for relevant nodes
        const imageNodes = Object.keys(nodeData).filter((id) => {
            const node = nodeData[id].document;
            // return (
            //     node &&
            //     (node.type === "RECTANGLE" || node.type === "ELLIPSE")
            // );
            return (
                node &&
                [
                    'RECTANGLE',
                    'ELLIPSE',
                    'VECTOR',
                    'BOOLEAN_OPERATION',
                    'STAR',
                    'POLYGON',
                    'COMPONENT',
                    'INSTANCE',
                    'FRAME',
                ].includes(node.type)
            );
        });
        // .slice(0, 50); // Limit to 50 images

        const imageUrls = await fetchFigmaImages(
            fileKey,
            imageNodes,
            accessToken
        );

        // Process the Figma data
        const processedData = preprocessFigmaData(
            fileData,
            nodeData,
            imageUrls
        );

        const systemPrompt = `
You are an expert front-end developer that converts high-fidelity Figma designs into clean, responsive HTML and Tailwind CSS. Your goal is to produce semantic, accessible, and production-ready code.

Instructions:
- Use modern Tailwind CSS (latest stable version) with best practices.
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
- Do NOT include explanations, markdown, or comments outside the HTML. Return only the pure HTML code.
`;

        const code = await generateCodeWithGemini(systemPrompt, processedData);

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
