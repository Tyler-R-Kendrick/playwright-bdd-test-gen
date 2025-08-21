export const config = {
  port: Number(process.env.PORT || 4000),
  aiProvider: process.env.AI_PROVIDER || 'mock',
  baseUrl: process.env.DEFAULT_BASE_URL || 'http://localhost:3000',
  outputDir: process.env.GEN_OUTPUT_DIR || 'generated',
  playwrightHeadless: process.env.PLAYWRIGHT_HEADLESS !== 'false'
};
