import uuid from 'uuid';
import { LOAN_TYPE_NAMES, MATERIAL_TYPE_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instance: {
          title: `AT_C651583_ItemVersionHistory_${randomPostfix}`,
        },
        item: {
          barcode: `AT_C651583_${randomPostfix}`,
        },
        itemDamagedStatuses: [
          {
            id: uuid(),
            name: `AT_C651583_Damaged_${randomPostfix}`,
            source: 'local',
          },
          {
            id: uuid(),
            name: `AT_C651583_Damaged_updated_${randomPostfix}`,
            source: 'local',
          },
        ],
      };

      function createItemDamagedStatusViaApi(itemDamagedStatus) {
        cy.okapiRequest({
          method: 'POST',
          path: 'item-damaged-statuses',
          body: itemDamagedStatus,
          isDefaultSearchParamsRequired: false,
        });
      }

      function deleteItemDamagedStatusViaApi(itemDamagedStatusId) {
        cy.okapiRequest({
          method: 'DELETE',
          path: `item-damaged-statuses/${itemDamagedStatusId}`,
          isDefaultSearchParamsRequired: false,
          failOnStatusCode: false,
        });
      }

      function getActiveLocations() {
        return cy
          .okapiRequest({
            path: 'locations',
            searchParams: {
              limit: 1000,
              query: '(isActive=true and name<>"AT_*" and name<>"autotest*")',
            },
            isDefaultSearchParamsRequired: false,
          })
          .then(({ body }) => body.locations);
      }

      function openCreatedInstance() {
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instance.title);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstanceRecordViewOpened();
      }

      function openCreatedItem() {
        InventoryInstance.openHoldingsAccordion(testData.holdingLocation.name);
        InventoryInstance.openItemByBarcode(testData.item.barcode);
        ItemRecordView.waitLoading();
      }

      function verifyCurrentVersionHistoryCard(changes) {
        ItemRecordView.clickVersionHistoryButton();
        VersionHistorySection.waitLoading();
        VersionHistorySection.verifyCurrentVersionCard({
          firstName: testData.user.firstName,
          lastName: testData.user.lastName,
          changes,
        });
        VersionHistorySection.clickCloseButton();
      }

      before('Create test data', () => {
        cy.getAdminToken();
        cy.setVersionHistoryRecordsPerPage(10);

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
          InventoryHoldings.getHoldingSources({ limit: 1 }).then((source) => {
            testData.holdingsSourceId = source.id;
          });
          getActiveLocations().then((locations) => {
            testData.holdingLocation = locations[0];
            testData.itemPermanentLocation = locations.find(
              (location) => location.id !== testData.holdingLocation.id,
            );
          });
          cy.getLoanTypes({ limit: 100, query: 'name<>"AT_*"' }).then((loanTypes) => {
            testData.permanentLoanType =
              loanTypes.find(({ name }) => name === LOAN_TYPE_NAMES.CAN_CIRCULATE) || loanTypes[0];
            testData.firstTemporaryLoanType = loanTypes.find(
              ({ id }) => id !== testData.permanentLoanType.id,
            );
            testData.secondTemporaryLoanType = loanTypes.find(
              ({ id }) => id !== testData.firstTemporaryLoanType.id,
            );
          });
        })
          .then(() => {
            testData.itemDamagedStatuses.forEach((itemDamagedStatus) => {
              createItemDamagedStatusViaApi(itemDamagedStatus);
            });

            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.holdingLocation.id,
                  sourceId: testData.holdingsSourceId,
                },
              ],
              items: [],
            }).then((createdInstance) => {
              testData.instance.id = createdInstance.instanceId;
              testData.holding = createdInstance.holdings[0];
            });
          })
          .then(() => {
            cy.createTempUser([]).then((userProperties) => {
              testData.user = userProperties;

              cy.assignCapabilitiesToExistingUser(
                testData.user.userId,
                [],
                [CapabilitySets.uiInventory],
              );

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.setVersionHistoryRecordsPerPage(10);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.id);
        testData.itemDamagedStatuses.forEach((itemDamagedStatus) => {
          deleteItemDamagedStatusViaApi(itemDamagedStatus.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651583 Check "Version history" after creating,editing and deleting non repeatable fields in Item (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651583'] },
        () => {
          openCreatedInstance();

          // Steps 1-2: Add an item from Holdings and fill mandatory fields.
          InventoryInstance.openHoldingsAccordion(testData.holdingLocation.name);
          InventoryInstance.clickAddItemByHoldingId({
            holdingId: testData.holding.id,
            instanceTitle: testData.instance.title,
          });
          ItemRecordEdit.fillItemRecordFields({
            barcode: testData.item.barcode,
            materialType: MATERIAL_TYPE_NAMES.BOOK,
            loanType: testData.permanentLoanType.name,
          });
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          InstanceRecordView.verifyInstanceRecordViewOpened();

          // Step 3: Open created Item details from Holdings.
          openCreatedItem();

          // Steps 4-6: Add Item damaged status and verify Version history.
          ItemRecordView.openItemEditForm(testData.instance.title);
          ItemRecordEdit.chooseItemDamagedStatus(testData.itemDamagedStatuses[0].name);
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();
          verifyCurrentVersionHistoryCard(['Item damaged status (Added)']);

          // Steps 7-8: Edit Item damaged status, add Temporary loan type, and verify Version history.
          ItemRecordView.openItemEditForm(testData.instance.title);
          ItemRecordEdit.chooseItemDamagedStatus(testData.itemDamagedStatuses[1].name);
          ItemRecordEdit.addTemporaryLoanType(testData.firstTemporaryLoanType.name);
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();
          verifyCurrentVersionHistoryCard([
            'Item damaged status (Edited)',
            'Temporary loan type (Added)',
          ]);

          // Steps 9-11: Remove Item damaged status, edit Temporary loan type, add Permanent location, and verify Version history.
          ItemRecordView.openItemEditForm(testData.instance.title);
          ItemRecordEdit.clearItemDamagedStatus();
          ItemRecordEdit.addTemporaryLoanType(testData.secondTemporaryLoanType.name);
          ItemRecordEdit.choosePermanentLocation(testData.itemPermanentLocation.name);
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();
          verifyCurrentVersionHistoryCard([
            'Item damaged status (Removed)',
            'Temporary loan type (Edited)',
            'Permanent (Added)',
          ]);
        },
      );
    });
  });
});
