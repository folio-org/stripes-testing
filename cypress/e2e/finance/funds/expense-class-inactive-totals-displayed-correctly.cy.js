import { Permissions } from '../../../support/dictionary';
import {
  APPLICATION_NAMES,
  EXPENSE_CLASS_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import { ExpenseClasses } from '../../../support/fragments/settings/finance';
import {
  Budgets,
  FundDetails,
  FinanceHelper,
  Funds,
  GroupDetails,
  Groups,
} from '../../../support/fragments/finance';
import FinanceDetails from '../../../support/fragments/finance/financeDetails';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import { Invoices } from '../../../support/fragments/invoices';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

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

        const group = Groups.getDefaultGroup();
        Groups.createViaApi(group).then((groupResponse) => {
          testData.group = groupResponse;

          const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
            budget: {
              allocated: 1000,
              statusExpenseClasses: [
                {
                  status: EXPENSE_CLASS_STATUSES.ACTIVE,
                  expenseClassId: testData.expenseClass.id,
                },
              ],
            },
          });

          testData.fiscalYear = fiscalYear;
          testData.fund = fund;
          testData.budget = budget;

          Funds.getFundsViaApi({ query: `id=="${fund.id}"` }).then(({ funds }) => {
            Funds.updateFundViaApi(funds[0], [group.id]);
          });

          Organizations.createOrganizationViaApi(testData.organization);

          // Order #1 with expense class, linked to Fund A
          const order1 = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };
          const orderLine1 = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 10,
            fundDistribution: [
              {
                code: fund.code,
                fundId: fund.id,
                expenseClassId: testData.expenseClass.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          });

          Orders.createOrderWithOrderLineViaApi(order1, orderLine1).then((createdOrder1) => {
            testData.order1 = createdOrder1;
            testData.orderLine1 = orderLine1;
            Orders.updateOrderViaApi({ ...createdOrder1, workflowStatus: ORDER_STATUSES.OPEN });
          });

          // Invoice #1 linked to Order #1
          cy.then(() => {
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.organization.id,
              poLineId: testData.orderLine1.id,
              exportToAccounting: false,
              fundDistributions: [
                {
                  code: fund.code,
                  fundId: fund.id,
                  expenseClassId: testData.expenseClass.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
              subTotal: 10,
              releaseEncumbrance: true,
            }).then((invoice1) => {
              testData.invoice1 = invoice1;
            });
          });

          // Approve and Pay Invoice #1
          cy.then(() => {
            Invoices.changeInvoiceStatusViaApi({
              invoice: testData.invoice1,
              status: INVOICE_STATUSES.APPROVED,
            });
          });
          cy.then(() => {
            Invoices.changeInvoiceStatusViaApi({
              invoice: testData.invoice1,
              status: INVOICE_STATUSES.PAID,
            });
          });

          // Set expense class to Inactive on the budget
          cy.then(() => {
            Budgets.getBudgetByIdViaApi(testData.budget.id).then((budgetResp) => {
              Budgets.updateBudgetViaApi({
                ...budgetResp,
                statusExpenseClasses: budgetResp.statusExpenseClasses.map((ec) => ({
                  ...ec,
                  status: EXPENSE_CLASS_STATUSES.INACTIVE,
                })),
              });
            });
          });

          // Order #2 without expense class, linked to Fund A
          const order2 = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          };
          const orderLine2 = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 20,
            fundDistribution: [
              {
                code: fund.code,
                fundId: fund.id,
                distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                value: 100,
              },
            ],
          });

          cy.then(() => {
            Orders.createOrderWithOrderLineViaApi(order2, orderLine2).then((createdOrder2) => {
              testData.order2 = createdOrder2;
              testData.orderLine2 = orderLine2;
              Orders.updateOrderViaApi({ ...createdOrder2, workflowStatus: ORDER_STATUSES.OPEN });
            });
          });

          // Invoice #2 linked to Order #2
          cy.then(() => {
            Invoices.createInvoiceWithInvoiceLineViaApi({
              vendorId: testData.organization.id,
              poLineId: testData.orderLine2.id,
              exportToAccounting: false,
              fundDistributions: [
                {
                  code: fund.code,
                  fundId: fund.id,
                  distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
                  value: 100,
                },
              ],
              subTotal: 20,
              releaseEncumbrance: true,
            }).then((invoice2) => {
              testData.invoice2 = invoice2;
            });
          });

          // Approve and Pay Invoice #2
          cy.then(() => {
            Invoices.changeInvoiceStatusViaApi({
              invoice: testData.invoice2,
              status: INVOICE_STATUSES.APPROVED,
            });
          });
          cy.then(() => {
            Invoices.changeInvoiceStatusViaApi({
              invoice: testData.invoice2,
              status: INVOICE_STATUSES.PAID,
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewGroups.gui,
      ]).then((userProperties) => {
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
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C805786 Totals for transactions created after expense class was set to inactive are displayed correctly in the expense class summary (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C805786'] },
      () => {
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        FundDetails.checkFundDetails({
          currentExpenseClasses: [
            {
              name: 'Unassigned',
              encumbered: '$0.00',
              awaitingPayment: '$0.00',
              expended: '$20.00',
              percentExpended: '66.67%',
            },
            {
              name: testData.expenseClass.name,
              encumbered: '$0.00',
              awaitingPayment: '$0.00',
              expended: '$10.00',
              percentExpended: '33.33%',
              status: EXPENSE_CLASS_STATUSES.INACTIVE,
            },
          ],
        });
        FinanceDetails.checkUnassignedExpenseClassTooltip('currentExpenseClasses');

        const BudgetDetails = FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          expenseClasses: [
            {
              name: 'Unassigned',
              encumbered: '$0.00',
              awaitingPayment: '$0.00',
              expended: '$20.00',
              percentExpended: '66.67%',
            },
            {
              name: testData.expenseClass.name,
              encumbered: '$0.00',
              awaitingPayment: '$0.00',
              expended: '$10.00',
              percentExpended: '33.33%',
              status: EXPENSE_CLASS_STATUSES.INACTIVE,
            },
          ],
        });
        FinanceDetails.checkUnassignedExpenseClassTooltip('expense-classes');

        BudgetDetails.closeBudgetDetails();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.FINANCE);
        FinanceHelper.selectGroupsNavigation();
        Groups.waitLoading();
        Groups.searchByName(testData.group.name);
        Groups.selectGroupByName(testData.group.name);
        Groups.checkFYInGroup(testData.fiscalYear.code);
        GroupDetails.checkGroupDetails({
          expenseClasses: [
            {
              name: 'Unassigned',
              encumbered: '$0.00',
              awaitingPayment: '$0.00',
              expended: '$20.00',
              percentExpended: '66.67%',
            },
            {
              name: testData.expenseClass.name,
              encumbered: '$0.00',
              awaitingPayment: '$0.00',
              expended: '$10.00',
              percentExpended: '33.33%',
            },
          ],
        });
        FinanceDetails.checkUnassignedExpenseClassTooltip('expenseClasses');
      },
    );
  });
});
