# MANDATORY RULE: Documentation Update & Pre-Commit Preview

For **EVERY SINGLE CODE CHANGE / COMMIT**:

1. **Synchronize Documentation**:
   - Update [`README.md`](file:///d:/Learnings/AI/wineapp/README.md) and [`PROJECT_SPEC.md`](file:///d:/Learnings/AI/wineapp/PROJECT_SPEC.md) whenever features, files, hosting configs, SEO/SSL settings, functions, or workflows change.

2. **Pre-Commit User Preview**:
   - Show the updated documentation content or diff to the user in your response BEFORE running `git commit` and `git push`.

3. **Combined Commit & Jira Workflow**:
   - Create the Jira sub-task under the appropriate Story as mandated by [jira-workflow.md](file:///d:/Learnings/AI/wineapp/.agents/rules/jira-workflow.md).
   - Commit the code along with the updated documentation and rule files referencing the Jira task key.
   - Push to `main` and transition the Jira sub-task to **Done**.
