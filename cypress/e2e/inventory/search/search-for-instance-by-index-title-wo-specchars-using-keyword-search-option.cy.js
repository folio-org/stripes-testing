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
    'jurassic park the truth is terrifying',
    'JURASSIC PARK THE TRUTH IS TERRIFYING',
    'Jurassic Park The Truth Is Terrifying',
    'Jurassic Park',
    'Terrifying truth Jurassic Park',
    'Jurassic  Park : the truth is terrifying',
    'Jurassic  Park & the truth is terrifying',
    'Jurassic  Park / the truth is terrifying',
    'Jurassic Park /the truth is terrifying',
    'Jurassic Park the truth is terrifying;',
    '...Jurassic Park the truth is terrifying',
  ],

  negativeSearchQueries: [
    'Jurassicpark the truth is terrifying',
    'Jurassic  Park \\ the truth is terrifying',
    '. Jurassic Park the truth is terrifying  ',
    '(Jurassic Park ) the truth is terrifying',
    'Jurassic Park the truth is NOT terrifying',
    'J. P. the truth is terrifying',
  ],

  searchResults: [
    'JURASSIC PARK THE TRUTH IS TERRIFYING edited by Nicolas Michaud and Jessica Watkins',
    'jurassic park the truth is terrifying edited by Nicolas Michaud and Jessica Watkins',
    'Jurassic Park And Philosophy The Truth Is Terrifying edited by Nicolas Michaud and Jessica Watkins',
  ],
  marcFile: {
    marc: 'marcBibC368046.mrc',
    fileName: `testMarcFileC368046.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numberOfRecords: 3,
  },
};

describe('inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.getInstancesViaApi({
        limit: 100,
        query: `title="${testData.positiveSearchQueries[0]}"`,
      }).then((instances) => {
        if (instances) {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        }
      });
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
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
      'C368046 Search for "Instance" by "Index title" field without special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
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

        InventoryInstances.searchByTitle('Jurassic Park And Philosophy The Truth Is Terrifying');
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[2], true);
      },
    );
  });
});
