import { Permissions } from '../../../support/dictionary';
import { ExpenseClasses } from '../../../support/fragments/settings/finance';
import { Budgets, Funds } from '../../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { NewOrder, Orders, BasicOrderLine } from '../../../support/fragments/orders';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';

describe('Finance', () => {
  describe('Funds', () => {
    const testData = {
      expenseClass: ExpenseClasses.getDefaultExpenseClass(),
      organization: NewOrganization.getDefaultOrganization(),
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ExpenseClasses.createExpenseClassViaApi(testData.expenseClass);

        const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          budget: {
            allocated: 100,
            statusExpenseClasses: [
              {
                status: 'Active',
                expenseClassId: testData.expenseClass.id,
              },
            ],
          },
        });

        testData.fiscalYear = fiscalYear;
        testData.fund = fund;
        testData.budget = budget;

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 50,
            fundDistribution: [
              {
                code: testData.fund.code,
                fundId: testData.fund.id,
                expenseClassId: testData.expenseClass.id,
                value: 100,
              },
            ],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' });
            },
          );
        });
      });

      cy.createTempUser([Permissions.uiFinanceViewFundAndBudget.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      "C415261 User can view actual Expense Class information on Fund's Budget details pane after the first using Expense Class (thunderjet) (TaaS)",
      { tags: ['extendedPath', 'thunderjet', 'C415261'] },
      () => {
        // Open the record with Fund from precondition by clicking on its name
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        FundDetails.checkFundDetails({
          information: [{ key: 'Status', value: 'Active' }],
          currentBudget: {
            name: testData.budget.name,
            allocated: '$100.00',
          },
          currentExpenseClasses: [
            { name: testData.expenseClass.name, encumbered: '$50.00', percentExpended: '0%' },
          ],
        });

        // Click on the record in "Current budget" accordion
        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: 'Initial allocation', value: '$100.00' },
            { key: 'Encumbered', value: '$50.00' },
          ],
          balance: { cash: '$100.00', available: '$50.00' },
          expenseClass: {
            name: testData.expenseClass.name,
            encumbered: '$50.00',
            awaitingPayment: '$0.00',
            expended: '$0.00',
            percentExpended: '0%',
            status: 'Active',
          },
        });
      },
    );
  });
});
