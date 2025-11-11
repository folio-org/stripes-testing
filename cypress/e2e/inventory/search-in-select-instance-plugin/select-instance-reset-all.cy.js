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
import {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const searchOptions = {
      keywordInstance: searchInstancesOptions[0],
      keywordHoldings: searchHoldingsOptions[0],
      keywordItem: searchItemsOptions[0],
      titleAll: searchInstancesOptions[2],
      issn: searchHoldingsOptions[2],
      barcode: searchItemsOptions[1],
    };
    const query = `AT_C451616_Query_${getRandomPostfix()}`;
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      paymentMethod: 'EFT',
    };
    const order = {
      ...NewOrder.defaultOneTimeOrder,
      manualPo: false,
    };
    let orderNumber;
    let orderId;
    let user;

    before('Create user and open Select instance plugin', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(organization).then((response) => {
          organization.id = response;
          order.vendor = response;

          cy.createOrderApi(order).then((orderResponse) => {
            orderNumber = orderResponse.body.poNumber;
            orderId = orderResponse.body.id;

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
      Orders.deleteOrderViaApi(orderId);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C451616 Select Instance plugin | "Reset all" button returns search option to default (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C451616'] },
      () => {
        function searchResetAndCheck(searchOption, defaultOption) {
          SelectInstanceModal.checkTableContent();
          SelectInstanceModal.checkSearchOptionSelected(defaultOption);
          SelectInstanceModal.checkSearchInputFieldValue('');

          SelectInstanceModal.chooseSearchOption(searchOption);
          SelectInstanceModal.checkSearchOptionSelected(searchOption);
          SelectInstanceModal.fillInSearchQuery(query);
          SelectInstanceModal.checkSearchInputFieldValue(query);
          SelectInstanceModal.clickSearchButton();
          SelectInstanceModal.checkNoRecordsFound(query);

          SelectInstanceModal.clickResetAllButton();
          SelectInstanceModal.checkTableContent();
          SelectInstanceModal.checkSearchOptionSelected(defaultOption);
          SelectInstanceModal.checkSearchInputFieldValue('');
        }

        searchResetAndCheck(searchOptions.titleAll, searchOptions.keywordInstance);

        SelectInstanceModal.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();
        searchResetAndCheck(searchOptions.issn, searchOptions.keywordHoldings);

        SelectInstanceModal.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();
        searchResetAndCheck(searchOptions.barcode, searchOptions.keywordItem);
      },
    );
  });
});
