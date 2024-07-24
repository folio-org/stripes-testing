import { HTML, including } from '@interactors/html';
import { Button } from '../../../../../interactors';

const srsMarcTab = Button(including('SRS MARC'));
const instanceTab = Button(including('Instance'));
const itemTab = Button(including('Item'));

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

  openMarcSrsTab: () => cy.do(srsMarcTab.click()),
  openInstanceTab: () => cy.do(instanceTab.click()),
  openItemTab: () => cy.do(itemTab.click()),

  openHoldingsTab: () => {
    cy.get('div[class^="buttonGroup-"]').find('[data-test-logs-filter-option="3"]').click();
  },

  openOrderTab: () => {
    cy.get('div[class^="buttonGroup-"]').find('button[data-test-logs-filter-option="6"]').click();
  },

  verifyContentInTab: (value) => {
    cy.expect(HTML(including(value)).exists());
  },
  verifyContentNotExistInTab: (value) => {
    cy.expect(HTML(including(value)).absent());
  },

  verifyTabsPresented: () => {
    cy.expect([
      Button(including('Incoming record')).exists(),
      srsMarcTab.exists(),
      instanceTab.exists(),
      Button(including('Holdings')).exists(),
      itemTab.exists(),
      Button(including('Authority')).exists(),
      Button(including('Order')).exists(),
      Button(including('Invoice')).exists(),
    ]);
  },
};
