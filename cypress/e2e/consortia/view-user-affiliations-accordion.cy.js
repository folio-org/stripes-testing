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
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  let user;

  before(() => {
    // cy.setTenant('college');
    // // cy.getAdminToken();

    // cy.loginAsCollegeAdmin();

    // cy.createTempUser([
    //   permissions.uiSettingsOrdersCanViewAllSettings.gui,
    //   permissions.uiOrdersCreate.gui,
    //   permissions.uiOrdersEdit.gui,
    // ], 'staff', 'staff').then((userProperties) => {
    //   user = userProperties;
    //   cy.login(user.username, user.password, {
    //     path: TopMenu.ordersPath,
    //     waiter: Orders.waitLoading,
    //   });
    // });
    // cy.logout();
    cy.setTenant('university');
    // cy.getAdminToken();

    cy.loginAsUniversityAdmin();

    cy.createTempUser(
      [
        permissions.uiSettingsOrdersCanViewAllSettings.gui,
        permissions.uiOrdersCreate.gui,
        permissions.uiOrdersEdit.gui,
        permissions.consortiaSettingsConsortiaAffiliationsView.gui,
      ],
      'staff',
      'staff',
    ).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  //   after(() => {
  //     Users.deleteViaApi(user.userId);
  //   });

  it('Consortia', { tags: [TestType.criticalPath, devTeams.thunderjet] }, () => {
    cy.visit(TopMenu.ordersPath);
    ConsortiumManager.switchActiveAffiliation('Consortium');
    cy.pause();
    //   cy.logout();
  });
});
