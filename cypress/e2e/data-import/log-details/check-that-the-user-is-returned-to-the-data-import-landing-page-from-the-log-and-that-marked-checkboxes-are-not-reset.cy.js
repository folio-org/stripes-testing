import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('data-import', () => {
  describe('Log details', () => {
    const testData = {};
    const createdRecordsIDs = [];

    const marcFiles = [
      {
        marc: 'marcBibC357050-1.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      },
      {
        marc: 'marcBibC357050-2.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      },
    ];

    before('Creating user and uploading files', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        marcFiles.forEach((marcFile, i) => {
          DataImport.uploadFile(marcFile.marc, marcFile.fileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.waitLoadingList();
          JobProfiles.search(marcFile.jobProfileToRun);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(marcFile.fileName);
          if (i === 0) {
            Logs.checkStatusOfJobProfile('Completed');
          } else {
            Logs.checkStatusOfJobProfile('Completed with errors');
          }
          Logs.openFileDetails(marcFile.fileName);
          Logs.getCreatedItemsID().then((link) => {
            createdRecordsIDs.push(link.split('/')[5]);
          });
          Logs.closePane();
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
      ]).then((createdUserProperties) => {
        testData.user = createdUserProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      createdRecordsIDs.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C357050 Check that the user is returned to the Data Import Landing page from the Log, and that marked checkboxes are not reset (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Step 1: Go to the "Data import" app
        DataImport.checkIsLandingPageOpened();

        // Step 2: Mark the checkbox for a few logs
        DataImport.selectLog(0);
        DataImport.selectLog(1);
        DataImport.verifyLogsPaneSubtitleExist(2);

        // Step 3: Click the file name hotlink from a precondition that was imported with a status of "Completed with error"
        Logs.openFileDetails(marcFiles[1].fileName);

        // Step 4: Click any textLink error counter in the "Log summary" table
        FileDetails.openErrorInSummaryTable(3);
        FileDetails.verifyResultsListIsVisible();
        FileDetails.verifyQuantityOfRecordsWithError(4);
        FileDetails.verifyLogSummaryTableIsHidden();

        // Step 5: Click on the "X" button at the top left of the log details
        FileDetails.close();
        FileDetails.verifyResultsListIsVisible();
        FileDetails.verifyLogSummaryTableIsDisplayed();

        // Step 6: Click on the "X" button  at the top left of the log details
        FileDetails.close();
        DataImport.checkIsLandingPageOpened();
        DataImport.verifyLogsPaneSubtitleExist(2);
      },
    );
  });
});
