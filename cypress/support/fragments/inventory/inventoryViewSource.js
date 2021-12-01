import { Page, not } from '@interactors/html';


export default {
  contains:(expectedText) => {
    cy.expect(Page.has({ innerText: expectedText }));
  },
  notContains:(notExpectedText) => {
    cy.expect(Page.has({ innerText: not(notExpectedText) }));
  }
};
