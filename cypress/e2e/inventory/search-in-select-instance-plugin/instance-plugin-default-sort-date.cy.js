import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
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
    const titlePrefix = `AT_C553007_MarcBibInstance_${randomPostfix}`;
    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
    };
    const instancesData = [];
    const createdInstanceIds = [];
    const dateIndexes = randomizeArray(Array.from(Array(10).keys()));

    dateIndexes.forEach((dateIndex, index) => {
      instancesData.push({
        title: `${titlePrefix} ${index}`,
        date1: `${1901 + dateIndex}`,
      });
    });

    before('Create test data, user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('C553007_');

      cy.then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({
            vendorId: testData.organization.id,
          });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });

        instancesData.forEach((instance) => {
          const marcInstanceFields = [
            {
              tag: '008',
              content: {
                ...QuickMarcEditor.valid008ValuesInstance,
                Date1: instance.date1,
              },
            },
            {
              tag: '245',
              content: `$a ${instance.title}`,
              indicators: ['1', '1'],
            },
          ];
          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceIds.push(instanceId);
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiOrdersCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.ordersPath,
            waiter: Orders.waitLoading,
          });
          Orders.selectOrderByPONumber(testData.order.poNumber);
          OrderDetails.selectAddPOLine();
          OrderLineEditForm.clickTitleLookUpButton();
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
      'C553007 Select Instance plugin | Default sort is applied to search result list in "Inventory" app according to selected option in settings ("Date" case) (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C553007'] },
      () => {
        // Step 1: Search; verify results sorted by Date column
        SelectInstanceModal.searchByName(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkResultListSortedByColumn(2);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.verifyColumnHeaderSortableButNotSorted(
          INVENTORY_DEFAULT_SORT_OPTIONS.TITLE,
        );

        // Step 2: Click Title column heading; verify sorted by Title
        InventoryInstances.clickColumnHeader(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.checkResultListSortedByColumn(0);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
        InventoryInstances.verifyColumnHeaderSortableButNotSorted(
          INVENTORY_DEFAULT_SORT_OPTIONS.DATE,
        );

        // Step 3: Click Reset all; verify results cleared and defaults restored
        InventorySearchAndFilter.resetAll();
        SelectInstanceModal.checkResultsListEmpty();
        SelectInstanceModal.checkTableContent();
        InventorySearchAndFilter.verifyDefaultSearchInstanceOptionSelected();

        // Step 4: Search again; verify Date sort is restored
        SelectInstanceModal.searchByName(titlePrefix);
        InventorySearchAndFilter.verifySearchResult(instancesData[0].title);
        InventoryInstances.checkResultListSortedByColumn(2);
        InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
        InventoryInstances.verifyColumnHeaderSortableButNotSorted(
          INVENTORY_DEFAULT_SORT_OPTIONS.TITLE,
        );
      },
    );
  });
});
