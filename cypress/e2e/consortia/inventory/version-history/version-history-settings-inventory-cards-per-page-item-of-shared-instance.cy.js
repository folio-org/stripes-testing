import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import VersionHistoryCardsPerPage from '../../../../support/fragments/inventory/versionHistoryCardsPerPage';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Settings', () => {
      describe('Consortia', () => {
        const prefix = 'AT_C1621429';
        const { cardsPerPage } = VersionHistoryCardsPerPage;
        const randomPostfix = getRandomPostfix();
        const testData = {
          instanceTitle: `${prefix}_SharedFolioInstance_${randomPostfix}`,
          itemBarcode: `${prefix}_Item_${randomPostfix}`,
        };

        before('Create test data', () => {
          VersionHistoryCardsPerPage.prepareEnvironment(prefix);
          VersionHistoryCardsPerPage.getMemberReferenceData(testData);

          // Shared Instance (created in Central), its Holdings and Item are created in Member
          InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
            ({ instanceData }) => {
              testData.instanceId = instanceData.instanceId;
            },
          );
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
          if (testData.instanceId) InventoryInstance.deleteInstanceViaApi(testData.instanceId);
          if (testData.user) Users.deleteViaApi(testData.user.userId);
        });

        it(
          'C1621429 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page: Item which belongs to Shared Instance (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'nonParallel', 'C1621429'] },
          () => {
            // Steps 1-2: change the value on Central and save
            VersionHistoryCardsPerPage.changeCentralCardsPerPage(cardsPerPage.updated);
            VersionHistoryCardsPerPage.openInventoryInCentral();

            // Step 6: Central - Item belongs to Member, so Member setting applies (not changed)
            VersionHistoryCardsPerPage.checkItemVersionHistoryFromCentral({
              instanceId: testData.instanceId,
              holdingId: testData.holdingId,
              locationName: testData.location.name,
              barcode: testData.itemBarcode,
            });

            // Step 7: switch to Member
            VersionHistoryCardsPerPage.switchToMemberInventory();

            // Step 14: Member - Member setting applies (not changed)
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
