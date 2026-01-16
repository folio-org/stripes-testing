import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';

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
      Permissions.uiUserCanAssignUnassignPermissions.gui,
      Permissions.uiUsersCreate.gui,
      Permissions.uiUsersPermissionsView.gui,
      Permissions.uiUsersView.gui,
    ])
      .then((userProperties) => {
        user = userProperties;
      })
      .then(() => {
        cy.assignAffiliationToUser(Affiliations.College, user.userId);
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(user.userId, [
          // Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
          Permissions.uiUserCanAssignUnassignPermissions.gui,
          Permissions.uiUsersCreate.gui,
          Permissions.uiUsersPermissionsView.gui,
          Permissions.uiUsersView.gui,
        ]);
        cy.resetTenant();
        cy.login(user.username, user.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
      });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    cy.setTenant(Affiliations.College);
    Users.deleteViaApi(testUser.id);
  });

  it(
    'C387512 Affiliation in central tenant is automatically added after creating user in the member tenant (consortia) (thunderjet)',
    { tags: ['smokeECS', 'thunderjet', 'C387512'] },
    () => {
      Users.createViaUi(testUser).then((id) => {
        testUser.id = id;
      });
      ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
      UsersSearchPane.searchByUsername(testUser.username);
      Users.verifyUserDetailsPane();
      UsersCard.verifyAffiliationsQuantity('2');
      UsersCard.expandAffiliationsAccordion();
      UsersCard.verifyAffiliationsDetails(tenantNames.college, 2, tenantNames.central);
    },
  );
});
