import { HTML, including } from '@interactors/html';
import { Button } from '../../../../../interactors';

export default {
  verifyJsonScreenIsOpened: () => {
    cy.get('#logs-pane').should('exist');
    // TODO need to wait until page will be loaded
    cy.wait(2000);
  },

  getInstanceHrid: () => {
    return cy
      .contains('"instanceHrid":')
      .should('exist')
      .invoke('parent')
      .find('[class*="string--"]')
      .invoke('text')
      .then((text) => {
        const instanceHrid = text.match(/in(\d+)/);
        return instanceHrid[0];
      });
  },

  openHoldingsTab: () => {
    cy.do(Button('Holdings*').click());
  },

  openItemTab: () => {
    cy.do(Button('Item*').click());
  },

  openOrderTab: () => {
    cy.do(Button('Order*').click());
  },

  verifyContentInTab: (value) => {
    cy.expect(HTML(including(value)).exists());
  },
};
