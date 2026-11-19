import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import VersionHistoryCardsPerPage from '../../../../support/fragments/inventory/versionHistoryCardsPerPage';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const prefix = 'AT_C655282';
        const { cardsPerPage } = VersionHistoryCardsPerPage;
        const testData = {
          instanceTitle: `${prefix}_SharedFolioInstance_${getRandomPostfix()}`,
        };

        before('Create test data', () => {
          VersionHistoryCardsPerPage.prepareEnvironment(prefix);

          // Shared Instance with source FOLIO (created in Central)
          InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
            ({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
            },
          );
          cy.then(() => {
            VersionHistoryCardsPerPage.updateFolioInstanceNTimes(testData.instanceId, prefix);
          });

          VersionHistoryCardsPerPage.createUserAndLogin(testData);
        });

        after('Delete test data', () => {
          VersionHistoryCardsPerPage.resetCardsPerPageInBothTenants();
          if (testData.instanceId) InventoryInstance.deleteInstanceViaApi(testData.instanceId);
          if (testData.user) Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C655282 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page: Shared Instance with source FOLIO (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C655282'] },
          () => {
            // Steps 1-2: change the value on Central and save
            VersionHistoryCardsPerPage.changeCentralCardsPerPage(cardsPerPage.updated);
            VersionHistoryCardsPerPage.openInventoryInCentral();

            // Step 3: Central - Central setting applies
            VersionHistoryCardsPerPage.checkFolioInstanceVersionHistory(
              testData.instanceId,
              cardsPerPage.updated,
            );

            // Step 7: switch to Member
            VersionHistoryCardsPerPage.switchToMemberInventory();

            // Step 8: Member - Central setting applies to shared Instance
            VersionHistoryCardsPerPage.checkFolioInstanceVersionHistory(
              testData.instanceId,
              cardsPerPage.updated,
            );
          },
        );
      });
    });
  });
});
