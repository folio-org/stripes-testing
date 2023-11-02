import DefaultUser from './defaultUser';
import Users from '../users';
import Checkout from '../../checkout/checkout';

const requestPrefStorage = { ...DefaultUser.defaultUiRequestPrefStorage };

export default {
  createUserWithSameParams() {
    cy.getUserGroups().then((patronGroupId) => {
      const specialPatron = { ...DefaultUser.defaultUiPatron.body };
      specialPatron.patronGroup = patronGroupId;
      Users.createViaApi(specialPatron);
      cy.getRequestPreference(requestPrefStorage.body);

      const permissions = { ...DefaultUser.defaultUiPermissions };
      permissions.userId = specialPatron.id;

      cy.addPermissionsToNewUserApi(permissions.body);
      const newPassword = { ...DefaultUser.defaultUiCreateNewPassword.body };
      newPassword.userId = specialPatron.userId;
      newPassword.username = specialPatron.username;
      cy.setUserPassword(newPassword);
      Checkout.checkoutItemViaApi(DefaultUser.defaultUiChekhOutItem.body);
      cy.wrap({ userName: newPassword.username, password: newPassword.password }).as(
        'userProperties',
      );
    });
    return cy.get('@userProperties');
  },
  // Before using the "delete" method, check that it works!
  deleteUserWithSameParams() {
    cy.okapiRequest({
      method: 'DELETE',
      path: `users/${DefaultUser.defaultUiPatron.body.id}`,
    });
    cy.okapiRequest({
      method: 'DELETE',
      path: `groups/${DefaultUser.defaultUiPatron.body.patronGroup}`,
    });
  },
};
