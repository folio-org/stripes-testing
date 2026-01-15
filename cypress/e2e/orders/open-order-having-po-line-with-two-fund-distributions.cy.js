import { ORDER_STATUSES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
} from '../../support/fragments/finance';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { CodeTools, DateTools, StringTools } from '../../support/utils';

describe('Orders', () => {
  const date = new Date();
  const code = CodeTools(4);
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: { ...NewOrder.getDefaultOrder({ vendorId: organization.id }), reEncumber: true },
    fiscalYears: [
      {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomFourDigitNumber()}`,
        periodStart: DateTools.getCurrentDateForFiscalYear(),
        periodEnd: DateTools.getDayAfterTomorrowDateForFiscalYear(),
      },
      {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomFourDigitNumber()}`,
        periodStart: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(3),
        periodEnd: DateTools.getSomeDaysAfterTomorrowDateForFiscalYear(5),
      },
    ],
    ledgers: [],
    funds: [],
    budgets: [],
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken()
      .then(() => {
        testData.fiscalYears.forEach((fiscalYear) => {
          const ledger = {
            ...Ledgers.getDefaultLedger(),
            fiscalYearOneId: testData.fiscalYears[0].id,
            restrictEncumbrance: true,
            restrictExpenditures: true,
          };
          const fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
          const budget = {
            ...Budgets.getDefaultBudget(),
            fiscalYearId: fiscalYear.id,
            fundId: fund.id,
            allocated: 100,
          };

          testData.ledgers.push(ledger);
          testData.funds.push(fund);
          testData.budgets.push(budget);

          FiscalYears.createViaApi(fiscalYear);
          Ledgers.createViaApi(ledger);
          Funds.createViaApi(fund);
          Budgets.createViaApi(budget);
        });

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            listUnitPrice: 50,
            fundDistribution: [
              {
                code: testData.funds[0].code,
                fundId: testData.funds[0].id,
                value: 30,
                distributionType: 'amount',
              },
              {
                code: testData.funds[1].code,
                fundId: testData.funds[1].id,
                value: 20,
                distributionType: 'amount',
              },
            ],
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;
            },
          );
        });
      })
      .then(() => {
        testData.rollover = LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledgers[0],
          fromFiscalYear: testData.fiscalYears[0],
          toFiscalYear: testData.fiscalYears[1],
          encumbrancesRollover: [],
        });
        LedgerRollovers.createLedgerRolloverViaApi(testData.rollover);
      })
      .then(() => {
        FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears[0],
          _version: 1,
          periodStart: new Date(date.getFullYear() - 1, 0, 1),
          periodEnd: new Date(date.getFullYear() - 1, 11, 31),
        });

        FiscalYears.updateFiscalYearViaApi({
          ...testData.fiscalYears[1],
          _version: 1,
          periodStart: DateTools.getCurrentDateForFiscalYear(),
          periodEnd: DateTools.getDayAfterTomorrowDateForFiscalYear(),
        });
      });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersApprovePurchaseOrders.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Orders.deleteOrderViaApi(testData.order.id);
    testData.budgets.forEach((budget) => Budgets.deleteViaApi(budget.id));
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C407711 Open order having PO line with two fund distributions related to different ledgers and same fiscal year after executing rollover (thunderjet) (TaaS)',
    { tags: ['criticalPath', 'thunderjet', 'C407711'] },
    () => {
      // Click on "PO number" link on "Orders" pane
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Click on PO line on "Purchase order" pane
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds[0].name,
          currentEncumbrance: '-',
        },
        {
          name: testData.funds[1].name,
          currentEncumbrance: '-',
        },
      ]);

      // Click "Back to PO" arrow, Click "Actions" button, Select "Open" option
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click order line record in "PO line" accordion
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.funds[0].name,
          currentEncumbrance: '30.00',
        },
        {
          name: testData.funds[1].name,
          currentEncumbrance: '20.00',
        },
      ]);

      // Click the link in "Current encumbrance" column for "Fund A"
      const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears[1].code },
          { key: 'Amount', value: '$30.00' },
          { key: 'Source', value: testData.order.poNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.funds[0].name },
          { key: 'Initial encumbrance', value: '$30.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });

      // Go back to "PO Line details - <number>" pane
      cy.visit(TopMenu.ordersPath);
      Orders.selectOrderByPONumber(testData.order.poNumber);
      cy.reload();
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);

      // Click the link in "Current encumbrance" column for "Fund B"
      OrderLineDetails.openEncumbrancePane(testData.funds[1].name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYears[1].code },
          { key: 'Amount', value: '$20.00' },
          { key: 'Source', value: testData.order.poNumber },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.funds[1].name },
          { key: 'Initial encumbrance', value: '$20.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
