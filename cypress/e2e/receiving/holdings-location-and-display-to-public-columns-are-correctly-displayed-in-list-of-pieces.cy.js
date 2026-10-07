import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  EXPECTED_TABLE_COLUMN_HEADERS,
  ORDER_STATUSES,
  RECEIVING_PIECES_ACCORDION_NAMES,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
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
    location4: {},
    materialType: {},
    acquisitionMethod: {},
    order: {},
    orderLine: {},
    pieces: [],
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

  const createOrderWithOrderLine = () => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            quantity: 10,
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

        return Receiving.getPiecesViaApi(orderLine.id);
      })
      .then((pieces) => {
        testData.pieces = [...pieces].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      });
  };

  // Pieces are listed by sequence number, so sequences 1-3 are received:
  // 1 - into the existing Loc 1 holding and displayed to public, 2 and 3 - into the new Loc 2 and Loc 3 holdings
  const receivePieces = () => {
    const [firstPiece, secondPiece, thirdPiece] = testData.pieces;

    return Receiving.receivePieceViaApi({
      poLineId: testData.orderLine.id,
      pieces: [
        { id: firstPiece.id, displayOnHolding: true, displayToPublic: true },
        { id: secondPiece.id, receiveToNewHolding: true, locationId: testData.location2.id },
        { id: thirdPiece.id, receiveToNewHolding: true, locationId: testData.location3.id },
      ],
    });
  };

  // Sequences 4 and 5 are unreceivable, sequence 4 is displayed to public
  const markPiecesUnreceivable = () => {
    const [fourthPiece, fifthPiece] = testData.pieces.slice(3, 5);

    return Pieces.updateOrderPieceViaApi({
      ...fourthPiece,
      displayOnHolding: true,
      displayToPublic: true,
    }).then(() => Pieces.updateOrderPiecesStatusesBatchViaApi({
      pieceIds: [fourthPiece.id, fifthPiece.id],
      receivingStatus: RECEIVING_PIECE_STATUSES.UNRECEIVABLE,
    }));
  };

  // Sequence 10 stays expected in the new Loc 4 holding and is displayed to public
  const moveLastPieceToNewHolding = () => {
    const lastPiece = testData.pieces[testData.pieces.length - 1];

    return Pieces.updateOrderPieceViaApi({
      ...lastPiece,
      holdingId: undefined,
      locationId: testData.location4.id,
      displayOnHolding: true,
      displayToPublic: true,
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
      .then(createOrderWithOrderLine)
      .then(openOrder)
      .then(receivePieces)
      .then(markPiecesUnreceivable)
      .then(moveLastPieceToNewHolding)
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

  const COLUMNS = [
    EXPECTED_TABLE_COLUMN_HEADERS.HOLDINGS_LOCATION,
    EXPECTED_TABLE_COLUMN_HEADERS.DISPLAY_TO_PUBLIC,
  ];

  const setColumnsVisibility = (checked) => {
    RECEIVING_PIECES_ACCORDION_NAMES.forEach((accordion) => {
      ReceivingDetails.setAccordionColumnsVisibility({ accordion, columns: COLUMNS, checked });
      ReceivingDetails.checkAccordionColumnsDisplayed({
        accordion,
        columns: COLUMNS,
        displayed: checked,
      });
    });
  };

  const expectedPiece = ({
    status = RECEIVING_PIECE_STATUSES.EXPECTED,
    location,
    displayToPublic,
  }) => ({
    status,
    holdingsLocation: location.name,
    displayToPublic,
  });

  it(
    'C844842 "Holdings location" and "Display to public" columns are correctly displayed in the list of pieces (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C844842', 'nonParallel'] },
    () => {
      const title = testData.orderLine.titleOrPackage;
      const { location1, location2, location3, location4 } = testData;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      RECEIVING_PIECES_ACCORDION_NAMES.forEach((accordion) => {
        ReceivingDetails.checkAccordionColumnsDisplayed({ accordion, columns: COLUMNS });
      });
      ReceivingDetails.checkExpectedTableContent([
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location4, displayToPublic: true }),
      ]);
      // Received and unreceivable pieces are listed by sequence number in descending order
      ReceivingDetails.checkReceivedTableContent([
        { holdingsLocation: location3.name, displayToPublic: false },
        { holdingsLocation: location2.name, displayToPublic: false },
        { holdingsLocation: location1.name, displayToPublic: true },
      ]);
      ReceivingDetails.checkUnreceivableTableContent([
        { holdingsLocation: location1.name, displayToPublic: false },
        { holdingsLocation: location1.name, displayToPublic: true },
      ]);

      // Steps 2-4: The columns can be hidden and shown in all accordions
      setColumnsVisibility(false);
      setColumnsVisibility(true);

      // Step 5: Uncheck "Display on holding" for the piece displayed to public, mark it late
      ReceivingDetails.openEditPieceModal({ row: 4 });
      EditPieceModal.waitLoading();
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickMarkLateButton();
      ReceivingDetails.checkExpectedTableContent([
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({
          status: RECEIVING_PIECE_STATUSES.LATE,
          location: location4,
          displayToPublic: false,
        }),
      ]);

      // Step 6: Display an expected piece to public and move it to the Loc 2 holding
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkDisplayOnHoldingCheckbox();
      EditPieceModal.checkDisplayToPublicCheckbox();
      EditPieceModal.selectHolding(location2.name);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkExpectedTableContent([
        expectedPiece({ location: location2, displayToPublic: true }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({
          status: RECEIVING_PIECE_STATUSES.LATE,
          location: location4,
          displayToPublic: false,
        }),
      ]);

      // Step 7: Uncheck "Display to public" for the received piece displayed to public, unreceive it
      Receiving.selectRecordInReceivedList(2);
      EditPieceModal.waitLoading();
      EditPieceModal.checkDisplayToPublicCheckbox();
      Receiving.unreceiveInEditPieceModal();
      // The unreceived piece with sequence 1 returns to the top of "Expected" accordion in the Loc 1 holding
      ReceivingDetails.checkExpectedTableContent([
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location2, displayToPublic: true }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({ location: location1, displayToPublic: false }),
        expectedPiece({
          status: RECEIVING_PIECE_STATUSES.LATE,
          location: location4,
          displayToPublic: false,
        }),
      ]);
    },
  );
});
