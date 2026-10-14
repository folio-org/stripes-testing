import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C350659_FolioInstance_${randomPostfix}`,
      barcode: `AT_C350659_ItemBarcode_${randomPostfix}`,
      callNumberUpdatedByA: `AT_C350659_CallNum_A_${randomPostfix}`,
      callNumberUpdatedByB: `AT_C350659_CallNum_B_${randomPostfix}`,
    };
    let userA;
    let userB;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            testData.locationId = res.id;
            testData.locationName = res.name;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [{ permanentLocationId: testData.locationId }],
            items: [
              {
                barcode: testData.barcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((instanceIds) => {
            testData.instanceId = instanceIds.instanceId;
            testData.itemId = instanceIds.holdingIds[0].itemIds[0];
          });
        });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditItems.gui]).then((userProperties) => {
        userA = userProperties;
      });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditItems.gui]).then((userProperties) => {
        userB = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.wait(2000);
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      });
    });

    it(
      'C350659 Editing same item record (promin)',
      { tags: ['criticalPath', 'promin', 'C350659'] },
      () => {
        // Steps 1-2: User A opens the item record in edit mode
        cy.login(userA.username, userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings([testData.locationName]);
        InventoryInstance.openItemByBarcode(testData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(testData.instanceTitle);

        // User A fills in a call number (but has NOT saved yet)
        ItemRecordNew.addCallNumber(testData.callNumberUpdatedByA);
        ItemRecordNew.checkButtonsEnabled({ saveAndClose: true, saveAndKeep: true });

        // Step 3: While User A has the record open in edit mode, User B (the "other tab")
        // updates and saves the same record via API — incrementing its _version
        cy.getToken(userB.username, userB.password).then(() => {
          cy.getItems({ query: `id=="${testData.itemId}"` }).then((item) => {
            cy.updateItemViaApi({
              ...item,
              itemLevelCallNumber: testData.callNumberUpdatedByB,
            }).then(() => {
              // Switch back to User A's token so subsequent UI actions run as User A
              cy.getToken(userA.username, userA.password);

              // Step 4: User A clicks Save — record is now stale → optimistic locking conflict
              ItemRecordNew.save();

              // Step 4: Verify the conflict detection banner is shown
              InventorySteps.verifyOptimisticLockingBanner();

              // Navigate to the latest version and verify User B's changes are applied
              InventorySteps.clickViewLatestVersionLink();
              ItemRecordView.waitLoading();
              ItemRecordView.verifyCallNumber(testData.callNumberUpdatedByB);
            });
          });
        });
      },
    );
  });
});
