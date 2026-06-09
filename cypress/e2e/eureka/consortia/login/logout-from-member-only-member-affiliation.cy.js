import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Eureka', () => {
  describe('Login', () => {
    describe('Consortia', () => {
      let user;

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((createdUserProperties) => {
          user = createdUserProperties;
        });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C430269 Log out from Member tenant as a user only having affiliation for this tenant (consortia) (eureka)',
        { tags: ['extendedPathECS', 'eureka', 'C430269'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(user.username, user.password, { authRefresh: true });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          cy.logout();
        },
      );
    });
  });
});
