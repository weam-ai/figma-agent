'use client';

import type React from 'react';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Loader2, Check, RefreshCw, Code, Server } from 'lucide-react';
import { CodePreview } from '@/components/code-preview';
import { Steps, Step } from '@/components/steps';
import { LivePreview } from '@/components/LivePreview';
import { MarkdownRenderer } from '@/components/markdown';

type GenerationStep =
    | 'input'
    | 'design-preview'
    | 'component-prompt'
    | 'component-preview'
    | 'api-question'
    | 'api-prompt'
    | 'api-preview'
    | 'complete';

export default function Home() {
    const [figmaUrl, setFigmaUrl] = useState('');
    const [componentPrompt, setComponentPrompt] = useState('');
    const [apiPrompt, setApiPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState<GenerationStep>('input');
    const [activeTab, setActiveTab] = useState('code');

    // Generated code states
    const [designCode, setDesignCode] = useState('');
    const [componentCode, setComponentCode] = useState('');
    const [apiCode, setApiCode] = useState('');
    const [integratedCode, setIntegratedCode] = useState('');

    const handleFigmaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!figmaUrl.trim()) return;

        setLoading(true);
        try {
            const response = await fetch("/api/figma-to-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ figmaUrl }),
            });

            if (!response.ok)
                throw new Error("Failed to generate code from Figma");

            const data = await response.json();
            setDesignCode(data.code);
            setCurrentStep('design-preview');
        } catch (error) {
            console.error('Error generating code:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateDesign = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/regenerate-design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ figmaUrl, previousCode: designCode }),
            });

            if (!response.ok) throw new Error('Failed to regenerate design');

            const data = await response.json();
            setDesignCode(data.code);
        } catch (error) {
            console.error('Error regenerating design:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveDesign = () => {
        setCurrentStep('component-prompt');
    };

    const handleComponentPromptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!componentPrompt.trim()) return;

        setLoading(true);
        try {
            const response = await fetch('/api/generate-components', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    figmaUrl,
                    designCode,
                    componentPrompt,
                }),
            });
            if (!response.ok) throw new Error('Failed to generate components');

            const data = await response.json();
            setComponentCode(data.code);
            setCurrentStep('component-preview');
        } catch (error) {
            console.error('Error generating components:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApiQuestion = (wantsBackendApi: boolean) => {
        if (wantsBackendApi) {
            setCurrentStep('api-prompt');
        } else {
            setCurrentStep('complete');
            setIntegratedCode(componentCode);
        }
    };

    const handleApiPromptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiPrompt.trim()) return;

        setLoading(true);
        try {
            const response = await fetch('/api/generate-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    componentCode,
                    apiPrompt,
                }),
            });

            if (!response.ok) throw new Error('Failed to generate API');

            const data = await response.json();
            setApiCode(data.apiCode);
            setIntegratedCode(data.integratedCode);
            setCurrentStep('api-preview');
        } catch (error) {
            console.error('Error generating API:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = () => {
        setCurrentStep('complete');
    };

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 'input':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Convert Figma to Code</CardTitle>
                            <CardDescription>
                                Enter a Figma URL to generate code based on the
                                design
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleFigmaSubmit}
                                className="space-y-4"
                            >
                                <Input
                                    placeholder="Paste your Figma URL here"
                                    value={figmaUrl}
                                    onChange={(e) =>
                                        setFigmaUrl(e.target.value)
                                    }
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    disabled={loading || !figmaUrl.trim()}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Code from Figma'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'design-preview':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Design Preview</CardTitle>
                            <CardDescription>
                                Review the generated design and approve or
                                regenerate
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                            >
                                <div className="border-b px-4">
                                    <TabsList className="h-12">
                                        <TabsTrigger value="preview">
                                            Preview
                                        </TabsTrigger>
                                        <TabsTrigger value="code">
                                            Code
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="preview" className="p-0">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <LivePreview markdown={designCode} />
                                    </div>
                                </TabsContent>
                                <TabsContent value="code" className="p-0">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <CodePreview code={designCode} />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                        <CardFooter className="flex justify-between gap-2 pt-6">
                            <Button
                                variant="outline"
                                onClick={handleRegenerateDesign}
                                disabled={loading}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate
                            </Button>
                            <Button
                                onClick={handleApproveDesign}
                                disabled={loading}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Approve Design
                            </Button>
                        </CardFooter>
                    </Card>
                );

            case 'component-prompt':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Component Structure</CardTitle>
                            <CardDescription>
                                Describe how you want the components structured
                                for your project
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleComponentPromptSubmit}
                                className="space-y-4"
                            >
                                <Textarea
                                    placeholder="Describe your project structure and component requirements..."
                                    value={componentPrompt}
                                    onChange={(e) =>
                                        setComponentPrompt(e.target.value)
                                    }
                                    className="min-h-[150px]"
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    disabled={
                                        loading || !componentPrompt.trim()
                                    }
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Components...
                                        </>
                                    ) : (
                                        'Generate React Components'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'component-preview':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Component Preview</CardTitle>
                            <CardDescription>
                                Review the generated React components
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs
                                value={activeTab}
                                onValueChange={setActiveTab}
                            >
                                <div className="border-b px-4">
                                    <TabsList className="h-12">
                                        <TabsTrigger value="code">
                                            Code
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="code" className="p-0">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <MarkdownRenderer
                                            content={componentCode}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                        <CardFooter className="flex justify-between gap-2 pt-6">
                            <Button
                                variant="outline"
                                onClick={() => handleApiQuestion(false)}
                                disabled={loading}
                            >
                                <Code className="mr-2 h-4 w-4" />
                                Skip API Creation
                            </Button>
                            <Button
                                onClick={() => handleApiQuestion(true)}
                                disabled={loading}
                            >
                                <Server className="mr-2 h-4 w-4" />
                                Create Backend API
                            </Button>
                        </CardFooter>
                    </Card>
                );

            case 'api-prompt':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Backend API</CardTitle>
                            <CardDescription>
                                Describe the backend API you want to create
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleApiPromptSubmit}
                                className="space-y-4"
                            >
                                <Textarea
                                    placeholder="Describe the backend API functionality you need..."
                                    value={apiPrompt}
                                    onChange={(e) =>
                                        setApiPrompt(e.target.value)
                                    }
                                    className="min-h-[150px]"
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    disabled={loading || !apiPrompt.trim()}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating API...
                                        </>
                                    ) : (
                                        'Generate Backend API'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'api-preview':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>API and Integration Preview</CardTitle>
                            <CardDescription>
                                Review the generated API and integrated
                                components
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs defaultValue="integrated">
                                <div className="border-b px-4">
                                    <TabsList className="h-12">
                                        <TabsTrigger value="integrated">
                                            Integrated Preview
                                        </TabsTrigger>
                                        <TabsTrigger value="api">
                                            API Code
                                        </TabsTrigger>
                                        <TabsTrigger value="integrated-code">
                                            Integrated Code
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="integrated" className="p-0">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <MarkdownRenderer
                                            content={integratedCode}
                                        />
                                    </div>
                                </TabsContent>
                                <TabsContent value="api" className="p-0">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <MarkdownRenderer content={apiCode} />
                                    </div>
                                </TabsContent>
                                <TabsContent
                                    value="integrated-code"
                                    className="p-0"
                                >
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <MarkdownRenderer
                                            content={integratedCode}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-6">
                            <Button onClick={handleComplete}>
                                <Check className="mr-2 h-4 w-4" />
                                Complete
                            </Button>
                        </CardFooter>
                    </Card>
                );

            case 'complete':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Generation Complete</CardTitle>
                            <CardDescription>
                                Your code has been successfully generated
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs defaultValue="preview">
                                <div className="border-b px-4">
                                    <TabsList className="h-12">
                                        <TabsTrigger value="preview">
                                            Preview
                                        </TabsTrigger>
                                        <TabsTrigger value="code">
                                            Code
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                                <TabsContent value="preview" className="p-0">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <MarkdownRenderer
                                            content={integratedCode}
                                        />
                                    </div>
                                </TabsContent>
                                <TabsContent value="code" className="p-0">
                                    <div className="bg-gray-50 dark:bg-gray-900 p-6 min-h-[400px]">
                                        <CodePreview code={integratedCode} />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-6">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep('input')}
                            >
                                Start New Project
                            </Button>
                            <Button>Download Code</Button>
                        </CardFooter>
                    </Card>
                );
        }
    };

    return (
        <main className="mx-auto py-4 px-10 xl:px-32 w-11/12">
            <h1 className="text-3xl font-bold mb-6">Figma to Code Generator</h1>

            <div className="mb-8">
                <Steps
                    currentStep={
                        currentStep === 'input'
                            ? 0
                            : currentStep === 'design-preview'
                            ? 1
                            : currentStep === 'component-prompt'
                            ? 2
                            : currentStep === 'component-preview'
                            ? 3
                            : currentStep === 'api-question' ||
                              currentStep === 'api-prompt'
                            ? 4
                            : currentStep === 'api-preview' ||
                              currentStep === 'complete'
                            ? 5
                            : 0
                    }
                >
                    <Step
                        title="Figma URL"
                        description="Enter your Figma design URL"
                    />
                    <Step
                        title="Design Preview"
                        description="Review the initial code"
                    />
                    <Step
                        title="Component Structure"
                        description="Define your components"
                    />
                    <Step
                        title="Component Preview"
                        description="Review the components"
                    />
                    <Step
                        title="Backend API"
                        description="Create a backend API"
                    />
                    <Step
                        title="Complete"
                        description="Final integrated code"
                    />
                </Steps>
            </div>

            {renderCurrentStep()}
        </main>
    );
}
