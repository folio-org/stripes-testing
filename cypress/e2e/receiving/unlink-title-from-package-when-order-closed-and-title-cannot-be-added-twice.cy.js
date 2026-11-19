import { v4 as uuid } from 'uuid';

import {
  APPLICATION_NAMES,
  DELETE_HOLDINGS_ACTIONS,
  ORDER_FORMAT_VALUES,
  ORDER_STATUSES,
  ORDER_SYSTEM_CLOSING_REASONS,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES,
} from '../../support/constants';
import CapabilitySets from '../../support/dictionary/capabilitySets';
import { InventoryInstance, InventoryInstances } from '../../support/fragments/inventory';
import {
  BasicOrderLine,
  NewOrder,
  OrderDetails,
  OrderLineDetails,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { ReceivingDetails, ReceivingEditForm, Receivings } from '../../support/fragments/receiving';
import DeleteHoldingsModal from '../../support/fragments/receiving/modals/deleteHoldingsModaReceivinglFullScreen';
import RemoveFromPackageModal from '../../support/fragments/receiving/modals/removeFromPackageModal';
import Locations from '../../support/fragments/settings/tenant/location-setup/locations';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Receiving', () => {
  let testData;

  before('Create test data', () => {
    const postfix = getRandomPostfix();

    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      instanceTitle: `AT_C736758_FolioInstance_${postfix}`,
      packageName: `AT_C736758_Package_${postfix}`,
      pieceDisplaySummary: `AT_C736758_Piece_${postfix}`,
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
    // Instance without holdings and items
    InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
      ({ instanceData }) => {
        testData.instanceId = instanceData.instanceId;
      },
    );

    // "Ongoing" order with package PO line, the instance is added to "Package titles"
    cy.then(() => {
      Orders.createOrderViaApi(
        NewOrder.getDefaultOngoingOrder({ vendorId: testData.organization.id }),
      ).then((order) => {
        testData.order = order;

        OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          id: uuid(),
          purchaseOrderId: order.id,
          isPackage: true,
          titleOrPackage: testData.packageName,
          checkinItems: true,
          acquisitionMethod: testData.acquisitionMethod.id,
          orderFormat: ORDER_FORMAT_VALUES.PHYSICAL_RESOURCE,
          locations: [{ locationId: testData.location.id, quantity: 1, quantityPhysical: 1 }],
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
          testData.orderLine = orderLine;

          OrderLines.addPackageTitleViaApi({
            title: testData.instanceTitle,
            poLineId: orderLine.id,
            instanceId: testData.instanceId,
          }).then(({ body: title }) => {
            testData.titleId = title.id;
          });
          Orders.updateOrderViaApi({ ...order, workflowStatus: ORDER_STATUSES.OPEN });
        });
      });
    });

    // One piece with related item ("Create item" checkbox is checked), then the order is closed
    cy.then(() => {
      Receivings.addPieceViaApi(
        {
          poLineId: testData.orderLine.id,
          poLineNumber: testData.orderLine.poLineNumber,
          format: testData.orderLine.orderFormat,
          searchParams: { createItem: true },
        },
        {
          titleId: testData.titleId,
          locationId: testData.location.id,
          displaySummary: testData.pieceDisplaySummary,
        },
      );
      cy.then(() => {
        Orders.updateOrderViaApi({
          ...testData.order,
          workflowStatus: ORDER_STATUSES.CLOSED,
          closeReason: { reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED },
        });
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      testData.user = userProperties;

      cy.assignCapabilitiesToExistingUser(
        testData.user.userId,
        [],
        [
          CapabilitySets.uiOrdersOrdersEdit,
          CapabilitySets.uiReceivingDelete,
          CapabilitySets.uiInventoryInstanceView,
        ],
      );

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.receivingPath,
        waiter: Receivings.waitLoading,
      });
      Receivings.searchByParameter({ value: testData.instanceTitle });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.deleteOrderViaApi(testData.order.id);
    InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    "C736758 Unlink title from Package when related order was closed and verify that title can't be added twice to package (thunderjet)",
    { tags: ['extendedPath', 'thunderjet', 'C736758'] },
    () => {
      // Step 1: Click on Title record related to POL from Preconditions
      Receivings.selectFromResultsList(testData.instanceTitle);
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);
      Receivings.checkPurchaseOrderClosedWarning({
        reason: ORDER_SYSTEM_CLOSING_REASONS.CANCELLED,
      });
      ReceivingDetails.verifyExpectedRecordsCount(1);

      // Step 2: Click "Actions" button on the "Title name" pane and select "Remove from package"
      ReceivingDetails.clickRemoveFromPackageOption();
      RemoveFromPackageModal.verifyModalView();

      // Step 3: Click "Cancel" button in the "Remove from package" pop up
      RemoveFromPackageModal.clickCancelButton();
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);

      // Step 4: Select "Remove from package" option and click "Confirm" button
      ReceivingDetails.clickRemoveFromPackageOption();
      RemoveFromPackageModal.clickConfirmButton({ titleRemoved: false });

      // Step 5: Click "Cancel" button ("Delete Holdings" pop up content is verified before click)
      DeleteHoldingsModal.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.CANCEL,
        message: RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.DELETE_HOLDINGS,
      });
      ReceivingDetails.checkTitlePaneIsDisplayed(testData.instanceTitle);

      // Step 6: Select "Remove from package", click "Confirm" and "Delete Holdings" buttons
      ReceivingDetails.clickRemoveFromPackageOption();
      RemoveFromPackageModal.clickConfirmButton({ titleRemoved: false });
      DeleteHoldingsModal.deleteHoldingsModal({
        action: DELETE_HOLDINGS_ACTIONS.DELETE_HOLDINGS,
        message: RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.DELETE_HOLDINGS,
      });
      InteractorsTools.checkCalloutMessage(RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES.SUCCESS);
      Receivings.assertReceivingResults([]);

      // Step 7: Navigate to the "Inventory" app and search for the Instance
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.instanceTitle);
      InventoryInstances.selectInstanceByTitle(testData.instanceTitle);
      InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
      InventoryInstance.verifyHoldingsAccordionsCount(0);
      InventoryInstance.verifyOrdersCount(0);

      // Step 8: Navigate to the "Orders" app, search for the order and click on its number
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      Orders.selectOrdersPane();
      Orders.searchByParameter('PO number', testData.order.poNumber);
      Orders.selectFromResultsList(testData.order.poNumber);

      // Step 9: Click on the record in the "PO lines" accordion
      OrderDetails.selectPOLInOrder();
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitlesCount(0);

      // Step 10: Click "Add" button in the "Package titles" accordion, search for Instance and click on it
      OrderLines.clickAddPackageTitleButton();
      OrderLines.selectInstanceInSelectInstanceModal(testData.instanceTitle);
      OrderLines.varifyAddingInstanceTPackageTitle(testData.instanceTitle, testData.order.poNumber);
      OrderLines.verifyPackageTitlesCount(1);

      // Steps 11-12: uncomment when UIOR-1438 (duplicate link modal) is implemented
      // and add verifyDuplicatePackageTitleModal / confirmDuplicatePackageTitleModal to OrderLines
      // // Step 11: Click "Add" button in the "Package titles" accordion and select the same Instance
      // OrderLines.clickAddPackageTitleButton();
      // OrderLines.selectInstanceInSelectInstanceModal(testData.instanceTitle);
      // OrderLines.verifyDuplicatePackageTitleModal();
      //
      // // Step 12: Click "Confirm" button
      // OrderLines.confirmDuplicatePackageTitleModal();
      // OrderLines.verifyPackageTitlesCount(1);

      // Step 13: Click on the title row, click "Remove from package" button and "Confirm" button
      OrderLines.clickPackageTitleRow(testData.instanceTitle);
      ReceivingEditForm.waitLoading();
      ReceivingEditForm.clickRemoveFromPackageButton();
      RemoveFromPackageModal.clickConfirmButton();
      OrderLineDetails.waitLoading();
      OrderLines.expandPackageTitles();
      OrderLines.verifyPackageTitlesCount(0);

      // Step 14: Click "Add" button in the "Package titles" accordion and select the same Instance
      OrderLines.clickAddPackageTitleButton();
      OrderLines.selectInstanceInSelectInstanceModal(testData.instanceTitle);
      OrderLines.varifyAddingInstanceTPackageTitle(testData.instanceTitle, testData.order.poNumber);
      OrderLines.verifyPackageTitlesCount(1);

      // Steps 15-16: uncomment when UIOR-1438 (duplicate link modal) is implemented
      // and add verifyDuplicatePackageTitleModal / confirmDuplicatePackageTitleModal to OrderLines
      // // Step 15: Click "Add" button in the "Package titles" accordion and select the same Instance
      // OrderLines.clickAddPackageTitleButton();
      // OrderLines.selectInstanceInSelectInstanceModal(testData.instanceTitle);
      // OrderLines.verifyDuplicatePackageTitleModal();
      //
      // // Step 16: Click "Confirm" button
      // OrderLines.confirmDuplicatePackageTitleModal();
      // OrderLines.verifyPackageTitlesCount(1);
    },
  );
});
