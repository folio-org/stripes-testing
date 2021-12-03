import { HTML, including } from '@interactors/html';
import {Button} from '../../../../interactors'

const title = 'MARC bibliographic record';
const closeButton = Button({icon: 'times'});

export default {
  contains:(expectedText) => {
    cy.expect(HTML(including(expectedText)).exists());
  },
  notContains:(notExpectedText) => {
    cy.expect(HTML(including(notExpectedText)).absent());
  },
  waitLoading: () => {
    cy.expect(HTML(including(title)).exists());
  },
  close: () => cy.do(closeButton.click())
};
