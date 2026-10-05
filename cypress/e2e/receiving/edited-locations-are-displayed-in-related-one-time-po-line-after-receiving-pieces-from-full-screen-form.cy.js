import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  COMMON_BUTTON_LABELS,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import InteractorsTools from '../../support/utils/interactorsTools';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location1: {},
    location2: {},
    location3: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    user: {},
  };

  const createOrganization = () => {
    return Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
  };

  const createLocation = (locationKey) => {
    const { location } = Locations.getDefaultLocation({ servicePointId: testData.servicePoint.id });

    return Locations.createViaApi(location).then(() => {
      testData[locationKey] = location;
    });
  };

  const createLocations = () => {
    return ServicePoints.getCircDesk1ServicePointViaApi()
      .then((servicePoint) => {
        testData.servicePoint = servicePoint;

        return createLocation('location1');
      })
      .then(() => createLocation('location2'))
      .then(() => createLocation('location3'));
  };

  const fetchReferenceData = () => {
    return cy
      .getBookMaterialType()
      .then((materialType) => {
        testData.materialType = materialType;
      })
      .then(() => cy.getAcquisitionMethodsApi({
        query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
      }))
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            quantity: 2,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
        );
      })
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const openOrder = () => {
    return Orders.updateOrderViaApi({
      ...testData.order,
      workflowStatus: ORDER_STATUSES.OPEN,
    })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData.orderLine.id))
      .then((orderLine) => {
        testData.orderLine = orderLine;
      });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEditCreate.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.receivingPath,
          waiter: Receiving.waitLoading,
        });
      });
  };

  before('Create test data', () => {
    cy.getAdminToken();

    createOrganization()
      .then(createLocations)
      .then(fetchReferenceData)
      .then(createOrderWithOrderLine)
      .then(openOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    [testData.location1, testData.location2, testData.location3].forEach((location) => {
      Locations.deleteViaApi(location);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C543784 Edited locations are displayed in related one-time PO line after receiving pieces from full screen form (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C543784'] },
    () => {
      const title = testData.orderLine.titleOrPackage;

      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);

      // Step 1: Click "Actions" button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.orderLine.poLineNumber,
        titleName: title,
        rowCount: 2,
      });

      // Step 2: Select all records
      ReceivingsListEditForm.fillReceivingFields({ rowIndex: 0 });
      ReceivingsListEditForm.fillReceivingFields({ rowIndex: 1 });
      ReceivingsListEditForm.checkButtonsConditions([
        { label: COMMON_BUTTON_LABELS.RECEIVE, conditions: { disabled: false } },
      ]);

      // Step 3: Create new holdings for "Loc 2" for one selected record
      ReceivingsListEditForm.clickCreateNewHoldingsButton({ rowIndex: 0 });
      SelectLocationModal.selectLocation(testData.location2.name);
      ReceivingsListEditForm.checkReceivingItemDetails({
        receivedLocation: testData.location2.name,
        rowIndex: 0,
      });

      // Step 4: Create new holdings for "Loc 3" for another selected record
      ReceivingsListEditForm.clickCreateNewHoldingsButton({ rowIndex: 1 });
      SelectLocationModal.selectLocation(testData.location3.name);
      ReceivingsListEditForm.checkReceivingItemDetails({
        receivedLocation: testData.location3.name,
        rowIndex: 1,
      });

      // Step 5: Click "Receive" button
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });

      // Step 6: Click "Keep Holdings" button
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS,
        locations: [testData.location1],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 7: Click "POL number" link in "POL details" accordion
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.FULLY_RECEIVED },
        ],
        locationDetails: {
          locations: [
            [{ key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.location2.name }],
            [{ key: POLINE_DETAILS_FIELDS.HOLDING_NAME, value: testData.location3.name }],
          ],
        },
      });

      // Step 8: Click on Title name link in "Item details" accordion
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InstanceRecordView.verifyItemsListIsEmpty(testData.location1.name);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location2.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location3.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
    },
  );
});
