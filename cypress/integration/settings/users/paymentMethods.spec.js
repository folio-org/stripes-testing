import uuid from 'uuid';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';

describe('ui-users-settings: payments methods in Fee/fine', () => {
  const specialOwnerIds = [];
  before(() => {
    cy.loginAsAdmin();
    cy.getAdminToken().then(() => {
      UsersOwners.createViaApi({ owner: uuid() }).then(owner => { specialOwnerIds.push(owner.id); });
      UsersOwners.createViaApi({ owner: uuid() }).then(owner => { specialOwnerIds.push(owner.id); });
      cy.visit(SettingsMenu.paymentsPath);
    });
  });
  after(() => {
    specialOwnerIds.forEach(id => { UsersOwners.deleteViaApi(id); });
  });

  // TODO: create related TC in Testrail and specify it's id into the code
  it('XXX Verify that you can create payment methods for a fee/fine owner', { tags: [TestType.smoke] }, () => {

  });
});


