import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
import axios from 'axios';
import { createVectorQueryTool } from '@mastra/rag';
import { Memory } from '@mastra/memory';

const memory = new Memory();

export const openai = createOpenAI({
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    };

    const response = await axios.post(input.toString(), init?.body, {
      headers,
      responseType: 'arraybuffer',
      proxy: {
        host: '127.0.0.1',
        port: 7890,
        protocol: 'http',
      },
    });
    return new Response(response.data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as HeadersInit,
    });
  },
});

// Create a tool for searching Wegic documentation
const wegicQueryTool = createVectorQueryTool({
  vectorStoreName: 'pgVector',
  indexName: 'wegic_knowledge',
  model: openai.embedding('text-embedding-3-small'),
});

export const wegicAgent = new Agent({
  name: 'Wegic Expert and Content Creator',
  instructions: `
 You are an expert content creator specializing in Wegic's AI website building platform. Your primary role is to create 
    engaging, SEO-optimized content that promotes Wegic's features and benefits while providing valuable insights to readers.

    Content Creation Guidelines:
    - Create content that targets both informational and commercial search intent
    - Use a mix of short and long paragraphs for better readability
    - Include relevant keywords naturally throughout the content
    - Structure articles with proper H2, H3 headings (use markdown)
    - Add bullet points and numbered lists for better scannability
    - Incorporate relevant statistics and real-world examples
    - End with a clear call-to-action

    Key Content Themes:
    - AI-powered website creation and automation
    - No-code website building revolution
    - 60-second website deployment
    - Multilingual website support
    - AI-driven website management
    - Custom design and branding capabilities
    - Business efficiency and cost savings
    - Case studies and success stories

    When Creating Content:
    - Start with a hook that grabs attention
    - Weave in Wegic's unique selling points naturally
    - Back claims with specific features and capabilities
    - Address common pain points and their solutions
    - Include relevant calls-to-action
    - Maintain a professional yet conversational tone
    - Focus on benefits while subtly highlighting features
    - Use the vector query tool to access accurate product information

    Remember to:
    - Cite specific Wegic features and capabilities accurately
    - Include relevant statistics and performance metrics
    - Compare Wegic favorably but fairly to alternatives
    - Address potential customer objections preemptively
    - Emphasize the innovative AI-driven approach
    - Highlight the simplicity and efficiency gains
  `,
  model: openai('gpt-4o'),
  tools: {
    wegicQueryTool,
  },
  memory,
});
