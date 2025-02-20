import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ThinkingAnimation } from "./ThinkingAnimation";
import { AutoFocusInput } from "@/components/ui/auto-focus-input";

interface Message {
  id: number;
  text: string;
  sender: "user" | "assistant" | "system" | "tool";
  role?: string;
  toolCallId?: string;
  toolName?: string;
  refusal?: string | null;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const focusInput = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      sender: "user",
      role: "human"
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8100/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: inputValue
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('Received response:', data);

      if (data.response && data.messages) {
        // Add all messages from the conversation
        const newMessages: Message[] = data.messages.map((msg: any) => ({
          id: Date.now() + Math.random(),
          text: typeof msg.content === 'string' ? msg.content : 
                Array.isArray(msg.content) ? msg.content.map((block: any) => 
                  block.type === 'text' ? block.text : ''
                ).join('') :
                JSON.stringify(msg.content),
          sender: msg.role === "human" ? "user" : 
                 msg.role === "system" ? "system" : 
                 msg.role === "tool" ? "tool" : "assistant",
          role: msg.role,
          toolCallId: msg.tool_call_id,
          toolName: msg.name,
          refusal: msg.refusal
        }));

        // Filter out duplicates and messages we already have
        const existingIds = new Set(messages.map(m => m.text + m.sender));
        const uniqueNewMessages = newMessages.filter(
          msg => !existingIds.has(msg.text + msg.sender)
        );

        setMessages(prev => [...prev, ...uniqueNewMessages]);
      } else {
        // Fallback to simpler formats
        let messageText = '';
        if (data.response) {
          messageText = data.response;
        } else if (typeof data === 'string') {
          messageText = data;
        } else if (data.result && typeof data.result === 'object') {
          if (data.result.text) {
            messageText = data.result.text;
          } else {
            messageText = JSON.stringify(data.result, null, 2);
          }
        } else if (data.output && typeof data.output === 'string') {
          messageText = data.output;
        } else if (data.text && typeof data.text === 'string') {
          messageText = data.text;
        } else {
          messageText = JSON.stringify(data, null, 2);
        }

        const assistantMessage: Message = {
          id: Date.now(),
          text: messageText,
          sender: "assistant",
          role: "ai"
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now(),
        text: "Sorry, I encountered an error processing your request.",
        sender: "assistant",
        role: "ai"
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      focusInput();
    }
  };

  useEffect(() => {
    focusInput();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ 
          height: 'calc(100vh - 80px)',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : message.sender === "system"
                  ? "bg-secondary/20"
                  : message.sender === "tool"
                  ? "bg-accent/20"
                  : "bg-muted"
              }`}
            >
              {message.toolName && (
                <div className="text-xs text-muted-foreground mb-1">
                  Tool: {message.toolName}
                </div>
              )}
              <ReactMarkdown
                components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        {...props}
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...props} className={className}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-muted">
              <ThinkingAnimation />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-none sticky bottom-0 w-full bg-background border-t">
        <form onSubmit={handleSendMessage} className="p-4 flex gap-2">
          <AutoFocusInput
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Chat;