import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'figma agent',
    description: 'Convert figma designs to code',
    generator: 'figma agent',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
