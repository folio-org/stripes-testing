import Users from '../../../../support/fragments/users/users';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import { parseSanityParameters } from '../../../../support/utils/users';

const selfCallpath = '/users-keycloak/_self?expandPermissions=true*';
const permissionName = 'ui-checkout.all';
let userA;
let userB;
let roleId;
let capabSetId;

describe(
  'Eureka',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Login', () => {
      const { user, memberTenant } = parseSanityParameters();
      const capabSetToAssign = CapabilitySets.uiCheckout;

      beforeEach('Create user, get data', () => {
        cy.setTenant(memberTenant.id);
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();

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

      afterEach('Delete user', () => {
        cy.allure().logCommandSteps(false);
        cy.getUserToken(user.username, user.password, { log: false });
        cy.allure().logCommandSteps();
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
        cy.deleteAuthorizationRoleApi(roleId);
      });

      it(
        'C589233 Permission associated with assigned capability set is returned from "_self" endpoint upon login (eureka)',
        { tags: ['dryRun', 'eureka', 'C589233'] },
        () => {
          cy.intercept('GET', selfCallpath).as('selfCall');
          cy.allure().logCommandSteps(false);
          cy.login(userA.username, userA.password);
          cy.allure().logCommandSteps();
          cy.wait('@selfCall').then((call) => {
            expect(call.response.statusCode).to.eq(200);
            expect(
              call.response.body.permissions.permissions.filter(
                (perm) => perm.permissionName === permissionName,
              ),
            ).to.have.lengthOf(1);
          });
          cy.allure().logCommandSteps(false);
          cy.login(userB.username, userB.password);
          cy.allure().logCommandSteps();
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
  },
);
