import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const testData = {};
    const instanceA = BrowseContributors.defaultInstanceAWithContributor;
    const instanceZ = BrowseContributors.defaultInstanceZWithContributor;

    beforeEach('Creating data', () => {
      cy.getAdminToken();

      cy.getInstanceTypes({ limit: 1 }).then((res) => {
        instanceA.instanceTypeId = res[0].id;
        instanceZ.instanceTypeId = res[0].id;
      });

      BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
        instanceA.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
        instanceA.contributors[0].contributorNameType = contributorNameTypes[0].name;
        instanceA.contributors[0].contributorTypeText = contributorNameTypes[0].name;
        instanceZ.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
        instanceZ.contributors[0].contributorNameType = contributorNameTypes[0].name;
        instanceZ.contributors[0].contributorTypeText = contributorNameTypes[0].name;
      });

      BrowseContributors.createInstanceWithContributorViaApi(instanceA);
      BrowseContributors.createInstanceWithContributorViaApi(instanceZ);

      cy.getInstanceById(instanceA.id).then((res) => {
        testData.instanceAProps = res;
      });
      cy.getInstanceById(instanceZ.id).then((res) => {
        testData.instanceZProps = res;
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((resUserProperties) => {
        testData.user = resUserProperties;
        cy.waitForAuthRefresh(() => {
          cy.login(resUserProperties.username, resUserProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });
    });

    afterEach('Deleting data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(instanceA.id);
      InventoryInstance.deleteInstanceViaApi(instanceZ.id);
    });

    it(
      'C353640 Browse contributors with non exact match query (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C353640'] },
      () => {
        BrowseContributors.clickBrowseBtn();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.verifyBrowseOptions();
        BrowseContributors.select();
        BrowseContributors.checkSearch();
        BrowseContributors.waitForContributorToAppear(instanceA.contributors[0].name);
        BrowseContributors.browse(instanceA.contributors[0].name.substring(0, 21));
        BrowseContributors.checkSearchResultsTable();
        BrowseContributors.checkNonExactSearchResult(
          instanceA.contributors[0],
          instanceZ.contributors[0],
        );
        BrowseContributors.resetAllInSearchPane();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
      },
    );
  });
});
