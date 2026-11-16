import { v4 as uuid } from 'uuid';

import {
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_ACCORDIONS_LABELS,
  RECEIVING_PIECE_FORM_ACTIONS_LABELS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
  RECEIVING_PIECE_FORMATS,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { PieceForm, ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const { ACCESSION_NUMBER, BARCODE, CALL_NUMBER, CREATE_ITEM, PIECE_FORMAT } =
  RECEIVING_PIECE_FORM_FIELD_LABELS;

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C503040_Organization_${postfix}`,
      },
      instanceTitle: `AT_C503040_FolioInstance_${postfix}`,
      pieceBarcode: `AT_C503040_Piece_Barcode_${postfix}`,
    };

    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Locations.getViaApiAnyDefault().then(([location]) => {
      testData.location = location;
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
          orderFormat: ORDER_FORMAT_VALUES.PE_MIX,
          locations: [
            { locationId: testData.location.id, quantityPhysical: 1, quantityElectronic: 1 },
          ],
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            listUnitPriceElectronic: 10,
            quantityPhysical: 1,
            quantityElectronic: 1,
          },
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
          eresource: {
            activated: false,
            trial: false,
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING,
            accessProvider: testData.organization.id,
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
        [
          CapabilitySets.uiInventoryInstanceView,
          CapabilitySets.uiOrdersOrdersView,
          CapabilitySets.uiReceivingCreate,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.orderLinesPath,
        waiter: OrderLines.waitLoading,
      });
      OrderLines.searchByParameter('Keyword', testData.orderLine.poLineNumber);
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
    'C503040 Item details are cleared when selecting "Save and create another" option for adding electronic piece (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C503040'] },
    () => {
      // Step 1: Click on POL number in the search result pane
      OrderLines.selectOrderline(testData.orderLine.poLineNumber);
      OrderLineDetails.waitLoading();

      // Step 2: Click "Actions" on PO line details pane and select "Receive"
      OrderLines.receiveOrderLineViaActions();
      Receivings.waitLoading();
      Receivings.checkTitleInReceivingList(testData.instanceTitle);

      // Step 3: Click on POL title on search result pane
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);

      // Step 4: Click "Actions" in "Expected" accordion and select "Add piece"
      Receivings.addPieceInActions();
      PieceForm.waitLoading();

      // Step 5: Select "Physical" option from "Piece format" dropdown
      EditPieceModal.selectPieceFormat(RECEIVING_PIECE_FORMATS.PHYSICAL);
      EditPieceModal.verifyCheckboxPresent(CREATE_ITEM);

      // Step 6: Select holding from "Select holdings" dropdown
      EditPieceModal.selectHolding(testData.location.name);
      EditPieceModal.verifySelectedHolding(testData.location.name);

      // Step 7: Check "Create item" checkbox
      EditPieceModal.checkCreateItemCheckbox();

      // Step 8: Add unique barcode in "Item details" accordion
      EditPieceModal.expandAccordion(RECEIVING_PIECE_FORM_ACCORDIONS_LABELS.ITEM_DETAILS);
      EditPieceModal.fillPieceDetails({ [BARCODE]: testData.pieceBarcode });
      EditPieceModal.checkFieldsConditions([
        { label: BARCODE, conditions: { value: testData.pieceBarcode } },
      ]);

      // Step 9: Expand actions menu next to "Save & close" and select "Save and create another"
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickSaveAndCreateAnotherButton();
      PieceForm.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: PIECE_FORMAT, conditions: { value: RECEIVING_PIECE_FORMATS.PHYSICAL } },
        { label: BARCODE, conditions: { value: testData.pieceBarcode } },
      ]);
      EditPieceModal.verifySelectedHolding(testData.location.name);
      EditPieceModal.verifyCheckboxState(CREATE_ITEM, true);
      EditPieceModal.verifyActionsMenuOptionsStates([
        { option: RECEIVING_PIECE_FORM_ACTIONS_LABELS.SAVE_AND_CREATE, absent: true },
      ]);

      // Step 10: Select "Electronic" option from "Piece format" dropdown
      EditPieceModal.selectPieceFormat(RECEIVING_PIECE_FORMATS.ELECTRONIC);
      EditPieceModal.verifyCheckboxPresent(CREATE_ITEM, false);
      EditPieceModal.checkFieldsConditions(
        [BARCODE, CALL_NUMBER, ACCESSION_NUMBER].map((label) => ({
          label,
          conditions: { value: '', disabled: true },
        })),
      );
    },
  );
});
