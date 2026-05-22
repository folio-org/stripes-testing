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
      instanceTitle: `AT_C400647_FolioInstance_${randomPostfix}`,
      barcode: `AT_C400647_ItemBarcode_${randomPostfix}`,
      callNumberUpdatedByA: `AT_C400647_CallNum_A_${randomPostfix}`,
      callNumberUpdatedByB: `AT_C400647_CallNum_B_${randomPostfix}`,
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
      cy.wait(2000); // Wait for any pending operations to complete before switching authorization tokens
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
    });

    it(
      'C400647 Saving record using "Save & keep editing" button when "Item" record is being edited by two users (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C400647'] },
      () => {
        // Steps 1-3: User A logs in, navigates to the item and opens it for editing
        cy.login(userA.username, userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });

        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldings([testData.locationName]);
        InventoryInstance.openItemByBarcode(testData.barcode);
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(testData.instanceTitle);

        // Step 1: User A updates the call number field
        ItemRecordNew.addCallNumber(testData.callNumberUpdatedByA);
        ItemRecordNew.checkButtonsEnabled({
          saveAndClose: true,
          saveAndKeep: true,
          cancel: true,
        });

        // Steps 2-3: While User A has the item open, User B updates the same record via API
        // (Cypress does not support multiple browser tabs, so User B's actions are done via API)
        cy.getToken(userB.username, userB.password).then(() => {
          cy.getItems({ query: `id=="${testData.itemId}"` }).then((item) => {
            const itemData = { ...item, itemLevelCallNumber: testData.callNumberUpdatedByB };

            cy.updateItemViaApi(itemData).then(() => {
              // Switch back to User A's token so the UI session continues as User A
              cy.getToken(userA.username, userA.password);

              // Step 4: User A clicks "Save & keep editing" — triggers optimistic locking conflict
              // because User B has already saved a newer version of the record
              ItemRecordNew.saveAndKeepEditing();

              // Step 4: Verify optimistic locking banner is shown
              InventorySteps.verifyOptimisticLockingBanner();

              // Step 5: Click "View latest version" link on the banner
              InventorySteps.clickViewLatestVersionLink();

              // Step 5: Verify detail view shows User B's changes; User A's changes are NOT applied
              ItemRecordView.waitLoading();
              ItemRecordView.verifyCallNumber(testData.callNumberUpdatedByB);
            });
          });
        });
      },
    );
  });
});
