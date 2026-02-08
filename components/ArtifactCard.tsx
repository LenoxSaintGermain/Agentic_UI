
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useMemo } from 'react';
import { Artifact } from '../types';

interface ArtifactCardProps {
    artifact: Artifact;
    isFocused: boolean;
    onClick: () => void;
}

const ArtifactCard = React.memo(({ 
    artifact, 
    isFocused, 
    onClick 
}: ArtifactCardProps) => {
    const codeRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            codeRef.current.scrollTop = codeRef.current.scrollHeight;
        }
    }, [artifact.html]);

    const isBlurring = artifact.status === 'streaming';

    // Wrap the generated HTML in a standard environment to ensure Tailwind and dark mode consistency
    const wrappedSrcDoc = useMemo(() => {
        if (!artifact.html) return '';
        
        // Check if the model already provided a full HTML document
        if (artifact.html.includes('<html') || artifact.html.includes('<body')) {
            return artifact.html;
        }

        return `
            <!DOCTYPE html>
            <html class="dark">
            <head>
                <script src="https://cdn.tailwindcss.com"></script>
                <script>
                    tailwind.config = {
                        darkMode: 'class',
                        theme: {
                            extend: {
                                colors: {
                                    krypton: {
                                        glow: '#22d3ee',
                                        deep: '#0891b2',
                                        bg: '#030407'
                                    }
                                }
                            }
                        }
                    }
                </script>
                <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    body { 
                        background-color: #030407; 
                        color: #e0faff; 
                        font-family: 'JetBrains Mono', monospace;
                        margin: 0;
                        padding: 1.5rem;
                        min-height: 100vh;
                        overflow-x: hidden;
                    }
                    /* Custom HUD scrollbar */
                    ::-webkit-scrollbar { width: 4px; }
                    ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                    ::-webkit-scrollbar-thumb { background: #164e63; border-radius: 2px; }
                </style>
            </head>
            <body>
                ${artifact.html}
            </body>
            </html>
        `;
    }, [artifact.html]);

    return (
        <div 
            className={`artifact-card ${isFocused ? 'focused' : ''} ${isBlurring ? 'generating' : ''}`}
            onClick={onClick}
        >
            <div className="artifact-header">
                <span className="artifact-style-tag">{artifact.styleName}</span>
            </div>
            <div className="artifact-card-inner">
                {isBlurring && (
                    <div className="generating-overlay">
                        <pre ref={codeRef} className="code-stream-preview">
                            {artifact.html}
                        </pre>
                    </div>
                )}
                <iframe 
                    srcDoc={wrappedSrcDoc} 
                    title={artifact.id} 
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin"
                    className="artifact-iframe"
                />
            </div>
        </div>
    );
});

export default ArtifactCard;
