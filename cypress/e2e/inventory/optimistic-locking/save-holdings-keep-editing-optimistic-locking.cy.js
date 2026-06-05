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
      instanceTitle: `AT_C490890_Instance_${randomPostfix}`,
      copyNumberUpdatedByA: `AT_C490890_CopyNum_A_${randomPostfix}`,
      copyNumberUpdatedByB: `AT_C490890_CopyNum_B_${randomPostfix}`,
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
            items: [],
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
      cy.wait(2000); // Wait for any pending operations to complete before switching authorization tokens
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      cy.deleteHoldingRecordViaApi(testData.holdingId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C490890 Saving record using "Save & keep editing" button when "Holdings" record is being edited by two users (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C490890'] },
      () => {
        // Steps 1-3: User A logs in, navigates to the holding and opens it for editing
        cy.login(userA.username, userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });

        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Step 1: User A updates the copy number field
        HoldingsRecordEdit.fillCallNumberValues({ copyNumber: testData.copyNumberUpdatedByA });
        HoldingsRecordEdit.checkButtonsEnabled({
          saveAndClose: true,
          saveAndKeep: true,
          cancel: true,
        });

        // Steps 2-3: While User A has the holding open, User B updates the same record via API
        // (Cypress does not support multiple browser tabs, so User B's actions are done via API)
        cy.getToken(userB.username, userB.password).then(() => {
          cy.getHoldings({ query: `id=="${testData.holdingId}"` }).then((holdings) => {
            const holdingData = { ...holdings[0], copyNumber: testData.copyNumberUpdatedByB };

            cy.updateHoldingRecord(testData.holdingId, holdingData).then(() => {
              // Switch back to User A's token so the UI session continues as User A
              cy.getToken(userA.username, userA.password);

              // Step 4: User A clicks "Save & keep editing" — triggers optimistic locking conflict
              // because User B has already saved a newer version of the record
              HoldingsRecordEdit.saveAndKeepEditing();

              // Step 4: Verify optimistic locking banner is shown
              InventorySteps.verifyOptimisticLockingBanner();

              // Step 5: Click "View latest version" link on the banner
              InventorySteps.clickViewLatestVersionLink();

              // Step 5: Verify detail view shows User B's changes; User A's changes are NOT applied
              HoldingsRecordView.waitLoading();
              HoldingsRecordView.checkCopyNumber(testData.copyNumberUpdatedByB);
            });
          });
        });
      },
    );
  });
});
