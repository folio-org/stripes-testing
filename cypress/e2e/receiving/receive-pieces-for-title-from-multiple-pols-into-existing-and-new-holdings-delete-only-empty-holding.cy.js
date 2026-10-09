import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InteractorsTools from '../../support/utils/interactorsTools';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import { ReceivingsListEditForm } from '../../support/fragments/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location1: {},
    location2: {},
    location3: {},
    location4: {},
    materialType: {},
    acquisitionMethod: {},
    firstOrder: {},
    firstOrderLine: {},
    secondOrder: {},
    secondOrderLine: {},
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
      .then(() => createLocation('location3'))
      .then(() => createLocation('location4'));
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

  const createOpenedOrder = ({ orderKey, orderLineKey, orderLine }) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData[orderKey] = order;

        return OrderLines.createOrderLineViaApi({ ...orderLine, purchaseOrderId: order.id });
      })
      .then((createdOrderLine) => {
        testData[orderLineKey] = createdOrderLine;

        return Orders.updateOrderViaApi({
          ...testData[orderKey],
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id))
      .then((createdOrderLine) => {
        testData[orderLineKey] = createdOrderLine;
      });
  };

  // PO line of Order #1 has two pieces in Loc 1
  const createFirstOrder = () => {
    return createOpenedOrder({
      orderKey: 'firstOrder',
      orderLineKey: 'firstOrderLine',
      orderLine: BasicOrderLine.getDefaultOrderLine({
        quantity: 2,
        acquisitionMethod: testData.acquisitionMethod.id,
        specialLocationId: testData.location1.id,
        specialMaterialTypeId: testData.materialType.id,
      }),
    });
  };

  // PO line of Order #2 has the same title and one piece in each of the new holdings Loc 2 and Loc 3
  const createSecondOrder = () => {
    return createOpenedOrder({
      orderKey: 'secondOrder',
      orderLineKey: 'secondOrderLine',
      orderLine: {
        ...BasicOrderLine.getDefaultOrderLine({
          quantity: 2,
          title: testData.firstOrderLine.titleOrPackage,
          instanceId: testData.firstOrderLine.instanceId,
          acquisitionMethod: testData.acquisitionMethod.id,
          specialLocationId: testData.location2.id,
          specialMaterialTypeId: testData.materialType.id,
        }),
        locations: [testData.location2, testData.location3].map(({ id }) => ({
          locationId: id,
          quantity: 1,
          quantityPhysical: 1,
        })),
      },
    });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiReceivingViewEdit.gui,
        Permissions.uiInventoryViewInstances.gui,
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
      .then(createFirstOrder)
      .then(createSecondOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.firstOrder, testData.secondOrder].forEach(({ id }) => {
      Orders.getOrderByIdViaApi(id).then((order) => {
        Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
      });
      Orders.deleteOrderViaApi(id);
    });
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
      testData.firstOrderLine.instanceId,
    );
    [testData.location1, testData.location2, testData.location3, testData.location4].forEach(
      (location) => {
        Locations.deleteViaApi(location);
      },
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  const openTitle = (orderLine) => {
    Receiving.searchByParameter({ value: orderLine.titleOrPackage });
    Receiving.selectFromResultsListByPolNumber(orderLine.poLineNumber);
    ReceivingDetails.checkTitlePaneIsDisplayed(orderLine.titleOrPackage);
  };

  it(
    'C934320 Receive pieces for the Title from multiple POLs into existing and new holdings (delete only empty holding) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C934320'] },
    () => {
      // Step 1: Open the title related to PO line from Order #1
      openTitle(testData.firstOrderLine);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 2: Click "Actions" button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.firstOrderLine.poLineNumber,
        titleName: testData.firstOrderLine.titleOrPackage,
        rowCount: 2,
      });
      [0, 1].forEach((rowIndex) => {
        ReceivingsListEditForm.checkReceivingItemDetails({
          holdingLocation: testData.location1.name,
          rowIndex,
        });
      });

      // Step 3: Check both pieces, select the existing Loc 2 holding for Piece #1
      ReceivingsListEditForm.fillReceivingFields({ rowIndex: 0 });
      ReceivingsListEditForm.fillReceivingFields({ rowIndex: 1 });
      ReceivingsListEditForm.selectHolding({ holdingName: testData.location2.name, rowIndex: 0 });
      ReceivingsListEditForm.checkReceivingItemDetails({
        holdingLocation: testData.location2.name,
        rowIndex: 0,
      });

      // Step 4: Create new holdings for Loc 4 for Piece #2, click "Receive" button
      ReceivingsListEditForm.clickCreateNewHoldingsButton({ rowIndex: 1 });
      SelectLocationModal.selectLocation(testData.location4.name);
      ReceivingsListEditForm.clickReceiveButton({ receiveSaved: false });

      // Step 5: Click "Delete Holdings" button
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
        locations: [testData.location1],
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.receiveSavedSuccessfully);
      ReceivingDetails.verifyReceivedRecordsCount(2);

      // Step 6: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location2.name, 2);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location2.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }, { status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location3.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location3.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location4.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location4.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });

      // Step 7: Go back to "Receiving" app, open the title related to PO line from Order #2
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      openTitle(testData.secondOrderLine);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 8: Click "Actions" button in "Expected" accordion, select "Receive" option
      ReceivingDetails.openReceiveListEditForm();
      ReceivingsListEditForm.verifyFormView({
        polNumber: testData.secondOrderLine.poLineNumber,
        titleName: testData.secondOrderLine.titleOrPackage,
        rowCount: 2,
      });
      [testData.location2, testData.location3].forEach((location) => {
        ReceivingsListEditForm.getRowIndexByHolding(location.name).then((rowIndex) => {
          ReceivingsListEditForm.checkReceivingItemDetails({
            holdingLocation: location.name,
            rowIndex,
          });
        });
      });

      // Step 9: Receive the piece from Loc 2 into the existing Loc 4 holding
      ReceivingsListEditForm.getRowIndexByHolding(testData.location2.name).then((rowIndex) => {
        ReceivingsListEditForm.fillReceivingFields({ rowIndex });
        ReceivingsListEditForm.selectHolding({ holdingName: testData.location4.name, rowIndex });
      });
      ReceivingsListEditForm.clickReceiveButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 10: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location2.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location2.name,
        records: [{ status: ITEM_STATUS_NAMES.IN_PROCESS }],
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location3.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location3.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(testData.location4.name, 2);
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location4.name,
        records: [
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
          { status: ITEM_STATUS_NAMES.IN_PROCESS },
        ],
      });
    },
  );
});
