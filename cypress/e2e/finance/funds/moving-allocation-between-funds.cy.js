import permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance: Funds', () => {
  const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultLedger = { ...Ledgers.defaultUiLedger };
  const fromFund = { ...Funds.defaultUiFund };
  const toFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };

  const toBudget = Budgets.getDefaultBudget();
  const fromBudget = Budgets.getDefaultBudget();
  let user;

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
        firstFiscalYear.id = firstFiscalYearResponse.id;
        toBudget.fiscalYearId = firstFiscalYearResponse.id;
        fromBudget.fiscalYearId = firstFiscalYearResponse.id;
        defaultLedger.fiscalYearOneId = firstFiscalYear.id;
        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;
          fromFund.ledgerId = defaultLedger.id;
          toFund.ledgerId = defaultLedger.id;

          Funds.createViaApi(toFund).then((fundResponse) => {
            toFund.id = fundResponse.fund.id;
            toBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(toBudget);
            fromFund.allocatedToIds = [fundResponse.fund.id];
            Funds.createViaApi(fromFund).then((secondFundResponse) => {
              fromFund.id = secondFundResponse.fund.id;
              fromBudget.fundId = secondFundResponse.fund.id;
              Budgets.createViaApi(fromBudget);
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
    Budgets.deleteViaApi(toBudget.id);
    Budgets.deleteViaApi(fromBudget.id);
    Funds.deleteFundViaApi(toFund.id);
    Funds.deleteFundViaApi(fromFund.id);
    Ledgers.deleteLedgerViaApi(defaultLedger.id);
    FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C374166 Moving allocation between funds is NOT successful if it results in negative available amount (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374166'] },
    () => {
      FinanceHelper.searchByName(fromFund.name);
      Funds.selectFund(fromFund.name);

      Funds.checkBudgetDetails([{ ...fromBudget, available: fromBudget.allocated }]);
      Funds.selectBudgetDetails();
      const amount = '100';
      Funds.moveAllocation({ fromFund, toFund, amount, isDisabledConfirm: true });
      Funds.checkAmountInputError('Total allocation cannot be less than zero');
      Funds.closeTransferModal();
      Funds.closeBudgetDetails();
      Funds.checkBudgetDetails([{ ...fromBudget, available: fromBudget.allocated }]);
    },
  );
});
