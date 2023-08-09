import getRandomPostfix from '../../../support/utils/stringTools';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import DateTools from '../../../support/utils/dateTools';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Logs from '../../../support/fragments/data_import/logs/logs';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../support/constants';

describe('ui-data-import', () => {
  // Path to static file in fixtures
  const pathToStaticFile = 'oneMarcBib.mrc';
  // Create unique names for MARC files
  const fileNameForFailedImport = `C11113test${getRandomPostfix()}.mrc`;
  const fileNameForSuccessfulImport = `C11113test${getRandomPostfix()}.mrc`;
  let userName;
  let jobProfileName;
  let userFilterValue;

  before('create test data', () => {
    cy.loginAsAdmin();
    cy.getAdminToken();

    // Create files dynamically with given name and content in fixtures
    FileManager.createFile(`cypress/fixtures/${fileNameForFailedImport}`);
    // read contents of static file in fixtures
    cy.readFile(`cypress/fixtures/${pathToStaticFile}`).then(content => {
      // and write its contents to the file which runs successfully and create it
      FileManager.createFile(`cypress/fixtures/${fileNameForSuccessfulImport}`, content);
    });

    cy.visit(TopMenu.dataImportPath);
    // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.verifyUploadState();
    // Upload files
    // runs with errors
    cy.uploadFileWithDefaultJobProfile(fileNameForFailedImport);
    // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.verifyUploadState();
    // runs successfully
    cy.uploadFileWithDefaultJobProfile(fileNameForSuccessfulImport);

    // Remove generated test files from fixtures after uploading
    FileManager.deleteFile(`cypress/fixtures/${fileNameForSuccessfulImport}`);
    FileManager.deleteFile(`cypress/fixtures/${fileNameForFailedImport}`);
  });

  beforeEach(() => {
    LogsViewAll.getSingleJobProfile().then(({ jobProfileInfo, runBy }) => {
      const {
        firstName,
        lastName,
      } = runBy;
      jobProfileName = jobProfileInfo.name;
      userFilterValue = `${firstName} ${lastName}`;
      userName = firstName ? `${firstName} ${lastName}` : `${lastName}`;
    });
  });

  it('C11113 Filter the "View all" log screen (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    Logs.openViewAllLogs();
    LogsViewAll.checkByReverseChronologicalOrder();

    // FILTER By "Errors in Import"
    LogsViewAll.selectNofilterJobsByErrors();
    LogsViewAll.checkByErrorsInImport(JOB_STATUS_NAMES.COMPLETED);
    LogsViewAll.resetAllFilters();
    LogsViewAll.selectYesfilterJobsByErrors();
    LogsViewAll.checkByErrorsInImport(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS, JOB_STATUS_NAMES.FAILED);
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
    LogsViewAll.filterJobsByJobProfile(jobProfileName);
    LogsViewAll.checkByJobProfileName(jobProfileName);
    LogsViewAll.resetAllFilters();

    // FILTER By "User"
    LogsViewAll.openUserIdAccordion();
    LogsViewAll.filterJobsByUser(userFilterValue);
    LogsViewAll.checkByUserName(userName);

    LogsViewAll.resetAllFilters();

    // FILTER By "Inventory single record imports"
    LogsViewAll.openInventorysingleRecordImportsAccordion();
    LogsViewAll.singleRecordImportsStatuses.forEach(filter => {
      // need some waiting until checkboxes become clickable after resetting filters
      cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
      LogsViewAll.filterJobsByInventorySingleRecordImports(filter);
      LogsViewAll.checkByInventorySingleRecord(filter);
      LogsViewAll.resetAllFilters();
    });

    // FILTER By more than one filter
    // in this case, filter by "User" and "Errors in Import"

    LogsViewAll.selectNofilterJobsByErrors();
    LogsViewAll.filterJobsByUser(userFilterValue);
    LogsViewAll.checkByErrorsInImportAndUser(JOB_STATUS_NAMES.COMPLETED, userName);
    LogsViewAll.resetAllFilters();
  });
});
