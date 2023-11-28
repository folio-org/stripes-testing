import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import DateTools from '../../../support/utils/dateTools';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import Logs from '../../../support/fragments/data_import/logs/logs';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    const testData = {
      // Path to static file in fixtures
      pathToStaticFile: 'oneMarcBib.mrc',
      jobProfileName: 'Default - Create instance and SRS MARC Bib',
      fileNameForFailedImport: `C11113test${getRandomPostfix()}.mrc`,
      fileNameForSuccessfulImport: `C11113test${getRandomPostfix()}.mrc`,
      oclcNumber: '1234567',
      OCLCAuthentication: '100481406/PAOLF',
    };

    before('create test data', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
        // Create files dynamically with given name and content in fixtures
        FileManager.createFile(`cypress/fixtures/${testData.fileNameForFailedImport}`);
        // read contents of static file in fixtures
        cy.readFile(`cypress/fixtures/${testData.pathToStaticFile}`).then((content) => {
          // and write its contents to the file which runs successfully and create it
          FileManager.createFile(
            `cypress/fixtures/${testData.fileNameForSuccessfulImport}`,
            content,
          );
        });
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        cy.uploadFileWithDefaultJobProfile(testData.fileNameForFailedImport);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        cy.uploadFileWithDefaultJobProfile(testData.fileNameForSuccessfulImport);

        // Remove generated test files from fixtures after uploading
        FileManager.deleteFile(`cypress/fixtures/${testData.fileNameForSuccessfulImport}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.fileNameForFailedImport}`);
      });

      cy.getAdminToken();
      cy.loginAsAdmin({
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      // import with Single record import
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(testData.OCLCAuthentication);
      InventoryInstances.importWithOclc(testData.oclcNumber);
    });

    it(
      'C11113 Filter the "View all" log screen (folijet)',
      { tags: [TestTypes.smoke, DevTeams.folijet] },
      () => {
        cy.visit(TopMenu.dataImportPath);
        Logs.openViewAllLogs();
        LogsViewAll.checkByReverseChronologicalOrder();

        // FILTER By "Errors in Import"
        LogsViewAll.selectNofilterJobsByErrors();
        LogsViewAll.checkByErrorsInImport(JOB_STATUS_NAMES.COMPLETED);
        LogsViewAll.resetAllFilters();
        LogsViewAll.selectYesfilterJobsByErrors();
        LogsViewAll.checkByErrorsInImport(
          JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS,
          JOB_STATUS_NAMES.FAILED,
        );
        LogsViewAll.resetAllFilters();

        // FILTER By "Date"
        const startedDate = new Date();
        const completedDate = startedDate;

        // format date as YYYY-MM-DD
        const formattedStart = DateTools.getFormattedDate({ date: startedDate });

        // api endpoint expects completedDate increased by 1 day
        completedDate.setDate(completedDate.getDate() + 1);

        LogsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });

        const formattedEnd = DateTools.getFormattedDate({ date: completedDate });
        LogsViewAll.checkByDate({ from: formattedStart, end: formattedEnd });
        LogsViewAll.resetAllFilters();

        // FILTER By "Job profile"
        LogsViewAll.filterJobsByJobProfile(testData.jobProfileName);
        LogsViewAll.checkByJobProfileName(testData.jobProfileName);
        LogsViewAll.resetAllFilters();

        // FILTER By "User"
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${testData.user.firstName} ${testData.user.lastName}`);
        LogsViewAll.resetAllFilters();

        // FILTER By "Inventory single record imports"
        LogsViewAll.openInventorysingleRecordImportsAccordion();
        LogsViewAll.singleRecordImportsStatuses.forEach((filter) => {
          // need some waiting until checkboxes become clickable after resetting filters
          cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
          LogsViewAll.filterJobsByInventorySingleRecordImports(filter);
          LogsViewAll.checkByInventorySingleRecord(filter);
          LogsViewAll.resetAllFilters();
        });

        // FILTER By more than one filter
        // in this case, filter by "User" and "Errors in Import"
        LogsViewAll.selectNofilterJobsByErrors();
        LogsViewAll.filterJobsByUser(`${testData.user.firstName} ${testData.user.lastName}`);
        LogsViewAll.checkByErrorsInImportAndUser(
          JOB_STATUS_NAMES.COMPLETED,
          `${testData.user.firstName} ${testData.user.lastName}`,
        );
        LogsViewAll.resetAllFilters();
      },
    );
  });
});
