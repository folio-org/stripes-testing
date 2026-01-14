import uuid from 'uuid';
import { including } from '@interactors/html';

import { Permissions } from '../../../support/dictionary';
import { NewOrder, BasicOrderLine, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import { Locations, ServicePoints } from '../../../support/fragments/settings/tenant';
import { ORDER_STATUSES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import Receiving from '../../../support/fragments/receiving/receiving';

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

  before('Create test data', () => {
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

  after('Delete test data', () => {
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
      'C375242 Create new holdings for already existing location when receiving item by "Quick receive" option (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C375242'] },
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

        // Click on the record in "Expected" accordion on "<Title name>" pane
        const EditPieceModal = ReceivingDetails.openEditPieceModal();
        EditPieceModal.checkFieldsConditions([
          {
            label: 'Piece format',
            conditions: { required: true, value: 'Physical' },
          },
        ]);

        // Click "Create new holdings for location" link
        const SelectLocationModal = EditPieceModal.clickCreateNewholdingsForLocation();

        // Select permanent location from Precondition, Click "Save and close" button
        SelectLocationModal.selectLocation(testData.location.institutionName);

        // Click "Save and close" button
        EditPieceModal.checkFieldsConditions([
          {
            label: 'Order line locations',
            conditions: { value: including(testData.location.name) },
          },
        ]);

        // Click "Quick receive" button
        Receiving.openDropDownInEditPieceModal();
        EditPieceModal.clickQuickReceiveButton();
        ReceivingDetails.checkReceivingDetails({
          expected: [],
          received: [{ format: 'Physical' }],
        });

        // Click "<Title name>" link on the third pane
        const InventoryInstance = ReceivingDetails.openInstanceDetails();
        InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 0 });
        InventoryInstance.checkHoldingTitle({ title: testData.location.name, count: 1 });
      },
    );
  });
});
