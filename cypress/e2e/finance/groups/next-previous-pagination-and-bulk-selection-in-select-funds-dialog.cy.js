import { FUND_STATUSES } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Groups from '../../../support/fragments/finance/groups/groups';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Groups', () => {
    const activeFundsCount = 101;
    const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const defaultLedger = { ...Ledgers.defaultUiLedger };
    const defaultGroup = { ...Groups.defaultUiGroup };
    const activeFunds = [];
    const activeBudgets = [];
    const inactiveFunds = [];
    const inactiveBudgets = [];
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      FiscalYears.createViaApi(defaultFiscalYear).then((response) => {
        defaultFiscalYear.id = response.id;
        defaultLedger.fiscalYearOneId = defaultFiscalYear.id;

        Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
          defaultLedger.id = ledgerResponse.id;

          Groups.createViaApi(defaultGroup).then((groupResponse) => {
            defaultGroup.id = groupResponse.id;
          });

          const createActiveFund = (index) => {
            const fund = {
              name: `autotest_fund_active_${index}_${getRandomPostfix()}`,
              code: `${getRandomPostfix()}`,
              externalAccountNo: getRandomPostfix(),
              fundStatus: 'Active',
              description: `Active fund ${index} created by E2E test`,
              ledgerId: defaultLedger.id,
            };
            const budget = {
              ...Budgets.getDefaultBudget(),
              allocated: 50,
              fiscalYearId: defaultFiscalYear.id,
            };

            return Funds.createViaApi(fund).then((fundResponse) => {
              fund.id = fundResponse.fund.id;
              budget.fundId = fundResponse.fund.id;
              activeFunds.push(fund);

              return Budgets.createViaApi(budget).then((budgetResponse) => {
                budget.id = budgetResponse.id;
                activeBudgets.push(budget);
              });
            });
          };

          const createInactiveFund = (index) => {
            const fund = {
              name: `autotest_fund_inactive_${index}_${getRandomPostfix()}`,
              code: `${getRandomPostfix()}`,
              externalAccountNo: getRandomPostfix(),
              fundStatus: 'Inactive',
              description: `Inactive fund ${index} created by E2E test`,
              ledgerId: defaultLedger.id,
            };
            const budget = {
              ...Budgets.getDefaultBudget(),
              allocated: 50,
              fiscalYearId: defaultFiscalYear.id,
            };

            return Funds.createViaApi(fund).then((fundResponse) => {
              fund.id = fundResponse.fund.id;
              budget.fundId = fundResponse.fund.id;
              inactiveFunds.push(fund);

              return Budgets.createViaApi(budget).then((budgetResponse) => {
                budget.id = budgetResponse.id;
                inactiveBudgets.push(budget);
              });
            });
          };

          // Chain fund creation sequentially to avoid API overload
          cy.wrap(null).then(() => {
            let promise = Promise.resolve();
            for (let i = 0; i < activeFundsCount; i++) {
              const index = i;
              promise = promise.then(() => {
                if (index % 20 === 0 && index > 0) {
                  return cy.getAdminToken().then(() => createActiveFund(index));
                }
                return createActiveFund(index);
              });
            }
            return promise.then(() => createInactiveFund(0));
          });
        });
      });

      cy.createTempUser([
        permissions.uiFinanceViewEditFundAndBudget.gui,
        permissions.uiFinanceViewEditGroup.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.groupsPath,
          waiter: Groups.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      activeBudgets.forEach((budget) => {
        Budgets.deleteViaApi(budget.id);
      });
      inactiveBudgets.forEach((budget) => {
        Budgets.deleteViaApi(budget.id);
      });
      cy.wait(1000);
      activeFunds.forEach((fund) => {
        Funds.deleteFundViaApi(fund.id);
      });
      inactiveFunds.forEach((fund) => {
        Funds.deleteFundViaApi(fund.id);
      });
      cy.wait(1000);
      Groups.deleteGroupViaApi(defaultGroup.id);
      Ledgers.deleteLedgerViaApi(defaultLedger.id);
      cy.wait(1000);
      FiscalYears.deleteFiscalYearViaApi(defaultFiscalYear.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359157 Next/previous pagination and bulk selection in "Select funds" dialog (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C359157'] },
      () => {
        FinanceHelp.searchByName(defaultGroup.name);
        Groups.selectGroup(defaultGroup.name);
        Groups.waitForGroupDetailsLoading();

        Groups.openSelectFundsModal();

        Groups.filterByLedgerInModal(defaultLedger.name);

        Groups.filterByStatusInModal(FUND_STATUSES.INACTIVE);
        Groups.verifyRecordsFoundTextInModal();
        Groups.verifySelectAllCheckboxInModal(false);
        Groups.verifyPreviousButtonInModal(false);
        Groups.verifyNextButtonInModal(false);
        Groups.verifyPaginationIndicatorInModal();
        Groups.verifyTotalSelectedInModal(0);

        Groups.filterByStatusInModal('Inactive');
        Groups.filterByStatusInModal('Active');
        Groups.verifyRecordsFoundTextInModal();
        Groups.verifySelectAllCheckboxInModal(false);
        Groups.verifyPreviousButtonInModal(false);
        Groups.verifyNextButtonInModal(true);
        Groups.verifyFundsCountInModal(50);
        Groups.verifyPaginationIndicatorInModal();
        Groups.verifyTotalSelectedInModal(0);

        Groups.selectAllFundsOnPage();
        Groups.verifyTotalSelectedInModal(50);

        Groups.clickNextButtonInModal();
        Groups.verifyRecordsFoundTextInModal();
        Groups.verifySelectAllCheckboxInModal(false);
        Groups.verifyPreviousButtonInModal(true);
        Groups.verifyNextButtonInModal(true);
        Groups.verifyFundsCountInModal(50);
        Groups.verifyPaginationIndicatorInModal();
        Groups.verifyTotalSelectedInModal(50);

        Groups.selectFundInModalByIndex(0);
        Groups.selectFundInModalByIndex(1);
        Groups.verifyTotalSelectedInModal(52);

        Groups.clickPreviousButtonInModal();
        Groups.verifySelectAllCheckboxInModal(true);
        Groups.verifyPreviousButtonInModal(false);
        Groups.verifyNextButtonInModal(true);
        Groups.verifyTotalSelectedInModal(52);

        Groups.selectAllFundsOnPage();
        Groups.verifySelectAllCheckboxInModal(false);
        Groups.verifyTotalSelectedInModal(2);

        Groups.clickNextButtonInModal();
        Groups.verifySelectAllCheckboxInModal(false);
        Groups.verifyPreviousButtonInModal(true);
        Groups.verifyNextButtonInModal(true);
        Groups.verifyFundsCountInModal(50);
        Groups.verifyTotalSelectedInModal(2);

        Groups.clickNextButtonInModal();
        Groups.verifySelectAllCheckboxInModal(false);
        Groups.verifyPreviousButtonInModal(true);
        Groups.verifyNextButtonInModal(false);
        Groups.verifyTotalSelectedInModal(2);

        Groups.selectFundInModalByIndex(0);
        Groups.verifyTotalSelectedInModal(3);

        Groups.clickSaveInModal();
        InteractorsTools.checkCalloutMessage('Fund(s) have been added to group');
        Groups.verifyFundsCount(3);
      },
    );
  });
});
