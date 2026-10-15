import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const postfix = getRandomPostfix();
    const titleAllOption = 'Title (all)';
    const testData = {
      title: `AT_C196763_FolioInstance_${postfix}`,
      alternativeTitle: `AT_C196763_AltTitle_${postfix}`,
      seriesStatement: `AT_C196763_Series_${postfix}`,
      user: {},
      instanceId: null,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();

      cy.getAlternativeTitlesTypes({ limit: 1 }).then((titleTypes) => {
        cy.getInstanceTypes({ limit: 1 }).then(([instanceType]) => {
          cy.createInstance({
            instance: {
              instanceTypeId: instanceType.id,
              title: testData.title,
              alternativeTitles: [
                {
                  alternativeTitleTypeId: titleTypes[0].id,
                  alternativeTitle: testData.alternativeTitle,
                },
              ],
              series: [{ value: testData.seriesStatement }],
            },
          }).then((instanceId) => {
            testData.instanceId = instanceId;
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C196763 Title (all) index includes title, alternative title, and series (promin)',
      { tags: ['extendedPath', 'promin', 'C196763'] },
      () => {
        // Step 1: Search by title proper using "Title (all)" index
        InventoryInstances.searchInstancesWithOption(titleAllOption, testData.title);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.title, true);
        InventoryInstance.waitLoading();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

        // Step 2: Search by alternative title using "Title (all)" index
        InventoryInstances.searchInstancesWithOption(titleAllOption, testData.alternativeTitle);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.title, true);
        InventoryInstance.waitLoading();
        InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();

        // Step 3: Search by series statement using "Title (all)" index
        InventoryInstances.searchInstancesWithOption(titleAllOption, testData.seriesStatement);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.title, true);
        InventoryInstance.waitLoading();
      },
    );
  });
});
