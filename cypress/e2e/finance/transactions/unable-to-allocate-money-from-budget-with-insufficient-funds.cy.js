import permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
  Transactions,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance: Funds', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const fundA = { ...Funds.defaultUiFund };
  const fundB = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
  };

  const budgetB = { ...Budgets.getDefaultBudget(), allocated: 50 };
  const budgetA = { ...Budgets.getDefaultBudget(), allocated: 0 };
  let user;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        budgetB.fiscalYearId = firstFiscalYearResponse.id;
        budgetA.fiscalYearId = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          fundA.ledgerId = defaultLedger.id;
          fundB.ledgerId = defaultLedger.id;

          Funds.createViaApi(fundB).then((fundResponse) => {
            fundB.id = fundResponse.fund.id;
            budgetB.fundId = fundResponse.fund.id;
            Budgets.createViaApi(budgetB);
            fundA.allocatedToIds = [fundResponse.fund.id];
            Funds.createViaApi(fundA).then((secondFundResponse) => {
              fundA.id = secondFundResponse.fund.id;
              budgetA.fundId = secondFundResponse.fund.id;
              Budgets.createViaApi(budgetA);
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Budgets.deleteViaApi(budgetB.id);
    Budgets.deleteViaApi(budgetA.id);
    Funds.deleteFundViaApi(fundB.id);
    Funds.deleteFundViaApi(fundA.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C380517 A user can not allocate money from budget with insufficient money (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'eurekaPhase1', 'C380517'] },
    () => {
      FinanceHelper.searchByName(fundA.name);
      Funds.selectFund(fundA.name);

      Funds.checkBudgetDetails([{ ...budgetA, available: budgetA.allocated }]);
      Funds.selectBudgetDetails();

      const amount = '100';
      Funds.moveAllocation({ fromFund: fundA, toFund: fundB, amount, isDisabledConfirm: true });
      Funds.checkAmountInputError('Total allocation cannot be less than zero');
      Funds.closeTransferModal();

      Funds.viewTransactions();
      Transactions.waitLoading();
      Transactions.checkTransactionsList({
        records: [{ type: 'Allocation', amount }],
        present: false,
      });
    },
  );
});
