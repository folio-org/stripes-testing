import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import { parseSanityParameters } from '../../../support/utils/users';

describe('Inventory', () => {
  describe('Contributors Browse', () => {
    const { user, memberTenant } = parseSanityParameters();

    const testData = {};
    const instanceA = BrowseContributors.defaultInstanceAWithContributor;
    const instanceZ = BrowseContributors.defaultInstanceZWithContributor;

    beforeEach('Creating user and "Instance" records with contributors', () => {
      cy.setTenant(memberTenant.id);
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();

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
      BrowseContributors.waitForContributorToAppear(instanceA.contributors[0].name);

      cy.getInstanceById(instanceA.id).then((res) => {
        testData.instanceAProps = res;
      });
      cy.getInstanceById(instanceZ.id).then((res) => {
        testData.instanceZProps = res;
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
        authRefresh: true,
      });
      cy.allure().logCommandSteps();
    });

    afterEach('Deleting user', () => {
      cy.allure().logCommandSteps(false);
      cy.getUserToken(user.username, user.password, { log: false });
      cy.allure().logCommandSteps();
      InventoryInstance.deleteInstanceViaApi(instanceA.id);
      InventoryInstance.deleteInstanceViaApi(instanceZ.id);
    });

    it(
      'C353639 Browse contributors with exact match query (spitfire)',
      { tags: ['dryRun', 'spitfire', 'C353639'] },
      () => {
        BrowseContributors.clickBrowseBtn();
        InventorySearchAndFilter.verifyKeywordsAsDefault();
        InventorySearchAndFilter.verifyBrowseOptions();
        BrowseContributors.select();
        BrowseContributors.checkSearch();

        BrowseContributors.waitForContributorToAppear(instanceA.contributors[0].name);
        BrowseContributors.browse(instanceA.contributors[0].name);
        BrowseContributors.checkSearchResultsTable();
        BrowseContributors.checkExactSearchResult(
          instanceA.contributors[0],
          instanceZ.contributors[0],
        );
        BrowseContributors.openInstance(instanceA.contributors[0]);
        BrowseContributors.checkInstance(instanceA);
      },
    );
  });
});
