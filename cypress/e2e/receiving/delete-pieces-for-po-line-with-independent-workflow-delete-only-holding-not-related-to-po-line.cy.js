import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  ORDER_STATUSES,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import Permissions from '../../support/dictionary/permissions';
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
      NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            quantity: 2,
            checkinItems: true,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location1.id,
            specialMaterialTypeId: testData.materialType.id,
          }),
          locations: [testData.location1, testData.location2].map(({ id }) => ({
            locationId: id,
            quantity: 1,
            quantityPhysical: 1,
          })),
        });
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

  const createPiece = ({ holdingId, locationId, createItem }) => {
    return Receiving.addPieceViaApi(
      {
        poLineId: testData.orderLine.id,
        poLineNumber: testData.orderLine.poLineNumber,
        format: testData.orderLine.orderFormat,
        holdingId,
        searchParams: { createItem },
      },
      { locationId },
    );
  };

  // Pieces are created one by one to get sequence numbers in the order of the pieces:
  // piece #1 with item in the existing Loc 1 holding, piece #2 without item in the existing Loc 2 holding,
  // piece #3 with item in the new Loc 3 holding
  const createPieces = () => {
    const [location1HoldingId, location2HoldingId] = [testData.location1, testData.location2].map(
      (location) => testData.instanceHoldings.find(
        ({ permanentLocationId }) => permanentLocationId === location.id,
      ).id,
    );

    return createPiece({ holdingId: location1HoldingId, createItem: true })
      .then(() => createPiece({ holdingId: location2HoldingId, createItem: false }))
      .then(() => createPiece({ locationId: testData.location3.id, createItem: true }));
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
    [testData.location1, testData.location2, testData.location3].forEach((location) => {
      Locations.deleteViaApi(location);
    });
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1273175 Delete pieces for the PO line with independent workflow (Delete only holding not related to PO line) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1273175'] },
    () => {
      const { location1, location2, location3 } = testData;

      // Step 1: Open the title, pieces are listed by sequence number
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(3);
      ReceivingDetails.checkExpectedTableContent([
        { holdingsLocation: location1.name },
        { holdingsLocation: location2.name },
        { holdingsLocation: location3.name },
      ]);

      // Steps 2-3: Delete piece #1 from the PO line Loc 1 holding, the holding is kept
      ReceivingDetails.openEditPieceModal({ row: 0 });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ isLastPiece: false });
      DeletePieceModal.clickConfirmButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 4: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      [location1, location2].forEach((location) => {
        InstanceRecordView.verifyItemsListIsEmpty(location.name);
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location3.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location3.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });

      // Steps 5-6: Delete piece #2 from the PO line Loc 2 holding, the holding is kept
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.openEditPieceModal({ row: 0 });
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ isLastPiece: false });
      DeletePieceModal.clickConfirmButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 7: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(3);
      [location1, location2].forEach((location) => {
        InstanceRecordView.verifyItemsListIsEmpty(location.name);
      });
      InventoryInstance.verifyNumberOfItemsInHoldingByName(location3.name, 1);
      InventoryInstance.checkHoldingsTableContent({
        name: location3.name,
        records: [{ status: ITEM_STATUS_NAMES.ON_ORDER }],
      });

      // Steps 8-9: Delete piece #3 with its item and the Loc 3 holding
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton();
      DeletePieceModal.clickDeleteHoldingsButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(0);

      // Step 10: Click on the title name link, only the PO line holdings are kept
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InventoryInstance.verifyHoldingsAbsent(location3.name);
      [location1, location2].forEach((location) => {
        InstanceRecordView.verifyItemsListIsEmpty(location.name);
      });
    },
  );
});
