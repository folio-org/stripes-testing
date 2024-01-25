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

  getOrderNumber: () => {
    return cy
      .contains('"poLineNumber":')
      .should('exist')
      .invoke('parent')
      .find('[class*="string--"]')
      .invoke('text')
      .then((text) => {
        const orderNumber = text.match(/"(\d+-\d+)""/);
        return orderNumber[1].replace('-1', '');
      });
  },

  openMarcSrsTab: () => {
    cy.do(Button(including('SRS MARC')).click());
  },

  openInstanceTab: () => {
    cy.do(Button(including('Instance')).click());
  },

  openHoldingsTab: () => {
    cy.get('div[class^="buttonGroup-"]').find('[data-test-logs-filter-option="2"]').click();
  },

  openItemTab: () => {
    cy.do(Button(including('Item')).click());
  },

  openOrderTab: () => {
    cy.get('div[class^="buttonGroup-"]').find('button[data-test-logs-filter-option="5"]').click();
  },

  verifyContentInTab: (value) => {
    cy.expect(HTML(including(value)).exists());
  },
};
