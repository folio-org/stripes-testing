import Permissions from '../../support/dictionary/permissions';
// import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
// import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
// import UsersCard from '../../support/fragments/users/usersCard';

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
      Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
      Permissions.uiUsersPermissions.gui,
      Permissions.uiUsersCreate.gui,
      Permissions.uiUsersPermissionsView.gui,
      Permissions.uiUsersView.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
    });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    Users.deleteViaApi(testUser.id);
  });

  it(
    'C388532 "Affiliation" accordion and "Affiliation" dropdown in "User permissions" accordion are NOT displayed when tenant is NOT a part of Consortia (consortia) (thunderjet)',
    { tags: ['smoke', 'thunderjet'] },
    () => {
      UsersSearchPane.searchByUsername(testUser.username);
      Users.verifyUserDetailsPane();
    },
  );
});
