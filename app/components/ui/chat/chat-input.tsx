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

  /**
   * Handles file uploads. Overwrite to hook into the file upload behavior.
   * @param file The file to upload
   */
  const handleUploadFile = async (file: File) => {
    // There's already an image uploaded, only allow one image at a time
    if (imageUrl) {
      alert("You can only upload one image at a time.");
      return;
    }

    try {
      // Upload the file and send with it the current request data
      await uploadFile(file, requestData);
    } catch (error: any) {
      // Show error message if upload fails
      alert(error.message);
    }
  };

  // Get references to the upload files in message annotations format, see https://github.com/run-llama/chat-ui/blob/main/packages/chat-ui/src/hook/use-file.tsx#L56
  const annotations = getAnnotations();

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      <ChatInput
        className="w-full"
        resetUploadedFiles={reset}
        annotations={annotations}
      >
        <div className="flex items-center gap-3">
          {imageUrl && (
            <ImagePreview url={imageUrl} onRemove={() => setImageUrl(null)} />
          )}
          {files.map((file) => (
            <DocumentInfo
              key={file.id}
              document={{ url: file.url, sources: [] }}
              onRemove={() => removeDoc(file)}
              className="mb-2"
            />
          ))}
        </div>
        <ChatInput.Form className={styles.chatForm}>
          <ChatInput.Field className={styles.chatField} />
          <ChatInput.Upload className={styles.chatUpload} onUpload={handleUploadFile} />
          <ChatInput.Submit
            className={styles.chatSubmit}
            disabled={isLoading || (!input.trim() && files.length === 0 && !imageUrl)}
          />
        </ChatInput.Form>
      </ChatInput>
    </div>
  );
}
