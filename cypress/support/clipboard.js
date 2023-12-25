// Methods to handle scenarios mentioned in Issue:
// https://github.com/cypress-io/cypress/issues/2739

Cypress.Commands.add('stubBrowserPrompt', () => {
  cy.window().then((window) => {
    cy.stub(window, 'prompt').returns(window.prompt).as('copyToClipboardPrompt');
  });
});

Cypress.Commands.add('checkBrowserPrompt', ({ callNumber, promptValue }) => {
  cy.get('@copyToClipboardPrompt').then((prompt) => {
    const clipboardText = prompt.args[callNumber][1];
    cy.expect(clipboardText).to.equal(promptValue);
  });
});

Cypress.Commands.add('getClipboardText', () => {
  cy.window().then((window) => window.navigator.clipboard.readText());
});
