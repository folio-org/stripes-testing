import { HTML, including } from '@interactors/html';
import { Button } from '../../../../interactors';

const instanceTitle = 'MARC bibliographic record';
const holdingTitle = 'Holdings record';
const closeButton = Button({ icon: 'times' });

export default {
  contains:(expectedText) => {
    cy.expect(HTML(including(expectedText)).exists());
  },
  notContains:(notExpectedText) => {
    cy.expect(HTML(including(notExpectedText)).absent());
  },
  waitInstanceLoading: () => {
    cy.expect(HTML(including(instanceTitle)).exists());
  },
  waitHoldingLoading: () => {
    cy.expect(HTML(including(holdingTitle)).exists());
  },
  close: () => cy.do(closeButton.click())
};
