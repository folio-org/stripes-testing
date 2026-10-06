import {
  APPLICATION_NAMES,
  ENCUMBRANCE_STATUSES,
  NO_VALUE,
  ORDER_STATUSES,
  ORDER_VIEW_FIELD_LABELS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import {
  Budgets,
  FiscalYears,
  Funds,
  Ledgers,
  TransactionDetails,
} from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  Orders,
} from '../../support/fragments/orders';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const testData = {};

  const checkZeroEncumbranceDetails = ({ poNumber, status }) => {
    TransactionDetails.checkTransactionDetails({
      information: [
        { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
        { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
        { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${poNumber}-1` },
        { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
        { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
        { key: TRANSACTION_DETAIL_FIELDS.TO, value: NO_VALUE },
        { key: TRANSACTION_DETAIL_FIELDS.EXPENSE_CLASS, value: NO_VALUE },
        { key: TRANSACTION_DETAIL_FIELDS.TAGS, value: NO_VALUE },
        { key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE, value: '$0.00' },
        { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
        { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
        { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: status },
        { key: TRANSACTION_DETAIL_FIELDS.DESCRIPTION, value: NO_VALUE },
      ],
    });
  };

  before('Create test data', () => {
    testData.organization = {
      ...NewOrganization.getDefaultOrganization(),
      name: `AT_C844196_Organization_${getRandomPostfix()}`,
    };
    testData.ledger = {
      ...Ledgers.getDefaultLedger(),
      name: `AT_C844196_Ledger_${getRandomPostfix()}`,
    };
    testData.fund = {
      ...Funds.getDefaultFund(),
      name: `AT_C844196_Fund_${getRandomPostfix()}`,
      ledgerId: testData.ledger.id,
    };
    testData.budget = {
      ...Budgets.getDefaultBudget(),
      fundId: testData.fund.id,
      allocated: 1000,
    };
    testData.orders = {
      first: NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      second: NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization);
    FiscalYears.getCurrentFiscalYearOrCreateViaApi().then((fiscalYear) => {
      testData.fiscalYear = fiscalYear;

      Ledgers.createViaApi({ ...testData.ledger, fiscalYearOneId: fiscalYear.id });
      Funds.createViaApi(testData.fund);
      Budgets.createViaApi({ ...testData.budget, fiscalYearId: fiscalYear.id });
    });
    Object.keys(testData.orders).forEach((key) => {
      const orderLine = BasicOrderLine.getDefaultOrderLine({
        title: `AT_C844196_OrderLine_${key}_${getRandomPostfix()}`,
        listUnitPrice: 0,
        fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
      });

      Orders.createOrderWithOrderLineViaApi(testData.orders[key], orderLine).then((order) => {
        testData.orders[key] = { ...order, orderLineTitle: orderLine.titleOrPackage };

        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
      });
    });
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.orders.first.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    Object.values(testData.orders).forEach((order) => {
      Orders.deleteOrderViaApi(order.id);
    });
    Budgets.deleteViaApi(testData.budget.id);
    Funds.deleteFundViaApi(testData.fund.id);
    Ledgers.deleteLedgerViaApi(testData.ledger.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
  });

  it(
    'C844196 Encumbrance is unreleased after unopening and opening an order with $0 amount (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C844196'] },
    () => {
      // Step 1: Click on the Order#1 number
      Orders.selectFromResultsList(testData.orders.first.poNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ESTIMATED_PRICE, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_ENCUMBERED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_EXPENDED, value: '$0.00' },
          { key: ORDER_VIEW_FIELD_LABELS.TOTAL_CREDITED, value: '$0.00' },
        ],
      });

      // Step 2: Unopen Order#1
      OrderDetails.unOpenOrder({
        orderNumber: testData.orders.first.poNumber,
        hasRelations: false,
        submit: true,
      });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.orders.first.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 3: Click on the PO line record, click on the "Current encumbrance" hyperlink
      OrderDetails.openPolDetails(testData.orders.first.orderLineTitle);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      checkZeroEncumbranceDetails({
        poNumber: testData.orders.first.poNumber,
        status: ENCUMBRANCE_STATUSES.PENDING,
      });

      // Step 4: Navigate back to Order#1 details pane and open the order
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.orders.first.poNumber);
      Orders.selectFromResultsList(testData.orders.first.poNumber);
      OrderDetails.openOrder({ orderNumber: testData.orders.first.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 5: Click on the PO line record, click on the "Current encumbrance" hyperlink
      OrderDetails.openPolDetails(testData.orders.first.orderLineTitle);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      checkZeroEncumbranceDetails({
        poNumber: testData.orders.first.poNumber,
        status: ENCUMBRANCE_STATUSES.UNRELEASED,
      });

      // Step 6: Navigate to Order#2 details pane and unopen the order
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.orders.second.poNumber);
      Orders.selectFromResultsList(testData.orders.second.poNumber);
      OrderDetails.unOpenOrder({
        orderNumber: testData.orders.second.poNumber,
        hasRelations: false,
        submit: true,
      });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.orders.second.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 7: Click on the PO line record, click on the "Current encumbrance" hyperlink
      OrderDetails.openPolDetails(testData.orders.second.orderLineTitle);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      checkZeroEncumbranceDetails({
        poNumber: testData.orders.second.poNumber,
        status: ENCUMBRANCE_STATUSES.PENDING,
      });

      // Step 8: Navigate back to Order#2 details pane and open the order
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.orders.second.poNumber);
      Orders.selectFromResultsList(testData.orders.second.poNumber);
      OrderDetails.openOrder({ orderNumber: testData.orders.second.poNumber });
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 9: Click on the PO line record, click on the "Current encumbrance" hyperlink
      OrderDetails.openPolDetails(testData.orders.second.orderLineTitle);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      checkZeroEncumbranceDetails({
        poNumber: testData.orders.second.poNumber,
        status: ENCUMBRANCE_STATUSES.UNRELEASED,
      });
    },
  );
});
