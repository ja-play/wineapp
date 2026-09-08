# MANDATORY RULE: Jira Integration & Git Commit Workflow

For **EVERY SINGLE CODE CHANGE / PUSH TO MAIN**:

1. **Jira Issue Discovery**:
   - Query Jira (`WINE` project) to find the most appropriate parent Story for the work being done.
   - Core Stories:
     - `WINE-7`: Platform Infrastructure & Site Maintenance / SEO / SSL / Build Settings
     - `WINE-6`: Depot Real-Time Dispatch & Fulfillment System
     - `WINE-5`: Headless A4 PDF Delivery Note Engine
     - `WINE-4`: Evaluator Field Ordering & Tax Calculation Engine
     - `WINE-3`: Dynamic Wine Catalog & Admin Management

2. **Sub-Task Creation**:
   - Call the Jira MCP tool `createIssue` to create a new Sub-task under the matching parent Story.
   - Provide a clear summary and detailed description of the exact changes made.

3. **Git Commit & Push**:
   - Reference the newly created Jira issue key (e.g. `WINE-31`) in the git commit message header:
     `git commit -m "<type>(<scope>): <JIRA_KEY> <description>"`
   - Push the commit to `main` (`git push origin main`).

4. **Close Jira Task**:
   - Fetch transitions for the issue and call `transitionIssue` to move the status to **Done** (Transition ID `31`).
   - Add a completion comment referencing the git commit and deployment details.
