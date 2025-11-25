import { Permissions } from '../../../support/dictionary';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    describe('Filters', () => {
      const testData = {
        invalidDateValues: {
          dateRange: { from: '123', to: '34222' },
          dateCreated: { from: '2019', to: '20' },
          dateUpdated: { from: '2021', to: '20' },
        },
      };

      const organization = {
        ...NewOrganization.defaultUiOrganizations,
        paymentMethod: 'EFT',
      };

      const order = {
        ...NewOrder.defaultOneTimeOrder,
        manualPo: false,
      };

      let orderNumber;
      let orderID;
      let user;

      before('Create user and open Select instance plugin', () => {
        cy.getAdminToken().then(() => {
          Organizations.createOrganizationViaApi(organization).then((response) => {
            organization.id = response;
            order.vendor = response;

            cy.createOrderApi(order).then((orderResponse) => {
              orderNumber = orderResponse.body.poNumber;
              orderID = orderResponse.body.id;

              cy.createTempUser([
                Permissions.uiInventoryViewInstances.gui,
                Permissions.uiOrdersCreate.gui,
              ]).then((createdUserProperties) => {
                user = createdUserProperties;

                cy.login(user.username, user.password, {
                  path: TopMenu.ordersPath,
                  waiter: Orders.waitLoading,
                });

                Orders.searchByParameter('PO number', orderNumber);
                Orders.selectFromResultsList(orderNumber);
                OrderLines.addPOLine();
                OrderLines.clickTitleLookUp();
                InventorySearchAndFilter.instanceTabIsDefault();
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Orders.deleteOrderViaApi(orderID);
        Organizations.deleteOrganizationViaApi(organization.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C594394 "Select Instance" plugin | "Reset all" button clears Date filters filled with invalid values (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C594394'] },
        () => {
          SelectInstanceModal.searchByName('*');

          SelectInstanceModal.expandSelectInstanceAccordion('Date range');
          SelectInstanceModal.fillDateFields(
            'Date range',
            testData.invalidDateValues.dateRange.from,
            testData.invalidDateValues.dateRange.to,
          );
          SelectInstanceModal.expandSelectInstanceAccordion('Date created');
          SelectInstanceModal.fillDateFields(
            'Date created',
            testData.invalidDateValues.dateCreated.from,
            testData.invalidDateValues.dateCreated.to,
          );
          SelectInstanceModal.expandSelectInstanceAccordion('Date updated');
          SelectInstanceModal.fillDateFields(
            'Date updated',
            testData.invalidDateValues.dateUpdated.from,
            testData.invalidDateValues.dateUpdated.to,
          );
          SelectInstanceModal.clickResetAllButton();

          SelectInstanceModal.checkDefaultSearchOptionSelected();
          SelectInstanceModal.checkTableContent();
          SelectInstanceModal.checkSearchInputCleared();
          SelectInstanceModal.verifyDateFieldsCleared();

          SelectInstanceModal.searchByName('*');

          SelectInstanceModal.expandSelectInstanceAccordion('Date range');
          SelectInstanceModal.fillDateFields(
            'Date range',
            testData.invalidDateValues.dateRange.from,
            testData.invalidDateValues.dateRange.to,
          );
          SelectInstanceModal.expandSelectInstanceAccordion('Date created');
          SelectInstanceModal.fillDateFields(
            'Date created',
            testData.invalidDateValues.dateCreated.from,
            testData.invalidDateValues.dateCreated.to,
          );
          SelectInstanceModal.expandSelectInstanceAccordion('Date updated');
          SelectInstanceModal.fillDateFields(
            'Date updated',
            testData.invalidDateValues.dateUpdated.from,
            testData.invalidDateValues.dateUpdated.to,
          );
          SelectInstanceModal.verifyDateFieldErrorMessages();

          SelectInstanceModal.selectSourceFilter('FOLIO');

          SelectInstanceModal.verifySourceFilterApplied();
          SelectInstanceModal.expandSelectInstanceAccordion('Date range');
          SelectInstanceModal.expandSelectInstanceAccordion('Date created');
          SelectInstanceModal.expandSelectInstanceAccordion('Date updated');
          SelectInstanceModal.verifyDateFieldErrorMessages();
        },
      );
    });
  });
});
