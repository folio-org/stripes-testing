import { including } from '../../../interactors';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  NO_VALUE,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_FORM_MODES,
  RECEIVING_PIECE_FORMATS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import DateTools from '../../support/utils/dateTools';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import PieceForm from '../../support/fragments/receiving/pieceForm';
import getRandomPostfix from '../../support/utils/stringTools';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { formatDate } from '../../support/utils/acquisitions';

const {
  ACCESSION_NUMBER,
  BARCODE,
  BOUND,
  CALL_NUMBER,
  CHRONOLOGY,
  COMMENT,
  COPY_NUMBER,
  DISPLAY_ON_HOLDING,
  DISPLAY_SUMMARY,
  ENUMERATION,
  EXPECTED_RECEIPT_DATE,
  EXTERNAL_NOTE,
  INTERNAL_NOTE,
  ITEM_STATUS,
  ORDER_LINE_LOCATIONS,
  PIECE_FORMAT,
  REQUEST,
  SEQUENCE,
  SUPPLEMENT,
} = RECEIVING_PIECE_FORM_FIELD_LABELS;

const randomPostfix = getRandomPostfix();

const pieceDetails = {
  [DISPLAY_SUMMARY]: `AT_C434134_summary_${randomPostfix}`,
  [COPY_NUMBER]: `AT_C434134_copy_${randomPostfix}`,
  [ENUMERATION]: `AT_C434134_enumeration_${randomPostfix}`,
  [CHRONOLOGY]: `AT_C434134_chronology_${randomPostfix}`,
  [EXPECTED_RECEIPT_DATE]: DateTools.getTomorrowDayDateForFiscalYear(),
  [COMMENT]: `AT_C434134_comment_${randomPostfix}`,
};

const getUserName = ({ personal }) => `${personal.lastName}, ${personal.firstName}`;

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
    adminUser: {},
    locale: {},
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
      })
      .then(() => cy.getTenantLocaleApi())
      .then((locale) => {
        testData.locale = locale;
      })
      .then(() => cy.getAdminUserDetails())
      .then((adminUser) => {
        testData.adminUser = adminUser;
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
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.location.id,
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
    'C434134 Check edit form view for the record in "Expected" accordion (Quesnelia +) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434134'] },
    () => {
      const title = testData.orderLine.titleOrPackage;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.EXPECTED }]);

      // Step 2: Open the piece in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      PieceForm.waitLoading(RECEIVING_PIECE_FORM_MODES.EDIT);
      EditPieceModal.verifyMetadataAccordionState(false);
      EditPieceModal.checkAccordionsConditions([
        {
          label: RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.PIECE_DETAILS,
          conditions: { open: true },
        },
        {
          label: RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.ITEM_DETAILS,
          conditions: { open: false },
        },
        { label: RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.STATUS_LOG, conditions: { open: false } },
      ]);
      EditPieceModal.checkFieldsConditions([
        ...[
          DISPLAY_SUMMARY,
          COPY_NUMBER,
          ENUMERATION,
          CHRONOLOGY,
          EXPECTED_RECEIPT_DATE,
          COMMENT,
          INTERNAL_NOTE,
          EXTERNAL_NOTE,
          DISPLAY_ON_HOLDING,
        ].map((label) => ({ label, conditions: { disabled: false } })),
        { label: PIECE_FORMAT, conditions: { value: RECEIVING_PIECE_FORMATS.PHYSICAL } },
        { label: ORDER_LINE_LOCATIONS, conditions: { value: including(testData.location.name) } },
        { label: SEQUENCE, conditions: { value: '1', disabled: false } },
      ]);
      EditPieceModal.verifyCheckboxPresent(SUPPLEMENT);
      EditPieceModal.verifyCheckboxPresent(BOUND, true, true);
      EditPieceModal.verifySaveAndCloseButtonState({ disabled: false });
      EditPieceModal.verifyActionsMenuState({ disabled: false });

      // Step 3: Expand "Item details" accordion
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.ITEM_DETAILS);
      EditPieceModal.checkFieldsConditions([
        { label: BARCODE, conditions: { disabled: true } },
        { label: CALL_NUMBER, conditions: { disabled: true } },
        { label: ACCESSION_NUMBER, conditions: { disabled: true } },
        { label: ITEM_STATUS, conditions: { value: NO_VALUE } },
        { label: REQUEST, conditions: { value: NO_VALUE } },
      ]);

      // Step 4: Expand "Status log" accordion
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.STATUS_LOG);
      EditPieceModal.checkStatusLogContent([
        {
          status: RECEIVING_PIECE_STATUSES.EXPECTED,
          date: formatDate(testData.locale, new Date()),
          interval: NO_VALUE,
          updatedBy: getUserName(testData.adminUser),
        },
      ]);

      // Step 5: Fill the fields in "Piece details" accordion
      EditPieceModal.fillPieceDetails(pieceDetails);
      EditPieceModal.checkFieldsConditions(
        Object.entries(pieceDetails).map(([label, value]) => ({ label, conditions: { value } })),
      );
      EditPieceModal.verifySaveAndCloseButtonState({ disabled: false });

      // Step 6: Quick receive the piece
      EditPieceModal.openActionsMenu();
      Receiving.quickReceivePiece(pieceDetails[ENUMERATION]);
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([
        {
          barcode: '-',
          displaySummary: pieceDetails[DISPLAY_SUMMARY],
          copyNumber: pieceDetails[COPY_NUMBER],
          enumeration: pieceDetails[ENUMERATION],
          chronology: pieceDetails[CHRONOLOGY],
          comment: pieceDetails[COMMENT],
          format: RECEIVING_PIECE_FORMATS.PHYSICAL,
          receivedDate: formatDate(testData.locale, new Date()),
          holdingsLocation: testData.location.name,
          displayToPublic: false,
          request: '-',
        },
      ]);

      // Step 7: Open PO line details
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.ONGOING },
        ],
      });

      // Steps 8-9: Open the instance, the holding does not contain items
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InstanceRecordView.verifyItemsListIsEmpty(testData.location.name);
    },
  );
});
