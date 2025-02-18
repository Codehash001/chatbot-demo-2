"use client";

import { ChatInput, useChatUI, useFile } from "@llamaindex/chat-ui";
import { DocumentInfo, ImagePreview } from "@llamaindex/chat-ui/widgets";
import { LlamaCloudSelector } from "./custom/llama-cloud-selector";
import { useClientConfig } from "./hooks/use-config";
import styles from "./chat.module.css";

export default function CustomChatInput() {
  const { requestData, isLoading, input } = useChatUI();
  const { backend } = useClientConfig();
  const {
    imageUrl,
    setImageUrl,
    uploadFile,
    files,
    removeDoc,
    reset,
    getAnnotations,
  } = useFile({ uploadAPI: `${backend}/api/chat/upload` });

  const handleUploadFile = async (file: File) => {
    if (imageUrl) {
      alert("You can only upload one image at a time.");
      return;
    }

    try {
      await uploadFile(file, requestData);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const annotations = getAnnotations();

  return (
    <div className={styles.container}>
      <ChatInput
        className={styles.chatInput}
        resetUploadedFiles={reset}
        annotations={annotations}
      >
        <div className={styles.flexContainer}>
          {imageUrl && (
            <ImagePreview url={imageUrl} onRemove={() => setImageUrl(null)} />
          )}
          {files.map((file) => (
            <DocumentInfo
              key={file.id}
              document={{ url: file.url, sources: [] }}
              onRemove={() => removeDoc(file)}
              className={styles.documentInfo}
            />
          ))}
        </div>
        <ChatInput.Form className={styles.chatForm}>
          <ChatInput.Field className={styles.chatField} />
          <div className={styles.buttonGroup}>
            <ChatInput.Upload
              className={styles.chatUpload}
              onUpload={handleUploadFile}
            />
            <ChatInput.Submit
              className={`${styles.chatSubmit} ${
                isLoading || (!input.trim() && files.length === 0 && !imageUrl)
                  ? "opacity-50"
                  : ""
              }`}
              disabled={isLoading || (!input.trim() && files.length === 0 && !imageUrl)}
            />
          </div>
        </ChatInput.Form>
      </ChatInput>
    </div>
  );
}
