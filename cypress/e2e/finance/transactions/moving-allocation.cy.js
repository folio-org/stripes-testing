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

describe('Finance: Transactions', () => {
  const firstFiscalYear = FiscalYears.getDefaultFiscalYear();
  const defaultLedger = Ledgers.getDefaultLedger();
  const toFund = Funds.getDefaultFund();
  const fromFund = {
    ...Funds.getDefaultFund(),
    allocatedToIds: [toFund.id],
  };
  const toBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 0,
  };

  let user;

  before(() => {
    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(firstFiscalYear).then(() => {
        const ledgerProperties = {
          ...defaultLedger,
          fiscalYearOneId: firstFiscalYear.id,
        };
        Ledgers.createViaApi(ledgerProperties).then(() => {
          const toFundProperties = {
            ...toFund,
            ledgerId: defaultLedger.id,
          };
          Funds.createViaApi(toFundProperties).then(() => {
            Budgets.createViaApi({
              ...toBudget,
              fiscalYearId: firstFiscalYear.id,
              fundId: toFund.id,
            });
          });

          const fromFundProperties = {
            ...fromFund,
            ledgerId: defaultLedger.id,
          };
          Funds.createViaApi(fromFundProperties);
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

  after(() => {
    Budgets.deleteViaApi(toBudget.id);
    Funds.deleteFundViaApi(toFund.id);
    Funds.deleteFundViaApi(fromFund.id);
    Ledgers.deleteledgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C375175 Moving allocation is NOT successful if money was moved from fund having NO current budget (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      FinanceHelper.searchByName(toFund.name);
      Funds.selectFund(toFund.name);
      Funds.selectBudgetDetails();

      const amount = '10';
      Funds.moveAllocation({ toFund, fromFund, amount });
      InteractorsTools.checkCalloutErrorMessage(
        `$${amount}.00 was not successfully allocated because ${fromFund.code} has no budget`,
      );
      Funds.closeTransferModal();
    },
  );
});
