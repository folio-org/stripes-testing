import uuid from 'uuid';

import { INVOICE_STATUSES, ORDER_STATUSES, LOCATION_NAMES } from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { Budgets } from '../../support/fragments/finance';
// import { InventoryHoldings, InventoryInstances } from '../../support/fragments/inventory';
import { Invoices } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
  CheckIn,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import { ServicePoints } from '../../support/fragments/settings/tenant';
import TopMenu from '../../support/fragments/topMenu';
// import Users from '../../support/fragments/users/users';
import orderLineDetails from '../../support/fragments/orders/orderLines';
import receivingDetails from '../../support/fragments/receiving/receivingDetails';
import editPieceModal from '../../support/fragments/receiving/modals/editPieceModal';

describe('Orders', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: ServicePoints.getDefaultServicePoint(),
    materialType: MaterialTypes.getDefaultMaterialType(),
    POLineQuantity: 1,
    order: {},
    orderLine: {},
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken();
    // ServicePoints.createViaApi(testData.servicePoint).then(() => {
    //   testData.location = Locations.getDefaultLocation({
    //     servicePointId: testData.servicePoint.id,
    //   }).location;

    //   Locations.createViaApi(testData.location);
    // });
    cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
      testData.location = res;
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
      orderType: 'Ongoing',
      ongoing: { isSubscription: false, manualRenewal: false },
    };
    testData.orderLine = BasicOrderLine.getDefaultOrderLine({
      checkinItems: true,
      specialLocationId: testData.location.id,
      specialMaterialTypeId: testData.materialType.id,
      listUnitPrice: 90,
      fundDistribution: [{ code: testData.fund.code, fundId: testData.fund.id, value: 100 }],
      createInventory: 'Instance, Holding, Item',
    });

    Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
      testData.order = order;

      Orders.updateOrderViaApi({ ...testData.order, workflowStatus: ORDER_STATUSES.OPEN });

      OrderLines.getOrderLineViaApi({ query: `poLineNumber=="*${order.poNumber}*"` })
        .then((orderLines) => {
          testData.orderLine = orderLines[0];
          console.log(orderLines[0]);
          cy.pause();
          cy.getHoldings({
            limit: 1,
            query: `"instanceId"="${testData.orderLine.instanceId}"`,
          }).then((holdings) => {
            // create and receive the first piece
            Receiving.getTitleIdViaApi(testData.orderLine.poLineNumber).then((titleId) => {
              Pieces.createOrderPieceViaApi({
                poLineId: testData.orderLine.id,
                titleId,
                format: 'Physical',
                holdingId: holdings[0].id,
                displayOnHolding: true,
                discoverySuppress: false,
                displayToPublic: false,
                isBound: false,
                supplement: false,
              }).then((responce) => {
                testData.firstPieceBarcode = uuid();

                const checkInConfig = CheckIn.getDefaultCheckInConfig({
                  poLineId: responce.poLineId,
                  orderPieceId: responce.id,
                  holdingId: responce.holdingId,
                  barcode: testData.firstPieceBarcode,
                });
                CheckIn.createOrderCheckInViaApi(checkInConfig);
              });
            });
            //   // create and receive the second piece
            //   Receiving.getTitleIdViaApi(testData.orderLine.poLineNumber).then((titleId) => {
            //     Pieces.createOrderPieceViaApi({
            //       poLineId: testData.orderLine.id,
            //       titleId,
            //       format: 'Physical',
            //       holdingId: holdings[0].id,
            //       displayOnHolding: true,
            //       discoverySuppress: false,
            //       displayToPublic: false,
            //       isBound: false,
            //       supplement: false,
            //     }).then((responce) => {
            //       testData.secondPieceBarcode = uuid();

            //       const checkInConfig = CheckIn.getDefaultCheckInConfig({
            //         poLineId: responce.poLineId,
            //         orderPieceId: responce.id,
            //         holdingId: responce.holdingId,
            //         barcode: testData.secondPieceBarcode,
            //       });
            //       CheckIn.createOrderCheckInViaApi(checkInConfig);
            //     });
            //   });
          });

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
            Invoices.changeInvoiceStatusViaApi({
              invoice: testData.invoice,
              status: INVOICE_STATUSES.PAID,
            });
          });
        })
        .then(() => {
          Orders.updateOrderViaApi({
            ...testData.order,
            workflowStatus: ORDER_STATUSES.CLOSED,
          });
        });
      // cy.getAdminToken().then(() => {
      //   Invoices.changeInvoiceStatusViaApi({
      //     invoice: testData.invoice,
      //     status: INVOICE_STATUSES.PAID,
      //   });
      // });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  // after('Delete test data', () => {
  //   cy.getAdminToken();
  //   cy.wait(6000);
  //   Organizations.deleteOrganizationViaApi(testData.organization.id);
  //   InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.firstPieceBarcode);
  //   InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
  //   Locations.deleteViaApi(testData.location);
  //   MaterialTypes.deleteViaApi(testData.materialType.id);
  //   ServicePoints.deleteViaApi(testData.servicePoint.id);
  //   Users.deleteViaApi(testData.user.userId);
  // });

  it(
    'C375986 Encumbered amount is not changed after deleting received piece when related paid invoice exists and order is closed (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'eurekaPhase1'] },
    () => {
      // Click PO number link from Preconditions item #1
      const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.checkOrderDetails({
        summary: [
          { key: 'Workflow status', value: ORDER_STATUSES.CLOSED },
          { key: 'Total encumbered', value: '$0.00' },
        ],
      });
      cy.pause();
      // Go to PO line details pane. Click "Actions" button on POL details pane. Select "Receive" option
      OrderDetails.openPolDetails(testData.orderLine.titleOrPackage);
      orderLineDetails.openReceiving();

      // Click <Title name from PO line> link
      Receiving.selectFromResultsList();
      receivingDetails.waitLoading();
      receivingDetails.checkReceivingDetails({
        orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
        expected: [],
        received: [
          // { barcode: testData.secondPieceBarcode, format: 'Physical' },
          { barcode: testData.firstPieceBarcode, format: 'Physical' },
        ],
      });

      // Click on any record in "Received" accordion
      receivingDetails.openEditPieceModal({ section: 'Received' });
      editPieceModal.checkFieldsConditions([
        { label: 'Piece format', conditions: { required: true, value: 'Physical' } },
        // { label: 'Create item', conditions: { value: 'Connected' } },
      ]);
      // Click "Delete" button
      Receiving.openDropDownInEditPieceModal();
      editPieceModal.clickDeleteButton(testData.POLineQuantity);

      // Click "Delete item" button
      // DeletePieceModal.clickDeleteItemButton();
      // ReceivingDetails.checkReceivingDetails({
      //   orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
      //   expected: [],
      //   received: [],
      // });

      // Click "POL number" link in "POL details" accordion
      // const OrderLineDetails = ReceivingDetails.openOrderLineDetails();
      // OrderLineDetails.checkFundDistibutionTableContent([
      //   { name: testData.fund.name, currentEncumbrance: '$0.00' },
      // ]);

      // // Click "Current encumbrance" link in "Fund distribution" accordion
      // const TransactionDetails = OrderLineDetails.openEncumbrancePane();
      // TransactionDetails.checkTransactionDetails({
      //   information: [
      //     { key: 'Fiscal year', value: testData.fiscalYear.code },
      //     { key: 'Amount', value: '$0.00' },
      //     { key: 'Source', value: `${testData.order.poNumber}-1` },
      //     { key: 'Type', value: 'Encumbrance' },
      //     { key: 'From', value: testData.fund.name },
      //     { key: 'Initial encumbrance', value: '$0.00' },
      //     { key: 'Awaiting payment', value: '$0.00' },
      //     { key: 'Expended', value: '$25.00' },
      //     { key: 'Status', value: 'Released' },
      //   ],
      // });
    },
  );
});
