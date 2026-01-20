import Permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import UserEdit from '../../support/fragments/users/userEdit';
import Modals from '../../support/fragments/modals';

describe('Consortia', () => {
  const createUserData = () => ({
    username: getTestEntityValue('username'),
    barcode: getRandomPostfix(),
    personal: {
      firstName: getTestEntityValue('firstname'),
      preferredFirstName: getTestEntityValue('prefname'),
      middleName: getTestEntityValue('midname'),
      lastName: getTestEntityValue('lastname'),
      email: 'test@folio.org',
    },
    patronGroup: 'undergrad (Undergraduate Student)',
    userType: 'Staff',
  });
  const testUser = createUserData();

  let user;

  before('Create users, data', () => {
    cy.getAdminToken();

    cy.createTempUser([
      Permissions.uiUserCanAssignUnassignPermissions.gui,
      Permissions.uiUserEdit.gui,
      Permissions.uiUsersPermissionsView.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
      cy.wait(7000);
    });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(testUser.id);
  });

  it(
    'C388532 "Affiliation" accordion and "Affiliation" dropdown in "User permissions" accordion are NOT displayed when tenant is NOT a part of Consortia (thunderjet)',
    { tags: ['smoke', 'thunderjet', 'C388532'] },
    () => {
      UsersSearchPane.searchByUsername(user.username);
      UsersSearchPane.openUser(user.username);
      Users.verifyUserDetailsPane();
      UsersCard.affiliationsAccordionIsAbsent();
      UserEdit.openEdit();
      UsersCard.affiliationsAccordionIsAbsent();
      UserEdit.verifyUserPermissionsAccordion();
      UserEdit.cancelEdit();
      // workaround for issue UIU-3390
      Modals.closeModalWithEscapeIfAny();
      Users.verifyUserDetailsPane();
      UsersCard.affiliationsAccordionIsAbsent();
    },
  );
});
