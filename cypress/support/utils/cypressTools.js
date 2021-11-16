export function getLongDelay() {
  return { timeout: 20000 };
}

// related with issue with element keeping in DOM
export function waitDifficultElement(jquery) {
  if (Cypress.$(jquery).length === 0) {
    cy.reload(getLongDelay());
  }
  // let elementsCount = 0;
  // let counter = 10;
  // while (elementsCount !== 1) {
  //   cy.reload(getLongDelay());
  //   elementsCount = Cypress.$(jquery).length;
  //   cy.log(`Elements in DOM count(after page refresh ) = ${elementsCount}`);
  //   counter--;
  //   // TODO: finish test with failed assertion
  //   if (counter === 0) {
  //     cy.log(`The issue with element presence(jquery=${jquery})`);
  //     break;
  //   }
  // }
}
