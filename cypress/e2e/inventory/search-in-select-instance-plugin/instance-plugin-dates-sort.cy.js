import {
  DEFAULT_JOB_PROFILE_NAMES,
  INVENTORY_DEFAULT_SORT_OPTIONS,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import { NewOrder, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import OrderLineEditForm from '../../../support/fragments/orders/orderLineEditForm';
import OrderDetails from '../../../support/fragments/orders/orderDetails';
import SelectInstanceModal from '../../../support/fragments/orders/modals/selectInstanceModal';

const testData = {
  searchQuery: 'AT_C553005_MarcBibInstance',
  organization: NewOrganization.getDefaultOrganization(),
  titleHeader: INVENTORY_DEFAULT_SORT_OPTIONS.TITLE,
  dateHeader: INVENTORY_DEFAULT_SORT_OPTIONS.DATE,
  datesSorted: [
    '',
    '0001-9999',
    'd #2-9998',
    'abc3, 1234',
    '___4-1003',
    'uuu5, 1701',
    '!()6-0515',
    '0007-9998',
    'ddd9-0515',
    '0037-9998',
    'dd99-0515',
    '0337-9997',
    'u677-1795',
    'c678-1003',
    ' 679, 1913',
    'd999-0515',
    '1   -1702',
    '1uu1, 2000',
    '1ab2-1003',
    '1d77-2003',
    '1u78-1977',
    '1 79,    3',
    '16  , 2009',
    '16a1, 2015',
    '16u2-1703',
    '167u',
    '1671',
    '168b, 123 ',
    '1688-2009',
    '9999-9999',
  ],
};

const marcFile = {
  marc: 'marcBibFileC553005.mrc',
  fileName: `testMarcFileC553005.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
  propertyName: 'instance',
};

const createdInstanceIds = [];
let testUser;
let userForImport;

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C553005');
      // default settings - set up just in case someone changed it:
      cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());

      cy.then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.order = NewOrder.getDefaultOngoingOrder({
            vendorId: testData.organization.id,
          });
          Orders.createOrderViaApi(testData.order).then((order) => {
            testData.order = order;
          });
        });
      })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.dataImportUploadAll.gui,
          ]).then((userProperties) => {
            userForImport = userProperties;
            cy.getToken(userForImport.username, userForImport.password, false);
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdInstanceIds.push(record[marcFile.propertyName].id);
              });
            });
          });
        })
        .then(() => {
          cy.getAdminToken();
          cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());
          cy.createTempUser([
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiOrdersCreate.gui,
          ]).then((userProperties) => {
            testUser = userProperties;

            // default settings - set up just in case someone changed it:
            cy.setupInventoryDefaultSortViaAPI(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE.toLowerCase());

            cy.login(testUser.username, testUser.password, {
              path: TopMenu.ordersPath,
              waiter: Orders.waitLoading,
            });
            Orders.selectOrderByPONumber(testData.order.poNumber);
            OrderDetails.selectAddPOLine();
            OrderLineEditForm.clickTitleLookUpButton();
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(userForImport.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Orders.deleteOrderViaApi(testData.order.id);
    });

    it(
      'C553005 Select Instance plugin | Apply "Date" sort option to the Instance/Holdings/Item search result list in "Inventory" app" (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C553005'] },
      () => {
        function sortDatesAndCheck(isAscending) {
          const datesArray = isAscending ? testData.datesSorted : testData.datesSorted.toReversed();

          InventoryInstances.clickColumnHeader(INVENTORY_DEFAULT_SORT_OPTIONS.DATE);
          InventoryInstances.checkColumnHeaderSort(
            INVENTORY_DEFAULT_SORT_OPTIONS.DATE,
            isAscending,
          );
          datesArray.forEach((date, index) => {
            InventoryInstances.verifyValueInColumnForRow(
              index,
              INVENTORY_DEFAULT_SORT_OPTIONS.DATE,
              date,
            );
          });
        }

        function searchAndVerifyDatesSort() {
          SelectInstanceModal.checkResultsListEmpty();
          SelectInstanceModal.checkTableContent();

          SelectInstanceModal.searchByName(testData.searchQuery);
          InventoryInstances.checkColumnHeaderSort(INVENTORY_DEFAULT_SORT_OPTIONS.TITLE);
          InventoryInstances.checkResultListSortedByColumn(1);

          sortDatesAndCheck(true);
          sortDatesAndCheck(false);
        }

        searchAndVerifyDatesSort();

        InventorySearchAndFilter.switchToHoldings();
        InventorySearchAndFilter.holdingsTabIsDefault();

        searchAndVerifyDatesSort();

        InventorySearchAndFilter.switchToItem();
        InventorySearchAndFilter.itemTabIsDefault();

        searchAndVerifyDatesSort();

        sortDatesAndCheck(true);
      },
    );
  });
});
