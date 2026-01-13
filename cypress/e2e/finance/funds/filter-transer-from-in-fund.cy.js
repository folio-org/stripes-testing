import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Funds', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: `2${getRandomPostfix()}`,
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const thirdFund = {
    name: `autotest_fund3_${getRandomPostfix()}`,
    code: `3${getRandomPostfix()}`,
    externalAccountNo: `32${getRandomPostfix()}`,
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };

  const defaultBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 1000,
  };
  let user;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(defaultFiscalYear).then((defaultFiscalYearResponse) => {
      defaultFiscalYear.id = defaultFiscalYearResponse.id;
      defaultBudget.fiscalYearId = defaultFiscalYearResponse.id;
      defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
        defaultLedger.id = ledgerResponse.id;
        firstFund.ledgerId = defaultLedger.id;
        secondFund.ledgerId = defaultLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          defaultBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(defaultBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
        cy.reload();
        Funds.waitLoading();
      }, 20_000);
    });
  });

  after(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    FinanceHelp.searchByName(firstFund.name);
    Funds.selectFund(firstFund.name);
    Funds.selectBudgetDetails();
    Funds.deleteBudgetViaActions();
    Funds.checkIsBudgetDeleted();

    Funds.deleteFundViaApi(firstFund.id);
    Funds.deleteFundViaApi(secondFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C380708 Filter in "Transfer from" and "Transfer to" fields works correctly when creating a new fund (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C380708'] },
    () => {
      Funds.cancelCreatingFundWithTransfers(thirdFund, defaultLedger.name, firstFund, secondFund);
    },
  );
});
