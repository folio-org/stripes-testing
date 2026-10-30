import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  INVENTORY_ITEMS,
  NO_BARCODE,
  ORDER_SEARCH_OPTIONS,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryItems from '../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const { CHRONOLOGY, COPY_NUMBER, DISPLAY_SUMMARY, ENUMERATION } = RECEIVING_PIECE_FORM_FIELD_LABELS;

const randomPostfix = getRandomPostfix();
const itemFields = {
  copyNumber: `AT_C432301_item_copy_${randomPostfix}`,
  enumeration: `AT_C432301_item_enumeration_${randomPostfix}`,
  chronology: `AT_C432301_item_chronology_${randomPostfix}`,
  displaySummary: `AT_C432301_item_summary_${randomPostfix}`,
};
const pieceFields = {
  copyNumber: `AT_C432301_piece_copy_${randomPostfix}`,
  enumeration: `AT_C432301_piece_enumeration_${randomPostfix}`,
  chronology: `AT_C432301_piece_chronology_${randomPostfix}`,
  displaySummary: `AT_C432301_piece_summary_${randomPostfix}`,
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
    item: {},
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

  // Item created for the PO line has the fields populated
  const populateItemFields = () => {
    return InventoryItems.getItemViaApi({
      query: `purchaseOrderLineIdentifier=="${testData.orderLine.id}"`,
    })
      .then(([item]) => InventoryItems.editItemViaApi({ ...item, ...itemFields }))
      .then(() =>
        InventoryItems.getItemViaApi({
          query: `purchaseOrderLineIdentifier=="${testData.orderLine.id}"`,
        }),
      )
      .then(([item]) => {
        testData.item = item;
      });
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiReceivingViewEdit.gui,
      ])
      .then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: `${TopMenu.inventoryPath}/view/${testData.orderLine.instanceId}/${testData.item.holdingsRecordId}/${testData.item.id}`,
          waiter: ItemRecordView.waitLoading,
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
      .then(populateItemFields)
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
    'C432301 Fields are overwritten in Item record ("Inventory" app) when fields are populated with NON-null values in Piece record ("Receiving" app) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C432301'] },
    () => {
      // Step 1: Check the item fields
      ItemRecordView.checkItemRecordDetails({
        itemData: [
          { label: INVENTORY_ITEMS.COPY_NUMBER, conditions: { value: itemFields.copyNumber } },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: itemFields.displaySummary },
          },
          { label: INVENTORY_ITEMS.ENUMERATION, conditions: { value: itemFields.enumeration } },
          { label: INVENTORY_ITEMS.CHRONOLOGY, conditions: { value: itemFields.chronology } },
        ],
      });

      // Steps 2-3: Go to "Orders" app and open the order
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter(ORDER_SEARCH_OPTIONS.PO_NUMBER, testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 4: Click "Actions" button and select "Receive"
      OrderDetails.openReceivingsPage();

      // Step 5: Open the title
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 6: Open the piece, its fields are empty
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions(
        [COPY_NUMBER, ENUMERATION, CHRONOLOGY, DISPLAY_SUMMARY].map((label) => ({
          label,
          conditions: { value: '' },
        })),
      );

      // Steps 7-10: Fill the piece fields with values different from the item ones
      EditPieceModal.fillPieceDetails({
        [COPY_NUMBER]: pieceFields.copyNumber,
        [ENUMERATION]: pieceFields.enumeration,
        [CHRONOLOGY]: pieceFields.chronology,
        [DISPLAY_SUMMARY]: pieceFields.displaySummary,
      });
      EditPieceModal.checkFieldsConditions([
        { label: COPY_NUMBER, conditions: { value: pieceFields.copyNumber } },
        { label: ENUMERATION, conditions: { value: pieceFields.enumeration } },
        { label: CHRONOLOGY, conditions: { value: pieceFields.chronology } },
        { label: DISPLAY_SUMMARY, conditions: { value: pieceFields.displaySummary } },
      ]);

      // Step 11: Save the piece
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkExpectedTableContent([pieceFields]);

      // Step 12: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);

      // Step 13: Open the item, its fields are overwritten with the piece values
      InventoryInstance.openHoldingsAccordion(testData.location.name);
      InventoryInstance.openItemByBarcode(NO_BARCODE);
      ItemRecordView.waitLoading();
      ItemRecordView.checkItemRecordDetails({
        itemData: [
          { label: INVENTORY_ITEMS.COPY_NUMBER, conditions: { value: pieceFields.copyNumber } },
        ],
        enumerationData: [
          {
            label: INVENTORY_ITEMS.DISPLAY_SUMMARY,
            conditions: { value: pieceFields.displaySummary },
          },
          { label: INVENTORY_ITEMS.ENUMERATION, conditions: { value: pieceFields.enumeration } },
          { label: INVENTORY_ITEMS.CHRONOLOGY, conditions: { value: pieceFields.chronology } },
        ],
      });
    },
  );
});
