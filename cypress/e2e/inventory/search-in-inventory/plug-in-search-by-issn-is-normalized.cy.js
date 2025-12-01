import permissions from '../../../support/dictionary/permissions';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import NewOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
  searchHoldingsOptions,
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const testData = {
      instanceTitlePrefix: 'C831998_Instance_Case_1',
      instanceTitles: [],
      issnNumbers: ['0031-8286', '00318286', '0031 8286'],
      searchQueries: ['0031-8286', '00318286', '0031 8286', ' 0031-8286', '0031-8286 '],
    };

    const searchOptions = {
      instance: [
        `${searchInstancesOptions[0]}`, // Keyword
        `${searchInstancesOptions[3]}`, // Identifier(all)
        `${searchInstancesOptions[6]}`, // ISSN
      ],
      holdings: [
        `${searchHoldingsOptions[0]}`, // Keyword
        `${searchHoldingsOptions[2]}`, // ISSN
      ],
      items: [
        `${searchItemsOptions[0]}`, // Keyword
        `${searchItemsOptions[3]}`, // ISSN
      ],
    };

    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      paymentMethod: 'EFT',
    };

    const order = {
      ...NewOrder.defaultOneTimeOrder,
      manualPo: false,
    };

    const instanceIds = [];
    let instanceTypeId;
    let issnTypeId;
    let orderNumber;
    let user;
    let orderID;

    before('Create test data and login', () => {
      cy.getAdminToken();

      InventoryInstances.deleteFullInstancesByTitleViaApi(testData.instanceTitlePrefix);

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        InventoryInstances.getIdentifierTypes({ query: 'name="ISSN"' }).then((identifier) => {
          issnTypeId = identifier.id;
        });
      }).then(() => {
        testData.issnNumbers.forEach((issn, index) => {
          const title = `${testData.instanceTitlePrefix}_${index + 1}`;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              title,
              identifiers: [
                {
                  value: issn,
                  identifierTypeId: issnTypeId,
                },
              ],
              instanceTypeId,
            },
          }).then((instanceData) => {
            instanceIds.push(instanceData.instanceId);
            testData.instanceTitles.push(title);
          });
        });
      });

      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
        order.vendor = response;
      });
      cy.createOrderApi(order).then((response) => {
        orderNumber = response.body.poNumber;
        orderID = response.body.id;
      });
      cy.createTempUser([permissions.inventoryAll.gui, permissions.uiOrdersCreate.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      instanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Orders.deleteOrderViaApi(orderID);
      Organizations.deleteOrganizationViaApi(organization.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C831998 Select Instance plugin | Verify ISSN search normalization - Case 1 (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C831998'] },
      () => {
        // Preconditions: User has opened "Select instance" plug-in -> "Instance" tab is selected
        Orders.searchByParameter('PO number', orderNumber);
        Orders.selectFromResultsList(orderNumber);
        OrderLines.addPOLine();
        OrderLines.clickTitleLookUp();
        InventorySearchAndFilter.instanceTabIsDefault();

        // Run searchse on Instance tab
        testData.searchQueries.forEach((query) => {
          searchOptions.instance.forEach((option) => {
            SelectInstanceModal.searchByParameter(option, query);
            testData.instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
          });
        });

        // Run searchse on Holdings tab
        SelectInstanceModal.switchToHoldings();
        testData.searchQueries.forEach((query) => {
          searchOptions.holdings.forEach((option) => {
            SelectInstanceModal.searchByParameter(option, query);
            testData.instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
          });
        });

        // Run searchse on Item tab
        SelectInstanceModal.switchToItem();
        testData.searchQueries.forEach((query) => {
          searchOptions.items.forEach((option) => {
            SelectInstanceModal.searchByParameter(option, query);
            testData.instanceTitles.forEach((title) => {
              InventorySearchAndFilter.verifySearchResult(title);
            });
          });
        });
      },
    );
  });
});
