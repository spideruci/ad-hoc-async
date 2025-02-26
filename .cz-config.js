export const types = [
  { value: "fix", name: "fix: Bug fix" },
  { value: "feat", name: "feat: New feature" },
  {
    value: "style",
    name: "style: Code style update (formatting, missing semicolons, etc.)",
  },
  { value: "design", name: "design: UI/UX improvements" },
  { value: "handle", name: "handle: Handle specific functionality" },
];
export const allowCustomScopes = true;
export const allowBreakingChanges = false;
export const skipQuestions = ["breaking", "scope"];
export const subjectLimit = 100;
export const allowTicketNumber = false;
export const footerPrefix = "Tests:";
export const messages = {
  type: "Select the type of change that you're committing:",
  scope: "Specify the scope of this change (optional):",
  subject: "Write a short, imperative mood description of the change:\n",
  body: "Provide a longer description of the change (optional). Use '\\n' for new lines:\n",
  footer:
    "List any test details or references (optional). Use '\\n' for new lines:\n",
  confirmCommit: "Are you sure you want to proceed with the commit?",
};
