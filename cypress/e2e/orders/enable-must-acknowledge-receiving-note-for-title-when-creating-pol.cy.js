import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS_VIEW,
  POLINE_DETAILS_FIELDS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_WORKFLOW_NAMES,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import OpenConfirmationModal from '../../support/fragments/orders/modals/openConfirmationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import {
  PieceForm,
  ReceivingDetails,
  ReceivingEditForm,
  Receivings,
} from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import ReceivingNoteModal from '../../support/fragments/receiving/modals/receivingNoteModal';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  let testData;

  before('Create test data', () => {
    const randomPostfix = getRandomPostfix();
    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C354278_Vendor_${randomPostfix}`,
      },
      order: {},
      poLineTitle: `AT_C354278_POLine_${randomPostfix}`,
      receivingNote: `AT_C354278_ReceivingNote_${randomPostfix}`,
      displaySummary: `AT_C354278_DisplaySummary_${randomPostfix}`,
      user: {},
    };

    cy.getAdminToken();
    Locations.getViaApiAnyDefault(1)
      .then(([location]) => {
        testData.location = location;
      })
      .then(() => Organizations.createOrganizationViaApi(testData.organization))
      .then(() => {
        // Precondition: Order in "Pending" status without PO lines
        Orders.createOrderViaApi(NewOrder.getDefaultOrder({ vendorId: testData.organization.id }));
      })
      .then((order) => {
        testData.order = order;
      });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingViewEditCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition: User is on "Orders" pane
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Orders.deleteOrderViaApi(testData.order.id, false);
      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.poLineTitle);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C354278 Enable "Must acknowledge receiving note" for title when creating POL (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C354278'] },
    () => {
      // Step 1: Click on the Order from preconditions
      Orders.selectOrderByPONumber(testData.order.poNumber);
      OrderDetails.waitLoading();

      // Step 2: Click "Actions" in "PO lines" accordion and select "Add PO line"
      OrderDetails.selectAddPOLine();
      OrderLineEditForm.waitLoading();
      OrderLineEditForm.checkItemDetailsSection([
        { label: 'mustAcknowledgeReceivingNote', conditions: { checked: false } },
      ]);

      // Step 3: Fill mandatory fields and "Receiving note", check "Must acknowledge receiving note",
      // choose "Independent order and receipt quantity" receiving workflow, click "Save & close"
      OrderLineEditForm.fillOrderLineFields({
        itemDetails: {
          title: testData.poLineTitle,
          receivingNote: testData.receivingNote,
        },
        poLineDetails: {
          acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.APPROVAL_PLAN,
          orderFormat: ORDER_FORMAT_NAMES.PHYSICAL_RESOURCE,
          receivingWorkflow: RECEIVING_WORKFLOW_NAMES.INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY,
        },
        costDetails: {
          physicalUnitPrice: '10',
          quantityPhysical: '1',
        },
      });
      OrderLineEditForm.clickMustAcknowledgeReceivingNoteCheckbox();
      OrderLines.addCreateInventory(POL_CREATE_INVENTORY_SETTINGS_VIEW.INSTANCE_HOLDING);
      OrderLines.addMaterialType(MATERIAL_TYPE_NAMES.BOOK);
      OrderLineEditForm.clickAddLocationButton();
      OrderLineEditForm.expandLocationDropdown(0);
      OrderLineEditForm.selectLocationFromDropdown(testData.location.name);
      OrderLineEditForm.fillLocationDetails([{ quantityPhysical: '1' }]);
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      OrderLineEditForm.verifyOrderLineEditFormClosed();
      OrderLineDetails.waitLoading();

      // Step 4: Click back arrow on "PO Line details" pane
      OrderLineDetails.backToOrderDetails();
      OrderDetails.waitLoading();

      // Step 5: Click "Actions" on "Purchase order" pane and select "Open"
      OrderDetails.openOrder({ orderNumber: testData.order.poNumber, confirm: false });

      // Step 6: Click "Submit" in "Open - purchase order" popup
      OpenConfirmationModal.confirm();
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 7: Click on created PO line, click "Actions" and select "Receive"
      OrderDetails.openPolDetails(testData.poLineTitle);
      OrderLineDetails.waitLoading();
      OrderLines.openReceiving();
      Receivings.waitLoading();

      // Step 8: Click on Title name from created PO line on "Receiving" pane
      Receivings.selectFromResultsList(testData.poLineTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.poLineTitle);
      ReceivingDetails.checkReceivingDetails({
        orderLineDetails: [
          { key: POLINE_DETAILS_FIELDS.RECEIVING_NOTE, value: testData.receivingNote },
        ],
      });

      // Step 9: Click "Edit" on "Title" pane
      ReceivingDetails.openReceivingEditForm();
      ReceivingEditForm.checkReceivingFormContent({
        itemDetails: { title: testData.poLineTitle },
        lineDetails: {
          receivingNote: testData.receivingNote,
          mustAcknowledgeReceivingNote: true,
        },
      });

      // Step 10: Click "Cancel" button
      ReceivingEditForm.clickCancelButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.poLineTitle);

      // Step 11: Click "Actions" in "Expected" accordion and select "Add piece"
      Receivings.addPieceInActions();
      ReceivingNoteModal.verifyModalView(testData.receivingNote);

      // Step 12: Click "Continue" button
      ReceivingNoteModal.clickContinueButton();
      PieceForm.waitLoading();

      // Step 13: Fill mandatory fields, expand dropdown next to "Save & close" and select "Quick receive"
      EditPieceModal.fillPieceDetails({
        [RECEIVING_PIECE_FORM_FIELD_LABELS.DISPLAY_SUMMARY]: testData.displaySummary,
      });
      Receivings.openDropDownInEditPieceModal();
      Receivings.quickReceivePieceFromDropdown();
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceReceivedSuccessfully);
      ReceivingDetails.verifyReceivedRecordsCount(1);
      ReceivingDetails.checkReceivedTableContent([{ displaySummary: testData.displaySummary }]);
    },
  );
});
