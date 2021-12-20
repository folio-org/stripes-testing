import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import { getCurrentFiscalYearCode } from '../../../support/utils/dateTools';
import { testType } from '../../../support/utils/tagTools';

describe('ui-finance: Add budget to fund', () => {
  let aUnits;
  let fiscalYears;

  const ledger = {
    id: uuid(),
    name: `autotest_ledger_${getRandomPostfix()}`,
    code: `autotest_code_${getRandomPostfix()}`,
    description: `autotest_ledger_ description_${getRandomPostfix()}`,
    ledgerStatus: 'Frozen',
    currency: 'USD',
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy
      .okapiRequest({
        path: 'acquisitions-units/units',
        limit: 1,
      })
      .then(({ body }) => {
        aUnits = body.acquisitionsUnits;
      });

    cy
      .okapiRequest({
        path: 'finance/fiscal-years',
        limit: 1,
      })
      .then(({ body }) => {
        fiscalYears = body.fiscalYears;
      });
  });

  beforeEach(() => {
    cy.createLedgerApi({
      ...ledger,
      acqUnitIds: [aUnits[0].id],
      fiscalYearOneId: fiscalYears[0].id,
    });
  });

  afterEach(() => {
    cy.deleteLedgerApi(ledger.id);
  });

  it('C4057 should add budget for a new fund', { tags: [testType.smoke] }, () => {
    const defaultFund = { ...NewFund.defaultFund };
    defaultFund.ledgerName = ledger.name;
    cy.visit('/finance/fund');
    Funds.createDefaultFund(defaultFund);
    Funds.checkCreatedFund(defaultFund.name);
    Funds.addBudget(0);
    Funds.checkCreatedBudget(defaultFund.code, getCurrentFiscalYearCode());
    Funds.deleteBudgetViaActions();
    Funds.deleteFundViaActions();
    Funds.searchByName(defaultFund.name);
    Funds.checkZeroSearchResultsHeader();
  });
});
