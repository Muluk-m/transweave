'use client'
import React from "react";

export const LoadingView: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium text-muted-foreground">正在加载，请稍候...</p>
        </div>
    );
}
