import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVENTORY_ITEMS,
  NO_BARCODE,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import {
  BasicOrderLine,
  NewOrder,
  OrderLines,
  Orders,
  Pieces,
} from '../../support/fragments/orders';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../support/fragments/inventory/item/itemRecordView';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

const { CHRONOLOGY, COPY_NUMBER, DISPLAY_SUMMARY, ENUMERATION } = RECEIVING_PIECE_FORM_FIELD_LABELS;

const randomPostfix = getRandomPostfix();
const pieceFields = {
  copyNumber: `AT_C432304_copy_${randomPostfix}`,
  enumeration: `AT_C432304_enumeration_${randomPostfix}`,
  chronology: `AT_C432304_chronology_${randomPostfix}`,
  displaySummary: `AT_C432304_summary_${randomPostfix}`,
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

  // Piece fields are populated, the values are applied to the related item as well
  const populatePieceFields = () => {
    return Receiving.getPiecesViaApi(testData.orderLine.id).then(([piece]) => {
      return Pieces.updateOrderPieceViaApi({ ...piece, ...pieceFields });
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
      .then(populatePieceFields)
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
    'C432304 Fields are NOT cleared in Item record ("Inventory" app) after these fields were cleared in Piece record ("Receiving" app) (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C432304'] },
    () => {
      // Step 1-3: Open the title
      Receiving.searchByParameter({ value: testData.orderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 4: Open the piece, its fields are populated
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        { label: COPY_NUMBER, conditions: { value: pieceFields.copyNumber } },
        { label: ENUMERATION, conditions: { value: pieceFields.enumeration } },
        { label: CHRONOLOGY, conditions: { value: pieceFields.chronology } },
        { label: DISPLAY_SUMMARY, conditions: { value: pieceFields.displaySummary } },
      ]);

      // Steps 5-8: Clear the piece fields
      EditPieceModal.fillPieceDetails({
        [COPY_NUMBER]: '',
        [ENUMERATION]: '',
        [CHRONOLOGY]: '',
        [DISPLAY_SUMMARY]: '',
      });
      EditPieceModal.checkFieldsConditions(
        [COPY_NUMBER, ENUMERATION, CHRONOLOGY, DISPLAY_SUMMARY].map((label) => ({
          label,
          conditions: { value: '' },
        })),
      );

      // Step 9: Save the piece, its fields are empty
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.orderLine.titleOrPackage);
      ReceivingDetails.checkExpectedTableContent([
        { copyNumber: '-', enumeration: '-', chronology: '-', displaySummary: '-' },
      ]);

      // Step 10: Click on the title name link
      ReceivingDetails.openInstanceDetails();
      InventoryInstance.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);

      // Step 11: Open the item, its fields are not cleared
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
