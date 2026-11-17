import { v4 as uuid } from 'uuid';

import {
  DELETE_HOLDINGS_ACTIONS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import SelectLocationModal from '../../support/fragments/orders/modals/selectLocationModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import DeleteHoldingsModal from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

const { BARCODE, COMMENT, CREATE_ITEM, DISPLAY_SUMMARY, INTERNAL_NOTE } =
  RECEIVING_PIECE_FORM_FIELD_LABELS;
const MENU_CLOSED_STATE = [
  { option: RECEIVING_PIECE_FORM_ACTIONS_LABELS.SAVE_AND_CREATE, absent: true },
];

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C1003529_Organization_${postfix}`,
      },
      instanceTitle: `AT_C1003529_FolioInstance_${postfix}`,
      firstPiece: {
        [DISPLAY_SUMMARY]: `AT_C1003529_FirstPiece_Summary_${postfix}`,
        [BARCODE]: `AT_C1003529_FirstPiece_Barcode_${postfix}`,
      },
      secondPiece: {
        [DISPLAY_SUMMARY]: `AT_C1003529_SecondPiece_Summary_${postfix}`,
        [BARCODE]: `AT_C1003529_SecondPiece_Barcode_${postfix}`,
      },
      editedSecondPiece: {
        [DISPLAY_SUMMARY]: `AT_C1003529_EditedSecondPiece_Summary_${postfix}`,
        [BARCODE]: `AT_C1003529_EditedSecondPiece_Barcode_${postfix}`,
        [COMMENT]: `AT_C1003529_EditedSecondPiece_Comment_${postfix}`,
        [INTERNAL_NOTE]: `AT_C1003529_EditedSecondPiece_InternalNote_${postfix}`,
      },
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault(3).then(([polLocation, secondLocation, thirdLocation]) => {
      testData.polLocation = polLocation;
      testData.secondLocation = secondLocation;
      testData.thirdLocation = thirdLocation;
    });
    cy.getBookMaterialType().then((materialType) => {
      testData.materialType = materialType;
    });
    cy.getAcquisitionMethodsApi({ limit: 1 }).then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });

    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          titleOrPackage: testData.instanceTitle,
          // Receiving workflow: Independent order and receipt quantity
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.polLocation.id, quantity: 1, quantityPhysical: 1 }],
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 1,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
        }).then((orderLine) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
          OrderLines.getOrderLineByIdViaApi(orderLine.id).then((openedOrderLine) => {
            testData.orderLine = openedOrderLine;
          });
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [CapabilitySets.uiReceivingCreate, CapabilitySets.uiInventoryInstanceView],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C1003529 Dropdown menu is closed after creating a new holding and selecting "Save and create" another option on "Add piece" and "Edit piece" forms (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1003529'] },
    () => {
      const {
        instanceTitle,
        polLocation,
        secondLocation,
        thirdLocation,
        firstPiece,
        secondPiece,
        editedSecondPiece,
      } = testData;

      // Step 1: Search for the title and click on its record
      Receivings.searchByParameter({ value: instanceTitle });
      Receivings.selectFromResultsList(instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(instanceTitle);

      // Step 2: Click "Actions" in "Expected" accordion and select "Add piece"
      Receivings.addPieceInActions();
      PieceForm.waitLoading();

      // Step 3: Select POL holding, check "Create item", fill "Display summary" and "Barcode",
      // select "Save and create another"
      EditPieceModal.selectHolding(polLocation.name);
      EditPieceModal.checkCreateItemCheckbox();
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.ITEM_DETAILS);
      EditPieceModal.fillPieceDetails(firstPiece);
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSaveAndCreateAnotherButton();
      PieceForm.waitLoading();
      EditPieceModal.checkFieldsConditions(
        Object.entries(firstPiece).map(([label, value]) => ({ label, conditions: { value } })),
      );
      EditPieceModal.verifySelectedHolding(polLocation.name);
      EditPieceModal.verifyCheckboxState(CREATE_ITEM, true);
      EditPieceModal.verifyActionsMenuOptionsStates(MENU_CLOSED_STATE);

      // Step 4: Edit "Display summary" and "Barcode", create new holdings for a different location,
      // select "Save and create another"
      EditPieceModal.fillPieceDetails(secondPiece);
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(secondLocation.name);
      EditPieceModal.verifySelectedLocation(secondLocation.name);
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSaveAndCreateAnotherButton();
      PieceForm.waitLoading();
      EditPieceModal.checkFieldsConditions(
        Object.entries(secondPiece).map(([label, value]) => ({ label, conditions: { value } })),
      );
      EditPieceModal.verifySelectedHolding(secondLocation.name);
      EditPieceModal.verifyCheckboxState(CREATE_ITEM, true);
      EditPieceModal.verifyActionsMenuOptionsStates(MENU_CLOSED_STATE);

      // Step 5: Expand holdings dropdown, both holdings from previous steps are displayed
      EditPieceModal.verifyHoldingOptions([polLocation.name, secondLocation.name]);

      // Step 6: Close "Add piece" form, open the just created piece, edit "Display summary",
      // "Barcode", "Comment" and "Internal note"
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openEditPieceModal({ displaySummary: secondPiece[DISPLAY_SUMMARY] });
      EditPieceModal.waitLoading();
      EditPieceModal.fillPieceDetails(editedSecondPiece);
      EditPieceModal.checkFieldsConditions(
        Object.entries(editedSecondPiece).map(([label, value]) => ({
          label,
          conditions: { value },
        })),
      );

      // Step 7: Create new holdings for a third location, select "Save and create another",
      // delete the holding which becomes empty
      EditPieceModal.clickCreateNewholdingsForLocation();
      SelectLocationModal.selectLocation(thirdLocation.name);
      EditPieceModal.verifySelectedLocation(thirdLocation.name);
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSaveAndCreateAnotherButton(false);
      DeleteHoldingsModal.deleteHoldingsModal({ action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS });
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      PieceForm.waitLoading();
      EditPieceModal.checkFieldsConditions(
        Object.entries(editedSecondPiece).map(([label, value]) => ({
          label,
          conditions: { value },
        })),
      );
      EditPieceModal.verifySelectedLocation(thirdLocation.name);
      EditPieceModal.verifyActionsMenuOptionsStates(MENU_CLOSED_STATE);

      // Step 8: Clear the selected location and expand holdings dropdown, the POL holding and
      // the holding created in Step 7 are displayed
      EditPieceModal.clearSelectedLocation();
      EditPieceModal.verifyHoldingOptions([polLocation.name, thirdLocation.name]);

      // Step 9: Close the form and open the instance, it has two holdings with one item each
      EditPieceModal.clickCancelButton();
      ReceivingDetails.openInstanceDetailsByTitle(instanceTitle);
      InventoryInstance.checkIsHoldingsCreated([polLocation.name, thirdLocation.name]);
      InventoryInstance.verifyHoldingsAbsent(secondLocation.name);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(polLocation.name, 1);
      InventoryInstance.verifyNumberOfItemsInHoldingByName(thirdLocation.name, 1);
    },
  );
});
