import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    orderLineTitles: {
      titleFirst: `autotest_title_first_${getRandomPostfix()}`,
      titleSecond: `autotest_title_second_${getRandomPostfix()}`,
    },
    order: {},
    orderLine1: {},
    orderLine2: {},
    user: {},
  };

  const createFinanceData = () => {
    const financeDataA = Budgets.createBudgetWithFundLedgerAndFYViaApi();
    testData.fundA = financeDataA.fund;
    testData.budgetA = financeDataA.budget;

    const financeDataB = Budgets.createBudgetWithFundLedgerAndFYViaApi();
    testData.fundB = financeDataB.fund;
    testData.budgetB = financeDataB.budget;
  };

  const createOrder = () => {
    Organizations.createOrganizationViaApi(testData.organization);

    testData.order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    };

    return Orders.createOrderViaApi(testData.order).then((order) => {
      testData.order = order;
    });
  };

  const createOrderLines = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        const acquisitionMethod = body.acquisitionMethods[0].id;

        testData.orderLine1 = BasicOrderLine.getDefaultOrderLine({
          acquisitionMethod,
          purchaseOrderId: testData.order.id,
          title: testData.orderLineTitles.titleFirst,
          listUnitPrice: 10,
          fundDistribution: [
            {
              code: testData.fundA.code,
              fundId: testData.fundA.id,
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

        testData.orderLine2 = BasicOrderLine.getDefaultOrderLine({
          acquisitionMethod,
          purchaseOrderId: testData.order.id,
          title: testData.orderLineTitles.titleSecond,
          listUnitPrice: 10,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          locations: [],
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.NONE,
          },
        });

        return OrderLines.createOrderLineViaApi(testData.orderLine1).then(() => OrderLines.createOrderLineViaApi(testData.orderLine2));
      });
  };

  const openOrderWithLines = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    }).then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine2.id).then((orderLine) => {
      testData.orderLine2 = orderLine;
    }));
  };

  const createOrderWithTwoLines = () => {
    OrderLinesLimit.setPOLLimitViaApi(2);

    return createOrder()
      .then(() => createOrderLines())
      .then(() => openOrderWithLines());
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createFinanceData();
      createOrderWithTwoLines();
    });

    cy.createTempUser([Permissions.uiOrdersEdit.gui, Permissions.uiOrdersCreate.gui]).then(
      (userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budgetA);
      Budgets.deleteBudgetWithFundLedgerAndFYViaApi(testData.budgetB);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C987712 Error message appears while editing an open order with two PO lines related to different fiscal years (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C987712'] },
    () => {
      // Step 1: Open the order
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Open PO line #2 details, fund distribution is blank
      OrderDetails.openPolDetails(testData.orderLine2.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([]);

      // Step 3: Open PO line #2 edit form
      OrderLineDetails.openOrderLineEditForm();

      // Step 4: Add fund distribution with Fund B (different fiscal year) and try to save
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown();
      OrderLineEditForm.selectFundFromOpenDropdown(testData.fundB.name, testData.fundB.code);
      OrderLines.saveOrderLine();
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.activeBudgetsInMultipleFiscalYearsError,
      );
      OrderLineEditForm.waitLoading();
      InteractorsTools.closeCalloutMessage();

      // Step 5: Replace Fund B with Fund A (same fiscal year as PO line #1) and save
      OrderLineEditForm.updateFundDistribution({ fund: testData.fundA.name });
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundA.name,
          value: '100%',
          amount: `$${testData.orderLine2.cost.poLineEstimatedPrice}`,
          initialEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}`,
          currentEncumbrance: `$${testData.orderLine2.cost.poLineEstimatedPrice}`,
        },
      ]);
    },
  );
});
