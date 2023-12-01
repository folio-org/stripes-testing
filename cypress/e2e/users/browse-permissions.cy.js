/* eslint-disable camelcase */
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

let user;
let testUser_C350673;
let testUser_C350674;

describe('Users', () => {
  before('create test users', () => {
    cy.createTempUser([]).then((userProperties) => {
      testUser_C350673 = userProperties;
    });
    cy.createTempUser([]).then((userProperties) => {
      testUser_C350674 = userProperties;
    });

    cy.createTempUser([permissions.uiUsersPermissions.gui]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.usersPath,
        waiter: UsersSearchPane.waitLoading,
      });
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    [user, testUser_C350673, testUser_C350674].forEach((usr) => {
      Users.deleteViaApi(usr.userId);
    });
  });

  it(
    'C350673 Verify that a user can assign Subject browse permissions. (firebird)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      UsersSearchPane.searchByUsername(testUser_C350673.username);
      UsersSearchPane.waitLoading();

      const newPermission = permissions.uiSubjectBrowse.gui;
      UserEdit.addPermissions([newPermission]);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissions([newPermission]);
    },
  );

  it(
    'C350674 Verify that a user can assign Call number browse: View permissions (firebird)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      UsersSearchPane.searchByUsername(testUser_C350674.username);
      UsersSearchPane.waitLoading();

      const newPermission = permissions.uiCallNumberBrowse.gui;
      UserEdit.addPermissions([newPermission]);
      UserEdit.saveAndClose();
      UsersCard.verifyPermissions([newPermission]);
    },
  );
});
