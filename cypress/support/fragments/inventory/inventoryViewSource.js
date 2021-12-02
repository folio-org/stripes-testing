import { HTML, including } from '@interactors/html';


export default {
  contains:(expectedText) => {
    // cy.expect(Page.has({ innerText: expectedText }));
    cy.expect(HTML(including(expectedText)).exists());
  },
  notContains:(notExpectedText) => {
    // cy.expect(Page.has({ innerText: not(notExpectedText) }));
  }
};
