import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import VersionHistoryCardsPerPage from '../../../../support/fragments/inventory/versionHistoryCardsPerPage';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const prefix = 'AT_C1621430';
        const { cardsPerPage } = VersionHistoryCardsPerPage;
        const randomPostfix = getRandomPostfix();
        const testData = {
          instanceTitle: `${prefix}_LocalFolioInstance_${randomPostfix}`,
          itemBarcode: `${prefix}_Item_${randomPostfix}`,
        };

        before('Create test data', () => {
          VersionHistoryCardsPerPage.prepareEnvironment(prefix);
          VersionHistoryCardsPerPage.getMemberReferenceData(testData);

          // Local Instance with its Holdings and Item (all created in Member)
          cy.setTenant(Affiliations.College);
          InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
            ({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
            },
          );
          cy.resetTenant();
          cy.then(() => {
            VersionHistoryCardsPerPage.createMemberHoldingWithItem(
              testData.instanceId,
              testData,
              testData.itemBarcode,
            );
          });
          cy.then(() => {
            cy.setTenant(Affiliations.College);
            VersionHistoryCardsPerPage.updateItemNTimes(testData.itemBarcode, prefix);
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
          'C1621430 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page: Item which belongs to Local Instance (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C1621430'] },
          () => {
            // Steps 1-2: change the value on Central and save
            VersionHistoryCardsPerPage.changeCentralCardsPerPage(cardsPerPage.updated);

            // Step 7: switch to Member
            VersionHistoryCardsPerPage.switchToMemberInventory();

            // Step 15: Member - Member setting applies (not changed)
            VersionHistoryCardsPerPage.checkItemVersionHistoryInMember({
              instanceId: testData.instanceId,
              locationName: testData.location.name,
              barcode: testData.itemBarcode,
            });
          },
        );
      });
    });
  });
});
