import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import VersionHistoryCardsPerPage from '../../../../support/fragments/inventory/versionHistoryCardsPerPage';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const prefix = 'AT_C1621424';
        const { cardsPerPage } = VersionHistoryCardsPerPage;
        const testData = {
          instanceTitle: `${prefix}_SharedMarcInstance_${getRandomPostfix()}`,
        };

        before('Create test data', () => {
          VersionHistoryCardsPerPage.prepareEnvironment(prefix);

          // Shared Instance with source MARC (created in Central)
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            testData.instanceId = instanceId;
          });
          cy.then(() => {
            VersionHistoryCardsPerPage.updateMarcInstanceNTimes(
              testData.instanceId,
              testData.instanceTitle,
            );
          });

          VersionHistoryCardsPerPage.createUserAndLogin(testData);
        });

        after('Delete test data', () => {
          VersionHistoryCardsPerPage.resetCardsPerPageInBothTenants();
          if (testData.instanceId) InventoryInstance.deleteInstanceViaApi(testData.instanceId);
          if (testData.user) Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C1621424 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page: Shared Instance with source MARC (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C1621424'] },
          () => {
            // Steps 1-2: change the value on Central and save
            VersionHistoryCardsPerPage.changeCentralCardsPerPage(cardsPerPage.updated);
            VersionHistoryCardsPerPage.openInventoryInCentral();

            // Step 4: Central, view source - Central setting applies
            VersionHistoryCardsPerPage.checkMarcInstanceVersionHistory(
              testData.instanceId,
              cardsPerPage.updated,
            );

            // Step 7: switch to Member
            VersionHistoryCardsPerPage.switchToMemberInventory();

            // Step 9: Member, view source - Central setting applies to shared Instance
            VersionHistoryCardsPerPage.checkMarcInstanceVersionHistory(
              testData.instanceId,
              cardsPerPage.updated,
            );
          },
        );
      });
    });
  });
});
