import Affiliations from '../../support/dictionary/affiliations';

describe('Eureka - Prepare for testing', () => {
  // assign an admin role to the user in the specified tenant
  function assignAdminRole(affiliation, userId) {
    cy.clearCookies({ domain: null });
    cy.setTenant(affiliation);

    if (affiliation === Affiliations.College) {
      cy.getCollegeAdminToken();
    } else if (affiliation === Affiliations.University) {
      cy.getUniversityAdminToken();
    }

    const roleName = Cypress.env('systemRoleName');
    cy.getUserRoleIdByNameApi(roleName).then((adminRoleId) => {
      cy.getAuthorizationRolesForUserApi(userId).then((roles) => {
        cy.log(
          `ADMIN ROLE IN ${affiliation.toUpperCase()}: ` +
            (roles.body.userRoles.length > 0 &&
              roles.body.userRoles.map((entry) => entry.roleId).includes(adminRoleId)),
        );

        if (!roles.body.userRoles.length) {
          cy.wait(10000);
          cy.addRolesToNewUserApi(userId, [adminRoleId]);
        } else if (!roles.body.userRoles.map((entry) => entry.roleId).includes(adminRoleId)) {
          cy.wait(10000);
          cy.updateRolesForUserApi(userId, [adminRoleId]);
        }
      });
    });
  }

  it('Clear all cookies', { tags: ['clearCookies', 'eureka'] }, () => {
    // workaround for EUREKA-396 - otherwise tests may fail in consecutive runs for different tenants:
    if (Cypress.env('eureka')) cy.clearCookies({ domain: null });
  });

  it(
    'Assign admin roles in Members to the Central admin',
    { tags: ['eureka', 'adminECS'], retries: 3 },
    () => {
      if (Cypress.env('eureka') && Cypress.env('ecsEnabled')) {
        cy.resetTenant();
        cy.getAdminToken();
        cy.getUserWithBlUsersByUsername(Cypress.env('diku_login')).then(({ body }) => {
          assignAdminRole(Affiliations.College, body.user.id);
          assignAdminRole(Affiliations.University, body.user.id);
          cy.resetTenant();
          cy.wait(10000);
        });

        cy.resetTenant();
        cy.wait(10000);
      }
    },
  );
});
