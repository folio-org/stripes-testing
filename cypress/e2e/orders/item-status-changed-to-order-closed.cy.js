import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import { NewOrder, Orders, BasicOrderLine, OrderLines } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { InventoryHoldings } from '../../support/fragments/inventory';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';
import { ORDER_STATUSES } from '../../support/constants';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Orders', () => {
  const orderLinesCount = 2;
  const testData = {
    servicePoint: ServicePoints.getDefaultServicePoint(),
    organization: NewOrganization.getDefaultOrganization(),
    order: {},
    orderLines: [],
    location: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      ledger: { restrictEncumbrance: true, restrictExpenditures: true },
      budget: { allocated: 100 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
    testData.budget = budget;

    ServicePoints.createViaApi(testData.servicePoint);

    testData.location = Locations.getDefaultLocation({
      servicePointId: testData.servicePoint.id,
    }).location;
    Locations.createViaApi(testData.location);

    Organizations.createOrganizationViaApi(testData.organization).then(() => {
      testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });

      OrderLinesLimit.setPOLLimitViaApi(orderLinesCount);
      Orders.createOrderViaApi(testData.order).then((order) => {
        testData.order = order;

        cy.getAcquisitionMethodsApi({ query: 'value="Other"' }).then(({ body }) => {
          const acquisitionMethod = body.acquisitionMethods[0].id;

          cy.getBookMaterialType().then((materialType) => {
            const materialTypeId = materialType.id;

            [...Array(orderLinesCount).keys()].forEach(() => {
              const orderLine = BasicOrderLine.getDefaultOrderLine({
                acquisitionMethod,
                purchaseOrderId: testData.order.id,
                createInventory: 'Instance, Holding, Item',
                checkinItems: false,
                specialLocationId: testData.location.id,
                specialMaterialTypeId: materialTypeId,
                listUnitPrice: 10,
                fundDistribution: [
                  { code: testData.fund.code, fundId: testData.fund.id, value: 100 },
                ],
              });

              testData.orderLines.push(orderLine);
              OrderLines.createOrderLineViaApi(orderLine);
            });
          });
        });

        Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
      });
    });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiOrdersCancelOrderLines.gui,
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
    OrderLinesLimit.setPOLLimitViaApi(1);
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
    Locations.deleteViaApi(testData.location);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C367963 Linked items status is updated to "Order closed" when cancelling one PO line in the order with multiple PO lines (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C367963'] },
    () => {
      // Click on the record with Order name from precondition
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click on PO line #1 on "Purchase order" pane
      const OrderLineDetails = OrderDetails.openPolDetails(testData.orderLines[0].titleOrPackage);

      // Click "Actions" button, Select "Cancel" option
      OrderLineDetails.cancelOrderLine({ orderLineNumber: `${testData.order.poNumber}-1` });
      OrderLineDetails.checkOrderLineDetails({
        purchaseOrderLineInformation: [
          { key: 'Payment status', value: 'Cancelled' },
          { key: 'Receipt status', value: 'Cancelled' },
        ],
      });

      // Click on the title link in "Item details" accordion
      const InventoryInstance = OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLines[0].titleOrPackage);

      // Expand "Holdings" accordion
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ status: 'Order closed' }],
      });

      // Go to "Orders" app, Open Order line #1
      cy.visit(TopMenu.orderLinesPath);
      Orders.searchByParameter('PO line number', testData.order.poNumber);
      cy.wait(5000);
      OrderLines.resetFilters();
      OrderLines.selectOrderLineByPolNumber(`${testData.order.poNumber}-1`);

      // Click "Current encumbrance" link for **"Fund"** in "Fund distribution" accordion.
      const TransactionDetails = OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Status', value: 'Released' },
        ],
      });

      // Go to "Orders" app
      cy.visit(TopMenu.ordersPath);

      // Click on the record with Order name from precondition
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Click on PO line #2 on "Purchase order" pane
      OrderDetails.openPolDetails(testData.orderLines[1].titleOrPackage);
      OrderLineDetails.checkOrderLineDetails({
        purchaseOrderLineInformation: [
          { key: 'Payment status', value: 'Awaiting Payment' },
          { key: 'Receipt status', value: 'Awaiting Receipt' },
        ],
      });

      // Click on the title link in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.checkInstanceTitle(testData.orderLines[1].titleOrPackage);

      // Expand "Holdings" accordion
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [{ status: 'On order' }],
      });

      // Go to "Orders" app, Open Order line #2
      cy.visit(TopMenu.orderLinesPath);
      OrderLines.selectOrderLineByPolNumber(`${testData.order.poNumber}-2`);

      // Click "Current encumbrance" link for **"Fund"** in "Fund distribution" accordion.
      OrderLineDetails.openEncumbrancePane(testData.fund.name);
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$10.00' },
          { key: 'Source', value: `${testData.order.poNumber}-2` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$10.00' },
          { key: 'Status', value: 'Unreleased' },
        ],
      });
    },
  );
});
