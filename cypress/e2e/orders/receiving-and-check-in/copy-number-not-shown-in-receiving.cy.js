import uuid from 'uuid';
import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { BasicOrderLine, NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { Receivings } from '../../../support/fragments/receiving';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const organization = NewOrganization.getDefaultOrganization();
    const testData = {
      organization,
      order: {
        id: uuid(),
        ...NewOrder.getDefaultOrder({ vendorId: organization.id }),
        orderType: 'One-Time',
        approved: true,
      },
      orderLine: {},
      user: {},
      barcode: uuid(),
      copyNumber: uuid(),
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
        (locationResponse) => {
          testData.location = locationResponse;

          cy.getBookMaterialType().then((mtypeResponse) => {
            testData.materialTypeId = mtypeResponse.id;

            InventoryInstance.createInstanceViaApi().then((instanceData) => {
              testData.instanceId = instanceData.instanceData.instanceId;
              testData.instanceTitle = instanceData.instanceData.instanceTitle;

              Organizations.createOrganizationViaApi(organization).then((orgResponse) => {
                organization.id = orgResponse;

                testData.orderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  instanceId: testData.instanceId,
                  cost: {
                    listUnitPrice: 10,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                  },
                  receiptStatus: 'Awaiting Receipt',
                  orderFormat: 'Other',
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: testData.materialTypeId,
                  },
                  locations: [{ locationId: testData.location.id, quantityPhysical: 1 }],
                };

                Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
                  (order) => {
                    testData.order = order;

                    Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
                  },
                );
              });
            });
          });
        },
      );

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C374137 "Copy number" value applied to the inventory item record is NOT shown in receiving (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C374137'] },
      () => {
        // Click on Instance name from PO line from preconditions
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 1 });

        // Expand "Holdings" accordion
        InventoryInstance.checkHoldingsTableContent({
          name: testData.location.name,
          records: [{ status: 'On order', location: testData.location.name }],
        });

        // Click "No barcode" link on item record related to PO line
        const ItemRecordView = InventoryInstance.openHoldingItem({
          name: testData.location.name,
          barcode: 'No barcode',
          shouldOpen: false,
        });
        ItemRecordView.checkItemRecordDetails({
          itemData: [{ label: 'Copy number', conditions: { value: 'No value set-' } }],
          acquisitionData: [
            { label: 'POL number', conditions: { value: `${testData.order.poNumber}-1` } },
          ],
        });

        // Click "Actions" button, Select "Edit" option
        const ItemRecordEdit = ItemRecordView.openItemEditForm(testData.instanceTitle);

        // Fill "Barcode" and "Copy number" fields with valid values
        ItemRecordEdit.fillItemRecordFields({
          barcode: testData.barcode,
          copyNumber: testData.copyNumber,
        });

        // Click "Save and close" button
        cy.wait(1500);
        ItemRecordEdit.saveAndClose();
        ItemRecordView.checkItemRecordDetails({
          administrativeData: [{ label: 'Item barcode', conditions: { value: testData.barcode } }],
          itemData: [{ label: 'Copy number', conditions: { value: testData.copyNumber } }],
        });

        // Go to "Receiving" app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
        Receivings.waitLoading();

        // Search for PO line from Precondition
        Receivings.resetFilters();
        Receivings.searchByParameter({
          parameter: 'Title (Receiving titles)',
          value: testData.orderLine.titleOrPackage,
        });

        // Click on <Title name> link
        const ReceivingDetails = Receivings.selectFromResultsList(
          testData.orderLine.titleOrPackage,
        );
        ReceivingDetails.checkReceivingDetails({
          orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
          expected: [{ copyNumber: 'No value set-', format: 'Other' }],
        });

        // Click "Actions" button in "Expected" accordion, Select "Receive" option
        const ReceivingsListEditForm = ReceivingDetails.openReceiveListEditForm();
        ReceivingsListEditForm.checkReceivingItemDetails({
          copyNumber: '',
          barcode: testData.barcode,
        });
      },
    );
  });
});
