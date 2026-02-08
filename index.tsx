
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Vibe coded by ammaar@google.com for Third Signal Lab

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import { Artifact, Session, ComponentVariation, LayoutOption } from './types';
import { INITIAL_PLACEHOLDERS } from './constants';
import { generateId } from './utils';

import KryptonHudBackground from './components/DottedGlowBackground';
import ArtifactCard from './components/ArtifactCard';
import SideDrawer from './components/SideDrawer';
import { 
    ThinkingIcon, 
    CodeIcon, 
    SparklesIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon, 
    ArrowUpIcon, 
    GridIcon,
    CopyIcon,
    DownloadIcon,
    ReactIcon,
    CheckIcon
} from './components/Icons';

function CodeExportView({ html }: { html: string }) {
    const [format, setFormat] = useState<'html' | 'react'>('html');
    const [copied, setCopied] = useState(false);

    const getReactCode = (rawHtml: string) => {
        let jsx = rawHtml
            .replace(/class=/g, 'className=')
            .replace(/for=/g, 'htmlFor=');
        
        return `import React from 'react';\n\nexport default function GeneratedComponent() {\n  return (\n    <>\n      ${jsx.split('\n').map(line => '      ' + line).join('\n').trim()}\n    </>\n  );\n}`;
    };

    const codeToDisplay = format === 'html' ? html : getReactCode(html);

    const handleCopy = () => {
        navigator.clipboard.writeText(codeToDisplay);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Signal Canvas Export</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; padding: 20px; background: #030407; color: #e0faff; font-family: sans-serif; }
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signal-canvas-component.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="code-export-view">
            <div className="export-tabs">
                <button 
                    className={format === 'html' ? 'active' : ''} 
                    onClick={() => setFormat('html')}
                >
                    <CodeIcon /> HTML
                </button>
                <button 
                    className={format === 'react' ? 'active' : ''} 
                    onClick={() => setFormat('react')}
                >
                    <ReactIcon /> React
                </button>
                <div className="spacer"></div>
                <button className="icon-btn" onClick={handleCopy} title="Copy Code">
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
                <button className="icon-btn" onClick={handleDownload} title="Download HTML">
                    <DownloadIcon />
                </button>
            </div>
            <pre className="code-block"><code>{codeToDisplay}</code></pre>
        </div>
    );
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [focusedArtifactIndex, setFocusedArtifactIndex] = useState<number | null>(null);
  
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEngaging, setIsEngaging] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholders, setPlaceholders] = useState<string[]>(INITIAL_PLACEHOLDERS);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'code' | 'variations' | null;
      title: string;
      data: any; 
  }>({ isOpen: false, mode: null, title: '', data: null });

  const [componentVariations, setComponentVariations] = useState<ComponentVariation[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (focusedArtifactIndex !== null && window.innerWidth <= 1024) {
        if (gridScrollRef.current) {
            gridScrollRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }
  }, [focusedArtifactIndex]);

  useEffect(() => {
      const interval = setInterval(() => {
          setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
      }, 3000);
      return () => clearInterval(interval);
  }, [placeholders.length]);

  useEffect(() => {
      const fetchDynamicPlaceholders = async () => {
          try {
              const apiKey = process.env.API_KEY;
              if (!apiKey) return;
              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                  model: 'gemini-3-flash-preview',
                  contents: { 
                      role: 'user', 
                      parts: [{ 
                          text: 'Generate 20 futuristic Kryptonian HUD UI component prompts (e.g. "Crystalline thermal map", "Neural sync relay", "Orbital trajectory graph"). Return ONLY a raw JSON array of strings.' 
                      }] 
                  }
              });
              const text = response.text || '[]';
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                  const newPlaceholders = JSON.parse(jsonMatch[0]);
                  if (Array.isArray(newPlaceholders) && newPlaceholders.length > 0) {
                      const shuffled = newPlaceholders.sort(() => 0.5 - Math.random()).slice(0, 10);
                      setPlaceholders(prev => [...prev, ...shuffled]);
                  }
              }
          } catch (e) {
              console.warn("Silently failed to fetch dynamic placeholders", e);
          }
      };
      setTimeout(fetchDynamicPlaceholders, 1000);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const parseJsonStream = async function* (responseStream: AsyncGenerator<{ text: string }>) {
      let buffer = '';
      for await (const chunk of responseStream) {
          const text = chunk.text;
          if (typeof text !== 'string') continue;
          buffer += text;
          let braceCount = 0;
          let start = buffer.indexOf('{');
          while (start !== -1) {
              braceCount = 0;
              let end = -1;
              for (let i = start; i < buffer.length; i++) {
                  if (buffer[i] === '{') braceCount++;
                  else if (buffer[i] === '}') braceCount--;
                  if (braceCount === 0 && i > start) {
                      end = i;
                      break;
                  }
              }
              if (end !== -1) {
                  const jsonString = buffer.substring(start, end + 1);
                  try {
                      yield JSON.parse(jsonString);
                      buffer = buffer.substring(end + 1);
                      start = buffer.indexOf('{');
                  } catch (e) {
                      start = buffer.indexOf('{', start + 1);
                  }
              } else {
                  break; 
              }
          }
      }
  };

  const handleGenerateVariations = useCallback(async () => {
    const currentSession = sessions[currentSessionIndex];
    if (!currentSession || focusedArtifactIndex === null) return;
    const currentArtifact = currentSession.artifacts[focusedArtifactIndex];

    setIsLoading(true);
    setComponentVariations([]);
    setDrawerState({ isOpen: true, mode: 'variations', title: 'System Mutations', data: currentArtifact.id });

    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API_KEY missing.");
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
Generate 3 radical technical mutations for: "${currentSession.prompt}".
Personas: "Orbital Command", "Quantum Relay", "Deep Core Archive".
Required JSON Output Format: \`{ "name": "Persona Name", "html": "..." }\`
        `.trim();

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
             contents: [{ parts: [{ text: prompt }], role: 'user' }],
             config: { temperature: 1.2 }
        });

        for await (const variation of parseJsonStream(responseStream)) {
            if (variation.name && variation.html) {
                setComponentVariations(prev => [...prev, variation]);
            }
        }
    } catch (e: any) {
        console.error("Variations error:", e);
    } finally {
        setIsLoading(false);
    }
  }, [sessions, currentSessionIndex, focusedArtifactIndex]);

  const applyVariation = (html: string) => {
      if (focusedArtifactIndex === null) return;
      setSessions(prev => prev.map((sess, i) => 
          i === currentSessionIndex ? {
              ...sess,
              artifacts: sess.artifacts.map((art, j) => 
                j === focusedArtifactIndex ? { ...art, html, status: 'complete' } : art
              )
          } : sess
      ));
      setDrawerState(s => ({ ...s, isOpen: false }));
  };

  const handleShowCode = () => {
      const currentSession = sessions[currentSessionIndex];
      if (currentSession && focusedArtifactIndex !== null) {
          const artifact = currentSession.artifacts[focusedArtifactIndex];
          setDrawerState({ isOpen: true, mode: 'code', title: 'System Source', data: artifact.html });
      }
  };

  const handleSendMessage = useCallback(async (manualPrompt?: string) => {
    const promptToUse = manualPrompt || inputValue;
    const trimmedInput = promptToUse.trim();
    
    if (!trimmedInput || isLoading) return;
    if (!manualPrompt) setInputValue('');

    setIsLoading(true);
    const sessionId = generateId();

    const placeholderArtifacts: Artifact[] = Array(3).fill(null).map((_, i) => ({
        id: `${sessionId}_${i}`,
        styleName: 'Accessing Archives...',
        html: '',
        status: 'streaming',
    }));

    const newSession: Session = {
        id: sessionId,
        prompt: trimmedInput,
        timestamp: Date.now(),
        artifacts: placeholderArtifacts
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionIndex(sessions.length); 
    setFocusedArtifactIndex(null); 

    try {
        const apiKey = process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey });

        const stylePrompt = `
Generate 3 Kryptonian HUD design directions for: "${trimmedInput}". 
Directions should focus on different data visualization modalities (e.g., Crystalline, Holographic, Neural).
Return ONLY raw JSON array of strings.
        `.trim();

        const styleResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { role: 'user', parts: [{ text: stylePrompt }] }
        });

        let generatedStyles: string[] = ["Holographic Overlay", "Neural Matrix", "Crystal Logic"];
        try {
            const match = styleResponse.text.match(/\[.*\]/);
            if (match) generatedStyles = JSON.parse(match[0]);
        } catch (e) {}

        setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            artifacts: s.artifacts.map((art, i) => ({ ...art, styleName: generatedStyles[i] }))
        } : s));

        const generateArtifact = async (artifact: Artifact, styleInstruction: string) => {
            try {
                const prompt = `
Design a complex, high-fidelity HUD component for: "${trimmedInput}".
STYLE: ${styleInstruction} (Kryptonian Technical Aesthetic)

RULES:
- Theme: Dark background, glowing teal/cyan accents (#22d3ee), crystalline geometry.
- Layout: Use borders, scanlines, and status indicators. 
- Use Tailwind CSS. 
- Ensure a technical, "data-heavy" look with monospace fonts.
- Return ONLY the internal HTML body content. No <html> or <body> tags needed.
          `.trim();
          
                const responseStream = await ai.models.generateContentStream({
                    model: 'gemini-3-flash-preview',
                    contents: [{ parts: [{ text: prompt }], role: "user" }],
                });

                let acc = '';
                for await (const chunk of responseStream) {
                    acc += chunk.text;
                    setSessions(prev => prev.map(sess => sess.id === sessionId ? {
                        ...sess,
                        artifacts: sess.artifacts.map(art => art.id === artifact.id ? { ...art, html: acc } : art)
                    } : sess));
                }
                
                let final = acc.replace(/```html|```/g, '').trim();
                setSessions(prev => prev.map(sess => sess.id === sessionId ? {
                    ...sess,
                    artifacts: sess.artifacts.map(art => art.id === artifact.id ? { ...art, html: final, status: 'complete' } : art)
                } : sess));

            } catch (e) {
                console.error(e);
            }
        };

        await Promise.all(placeholderArtifacts.map((art, i) => generateArtifact(art, generatedStyles[i])));

    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, isLoading, sessions.length]);

  const handleInitiateSequence = () => {
    setIsEngaging(true);
    handleSendMessage(placeholders[placeholderIndex]);
    setTimeout(() => setIsEngaging(false), 800);
  };

  const hasStarted = sessions.length > 0 || isLoading;
  const currentSession = sessions[currentSessionIndex];

  return (
    <>
        <a href="https://thirdsignal.io" target="_blank" rel="noreferrer" className="creator-credit">
            Third Signal Lab
        </a>

        <SideDrawer 
            isOpen={drawerState.isOpen} 
            onClose={() => setDrawerState(s => ({...s, isOpen: false}))} 
            title={drawerState.title}
        >
            {drawerState.mode === 'code' && <CodeExportView html={drawerState.data} />}
            {drawerState.mode === 'variations' && (
                <div className="sexy-grid">
                    {componentVariations.map((v, i) => (
                         <div key={i} className="sexy-card" onClick={() => applyVariation(v.html)}>
                             <div className="sexy-preview">
                                 <iframe srcDoc={v.html} title={v.name} />
                             </div>
                             <div className="sexy-label">{v.name}</div>
                         </div>
                    ))}
                </div>
            )}
        </SideDrawer>

        <div className="immersive-app">
            <KryptonHudBackground />

            <div className={`stage-container ${focusedArtifactIndex !== null ? 'mode-focus' : 'mode-split'}`}>
                 <div className={`empty-state ${hasStarted ? 'fade-out' : ''}`}>
                     <div className="empty-content">
                         <h1>Signal Canvas</h1>
                         <p>A technical showcase in rapid generative design.<br/>Powered by Gemini 3 Flash.</p>
                         <button 
                            className={`surprise-button ${isEngaging ? 'is-engaged' : ''}`} 
                            onClick={handleInitiateSequence} 
                            disabled={isLoading}
                         >
                             <SparklesIcon /> Initiate Sequence
                         </button>
                     </div>
                 </div>

                {sessions.map((session, sIndex) => (
                    <div key={session.id} className={`session-group ${sIndex === currentSessionIndex ? 'active-session' : 'hidden'}`}>
                        <div className="artifact-grid">
                            {session.artifacts.map((artifact, aIndex) => (
                                <ArtifactCard 
                                    key={artifact.id}
                                    artifact={artifact}
                                    isFocused={focusedArtifactIndex === aIndex}
                                    onClick={() => setFocusedArtifactIndex(aIndex)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {hasStarted && focusedArtifactIndex !== null && (
                <div className="action-bar visible">
                    <div className="active-prompt-label">{currentSession?.prompt}</div>
                    <div className="action-buttons">
                        <button onClick={() => setFocusedArtifactIndex(null)}><GridIcon /> Close Hub</button>
                        <button onClick={handleGenerateVariations} disabled={isLoading}><SparklesIcon /> Mutate</button>
                        <button onClick={handleShowCode}><CodeIcon /> Source</button>
                    </div>
                </div>
            )}

            <div className="floating-input-container">
                <div className={`input-wrapper ${isLoading ? 'loading' : ''}`}>
                    {!isLoading && !inputValue && (
                        <div className="animated-placeholder">
                            <span className="placeholder-text">{placeholders[placeholderIndex]}</span>
                        </div>
                    )}
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={inputValue} 
                        onChange={handleInputChange} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                    />
                    <button className="send-button" onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()}>
                        <ArrowUpIcon />
                    </button>
                </div>
            </div>
        </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
