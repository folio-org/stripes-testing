import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Eureka', () => {
  describe('Login', () => {
    describe('Consortia', () => {
      let user;

      before('Create users, data', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.assignAffiliationToUser(Affiliations.College, user.userId);
          cy.wait(10000);
        });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C423958 Log out from Member tenant after switching affiliation (consortia) (eureka)',
        { tags: ['smokeECS', 'eureka', 'C423958'] },
        () => {
          cy.login(user.username, user.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.logout();
        },
      );
    });
  });
});
