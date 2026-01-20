import { ITEM_STATUS_NAMES, ACQUISITION_METHOD_NAMES_IN_PROFILE } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import Receiving from '../../../support/fragments/receiving/receiving';
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';

describe('Orders', () => {
  describe('Inventory interaction', () => {
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      approved: true,
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      accounts: [
        {
          accountNo: getRandomPostfix(),
          accountStatus: 'Active',
          acqUnitIds: [],
          appSystemNo: '',
          description: 'Main library account',
          libraryCode: 'COB',
          libraryEdiCode: getRandomPostfix(),
          name: 'TestAccout1',
          notes: '',
          paymentMethod: 'Cash',
        },
      ],
    };
    const barcodeForFirstItem = Helper.getRandomBarcode();
    const barcodeForSecondItem = Helper.getRandomBarcode();
    const changedBarcode = Helper.getRandomBarcode();

    let orderNumber;
    let user;
    let servicePointId;
    let location;

    before(() => {
      cy.getAdminToken();

      ServicePoints.getViaApi().then((servicePoint) => {
        servicePointId = servicePoint[0].id;
        NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then((res) => {
          location = res;

          MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
            (mtypes) => {
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE}"`,
              }).then((params) => {
                Organizations.createOrganizationViaApi(organization).then(
                  (organizationsResponse) => {
                    organization.id = organizationsResponse;
                    order.vendor = organizationsResponse;
                    const firstOrderLine = {
                      ...BasicOrderLine.defaultOrderLine,
                      cost: {
                        listUnitPrice: 10.0,
                        currency: 'USD',
                        discountType: 'percentage',
                        quantityPhysical: 2,
                        poLineEstimatedPrice: 10.0,
                      },
                      fundDistribution: [],
                      locations: [{ locationId: location.id, quantity: 2, quantityPhysical: 2 }],
                      acquisitionMethod: params.body.acquisitionMethods[0].id,
                      physical: {
                        createInventory: 'Instance, Holding, Item',
                        materialType: mtypes.body.id,
                        materialSupplier: organizationsResponse,
                        volumes: [],
                      },
                    };
                    cy.createOrderApi(order).then((firstOrderResponse) => {
                      orderNumber = firstOrderResponse.body.poNumber;
                      firstOrderLine.purchaseOrderId = firstOrderResponse.body.id;
                      order.poNumber = firstOrderResponse.poNumber;
                      order.id = firstOrderResponse.id;

                      OrderLines.createOrderLineViaApi(firstOrderLine);
                    });
                  },
                );
              });
            },
          );
        });
      });

      cy.createTempUser([
        permissions.uiInventoryViewInstances.gui,
        permissions.uiOrdersEdit.gui,
        permissions.uiOrdersView.gui,
        permissions.uiReceivingViewEditCreate.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after(() => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C736 Update Barcode and call number information when receiving (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C736'] },
      () => {
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        Orders.openOrder();
        Orders.receiveOrderViaActions();
        Receiving.selectLinkFromResultsList();
        Receiving.receiveFromExpectedSection();
        Receiving.receiveAllPhysicalItemsWithBarcodes(barcodeForFirstItem, barcodeForSecondItem);
        Receiving.clickOnInstance();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForFirstItem);
        InventoryItems.edit();
        ItemRecordView.changeItemBarcode(changedBarcode);
        ItemRecordView.checkItemDetails(
          location.name,
          changedBarcode,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
        InventoryItems.closeItem();
        InventoryInstance.openHoldingsAccordion(location.name);
        InventoryInstance.openItemByBarcodeAndIndex(barcodeForSecondItem);
        ItemRecordView.checkItemDetails(
          location.name,
          barcodeForSecondItem,
          ITEM_STATUS_NAMES.IN_PROCESS,
        );
        InventoryItems.closeItem();
        InventorySearchAndFilter.switchToItem();
      },
    );
  });
});
