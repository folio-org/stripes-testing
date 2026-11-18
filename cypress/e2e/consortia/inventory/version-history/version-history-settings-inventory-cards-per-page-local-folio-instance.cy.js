import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import VersionHistoryCardsPerPage from '../../../../support/fragments/inventory/versionHistoryCardsPerPage';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const prefix = 'AT_C1621425';
        const { cardsPerPage } = VersionHistoryCardsPerPage;
        const testData = {
          instanceTitle: `${prefix}_LocalFolioInstance_${getRandomPostfix()}`,
        };

        before('Create test data', () => {
          VersionHistoryCardsPerPage.prepareEnvironment(prefix);

          // Local Instance with source FOLIO (created in Member)
          cy.setTenant(Affiliations.College);
          InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
            ({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
            },
          );
          cy.then(() => {
            VersionHistoryCardsPerPage.updateFolioInstanceNTimes(testData.instanceId, prefix);
          });
          cy.resetTenant();

          VersionHistoryCardsPerPage.createUserAndLogin(testData);
        });

        after('Delete test data', () => {
          VersionHistoryCardsPerPage.resetCardsPerPageInBothTenants();
          cy.setTenant(Affiliations.College);
          if (testData.instanceId) InventoryInstance.deleteInstanceViaApi(testData.instanceId);
          cy.resetTenant();
          if (testData.user) Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C1621425 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page: Local Instance with source FOLIO (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C1621425'] },
          () => {
            // Steps 1-2: change the value on Central and save
            VersionHistoryCardsPerPage.changeCentralCardsPerPage(cardsPerPage.updated);

            // Step 7: switch to Member
            VersionHistoryCardsPerPage.switchToMemberInventory();

            // Step 10: Member - Member setting applies to local Instance (not changed)
            VersionHistoryCardsPerPage.checkFolioInstanceVersionHistory(
              testData.instanceId,
              cardsPerPage.default,
            );
          },
        );
      });
    });
  });
});
