import getRandomPostfix from '../../../support/utils/stringTools';
import { defaultRoleCrudErrorMessage } from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { AUTHORIZATION_ROLE_TYPES } from '../../../support/constants';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const randomPostfix = getRandomPostfix();
      const roleTypes = {
        default: AUTHORIZATION_ROLE_TYPES.DEFAULT.toUpperCase(),
        regular: AUTHORIZATION_ROLE_TYPES.REGULAR.toUpperCase(),
      };
      const regularRole = {
        name: `AT_C957370_UserRole_${randomPostfix}_Regular`,
        description: `Description C957370 ${randomPostfix}`,
      };
      const newDefaultRole = {
        name: `AT_C957370_UserRole_${randomPostfix}_DefaultNew`,
        description: `Description New Default C957370 ${randomPostfix}`,
      };
      let defaultRole;

      before('Create role, user', () => {
        cy.getAdminToken();
        cy.createAuthorizationRoleApi(regularRole.name, regularRole.description).then((role) => {
          regularRole.id = role.id;
        });
        cy.getAuthorizationRoles({ limit: 1, query: `type=${roleTypes.default}` }).then((roles) => {
          defaultRole = roles[0];
        });
      });

      after('Delete role, user', () => {
        cy.getAdminToken();
        cy.deleteAuthorizationRoleApi(regularRole.id, true);
      });

      it(
        'C957370 Disallow transitioning role type to/from DEFAULT through API (eureka)',
        { tags: ['criticalPath', 'eureka', 'C957370'] },
        () => {
          cy.then(() => {
            cy.getAdminToken();

            cy.createAuthorizationRoleApi(
              newDefaultRole.name,
              newDefaultRole.description,
              roleTypes.default,
              true,
            ).then((roleBody) => {
              expect(roleBody.errors[0].message).to.eq(defaultRoleCrudErrorMessage);
            });

            cy.updateAuthorizationRoleApi(defaultRole.id, {
              ...defaultRole,
              type: defaultRole.regular,
            }).then(({ body, status }) => {
              expect(status).to.eq(400);
              expect(body.errors[0].message).to.eq(defaultRoleCrudErrorMessage);
            });

            cy.updateAuthorizationRoleApi(regularRole.id, {
              ...regularRole,
              type: roleTypes.default,
            }).then(({ body, status }) => {
              expect(status).to.eq(400);
              expect(body.errors[0].message).to.eq(defaultRoleCrudErrorMessage);
            });
          }).then(() => {
            cy.getAuthorizationRoles({ limit: 100, query: `name=${newDefaultRole.name}` }).then(
              (roles) => {
                expect(roles).to.have.lengthOf(0);
              },
            );

            cy.getAuthorizationRoleApi(defaultRole.id).then(({ body }) => {
              expect(body.type).to.eq(roleTypes.default);
            });

            cy.getAuthorizationRoleApi(regularRole.id).then(({ body }) => {
              expect(body.type).to.eq(roleTypes.regular);
            });
          });
        },
      );
    });
  });
});
