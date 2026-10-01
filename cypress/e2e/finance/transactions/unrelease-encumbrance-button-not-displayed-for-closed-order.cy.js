import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ENCUMBRANCE_STATUSES,
  FUND_DISTRIBUTION_TYPES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  POL_CREATE_INVENTORY_SETTINGS,
  TRANSACTION_DETAIL_FIELDS,
  TRANSACTION_TYPES,
} from '../../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../../support/fragments/orders';
import { Budgets, Funds, TransactionDetails } from '../../../support/fragments/finance';
import getRandomPostfix from '../../../support/utils/stringTools';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    orderLine: {},
    user: {},
  };

  const createFinanceData = () => {
    const { fiscalYear, ledger, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi();
    testData.fiscalYear = fiscalYear;
    testData.ledger = ledger;
    testData.fund = fund;
    testData.budget = budget;
  };

  const createOrder = () => {
    Organizations.createOrganizationViaApi(testData.organization);

    testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

    return Orders.createOrderViaApi(testData.order).then((order) => {
      testData.order = order;
    });
  };

  const createOrderLine = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        const acquisitionMethod = body.acquisitionMethods[0].id;

        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          titleOrPackage: `autotest_title_${getRandomPostfix()}`,
          acquisitionMethod,
          purchaseOrderId: testData.order.id,
          title: testData.orderLineTitle,
          listUnitPrice: 10,
          fundDistribution: [
            {
              code: testData.fund.code,
              fundId: testData.fund.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 100,
            },
          ],
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          locations: [],
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE,
          },
        });

        return OrderLines.createOrderLineViaApi(testData.orderLine).then((orderLine) => {
          testData.orderLine = orderLine;

          return Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.OPEN,
          }).then(() => {
            return Orders.updateOrderViaApi({
              ...testData.order,
              workflowStatus: ORDER_STATUSES.CLOSED,
              closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
            });
          });
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createFinanceData();
      createOrder().then(() => createOrderLine());
    });

    cy.createTempUser([
      Permissions.uiOrdersView.gui,
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiFinanceUnreleaseEncumbrance.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budget);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C436937 Unrelease encumbrance button is not displayed for closed order encumbrance (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C436937'] },
    () => {
      // Step 1: Open the order
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.CLOSED);
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fund.name,
          expenseClass: '',
          value: '100%',
          amount: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          initialEncumbrance: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          currentEncumbrance: '$0.00',
        },
      ]);
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: TRANSACTION_DETAIL_FIELDS.FISCAL_YEAR, value: testData.fiscalYear.code },
          { key: TRANSACTION_DETAIL_FIELDS.AMOUNT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.SOURCE, value: `${testData.orderLine.poLineNumber}` },
          { key: TRANSACTION_DETAIL_FIELDS.TYPE, value: TRANSACTION_TYPES.ENCUMBRANCE },
          { key: TRANSACTION_DETAIL_FIELDS.FROM, value: testData.fund.name },
          {
            key: TRANSACTION_DETAIL_FIELDS.INITIAL_ENCUMBRANCE,
            value: `$${testData.orderLine.cost.poLineEstimatedPrice}.00`,
          },
          { key: TRANSACTION_DETAIL_FIELDS.AWAITING_PAYMENT, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.EXPENDED, value: '$0.00' },
          { key: TRANSACTION_DETAIL_FIELDS.STATUS, value: ENCUMBRANCE_STATUSES.RELEASED },
        ],
      });
      Funds.unreleaseEncumbranceButtonAbsent();
    },
  );
});
