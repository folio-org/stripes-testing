import Affiliations from '../../support/dictionary/affiliations';

describe('Eureka - Prepare for testing', () => {
  it(
    'Clear all cookies',
    {
      tags: ['clearCookies', 'eureka'],
    },
    () => {
      // workaround for EUREKA-396 - otherwise tests may fail in consecutive runs for different tenants
      if (Cypress.env('eureka')) cy.clearCookies({ domain: null });
    },
  );

  it(
    'Assign admin roles in Members to the Central admin',
    {
      tags: ['eureka', 'adminECS'],
      retries: 3,
    },
    () => {
      if (Cypress.env('eureka') && Cypress.env('ecsEnabled')) {
        cy.resetTenant();
        cy.getAdminToken();
        cy.getUserWithBlUsersByUsername(Cypress.env('diku_login')).then(({ body }) => {
          // adding adminRole in College
          cy.clearCookies({ domain: null });
          cy.setTenant(Affiliations.College);
          cy.getCollegeAdminToken();
          cy.getUserRoleIdByNameApi(Cypress.env('systemRoleName')).then((collegeAdminRoleId) => {
            cy.getAuthorizationRolesForUserApi(body.user.id).then((rolesCollege) => {
              cy.log(
                'ADMIN ROLE IN COLLEGE: ' +
                  (rolesCollege.body.userRoles.length > 0 &&
                    rolesCollege.body.userRoles
                      .map((entry) => entry.roleId)
                      .includes(collegeAdminRoleId)),
              );
              if (!rolesCollege.body.userRoles.length) {
                cy.addRolesToNewUserApi(body.user.id, [collegeAdminRoleId]);
              } else if (
                !rolesCollege.body.userRoles
                  .map((entry) => entry.roleId)
                  .includes(collegeAdminRoleId)
              ) {
                cy.updateRolesForUserApi(body.user.id, [collegeAdminRoleId]);
              }
            });

            // adding adminRole in University
            cy.clearCookies({ domain: null });
            cy.setTenant(Affiliations.University);
            cy.getUniversityAdminToken();
            cy.getUserRoleIdByNameApi(Cypress.env('systemRoleName')).then(
              (universityAdminRoleId) => {
                cy.getAuthorizationRolesForUserApi(body.user.id).then((rolesUniversity) => {
                  cy.log(
                    'ADMIN ROLE IN UNIVERSITY: ' +
                      (rolesUniversity.body.userRoles.length > 0 &&
                        rolesUniversity.body.userRoles
                          .map((entry) => entry.roleId)
                          .includes(universityAdminRoleId)),
                  );
                  if (!rolesUniversity.body.userRoles.length) {
                    cy.wait(10000);
                    cy.addRolesToNewUserApi(body.user.id, [universityAdminRoleId]);
                  } else if (
                    !rolesUniversity.body.userRoles
                      .map((entry) => entry.roleId)
                      .includes(universityAdminRoleId)
                  ) {
                    cy.wait(10000);
                    cy.updateRolesForUserApi(body.user.id, [universityAdminRoleId]);
                  }
                });
              },
            );
          });
          cy.resetTenant();
          cy.wait(10000);
        });
      }
    },
  );
});
