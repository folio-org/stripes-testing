import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import fileManager from '../../support/utils/fileManager';
import DateTools from '../../support/utils/dateTools';
import { Accordion } from '../../../interactors';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-data-import: Filter the "View all" log screen', () => {
  // Path to static file in fixtures
  const pathToStaticFile = 'oneMarcBib.mrc';
  // Create unique names for MARC files
  const uniqueFileNameForErrorsStatus = `test${getRandomPostfix()}.mrc`;
  const uniqueFileNameForCompletedStatus = `test${getRandomPostfix()}.mrc`;
  let query;

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
    fileManager.createFile(`cypress/fixtures/${uniqueFileNameForErrorsStatus}`);
    // read contents of static file in fixtures
    cy.readFile(`cypress/fixtures/${pathToStaticFile}`).then(content => {
      // and write its contents to the file with completed status
      fileManager.createFile(`cypress/fixtures/${uniqueFileNameForCompletedStatus}`, content);
    });

    // Upload files
    // this file completes with errors
    cy.uploadFile(uniqueFileNameForErrorsStatus);
    // this file completes successfully
    cy.uploadFile(uniqueFileNameForCompletedStatus);

    // Remove generated test files from fixtures after uploading
    fileManager.deleteFile(`cypress/fixtures/${uniqueFileNameForCompletedStatus}`);
    fileManager.deleteFile(`cypress/fixtures/${uniqueFileNameForErrorsStatus}`);
  });

  it('C11113 Filter the "View all" log screen', () => {
    DataImportViewAllPage.gotoViewAllPage();
    DataImportViewAllPage.checkForReverseChronologicalOrder();

    // FILTER By "Errors in Import"
    DataImportViewAllPage.errorsInImportStatuses.forEach((filter) => {
      DataImportViewAllPage.filterJobsByErrors(filter);

      query = DataImportViewAllPage.getErrorsQuery({ filter });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);
        DataImportViewAllPage.checkForImportErrorStatuses(filter);

        DataImportViewAllPage.resetAllFilters();
      });
    });


    // FILTER By "Date"
    const startedDate = new Date();
    const completedDate = startedDate;

    // format date as YYYY-MM-DD
    const formattedStart = DateTools.getFormattedDate({ date: startedDate });

    // filter with start and end date
    DataImportViewAllPage.filterJobsByDate({ from: formattedStart, end: formattedStart });

    // api endpoint expects completedDate increased by 1 day
    completedDate.setDate(completedDate.getDate() + 1);
    const formattedEnd = DateTools.getFormattedDate({ date: completedDate });

    query = DataImportViewAllPage.getDateQuery({ from: formattedStart, end: formattedEnd });
    DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
      DataImportViewAllPage.checkRowsCount(count);

      DataImportViewAllPage.resetAllFilters();
    });


    // FILTER By "Job profile"
    DataImportViewAllPage.getSingleJobProfile().then(({ jobProfileInfo: profile }) => {
      DataImportViewAllPage.filterJobsByJobProfile(profile.name);

      query = DataImportViewAllPage.getJobProfileQuery({ jobProfileId: profile.id });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);
        DataImportViewAllPage.checkForJobProfileName(profile.name);

        DataImportViewAllPage.resetAllFilters();
      });
    });


    // FILTER By "User"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy, userId }) => {
      const userName = `${runBy.firstName} ${runBy.lastName}`;
      DataImportViewAllPage.filterJobsByUser(userName);

      query = DataImportViewAllPage.getUserQuery({ userId });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);
        DataImportViewAllPage.checkForUserName(userName);

        DataImportViewAllPage.resetAllFilters();
      });
    });


    // FILTER By "Inventory single record imports"
    cy.do(Accordion({ id: 'singleRecordImports' }).clickHeader());
    DataImportViewAllPage.singleRecordImportsStatuses.forEach(filter => {
      DataImportViewAllPage.filterJobsBySingleRecordImports(filter);

      query = DataImportViewAllPage.getSingleRecordImportsQuery({ isSingleRecord: filter });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
      });
    });


    // FILTER By more than one filter
    // E.g. in this case, filter by "User" and "Errors in Import"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy, userId }) => {
      // close opened User accordion before search
      // because filterJobsByUser method opens it
      cy.do(Accordion({ id: 'userId' }).clickHeader());

      const userName = `${runBy.firstName} ${runBy.lastName}`;
      const status = DataImportViewAllPage.errorsInImportStatuses[0];

      DataImportViewAllPage.filterJobsByErrors(status);
      DataImportViewAllPage.filterJobsByUser(userName);

      query = DataImportViewAllPage.getMixedQuery({ status, userId });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);
        DataImportViewAllPage.checkForUserName(userName);
        DataImportViewAllPage.checkForImportErrorStatuses(status);

        DataImportViewAllPage.resetAllFilters();
      });
    });
  });
});
