import {
  ChatMessage,
  ContentPosition,
  useChatMessage,
  useChatUI,
} from "@llamaindex/chat-ui";
import { ToolAnnotations } from "./tools/chat-tools";
import { SourcesAccordion } from "./custom/sources-accordion";
import { Markdown } from "./custom/markdown";

export function ChatMessageContent({ className }: { className?: string }) {
  const { isLoading, append } = useChatUI();
  const { message } = useChatMessage();
  
  // Find the sources annotation
  const sourceAnnotation = message.annotations?.find(
    (annotation: { type: string; }) => annotation.type === "sources"
  );

  // Create a modified message without source annotations for other components
  const modifiedMessage = {
    ...message,
    annotations: message.annotations?.filter(
      (annotation: { type: string; }) => annotation.type !== "sources"
    ) || []
  };

  const customContent = [
    {
      position: ContentPosition.MARKDOWN,
      component: (
        <div className={className}>
          <Markdown content={message.content} />
          {sourceAnnotation && <SourcesAccordion sources={sourceAnnotation} />}
        </div>
      ),
    },
    {
      position: ContentPosition.AFTER_EVENTS,
      component: <ToolAnnotations message={modifiedMessage} />,
    },
  ];

  return (
    <ChatMessage.Content
      content={customContent}
      isLoading={isLoading}
      append={append}
      message={modifiedMessage}
    />
  );
}
