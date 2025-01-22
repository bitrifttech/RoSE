import React from 'react';
import { cn } from "@/lib/utils";

export const ThinkingAnimation = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-3 px-1", className)}>
      <div className="relative flex space-x-2">
        {/* Pulse Ring */}
        <div className="absolute -inset-1">
          <div className="w-full h-full rotate-180 opacity-30 blur-sm filter">
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        
        {/* Dots */}
        <div className="relative flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-thinking"
              style={{
                animationDelay: `${i * 0.15}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
