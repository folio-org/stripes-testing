import logsViewAll from '../../support/fragments/data_import/logs/logsViewAll';
import FileManager from '../../support/utils/fileManager';
import DateTools from '../../support/utils/dateTools';
import { Accordion } from '../../../interactors';
import getRandomPostfix from '../../support/utils/stringTools';
import settingsMenu from '../../support/fragments/settingsMenu';

describe('ui-data-import: Filter the "View all" log screen', () => {
  // Path to static file in fixtures
  const pathToStaticFile = 'oneMarcBib.mrc';
  // Create unique names for MARC files
  const fileNameForFailedImport = `C11113test${getRandomPostfix()}.mrc`;
  const fileNameForSuccessfulImport = `C11113test${getRandomPostfix()}.mrc`;
  let userName;
  let jobProfileName;
  let userNameId;
  let profileId;

  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );

    // Create files dynamically with given name and content in fixtures
    FileManager.createFile(`cypress/fixtures/${fileNameForFailedImport}`);
    // read contents of static file in fixtures
    cy.readFile(`cypress/fixtures/${pathToStaticFile}`).then(content => {
    // and write its contents to the file which runs successfully and create it
      FileManager.createFile(`cypress/fixtures/${fileNameForSuccessfulImport}`, content);
    });

    cy.visit(`${settingsMenu.dataImportPath}`);
    // Upload files
    // runs with errors
    cy.uploadFileWithDefaultJobProfile(fileNameForFailedImport);
    cy.reload();
    // runs successfully
    cy.uploadFileWithDefaultJobProfile(fileNameForSuccessfulImport);

    // Remove generated test files from fixtures after uploading
    FileManager.deleteFile(`cypress/fixtures/${fileNameForSuccessfulImport}`);
    FileManager.deleteFile(`cypress/fixtures/${fileNameForFailedImport}`);
  });

  beforeEach(() => {
    logsViewAll.getSingleJobProfile().then(({ jobProfileInfo, runBy, userId }) => {
      jobProfileName = jobProfileInfo.name;
      userName = `${runBy.firstName} ${runBy.lastName}`;
      userNameId = userId;
      profileId = jobProfileInfo.id;
    });
  });

  it('C11113 Filter the "View all" log screen', { tags: '@smoke' }, () => {
    logsViewAll.gotoViewAllPage();
    logsViewAll.checkByReverseChronologicalOrder();

    // FILTER By "Errors in Import"
    logsViewAll.errorsInImportStatuses.forEach((filter) => {
      logsViewAll.filterJobsByErrors(filter);
      logsViewAll.checkByErrorsInImport({ filter });
      logsViewAll.resetAllFilters();
    });

    // FILTER By "Date"
    const startedDate = new Date();
    const completedDate = startedDate;

    // format date as YYYY-MM-DD
    const formattedStart = DateTools.getFormattedDate({ date: startedDate });

    // api endpoint expects completedDate increased by 1 day
    completedDate.setDate(completedDate.getDate() + 1);

    logsViewAll.filterJobsByDate({ from: formattedStart, end: formattedStart });

    const formattedEnd = DateTools.getFormattedDate({ date: completedDate });
    logsViewAll.checkByDate({ from: formattedStart, end: formattedEnd });
    logsViewAll.resetAllFilters();

    // FILTER By "Job profile"
    logsViewAll.filterJobsByJobProfile(jobProfileName);
    logsViewAll.checkByJobProfileName({ jobProfileName, profileId });
    logsViewAll.resetAllFilters();

    // FILTER By "User"
    logsViewAll.filterJobsByUser(userName);
    logsViewAll.checkByUserName({ userName, userId: userNameId });
    logsViewAll.resetAllFilters();

    // FILTER By "Inventory single record imports"
    cy.do(Accordion({ id: 'singleRecordImports' }).clickHeader());
    logsViewAll.singleRecordImportsStatuses.forEach(filter => {
      logsViewAll.filterJobsByInventorySingleRecordImports(filter);
      logsViewAll.checkByInventorySingleRecord({ filter });
      logsViewAll.resetAllFilters();
    });

    // FILTER By more than one filter
    // in this case, filter by "User" and "Errors in Import"

    // close opened User accordion before search
    // because filterJobsByUser method opens it
    cy.do(Accordion({ id: 'userId' }).clickHeader());
    const filter = logsViewAll.errorsInImportStatuses[0];

    logsViewAll.filterJobsByErrors(filter);
    logsViewAll.filterJobsByUser(userName);
    logsViewAll.checkByErrorsInImportAndUser({ filter, userName, userId: userNameId });
    logsViewAll.resetAllFilters();
  });
});
