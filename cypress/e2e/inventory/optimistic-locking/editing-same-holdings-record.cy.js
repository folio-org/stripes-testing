import { Permissions } from '../../../support/dictionary';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySteps from '../../../support/fragments/inventory/inventorySteps';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Optimistic locking', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C350658_FolioInstance_${randomPostfix}`,
      copyNumberUpdatedByA: `AT_C350658_CopyNum_A_${randomPostfix}`,
      copyNumberUpdatedByB: `AT_C350658_CopyNum_B_${randomPostfix}`,
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
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [{ permanentLocationId: testData.locationId }],
          }).then((instanceIds) => {
            testData.instanceId = instanceIds.instanceId;
            testData.holdingId = instanceIds.holdingIds[0].id;
          });
        });

      cy.createTempUser([Permissions.uiInventoryViewCreateEditHoldings.gui]).then(
        (userProperties) => {
          userA = userProperties;
        },
      );

      cy.createTempUser([Permissions.uiInventoryViewCreateEditHoldings.gui]).then(
        (userProperties) => {
          userB = userProperties;
        },
      );
    });

    after('Delete test data', () => {
      cy.wait(2000);
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        cy.deleteHoldingRecordViaApi(testData.holdingId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C350658 Editing same holdings record (promin)',
      { tags: ['criticalPath', 'promin', 'C350658'] },
      () => {
        // Steps 1-2: User A opens the holdings record in edit mode
        cy.login(userA.username, userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // User A fills in a copy number (but has NOT saved yet)
        HoldingsRecordEdit.fillCallNumberValues({ copyNumber: testData.copyNumberUpdatedByA });
        HoldingsRecordEdit.checkButtonsEnabled({ saveAndClose: true, saveAndKeep: true });

        // Step 3: While User A has the record open in edit mode, User B (the "other tab")
        // updates and saves the same record via API — incrementing its _version
        cy.getToken(userB.username, userB.password).then(() => {
          cy.getHoldings({ query: `id=="${testData.holdingId}"` }).then((holdings) => {
            cy.updateHoldingRecord(testData.holdingId, {
              ...holdings[0],
              copyNumber: testData.copyNumberUpdatedByB,
            }).then(() => {
              // Switch back to User A's token so subsequent UI actions run as User A
              cy.getToken(userA.username, userA.password);

              // Step 4: User A clicks Save — record is now stale → optimistic locking conflict
              HoldingsRecordEdit.saveAndClose();

              // Step 4: Verify the conflict detection banner is shown
              InventorySteps.verifyOptimisticLockingBanner();

              // Navigate to the latest version and verify User B's changes are applied
              InventorySteps.clickViewLatestVersionLink();
              HoldingsRecordView.waitLoading();
              HoldingsRecordView.checkCopyNumber(testData.copyNumberUpdatedByB);
            });
          });
        });
      },
    );
  });
});
