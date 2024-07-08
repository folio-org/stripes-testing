import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Orders from '../../../support/fragments/orders/orders';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eureka test', () => {
  const testData = {};
  before(() => {
    cy.getAdminToken();
    cy.createAuthorizationRoleApi().then((role) => {
      cy.log(JSON.stringify(role, null, 2));
      testData.roleName = role.name;
      testData.roleId = role.id;
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
    cy.deleteCapabilitiesFromRoleApi(testData.roleId);
    cy.deleteCapabilitySetsFromRoleApi(testData.roleId);
    cy.deleteAuthorizationRoleApi(testData.roleId);
  });

  it('experiment', () => {
    cy.createTempUser().then((user) => {
      testData.user = user;

      cy.getCapabilitiesApi(10).then((capabs) => {
        cy.getCapabilitySetsApi(10).then((capabSets) => {
          cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
            testData.roleId = roleId;
            cy.addCapabilitiesToNewRoleApi(
              roleId,
              capabs.map((capab) => capab.id),
            );
            cy.addCapabilitySetsToNewRoleApi(
              roleId,
              capabSets.map((capab) => capab.id),
            );

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });

            AuthorizationRoles.searchRole(testData.roleName);
            AuthorizationRoles.clickOnRoleName(testData.roleName);
            AuthorizationRoles.clickOnCapabilitiesAccordion();
            AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(
              { application: 'app-platform-complete', table: 'Data', resource: 'Accounts Item' },
              4,
            );
            AuthorizationRoles.verifyCheckboxesCountInCapabilityRow(
              {
                application: 'app-platform-complete',
                table: 'Procedural',
                resource: 'Accounts Check-Pay',
              },
              1,
            );
            AuthorizationRoles.clickOnCapabilitySetsAccordion();
            AuthorizationRoles.verifyCheckboxesCountInCapabilitySetRow(
              {
                application: 'app-platform-complete',
                table: 'Data',
                resource: 'Acquisitions-Units Memberships',
              },
              1,
            );
          });
        });
      });
    });
  });

  it.skip('experiment 2', () => {
    cy.loginAsAdmin({
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'), {
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'), {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
    cy.login(testData.user.username, testData.user.password, {
      path: TopMenu.ordersPath,
      waiter: Orders.waitLoading,
    });
    cy.login(testData.user.username, testData.user.password);
    cy.loginAsAdmin({
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
    cy.loginAsAdmin();
  });

  it('experiment 3', () => {
    const capabsToAssign = [
      { type: 'Settings', resource: 'Settings Enabled', action: 'View' },
      { type: 'Settings', resource: 'Settings Notes Enabled', action: 'View' },
    ];
    const capabsSetsToAssign = [
      { type: 'Data', resource: 'UI-Inventory All-Permissions Temprorary', action: 'Manage' },
      { type: 'Data', resource: 'UI-Checkin', action: 'Manage' },
    ];
    cy.createTempUser().then((user) => {
      testData.user3 = user;
      cy.assignCapabilitiesToExistingUser(
        testData.user3.userId,
        capabsToAssign,
        capabsSetsToAssign,
      );
      if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user3.userId, []);
      cy.login(testData.user3.username, testData.user3.password);
      cy.wait(10000);
      Users.deleteViaApi(testData.user3.userId);
    });
  });
});
