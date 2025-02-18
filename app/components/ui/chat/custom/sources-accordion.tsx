import { SourceData } from "@llamaindex/chat-ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileIcon, BookOpen } from "lucide-react";

interface SourceNode {
  metadata: {
    filename?: string;
    page_label?: string;
    file_name?: string;
    page_number?: number;
  };
  text: string;
  score: number | null;
  url?: string;
}

interface SourceAnnotation {
  type: "sources";
  data: {
    nodes: SourceNode[];
  };
}

function formatSourceText(text: string): string {
  // Remove any "On page" prefixes
  text = text.replace(/^On page \d+:\s*/g, '');
  
  // Clean up extra whitespace and newlines
  text = text.replace(/\s+/g, ' ').trim();
  
  // Limit length and add ellipsis if too long
  if (text.length > 300) {
    text = text.substring(0, 300) + '...';
  }
  
  return text;
}

function getSourceName(source: SourceNode): string {
  // Try different metadata fields for the source name
  const name = source.metadata.filename || source.metadata.file_name;
  if (!name) return 'Unknown Source';
  
  // Clean up the filename
  return name
    .replace(/\.[^/.]+$/, '') // Remove file extension
    .replace(/-/g, ' ') // Replace dashes with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
}

function getPageInfo(source: SourceNode): string | null {
  // Try different metadata fields for page information
  const page = source.metadata.page_label || source.metadata.page_number;
  return page ? `Page ${page}` : null;
}

export function SourcesAccordion({ sources }: { sources?: SourceAnnotation }) {
  if (!sources?.data?.nodes || sources.data.nodes.length === 0) return null;

  return (
    <div className="mt-4 border-2 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
      <div className="px-3 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900 border-b flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-blue-500" />
        <h3 className="text-sm font-medium text-blue-700 dark:text-gray-100">
          Referenced Documents ({sources.data.nodes.length})
        </h3>
      </div>
      <Accordion type="single" collapsible>
        {sources.data.nodes.map((node: any, index: number) => {
          const sourceName = getSourceName(node);
          const pageInfo = getPageInfo(node);
          const formattedText = formatSourceText(node.text);

          return (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-none"
            >
              <AccordionTrigger 
                className="flex items-center gap-2 px-3 sm:px-4 py-2 hover:no-underline transition-colors text-left"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-100 truncate">{sourceName}</span>
                  {pageInfo && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                      {pageInfo}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-3 sm:px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-t break-words">
                  {formattedText}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
