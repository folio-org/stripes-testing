import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import Funds from '../../../support/fragments/finance/funds/funds';
import { getCurrentFiscalYearCode } from '../../../support/utils/dateTools';
import { testType } from '../../../support/utils/tagTools';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import TopMenu from '../../../support/fragments/topMenu';
import newFund from '../../../support/fragments/finance/funds/newFund';

describe('ui-finance: Delete budget from fund', () => {
  const currentBudgetSectionId = 'currentBudget';
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

  it('C343211 delete budget', { tags: [testType.smoke] }, () => {
    const quantityArray = [0, 100];
    cy.visit(TopMenu.fundPath);
    Funds.createFundViaUi(fundDto);
    Funds.checkCreatedFund(fundDto.name);
    quantityArray.forEach(
      quantity => {
        Funds.addBudget(quantity);
        Funds.checkCreatedBudget(fundDto.code, getCurrentFiscalYearCode());
        Funds.checkBudgetQuantity(quantity);
        Funds.openTransactions();
        if (quantity === 0) {
          // check empty transaction
          FinanceHelp.checkZeroSearchResultsMessage();
        } else {
          Funds.checkTransaction(quantity, fundDto.code);
        }
        FinanceHelp.clickOnCloseIconButton();
        Funds.deleteBudgetViaActions();
        Funds.checkDeletedBudget(currentBudgetSectionId);
      }
    );
    Funds.deleteFundViaActions();
    FinanceHelp.searchByName(fundDto.name);
    Funds.checkZeroSearchResultsHeader();
  });
});
