import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryInstancesMovement from '../../../../support/fragments/inventory/holdingsMove/inventoryInstancesMovement';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitlePrefix = `AT_C656259_FolioInstance_${randomPostfix}`;
      const testData = {
        folioInstancesA: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix}_A`,
          holdingsCount: 1,
          itemsCount: 1,
        }),
        folioInstancesB: InventoryInstances.generateFolioInstances({
          count: 1,
          instanceTitlePrefix: `${instanceTitlePrefix}_B`,
          holdingsCount: 1,
          itemsCount: 0,
        }),
        statisticalCode: {},
      };

      function openSourceInstance() {
        InventorySearchAndFilter.searchByParameter(
          'Title (all)',
          testData.folioInstancesA[0].instanceTitle,
        );
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
      }

      function openItemVersionHistory() {
        ItemRecordView.clickVersionHistoryButton();
        VersionHistorySection.waitLoading();
      }

      before('Create test data', () => {
        cy.getAdminToken();
        cy.setVersionHistoryRecordsPerPage(10);
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C656259_FolioInstance');

        cy.then(() => {
          cy.getLocations({
            limit: 10,
            query: '(isActive=true and name<>"AT_*") and name<>"autotest*"',
          }).then(() => {
            testData.sourceLocation = Cypress.env('locations')[0];
            testData.targetLocation = Cypress.env('locations')[1];
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstancesA,
              location: testData.sourceLocation,
            });
            InventoryInstances.createFolioInstancesViaApi({
              folioInstances: testData.folioInstancesB,
              location: testData.targetLocation,
            });
          })
          .then(() => {
            StatisticalCodes.createViaApi({
              source: 'local',
              code: `autotest_code_${randomPostfix}`,
              name: `autotest_statistical_code_${randomPostfix}`,
              statisticalCodeTypeId: '3abd6fc2-b3e4-4879-b1e1-78be41769fe3',
            }).then((statisticalCode) => {
              testData.statisticalCode = {
                id: statisticalCode.id,
                code: `ARL (Collection stats):    ${statisticalCode.code} - ${statisticalCode.name}`,
              };
            });
          })
          .then(() => {
            cy.createTempUser([]).then((userProperties) => {
              testData.user = userProperties;

              cy.assignCapabilitiesToExistingUser(
                testData.user.userId,
                [],
                [CapabilitySets.uiInventory, CapabilitySets.uiInventoryItemMove],
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
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstancesA[0].instanceId,
        );
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(
          testData.folioInstancesB[0].instanceId,
        );
        StatisticalCodes.deleteViaApi(testData.statisticalCode.id);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C656259 Check "Version history" after moving item to another holding (folijet)',
        { tags: ['criticalPath', 'folijet', 'C656259'] },
        () => {
          const itemBarcode = testData.folioInstancesA[0].items[0].barcode;

          openSourceInstance();

          // Steps 1-5: Open item, add a statistical code, and verify the new Version history card.
          InventoryInstance.openHoldings(testData.sourceLocation.name);
          InventoryInstance.openItemByBarcode(itemBarcode);
          ItemRecordView.openItemEditForm(testData.folioInstancesA[0].instanceTitle);
          ItemRecordEdit.addStatisticalCode(testData.statisticalCode.code);
          ItemRecordEdit.saveAndClose({ itemSaved: true });
          ItemRecordView.waitLoading();

          openItemVersionHistory();
          VersionHistorySection.verifyCurrentVersionCard({
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            changes: ['Statistical codes (Added)'],
          });
          VersionHistorySection.clickCloseButton();
          ItemRecordView.closeDetailView();
          InventoryInstance.waitLoading();

          // Step 6: Move the item to another holding in another instance.
          InventoryInstance.moveItemToAnotherInstance({
            fromHolding: testData.sourceLocation.name,
            toInstance: testData.folioInstancesB[0].instanceTitle,
            shouldOpen: true,
          });

          // Steps 7-8: Open the moved item from the destination holding and verify Version history cards.
          InventoryInstancesMovement.openDestinationHolding(testData.targetLocation.name);
          InventoryInstancesMovement.openItemInDestinationHolding(
            testData.targetLocation.name,
            itemBarcode,
          );
          openItemVersionHistory();
          VersionHistorySection.verifyVersionHistoryPane(3, false, 3);
          VersionHistorySection.verifyCurrentVersionCard({
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            changes: ['Effective location for item (Edited)', 'holdingsRecordId (Edited)'],
          });
          VersionHistorySection.verifyVersionHistoryCard(
            2,
            undefined,
            undefined,
            undefined,
            true,
            false,
          );
        },
      );
    });
  });
});
