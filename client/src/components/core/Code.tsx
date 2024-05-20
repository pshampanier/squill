import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/hljs/sql";

SyntaxHighlighter.registerLanguage("sql", sql);

type CodeProps = {
  language: string;
  children?: string | string[];
  className?: string;
  showLineNumbers?: boolean;
};

/**
 * A code section with syntax highlighting.
 *
 * Unlike the <code> HTML element, the Code component can render multiple lines of code with syntax highlighting.
 * The syntax highlighting is performed by highlight.js and with a custom theme `styles/hljs-light.less` and
 * `styles/hljs-light.less` trying to mimic the themes of the monaco editor. Since highlight.js and the monaco editor
 * are using different tokenization algorithms, the syntax highlighting might not be 100% identical.
 */
export default function Code({ children, className, language, showLineNumbers = false }: CodeProps) {
  return (
    <SyntaxHighlighter
      className={className}
      language={language}
      showLineNumbers={showLineNumbers}
      useInlineStyles={false}
    >
      {children}
    </SyntaxHighlighter>
  );
}
