import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances, {
  searchItemsOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { INVENTORY_DEFAULT_SORT_OPTIONS } from '../../../support/constants';
import { randomizeArray } from '../../../support/utils/arrays';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

describe('Inventory', () => {
  describe('Search in "Select instance" plugin', () => {
    const randomPostfix = getRandomPostfix();
    const titlePrefix = `AT_C543878_FolioInstance_${randomPostfix}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
    };
    const instancesData = [];
    const createdInstanceIds = [];
    const contributorIndexes = randomizeArray(Array.from(Array(10).keys()));
    const defaultItemSearchOption = searchItemsOptions[0];

    contributorIndexes.forEach((contributorIndex, index) => {
      instancesData.push({
        title: `${titlePrefix} ${index}`,
      });
    });

    before('Create test data, user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C543878_');

      cy.then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({
            vendorId: testData.organization.id,
          });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instancesData.forEach((instance) => {
            instance.instanceTypeId = instanceTypes[0].id;
            InventoryInstances.createFolioInstanceViaApi({
              instance,
            }).then((instanceData) => {
              createdInstanceIds.push(instanceData.instanceId);
            });
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.RELEVANCE);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
          Orders.selectOrderByPONumber(testData.order.poNumber);
          OrderDetails.selectAddPOLine();
          OrderLineEditForm.clickTitleLookUpButton();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.itemTabIsDefault();
        });
      });
    });

    after('Delete test data, user', () => {
      cy.getAdminToken();
      cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C543878 Select Instance plugin | Default sort is applied to search result list in "Inventory" app according to selected option in settings ("Relevance" case) (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C543878'] },
      () => {
        // Step 1: Search; verify Relevance sort — no column sorted, no sortby in request
        cy.intercept('/search/instances*').as('searchInstances');
        SelectInstanceModal.searchByName(titlePrefix);
        cy.wait('@searchInstances').then(({ request }) => {
          expect(request.url).not.to.include('sortby');
        });
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE, null);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS, null);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE, null);

        // Step 2: Click Title column heading; verify sorted by Title
        InventoryInstances.clickColumnHeader(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.checkResultListSortedByColumn(0);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);

        // Step 3: Click Reset all; verify results cleared and defaults restored
        InventorySearchAndFilter.resetAll();
        SelectInstanceModal.checkResultsListEmpty();
        SelectInstanceModal.checkTableContent();
        InventorySearchAndFilter.searchTypeDropdownDefaultValue(defaultItemSearchOption);

        // Step 4: Search again; verify Relevance sort is restored
        cy.intercept('/search/instances*').as('searchInstancesAgain');
        SelectInstanceModal.searchByName(titlePrefix);
        cy.wait('@searchInstancesAgain').then(({ request }) => {
          expect(request.url).not.to.include('sortby');
        });
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE, null);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS, null);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE, null);
      },
    );
  });
});
