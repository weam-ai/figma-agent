import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepsProps = {
    children: React.ReactNode;
    currentStep: number;
};

type StepProps = {
    title: string;
    description?: string;
};

export function Steps({ children, currentStep }: StepsProps) {
    const childrenArray = React.Children.toArray(
        children
    ) as React.ReactElement<StepProps>[];

    return (
        <div className="space-y-6">
            <div className="relative after:absolute after:inset-x-0 after:top-1/2 after:block after:h-0.5 after:-translate-y-1/2 after:rounded-lg after:bg-gray-100 dark:after:bg-gray-800">
                <ol className="relative z-10 flex justify-between">
                    {childrenArray.map((step, index) => {
                        const isActive = currentStep === index;
                        const isCompleted = currentStep > index;

                        return (
                            <li key={index} className="flex items-center gap-2">
                                <div
                                    className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                                        isActive &&
                                            'border-primary bg-primary text-primary-foreground',
                                        isCompleted &&
                                            'border-primary bg-primary text-primary-foreground',
                                        !isActive &&
                                            !isCompleted &&
                                            'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckIcon className="h-4 w-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>

                                <div className="hidden sm:block">
                                    <h3 className="font-medium">
                                        {step.props.title}
                                    </h3>
                                    {step.props.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {step.props.description}
                                        </p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}

export function Step({ title, description }: StepProps) {
    return null;
}
