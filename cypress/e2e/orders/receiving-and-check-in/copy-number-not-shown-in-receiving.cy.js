import uuid from 'uuid';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, BasicOrderLine, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import { InventoryInstances } from '../../../support/fragments/inventory';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import { Receivings } from '../../../support/fragments/receiving';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  describe('Receiving and Check-in', () => {
    const testData = {
      barcode: uuid(),
      copyNumber: uuid(),
      organization: NewOrganization.getDefaultOrganization(),
      folioInstances: InventoryInstances.generateFolioInstances({
        items: [{ status: { name: ITEM_STATUS_NAMES.AVAILABLE } }],
      }),
      servicePoint: ServicePoints.getDefaultServicePoint(),
      materialType: MaterialTypes.getDefaultMaterialType(),
      location: {},
      order: {},
      orderLine: {},
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint).then(() => {
          testData.location = Locations.getDefaultLocation({
            servicePointId: testData.servicePoint.id,
          }).location;

          Locations.createViaApi(testData.location);
        });
        MaterialTypes.createMaterialTypeViaApi(testData.materialType);
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
          testData.orderLine = BasicOrderLine.getDefaultOrderLine({
            specialLocationId: testData.location.id,
            specialMaterialTypeId: testData.materialType.id,
            receiptStatus: 'Awaiting Receipt',
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;

              Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
            },
          );
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiInventoryViewCreateEditItems.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Orders.deleteOrderViaApi(testData.order.id);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.barcode);
        Locations.deleteViaApi(testData.location);
        MaterialTypes.deleteViaApi(testData.materialType.id);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C374137 "Copy number" value applied to the inventory item record is NOT shown in receiving (thunderjet) (TaaS)',
      { tags: ['extendedPathFlaky', 'thunderjet', 'C374137'] },
      () => {
        // Click on Instance name from PO line from preconditions
        InventoryInstances.searchByTitle(testData.orderLine.titleOrPackage);
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
        const ItemRecordEdit = ItemRecordView.openItemEditForm(testData.orderLine.titleOrPackage);

        // Fill "Barcode" and "Copy number" fields with valid values
        ItemRecordEdit.fillItemRecordFields({
          barcode: testData.barcode,
          copyNumber: testData.copyNumber,
        });

        // Click "Save and close" button
        ItemRecordEdit.saveAndClose();
        ItemRecordView.checkItemRecordDetails({
          administrativeData: [{ label: 'Item barcode', conditions: { value: testData.barcode } }],
          itemData: [{ label: 'Copy number', conditions: { value: testData.copyNumber } }],
        });

        // Go to "Receiving" app
        TopMenuNavigation.navigateToApp('Receiving');
        Receivings.waitLoading();

        // Search for PO line from Precondition
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
          expected: [{ copyNumber: 'No value set-', format: 'Physical' }],
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
