import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';

const capabSetsToAssign = [
  CapabilitySets.uiInventoryInstanceView,
  CapabilitySets.uiInventoryItemCreate,
];

describe('Inventory', () => {
  describe('Item', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceATitle: `AT_C1385644_FolioInstance_A_${randomPostfix}`,
      instanceBTitle: `AT_C1385644_FolioInstance_B_${randomPostfix}`,
      itemBarcode: generateItemBarcode(),
      user: {},
    };

    before('Enable feature, create test data, login', () => {
      cy.getAdminToken();
      cy.setInventoryOptimizeUpdatesSetting(true);

      testData.instanceAId = InventoryInstances.createInstanceViaApi(
        testData.instanceATitle,
        testData.itemBarcode,
      );
      cy.then(() => {
        cy.getHoldings({ limit: 1, query: `"instanceId"="${testData.instanceAId}"` }).then(
          (holdings) => {
            testData.holdingsAId = holdings[0].id;
            testData.holdingsAHrid = holdings[0].hrid;
          },
        );
        cy.getItems({ limit: 1, query: `"barcode"=="${testData.itemBarcode}"` }).then((item) => {
          testData.itemId = item.id;
          testData.itemHrid = item.hrid;
        });
      })
        .then(() => {
          testData.instanceBId = InventoryInstances.createInstanceViaApi(
            testData.instanceBTitle,
            `AT_C1385644_InstanceBItem_${randomPostfix}`,
          );
        })
        .then(() => {
          cy.getHoldings({ limit: 1, query: `"instanceId"="${testData.instanceBId}"` }).then(
            (holdings) => {
              testData.holdingsBHrid = holdings[0].hrid;
            },
          );
          cy.getInstanceById(testData.instanceAId).then((instance) => {
            testData.instanceAHrid = instance.hrid;
          });
          cy.getInstanceById(testData.instanceBId).then((instance) => {
            testData.instanceBHrid = instance.hrid;
          });
        })
        .then(() => {
          cy.createTempUser([]).then((userProperties) => {
            testData.user = userProperties;
            cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
    });

    after('Restore feature setting, delete test data', () => {
      cy.getAdminToken(false);
      cy.setInventoryOptimizeUpdatesSetting(false);
      // Unbind the bound-with item before deletion
      // Reset bound-with item to only its original holding
      InventoryItems.boundItemWithHoldingViaApi(testData.itemId, testData.holdingsAId);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceAId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceBId);
    });

    it(
      'C1385644 Item metadata is not updated after creating bound-with connections to multiple holdings when Prevent redundant updates in Inventory is enabled (promin)',
      { tags: ['criticalPath', 'promin', 'nonParallel', 'C1385644'] },
      () => {
        // Step 1: Search for Instance A, open primary Item in view mode; capture last updated timestamp
        InventoryInstances.searchByTitle(testData.instanceAId);
        InventoryInstances.selectInstanceById(testData.instanceAId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);

        cy.contains('button', /Record last updated:/)
          .invoke('text')
          .then((initialText) => {
            ItemRecordView.openItemEditForm(testData.instanceATitle);

            // Step 2: Click Add bound-with button; verify modal shows item HRID and barcode
            ItemRecordEdit.clickAddBoundWithAndAnalyticsButton();
            ItemRecordEdit.verifyAddBoundWithAndAnalyticsModal(
              testData.itemHrid,
              testData.itemBarcode,
            );

            // Step 3: Enter Holdings B HRID, save modal; verify bound-with row appears in form
            ItemRecordEdit.fillHridAddBoundWithAndAnalyticsModal(testData.holdingsBHrid);
            ItemRecordEdit.saveAddBoundWithAndAnalyticsModal();
            ItemRecordEdit.verifyBoundWithAndAnalyticsRow(
              testData.instanceBHrid,
              testData.instanceBTitle,
              testData.holdingsBHrid,
            );

            // Step 4: Save & close the item record
            ItemRecordEdit.saveAndClose({ itemSaved: true });
            ItemRecordView.waitLoading();

            // Step 5: Verify Record last updated is unchanged
            ItemRecordView.expandAll();
            ItemRecordView.verifyBoundWithAndAnalyticsRow(
              testData.instanceAHrid,
              testData.instanceATitle,
              testData.holdingsAHrid,
              0,
            );
            ItemRecordView.verifyBoundWithAndAnalyticsRow(
              testData.instanceBHrid,
              testData.instanceBTitle,
              testData.holdingsBHrid,
              1,
            );
            ItemRecordView.verifyLastUpdatedDateAndTime(initialText.split('updated: ')[1]);

            // Step 6: Open version history; verify no new entry was created
            ItemRecordView.clickVersionHistoryButton();
            VersionHistorySection.verifyVersionHistoryPane(1);
          });
      },
    );
  });
});
