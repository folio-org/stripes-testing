import { Permissions } from '../../../support/dictionary';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';
import SettingsFinance from '../../../support/fragments/settings/finance/settingsFinance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import dateTools from '../../../support/utils/dateTools';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Settings Finance', () => {
    const testData = {
      fiscalYears: [],
      ledgers: [],
      funds: [],
      budgets: [],
      expenseClasses: [],
      user: {},
    };

    const createExpenseClasses = () => {
      const firstExpenseClass = {
        ...ExpenseClasses.getDefaultExpenseClass(),
        code: `EC1_${getRandomPostfix()}`,
      };
      const secondExpenseClass = {
        ...ExpenseClasses.getDefaultExpenseClass(),
        code: `EC2_${getRandomPostfix()}`,
      };

      return ExpenseClasses.createExpenseClassViaApi(firstExpenseClass).then((ec1Response) => {
        testData.expenseClasses.push(ec1Response);
        return ExpenseClasses.createExpenseClassViaApi(secondExpenseClass).then((ec2Response) => {
          testData.expenseClasses.push(ec2Response);
          return { ec1: ec1Response, ec2: ec2Response };
        });
      });
    };

    const createFundWithBudget = (ledgerId, fiscalYearId, expenseClasses) => {
      const fund = {
        ...Funds.getDefaultFund(),
        ledgerId,
      };

      return Funds.createViaApi(fund).then((fundResponse) => {
        testData.funds.push(fundResponse.fund);

        const budget = {
          ...Budgets.getDefaultBudget(),
          fiscalYearId,
          fundId: fundResponse.fund.id,
        };

        return Budgets.createViaApi(budget).then((budgetResponse) => {
          testData.budgets.push(budgetResponse);
          return Budgets.updateBudgetViaApi({
            ...budgetResponse,
            statusExpenseClasses: expenseClasses,
          });
        });
      });
    };

    const createFirstFiscalYearData = (expenseClasses) => {
      return FiscalYears.createViaApi(FiscalYears.getDefaultFiscalYear()).then(
        (firstFiscalYearResponse) => {
          testData.fiscalYears.push(firstFiscalYearResponse);

          const firstLedger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: firstFiscalYearResponse.id,
          };

          return Ledgers.createViaApi(firstLedger).then((firstLedgerResponse) => {
            testData.ledgers.push(firstLedgerResponse);

            return createFundWithBudget(firstLedgerResponse.id, firstFiscalYearResponse.id, [
              { expenseClassId: expenseClasses.ec1.id, status: 'Active' },
              { expenseClassId: expenseClasses.ec2.id, status: 'Active' },
            ]).then(() => {
              return createFundWithBudget(firstLedgerResponse.id, firstFiscalYearResponse.id, [
                { expenseClassId: expenseClasses.ec1.id, status: 'Active' },
              ]);
            });
          });
        },
      );
    };

    const createSecondFiscalYearData = (expenseClasses) => {
      return FiscalYears.createViaApi(FiscalYears.getDefaultFiscalYear()).then(
        (secondFiscalYearResponse) => {
          testData.fiscalYears.push(secondFiscalYearResponse);

          const secondLedger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: secondFiscalYearResponse.id,
          };

          return Ledgers.createViaApi(secondLedger).then((secondLedgerResponse) => {
            testData.ledgers.push(secondLedgerResponse);

            return createFundWithBudget(secondLedgerResponse.id, secondFiscalYearResponse.id, [
              { expenseClassId: expenseClasses.ec1.id, status: 'Active' },
            ]);
          });
        },
      );
    };

    before('Create test data', () => {
      cy.getAdminToken();
      return createExpenseClasses().then((expenseClasses) => {
        createFirstFiscalYearData(expenseClasses).then(() => {
          createSecondFiscalYearData(expenseClasses).then(() => {
            cy.createTempUser([
              Permissions.uiSettingsFinanceExportFundAndExpenseClassCodes.gui,
            ]).then((userProperties) => {
              testData.user = userProperties;
              cy.login(testData.user.username, testData.user.password, {
                path: SettingsMenu.exportFundPath,
                waiter: SettingsFinance.waitExportFundAndExpenseClassCodesLoading,
              });
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        const budgetUpdatePromises = testData.budgets.map((budget) => Budgets.getBudgetByIdViaApi(budget.id).then((latestBudget) => Budgets.updateBudgetViaApi({
          ...latestBudget,
          statusExpenseClasses: [],
        })));

        return cy.wrap(Promise.all(budgetUpdatePromises)).then(() => {
          testData.budgets.forEach((budget) => {
            Budgets.deleteViaApi(budget.id);
          });
          testData.funds.forEach((fund) => {
            Funds.deleteFundViaApi(fund.id);
          });
          testData.expenseClasses.forEach((ec) => {
            ExpenseClasses.deleteExpenseClassViaApi(ec.id);
          });
          testData.ledgers.forEach((ledger) => {
            Ledgers.deleteLedgerViaApi(ledger.id);
          });
          testData.fiscalYears.forEach((fy) => {
            FiscalYears.deleteFiscalYearViaApi(fy.id);
          });
          Users.deleteViaApi(testData.user.userId);
        });
      });
    });

    it(
      'C358967 A user can export fund and expense class codes (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C358967'] },
      () => {
        SettingsFinance.checkButtonState('Export', true);
        SettingsFinance.selectFiscalYear(testData.fiscalYears[0].code);
        SettingsFinance.checkButtonState('Export', false);
        SettingsFinance.clickExportButton();
        InteractorsTools.checkCalloutMessage('Combined code list was successfully exported.');

        const timestamp = dateTools.getCurrentDateTimeForFundsExpenseClasses();
        const fileName1 = `fund-codes-export-${testData.fiscalYears[0].code}-${timestamp}.csv`;
        SettingsFinance.checkExportedFundAndExpenseClassFile(fileName1, [
          [
            testData.funds[0].code,
            JSON.stringify([
              `${testData.funds[0].code}:${testData.expenseClasses[0].code}`,
              `${testData.funds[0].code}:${testData.expenseClasses[1].code}`,
            ]),
          ],
          [
            testData.funds[1].code,
            JSON.stringify([`${testData.funds[1].code}:${testData.expenseClasses[0].code}`]),
          ],
        ]);
        Ledgers.deleteDownloadedFile(fileName1);
        SettingsFinance.selectFiscalYear(testData.fiscalYears[1].code);
        SettingsFinance.checkButtonState('Export', false);
        SettingsFinance.clickExportButton();
        InteractorsTools.checkCalloutMessage('Combined code list was successfully exported.');

        const timestamp2 = dateTools.getCurrentDateTimeForFundsExpenseClasses();
        const fileName2 = `fund-codes-export-${testData.fiscalYears[1].code}-${timestamp2}.csv`;
        SettingsFinance.checkExportedFundAndExpenseClassFile(fileName2, [
          [
            testData.funds[2].code,
            JSON.stringify([`${testData.funds[2].code}:${testData.expenseClasses[0].code}`]),
          ],
        ]);
        Ledgers.deleteDownloadedFile(fileName2);
      },
    );
  });
});
