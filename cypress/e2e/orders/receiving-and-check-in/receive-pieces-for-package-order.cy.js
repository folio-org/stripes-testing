import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
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
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const testData = {
      orderLine: { titleOrPackage: `Autotest_POL_${getRandomPostfix()}` },
    };
    const firstPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };
    const secondPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };
    const thirdPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };
    const fourthPiece = {
      copyNumber: Helper.getRandomBarcode(),
      enumeration: Helper.getRandomBarcode(),
      chronology: Helper.getRandomBarcode(),
      displaySummary: `AQA-${Helper.getRandomBarcode()}`,
    };

    before(() => {
      cy.getAdminToken();
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
        order.vendor = response;

        cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((res) => {
          testData.location = res;

          cy.getBookMaterialType().then((materialType) => {
            testData.materialType = materialType;

            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((acquisitionMethodResponse) => {
              testData.acquisitionMethod = acquisitionMethodResponse.body.acquisitionMethods[0].id;

              Orders.createOrderViaApi(order).then((orderResponse) => {
                testData.order = orderResponse;
                testData.orderNumber = orderResponse.poNumber;

                const orderLineData = {
                  ...BasicOrderLine.defaultOrderLine,
                  id: uuid(),
                  purchaseOrderId: testData.order.id,
                  titleOrPackage: testData.orderLine.titleOrPackage,
                  claimingActive: true,
                  claimingInterval: 1,
                  checkinItems: false,
                  receiptStatus: 'Awaiting Receipt',
                  cost: {
                    listUnitPrice: 10.0,
                    currency: 'USD',
                    quantityPhysical: 1,
                  },
                  locations: [
                    {
                      locationId: testData.location.id,
                      quantity: 1,
                      quantityPhysical: 1,
                    },
                  ],
                  acquisitionMethod: testData.acquisitionMethod,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: testData.materialType.id,
                    materialSupplier: organization.id,
                    volumes: [],
                  },
                };

                OrderLines.createOrderLineViaApi(orderLineData).then((orderLineResponse) => {
                  testData.orderLine = orderLineResponse;
                });
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiOrdersView.gui,
        Permissions.uiOrdersApprovePurchaseOrders.gui,
        Permissions.uiOrdersReopenPurchaseOrders.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
        Orders.selectOrdersPane();
        Orders.waitLoading();
      });
    });

    after(() => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C343213 Receive pieces for package order (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C343213'] },
      () => {
        Orders.searchByParameter('PO number', testData.orderNumber);
        Orders.selectFromResultsList(testData.orderNumber);
        Orders.openOrder();
        Orders.receiveOrderViaActions();
        // Receiving part
        Receiving.selectPOLInReceive(testData.orderLine.titleOrPackage);
        Receiving.addPiece(
          firstPiece.displaySummary,
          firstPiece.copyNumber,
          firstPiece.enumeration,
          firstPiece.chronology,
        );
        Receiving.selectPiece(firstPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(firstPiece.enumeration);
        Receiving.addPiece(
          secondPiece.displaySummary,
          secondPiece.copyNumber,
          secondPiece.enumeration,
          secondPiece.chronology,
        );
        Receiving.selectPiece(secondPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(secondPiece.enumeration);
        Receiving.addPiece(
          thirdPiece.displaySummary,
          thirdPiece.copyNumber,
          thirdPiece.enumeration,
          thirdPiece.chronology,
        );
        Receiving.selectPiece(thirdPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(thirdPiece.enumeration);
        Receiving.addPiece(
          fourthPiece.displaySummary,
          fourthPiece.copyNumber,
          fourthPiece.enumeration,
          fourthPiece.chronology,
        );
        Receiving.selectPiece(fourthPiece.displaySummary);
        Receiving.openDropDownInEditPieceModal();
        Receiving.quickReceivePiece(fourthPiece.enumeration);
        Receiving.selectInstanceInReceive(testData.orderLine.titleOrPackage);
        // inventory part
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        ItemRecordView.findRowAndClickLink(firstPiece.copyNumber);
        ItemRecordView.verifyEffectiveLocation(testData.location.name);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        ItemRecordView.findRowAndClickLink(secondPiece.enumeration);
        ItemRecordView.verifyEffectiveLocation(testData.location.name);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        ItemRecordView.findRowAndClickLink(thirdPiece.chronology);
        ItemRecordView.verifyEffectiveLocation(testData.location.name);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        ItemRecordView.findRowAndClickLink(fourthPiece.copyNumber);
        ItemRecordView.verifyEffectiveLocation(testData.location.name);
        ItemRecordView.verifyItemStatus('In process');
        ItemRecordView.closeDetailView();
      },
    );
  });
});
