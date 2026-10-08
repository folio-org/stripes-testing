import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVENTORY_ITEMS,
  ITEM_STATUS_NAMES,
  NO_VALUE,
  ORDER_STATUSES,
  POLINE_DETAILS_FIELDS,
  RECEIPT_STATUS_VIEW,
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_FORMATS,
  RECEIVING_PIECE_STATUSES,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import PieceForm from '../../support/fragments/receiving/pieceForm';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { formatDate } from '../../support/utils/acquisitions';
import DateTools from '../../support/utils/dateTools';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { including } from '../../../interactors';

const {
  ACCESSION_NUMBER,
  BARCODE,
  BOUND,
  CALL_NUMBER,
  CHRONOLOGY,
  COMMENT,
  COPY_NUMBER,
  CREATE_ITEM,
  DISPLAY_ON_HOLDING,
  DISPLAY_SUMMARY,
  ENUMERATION,
  EXPECTED_RECEIPT_DATE,
  EXTERNAL_NOTE,
  INTERNAL_NOTE,
  ITEM_STATUS,
  REQUEST,
  ORDER_LINE_LOCATIONS,
  PIECE_FORMAT,
  SEQUENCE,
  SUPPLEMENT,
} = RECEIVING_PIECE_FORM_FIELD_LABELS;

const randomPostfix = getRandomPostfix();
const existingPieceBarcode = `AT_C434137_existing_${randomPostfix}`;
const newPieceDetails = {
  [DISPLAY_SUMMARY]: `AT_C434137_summary_${randomPostfix}`,
  [COPY_NUMBER]: `AT_C434137_copy_${randomPostfix}`,
  [ENUMERATION]: `AT_C434137_enumeration_${randomPostfix}`,
  [CHRONOLOGY]: `AT_C434137_chronology_${randomPostfix}`,
  [EXPECTED_RECEIPT_DATE]: DateTools.getTomorrowDayDateForFiscalYear(),
  [COMMENT]: `AT_C434137_comment_${randomPostfix}`,
  [BARCODE]: `AT_C434137_new_${randomPostfix}`,
  [CALL_NUMBER]: `AT_C434137_call_number_${randomPostfix}`,
  [ACCESSION_NUMBER]: `AT_C434137_accession_${randomPostfix}`,
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
    'C434137 Check "Add piece" form view in "Expected" accordion (Quesnelia +) with barcode uniqueness validation (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C434137'] },
    () => {
      const title = testData.orderLine.titleOrPackage;

      // Step 1: Open the title
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.EXPECTED }]);

      // Step 2: Specify a barcode for the existing piece
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails({ [BARCODE]: existingPieceBarcode });
      EditPieceModal.clickSaveAndCloseButton();

      // Step 3: Open "Add piece" form
      Receiving.addPieceInActions();
      PieceForm.waitLoading();
      EditPieceModal.checkAccordionsConditions([
        {
          label: RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.PIECE_DETAILS,
          conditions: { open: true },
        },
        {
          label: RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.ITEM_DETAILS,
          conditions: { open: false },
        },
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
        { label: SEQUENCE, conditions: { value: '2', disabled: true } },
      ]);
      EditPieceModal.verifyCheckboxState(CREATE_ITEM, false);
      EditPieceModal.verifyCheckboxPresent(SUPPLEMENT);
      EditPieceModal.verifyCheckboxPresent(BOUND, true, true);
      EditPieceModal.verifySaveAndCloseButtonState({ disabled: false });
      EditPieceModal.verifyActionsMenuState({ disabled: false });

      // Step 4: Expand "Item details" accordion, item fields are not editable
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.ITEM_DETAILS);
      EditPieceModal.checkFieldsConditions([
        ...[BARCODE, CALL_NUMBER, ACCESSION_NUMBER].map((label) => ({
          label,
          conditions: { disabled: true },
        })),
        { label: ITEM_STATUS, conditions: { value: NO_VALUE } },
        { label: REQUEST, conditions: { value: NO_VALUE } },
      ]);

      // Step 5: Check "Create item" checkbox, item fields become editable
      EditPieceModal.checkCreateItemCheckbox();
      EditPieceModal.checkFieldsConditions(
        [BARCODE, CALL_NUMBER, ACCESSION_NUMBER].map((label) => ({
          label,
          conditions: { disabled: false },
        })),
      );

      // Steps 6-7: Quick receive the piece with the barcode of the existing piece
      EditPieceModal.fillPieceDetails({ [BARCODE]: existingPieceBarcode });
      EditPieceModal.openActionsMenu();
      Receiving.quickReceivePieceAdd();
      InteractorsTools.checkCalloutErrorMessage(ReceivingStates.barcodeIsNotUnique);
      InteractorsTools.closeCalloutMessage();

      // Step 8: Fill the piece and item fields with valid values
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.ITEM_DETAILS);
      EditPieceModal.checkCreateItemCheckbox();
      EditPieceModal.fillPieceDetails(newPieceDetails);
      EditPieceModal.checkFieldsConditions(
        Object.entries(newPieceDetails).map(([label, value]) => ({ label, conditions: { value } })),
      );

      // Step 9: Quick receive the piece
      EditPieceModal.openActionsMenu();
      Receiving.quickReceivePiece(newPieceDetails[ENUMERATION]);
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.verifyExpectedRecordsCount(1);
      ReceivingDetails.checkExpectedTableContent([{ status: RECEIVING_PIECE_STATUSES.EXPECTED }]);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([
        {
          barcode: newPieceDetails[BARCODE],
          displaySummary: newPieceDetails[DISPLAY_SUMMARY],
          copyNumber: newPieceDetails[COPY_NUMBER],
          enumeration: newPieceDetails[ENUMERATION],
          chronology: newPieceDetails[CHRONOLOGY],
          comment: newPieceDetails[COMMENT],
          format: RECEIVING_PIECE_FORMATS.PHYSICAL,
          receivedDate: formatDate(testData.locale, new Date()),
          holdingsLocation: testData.location.name,
          displayToPublic: false,
          request: '-',
        },
      ]);

      // Step 10: Check receipt status of the PO line
      ReceivingDetails.openOrderLineDetails();
      OrderLineDetails.checkOrderLineDetails({
        poLineInformation: [
          { key: POLINE_DETAILS_FIELDS.RECEIPT_STATUS, value: RECEIPT_STATUS_VIEW.ONGOING },
        ],
      });

      // Steps 11-12: Open the instance, the holding contains items of both pieces
      OrderLineDetails.openInventoryItem();
      InventoryInstance.waitLoading();
      InventoryInstance.checkHoldingsTableContent({
        name: testData.location.name,
        records: [
          { barcode: existingPieceBarcode, status: ITEM_STATUS_NAMES.ON_ORDER },
          {
            barcode: newPieceDetails[BARCODE],
            status: ITEM_STATUS_NAMES.IN_PROCESS,
            copyNumber: newPieceDetails[COPY_NUMBER],
            enumeration: newPieceDetails[ENUMERATION],
            chronology: newPieceDetails[CHRONOLOGY],
          },
        ],
      });

      // Step 13: Open the received item
      InventoryInstance.openItemByBarcode(newPieceDetails[BARCODE]);
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        administrativeData: [
          { label: INVENTORY_ITEMS.BARCODE, conditions: { value: newPieceDetails[BARCODE] } },
          {
            label: INVENTORY_ITEMS.ACCESSION_NUMBER,
            conditions: { value: newPieceDetails[ACCESSION_NUMBER] },
          },
        ],
        itemData: [
          {
            label: INVENTORY_ITEMS.COPY_NUMBER,
            conditions: { value: newPieceDetails[COPY_NUMBER] },
          },
          {
            label: INVENTORY_ITEMS.CALL_NUMBER,
            conditions: { value: newPieceDetails[CALL_NUMBER] },
          },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: newPieceDetails[DISPLAY_SUMMARY] },
          },
          {
            label: INVENTORY_ITEMS.ENUMERATION,
            conditions: { value: newPieceDetails[ENUMERATION] },
          },
          {
            label: INVENTORY_ITEMS.CHRONOLOGY,
            conditions: { value: newPieceDetails[CHRONOLOGY] },
          },
        ],
      });
    },
  );
});
