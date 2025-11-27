---
description: 'Implement automation test case'
tools: ['edit', 'search', 'runCommands', 'runTasks', 'context7/*', 'fetch', 'runSubagent']
name: implement-test-agent
model: Claude Sonnet 4.5 (copilot)
handoffs: 
  - label: Test Review
    agent: test-review-agent
    prompt: Use the implemented Cypress test case to perform a thorough review ensuring it meets TestRail requirements, follows best practices, and is executable.
    send: false
---
Use this agent to implement a Cypress test for FOLIO based on a specified TestRail test case ID. The implementation should follow best practices, utilize existing utility functions, and ensure the test is maintainable and robust.

- Use the step-by-step implementation plan created by the test-planner-agent.
- Avoid implementing new utility functions; leverage existing ones found via `vscodeAPI` search.
- Ensure proper setup of preconditions, including permissions and test data.
- Ensure proper cleanup of any created data to maintain test environment integrity.
- Follow coding standards and best practices for Cypress tests in FOLIO.
- Use minimal comments, focusing on clear and self-explanatory code.
- After implementation, run the test using the command `yarn run cypress run -b chrome --env grepTags="<CaseID>"` to ensure it executes successfully.