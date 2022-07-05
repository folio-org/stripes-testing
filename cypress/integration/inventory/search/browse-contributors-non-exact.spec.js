import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearch from '../../../support/fragments/inventory/inventorySearch';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Search: browse contributors with exact match query', () => {
  const testData = {};
  const instanceA = BrowseContributors.defaultInstanceAWithContributor;
  const instanceZ = BrowseContributors.defaultInstanceZWithContributor;

  beforeEach('Creating user and "Instance" records with contributors', () => {
    cy.getAdminToken();

    cy.getInstanceTypes({ limit: 1 }).then((res) => {
      instanceA.instanceTypeId = res[0].id;
      instanceZ.instanceTypeId = res[0].id;
    });

    BrowseContributors.getContributorNameTypes().then((res) => {
      instanceA.contributors[0].contributorNameTypeId = res.body.contributorNameTypes[0].id;
      instanceA.contributors[0].contributorNameType = res.body.contributorNameTypes[0].name;
      instanceA.contributors[0].contributorTypeText = res.body.contributorNameTypes[0].name;
      instanceZ.contributors[0].contributorNameTypeId = res.body.contributorNameTypes[0].id;
      instanceZ.contributors[0].contributorNameType = res.body.contributorNameTypes[0].name;
      instanceZ.contributors[0].contributorTypeText = res.body.contributorNameTypes[0].name;
    });

    BrowseContributors.createInstanceWithContributorViaApi(instanceA);
    BrowseContributors.createInstanceWithContributorViaApi(instanceZ);

    cy.getInstanceById(instanceA.id)
      .then((res) => {
        testData.instanceAProps = res;
      });
    cy.getInstanceById(instanceZ.id)
      .then((res) => {
        testData.instanceZProps = res;
      });

    cy.createTempUser([
      Permissions.uiInventoryViewInstances.gui,
    ]).then((resUserProperties) => {
      testData.user = resUserProperties;
      cy.login(resUserProperties.username, resUserProperties.password);
      cy.visit(TopMenu.inventoryPath);
    });
  });

  it('C353640 Browse contributors with non exact match query', () => {
    InventorySearch.verifyKeywordsAsDefault();
    BrowseContributors.checkBrowseOptions();
    BrowseContributors.select();
    BrowseContributors.checkSearch();
    BrowseContributors.browse(instanceA.contributors[0].name.substring(0, 21));
    BrowseContributors.checkSearchResultsTable();
    BrowseContributors.checkNonExactSearchResult(instanceA.contributors[0], instanceZ.contributors[0]);
    BrowseContributors.resetAllInSearchPane();
    InventorySearch.verifyKeywordsAsDefault();
  });

  afterEach('Deleting user', () => {
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(instanceA.id);
    InventoryInstance.deleteInstanceViaApi(instanceZ.id);
  });
});
