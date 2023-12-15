import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory -> Contributors Browse', () => {
  const testData = {};
  const instanceA = BrowseContributors.defaultInstanceAWithContributor;
  const instanceZ = BrowseContributors.defaultInstanceZWithContributor;
  const dummyInstanceWithContributors = {
    source: 'FOLIO',
    title: `Test_title__${getRandomPostfix()}`,
    contributors: [
      {
        name: `___A_test_contributor_${getRandomPostfix()}`,
        primary: false,
      },
      {
        name: `___A_test_contributor_${getRandomPostfix()}`,
        primary: false,
      },
      {
        name: `___A_test_contributor_${getRandomPostfix()}`,
        primary: false,
      },
      {
        name: `___A_test_contributor_${getRandomPostfix()}`,
        primary: false,
      },
      {
        name: `___A_test_contributor_${getRandomPostfix()}`,
        primary: false,
      },
    ],
    id: uuid(),
  };

  beforeEach('Creating data', () => {
    cy.getAdminToken();

    cy.getInstanceTypes({ limit: 1 }).then((res) => {
      instanceA.instanceTypeId = res[0].id;
      instanceZ.instanceTypeId = res[0].id;
      dummyInstanceWithContributors.instanceTypeId = res[0].id;
    });

    BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
      instanceA.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
      instanceA.contributors[0].contributorNameType = contributorNameTypes[0].name;
      instanceA.contributors[0].contributorTypeText = contributorNameTypes[0].name;
      instanceZ.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
      instanceZ.contributors[0].contributorNameType = contributorNameTypes[0].name;
      instanceZ.contributors[0].contributorTypeText = contributorNameTypes[0].name;
      dummyInstanceWithContributors.contributors.forEach((contributor) => {
        contributor.contributorNameTypeId = contributorNameTypes[0].id;
        contributor.contributorNameType = contributorNameTypes[0].name;
        contributor.contributorTypeText = contributorNameTypes[0].name;
      });
    });

    BrowseContributors.createInstanceWithContributorViaApi(instanceA);
    BrowseContributors.createInstanceWithContributorViaApi(instanceZ);
    BrowseContributors.createInstanceWithContributorViaApi(dummyInstanceWithContributors);
    // wait for all instances to be created
    cy.wait(6000);

    cy.getInstanceById(instanceA.id).then((res) => {
      testData.instanceAProps = res;
    });
    cy.getInstanceById(instanceZ.id).then((res) => {
      testData.instanceZProps = res;
    });

    cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((resUserProperties) => {
      testData.user = resUserProperties;
      cy.login(resUserProperties.username, resUserProperties.password);
      cy.visit(TopMenu.inventoryPath);
    });
  });

  afterEach('Deleting data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    InventoryInstance.deleteInstanceViaApi(instanceA.id);
    InventoryInstance.deleteInstanceViaApi(instanceZ.id);
    InventoryInstance.deleteInstanceViaApi(dummyInstanceWithContributors.id);
  });

  it(
    'C353640 Browse contributors with non-exact match query (spitfire)',
    { tags: ['smoke', 'spitfire'] },
    () => {
      BrowseContributors.clickBrowseBtn();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
      InventorySearchAndFilter.verifyBrowseOptions();
      BrowseContributors.select();
      BrowseContributors.checkSearch();
      BrowseContributors.browse(instanceA.contributors[0].name.substring(0, 21));
      BrowseContributors.checkSearchResultsTable();
      BrowseContributors.checkNonExactSearchResult(
        instanceA.contributors[0],
        instanceZ.contributors[0],
        5,
      );
      BrowseContributors.resetAllInSearchPane();
      InventorySearchAndFilter.verifyKeywordsAsDefault();
    },
  );
});
