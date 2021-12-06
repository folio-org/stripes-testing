import { Button, TextField, Select } from '../../../../../interactors';

const rootFundDetailsXpath = '//*[@id="pane-fund-details"]';

const newButton = Button('New');

export default {
  waitForFundDetailsLoading : () => {
    cy.xpath(rootFundDetailsXpath)
      .should('be.visible');
  },

  createDefaultFund(fund) {
    cy.do([
      newButton.click(),
      TextField('Name*').fillIn(fund.name),
      TextField('Code*').fillIn(fund.code),
      TextField('External account*').fillIn(fund.externalAccount),
      Select('Ledger').choose(fund.ledgerName),
    ]);
    this.waitForFundDetailsLoading();
  },


  deleteFundViaActions: () => {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-ledger-remove-confirmation-confirm' }).click()
    ]);
  }
};
