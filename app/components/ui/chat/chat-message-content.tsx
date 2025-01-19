import {
  ChatMessage,
  ContentPosition,
  getSourceAnnotationData,
  useChatMessage,
  useChatUI,
} from "@llamaindex/chat-ui";
import { Markdown } from "./custom/markdown";
import { ToolAnnotations } from "./tools/chat-tools";

export function ChatMessageContent({ className }: { className?: string }) {
  const { isLoading, append } = useChatUI();
  const { message } = useChatMessage();
  const customContent = [
    {
      position: ContentPosition.MARKDOWN,
      component: (
        <div className={className}>
          <Markdown
            content={message.content}
            sources={getSourceAnnotationData(message.annotations)?.[0]}
          />
        </div>
      ),
    },
    {
      position: ContentPosition.AFTER_EVENTS,
      component: <ToolAnnotations message={message} />,
    },
  ];
  return (
    <ChatMessage.Content
      content={customContent}
      isLoading={isLoading}
      append={append}
    />
  );
}
