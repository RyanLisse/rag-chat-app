import { smoothStream, streamText } from 'ai';
import { updateDocumentPrompt } from '@/lib/ai/prompts';
import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';

export const textDocumentHandler = createDocumentHandler<'text'>({
  kind: 'text',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system:
        'Write about the given topic. Markdown is supported. Use headings wherever appropriate.',
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: title,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text') {
        const { text } = delta;

        draftContent += text;

        dataStream.writeData({
          type: 'text-delta',
          content: text,
        });
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamText({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'text'),
      experimental_transform: smoothStream({ chunking: 'word' }),
      prompt: description,
      // TODO: Re-implement prediction if needed in AI SDK 5.0
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text') {
        const { text } = delta;

        draftContent += text;
        dataStream.writeData({
          type: 'text-delta',
          content: text,
        });
      }
    }

    return draftContent;
  },
});
