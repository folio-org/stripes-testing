import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      order: {},
      user: {},
    };
    const instanceTitle = `AT_C515009_FolioInstance ${getRandomPostfix()}`;
    const folioInstanceData = InventoryInstances.generateFolioInstances({
      count: 1,
      instanceTitlePrefix: instanceTitle,
      holdingsCount: 1,
      itemsCount: 1,
    });
    const facetData = {
      instance: [
        { name: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO, count: 1 },
        { name: 'Suppress from discovery', value: 'No', count: 1 },
      ],
      holdings: [
        { name: 'Source', value: INSTANCE_SOURCE_NAMES.FOLIO, count: 1 },
        { name: 'Suppress from discovery', value: 'No', count: 1 },
      ],
      item: [{ name: 'Suppress from discovery', value: 'No', count: 1 }],
    };
    let createdInstanceId;
    let location;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi(`${instanceTitle.split(' ')[0]}*`);

      cy.then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({
            vendorId: testData.organization.id,
          });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          location = res;
        });
      }).then(() => {
        InventoryInstances.createFolioInstancesViaApi({
          folioInstances: folioInstanceData,
          location,
        }).then(() => {
          createdInstanceId = folioInstanceData[0].instanceId;

          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiOrdersCreate.gui,
          ]).then((userProperties) => {
            testData.userProperties = userProperties;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
              authRefresh: true,
            });
            Orders.selectOrderByPONumber(testData.order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
      Users.deleteViaApi(testData.userProperties.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C515009 Select Instance plugin | Facet options display in expanded accordions when search has been performed and Instance/Holdings/Item tab is clicked (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C515009'] },
      () => {
        function searchAndVerifyFacets(data) {
          SelectInstanceModal.checkResultsListEmpty();
          SelectInstanceModal.searchByName(instanceTitle);
          data.forEach((facet) => {
            SelectInstanceModal.expandAccordion(facet.name);
            InventorySearchAndFilter.verifyFilterOptionCount(facet.name, facet.value, facet.count);
          });
        }

        searchAndVerifyFacets(facetData.instance);

        InventorySearchAndFilter.switchToInstance();
        InventorySearchAndFilter.instanceTabIsDefault();

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();

        searchAndVerifyFacets(facetData.holdings);

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();

        searchAndVerifyFacets(facetData.item);
      },
    );
  });
});
