import uuid from 'uuid';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, BasicOrderLine, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import { ORDER_STATUSES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Orders', () => {
  const testData = {
    barcode: uuid(),
    organization: NewOrganization.getDefaultOrganization(),
    folioInstances: InventoryInstances.generateFolioInstances(),
    servicePoint: ServicePoints.getDefaultServicePoint(),
    materialType: {},
    location: {},
    order: {},
    orderLine: {},
    user: {},
  };

  beforeEach('Create test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.createViaApi(testData.servicePoint).then(() => {
        testData.location = Locations.getDefaultLocation({
          servicePointId: testData.servicePoint.id,
        }).location;

        Locations.createViaApi(testData.location).then((location) => {
          cy.getDefaultMaterialType().then((mt) => {
            testData.materialType = mt;
          });
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances: testData.folioInstances,
            location,
          });
        });
      });

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.order = NewOrder.getDefaultOrder({ vendorId: testData.organization.id });
        testData.orderLine = BasicOrderLine.getDefaultOrderLine({
          title: testData.folioInstances[0].instanceTitle,
          specialLocationId: testData.location.id,
          specialMaterialTypeId: testData.materialType.id,
        });

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;

          Orders.updateOrderViaApi({ ...testData.order, workflowStatus: 'Open' });
        });
      });
    });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  afterEach('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
      InventoryInstances.deleteInstanceViaApi({
        instance: testData.folioInstances[0],
      });
      InventoryHoldings.deleteHoldingRecordByLocationIdViaApi(testData.location.id);
      Locations.deleteViaApi(testData.location);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  describe('Receiving and Check-in', () => {
    it(
      'C375241 Create new holdings for already existing location when receiving item by "Receive" option (thunderjet) (TaaS)',
      { tags: ['extendedPathFlaky', 'thunderjet', 'C375241'] },
      () => {
        // Click on the Order
        const OrderDetails = Orders.selectOrderByPONumber(testData.order.poNumber);
        OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

        // Click "Actions", Select "Receive" option
        const Receivings = OrderDetails.openReceivingsPage();

        // Click on the hyperlink with title name in "Title" column
        const ReceivingDetails = Receivings.selectFromResultsList(
          testData.orderLine.titleOrPackage,
        );
        ReceivingDetails.checkReceivingDetails({
          orderLineDetails: [{ key: 'POL number', value: `${testData.order.poNumber}-1` }],
          expected: [{ format: 'Physical' }],
          received: [],
        });

        // Click "Actions" button, Select "Receive" option
        const ReceivingsListEditForm = ReceivingDetails.openReceiveListEditForm();
        ReceivingsListEditForm.checkButtonsConditions([
          { label: 'Cancel', conditions: { disabled: false } },
          { label: 'Receive', conditions: { disabled: true } },
        ]);

        // Click "Create new holdings for location" link in "Select location" column
        const SelectLocationModal = ReceivingsListEditForm.clickCreateNewHoldingsButton();

        // Select permanent location from Precondition, Click "Save and close" button
        SelectLocationModal.selectLocation(testData.location.institutionName);

        ReceivingsListEditForm.checkReceivingItemDetails({
          receivedLocation: testData.location.name,
        });

        // Fill "Barcode" field with valid value, Check the checkbox next to receiving record
        ReceivingsListEditForm.fillReceivingFields({ barcode: testData.barcode });

        // Click "Receive" button
        ReceivingsListEditForm.clickReceiveButton();
        ReceivingDetails.checkReceivingDetails({
          expected: [],
          received: [{ barcode: testData.barcode, format: 'Physical' }],
        });

        // Click "<Title name>" link on the third pane
        const InventoryInstance = ReceivingDetails.openInstanceDetails();
        InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
        InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 1 });
      },
    );
  });
});
