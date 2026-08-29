import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  FUND_DISTRIBUTION_TYPES,
  ORDER_FORMAT_NAMES,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { Budgets } from '../../support/fragments/finance';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { Permissions } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    orderLineTitle: `autotest_title_${getRandomPostfix()}`,
    order: {},
    orderLine: {},
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

  const createOrderLine = () => {
    return cy
      .getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      })
      .then(({ body }) => {
        const acquisitionMethod = body.acquisitionMethods[0].id;

        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          acquisitionMethod,
          purchaseOrderId: testData.order.id,
          title: testData.orderLineTitle,
          listUnitPrice: 10,
          fundDistribution: [
            {
              code: testData.fundA.code,
              fundId: testData.fundA.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 50,
            },
            {
              code: testData.fundB.code,
              fundId: testData.fundB.id,
              distributionType: FUND_DISTRIBUTION_TYPES.PERCENTAGE,
              value: 50,
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
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      createFinanceData();
      createOrder().then(() => createOrderLine());
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
    'C987711 Error message appears while opening and editing an order with one PO line related to different fiscal years (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C987711'] },
    () => {
      // Step 1: Open the order
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.waitLoading();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 2: Try to open the order with Fund A and Fund B related to different fiscal years
      Orders.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.activeBudgetsInMultipleFiscalYearsError,
      );
      InteractorsTools.closeCalloutMessage();

      // Step 3: Open PO line details, current encumbrance is blank
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, value: '50%', currentEncumbrance: '-' },
        { name: testData.fundB.name, value: '50%', currentEncumbrance: '-' },
      ]);

      // Step 4: Open PO line edit form
      OrderLineDetails.openOrderLineEditForm();

      // Step 5: Remove Fund B, change Fund A distribution to 100% and save
      OrderLineEditForm.deleteFundDistribution({ index: 1 });
      OrderLineEditForm.setFundDistributionValue(100, 0);
      OrderLineEditForm.clickSaveButton();
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fundA.name, value: '100%', currentEncumbrance: '-' },
      ]);

      // Step 6: Open the order now that only Fund A (single fiscal year) is distributed
      OrderLineDetails.backToOrderDetails();
      OrderDetails.openOrder();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 7: Open PO line details, current encumbrance contains a hyperlink with POL total amount
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      OrderLineDetails.checkFundDistibutionTableContent([
        {
          name: testData.fundA.name,
          value: '100%',
          amount: `$${testData.orderLine.cost.poLineEstimatedPrice}`,
          initialEncumbrance: `$${testData.orderLine.cost.poLineEstimatedPrice}`,
          currentEncumbrance: `$${testData.orderLine.cost.poLineEstimatedPrice}`,
        },
      ]);

      // Step 8: Open PO line edit form
      OrderLineDetails.openOrderLineEditForm();

      // Step 9: Add Fund B back (different fiscal year) and try to save
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(1);
      OrderLineEditForm.selectFundFromOpenDropdown(testData.fundB.name, testData.fundB.code);
      OrderLineEditForm.setFundDistributionValue(50, 0);
      OrderLineEditForm.setFundDistributionValue(50, 1);
      OrderLines.saveOrderLine();
      InteractorsTools.checkCalloutErrorMessage(
        OrderStates.activeBudgetsInMultipleFiscalYearsError,
      );
      OrderLineEditForm.waitLoading();
    },
  );
});
