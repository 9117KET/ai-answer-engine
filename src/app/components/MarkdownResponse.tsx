import ReactMarkdown from 'react-markdown';

export function MarkdownResponse({ content }: { content: string }) {
  return <ReactMarkdown>{content}</ReactMarkdown>;
} 