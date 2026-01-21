import { calloutTypes } from '../../../../interactors';
import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import AddTransferModal from '../../../support/fragments/finance/modals/addTransferModal';
import { TRANSFER_ACTIONS } from '../../../support/fragments/finance/transfer/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Funds', () => {
    let user;
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
    const availableAmount = '50.00';
    const toBudget = Budgets.getDefaultBudget();
    const fromBudget = Budgets.getDefaultBudget();

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
      Budgets.deleteViaApi(toBudget.id);
      Budgets.deleteViaApi(fromBudget.id);
      Funds.deleteFundViaApi(toFund.id);
      Funds.deleteFundViaApi(fromFund.id);
      Ledgers.deleteLedgerViaApi(defaultLedger.id);
      FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C877099 Moving allocation between funds is NOT successful if it results in negative available amount (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C877099'] },
      () => {
        FinanceHelper.searchByName(fromFund.name);
        Funds.selectFund(fromFund.name);
        Funds.checkBudgetDetails([{ ...fromBudget, available: fromBudget.allocated }]);
        Funds.selectBudgetDetails();
        BudgetDetails.waitLoading();
        BudgetDetails.checkBudgetDetails({
          summary: [{ key: 'Initial allocation', value: `$${availableAmount}` }],
        });

        const amount = '100';
        BudgetDetails.clickMoveAllocationButton();
        AddTransferModal.verifyModalView({ header: TRANSFER_ACTIONS.MOVE_ALLOCATION });
        AddTransferModal.fillTransferDetails({
          fromFund: fromFund.name,
          toFund: toFund.name,
          amount,
        });
        AddTransferModal.clickConfirmButton({ transferCreated: false });
        InteractorsTools.checkCalloutMessage(
          `$100.00 was not successfully allocated to the budget ${toBudget.name} because it exceeds the total allocation amount of ${fromBudget.name} and ledger fund restrictions are active`,
          calloutTypes.error,
        );
        AddTransferModal.closeModal();
        BudgetDetails.waitLoading();
        BudgetDetails.checkBudgetDetails({
          balance: { cash: '$50.00', available: `$${availableAmount}` },
        });
        BudgetDetails.closeBudgetDetails();
        Funds.waitLoading();
        Funds.checkBudgetDetails([{ ...fromBudget, available: fromBudget.allocated }]);
      },
    );
  });
});
