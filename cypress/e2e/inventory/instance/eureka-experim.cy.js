import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Orders from '../../../support/fragments/orders/orders';
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
      cy.log(JSON.stringify(testData.user));

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
    cy.getAdminToken();
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
        });
      });
    });
  });

  it('experiment 2', () => {
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
});
