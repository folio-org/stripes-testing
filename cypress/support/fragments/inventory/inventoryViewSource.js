import { HTML, including } from '@interactors/html';

const title = 'MARC bibliographic record';

export default {
  contains:(expectedText) => {
    cy.expect(HTML(including(expectedText)).exists());
  },
  notContains:(notExpectedText) => {
    cy.expect(HTML(including(notExpectedText)).absent());
  },
  waitLoading: () => {
    cy.expect(HTML(including(title)).exists());
  }
};
