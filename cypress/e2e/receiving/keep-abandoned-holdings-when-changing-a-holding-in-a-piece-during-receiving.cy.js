import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  LOCATION_NAMES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import DeleteHoldingsModalReceivingFullScreen from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import InteractorsTools from '../../support/utils/interactorsTools';
import InventoryHoldings from '../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingDetails from '../../support/fragments/receiving/receivingDetails';
import ReceivingStates from '../../support/fragments/receiving/receivingStates';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';

describe('Receiving', () => {
  const testData = {
    organization: NewOrganization.getDefaultOrganization(),
    polLocation: {},
    newLocation: {},
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
        testData.polLocation = location;
      })
      .then(() => cy.getLocations({ limit: 1, query: `name=${LOCATION_NAMES.ANNEX_UI}` }))
      .then((location) => {
        testData.newLocation = location;
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
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            specialLocationId: testData.polLocation.id,
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

  const createNewHolding = () => {
    return InventoryHoldings.getHoldingsFolioSource().then((folioSource) => InventoryHoldings.createHoldingRecordViaApi({
      instanceId: testData.orderLine.instanceId,
      permanentLocationId: testData.newLocation.id,
      sourceId: folioSource.id,
    }));
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
      .then(createNewHolding)
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
    'C503244 Keep abandoned holdings when changing a holding in a piece during receiving in "Receiving" app (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C503244'] },
    () => {
      const title = testData.orderLine.titleOrPackage;

      Receiving.searchByParameter({ value: title });
      Receiving.selectFromResultsList(title);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);

      // Step 1: Click on the piece record in "Expected" accordion
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.verifySelectedHolding(testData.polLocation.name);

      // Step 2: Change the current holding to a new one, click "Save & close" button
      EditPieceModal.selectHolding(testData.newLocation.name);
      EditPieceModal.clickSaveAndCloseButton({ pieceSaved: false });

      // Step 3: Click "Keep Holdings" button
      DeleteHoldingsModalReceivingFullScreen.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.KEEP_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(ReceivingStates.pieceSavedSuccessfully);
      ReceivingDetails.checkTitlePaneIsDisplayed(title);
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 4: Navigate to "Inventory" app, search for the title, open the instance
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(title);
      InventoryInstances.selectInstance();
      InventoryInstances.waitLoading();
      InventoryInstance.verifyHoldingsAccordionsCount(2);
      InstanceRecordView.verifyItemsListIsEmpty(testData.polLocation.name);
      InstanceRecordView.verifyItemsListIsEmpty(testData.newLocation.name);
    },
  );
});
