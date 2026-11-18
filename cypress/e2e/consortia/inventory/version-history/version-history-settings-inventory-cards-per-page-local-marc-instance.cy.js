import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import VersionHistoryCardsPerPage from '../../../../support/fragments/inventory/versionHistoryCardsPerPage';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const prefix = 'AT_C1621426';
        const { cardsPerPage } = VersionHistoryCardsPerPage;
        const testData = {
          instanceTitle: `${prefix}_LocalMarcInstance_${getRandomPostfix()}`,
        };

        before('Create test data', () => {
          VersionHistoryCardsPerPage.prepareEnvironment(prefix);

          // Local Instance with source MARC (created in Member)
          cy.setTenant(Affiliations.College);
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            testData.instanceId = instanceId;
          });
          cy.then(() => {
            VersionHistoryCardsPerPage.updateMarcInstanceNTimes(
              testData.instanceId,
              testData.instanceTitle,
            );
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
          'C1621426 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page: Local Instance with source MARC (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C1621426'] },
          () => {
            // Steps 1-2: change the value on Central and save
            VersionHistoryCardsPerPage.changeCentralCardsPerPage(cardsPerPage.updated);

            // Step 7: switch to Member
            VersionHistoryCardsPerPage.switchToMemberInventory();

            // Step 11: Member, view source - Member setting applies to local Instance (not changed)
            VersionHistoryCardsPerPage.checkMarcInstanceVersionHistory(
              testData.instanceId,
              cardsPerPage.default,
            );
          },
        );
      });
    });
  });
});
