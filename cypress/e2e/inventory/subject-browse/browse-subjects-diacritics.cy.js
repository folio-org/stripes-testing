import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('Inventory', () => {
  describe('Subject Browse', () => {
    const testData = {
      queries: ['Māoriauto C466296 poetry--21st century', 'Maoriauto C466296 poetry--21st century'],
    };

    const fileName = `C466296 testMarcFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const propertyName = 'instance';

    const createdInstanceIDs = [];

    before('Creating user and instance', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.preconditionUserId = userProperties.userId;

        InventoryInstances.deleteFullInstancesByTitleViaApi('C466296');

        DataImport.uploadFileViaApi('marcFileForC466296.mrc', fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdInstanceIDs.push(record[propertyName].id);
            });
          },
        );
      });

      cy.createTempUser([Permissions.uiInventoryViewInstances.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        BrowseSubjects.waitForSubjectToAppear(testData.queries[0]);
      });
    });

    after('Deleting user and instance', () => {
      cy.getAdminToken();
      createdInstanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
      Users.deleteViaApi(testData.user.userId);
      Users.deleteViaApi(testData.preconditionUserId);
    });

    it(
      'C466296 Browse subjects which has diacritics (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466296'] },
      () => {
        [
          testData.queries[0],
          testData.queries[0] + ' test',
          testData.queries[1],
          testData.queries[1] + ' test',
        ].forEach((query) => {
          BrowseSubjects.searchBrowseSubjects(query);
          BrowseSubjects.checkSearchResultsTable();
          if (query.includes('test')) {
            BrowseSubjects.verifyNonExistentSearchResult(query);
          } else {
            BrowseSubjects.checkRowValueIsBold(5, testData.queries[0]);
          }
          InventoryInstances.checkResultListSortedByColumn(0);
          InventorySearchAndFilter.clickResetAllButton();
          InventorySearchAndFilter.verifyBrowseResultPaneEmpty();
        });
      },
    );
  });
});
