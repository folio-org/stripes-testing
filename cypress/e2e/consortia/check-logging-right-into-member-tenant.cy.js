import Permissions from '../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';
import TopMenu from '../../support/fragments/topMenu';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
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
    cy.resetTenant();
    cy.setTenant(Affiliations.College);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C387506 User created in Member tenant is logging right into Member tenant (consortia) (thunderjet)',
    { tags: ['smokeECS', 'thunderjet', 'C387506'] },
    () => {
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    },
  );
});
