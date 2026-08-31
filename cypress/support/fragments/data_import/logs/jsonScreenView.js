import { HTML, including } from '@interactors/html';
import { Button, ButtonGroup } from '../../../../../interactors';

const srsMarcTab = ButtonGroup().find(Button(including('SRS MARC')));
const instanceTab = ButtonGroup().find(Button(including('Instance')));
const itemTab = ButtonGroup().find(Button(including('Item')));
const incomingRecordTab = ButtonGroup().find(Button(including('Incoming record')));
const holdingsTab = ButtonGroup().find(Button(including('Holdings')));
const authorityTab = ButtonGroup().find(Button(including('Authority')));
const orderTab = ButtonGroup().find(Button(including('Order')));
const invoiceTab = ButtonGroup().find(Button(including('Invoice')));

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
    cy.do(srsMarcTab.click());
    cy.do(
      srsMarcTab.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },
  openInstanceTab: () => cy.do(instanceTab.click()),
  openItemTab: () => cy.do(itemTab.click()),
  openHoldingsTab: () => cy.do(holdingsTab.click()),
  openOrderTab: () => cy.do(orderTab.click()),
  openAuthorityTab: () => {
    cy.do(authorityTab.click());
    cy.do(
      authorityTab.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },

  verifyContentInTab: (value) => {
    cy.wait(1000); // wait for content to load
    cy.expect(HTML(including(value)).exists());
  },
  verifyContentNotExistInTab: (value) => {
    cy.expect(HTML(including(value)).absent());
  },

  verifyTabsPresented: () => {
    cy.expect([
      incomingRecordTab.exists(),
      srsMarcTab.exists(),
      instanceTab.exists(),
      holdingsTab.exists(),
      itemTab.exists(),
      authorityTab.exists(),
      orderTab.exists(),
      invoiceTab.exists(),
    ]);
  },

  verifyIncomingRecordTabIsActive: () => {
    cy.do(
      incomingRecordTab.perform((element) => {
        expect(element.classList[2]).to.include('primary');
      }),
    );
  },
};
