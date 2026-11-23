// Root Vitest config: runs every workspace package as its own project.
// `test.projects` needs Vitest 3.2 or newer. On an older Vitest, move this list into vitest.workspace.ts instead.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
