import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  RotateCw, 
  ExternalLink, 
  ArrowLeft, 
  ArrowRight, 
  Home,
  X,
  Search
} from 'lucide-react';

interface PreviewWindowProps {
  url?: string;
  className?: string;
}

export function PreviewWindow({ url = 'http://localhost:8040', className = '' }: PreviewWindowProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [urlInput, setUrlInput] = useState(url);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  const handleOpenExternal = () => {
    window.open(currentUrl, '_blank');
  };

  const handleGoBack = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.back();
      } catch (e) {
        console.error('Failed to go back:', e);
      }
    }
  };

  const handleGoForward = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.history.forward();
      } catch (e) {
        console.error('Failed to go forward:', e);
      }
    }
  };

  const handleGoHome = () => {
    setCurrentUrl(url);
    setUrlInput(url);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUrl(urlInput);
    if (iframeRef.current) {
      iframeRef.current.src = urlInput;
    }
  };

  const handleUrlClear = () => {
    setUrlInput('');
  };

  useEffect(() => {
    const checkNavigation = () => {
      if (iframeRef.current?.contentWindow) {
        try {
          const history = iframeRef.current.contentWindow.history;
          setCanGoBack(history.length > 1);
          setCanGoForward(history.length < history.length);
        } catch (e) {
          console.error('Failed to check navigation state:', e);
        }
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', checkNavigation);
      return () => iframe.removeEventListener('load', checkNavigation);
    }
  }, []);

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <div className="flex flex-col border-b">
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
        <div className="flex items-center space-x-2 p-2">
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              disabled={!canGoBack}
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoForward}
              disabled={!canGoForward}
              title="Go forward"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoHome}
              title="Go to homepage"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center space-x-2">
            <div className="flex-1 relative">
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="pr-8"
                placeholder="Enter URL..."
              />
              {urlInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={handleUrlClear}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button type="submit" size="sm" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
      <div className="flex-1 relative bg-background">
        <iframe
          ref={iframeRef}
          id="preview-iframe"
          src={currentUrl}
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
