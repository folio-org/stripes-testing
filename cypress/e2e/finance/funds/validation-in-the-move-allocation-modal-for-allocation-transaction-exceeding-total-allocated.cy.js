import {
  APPLICATION_NAMES,
  FUND_STATUSES,
  FUNDING_INFORMATION_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Funds', () => {
    const firstFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const fundA = { ...Funds.defaultUiFund };
    const fundB = {
      name: `autotest_fund2_${getRandomPostfix()}`,
      code: getRandomPostfix(),
      externalAccountNo: getRandomPostfix(),
      fundStatus: FUND_STATUSES.ACTIVE,
      description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
    };

    const budgetA = {
      ...Budgets.getDefaultBudget(),
      allocated: 200,
    };
    const budgetB = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    let user;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        FiscalYears.createViaApi(firstFiscalYear).then((firstFiscalYearResponse) => {
          firstFiscalYear.id = firstFiscalYearResponse.id;
          budgetA.fiscalYearId = firstFiscalYearResponse.id;
          budgetB.fiscalYearId = firstFiscalYearResponse.id;
          defaultLedger.fiscalYearOneId = firstFiscalYear.id;
          Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
            defaultLedger.id = ledgerResponse.id;
            fundA.ledgerId = defaultLedger.id;
            fundB.ledgerId = defaultLedger.id;

            Funds.createViaApi(fundB).then((fundBResponse) => {
              fundB.id = fundBResponse.fund.id;
              budgetB.fundId = fundBResponse.fund.id;
              Budgets.createViaApi(budgetB);
              fundA.allocatedToIds = [fundBResponse.fund.id];
              Funds.createViaApi(fundA).then((fundAResponse) => {
                fundA.id = fundAResponse.fund.id;
                budgetA.fundId = fundAResponse.fund.id;
                Budgets.createViaApi(budgetA);
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceCreateAllocations.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
        Funds.waitLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C825298 Validation in the "Move allocation" modal for allocation transaction exceeding total allocated (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C825298'] },
      () => {
        FinanceHelper.searchByName(fundA.name);
        Funds.selectFund(fundA.name);
        Funds.checkBudgetDetails([{ ...budgetA, available: budgetA.allocated }]);
        Funds.selectBudgetDetails();

        const addTransferModal = BudgetDetails.clickMoveAllocationButton();
        addTransferModal.verifyFromFieldValue('');
        addTransferModal.verifyToFieldValue(fundA.name);

        addTransferModal.fillTransferDetails({ fromFund: fundB.name, amount: '200' });
        addTransferModal.expectErrorPresent('Total allocation cannot be less than zero');
        addTransferModal.verifyConfirmButtonDisabled(true);
        addTransferModal.verifyCancelButtonDisabled(false);

        addTransferModal.clickSwapButton();
        addTransferModal.verifyFromFieldValue(fundA.name);
        addTransferModal.verifyToFieldValue(fundB.name);
        addTransferModal.verifyConfirmButtonDisabled(false);

        addTransferModal.clickSwapButton();
        addTransferModal.verifyFromFieldValue(fundB.name);
        addTransferModal.verifyToFieldValue(fundA.name);
        addTransferModal.expectErrorPresent('Total allocation cannot be less than zero');
        addTransferModal.verifyConfirmButtonDisabled(true);

        addTransferModal.fillTransferDetails({ amount: '100' });
        addTransferModal.clickConfirmButton({ ammountAllocated: true, transferCreated: false });
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: FUNDING_INFORMATION_NAMES.TOTAL_ALLOCATED, value: '$300.00' }],
        });
      },
    );
  });
});
