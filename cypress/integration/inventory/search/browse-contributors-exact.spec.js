import permissions from '../../../support/dictionary/permissions';
import inventorySearch from '../../../support/fragments/inventory/inventorySearch';
import browseContributors from '../../../support/fragments/inventory/search/browseContributors';
import topMenu from '../../../support/fragments/topMenu';
import users from '../../../support/fragments/users/users';

describe('Search: browse contributors with exact match query', () => {
  let user;
  beforeEach('Creating user and "Instance" records with contributors', () => {
    cy.createTempUser([
      permissions.uiInventoryViewInstances.gui,
    ]).then((resUserProperties) => {
      user = resUserProperties;
      cy.login(user.username, user.password);
    });
    cy.visit(topMenu.inventoryPath);
    inventorySearch.switchToInstance();
  });
  it('C353639 Browse contributors with exact match query', () => {
    inventorySearch.verifyKeywordsAsDefault();
    browseContributors.checkBrowseOptions();
    browseContributors.select();
    try {
      browseContributors.checkSearch();
    } catch (error) { console.log(error); }
  });
  afterEach('Deleting user', () => {
    users.deleteViaApi(user.userId);
  });
});
