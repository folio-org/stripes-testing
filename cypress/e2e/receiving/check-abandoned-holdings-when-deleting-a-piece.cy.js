import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  LOCATION_NAMES,
  ORDER_STATUSES,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
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

  const fetchReferenceData = () => {
    return cy
      .getLocations({ limit: 1, query: `name=${LOCATION_NAMES.MAIN_LIBRARY_UI}` })
      .then((location) => {
        testData.location = location;
      })
      .then(() => cy.getBookMaterialType())
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
        Permissions.uiReceivingViewEditDelete.gui,
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
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C503243 Check abandoned holdings when deleting a piece (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C503243'] },
    () => {
      const title = testData.orderLine.titleOrPackage;

      // Step 1: Click the link with title name
      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(0);

      // Step 2: Click "Actions" button in "Expected" accordion, select "Add piece" option
      Receiving.addPieceInActions();
      EditPieceModal.waitLoading();

      // Step 3: Check that "Create item" checkbox is not checked, click "Save & close" button
      EditPieceModal.verifyCheckboxState(RECEIVING_PIECE_FORM_FIELD_LABELS.CREATE_ITEM, false);
      EditPieceModal.clickSaveAndCloseButton();
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 4: Click on just added piece record in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();

      // Step 5: Select "Delete" option, click "Confirm" in "Delete piece" modal
      EditPieceModal.openActionsMenu();
      EditPieceModal.clickDeleteButton({ isLastPiece: false });
      DeletePieceModal.clickConfirmButton();
      ReceivingDetails.verifyExpectedRecordsCount(0);
      ReceivingDetails.verifyReceivedRecordsCount(0);
      ReceivingDetails.verifyUnreceivableRecordsCount(0);

      // Step 6: Navigate to "Inventory" app, search for the title, open the instance
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(title);
      InventoryInstances.selectInstance();
      InventoryInstances.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(1);
      InstanceRecordView.verifyItemsListIsEmpty(testData.location.name);
    },
  );
});
