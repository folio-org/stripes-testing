import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InteractorsTools from '../../support/utils/interactorsTools';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
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
    order: {},
    orderLine: {},
    instanceHoldings: [],
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
      .then(() =>
        cy.getAcquisitionMethodsApi({
          query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
        }),
      )
      .then(({ body }) => {
        testData.acquisitionMethod = body.acquisitionMethods[0];
      });
  };

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            checkinItems: true,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
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

  const fetchInstanceHoldings = () => {
    return cy
      .getHoldings({ limit: 10, query: `instanceId=="${testData.orderLine.instanceId}"` })
      .then((holdings) => {
        testData.instanceHoldings = holdings;
      });
  };

  // Piece #1 is in the existing Loc 1 holding from the PO line, piece #2 is in the new Loc 2 holding
  const createPieces = () => {
    const { id: location1HoldingId } = testData.instanceHoldings.find(
      ({ permanentLocationId }) => permanentLocationId === testData.location1.id,
    );

    const piece = {
      poLineId: testData.orderLine.id,
      poLineNumber: testData.orderLine.poLineNumber,
      format: testData.orderLine.orderFormat,
    };

    return Receiving.addPieceViaApi({ ...piece, holdingId: location1HoldingId }).then(() =>
      Receiving.addPieceViaApi(piece, { locationId: testData.location2.id }),
    );
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiReceivingViewEdit.gui,
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
      .then(fetchInstanceHoldings)
      .then(createPieces)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrderByIdViaApi(testData.order.id).then((order) => {
      Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.PENDING }, true, false);
    });
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    [testData.location1, testData.location2, testData.location3, testData.location4].forEach(
      (location) => {
        Locations.deleteViaApi(location);
      },
    );
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1273162 Check holding abandonment on the "Edit piece" page for an independent PO line when editing the location and deleting a piece (Delete only holdings not related to PO line) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1273162'] },
    () => {
      const { location1, location2, location3, location4 } = testData;

      // Step 1: Open the title, pieces are listed by sequence number
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedTableContent([
        { holdingsLocation: location1.name },
        { holdingsLocation: location2.name },
      ]);

      // Steps 2-3: Move piece #1 from the PO line Loc 1 holding to the new Loc 3 holding, the PO line holding is kept
      ReceivingDetails.openEditPieceModal({ row: 0 });
      EditPieceModal.waitLoading();
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(location3.name);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedTableContent([
        { holdingsLocation: location3.name },
        { holdingsLocation: location2.name },
      ]);

      // Steps 4-5: Move piece #2 from the Loc 2 holding to the new Loc 4 holding, delete the Loc 2 holding
      ReceivingDetails.openEditPieceModal({ row: 1 });
      EditPieceModal.waitLoading();
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(location4.name);
      EditPieceModal.clickSaveAndCloseButton({ pieceSaved: false });
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(2);
      ReceivingDetails.checkExpectedTableContent([
        { holdingsLocation: location3.name },
        { holdingsLocation: location4.name },
      ]);

      // Step 6: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      InventoryInstance.verifyHoldingsAbsent(location2.name);
      [location1, location3, location4].forEach((location) => {
        InstanceRecordView.verifyItemsListIsEmpty(location.name);
      });

      // Steps 7-8: Delete piece #1 from the Loc 3 holding together with the holding
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.openEditPieceModal({ row: 0 });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ hasItem: false });
      DeletePieceModal.clickDeleteOnlyHoldingsButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 9: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.verifyHoldingsAbsent(location3.name);
      [location1, location4].forEach((location) => {
        InstanceRecordView.verifyItemsListIsEmpty(location.name);
      });

      // Steps 10-11: Delete piece #2 from the Loc 4 holding together with the holding
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ hasItem: false });
      DeletePieceModal.clickDeleteOnlyHoldingsButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);

      // Step 12: Click on the title name link, only the PO line holding is kept
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InventoryInstance.verifyHoldingsAbsent(location4.name);
      InstanceRecordView.verifyItemsListIsEmpty(location1.name);
    },
  );
});
