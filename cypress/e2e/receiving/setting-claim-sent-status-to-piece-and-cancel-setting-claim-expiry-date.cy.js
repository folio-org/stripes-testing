import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Permissions from '../../support/dictionary/permissions';
import SendClaimModal from '../../support/fragments/receiving/modals/sendClaimModal';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const { EXTERNAL_NOTE, INTERNAL_NOTE } = RECEIVING_PIECE_FORM_FIELD_LABELS;

const randomPostfix = getRandomPostfix();
const claimExpiryDates = {
  tomorrow: DateTools.getTomorrowDayDateForFiscalYear(),
  nextWeek: DateTools.getFormattedDate({ date: DateTools.getFutureWeekDateObj() }, 'MM/DD/YYYY'),
};
const notes = {
  first: {
    internal: `AT_C423991_internal_note_${randomPostfix}`,
    external: `AT_C423991_external_note_${randomPostfix}`,
  },
  edited: {
    internal: `AT_C423991_edited_internal_note_${randomPostfix}`,
    external: `AT_C423991_edited_external_note_${randomPostfix}`,
  },
};

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
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData.order = order;

        return OrderLines.createOrderLineViaApi(
          BasicOrderLine.getDefaultOrderLine({
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
        Permissions.inventoryAll.gui,
        Permissions.uiOrdersView.gui,
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

  it(
    'C423991 Setting "Claim sent" status to a Piece and cancel setting claim expiry date (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C423991'] },
    () => {
      // Step 1: Open the title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Open the piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();

      // Steps 3-4: Open "Send claim" modal, specify tomorrow's date
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.verifyModalView();
      SendClaimModal.fillClaimExpiryDate(claimExpiryDates.tomorrow);

      // Step 5: Cancel sending the claim
      SendClaimModal.clickCancelButton();
      EditPieceModal.waitLoading();

      // Steps 6-8: Send the claim with internal and external notes
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.verifyModalView();
      SendClaimModal.fillClaimExpiryDate(claimExpiryDates.tomorrow);
      SendClaimModal.fillInternalNote(notes.first.internal);
      SendClaimModal.fillExternalNote(notes.first.external);
      SendClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.CLAIM_SENT }]);

      // Step 9: Open the piece, the notes are saved
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: INTERNAL_NOTE, conditions: { value: notes.first.internal } },
        { label: EXTERNAL_NOTE, conditions: { value: notes.first.external } },
      ]);

      // Step 10: Send the claim again with edited notes
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSendClaimButton();
      SendClaimModal.fillClaimExpiryDate(claimExpiryDates.nextWeek);
      SendClaimModal.fillInternalNote(notes.edited.internal);
      SendClaimModal.fillExternalNote(notes.edited.external);
      SendClaimModal.clickSaveAndCloseButton();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.CLAIM_SENT }]);

      // Step 11: Open the piece, the edited notes are saved
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: INTERNAL_NOTE, conditions: { value: notes.edited.internal } },
        { label: EXTERNAL_NOTE, conditions: { value: notes.edited.external } },
      ]);
    },
  );
});
