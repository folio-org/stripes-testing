import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('orders: Receiving and Check-in', () => {
  const copyNumber = Helper.getRandomBarcode();
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: {
      ...NewOrder.getDefaultOngoingOrder({ vendorId: organization.id }),
      reEncumber: true,
      approved: true,
    },
  };

  before(() => {
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(organization).then((orgResp) => {
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResp) => {
          testData.location = locationResp;
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((amResp) => {
            cy.getBookMaterialType().then((mtypeResp) => {
              const orderLine = {
                ...BasicOrderLine.defaultOrderLine,
                cost: {
                  listUnitPrice: 20.0,
                  currency: 'USD',
                  discountType: 'percentage',
                  quantityPhysical: 1,
                  poLineEstimatedPrice: 20.0,
                },
                locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                physical: {
                  createInventory: 'Instance, Holding, Item',
                  materialType: mtypeResp.id,
                  materialSupplier: orgResp,
                  volumes: [],
                },
              };

              Orders.createOrderViaApi(testData.order).then((orderResp) => {
                testData.order.id = orderResp.id;
                testData.orderNumber = orderResp.poNumber;
                orderLine.purchaseOrderId = orderResp.id;

                OrderLines.createOrderLineViaApi(orderLine).then((orderLineResponse) => {
                  testData.orderLine = orderLineResponse;
                });
                Orders.updateOrderViaApi({
                  ...orderResp,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
              });
            });
          });
        },
      );
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiReceivingViewEditCreate.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.waitLoading();
    });
  });

  after('Clean up test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    Organizations.deleteOrganizationViaApi(organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C374134 Copy number applies to the item when receiving through "Quick receive" option (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C374134'] },
    () => {
      Orders.searchByParameter('PO number', testData.orderNumber);
      Orders.selectFromResultsList(testData.orderNumber);
      Orders.receiveOrderViaActions();
      Receiving.selectLinkFromResultsList();
      Receiving.selectPieceByIndexInExpected();
      Receiving.fillInCopyNumberInAddPieceModal(copyNumber);
      Receiving.openDropDownInEditPieceModal();
      Receiving.quickReceivePieceAdd();
      Receiving.selectInstanceInReceive(testData.orderLine.titleOrPackage);
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.openItemByBarcodeAndIndex('No barcode');
      ItemRecordView.verifyEffectiveLocation(testData.location.name);
      ItemRecordView.checkCopyNumber(copyNumber);
    },
  );
});
