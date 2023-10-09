import getRandomPostfix from '../../../support/utils/stringTools';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import permissions from '../../../support/dictionary/permissions';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Parallelization from '../../../support/dictionary/parallelization';

describe('Inventory > Subject Browse', () => {
  const testData = {
    testValue: 'Physics projects.',
  };

  const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
  const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';

  const createdInstanceIDs = [];

  before('Creating user and instance', () => {
    cy.createTempUser([permissions.uiSubjectBrowse.gui]).then((userProperties) => {
      testData.user = userProperties;

      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.uploadFile('marcFileForC350387.mrc', fileName);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileName);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(fileName);
        for (let i = 0; i < 2; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            createdInstanceIDs.push(link.split('/')[5]);
          });
        }
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventorySearchAndFilter.waitLoading,
      });
    });
  });

  after('Deleting user and instance', () => {
    createdInstanceIDs.forEach((id) => {
      InventoryInstance.deleteInstanceViaApi(id);
    });
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350387 Verify the "Browse subjects" result list (spitfire)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
    () => {
      InventorySearchAndFilter.switchToBrowseTab();
      BrowseSubjects.searchBrowseSubjects(testData.testValue);
      BrowseSubjects.checkSearchResultsTable();
      BrowseSubjects.checkResultAndItsRow(5, `${testData.testValue}would be here`);
      BrowseSubjects.checkPaginationButtons();

      BrowseSubjects.clickPreviousPaginationButton();
      BrowseSubjects.checkAbsenceOfResultAndItsRow(5, `${testData.testValue}would be here`);

      BrowseSubjects.clickNextPaginationButton();
      BrowseSubjects.checkResultAndItsRow(5, `${testData.testValue}would be here`);
    },
  );
});
