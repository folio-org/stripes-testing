import permissions from '../../support/dictionary/permissions';
import testType from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import FinanceHelp from '../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../support/fragments/settingsMenu';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import Orders from '../../support/fragments/orders/orders';
import NewOrder from '../../support/fragments/orders/newOrder';
import Organizations from '../../support/fragments/organizations/organizations';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import InteractorsTools from '../../support/utils/interactorsTools';

describe('ui-finance: Orders', () => {
  const order = { ...NewOrder.defaultOneTimeOrder };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultAcquisitionUnit = { ...AcquisitionUnits.defaultAcquisitionUnit };
  let orderNumber;
  let user;
  let orderId;

  before(() => {
    cy.createTempUser([
      permissions.uiOrdersView.gui,
      permissions.uiOrdersCreate.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiOrdersDelete.gui,
      permissions.uiExportOrders.gui,
      permissions.uiOrdersApprovePurchaseOrders.gui,
      permissions.uiOrdersAssignAcquisitionUnitsToNewOrder.gui,
      permissions.uiOrdersCancelOrderLines.gui,
      permissions.uiOrdersCancelPurchaseOrders.gui,
      permissions.uiOrdersManageAcquisitionUnits.gui,
      permissions.uiOrdersReopenPurchaseOrders.gui,
      permissions.uiOrdersShowAllHiddenFields.gui,
      permissions.uiOrdersUnopenpurchaseorders.gui,
      permissions.uiOrdersUpdateEncumbrances.gui,
    ]).then((userProperties) => {
      user = userProperties;
    });
    Organizations.createOrganizationViaApi(organization).then((response) => {
      organization.id = response;
    });
    order.vendor = organization.name;
    order.orderType = 'One-time';
  });

  after(() => {
    Orders.deleteOrderViaApi(orderId);
    Organizations.deleteOrganizationViaApi(organization.id);
    cy.loginAsAdmin({
      path: SettingsMenu.acquisitionUnitsPath,
      waiter: AcquisitionUnits.waitLoading,
    });

    AcquisitionUnits.unAssignAdmin(defaultAcquisitionUnit.name);
    AcquisitionUnits.delete(defaultAcquisitionUnit.name);

    Users.deleteViaApi(user.userId);
  });

  it(
    'C163929 Test acquisition unit restrictions for Order records (thunderjet)',
    { tags: [testType.criticalPath, devTeams.thunderjet] },
    () => {
      cy.loginAsAdmin({
        path: SettingsMenu.acquisitionUnitsPath,
        waiter: AcquisitionUnits.waitLoading,
      });
      AcquisitionUnits.newAcquisitionUnit();
      AcquisitionUnits.fillInInfo(defaultAcquisitionUnit.name);
      // Need to wait,while data is load
      cy.wait(2000);
      AcquisitionUnits.assignUser(user.username);

      cy.login(user.username, user.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
      Orders.createOrderWithAU(order, defaultAcquisitionUnit.name).then(({ response }) => {
        orderId = response.body.id;
        orderNumber = response.body.poNumber;
        InteractorsTools.checkCalloutMessage(
          `The Purchase order - ${orderNumber} has been successfully saved`,
        );

        cy.loginAsAdmin({
          path: SettingsMenu.acquisitionUnitsPath,
          waiter: AcquisitionUnits.waitLoading,
        });
        AcquisitionUnits.unAssignUser(defaultAcquisitionUnit.name);

        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter('PO number', orderNumber);
        Orders.checkZeroSearchResultsHeader();

        cy.loginAsAdmin({
          path: SettingsMenu.acquisitionUnitsPath,
          waiter: AcquisitionUnits.waitLoading,
        });
        AcquisitionUnits.edit(defaultAcquisitionUnit.name);
        AcquisitionUnits.selectViewCheckbox();

        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.searchByParameter('PO number', orderNumber);
        FinanceHelp.selectFromResultsList();
      });
    },
  );
});
