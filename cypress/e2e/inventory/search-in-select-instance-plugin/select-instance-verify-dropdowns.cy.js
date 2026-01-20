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
        filtersOrder: {
          instance: [
            'Effective location (item)',
            'Language',
            'Resource type',
            'Format',
            'Mode of issuance',
            'Nature of content',
            'Suppress from discovery',
            'Statistical code',
            'Date range',
            'Date created',
            'Date updated',
            'Instance status',
            'Source',
            'Tags',
          ],
          holdings: [
            'Effective location (item)',
            'Holdings permanent location',
            'Holdings type',
            'Suppress from discovery',
            'Statistical code',
            'Date created',
            'Date updated',
            'Source',
            'Tags',
          ],
          item: [
            'Item status',
            'Effective location (item)',
            'Holdings permanent location',
            'Material type',
            'Suppress from discovery',
            'Statistical code',
            'Date created',
            'Date updated',
            'Tags',
          ],
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
          cy.ifConsortia(true, () => {
            testData.filtersOrder.instance.unshift('Shared', 'Held by');
            testData.filtersOrder.holdings.unshift('Shared', 'Held by');
            testData.filtersOrder.item.unshift('Shared', 'Held by');
          });

          Organizations.createOrganizationViaApi(organization).then((response) => {
            organization.id = response;
            order.vendor = response;

            cy.createOrderApi(order).then((orderResponse) => {
              orderNumber = orderResponse.body.poNumber;
              orderID = orderResponse.body.id;

              cy.createTempUser([
                Permissions.uiInventoryViewInstances.gui,
                Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
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
        'C476770 "Select instance" plugin | Check what filters and facets display in the three segments (Instance, Holdings, Item) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C476770'] },
        () => {
          SelectInstanceModal.verifyFiltersOrder(testData.filtersOrder.instance);
          SelectInstanceModal.switchToHoldings();
          SelectInstanceModal.verifyFiltersOrder(testData.filtersOrder.holdings);
          SelectInstanceModal.switchToItem();
          SelectInstanceModal.verifyFiltersOrder(testData.filtersOrder.item);
        },
      );
    });
  });
});
