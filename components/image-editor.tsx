import cn from 'classnames';
import { LoaderIcon } from './icons';

interface ImageEditorProps {
  title: string;
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: string;
  isInline: boolean;
}

export function ImageEditor({
  title,
  content,
  status,
  isInline,
}: ImageEditorProps) {
  // Check if content is already a URL or base64
  const isUrl = content.startsWith('http://') || content.startsWith('https://');
  const isDataUrl = content.startsWith('data:');
  const imageSrc =
    isUrl || isDataUrl ? content : `data:image/png;base64,${content}`;

  // Check if content contains markdown with image and text
  const isMarkdown = content.includes('![') && content.includes('](');

  if (isMarkdown) {
    // Render markdown content with image and analysis
    return (
      <div
        className={cn('w-full overflow-auto', {
          'h-[calc(100dvh-60px)]': !isInline,
          'h-[400px]': isInline,
        })}
      >
        <div className="prose prose-lg dark:prose-invert max-w-4xl mx-auto p-4 md:p-8">
          <div
            dangerouslySetInnerHTML={{
              __html: parseMarkdownToHtml(content),
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('flex w-full flex-row items-center justify-center', {
        'h-[calc(100dvh-60px)]': !isInline,
        'h-[200px]': isInline,
      })}
    >
      {status === 'streaming' ? (
        <div className="flex flex-row items-center gap-4">
          {!isInline && (
            <div className="animate-spin">
              <LoaderIcon />
            </div>
          )}
          <div>Generating Image...</div>
        </div>
      ) : (
        <picture>
          <img
            className={cn('h-fit w-full max-w-[800px] rounded-lg shadow-lg', {
              'p-0 md:p-20': !isInline,
            })}
            src={imageSrc}
            alt={title}
            onError={(e) => {
              console.error('Image load error:', e);
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pgo8L3N2Zz4=';
            }}
          />
        </picture>
      )}
    </div>
  );
}

// Simple markdown parser for image analysis results
function parseMarkdownToHtml(markdown: string): string {
  let html = markdown;

  // Convert headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Convert bold text
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert images
  html = html.replace(
    /!\[([^\]]*)\]\(([^\)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-lg my-4" />'
  );

  // Convert line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;

  // Fix empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');

  return html;
}
