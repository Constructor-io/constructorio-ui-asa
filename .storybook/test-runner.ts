import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Runs axe-core against every story. Storybook 8's test-runner does not interpret
 * `parameters.a11y.test`, so it is applied here: 'todo' reports without failing,
 * 'error' fails the run, 'off'/disable skips the story.
 */
const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);
    const a11y = storyContext.parameters?.a11y;

    if (a11y?.disable || a11y?.test === 'off') return;

    await checkA11y(
      page,
      '#storybook-root',
      {
        detailedReport: true,
        detailedReportOptions: { html: true },
        axeOptions: a11y?.options,
      },
      // skipFailures: report-only unless this story has opted into blocking
      a11y?.test !== 'error',
    );
  },
};

export default config;
