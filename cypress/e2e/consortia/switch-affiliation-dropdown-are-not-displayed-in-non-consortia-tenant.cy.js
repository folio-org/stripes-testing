import Permissions from '../../support/dictionary/permissions';
// import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
// import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
// import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
// import UsersCard from '../../support/fragments/users/usersCard';

describe('Consortia', () => {
  let userData;

  before('Create users, data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.uiUsersPermissions.gui,
      Permissions.uiUsersCreate.gui,
      Permissions.uiUsersPermissionsView.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      userData = userProperties;
    });
    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  // s

  it(
    'C388532 "Affiliation" accordion and "Affiliation" dropdown in "User permissions" accordion are NOT displayed when tenant is NOT a part of Consortia (consortia) (thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
    () => {
      UsersSearchPane.searchByUsername(userData.username);
      Users.verifyUserDetailsPane();
    },
  );
});
