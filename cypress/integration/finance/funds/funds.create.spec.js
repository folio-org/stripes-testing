import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import Funds from '../../../support/fragments/finance/funds/funds';
import { testType } from '../../../support/utils/tagTools';


describe('ui-finance: Fund creation', () => {
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

    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'))
      .then(() => {
        cy.getAcqUnitsApi({ limit: 1 });
        cy.getFiscalYearsApi({ limit: 1 });
      })
      .then(() => {
        cy.visit('/finance/fund');
      });
  });

  beforeEach(() => {
    cy.createLedgerApi({
      ...ledger,
      acqUnitIds: [Cypress.env('acqUnits')[0].id],
      fiscalYearOneId: Cypress.env('fiscalYears')[0].id,
    });
  });

  afterEach(() => {
    cy.deleteLedgerApi(ledger.id);
  });

  it('C4052 should create new fund', { tags: [testType.smoke] }, () => {
    const defaultFund = { ...NewFund.defaultFund };
    defaultFund.ledgerName = ledger.name;
    Funds.createDefaultFund(defaultFund);
    Funds.checkCreatedFund(defaultFund.name);
    Funds.deleteFundViaActions();

    // should not create fund without mandatory fields
    const testFundName = `autotest_fund_${getRandomPostfix()}`;
    Funds.tryToCreateFundWithoutMandatoryFields(testFundName);
    Funds.searchByName(testFundName);
    Funds.checkZeroSearchResultsHeader();
  });
});
