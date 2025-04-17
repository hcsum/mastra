import { Step, Workflow } from '@mastra/core/workflows';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fixFormat } from './utils';
import { mastra } from './mastra';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'articles');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

type Outline = {
  title: string;
  description: string;
  subheadings: string[];
  wordCount: number;
};

type Progress = {
  wipArticle: string;
  currentSectionIndex: number;
  outline: Outline[];
};

const wegicAgent = mastra.getAgent('wegicAgent');

const stepOne = new Step({
  id: 'stepOne',
  execute: async ({ context }) => {
    console.log('stepOne', context.triggerData);

    let prompt = `Write an outline for a 2000 word promotional article for Wegic about ${context.triggerData.title}, main keyword: ${context.triggerData.keyword}. Try your best to include Wegic info in the content.
    
    Return the outline in JSON format, without any other text or explanation, without \`\`\`json\`\`\` tags.
    The outline should be a list of sections with the following properties:
    - title: string (title of the section)
    - description: string (description of the section, include Wegic info if possible)
    - subheadings: string[] (subheadings of the section)
    - wordCount: number (word count of the section)
    `;

    const res = await wegicAgent.generate(prompt);

    console.log('\n----outline----', res.text, '\n-----------------');

    return {
      outline: JSON.parse(res.text),
      currentSectionIndex: 0,
      wipArticle: '',
    };
  },
});

const stepTwo = new Step({
  id: 'stepTwo',
  inputSchema: z.object({
    wipArticle: z.string(),
    currentSectionIndex: z.number(),
    outline: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        subheadings: z.array(z.string()),
        wordCount: z.number(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    if (context.steps.stepOne.status !== 'success') {
      throw new Error('Step one failed');
    }

    const { currentSectionIndex, outline, wipArticle } =
      context.getStepResult<Progress>('stepTwo') || context.getStepResult<Progress>('stepOne');

    const { title, keyword } = context.triggerData;

    // Check if we have at least one more section to write
    if (currentSectionIndex >= outline.length) {
      return {
        outline,
        currentSectionIndex,
        wipArticle,
      };
    }

    // Get current and next section
    const currentSection = outline[currentSectionIndex];
    const nextSection = currentSectionIndex + 1 < outline.length ? outline[currentSectionIndex + 1] : null;

    console.log(
      'stepTwo outline',
      currentSectionIndex,
      currentSection.title,
      nextSection ? `and ${nextSection.title}` : '',
    );

    const prompt = `
      title: ${title}
      keyword: ${keyword}
      description: ${currentSection.description}
      outline: ${JSON.stringify(outline)}

      Write section ${currentSectionIndex + 1} in the outline about ${currentSection.title} for around ${currentSection.wordCount} words.
      ${nextSection ? `Also write section ${currentSectionIndex + 2} about ${nextSection.title} for around ${nextSection.wordCount} words.` : ''}
      Read the outline to produce coherent content that can fit into the whole article.
      
      For writting:
      • Use keyword 1-3 times per 500 words
      • Use H2/H3/H4 for subheadings
      • If need to list items in content, use bullet points, not numbered lists
      • Bold key elements like Conclusions, Data, Core answers in the content
    `;

    const res = await wegicAgent.generate(prompt);

    return {
      outline,
      currentSectionIndex: currentSectionIndex + (nextSection ? 2 : 1),
      wipArticle: `${wipArticle}\n${res.text}`,
    };
  },
});

const stepThree = new Step({
  id: 'stepThree',
  execute: async ({ context }) => {
    if (context.steps.stepTwo.status !== 'success') {
      throw new Error('Step two failed');
    }

    const { wipArticle } = context.steps.stepTwo.output;
    const formattedArticle = fixFormat(wipArticle);

    const fileName = `${context.triggerData.title}-${new Date().toLocaleString().replace(/\//g, '-')}.md`;
    fs.writeFileSync(path.join(outputDir, fileName), formattedArticle);

    console.log('stepThree', 'done');
  },
});

// Build the workflow
export const sequentialWorkflowExample = new Workflow({
  name: 'sequential-workflow-example',
  triggerSchema: z.object({
    title: z.string(),
    keyword: z.string(),
    details: z.string().optional(),
  }),
});

// sequential steps
export const articleWorkflow = sequentialWorkflowExample
  .step(stepOne)
  .then(stepTwo)
  .while(async ({ context }) => {
    const result = context.getStepResult<{
      currentSectionIndex: number;
      outline: Outline[];
    }>('stepTwo');
    return result?.currentSectionIndex < result?.outline.length;
  }, stepTwo)
  .then(stepThree)
  .commit();
