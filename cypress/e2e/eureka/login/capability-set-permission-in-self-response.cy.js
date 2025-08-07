import Users from '../../../support/fragments/users/users';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Login', () => {
    const selfCallpath = '/users-keycloak/_self?expandPermissions=true*';
    const permissionName = 'ui-checkout.all';
    let userA;
    let userB;
    let roleId;
    let capabSetId;

    const capabSetToAssign = CapabilitySets.uiCheckout;

    before('Create user, get data', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userAProperties) => {
        userA = userAProperties;
        cy.assignCapabilitiesToExistingUser(userA.userId, [], [capabSetToAssign]);
      });
      cy.createTempUser([]).then((userBProperties) => {
        userB = userBProperties;
        cy.createAuthorizationRoleApi().then((role) => {
          roleId = role.id;
          cy.getCapabilitySetIdViaApi(capabSetToAssign).then((setId) => {
            capabSetId = setId;
            cy.addCapabilitySetsToNewRoleApi(roleId, [capabSetId]);
            cy.addRolesToNewUserApi(userB.userId, [roleId]);
          });
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      cy.deleteAuthorizationRoleApi(roleId);
    });

    it(
      'C589233 Permission associated with assigned capability set is returned from "_self" endpoint upon login (eureka)',
      { tags: ['smoke', 'eureka', 'shiftLeft', 'C589233'] },
      () => {
        cy.intercept('GET', selfCallpath).as('selfCall');
        cy.login(userA.username, userA.password);
        cy.wait('@selfCall').then((call) => {
          expect(call.response.statusCode).to.eq(200);
          expect(
            call.response.body.permissions.permissions.filter(
              (perm) => perm.permissionName === permissionName,
            ),
          ).to.have.lengthOf(1);
        });
        cy.login(userB.username, userB.password);
        cy.wait('@selfCall').then((call) => {
          expect(call.response.statusCode).to.eq(200);
          expect(
            call.response.body.permissions.permissions.filter(
              (perm) => perm.permissionName === permissionName,
            ),
          ).to.have.lengthOf(1);
        });
      },
    );
  });
});
