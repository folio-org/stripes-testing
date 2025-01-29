import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const testData = {
  dateColumnName: 'Date',
  searchQuery: 'C553003 Autotest',
  titleHeader: 'Title',
  dateHeader: 'Date',
  datesSorted: [
    '',
    '0000-9999',
    'd #U-9998',
    'abcd, 1234',
    '____-1003',
    'uuuu, 1701',
    '!()/-0515',
    '0007-9998',
    'ddd9-0515',
    '0037-9998',
    'dd99-0515',
    '0337-9997',
    'u677-1795',
    'c677-1003',
    '677, 1913',
    'd999-0515',
    '1uuu-1702',
    '1 , 2000',
    '1aba-1003',
    '1d77-2003',
    '1u77-1977',
    '1 77, 3',
    '16 , 2009',
    '16ab, 2015',
    '16uu-1703',
    '167u',
    '167',
    '167b, 123',
    '1678-2009',
    '9999-9999',
  ],
};

const marcFile = {
  marc: 'marcBibFileC553003.mrc',
  fileName: `testMarcFileC553003.${getRandomPostfix()}.mrc`,
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
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: `title="${testData.searchQuery}*"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });

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
    });

    before('Create user, login', () => {
      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testUser = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
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
    });

    it(
      'C553003 Apply "Date" sort option to the Instance/Holdings/Item search result list in "Inventory" app" (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C553003'] },
      () => {
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventoryInstances.searchByTitle(testData.searchQuery);
        InventoryInstances.checkColumnHeaderSort(testData.titleHeader);
        InventoryInstances.checkResultListSortedByColumn(1);
        InventoryInstances.actionsSortBy(testData.dateHeader);
        InventoryInstances.checkColumnHeaderSort(testData.dateHeader);
        testData.datesSorted.forEach((date, index) => {
          InventoryInstances.verifyValueInColumnForRow(index, testData.dateColumnName, date);
        });
      },
    );
  });
});
