import {
  ITEM_STATUS_NAMES,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLineEditForm,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import {
  CHECKIN_ITEMS_VALUE,
  RECEIVING_WORKFLOWS,
} from '../../support/fragments/orders/basicOrderLine';
import UnopenConfirmationModal from '../../support/fragments/orders/modals/unopenConfirmationModal';
import OrderStates from '../../support/fragments/orders/orderStates';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import MaterialTypes from '../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Orders', () => {
  const QUANTITY = 1;
  let testData;

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C736709_FolioInstance_${getRandomPostfix()}`,
      barcode: `AT_C736709_${getRandomPostfix()}`,
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    MaterialTypes.getMaterialTypesViaApi().then(({ mtypes }) => {
      testData.materialType = mtypes[0];
    });
    cy.getAcquisitionMethodsApi().then(({ body }) => {
      testData.acquisitionMethod = body.acquisitionMethods[0];
    });
    Locations.getViaApiAnyDefault().then((locations) => {
      testData.location = locations[0];
    });

    // Precondition 1: Open order with one POL (Synchronized workflow, Quantity = 1, Instance, Holding, Item)
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        const orderLine = {
          ...BasicOrderLine.getDefaultOrderLine({
            title: testData.instanceTitle,
            purchaseOrderId: order.id,
            acquisitionMethod: testData.acquisitionMethod.id,
            checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
            quantity: QUANTITY,
          }),
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: testData.materialType.id,
            materialSupplier: testData.organization.id,
            volumes: [],
          },
          locations: [
            {
              locationId: testData.location.id,
              quantity: QUANTITY,
              quantityPhysical: QUANTITY,
            },
          ],
        };

        OrderLines.createOrderLineViaApi(orderLine).then((createdOrderLine) => {
          testData.orderLine = createdOrderLine;

          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // Precondition 2: Related piece was received
    cy.then(() => {
      Receivings.getPiecesViaApi(testData.orderLine.id).then((pieces) => {
        Receivings.receivePieceViaApi({
          poLineId: testData.orderLine.id,
          pieces: [{ id: pieces[0].id, barcode: testData.barcode }],
        });
      });
    });

    // Precondition 3: User with required permissions is logged in
    cy.createTempUser([
      Permissions.uiOrdersEdit.gui,
      Permissions.uiReceivingView.gui,
      Permissions.uiOrdersUnopenpurchaseorders.gui,
      Permissions.uiInventoryViewInstances.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 4: User is on "Orders" app with search results for the order
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.searchByParameter('PO number', testData.order.poNumber);
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id, false);
    InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitle);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C736709 Locations in PO line with synchronized workflow is not editable when related received piece exists (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C736709'] },
    () => {
      // Step 1: Click on Order number from precondition #1
      Orders.selectFromResultsList(testData.order.poNumber);
      OrderDetails.checkOrderStatus(ORDER_STATUSES.OPEN);

      // Step 2: Click on "Actions" -> select "Unopen" option
      OrderDetails.unOpenOrder({
        orderNumber: testData.order.poNumber,
        checkinItems: CHECKIN_ITEMS_VALUE[RECEIVING_WORKFLOWS.SYNCHRONIZED],
        confirm: false,
      });

      // Step 3: Click on "Delete items" button
      UnopenConfirmationModal.confirm({ keepHoldings: true });
      InteractorsTools.checkCalloutMessage(
        OrderStates.orderUnopenedSuccessfully(testData.order.poNumber),
      );
      OrderDetails.checkOrderStatus(ORDER_STATUSES.PENDING);

      // Step 4: Open PO line, click "Actions" -> "Edit" and scroll down to the "Location" accordion
      OrderLines.selectPOLInOrder(0);
      OrderLineDetails.waitLoading();
      OrderLineDetails.openOrderLineEditForm();
      OrderLineEditForm.checkLocationIsNonEditable({ locationName: testData.location.name });
      OrderLineEditForm.checkLocationsSection([
        {
          label: 'quantityPhysical',
          index: 0,
          conditions: { value: `${QUANTITY}`, disabled: true },
        },
        { label: 'quantityElectronic', index: 0, conditions: { disabled: true } },
      ]);
      OrderLineEditForm.checkReceivingRecordsMessage(true);

      // Step 5: Click "Edit in receiving" link and click on the Title record in the search result
      OrderLineEditForm.clickEditInReceivingLink();
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyReceivedRecordsCount(1);

      // Step 6: Click on the record in the "Received" accordion
      ReceivingDetails.openEditPieceModal({ row: 0, section: 'Received' });
      EditPieceModal.waitLoading();
      EditPieceModal.checkFieldsConditions([
        {
          label: RECEIVING_PIECE_FORM_FIELD_LABELS.CREATE_ITEM,
          conditions: { value: 'Connected' },
        },
      ]);
      EditPieceModal.verifyItemStatus(ITEM_STATUS_NAMES.IN_PROCESS);
    },
  );
});
