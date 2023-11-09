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
  searchQueries: [
    'Arroyo Center 1984 Force Development Technology Program',
    'Arroyo Center 1984 Force Development & Technology Program',
    'Arroyo Center : 1984 Force Development Technology Program',
    '"Arroyo Center" 1984 / Force-Development {Technology Program}',
    'Arroyo Center: 1984 Force/ Development&Technology Program',
    'Technology Program : (Force Development) Arroyo Center "1984".',
  ],
  searchResults: [
    'Arroyo Center 1984 Force Development and Technology Program',
    'Arroyo Center 1984 Force Development & Technology Program',
    'Arroyo Center : 1984 Force Development Technology Program',
    '"Arroyo Center" 1984 / Force-Development {Technology Program}',
    '.Arroyo Center - 1984 Force Development [Technology] Program !',
    'Arroyo Center & 1984 Force Development : Technology / (Program for gov)',
    'Arroyo Center 1984 Force Development Technology Program',
    'Arroyo Center: 1984 Force/ Development&Technology Program',
  ],
  marcFile: {
    marc: 'marcBibC368043.mrc',
    fileName: `testMarcFileC368043.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numberOfRecords: 8,
  },
};

describe('inventory', () => {
  describe('Search in Inventory', () => {
    before('Create test data', () => {
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
      'C368043 Search for "Instance" by "Contributor name" field with special characters using "Keyword" search option (spitfire) (TaaS)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        testData.searchQueries.forEach((query) => {
          InventoryInstance.searchByTitle(query);
          InventorySearchAndFilter.checkRowsCount(8);
          testData.searchResults.forEach((result) => {
            InventorySearchAndFilter.verifyInstanceDisplayed(result, true);
          });
          InventoryInstances.resetAllFilters();
        });

        InventoryInstance.searchByTitle(
          'Arroyo Center 1984 Force Development and Technology Program',
        );
        InventorySearchAndFilter.checkRowsCount(3);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[0], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[1], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstance.searchByTitle(
          'Arroyo Center & 1984 Force Development : Technology / (Program for gov)',
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstance.searchByTitle(
          '.Arroyo Center - 1984 Force Development [Technology] Program !',
          false,
        );
        InventorySearchAndFilter.verifyNoRecordsFound();
      },
    );
  });
});
