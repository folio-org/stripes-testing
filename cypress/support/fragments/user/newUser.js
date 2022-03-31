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
      cy.getRequestPreference(requestPrefStorage.body);
      cy.getPermissionsApi(permissions.body);
      cy.setUserPassword(newPassword.body);
      cy.createItemCheckout(checkOutItem.body);
    });
  },
  deleteUser() {
    this.deleteNewPatron();
    this.deletePatronGroup();
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

