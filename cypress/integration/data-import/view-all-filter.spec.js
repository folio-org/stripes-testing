import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import fileManager from '../../support/utils/fileManager';
import DateTools from '../../support/utils/dateTools';
import { Accordion } from '../../../interactors';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-data-import: Filter the "View all" log screen', () => {
  // Path to static file in fixtures
  const pathToStaticFile = 'oneMarcBib.mrc';
  // Create unique names for MARC files
  const fileNameForFailedImport = `test${getRandomPostfix()}.mrc`;
  const fileNameForSuccessfulImport = `test${getRandomPostfix()}.mrc`;
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
    fileManager.createFile(`cypress/fixtures/${fileNameForFailedImport}`);
    // read contents of static file in fixtures
    cy.readFile(`cypress/fixtures/${pathToStaticFile}`).then(content => {
    // and write its contents to the file which runs successfully and create it
      fileManager.createFile(`cypress/fixtures/${fileNameForSuccessfulImport}`, content);
    });

    cy.visit(TopMenu.dataImportPath);
    // Upload files
    // runs with errors
    cy.uploadFile(fileNameForFailedImport);
    cy.reload();
    // runs successfully
    cy.uploadFile(fileNameForSuccessfulImport);

    // Remove generated test files from fixtures after uploading
    fileManager.deleteFile(`cypress/fixtures/${fileNameForSuccessfulImport}`);
    fileManager.deleteFile(`cypress/fixtures/${fileNameForFailedImport}`);
  });

  beforeEach(() => {
    DataImportViewAllPage.getSingleJobProfile().then(({ jobProfileInfo, runBy, userId }) => {
      jobProfileName = jobProfileInfo.name;
      userName = `${runBy.firstName} ${runBy.lastName}`;
      userNameId = userId;
      profileId = jobProfileInfo.id;
    });
  });

  it('C11113 Filter the "View all" log screen', { tags: '@smoke' }, () => {
    DataImportViewAllPage.gotoViewAllPage();
    cy.pause();
    DataImportViewAllPage.checkByReverseChronologicalOrder();

    // FILTER By "Errors in Import"
    DataImportViewAllPage.errorsInImportStatuses.forEach((filter) => {
      DataImportViewAllPage.filterJobsByErrors(filter);
      DataImportViewAllPage.checkByErrorsInImport({ filter });
      DataImportViewAllPage.resetAllFilters();
    });

    // FILTER By "Date"
    const startedDate = new Date();
    const completedDate = startedDate;

    // format date as YYYY-MM-DD
    const formattedStart = DateTools.getFormattedDate({ date: startedDate });

    // api endpoint expects completedDate increased by 1 day
    completedDate.setDate(completedDate.getDate() + 1);

    DataImportViewAllPage.filterJobsByDate({ from: formattedStart, end: formattedStart });

    const formattedEnd = DateTools.getFormattedDate({ date: completedDate });
    DataImportViewAllPage.checkByDate({ from: formattedStart, end: formattedEnd });
    DataImportViewAllPage.resetAllFilters();

    // FILTER By "Job profile"
    DataImportViewAllPage.filterJobsByJobProfile(jobProfileName);
    DataImportViewAllPage.checkByJobProfileName({ jobProfileName, profileId });
    DataImportViewAllPage.resetAllFilters();

    // FILTER By "User"
    DataImportViewAllPage.filterJobsByUser(userName);
    DataImportViewAllPage.checkByUserName({ userName, userId: userNameId });
    DataImportViewAllPage.resetAllFilters();

    // FILTER By "Inventory single record imports"
    cy.do(Accordion({ id: 'singleRecordImports' }).clickHeader());
    DataImportViewAllPage.singleRecordImportsStatuses.forEach(filter => {
      DataImportViewAllPage.filterJobsByInventorySingleRecordImports(filter);
      DataImportViewAllPage.checkByInventorySingleRecord({ filter });
      DataImportViewAllPage.resetAllFilters();
    });

    // FILTER By more than one filter
    // in this case, filter by "User" and "Errors in Import"

    // close opened User accordion before search
    // because filterJobsByUser method opens it
    cy.do(Accordion({ id: 'userId' }).clickHeader());
    const filter = DataImportViewAllPage.errorsInImportStatuses[0];

    DataImportViewAllPage.filterJobsByErrors(filter);
    DataImportViewAllPage.filterJobsByUser(userName);
    DataImportViewAllPage.checkByErrorsInImportAndUser({ filter, userName, userId: userNameId });
    DataImportViewAllPage.resetAllFilters();
  });
});
