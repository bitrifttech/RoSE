import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCw, ExternalLink } from 'lucide-react';

interface PreviewWindowProps {
  url?: string;
  className?: string;
}

export function PreviewWindow({ url = 'http://localhost:8040', className = '' }: PreviewWindowProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = () => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank');
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Preview</span>
          {error && <span className="text-sm text-red-500">{error}</span>}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            title="Refresh preview"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            title="Open in new window"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 relative bg-background">
        <iframe
          id="preview-iframe"
          src={url}
          className="absolute inset-0 w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          onError={() => setError('Failed to load preview')}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </Card>
  );
}
