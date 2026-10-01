import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  EXPENSE_CLASS_STATUSES,
  FUND_DETAILS_FIELDS,
  FUND_DISTRIBUTION_TYPES,
  INVOICE_STATUSES,
  LEDGER_ROLLOVER_ORDER_TYPES,
  ORDER_STATUSES,
  ROLLOVER_ENCUMBRANCE_BASED_ON,
} from '../../../support/constants';
import { GROUP_VIEW_FIELDS } from '../../../support/constants/finance/group';
import { Permissions } from '../../../support/dictionary';
import {
  BudgetDetails,
  Budgets,
  FinanceHelper,
  FiscalYears,
  FundDetails,
  Funds,
  GroupDetails,
  Groups,
  LedgerRollovers,
  Ledgers,
} from '../../../support/fragments/finance';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { CodeTools, DateTools, NumberTools, StringTools } from '../../../support/utils';
import { ExpenseClasses } from '../../../support/fragments/settings/finance';
import FinanceDetails from '../../../support/fragments/finance/financeDetails';
import getRandomPostfix from '../../../support/utils/stringTools';
import { Invoices } from '../../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const UNASSIGNED_EXPENSE_CLASS = 'Unassigned';

// Accordion ids used by the "Unassigned" tooltip check on each page
const EXPENSE_CLASSES_SECTIONS = {
  FUND_DETAILS: 'currentExpenseClasses',
  BUDGET_DETAILS: 'expense-classes',
  GROUP_DETAILS: 'expenseClasses',
};

describe('Finance', () => {
  describe('Funds', () => {
    const randomPostfix = getRandomPostfix();
    const fiscalYearSeries = `${CodeTools(4)}${StringTools.randomTwoDigitNumber()}`;

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      expenseClasses: {
        first: {
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: `AT_C788733_EC1_${randomPostfix}`,
          code: `AT_C788733_EC1_${randomPostfix}`,
        },
        second: {
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: `AT_C788733_EC2_${randomPostfix}`,
          code: `AT_C788733_EC2_${randomPostfix}`,
        },
      },
      fiscalYears: {
        first: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `AT_C788733_FY1_${randomPostfix}`,
          code: `${fiscalYearSeries}01`,
          ...DateTools.getFullFiscalYearStartAndEnd(0),
        },
        second: {
          ...FiscalYears.getDefaultFiscalYear(),
          name: `AT_C788733_FY2_${randomPostfix}`,
          code: `${fiscalYearSeries}02`,
          ...DateTools.getFullFiscalYearStartAndEnd(1),
        },
      },
      ledgerA: {},
      fundA: {},
      budgetA: {},
      fundB: {},
      budgetB: {},
      group: {},
      acquisitionMethodId: null,
      order1: {},
      orderLine1: {},
      orderLine2: {},
      orderLine3: {},
      order2: {},
      order2Line: {},
      order3: {},
      order3Line: {},
      order4: {},
      order4Line: {},
      user: {},
      locale: 'en-US',
    };

    const fundDistribution = ({ fund, expenseClass, value }) => ({
      code: fund.code,
      fundId: fund.id,
      ...(expenseClass && { expenseClassId: expenseClass.id }),
      distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
      value,
    });

    const createExpenseClasses = () => {
      return ExpenseClasses.createExpenseClassViaApi(testData.expenseClasses.first).then(() => {
        return ExpenseClasses.createExpenseClassViaApi(testData.expenseClasses.second);
      });
    };

    const createFiscalYear = (fiscalYearKey) => {
      return FiscalYears.createViaApi(testData.fiscalYears[fiscalYearKey]).then((fiscalYear) => {
        testData.fiscalYears[fiscalYearKey] = fiscalYear;
      });
    };

    const createConsecutiveFiscalYears = () => {
      return createFiscalYear('first').then(() => createFiscalYear('second'));
    };

    const createLedgerA = () => {
      return Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        name: `AT_C788733_ledgerA_${randomPostfix}`,
        fiscalYearOneId: testData.fiscalYears.first.id,
      }).then((ledger) => {
        testData.ledgerA = ledger;
      });
    };

    const createFundAWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `AT_C788733_fundA_${randomPostfix}`,
        code: `AT_C788733_fundA_${randomPostfix}`,
        ledgerId: testData.ledgerA.id,
      }).then((fundResponse) => {
        testData.fundA = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.first.id,
          fundId: testData.fundA.id,
          allocated: 1000,
        }).then((budget) => {
          testData.budgetA = budget;
        });
      });
    };

    const createGroupWithFundA = () => {
      return Groups.createViaApi({
        ...Groups.getDefaultGroup(),
        name: `AT_C788733_group_${randomPostfix}`,
      })
        .then((group) => {
          testData.group = group;

          return Funds.getFundsViaApi({ query: `id=="${testData.fundA.id}"` });
        })
        .then(({ funds }) => {
          Funds.updateFundViaApi(funds[0], [testData.group.id]);
        });
    };

    const createOrganization = () => {
      return Organizations.createOrganizationViaApi(testData.organization).then((id) => {
        testData.organization.id = id;
      });
    };

    const getAcquisitionMethodId = () => {
      if (testData.acquisitionMethodId) return cy.wrap(testData.acquisitionMethodId);

      return cy
        .getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        })
        .then(({ body }) => {
          testData.acquisitionMethodId = body.acquisitionMethods[0].id;
          return testData.acquisitionMethodId;
        });
    };

    const createOpenOrderWithLines = (orderLines) => {
      const createdOrderLines = [];

      return getAcquisitionMethodId()
        .then(() => {
          return Orders.createOrderViaApi({
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            reEncumber: true,
          });
        })
        .then((order) => {
          orderLines.forEach(({ price, fundDistributions }) => {
            OrderLines.createOrderLineViaApi(
              BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod: testData.acquisitionMethodId,
                purchaseOrderId: order.id,
                listUnitPrice: price,
                poLineEstimatedPrice: price,
                fundDistribution: fundDistributions,
              }),
            ).then((orderLine) => {
              createdOrderLines.push(orderLine);
            });
          });

          return cy
            .then(() => Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN }))
            .then(() => ({ order, orderLines: createdOrderLines }));
        });
    };

    const createInvoiceForOrderLine = (orderLine, status) => {
      // The fund distribution gets its encumbrance when the order is opened and a new one after the rollover
      return OrderLines.getOrderLineByIdViaApi(orderLine.id)
        .then((actualOrderLine) => {
          return Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            accountingCode: testData.organization.erpCode,
            poLineId: actualOrderLine.id,
            fundDistributions: actualOrderLine.fundDistribution,
            invoiceStatus: INVOICE_STATUSES.OPEN,
            subTotal: actualOrderLine.cost.poLineEstimatedPrice,
            releaseEncumbrance: true,
            exportToAccounting: false,
          });
        })
        .then((invoice) => Invoices.changeInvoiceStatusViaApi({ invoice, status }));
    };

    const createOrder1WithThreeLines = () => {
      const orderLine = {
        price: 10,
        fundDistributions: [fundDistribution({ fund: testData.fundA, value: 100 })],
      };

      return createOpenOrderWithLines([orderLine, orderLine, orderLine]).then(
        ({ order, orderLines }) => {
          testData.order1 = order;
          [testData.orderLine1, testData.orderLine2, testData.orderLine3] = orderLines;
        },
      );
    };

    const createAndPayInvoice1 = () => {
      return createInvoiceForOrderLine(testData.orderLine1, INVOICE_STATUSES.PAID);
    };

    const createAndApproveInvoice2 = () => {
      return createInvoiceForOrderLine(testData.orderLine2, INVOICE_STATUSES.APPROVED);
    };

    const assignExpenseClassesToBudgetA = () => {
      return Budgets.getBudgetByIdViaApi(testData.budgetA.id).then((budget) => {
        return Budgets.updateBudgetViaApi({
          ...budget,
          statusExpenseClasses: [
            {
              status: EXPENSE_CLASS_STATUSES.ACTIVE,
              expenseClassId: testData.expenseClasses.first.id,
            },
            {
              status: EXPENSE_CLASS_STATUSES.ACTIVE,
              expenseClassId: testData.expenseClasses.second.id,
            },
          ],
        });
      });
    };

    const createOrder2WithFirstExpenseClass = () => {
      return createOpenOrderWithLines([
        {
          price: 20,
          fundDistributions: [
            fundDistribution({
              fund: testData.fundA,
              expenseClass: testData.expenseClasses.first,
              value: 100,
            }),
          ],
        },
      ]).then(({ order, orderLines }) => {
        testData.order2 = order;
        [testData.order2Line] = orderLines;
      });
    };

    const createAndPayInvoice3 = () => {
      return createInvoiceForOrderLine(testData.order2Line, INVOICE_STATUSES.PAID);
    };

    const createOrder3WithBothExpenseClasses = () => {
      return createOpenOrderWithLines([
        {
          price: 30,
          fundDistributions: [
            fundDistribution({
              fund: testData.fundA,
              expenseClass: testData.expenseClasses.first,
              value: 50,
            }),
            fundDistribution({
              fund: testData.fundA,
              expenseClass: testData.expenseClasses.second,
              value: 50,
            }),
          ],
        },
      ]).then(({ order, orderLines }) => {
        testData.order3 = order;
        [testData.order3Line] = orderLines;
      });
    };

    const createAndPayInvoice4 = () => {
      return createInvoiceForOrderLine(testData.order3Line, INVOICE_STATUSES.PAID);
    };

    const rolloverLedgerAToSecondFiscalYear = () => {
      return LedgerRollovers.createLedgerRolloverViaApi(
        LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledgerA,
          fromFiscalYear: testData.fiscalYears.first,
          toFiscalYear: testData.fiscalYears.second,
          encumbrancesRollover: [
            {
              orderType: LEDGER_ROLLOVER_ORDER_TYPES.ONE_TIME,
              basedOn: ROLLOVER_ENCUMBRANCE_BASED_ON.INITIAL_AMOUNT,
            },
          ],
        }),
      );
    };

    const updateFiscalYearDates = (fiscalYearKey, offset) => {
      const updatedFY = {
        ...testData.fiscalYears[fiscalYearKey],
        ...DateTools.getFullFiscalYearStartAndEnd(offset),
      };

      return FiscalYears.updateFiscalYearViaApi(updatedFY).then(() => {
        testData.fiscalYears[fiscalYearKey] = { ...updatedFY, _version: updatedFY._version + 1 };
      });
    };

    const shiftFiscalYearDatesAfterRollover = () => {
      return updateFiscalYearDates('first', -1).then(() => updateFiscalYearDates('second', 0));
    };

    const createAndPayInvoice5 = () => {
      return createInvoiceForOrderLine(testData.orderLine3, INVOICE_STATUSES.PAID);
    };

    const createFundBWithBudget = () => {
      return Funds.createViaApi({
        ...Funds.getDefaultFund(),
        name: `AT_C788733_fundB_${randomPostfix}`,
        code: `AT_C788733_fundB_${randomPostfix}`,
        ledgerId: testData.ledgerA.id,
      }).then((fundResponse) => {
        testData.fundB = fundResponse.fund;

        return Budgets.createViaApi({
          ...Budgets.getDefaultBudget(),
          fiscalYearId: testData.fiscalYears.second.id,
          fundId: testData.fundB.id,
          allocated: 1000,
        }).then((budget) => {
          testData.budgetB = budget;
        });
      });
    };

    const createOrder4WithFundsAAndB = () => {
      return createOpenOrderWithLines([
        {
          price: 40,
          fundDistributions: [
            fundDistribution({
              fund: testData.fundA,
              expenseClass: testData.expenseClasses.second,
              value: 50,
            }),
            fundDistribution({ fund: testData.fundB, value: 50 }),
          ],
        },
      ]).then(({ order, orderLines }) => {
        testData.order4 = order;
        [testData.order4Line] = orderLines;
      });
    };

    const createAndPayInvoice6 = () => {
      return createInvoiceForOrderLine(testData.order4Line, INVOICE_STATUSES.PAID);
    };

    const createUserAndLogin = () => {
      return cy
        .createTempUser([
          Permissions.uiFinanceViewEditFundAndBudget.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewGroups.gui,
        ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
          });
        });
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getTenantLocaleApi().then((locale) => {
        testData.locale = locale;
      });

      createExpenseClasses()
        .then(createConsecutiveFiscalYears)
        .then(createLedgerA)
        .then(createFundAWithBudget)
        .then(createGroupWithFundA)
        .then(createOrganization)
        .then(createOrder1WithThreeLines)
        .then(createAndPayInvoice1)
        .then(createAndApproveInvoice2)
        .then(assignExpenseClassesToBudgetA)
        .then(createOrder2WithFirstExpenseClass)
        .then(createAndPayInvoice3)
        .then(createOrder3WithBothExpenseClasses)
        .then(createAndPayInvoice4)
        .then(rolloverLedgerAToSecondFiscalYear)
        .then(shiftFiscalYearDatesAfterRollover)
        .then(createAndPayInvoice5)
        .then(createFundBWithBudget)
        .then(createOrder4WithFundsAAndB)
        .then(createAndPayInvoice6)
        .then(createUserAndLogin);
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
      });
    });

    it(
      'C788733 Totals for transactions without an expense class are included and displayed correctly in the expense class summary (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C788733', 'nonParallel'] },
      () => {
        const { first: firstExpenseClass, second: secondExpenseClass } = testData.expenseClasses;
        const format = (value) => NumberTools.formatCurrency(value, testData.locale);

        const fundACurrentTotals = [
          {
            name: UNASSIGNED_EXPENSE_CLASS,
            encumbered: format(20),
            awaitingPayment: format(0),
            expended: format(10),
            percentExpended: '33.33%',
            status: '-',
          },
          {
            name: firstExpenseClass.name,
            encumbered: format(35),
            awaitingPayment: format(0),
            expended: format(0),
            percentExpended: '0%',
            status: EXPENSE_CLASS_STATUSES.ACTIVE,
          },
          {
            name: secondExpenseClass.name,
            encumbered: format(15),
            awaitingPayment: format(0),
            expended: format(20),
            percentExpended: '66.67%',
            status: EXPENSE_CLASS_STATUSES.ACTIVE,
          },
        ];

        const fundAPreviousTotals = [
          {
            name: UNASSIGNED_EXPENSE_CLASS,
            encumbered: format(10),
            awaitingPayment: format(10),
            expended: format(10),
            percentExpended: '16.67%',
            status: '-',
          },
          {
            name: firstExpenseClass.name,
            encumbered: format(0),
            awaitingPayment: format(0),
            expended: format(35),
            percentExpended: '58.33%',
            status: EXPENSE_CLASS_STATUSES.ACTIVE,
          },
          {
            name: secondExpenseClass.name,
            encumbered: format(0),
            awaitingPayment: format(0),
            expended: format(15),
            percentExpended: '25%',
            status: EXPENSE_CLASS_STATUSES.ACTIVE,
          },
        ];

        const fundBTotals = [
          {
            name: UNASSIGNED_EXPENSE_CLASS,
            encumbered: format(0),
            awaitingPayment: format(0),
            expended: format(20),
            percentExpended: '100%',
          },
        ];

        const fundBTotalsWithExpenseClass = [
          ...fundBTotals,
          {
            name: firstExpenseClass.name,
            encumbered: format(0),
            awaitingPayment: format(0),
            expended: format(0),
            percentExpended: '0%',
            status: EXPENSE_CLASS_STATUSES.ACTIVE,
          },
        ];

        const groupCurrentTotalsWithBothFunds = [
          {
            name: UNASSIGNED_EXPENSE_CLASS,
            encumbered: format(20),
            awaitingPayment: format(0),
            expended: format(30),
            percentExpended: '60%',
          },
          {
            name: firstExpenseClass.name,
            encumbered: format(35),
            awaitingPayment: format(0),
            expended: format(0),
            percentExpended: '0%',
          },
          {
            name: secondExpenseClass.name,
            encumbered: format(15),
            awaitingPayment: format(0),
            expended: format(20),
            percentExpended: '40%',
          },
        ];

        const groupCurrentTotals = [
          {
            name: UNASSIGNED_EXPENSE_CLASS,
            encumbered: format(20),
            awaitingPayment: format(0),
            expended: format(10),
            percentExpended: '33.33%',
          },
          {
            name: firstExpenseClass.name,
            encumbered: format(35),
            awaitingPayment: format(0),
            expended: format(0),
            percentExpended: '0%',
          },
          {
            name: secondExpenseClass.name,
            encumbered: format(15),
            awaitingPayment: format(0),
            expended: format(20),
            percentExpended: '66.67%',
          },
        ];

        const groupPreviousTotals = [
          {
            name: UNASSIGNED_EXPENSE_CLASS,
            encumbered: format(10),
            awaitingPayment: format(10),
            expended: format(10),
            percentExpended: '16.67%',
          },
          {
            name: firstExpenseClass.name,
            encumbered: format(0),
            awaitingPayment: format(0),
            expended: format(35),
            percentExpended: '58.33%',
          },
          {
            name: secondExpenseClass.name,
            encumbered: format(0),
            awaitingPayment: format(0),
            expended: format(15),
            percentExpended: '25%',
          },
        ];

        // Step 1: Open Fund A details pane
        Funds.searchByName(testData.fundA.name);
        Funds.selectFund(testData.fundA.name);
        FundDetails.waitLoading();
        FundDetails.checkFundDetails({ currentExpenseClasses: fundACurrentTotals });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.FUND_DETAILS);

        // Step 2: Open current budget of Fund A
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({ expenseClasses: fundACurrentTotals });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.BUDGET_DETAILS);

        // Step 3: Open previous budget of Fund A
        BudgetDetails.closeBudgetDetails();
        FundDetails.openPreviousBudgetDetails();
        BudgetDetails.checkBudgetDetails({ expenseClasses: fundAPreviousTotals });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.BUDGET_DETAILS);
        BudgetDetails.closeBudgetDetails();

        // Step 4: Open group details for the current fiscal year
        FinanceHelper.selectGroupsNavigation();
        Groups.waitLoading();
        Groups.searchByName(testData.group.name);
        Groups.selectGroupByName(testData.group.name);
        GroupDetails.checkGroupDetails({
          information: [
            { key: GROUP_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          ],
          expenseClasses: groupCurrentTotals,
        });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.GROUP_DETAILS);

        // Step 5: Switch group details to the previous fiscal year
        GroupDetails.selectFiscalYear(testData.fiscalYears.first.code);
        GroupDetails.checkGroupDetails({
          information: [
            { key: GROUP_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          ],
          expenseClasses: groupPreviousTotals,
        });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.GROUP_DETAILS);

        // Step 6: Open Fund B details pane
        FinanceHelper.selectFundsNavigation();
        Funds.waitLoading();
        Funds.searchByName(testData.fundB.name);
        Funds.selectFund(testData.fundB.name);
        FundDetails.waitLoading();
        FundDetails.checkFundDetails({ currentExpenseClasses: fundBTotals });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.FUND_DETAILS);

        // Step 7: Open current budget of Fund B
        FundDetails.openCurrentBudgetDetails();
        BudgetDetails.checkBudgetDetails({ expenseClasses: fundBTotals });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.BUDGET_DETAILS);

        // Step 8: Add the first expense class to the current budget of Fund B
        Funds.editBudget();
        Funds.addExpensesClass(firstExpenseClass.name);
        BudgetDetails.checkBudgetDetails({ expenseClasses: fundBTotalsWithExpenseClass });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.BUDGET_DETAILS);

        // Step 9: Close budget details page
        BudgetDetails.closeBudgetDetails();
        FundDetails.waitLoading();
        FundDetails.checkFundDetails({ currentExpenseClasses: fundBTotalsWithExpenseClass });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.FUND_DETAILS);

        // Steps 10-11: Add Fund B to the group
        Funds.addGroupToFund(testData.group.name);
        Funds.verifyFundIsSaved();
        FundDetails.checkFundDetails({
          information: [{ key: FUND_DETAILS_FIELDS.GROUP, value: testData.group.name }],
        });

        // Step 12: Open group details for the current fiscal year
        FinanceHelper.selectGroupsNavigation();
        Groups.waitLoading();
        Groups.searchByName(testData.group.name);
        Groups.selectGroupByName(testData.group.name);
        GroupDetails.checkGroupDetails({
          information: [
            { key: GROUP_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.second.code },
          ],
          expenseClasses: groupCurrentTotalsWithBothFunds,
        });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.GROUP_DETAILS);

        // Step 13: Switch group details to the previous fiscal year
        GroupDetails.selectFiscalYear(testData.fiscalYears.first.code);
        GroupDetails.checkGroupDetails({
          information: [
            { key: GROUP_VIEW_FIELDS.FISCAL_YEAR, value: testData.fiscalYears.first.code },
          ],
          expenseClasses: groupPreviousTotals,
        });
        FinanceDetails.checkUnassignedExpenseClassTooltip(EXPENSE_CLASSES_SECTIONS.GROUP_DETAILS);
      },
    );
  });
});
