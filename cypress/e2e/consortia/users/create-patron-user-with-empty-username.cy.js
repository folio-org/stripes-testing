import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

let user;
const testUser = {
  username: '', // leave empty
  barcode: getTestEntityValue('barcode'),
  personal: {
    firstName: getTestEntityValue('firstname'),
    preferredFirstName: getTestEntityValue('prefname'),
    middleName: getTestEntityValue('midname'),
    lastName: getTestEntityValue('lastname'),
    email: 'test@folio.org',
  },
  patronGroup: 'undergrad (Undergraduate Student)',
  userType: 'Staff', // select staff
};
const newUsername = getTestEntityValue('username');

describe('Users', () => {
  before('create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      permissions.uiUsersCreate.gui,
      permissions.uiUsersPermissionsView.gui,
      permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C418647 Creating new patron user with empty "Username" field (consortia) (thunderjet)',
    { tags: ['criticalPathECS', 'thunderjet'] },
    () => {
      Users.createViaUiIncomplete(testUser).then((id) => {
        testUser.id = id;
      });
      Users.verifyUsernameMandatory();
      UserEdit.changeUserType();
      Users.verifyUsernameMandatory(false);
      Users.saveCreatedUser();
      Users.verifyUsernameOnUserDetailsPane('No value set-');
      Users.verifyUserTypeOnUserDetailsPane('patron');
      UserEdit.openEdit();
      UserEdit.changeUserType('Staff');
      UserEdit.saveAndClose();
      UserEdit.changeUserType('Staff');
      UserEdit.editUsername(newUsername);
      UserEdit.saveEditedUser();
      Users.verifyUserTypeOnUserDetailsPane('staff');
      Users.verifyUsernameOnUserDetailsPane(newUsername);
    },
  );
});
