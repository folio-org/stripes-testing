import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Eureka', () => {
  describe('Login', () => {
    describe('Consortia', () => {
      let user;

      before('Create user', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.createTempUser([]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.logoutViaApi();
          cy.clearCookies({ domain: null });
        });
      });

      after('Delete user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C740245 Log in in ECS member tenant using copied URL with preselected tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'eureka', 'spitfire', 'C740245'] },
        () => {
          cy.visit('/');
          cy.verifyDefaultTenantSelectionPage();
          cy.selectTenantAndContinue(tenantNames.college);
          cy.verifyDefaultEurekaLoginPage();
          cy.url().then((memberLoginUrl) => {
            cy.logoutViaApi();
            cy.clearCookies({ domain: null });

            cy.visit(memberLoginUrl);
            cy.verifyDefaultEurekaLoginPage();
            cy.inputCredentialsAndLogin(user.username, user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        },
      );
    });
  });
});
