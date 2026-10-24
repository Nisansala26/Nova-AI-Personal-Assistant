import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Code2, ExternalLink } from 'lucide-react';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import 'highlight.js/styles/github-dark.css';

const highlightOptions = {
  languages: { bash, css, javascript, json, python, sql, typescript, xml },
  aliases: {
    bash: ['sh', 'shell'],
    javascript: ['js'],
    python: ['py'],
    typescript: ['ts'],
    xml: ['html'],
  },
};

function getCode(children) {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string') return child;
      return React.Children.toArray(child.props?.children).join('');
    })
    .join('');
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const code = getCode(children);

  // Extract language from child if available
  let language = 'code';
  if (React.isValidElement(children) && children.props?.className) {
    const match = children.props.className.match(/language-(\w+)/);
    if (match) language = match[1];
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <div className="code-lang-tag">
          <Code2 size={13} />
          <span>{language}</span>
        </div>
        <button
          className={`code-copy-btn ${copied ? 'copied' : ''}`}
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied code' : 'Copy code to clipboard'}
        >
          {copied ? (
            <>
              <Check size={12} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-pre">{children}</pre>
    </div>
  );
}

export default function MessageContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, highlightOptions]]}
      components={{
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noreferrer" className="msg-link">
              <span>{children}</span>
              <ExternalLink size={12} />
            </a>
          );
        },
        pre({ children }) {
          return <CodeBlock>{children}</CodeBlock>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
