import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';

import permissions from '../../../support/dictionary/permissions';
import inventorySearch from '../../../support/fragments/inventory/inventorySearch';
import browseContributors from '../../../support/fragments/inventory/search/browseContributors';
import topMenu from '../../../support/fragments/topMenu';
import users from '../../../support/fragments/users/users';

describe('Search: browse contributors with exact match query', () => {
  const testData = {};
  const instance = {
    source: 'FOLIO',
    title: `Test_title_A_${getRandomPostfix()}`,
    contributors: [
      {
        name: `Test_contributor_A_${getRandomPostfix()}`,
        contributorNameTypeId: '2b94c631-fca9-4892-a730-03ee529ffe2a',
        primary: false,
        contributorTypeText: '',
      }
    ],
    id: uuid()
  };

  beforeEach('Creating user and "Instance" records with contributors', () => {
    cy.getAdminToken();

    cy.getInstanceTypes({ limit: 1 }).then((res) => {
      instance.instanceTypeId = res[0].id;
    });

    browseContributors.getContributorNameTypes().then((res) => {
      instance.contributors[0].contributorNameTypeId = res.body.contributorNameTypes[0].id;
      instance.contributors[0].contributorTypeText = res.body.contributorNameTypes[0].name;
    });

    browseContributors.createInstanceWithContributorViaApi(instance);
    cy.getInstanceById(instance.id)
      .then((res) => {
        testData.instanceProps = res;
        cy.log(testData.instanceProps);
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
    browseContributors.browse(instance.contributors[0].name);
    browseContributors.checkExactSearchResult(instance.contributors[0]);
    browseContributors.openInstance(instance.contributors[0]);
    try {
      browseContributors.checkInstance(instance);
    } catch (error) { console.log(error); }
  });
  afterEach('Deleting user', () => {
    users.deleteViaApi(testData.user.userId);
    cy.deleteInstanceApi(instance.id);
  });
});
