import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
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
    const titlePrefix = `AT_C543876_Instance_${randomPostfix}`;
    const contributorPrefix = `AT_C543876_Contributor_${randomPostfix}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
    };
    const instancesData = [];
    const createdInstanceIds = [];
    const contributorIndexes = randomizeArray(Array.from(Array(10).keys()));

    contributorIndexes.forEach((contributorIndex, index) => {
      instancesData.push({
        title: `${titlePrefix} ${index}`,
        contributors: [
          {
            name: `${contributorPrefix} ${contributorIndexes[contributorIndex]}`,
          },
        ],
      });
    });

    before('Create test data, user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C543876');

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
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            instancesData.forEach((instance) => {
              instance.instanceTypeId = instanceTypes[0].id;
              instance.contributors[0].contributorNameTypeId = contributorNameTypes[0].id;
              InventoryInstances.createFolioInstanceViaApi({
                instance,
              }).then((instanceData) => {
                createdInstanceIds.push(instanceData.instanceId);
              });
            });
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          // default settings - set up just in case someone changed it:
          cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());

          cy.login(testData.user.username, testData.user.password, {
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

    after('Delete test data, user', () => {
      cy.getAdminToken();
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C543876 Select Instance plugin | Default sort is applied to search result list in "Inventory" app according to selected option in settings ("Title" case) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C543876'] },
      () => {
        SelectInstanceModal.searchByName(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkResultListSortedByColumn(0);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.verifyColumnHeaderSortableButNotSorted(
          INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS,
        );

        InventoryInstances.clickColumnHeader(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS);
        InventoryInstances.verifyColumnHeaderSortableButNotSorted(
          INVENTORY_DEFAULT_SORT_OPTIONS.TITLE,
        );

        InventorySearchAndFilter.resetAll();
        SelectInstanceModal.checkResultsListEmpty();
        SelectInstanceModal.checkTableContent();
        InventorySearchAndFilter.verifyDefaultSearchInstanceOptionSelected();

        SelectInstanceModal.searchByName(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkResultListSortedByColumn(0);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.verifyColumnHeaderSortableButNotSorted(
          INVENTORY_DEFAULT_SORT_OPTIONS.CONTRIBUTORS,
        );
      },
    );
  });
});
