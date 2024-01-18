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
    'a history of dazed and confused',
    'A HISTORY Of DAZED AND CONFUSED',
    'A History Of Dazed And Confused',
    'Dazed',
    'Confused a History',
    'A History : Dazed And Confused',
    'A History & Dazed And Confused',
    'A History / Dazed And Confused',
    'A History \\Dazed And Confused',
    'A History of Dazed And Confused;',
    '".A History of Dazed And Confused',
  ],
  negativeSearchQueries: [
    'DazedandConfused a History',
    'A History \\ Dazed And Confused',
    '. A History of Dazed And Confused',
    'A History of (Dazed And Confused )',
    'A History of Dazed And Confused by writer Melissa Maerz',
    'A History of D. C.',
  ],

  searchResults: [
    'MSEARCH-466 Title 1: search for "Instance" by "Alternative title" field without special characters',
    'MSEARCH-466 Title 2: search for "Instance" by "Alternative title" field without special characters',
    'MSEARCH-466 Title 3: search for "Instance" by "Alternative title" field without special characters',
  ],
  marcFile: {
    marc: 'marcBibC368045.mrc',
    fileName: `testMarcFileC368045.${randomFourDigitNumber()}.mrc`,
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
      'C368045 Search for "Instance" by "Alternative title" field without special characters using "Keyword" search option (spitfire) (TaaS)',
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

        InventoryInstances.searchByTitle('A History Of Richard Linklater Dazed And Confused');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
