import permissions from '../../../support/dictionary/permissions';
import testType from '../../../support/dictionary/testTypes';
import devTeams from '../../../support/dictionary/devTeams';
import {
  FiscalYears,
  Funds,
  Budgets,
  Ledgers,
  FinanceHelper,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Finance: Funds', () => {
  const toFund = Funds.getDefaultFund();
  const fromFund = {
    ...Funds.getDefaultFund(),
    allocatedToIds: [toFund.id],
  };
  const toBudget = Budgets.getDefaultBudget();
  const fromBudget = Budgets.getDefaultBudget();

  const testData = {
    fiscalYear: FiscalYears.getDefaultFiscalYear(),
    ledger: Ledgers.getDefaultLedger(),
    funds: [toFund, fromFund],
    budgets: [toBudget, fromBudget],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(testData.fiscalYear).then(() => {
        const ledgerProperties = {
          ...testData.ledger,
          fiscalYearOneId: testData.fiscalYear.id,
        };
        Ledgers.createViaApi(ledgerProperties).then(() => {
          testData.funds.forEach((fund, ind) => {
            const fundProperties = {
              ...fund,
              ledgerId: testData.ledger.id,
            };
            Funds.createViaApi(fundProperties).then(() => {
              Budgets.createViaApi({
                ...testData.budgets[ind],
                fiscalYearId: testData.fiscalYear.id,
                fundId: testData.funds[ind].id,
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceCreateAllocations.gui,
      permissions.uiFinanceViewFundAndBudget.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    testData.budgets.forEach(({ id }) => Budgets.deleteViaApi(id));
    testData.funds.forEach(({ id }) => Funds.deleteFundViaApi(id));
    Ledgers.deleteledgerViaApi(testData.ledger.id);
    FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C374166 Moving allocation between funds is NOT successful if it results in negative available amount (thunderjet) (TaaS)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FinanceHelper.searchByName(fromFund.name);
      Funds.selectFund(fromFund.name);

      Funds.checkBudgetDetails([{ ...fromBudget, available: fromBudget.allocated }]);
      Funds.selectBudgetDetails();

      const amount = '100';
      Funds.moveAllocation({ fromFund, toFund, amount });
      InteractorsTools.checkCalloutErrorMessage(
        `$${amount}.00 was not successfully allocated to the budget ${toBudget.name} because it exceeds the total allocation amount of ${fromBudget.name}`,
      );
      Funds.closeTransferModal();
      Funds.closeBudgetDetails();
      Funds.checkBudgetDetails([{ ...fromBudget, available: fromBudget.allocated }]);
    },
  );
});
