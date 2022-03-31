import uuid from 'uuid';
import DefaultUser from './defaultUser';

const requestPrefStorage = { ...DefaultUser.defaultUiRequestPrefStorage };
const permissions = { ...DefaultUser.defaultUiPermissions };
const checkOutItem = { ...DefaultUser.defaultUiChekhOutItem };
const newPassword = { ...DefaultUser.defaultUiCreateNewPassword };

export default {
  createUser() {
    cy.getUserGroups().then(patronGroupId => {
      const specialPatron = { ...DefaultUser.defaultUiPatron.body };
      specialPatron.patronGroup = patronGroupId;
      cy.createUserApi(specialPatron);

      // current state
      this.newRequestPrefStorage();
      this.newPermissions();
      this.createNewPassword();
      this.checkOutItem();
    });
  },
  deleteUser() {
    this.deleteNewPatron();
    this.deletePatronGroup();
  },
  newRequestPrefStorage() {
    cy.getRequestPreference({ method: 'POST', body: requestPrefStorage.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  newPermissions() {
    cy.getPermissionsApi({ method: 'POST', body: permissions.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  checkOutItem() {
    cy.createItemCheckout({ method: 'POST', body: checkOutItem.body })
      .then((resp) => {
        expect(resp.body).property('id');
      });
  },
  createNewPassword() {
    cy.setUserPassword({ method: 'POST', body: newPassword.body });
  },
  deleteNewPatron() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `users/${uuid()}`,
    });
  },
  deletePatronGroup() {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `groups/${uuid()}`,
    });
  }
};

