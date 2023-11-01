import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { ITEM_STATUS_NAMES, LOCATION_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import UserEdit from '../../../support/fragments/users/userEdit';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import NewRequest from '../../../support/fragments/requests/newRequest';

describe.skip('inventory', () => {
  describe('Item', () => {
    let user;
    let collectionOfItems = [];
    const testData = {
      instanceTitle: `autotestInstance ${getRandomPostfix()}`,
    };

    before('create test data and login', () => {
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
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
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
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
        InstanceRecordView.verifyInstanceRecordViewOpened();
        cy.wait(1000);
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
      });
    });

    after('delete test data', () => {
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

    it(
      'C10946 Actions menu: New Request (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        [
          'Available',
          'On order',
          'In process',
          'Checked out',
          'In transit',
          'Awaiting pickup',
          'Awaiting delivery',
          'Missing',
          'Paged',
        ].forEach((itemStatus) => {
          InventoryInstance.openItemByStatus(itemStatus);
          InventoryItems.openActions();
          InventoryItems.clickNewRequestButton();
          NewRequest.waitLoadingNewRequestPage();
          NewRequest.checkItemInformationSecton(
            testData.instanceTitle,
            LOCATION_NAMES.MAIN_LIBRARY_UI,
            itemStatus,
          );
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
        });

        ['Declared lost', 'Claimed returned', 'Lost and paid', 'Withdrawn', 'Order closed'].forEach(
          (itemStatus) => {
            cy.visit(TopMenu.inventoryPath);
            InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
            InstanceRecordView.verifyInstanceRecordViewOpened();
            InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
            InventoryInstance.openItemByStatus(itemStatus);
            InventoryItems.openActions();
            InventoryItems.verifyNewRequestButtonIsAbsent();
          },
        );
      },
    );
  });
});
