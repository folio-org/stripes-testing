import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

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
        DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
        JobProfiles.search(testData.marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcFile.fileName);
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
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        testData.positiveSearchQueries.forEach((query) => {
          InventoryInstance.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(3);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        testData.negativeSearchQueries.forEach((query) => {
          InventoryInstance.searchByTitle(query, false);
          InventorySearchAndFilter.verifyNoRecordsFound();
          InventoryInstances.resetAllFilters();
        });

        InventoryInstance.searchByTitle('Hasidic New Wave (Musical Group) from NY');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
