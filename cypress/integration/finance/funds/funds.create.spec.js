import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import Funds from '../../../support/fragments/finance/funds/funds';
import testTypes from '../../../support/dictionary/testTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import TopMenu from '../../../support/fragments/topMenu';
import newFund from '../../../support/fragments/finance/funds/newFund';

describe('ui-finance: Fund creation', () => {
  const fundDto = newFund.defaultFund;
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

  before(() => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.getToken(Cypress.env('diku_login'), Cypress.env('diku_password'));

    cy.getAcqUnitsApi({ limit: 1 })
      .then(({ body }) => { ledger.acqUnitIds = [body.acquisitionsUnits[0].id]; });

    cy.getFiscalYearsApi({ limit: 1 })
      .then(({ body }) => { ledger.fiscalYearOneId = body.fiscalYears[0].id; });

    cy.visit(TopMenu.fundPath);
  });

  beforeEach(() => {
    cy.createLedgerApi({
      ...ledger
    });
    fundDto.ledgerName = ledger.name;
  });

  afterEach(() => {
    cy.deleteLedgerApi(ledger.id);
  });

  it('C4052 should create new fund', { tags: [testTypes.smoke] }, () => {
    Funds.createFundViaUi(fundDto);
    Funds.checkCreatedFund(fundDto.name);
    Funds.deleteFundViaActions();

    // should not create fund without mandatory fields
    const testFundName = `autotest_fund_${getRandomPostfix()}`;
    Funds.tryToCreateFundWithoutMandatoryFields(testFundName);
    FinanceHelp.searchByName(testFundName);
    Funds.checkZeroSearchResultsHeader();
  });
});
