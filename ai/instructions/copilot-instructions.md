# FOLIO Stripes Testing - AI Coding Agent Instructions

## Project Architecture

**FOLIO Stripes Testing Framework** - Cypress-based E2E testing toolkit for FOLIO library management system UI modules. Built around the "page object" pattern with reusable test fragments and interactors.

### Core Structure
- **`cypress/e2e/`** - Test specifications organized by FOLIO modules (inventory, orders, organizations, etc.)
- **`cypress/support/fragments/`** - Reusable page objects and UI interaction helpers
- **`interactors/`** - Component-level DOM interaction abstractions from `@interactors/html`
- **`support/dictionary/permissions.js`** - Centralized permission definitions for test users

### Test Organization Pattern
Test cases follow hierarchical describe blocks matching the provided test case hierarchy:
```javascript
describe('Module', () => {
  describe('Feature Area', () => {
    describe('Specific Function', () => {
      // Test cases with C##### identifiers
    });
  });
});
```

**Hierarchy Mapping**: When test cases include hierarchy patterns (e.g., "Inventory › Settings › Call number browse"), create matching nested describe blocks:
- "Inventory › Settings › Call number browse" becomes:
```javascript
describe('Inventory', () => {
  describe('Settings', () => {
    describe('Call number browse', () => {
      // Test implementation
    });
  });
});
```
If no hierarchy is specified in the provided test case, use an example of any similar test.

## Key Development Patterns

### Test Data & Setup
- Use `cy.getAdminToken()` + API calls for test data creation in `before()` hooks
- Clean up via `after()` hooks with API deletions
- Create temporary users with specific permissions: `cy.createTempUser([Permissions.xyz.gui])`
- Generate unique test data with `getRandomPostfix()` utility

### Fragment Architecture
Test fragments follow consistent patterns:
```javascript
// Navigation and waiting
ModuleName.waitLoading()
ModuleName.openSomeForm()

// Interactions  
ModuleName.fillField(value)
ModuleName.clickButton()

// Validations
ModuleName.verifyElementExists()
ModuleName.checkExpectedValue()
```

### Interactors Usage
Prefer interactors over raw Cypress selectors:
```javascript
// Good
cy.do(Button('Save').click())
cy.expect(TextField('Name').has({value: 'test'}))

// Avoid raw selectors when interactor exists
cy.get('[data-testid="save-button"]').click()
```
### TRY TO AVOID RAW SELECTORS UNLESS ABSOLUTELY NECESSARY, TRY TO SEARCH FOR ALREADY IMPLEMENTED FUNCTIONS IN OTHER FRAGMENTS!!!

### Permission Management
- Import from `support/dictionary/permissions.js`
- Use `.gui` suffix for UI permissions: `Permissions.inventoryAll.gui`
- Consortia tests may require multiple tenant permission assignments

## Critical Workflows

### Test File Creation
1. **REQUIRED**: Create a new separate spec file (`.cy.js`) for each test unless specifically told otherwise
2. Organize by FOLIO module hierarchy
3. Include test ID (C######) in test name and tags
4. **REQUIRED**: Each test (`it` block) must have tags attribute with 3 components:
   ```javascript
   { tags: ['extendedPath', 'spitfire', 'C627455'] }
   ```
   - **Test group tag**: `criticalPath`, `smoke`, `extendedPath` (add "ECS" for consortia: `criticalPathECS`)
   - **Dev team tag**: lowercase team name (`spitfire`, `thunderjet`, `eureka`, etc.)
   - **Test ID tag**: exact test case identifier (`C######`)
5. Use unique test data prefixes: `AT_C######_Description_${randomPostfix}`

### Environment Handling
- **ECS (Consortia)**: Multi-tenant tests with affiliation switching
- **Eureka**: Authorization roles instead of permission sets, capability sets and capabilities instead of permissions
- Environment detection via `Cypress.env('eureka')` or consortium checks

### API + UI Pattern
Tests typically combine API setup with UI validation:
```javascript
before('Create test data', () => {
  cy.getAdminToken().then(() => {
    // Create via API
    Organizations.createOrganizationViaApi(testData.organization);
  });
  
  cy.createTempUser([permissions]).then((user) => {
    cy.login(user.username, user.password, {
      path: TopMenu.modulePath,
      waiter: ModulePage.waitContentLoading,
    });
  });
});
```

## Search & Discovery Guidelines

Before generating tests:
1. **Search existing patterns**: Use `semantic_search` for similar test scenarios
2. **Find support fragments**: Use `grep_search` for relevant page objects  
3. **Check permission definitions**: Verify required permissions exist in dictionary
4. **Review constants**: Look for existing data structures in `support/constants.js`

Example searches:
- `semantic_search("inventory search LCCN test patterns")`  
- `grep_search("CallNumberBrowse" includePattern:"support/fragments/**")`

## Common Gotchas

- **Timing**: Use `cy.wait()` sparingly; prefer `waitLoading()` methods from fragments
- **Data cleanup**: Always clean up test data in `after()` hooks to prevent test pollution
- **Permissions**: Consortia tests need permissions assigned per tenant
- **Unique data**: Use `getRandomPostfix()` to avoid data conflicts between test runs
- **Interactor timeouts**: Default 50s timeout set globally, adjust if needed

## File Naming & Organization

- Test files: `descriptive-test-name.cy.js`
- Fragments: `moduleName/subModule.js` (camelCase)
- Place tests in appropriate module subdirectories matching FOLIO app structure
- Use consistent prefixes for test data: `AT_C######_ModuleName_${randomPostfix}`
