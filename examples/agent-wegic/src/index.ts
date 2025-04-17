import { articleWorkflow } from './workflow';

(async () => {
  const { start } = articleWorkflow.createRun();

  await start({
    triggerData: {
      title: 'How TikTok Emojis Are Shaping Social Media Trends in 2025',
      keyword: 'tiktok emojis',
    },
  });
})();
