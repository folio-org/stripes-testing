import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import fileManager from '../../support/utils/fileManager';
import DateTools from '../../support/utils/dateTools';
import { Accordion } from '../../../interactors';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-data-import: Filter the "View all" log screen', () => {
  // Path to static file in fixtures
  const pathToStaticFile = 'oneMarcBib.mrc';
  // Create unique names for MARC files
  const fileNameForFailedImport = `test${getRandomPostfix()}.mrc`;
  const fileNameForSuccessfulImport = `test${getRandomPostfix()}.mrc`;

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

    // Upload files
    // runs with errors
    cy.uploadFile(fileNameForFailedImport);
    // runs successfully
    cy.uploadFile(fileNameForSuccessfulImport);

    // Remove generated test files from fixtures after uploading
    fileManager.deleteFile(`cypress/fixtures/${fileNameForSuccessfulImport}`);
    fileManager.deleteFile(`cypress/fixtures/${fileNameForFailedImport}`);
  });

  it('C11113 Filter the "View all" log screen', () => {
    DataImportViewAllPage.gotoViewAllPage();
    DataImportViewAllPage.checkByReverseChronologicalOrder();

    // FILTER By "Errors in Import"
    DataImportViewAllPage.errorsInImportStatuses.forEach((filter) => {
      DataImportViewAllPage.filterJobsByErrors(filter);
      DataImportViewAllPage.checkByErrorsInImport({ filter });
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

    // FILTER By "Job profile"
    DataImportViewAllPage.getSingleJobProfile().then(({ jobProfileInfo: profile }) => {
      DataImportViewAllPage.filterJobsByJobProfile(profile.name);
      DataImportViewAllPage.checkByJobProfileName({ jobProfileName: profile.name });
    });

    // FILTER By "User"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy }) => {
      const userName = `${runBy.firstName} ${runBy.lastName}`;

      DataImportViewAllPage.filterJobsByUser(userName);
      DataImportViewAllPage.checkByUserName({ userName });
    });

    // FILTER By "Inventory single record imports"
    cy.do(Accordion({ id: 'singleRecordImports' }).clickHeader());
    DataImportViewAllPage.singleRecordImportsStatuses.forEach(filter => {
      DataImportViewAllPage.filterJobsByInventorySingleRecordImports(filter);
      DataImportViewAllPage.checkByInventorySingleRecord({ filter });
    });

    // FILTER By more than one filter
    // in this case, filter by "User" and "Errors in Import"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy }) => {
      // close opened User accordion before search
      // because filterJobsByUser method opens it
      cy.do(Accordion({ id: 'userId' }).clickHeader());

      const userName = `${runBy.firstName} ${runBy.lastName}`;
      const filter = DataImportViewAllPage.errorsInImportStatuses[0];

      DataImportViewAllPage.filterJobsByErrors(filter);
      DataImportViewAllPage.filterJobsByUser(userName);
      DataImportViewAllPage.checkByErrorsInImportAndUser({ filter, userName });
    });
  });
});
