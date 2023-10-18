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
    'Harry Potter the cursed child Parts one, two',
    'Harry Potter : the cursed child Parts one, two',
    'Harry Potter : the cursed child Parts one, two',
    'Harry Potter / the cursed child Parts one, two',
    'Harry Potter&the-cursed child: Parts one/ two',
    'the cursed child : Harry Potter',
  ],
  searchResults: [
    'Harry Potter and the cursed child Parts one, two',
    'Harry Potter & the cursed child; Parts one, two',
    'Harry Potter : the cursed child Parts one, two.',
    '"Harry Potter" / the cursed child {Parts one, two}',
    '.Harry Potter - the cursed child [Parts] one, two !',
    'Harry Potter & the cursed child : Parts one / two, (a new play by writer Jack Thorne).',
    'Harry Potter the cursed child Parts one two',
    'Harry Potter&the cursed child: Parts one/ two',
  ],
  marcFile: {
    marc: 'marcBibC368027.mrc',
    fileName: `testMarcFileC368027.${randomFourDigitNumber()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
    numberOfRecords: 8,
  },
};

describe('Inventory', () => {
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
      Users.deleteViaApi(testData.user.userId);
      testData.instanceIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C368027 Search for "Instance" by "Title" field with special characters using "Keyword" search option (spitfire) (TaaS)',
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

        InventoryInstance.searchByTitle('Harry Potter and the cursed child Parts one, two');
        InventorySearchAndFilter.checkRowsCount(3);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[0], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[1], true);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstance.searchByTitle(
          'Harry Potter & the cursed child : Parts one / two, (a new play by writer Jack Thorne).',
        );
        InventorySearchAndFilter.checkRowsCount(1);
        InventorySearchAndFilter.verifyInstanceDisplayed(testData.searchResults[5], true);

        InventoryInstances.resetAllFilters();
        InventoryInstance.searchByTitle('Harry Potter - the cursed child Parts one, two', false);
        InventorySearchAndFilter.verifyNoRecordsFound();
      },
    );
  });
});
