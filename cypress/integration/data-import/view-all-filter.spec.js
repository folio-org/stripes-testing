import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import fileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-data-import: Filter the "View all" log screen', () => {
  // Create unique name for a MARC file
  const uniqueFileName = `test${getRandomPostfix()}.mrc`;
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

    // create dynamically file with given name in fixtures
    fileManager.createFile(`cypress/fixtures/${uniqueFileName}`);

    // remove generated test file from fixtures after uploading
    cy.uploadFile(uniqueFileName);
    fileManager.deleteFile(`cypress/fixtures/${uniqueFileName}`);
  });

  it('C11113 Filter the "View all" log screen', () => {
    DataImportViewAllPage.gotoViewAllPage();

    // FILTER By "Errors in Import"
    DataImportViewAllPage.errorsInImportFilters.forEach((filter) => {
      DataImportViewAllPage.filterJobsByErrors(filter);

      // fetch matched jobs from server
      query = DataImportViewAllPage.getErrorsQuery({ filter });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
        DataImportViewAllPage.sortByCompletedDateInDescendingOrder();
      });
    });


    // FILTER By "Date"
    const startedDate = new Date();
    const completedDate = startedDate;
    // format date as YYYY-MM-DD
    const formattedStart = DataImportViewAllPage.getFormattedDate({ date: startedDate });
    // filter with start and end date
    DataImportViewAllPage.filterJobsByDate({ from: formattedStart, end: formattedStart });

    // api endpoint expects completedDate increased by 1 day
    completedDate.setDate(completedDate.getDate() + 1);
    const formattedEnd = DataImportViewAllPage.getFormattedDate({ date: completedDate });
    query = DataImportViewAllPage.getDateQuery({ from: formattedStart, end: formattedEnd });

    // fetch matched jobs from server
    DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
      DataImportViewAllPage.checkRowsCount(count);

      DataImportViewAllPage.resetAllFilters();
      DataImportViewAllPage.sortByCompletedDateInDescendingOrder();
    });


    // FILTER By "Job profile"
    DataImportViewAllPage.getSingleJobProfile().then(({ jobProfileInfo: profile }) => {
      DataImportViewAllPage.filterJobsByJobProfile(profile.name);

      // fetch matched jobs from server
      query = DataImportViewAllPage.getJobProfileQuery({ jobProfileId: profile.id });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
        DataImportViewAllPage.sortByCompletedDateInDescendingOrder();
      });
    });


    // FILTER By "User"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy, userId }) => {
      const userName = `${runBy.firstName} ${runBy.lastName}`;
      DataImportViewAllPage.filterJobsByUser(userName);

      // fetch matched jobs from server
      query = DataImportViewAllPage.getUserQuery({ userId });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
        DataImportViewAllPage.sortByCompletedDateInDescendingOrder();
      });
    });


    // FILTER By "Inventory single record imports"
    cy.get('#accordion-toggle-button-singleRecordImports').click();
    DataImportViewAllPage.singleRecordImports.forEach(filter => {
      DataImportViewAllPage.filterJobsBySingleRecordImports(filter);

      query = DataImportViewAllPage.getSingleRecordImportsQuery({ isSingleRecord: filter });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);
      });

      DataImportViewAllPage.resetAllFilters();
      DataImportViewAllPage.sortByCompletedDateInDescendingOrder();
    });


    // FILTER By more than one filter
    // E.g. in this case, filter by "User" and "Errors in Import"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy, userId }) => {
      // close opened User accordion before search
      // because filterJobsByUser method opens it
      cy.get('#accordion-toggle-button-userId').click();

      const userName = `${runBy.firstName} ${runBy.lastName}`;
      const status = DataImportViewAllPage.errorsInImportFilters[0];
      DataImportViewAllPage.filterJobsByUser(userName);
      DataImportViewAllPage.filterJobsByErrors(status);

      // fetch matched jobs from server
      query = DataImportViewAllPage.getMixedQuery({ status, userId });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
        DataImportViewAllPage.sortByCompletedDateInDescendingOrder();
      });
    });
  });
});
