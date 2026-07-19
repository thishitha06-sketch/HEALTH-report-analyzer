/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { MedicalReport, ChatMessage } from '../types';
import { Send, MessageCircle, RefreshCw, FileText, Bot, User as UserIcon, Heart } from 'lucide-react';

interface AIChatProps {
  reports: MedicalReport[];
  selectedReportId: string | null;
  onSelectReportId: (id: string | null) => void;
  token: string;
  activeProfileId?: string;
  language?: string;
}

export default function AIChat({ reports, selectedReportId, onSelectReportId, token, activeProfileId, language = 'English' }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Clickable grounded questions based on master prompt
  const preseededSuggestions = [
    { text: "Why is my Vitamin D low?", reqDoc: "Blood Report" },
    { text: "Explain my MRI findings.", reqDoc: "MRI" },
    { text: "What foods help increase iron?", reqDoc: "Blood Report" },
    { text: "What questions should I ask my doctor?", reqDoc: "Any" }
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages,
          reportId: selectedReportId,
          activeProfileId,
          language
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch response.");
      }

      const aiMessage: ChatMessage = {
        id: 'msg-ai-' + Date.now(),
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: 'msg-err-' + Date.now(),
        role: 'assistant',
        text: `⚠️ I apologize, but I encountered an issue: ${err.message || "Failed to reach the medical analysis engine."}. Please ensure your Gemini API Key is configured in the Secrets panel.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header Panel */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 font-medium mb-1 flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-emerald-800" />
            AI Health Chat
          </h1>
          <p className="text-stone-500 text-sm">Ask clinical or lifestyle questions grounded in your analyzed medical reports.</p>
        </div>

        {/* Report Grounding Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-stone-500 whitespace-nowrap">Ground Chat In:</span>
          <select
            value={selectedReportId || ''}
            onChange={(e) => onSelectReportId(e.target.value || null)}
            className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all max-w-xs cursor-pointer text-sm"
          >
            <option value="">General Medical Context (No Report)</option>
            {reports.map((report) => (
              <option key={report.id} value={report.id}>
                📄 {report.analysisResult.title || report.fileName}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2.5 border border-stone-200 rounded-xl text-stone-400 hover:text-red-750 hover:bg-red-50 transition-colors"
              title="Clear entire conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col overflow-hidden relative">
        
        {/* Messages Scrolling Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
              <Bot className="w-16 h-16 text-emerald-800 mb-4 animate-pulse" />
              <h3 className="text-2xl font-serif font-medium text-emerald-950 mb-2">Empathetic Health Companion</h3>
              <p className="text-stone-500 mb-6 leading-relaxed">
                {selectedReportId 
                  ? "I am prepared and grounded in your selected medical report. Ask me anything regarding its findings, biological markers, or food options." 
                  : "Upload a clinical record in the Report Analyzer, or select an existing report from the dropdown above, and ask questions to start a targeted health analysis."}
              </p>
              
              {/* Preseeded suggestions list */}
              <div className="grid grid-cols-1 gap-2 w-full">
                {preseededSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s.text)}
                    className="text-left px-5 py-3 border border-stone-200 rounded-2xl hover:border-emerald-700 hover:bg-emerald-50/20 text-stone-700 font-medium transition-all text-sm flex items-center gap-3 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* AI Logo Avatar */}
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}

                  <div className="max-w-[80%] flex flex-col">
                    {/* Message Bubble */}
                    <div
                      className={`rounded-3xl px-6 py-4 shadow-sm text-base leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-900 text-white rounded-tr-none'
                          : 'bg-[#FBF9F6] border border-stone-150 text-stone-800 rounded-tl-none whitespace-pre-wrap'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {/* Timestamp */}
                    <span className={`text-[10px] text-stone-400 mt-1.5 px-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* User Avatar */}
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 flex-shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Waiting Loading Indicator Bubble */}
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm animate-spin">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="max-w-[70%] bg-[#FBF9F6] border border-stone-150 rounded-3xl rounded-tl-none px-6 py-4 shadow-sm text-stone-500 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.4s]"></span>
                    Analyzing medical reference data...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Disclaimer Safety Ribbon */}
        <div className="bg-amber-50/70 border-y border-amber-100 py-2.5 px-6 flex items-center gap-2 text-xs text-amber-900/80">
          <Heart className="w-3.5 h-3.5 text-amber-700 fill-amber-700/10 flex-shrink-0" />
          <span>Educational health reference only. AI responses are not a clinical diagnosis. Consult your GP for medical action.</span>
        </div>

        {/* Input Bar Footer */}
        <div className="p-4 border-t border-stone-200 bg-white">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage(inputText);
              }}
              disabled={isLoading}
              className="flex-1 bg-[#FBF9F6] border border-stone-200 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-900/10 focus:border-emerald-900 transition-all text-stone-800 disabled:opacity-50"
              placeholder={selectedReportId ? "Ask a question about this report..." : "Type a health or lifestyle question..."}
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="bg-emerald-900 text-white rounded-2xl px-6 flex items-center justify-center hover:bg-emerald-800 transition-colors cursor-pointer disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
