import permissions from '../../support/dictionary/permissions';
import NewOrder from '../../support/fragments/orders/newOrder';
import OrderLines from '../../support/fragments/orders/orderLines';
import Orders from '../../support/fragments/orders/orders';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import { PrefixSuffix } from '../../support/fragments/settings/orders/newPrefixSuffix';
import SettingsOrders from '../../support/fragments/settings/orders/settingsOrders';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import { randomFourDigitNumber } from '../../support/utils/stringTools';

describe('Export Manager', () => {
  describe('Export Orders in EDIFACT format', () => {
    describe('Orders Export to a Vendor', () => {
      const organization = {
        ...NewOrganization.defaultUiOrganizations,
        paymentMethod: 'EFT',
      };
      const poNumberPrefix = { ...PrefixSuffix.defaultPrefix };
      const poNumberSuffix = { ...PrefixSuffix.defaultSuffix };
      const order = {
        ...NewOrder.defaultOneTimeOrder,
        poNumberPrefix: poNumberPrefix.name,
        poNumberSuffix: poNumberSuffix.name,
        poNumber: `${poNumberPrefix.name}${randomFourDigitNumber()}${poNumberSuffix.name}`,
        manualPo: false,
        approved: true,
      };
      let orderNumber;
      let user;
      let orderID;
      let orderPrefixId;
      let orderSuffixId;

      before(() => {
        cy.getAdminToken();

        SettingsOrders.createPrefixViaApi(order.poNumberPrefix).then((prefixId) => {
          orderPrefixId = prefixId;
        });
        SettingsOrders.createSuffixViaApi(order.poNumberSuffix).then((suffixId) => {
          orderSuffixId = suffixId;
        });

        Organizations.createOrganizationViaApi(organization).then((response) => {
          organization.id = response;
          order.vendor = response;
        });
        cy.createOrderApi(order).then((response) => {
          orderNumber = response.body.poNumber;
          orderID = response.body.id;
        });
        cy.createTempUser([
          permissions.uiOrdersCreate.gui,
          permissions.uiOrdersView.gui,
          permissions.uiOrdersEdit.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        });
      });

      after(() => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(orderID);
        Organizations.deleteOrganizationViaApi(organization.id);
        SettingsOrders.deletePrefixViaApi(orderPrefixId);
        SettingsOrders.deleteSuffixViaApi(orderSuffixId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C350601 Select Acquisition method from controlled vocabulary list [except tags] (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'C350601'] },
        () => {
          Orders.searchByParameter('PO number', orderNumber);
          Orders.selectFromResultsList(orderNumber);
          OrderLines.addPOLine();
          OrderLines.fillInPOLineInfoViaUi();
          InteractorsTools.checkCalloutMessage('The purchase order line was successfully created');
        },
      );
    });
  });
});
