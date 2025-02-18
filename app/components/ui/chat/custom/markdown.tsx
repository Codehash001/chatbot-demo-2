import { Markdown as MarkdownUI } from "@llamaindex/chat-ui/widgets";
import { useClientConfig } from "../hooks/use-config";

const preprocessContent = (content: string) => {
  // Remove `sandbox:` from the beginning of the URL before rendering markdown
  let processedContent = content.replace(/(sandbox|attachment|snt):/g, "");
  return processedContent;
};

export function Markdown({
  content,
}: {
  content: string;
}) {
  const { backend } = useClientConfig();
  const processedContent = preprocessContent(content);
  
  return (
    <div className="prose max-w-none">
      <MarkdownUI
        content={processedContent}
        backend={backend}
      />
    </div>
  );
}
