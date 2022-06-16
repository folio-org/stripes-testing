import permissions from '../../../support/dictionary/permissions';
import inventorySearch from '../../../support/fragments/inventory/inventorySearch';
import browseContributors from '../../../support/fragments/inventory/search/browseContributors';
import topMenu from '../../../support/fragments/topMenu';
import users from '../../../support/fragments/users/users';

describe('Search: browse contributors with exact match query', () => {
  const testData = {};
  const instanceA = browseContributors.defaultInstanceAWithContributor;
  const instanceZ = browseContributors.defaultInstanceZWithContributor;

  beforeEach('Creating user and "Instance" records with contributors', () => {
    cy.getAdminToken();

    cy.getInstanceTypes({ limit: 1 }).then((res) => {
      instanceA.instanceTypeId = res[0].id;
      instanceZ.instanceTypeId = res[0].id;
    });

    browseContributors.getContributorNameTypes().then((res) => {
      instanceA.contributors[0].contributorNameTypeId = res.body.contributorNameTypes[0].id;
      instanceA.contributors[0].contributorTypeText = res.body.contributorNameTypes[0].name;
      instanceZ.contributors[0].contributorNameTypeId = res.body.contributorNameTypes[0].id;
      instanceZ.contributors[0].contributorTypeText = res.body.contributorNameTypes[0].name;
    });

    browseContributors.createInstanceWithContributorViaApi(instanceA);
    browseContributors.createInstanceWithContributorViaApi(instanceZ);

    cy.getInstanceById(instanceA.id)
      .then((res) => {
        testData.instanceAProps = res;
      });
    cy.getInstanceById(instanceZ.id)
      .then((res) => {
        testData.instanceZProps = res;
      });


    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
    ]).then((resUserProperties) => {
      testData.user = resUserProperties;
      cy.login(resUserProperties.username, resUserProperties.password);
      cy.visit(topMenu.inventoryPath);
    });
  });

  it('C353639 Browse contributors with exact match query', () => {
    inventorySearch.verifyKeywordsAsDefault();
    browseContributors.checkBrowseOptions();
    browseContributors.select();
    browseContributors.checkSearch();
    browseContributors.browse(instanceA.contributors[0].name);
    browseContributors.checkExactSearchResult(instanceA.contributors[0]);
    browseContributors.checkInstanceOrder(instanceA.contributors[0], instanceZ.contributors[0]);
    browseContributors.openInstance(instanceA.contributors[0]);
    browseContributors.checkInstance(instanceA);
  });

  afterEach('Deleting user', () => {
    users.deleteViaApi(testData.user.userId);
    cy.deleteInstanceApi(instanceA.id);
    cy.deleteInstanceApi(instanceZ.id);
  });
});
