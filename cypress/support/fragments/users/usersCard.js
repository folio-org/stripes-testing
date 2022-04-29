import { Link } from '@interactors/html';
import { Accordion, Button, TextArea } from '../../../../interactors';

export default {
  openPatronBlocks() {
    cy.do(Accordion({ id: 'patronBlocksSection' }).clickHeader());
  },

  openLoans() {
    cy.intercept('/circulation/loans?*').as('getLoans');
    cy.wait(60000);
    cy.do(Accordion({ id : 'loansSection' }).clickHeader());
    cy.wait('@getLoans');
    cy.wait(60000);
  },

  showOpenedLoans() {
    cy.do(Link({ id: 'clickable-viewcurrentloans' }).click());
  },

  createPatronBlock() {
    cy.do([
      Button({ id: 'create-patron-block' }).click()
    ]);
  },

  fillDescription(text) {
    cy.do(TextArea({ name: 'desc' }).fillIn(text));
  },

  saveAndClose() {
    cy.do(Button({ id: 'patron-block-save-close' }).click());
    cy.expect(Button({ id: 'patron-block-save-close' }).absent());
  }
};
