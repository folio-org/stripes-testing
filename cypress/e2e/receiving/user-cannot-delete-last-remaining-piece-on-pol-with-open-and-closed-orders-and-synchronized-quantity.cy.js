import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  REQUEST_METHOD,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import DeletePieceModal from '../../support/fragments/receiving/modals/deletePieceModal';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InteractorsTools from '../../support/utils/interactorsTools';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    location: {},
    materialType: {},
    acquisitionMethod: {},
    openOrder: {},
    openOrderLine: {},
    closedOrder: {},
    closedOrderLine: {},
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

  const createOpenedOrder = (orderKey, orderLineKey) => {
    return Orders.createOrderViaApi(
      NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
    )
      .then((order) => {
        testData[orderKey] = order;

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
        testData[orderLineKey] = orderLine;

        return Orders.updateOrderViaApi({
          ...testData[orderKey],
          workflowStatus: ORDER_STATUSES.OPEN,
        });
      })
      .then(() => OrderLines.getOrderLineByIdViaApi(testData[orderLineKey].id))
      .then((orderLine) => {
        testData[orderLineKey] = orderLine;
      });
  };

  const createOpenOrder = () => {
    return createOpenedOrder('openOrder', 'openOrderLine');
  };

  const createClosedOrder = () => {
    return createOpenedOrder('closedOrder', 'closedOrderLine')
      .then(() => Orders.getOrderByIdViaApi(testData.closedOrder.id))
      .then((order) => Orders.updateOrderViaApi({
        ...order,
        workflowStatus: ORDER_STATUSES.CLOSED,
        closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CEASED },
      }));
  };

  const createUserAndLogin = () => {
    return cy
      .createTempUser([
        Permissions.uiOrdersEdit.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiReceivingViewEditDelete.gui,
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
      .then(createOpenOrder)
      .then(createClosedOrder)
      .then(createUserAndLogin);
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    [testData.openOrder, testData.closedOrder].forEach(({ id }) => {
      [ORDER_STATUSES.OPEN, ORDER_STATUSES.PENDING].forEach((workflowStatus) => {
        Orders.getOrderByIdViaApi(id).then((order) => {
          Orders.updateOrderViaApi({ ...order, workflowStatus }, true, false);
        });
      });
      Orders.deleteOrderViaApi(id);
    });
    InventoryInstance.deleteInstanceViaApi(testData.openOrderLine.instanceId);
    InventoryInstance.deleteInstanceViaApi(testData.closedOrderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  const deleteLastPiece = () => {
    cy.intercept(REQUEST_METHOD.DELETE, '**/orders/pieces/*').as('deletePiece');
    EditPieceModal.openActionsMenu();
    EditPieceModal.clickDeleteButton();
    DeletePieceModal.clickDeleteItemButton({ pieceDeleted: false });
    InteractorsTools.checkCalloutErrorMessage(ReceivingStates.lastSynchronizedPieceNotDeleted);
    ReceivingDetails.verifyExpectedRecordsCount(1);
    InteractorsTools.closeCalloutMessage();
  };

  const checkDeletePieceResponse = () => {
    cy.wait('@deletePiece').then((interception) => {
      ReceivingDetails.checkApiErrorResponse(interception, {
        expectedStatus: 422,
        expectedErrorCode: ReceivingStates.lastPieceErrorCode,
        expectedErrorMessage: ReceivingStates.lastSynchronizedPieceDeleteError,
      });
    });
  };

  it(
    'C594357 User cannot delete the last remaining piece on a POL with Open and Closed orders and receipt quantity set to "Synchronized" (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C594357'] },
    () => {
      // Step 1: Click on receiving title from POL from order #1
      Receiving.searchByParameter({ value: testData.openOrderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.openOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.openOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Click on the record in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.verifyModalView();

      // Steps 3-4: Select "Delete" option, select "Delete item" in "Delete piece" popup
      deleteLastPiece();

      // Step 5: Check the response of the request with "422" status
      checkDeletePieceResponse();

      // Step 6: Search for the title from POL from order #2
      Receiving.searchByParameter({ value: testData.closedOrderLine.titleOrPackage });
      Receiving.selectFromResultsList(testData.closedOrderLine.titleOrPackage);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.closedOrderLine.titleOrPackage);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 7: Click on the record, select "Delete" option, select "Delete item" in "Delete piece" popup
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      deleteLastPiece();

      // Step 8: Check the response of the request with "422" status
      checkDeletePieceResponse();
    },
  );
});
