import uuid from 'uuid';

import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
import {
  BasicOrderLine,
  NewOrder,
  Orders,
  OrderLines,
  CheckIn,
  Pieces,
} from '../../support/fragments/orders';
import { Locations, ServicePoints } from '../../support/fragments/settings/tenant';
import { Invoices } from '../../support/fragments/invoices';
import { InventoryHoldings, InventoryInstances } from '../../support/fragments/inventory';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ORDER_STATUSES, INVOICE_STATUSES } from '../../support/constants';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import Receiving from '../../support/fragments/receiving/receiving';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: ServicePoints.getDefaultServicePoint(),
    materialType: MaterialTypes.getDefaultMaterialType(),
    order: {},
    orderLine: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    ServicePoints.createViaApi(testData.servicePoint).then(() => {
      testData.location = Locations.getDefaultLocation({
        servicePointId: testData.servicePoint.id,
      }).location;

      Locations.createViaApi(testData.location);
    });

    Organizations.createOrganizationViaApi(testData.organization);
    MaterialTypes.createMaterialTypeViaApi(testData.materialType);

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditDelete.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  beforeEach('Create test order', () => {
    const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
      budget: { allocated: 100 },
    });

    testData.fiscalYear = fiscalYear;
    testData.fund = fund;
    testData.budget = budget;

    testData.order = {
      ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      reEncumber: true,
    };
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      checkinItems: false,
      createInventory: 'Instance, Holding, Item',
      specialLocationId: testData.location.id,
      specialMaterialTypeId: testData.materialType.id,
      listUnitPrice: 90,
      fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
    });

    Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
      testData.order = order;

      Orders.updateOrderViaApi({ ...testData.order, workflowStatus: ORDER_STATUSES.OPEN });

      Pieces.getOrderPiecesViaApi({ query: `poLineId=="${testData.orderLine.id}"` }).then(
        ({ pieces }) => {
          testData.barcode = uuid();

          const checkInConfig = CheckIn.getDefaultCheckInConfig({
            poLineId: pieces[0].poLineId,
            orderPieceId: pieces[0].id,
            holdingId: pieces[0].holdingId,
            barcode: testData.barcode,
          });
          CheckIn.createOrderCheckInViaApi(checkInConfig);
        },
      );

      OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` })
        .then((orderLines) => {
          testData.orderLine = orderLines[0];

          Invoices.createInvoiceWithInvoiceLineViaApi({
            vendorId: testData.organization.id,
            fiscalYearId: testData.fiscalYear.id,
            poLineId: testData.orderLine.id,
            fundDistributions: testData.orderLine.fundDistribution,
            accountingCode: testData.organization.erpCode,
            subTotal: 25,
            releaseEncumbrance: true,
          }).then((invoice) => {
            testData.invoice = invoice;

            Invoices.changeInvoiceStatusViaApi({
              invoice: testData.invoice,
              status: INVOICE_STATUSES.APPROVED,
            });
          });
        })
        .then(() => {
          Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.CLOSED,
          });
        });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    cy.wait(6000);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
    InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
    Locations.deleteViaApi(testData.location);
    MaterialTypes.deleteViaApi(testData.materialType.id);
    ServicePoints.deleteViaApi(testData.servicePoint.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C375986 Encumbered amount is not changed after deleting received piece when related paid invoice exists and order is closed (thunderjet) (TaaS)',
    { tags: ['extendedPathBroken', 'thunderjet', 'C375986'] },
    () => {
      cy.getAdminToken().then(() => {
        Invoices.changeInvoiceStatusViaApi({
          invoice: testData.invoice,
          status: INVOICE_STATUSES.PAID,
        });
      });

      // Click on the Order
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: 'Workflow status', value: ORDER_STATUSES.CLOSED },
          { key: 'Total encumbered', value: '$0.00' },
        ],
      });

      // Click "Actions" button, Select "Receive" option
      const Receivings = OrderDetails.openReceivingsPage();

      // Click <Title name from PO line> link
      const ReceivingDetails = Receivings.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
        expected: [],
        received: [{ barcode: testData.barcode, format: 'Physical' }],
      });

      // Click on the record in "Received" accordion on "<Title name>" pane
      const EditPieceModal = ReceivingDetails.openEditPieceModal({ section: 'Received' });
      EditPieceModal.checkFieldsConditions([
        { label: 'Piece format', conditions: { required: true, value: 'Physical' } },
        { label: 'Create item', conditions: { value: 'Connected' } },
      ]);

      // Click "Delete" button
      Receiving.openDropDownInEditPieceModal();
      const DeletePieceModal = EditPieceModal.clickDeleteButton();

      // Click "Delete item" button
      DeletePieceModal.clickDeleteItemButton();
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
        expected: [],
        received: [],
      });

      // Click "POL number" link in "POL details" accordion
      const OrderLineDetails = ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkFundDistibutionTableContent([
        { name: testData.fund.name, currentEncumbrance: '$0.00' },
      ]);

      // Click "Current encumbrance" link in "Fund distribution" accordion
      const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      TransactionDetails.checkTransactionDetails({
        information: [
          { key: 'Fiscal year', value: testData.fiscalYear.code },
          { key: 'Amount', value: '$0.00' },
          { key: 'Source', value: `${testData.order.poNumber}-1` },
          { key: 'Type', value: 'Encumbrance' },
          { key: 'From', value: testData.fund.name },
          { key: 'Initial encumbrance', value: '$0.00' },
          { key: 'Awaiting payment', value: '$0.00' },
          { key: 'Expended', value: '$25.00' },
          { key: 'Status', value: 'Released' },
        ],
      });
    },
  );
});
