import { v4 as uuid } from 'uuid';

import {
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_FORM_FIELD_LABELS,
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
import { ReceivingDetails, Receivings } from '../../support/fragments/receiving';
import EditPieceModal from '../../support/fragments/receiving/modals/editPieceModal';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: {
        ...NewOrganization.getDefaultOrganization(),
        name: `AT_C594368_Organization_${postfix}`,
      },
      instanceTitle: `AT_C594368_FolioInstance_${postfix}`,
      // View - not active; Edit, Create, Delete - active
      acquisitionUnit: AcquisitionUnits.getDefaultAcquisitionUnit({
        name: `AT_C594368_AcqUnit_${postfix}`,
        protectRead: false,
        protectUpdate: true,
        protectCreate: true,
        protectDelete: true,
      }),
    };

    cy.getAdminToken();
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acquisitionUnit);
    cy.getAdminUserDetails().then((admin) => {
      AcquisitionUnits.assignUserViaApi(admin.id, testData.acquisitionUnit.id).then(
        (membershipId) => {
          testData.adminMembershipId = membershipId;
        },
      );
    });
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
          // Receiving workflow: Synchronized order and receipt quantity
          checkinItems: false,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location.id, quantity: 2, quantityPhysical: 2 }],
          cost: {
            ...BasicOrderLine.defaultOrderLine.cost,
            quantityPhysical: 2,
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
          Receivings.getTitleByPoLineIdViaApi(orderLine.id).then((title) => {
            Receivings.updateTitleViaApi({
              ...title,
              acqUnitIds: [testData.acquisitionUnit.id],
            });
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
      OrderLines.selectOrderline(testData.orderLine.poLineNumber);
      OrderLineDetails.waitLoading();
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken(false);
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.orderLine.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
    AcquisitionUnits.unAssignUserViaApi(testData.adminMembershipId);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id);
  });

  it(
    'C594368 Dropdown with actions menu is not active on piece edit form when all options are disabled (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C594368'] },
    () => {
      // Step 1: Go to "Receiving" app on title from POL details pane
      OrderLines.receiveOrderLineViaActions();
      Receivings.waitLoading();
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      ReceivingDetails.verifyExpectedRecordsCount(2);

      // Step 2: Click on the piece record
      ReceivingDetails.openEditPieceModal();
      EditPieceModal.waitLoading();
      EditPieceModal.verifySaveAndCloseButtonState({ disabled: true });
      EditPieceModal.verifyActionsMenuState({ disabled: true });

      // Step 3: Select empty value in "Piece format" dropdown
      EditPieceModal.selectPieceFormat('');
      cy.wait(2000);
      EditPieceModal.checkFieldsConditions([
        { label: RECEIVING_PIECE_FORM_FIELD_LABELS.PIECE_FORMAT, conditions: { value: '' } },
      ]);
      EditPieceModal.verifySaveAndCloseButtonState({ disabled: true });
      EditPieceModal.verifyActionsMenuState({ disabled: true });

      // Step 4: Click "Cancel" button
      EditPieceModal.clickCancelButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
    },
  );
});
