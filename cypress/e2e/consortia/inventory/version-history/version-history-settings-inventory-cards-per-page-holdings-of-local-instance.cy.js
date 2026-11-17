import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import VersionHistoryCardsPerPage from '../../../../support/fragments/inventory/versionHistoryCardsPerPage';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const prefix = 'AT_C1621428';
        const { cardsPerPage } = VersionHistoryCardsPerPage;
        const testData = {
          instanceTitle: `${prefix}_LocalFolioInstance_${getRandomPostfix()}`,
        };

        before('Create test data', () => {
          VersionHistoryCardsPerPage.prepareEnvironment(prefix);
          VersionHistoryCardsPerPage.getMemberReferenceData(testData);

          // Local Instance with its Holdings (all created in Member)
          cy.setTenant(Affiliations.College);
          InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
            ({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
            },
          );
          cy.resetTenant();
          cy.then(() => {
            VersionHistoryCardsPerPage.createMemberHoldingWithItem(testData.instanceId, testData);
          });
          cy.then(() => {
            cy.setTenant(Affiliations.College);
            VersionHistoryCardsPerPage.updateHoldingsNTimes(testData.holdingId, prefix);
            cy.resetTenant();
          });

          VersionHistoryCardsPerPage.createUserAndLogin(testData);
        });

        after('Delete test data', () => {
          VersionHistoryCardsPerPage.resetCardsPerPageInBothTenants();
          VersionHistoryCardsPerPage.deleteMemberHoldingWithItem(testData);
          cy.setTenant(Affiliations.College);
          if (testData.instanceId) InventoryInstance.deleteInstanceViaApi(testData.instanceId);
          cy.resetTenant();
          if (testData.user) Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C1621428 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page: Holdings which belongs to Local Instance (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C1621428'] },
          () => {
            // Steps 1-2: change the value on Central and save
            VersionHistoryCardsPerPage.changeCentralCardsPerPage(cardsPerPage.updated);

            // Step 7: switch to Member
            VersionHistoryCardsPerPage.switchToMemberInventory();

            // Step 13: Member - Member setting applies (not changed)
            VersionHistoryCardsPerPage.checkHoldingsVersionHistoryInMember(testData.instanceId);
          },
        );
      });
    });
  });
});
