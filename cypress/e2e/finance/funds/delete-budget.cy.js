import permissions from '../../../support/dictionary/permissions';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Funds', () => {
  const currentBudgetSectionId = 'currentBudget';
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };

  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const defaultFund = { ...Funds.defaultUiFund };
  const allocatedQuantity = '100';
  let user;

  before(() => {
    cy.getAdminToken();
    FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
      firstFiscalYear.id = firstFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = firstFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        defaultFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(defaultFund).then((fundResponse) => {
          defaultFund.id = fundResponse.fund.id;
        });
      });
    });
    cy.createTempUser([
      permissions.uiFinanceViewEditDeleteFundBudget.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewEditFundAndBudget.gui,
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    cy.deleteLedgerApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it('C343211 Delete Budget (thunderjet)', { tags: ['smoke', 'thunderjet', 'C343211'] }, () => {
    FinanceHelp.searchByName(defaultFund.name);
    Funds.selectFund(defaultFund.name);
    Funds.addBudget(allocatedQuantity);
    Funds.checkCreatedBudget(defaultFund.code, firstFiscalYear.code);
    Funds.viewTransactions();
    Funds.selectTransactionInList('Allocation');
    Funds.closeTransactionDetails();
    Funds.closeTransactionApp(defaultFund, firstFiscalYear);
    Funds.deleteBudgetViaActions();
    Funds.checkDeletedBudget(currentBudgetSectionId);
    Funds.deleteFundViaActions();
    FinanceHelp.searchByName(defaultFund.name);
    Funds.checkZeroSearchResultsHeader();
  });
});
