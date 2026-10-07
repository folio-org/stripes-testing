import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  EXPECTED_TABLE_COLUMN_HEADERS,
  ORDER_STATUSES,
  RECEIVING_PIECES_ACCORDION_NAMES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InteractorsTools from '../../support/utils/interactorsTools';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    servicePoint: {},
    location: {},
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

  const createLocation = () => {
    return ServicePoints.getCircDesk1ServicePointViaApi().then((servicePoint) => {
      testData.servicePoint = servicePoint;

      const { location } = Locations.getDefaultLocation({ servicePointId: servicePoint.id });

      return Locations.createViaApi(location).then(() => {
        testData.location = location;
      });
    });
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

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
            checkinItems: true,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
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
        Permissions.uiOrdersView.gui,
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
      .then(createLocation)
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
    Locations.deleteViaApi(testData.location);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  const SEQUENCE = RECEIVING_PIECE_FORM_FIELD_LABELS.SEQUENCE;

  // Pieces are listed by sequence number in every accordion
  const checkPiecesSequences = ({ expected = [], received = [], unreceivable = [] }) => {
    ReceivingDetails.checkExpectedTableContent(expected.map((sequence) => ({ sequence })));
    ReceivingDetails.checkReceivedTableContent(received.map((sequence) => ({ sequence })));
    ReceivingDetails.checkUnreceivableTableContent(unreceivable.map((sequence) => ({ sequence })));
  };

  const setSequenceColumnVisibility = (checked) => {
    RECEIVING_PIECES_ACCORDION_NAMES.forEach((accordion) => {
      ReceivingDetails.setAccordionColumnsVisibility({
        accordion,
        columns: [EXPECTED_TABLE_COLUMN_HEADERS.SEQUENCE],
        checked,
      });
      ReceivingDetails.checkAccordionColumnsDisplayed({
        accordion,
        columns: [EXPECTED_TABLE_COLUMN_HEADERS.SEQUENCE],
        displayed: checked,
      });
    });
  };

  it(
    'C844209 Sequence numbers are applied correctly when creating and editing pieces (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C844209', 'nonParallel'] },
    () => {
      const title = testData.orderLine.titleOrPackage;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(0);

      // Steps 2-3: Add the first piece
      Receiving.addPieceInActions();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { value: '1', disabled: true } },
      ]);
      EditPieceModal.clickSaveAndCloseButton();
      checkPiecesSequences({ expected: ['1'] });

      // Steps 4-5: Add the second piece
      Receiving.addPieceInActions();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { value: '2', disabled: true } },
      ]);
      EditPieceModal.clickSaveAndCloseButton();
      checkPiecesSequences({ expected: ['1', '2'] });

      // Step 6: Open the piece with sequence number 2
      ReceivingDetails.openEditPieceModal({ row: 1 });
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { value: '2', disabled: false } },
      ]);

      // Step 7: Change sequence number to 1, mark the piece unreceivable
      EditPieceModal.fillPieceDetails({ [SEQUENCE]: '1' });
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceivableButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSequenceChanged(2, 1));
      checkPiecesSequences({ expected: ['2'], unreceivable: ['1'] });

      // Step 8: Open the piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { value: '2', disabled: false } },
      ]);

      // Steps 9-10: Sequence number is required and limited by the number of pieces
      EditPieceModal.fillPieceDetails({ [SEQUENCE]: '' });
      EditPieceModal.blurField(SEQUENCE);
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { error: ReceivingStates.requiredFieldError } },
      ]);
      EditPieceModal.fillPieceDetails({ [SEQUENCE]: '100' });
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { error: ReceivingStates.sequenceNumberOutOfRange(2) } },
      ]);

      // Step 11: Keep sequence number 2, save the piece
      EditPieceModal.fillPieceDetails({ [SEQUENCE]: '2' });
      EditPieceModal.clickSaveAndCloseButton();
      checkPiecesSequences({ expected: ['2'], unreceivable: ['1'] });

      // Steps 12-13: Add the third piece and quick receive it
      Receiving.addPieceInActions();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { value: '3', disabled: true } },
      ]);
      Receiving.quickReceiveInEditPieceModal();
      checkPiecesSequences({ expected: ['2'], received: ['3'], unreceivable: ['1'] });

      // Steps 14-16: "Sequence" column can be hidden and shown in all accordions
      setSequenceColumnVisibility(false);
      setSequenceColumnVisibility(true);

      // Step 17: Delete the unreceivable piece
      Receiving.selectRecordInUnreceivableList();
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ isLastPiece: false });
      DeletePieceModal.clickConfirmButton();
      checkPiecesSequences({ expected: ['2'], received: ['3'] });

      // Steps 18-19: Add the fourth piece
      Receiving.addPieceInActions();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { value: '4', disabled: true } },
      ]);
      EditPieceModal.clickSaveAndCloseButton();
      checkPiecesSequences({ expected: ['2', '4'], received: ['3'] });

      // Steps 20-21: Change sequence number of the received piece to 1
      Receiving.selectRecordInReceivedList();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: SEQUENCE, conditions: { value: '3', disabled: false } },
      ]);
      EditPieceModal.fillPieceDetails({ [SEQUENCE]: '1' });
      EditPieceModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSequenceChanged(3, 1));
      checkPiecesSequences({ expected: ['3', '4'], received: ['1'] });

      // Step 22: Add the fifth piece as unreceivable
      Receiving.addPieceInActions();
      EditPieceModal.waitLoading();
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickUnreceivableButton();
      checkPiecesSequences({ expected: ['3', '4'], received: ['1'], unreceivable: ['5'] });

      // Step 23: Change sequence number of the unreceivable piece to 1, expect it
      Receiving.selectRecordInUnreceivableList();
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({ [SEQUENCE]: '1' });
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickExpectButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSequenceChanged(5, 1));
      checkPiecesSequences({ expected: ['1', '4', '5'], received: ['2'] });

      // Step 24: Change sequence number of the received piece to 1, unreceive it
      Receiving.selectRecordInReceivedList();
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({ [SEQUENCE]: '1' });
      Receiving.unreceiveInEditPieceModal();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSequenceChanged(2, 1));
      checkPiecesSequences({ expected: ['1', '2', '4', '5'] });
    },
  );
});
