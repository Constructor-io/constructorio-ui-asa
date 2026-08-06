import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Runs axe-core against every story in a real browser.
 *
 * Storybook 8's test-runner does not interpret `parameters.a11y.test` on its own
 * (that landed in the Storybook 9 runner), so the ratchet is implemented here:
 *
 *   test: 'todo'  (default, set in preview.ts) - violations are reported, run passes
 *   test: 'error'                              - violations fail the run
 *   test: 'off' / disable: true                - story is skipped entirely
 *
 * As each component is made accessible, flip its stories to `test: 'error'` so it
 * can never regress.
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
