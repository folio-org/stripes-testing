import uuid from 'uuid';
import TestType from '../../../support/dictionary/testTypes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import UsersOwners from '../../../support/fragments/settings/users/usersOwners';
import paymentMethods from '../../../support/fragments/settings/users/paymentMethods';

describe('ui-users-settings: payments methods in Fee/fine', () => {
  const specialOwnerIds = [];
  before(() => {
    cy.loginAsAdmin({ path: SettingsMenu.paymentsPath, waiter: paymentMethods.waitLoading });
    cy.wait(3000);
    cy.getAdminToken().then(() => {
      UsersOwners.createViaApi({ owner: uuid() }).then(response => {
        specialOwnerIds.push(response.body.id);
      });
      UsersOwners.createViaApi({ owner: uuid() }).then(response => { specialOwnerIds.push(response.body.id); });
    });
  });
  after(() => {
    specialOwnerIds.forEach(id => { UsersOwners.deleteViaApi(id); });
  });

  // TODO: create related TC in Testrail and specify it's id into the code
  it('XXX Verify that you can create payment methods for a fee/fine owner', { tags: [TestType.smoke] }, () => {
    paymentMethods.checkControls();
    cy.wait(3000);
    paymentMethods.pressNew();
    cy.wait(3000);
    paymentMethods.checkFields();
  });
});


