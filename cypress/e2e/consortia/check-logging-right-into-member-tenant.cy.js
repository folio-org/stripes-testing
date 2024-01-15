import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Users -> Consortia', () => {
  let user;

  before('Create users, data', () => {
    cy.getAdminToken();
    cy.setTenant(Affiliations.College);
    cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
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
  });

  it(
    'C405520: Affiliation in central tenant is automatically added after creating user in the member tenant (consortia)(thunderjet)',
    { tags: ['smokeECS', 'thunderjet'] },
    () => {
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    },
  );
});
