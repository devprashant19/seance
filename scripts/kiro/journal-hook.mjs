// Hook H9 helper (PromptSubmit, command action).
// Kiro exposes the submitted prompt in the USER_PROMPT env var; on exit 0, stdout is added to the agent's context.
// For prompts starting with "journal:" we print the logging instructions; for every other prompt we print nothing.
const prompt = (process.env.USER_PROMPT ?? '').trimStart();

if (/^journal:/i.test(prompt)) {
  const today = new Date().toISOString().slice(0, 10);
  const note = prompt.replace(/^journal:\s*/i, '');
  process.stdout.write(
    [
      'JOURNAL REQUEST (hook H9).',
      `Append ONE new entry dated ${today} to docs/kiro-journal.md, following the format in .kiro/steering/writeup-journal.md exactly.`,
      'Never edit or reorder earlier entries. Only record what actually happened; write "not measured" for missing numbers.',
      `The user's note for this entry: ${note || '(none - summarise the most recent Kiro work in this session)'}`,
      'After appending, show the entry text.',
    ].join('\n'),
  );
}
process.exit(0);
