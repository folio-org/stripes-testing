import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import TestType from '../../support/dictionary/testTypes';
import SettingsMenu from '../../support/fragments/settingsMenu';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Users from '../../support/fragments/users/users';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../support/fragments/topMenu';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import Helper from '../../support/fragments/finance/financeHelper';

describe('Consortia', () => {
  let user;

  before(() => {
    // cy.setTenant('consortium');
    // cy.getAdminToken();

    cy.loginAsAdmin();
  });

  //   after(() => {
  //     Users.deleteViaApi(user.userId);
  //   });

  it('Consortia', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.ordersPath);
    //   cy.logout();
    cy.createTempUser([
      permissions.uiSettingsOrdersCanViewAllSettings.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });
});
