import { JOB_STATUS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  user: {},
  instanceIDs: [],
  positiveSearchQueries: [
    'hasidic new wave (musical group)',
    'HASIDIC NEW WAVE (MUSICAL GROUP)',
    'Hasidic New Wave (Musical Group)',
    'Hasidic New Wave',
    'Musical Group Hasidic Wave New',
    'Hasidic : New Wave (Musical group)',
    'Hasidic & New Wave (Musical group)',
    'Hasidic / New Wave (Musical group)',
    'Hasidic \\New Wave (Musical group)',
    'Hasidic New Wave (Musical group);',
    '...Hasidic New Wave Musical group',
    '[Hasidic] New Wave (Musical group)',
  ],
  negativeSearchQueries: [
    'Hasidic Newwave (Musical group)',
    'Hasidic - New Wave (Musical group)',
    '. Hasidic New Wave Musical group  ',
    'Hasidic New Wave (Musical group) album',
    'Hasidic N.W. (Mg)',
  ],

  searchResults: [
    'MSEARCH-466 Title 1 search for "Instance" by "Contributor name" field without special characters',
    'MSEARCH-466 Title 2 search for "Instance" by "Contributor name" field without special characters',
    'MSEARCH-466 Title 3 search for "Instance" by "Contributor name" field without special characters',
  ],
  marcFile: {
    marc: 'marcBibC368475.mrc',
    fileName: `testMarcFileC368475.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numberOfRecords: 3,
  },
};

describe('inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.marcFile.marc, testData.marcFile.fileName);
        JobProfiles.search(testData.marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFile.fileName);
        for (let i = 0; i < testData.marcFile.numberOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            testData.instanceIDs.push(link.split('/')[5]);
          });
        }
      });
      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C368475 Search for "Instance" by "Contributor name" field without special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        testData.positiveSearchQueries.forEach((query) => {
          InventoryInstances.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(3);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        testData.negativeSearchQueries.forEach((query) => {
          InventoryInstances.searchByTitle(query, false);
          InventorySearchAndFilter.verifyNoRecordsFound();
          InventoryInstances.resetAllFilters();
        });

        InventoryInstances.searchByTitle('Hasidic New Wave (Musical Group) from NY');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
