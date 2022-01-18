import uuid from 'uuid';
import { Button, MultiColumnListRow, SearchField } from '../../../../interactors';
import TopMenu from '../topMenu';
import Funds from './funds/funds';
import getRandomPostfix from '../../utils/stringTools';

const searchField = SearchField({ id: 'input-record-search' });
const noResultsMessageLabel = '//span[contains(@class,"noResultsMessageLabel")]';
const chooseAFilterMessage = 'Choose a filter or enter a search query to show results.';

export default {

  statusActive : 'Active',
  statusFrozen : 'Frozen',
  statusInactive : 'Inactive',

  searchByName : (name) => {
    cy.do([
      searchField.selectIndex('Name'),
      searchField.fillIn(name),
      Button('Search').click(),
    ]);
  },

  searchByCode : (code) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('Code'),
      SearchField({ id: 'input-record-search' }).fillIn(code),
      Button('Search').click(),
    ]);
  },

  searchByExternalAccount : (externalAccount) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).selectIndex('External account number'),
      SearchField({ id: 'input-record-search' }).fillIn(externalAccount),
      Button('Search').click(),
    ]);
  },

  searchByAll : (searchValue) => {
    cy.do([
      SearchField({ id: 'input-record-search' }).fillIn(searchValue),
      Button('Search').click(),
    ]);
  },

  selectFromResultsList: (rowNumber) => {
    cy.do(MultiColumnListRow({ index: rowNumber }).click());
  },

  checkZeroSearchResultsMessage : () => {
    cy.xpath(noResultsMessageLabel)
      .should('be.visible')
      .and('have.text', chooseAFilterMessage);
  },

  clickOnCloseIconButton: () => {
    cy.do(Button({ icon: 'times' }).click());
  }
};

Cypress.Commands.add('createFundViaUI', (fund) => {
  const ledger = {
    id: uuid(),
    name: `autotest_ledger_${getRandomPostfix()}`,
    code: `autotest_code_${getRandomPostfix()}`,
    description: `autotest_ledger_ description_${getRandomPostfix()}`,
    ledgerStatus: 'Frozen',
    currency: 'USD',
    restrictEncumbrance: false,
    restrictExpenditures: false,
    acqUnitIds: '',
    fiscalYearOneId: ''
  };

  cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
  cy.getAcqUnitsApi({ limit: 1 })
    .then(({ body }) => { ledger.acqUnitIds = [body.acquisitionsUnits[0].id]; });
  cy.getFiscalYearsApi({ limit: 1 })
    .then(({ body }) => {
      ledger.fiscalYearOneId = body.fiscalYears[0].id;
      cy.createLedgerApi({
        ...ledger
      });
    });
  fund.ledgerName = ledger.name;
  cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  cy.visit(TopMenu.fundPath);
  // create second fund + assign budget 0
  Funds.createFund(fund);
  Funds.checkCreatedFund(fund.name);
  cy.wrap(ledger).as('createdLedger');
  return cy.get('@createdLedger');
});
