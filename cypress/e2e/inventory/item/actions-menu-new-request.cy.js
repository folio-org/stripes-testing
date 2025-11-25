import uuid from 'uuid';
import { APPLICATION_NAMES, ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import NewRequest from '../../../support/fragments/requests/newRequest';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Item', () => {
    let user;
    let collectionOfItems = [];
    const testData = {
      instanceTitle: `autotestInstance ${getRandomPostfix()}`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locations) => {
              testData.locationsId = locations.id;
            },
          );
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          collectionOfItems = [
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.ON_ORDER },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.IN_PROCESS },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.CHECKED_OUT },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.IN_TRANSIT },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.AWAITING_PICKUP },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.AWAITING_DELIVERY },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.MISSING },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.PAGED },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.DECLARED_LOST },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.CLAIMED_RETURNED },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.LOST_AND_PAID },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.WITHDRAWN },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
            {
              barcode: uuid(),
              status: { name: ITEM_STATUS_NAMES.ORDER_CLOSED },
              permanentLoanType: { id: testData.loanTypeId },
              materialType: { id: testData.materialTypeId },
            },
          ];

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: collectionOfItems,
          }).then((specialInstanceIds) => {
            testData.testInstanceIds = specialInstanceIds;
          });
        });

      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiRequestsCreate.gui,
        Permissions.uiRequestsCreate.gui,
      ]).then((userProperties) => {
        user = userProperties;
        ServicePoints.getViaApi({ limit: 1 }).then((servicePoints) => {
          UserEdit.addServicePointViaApi(servicePoints[0].id, user.userId, servicePoints[0].id);
          cy.login(userProperties.username, userProperties.password);
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"title"=="${testData.instanceTitle}"`,
        }).then((instance) => {
          instance.items.forEach((item) => {
            cy.deleteItemViaApi(item.id);
          });
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    it(
      'C10946 Actions menu: New Request (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C10946'] },
      () => {
        [
          ITEM_STATUS_NAMES.AVAILABLE,
          ITEM_STATUS_NAMES.ON_ORDER,
          ITEM_STATUS_NAMES.IN_PROCESS,
          ITEM_STATUS_NAMES.CHECKED_OUT,
          ITEM_STATUS_NAMES.IN_TRANSIT,
          ITEM_STATUS_NAMES.AWAITING_PICKUP,
          ITEM_STATUS_NAMES.AWAITING_DELIVERY,
          ITEM_STATUS_NAMES.MISSING,
          ITEM_STATUS_NAMES.PAGED,
        ].forEach((itemStatus) => {
          cy.wait(2000);
          InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
          cy.wait(2000);
          InventoryInstance.openItemByStatus(itemStatus);
          InventoryItems.openActions();
          InventoryItems.clickNewRequestButton();
          NewRequest.waitLoadingNewRequestPage();
          NewRequest.checkItemInformationSection(
            testData.instanceTitle,
            LOCATION_NAMES.MAIN_LIBRARY_UI,
            itemStatus,
          );
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          NewRequest.closeCancelEditingModal();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });

        [
          ITEM_STATUS_NAMES.DECLARED_LOST,
          ITEM_STATUS_NAMES.CLAIMED_RETURNED,
          ITEM_STATUS_NAMES.LOST_AND_PAID,
          ITEM_STATUS_NAMES.WITHDRAWN,
          ITEM_STATUS_NAMES.ORDER_CLOSED,
        ].forEach((itemStatus) => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.waitLoading();
          InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.MAIN_LIBRARY_UI);
          cy.wait(2000);
          InventoryInstance.openItemByStatus(itemStatus);
          InventoryItems.openActions();
          InventoryItems.verifyNewRequestButtonIsAbsent();
        });
      },
    );
  });
});
