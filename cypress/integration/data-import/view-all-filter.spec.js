import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import TopMenu from '../../support/fragments/topMenu';

describe('ui-data-import: Filter the "View all" log screen', () => {
  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
  });

  beforeEach(() => {
    cy.visit(TopMenu.dataImportPath);
  });

  it('C11113 Filter the "View all" log screen', () => {
    DataImportViewAllPage.gotoViewAllPage();

    // filter by "Errors in Import"
    DataImportViewAllPage.errorsInImportFilters.forEach((filter) => {
      DataImportViewAllPage.filterJobsByErrors(filter);

      // fetch matched jobs from server
      const query = DataImportViewAllPage.getErrorsQuery({ filter });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
      });
    });

    // filter by "Date"
    {
      const startedDate = new Date();
      // const completedDate = startedDate;
      const completedDate = startedDate;
      // format date as YYYY-MM-DD
      const formattedStart = DataImportViewAllPage.getFormattedDate({ date: startedDate });
      // filter with start and end date
      DataImportViewAllPage.filterJobsByDate({ from: formattedStart, end: formattedStart });

      // api endpoint expects completedDate increased by 1 day
      completedDate.setDate(completedDate.getDate() + 1);
      const formattedEnd = DataImportViewAllPage.getFormattedDate({ date: completedDate });
      const query = DataImportViewAllPage.getDateQuery({ from: formattedStart, end: formattedEnd });

      // fetch matched jobs from server
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
      });
    }

    // filter by "Job profile"
    DataImportViewAllPage.getSingleJobProfile().then(({ jobProfileInfo: profile }) => {
      DataImportViewAllPage.filterJobsByJobProfile(profile.name);

      // fetch matched jobs from server
      const query = DataImportViewAllPage.getJobProfileQuery({ jobProfileId: profile.id });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
      });
    });

    // filter by "User"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy, userId }) => {
      const userName = `${runBy.firstName} ${runBy.lastName}`;
      DataImportViewAllPage.filterJobsByUser(userName);

      // fetch matched jobs from server
      const query = DataImportViewAllPage.getUserQuery({ userId });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
      });
    });

    // filter by "Inventory single record imports"
    // FIX ME: for some reason, when toggling "Inventory single record imports" filter
    // ui will not change, so we have sort by one of MultiColumnList headers before filtering
    cy.get('#clickable-list-column-filename').click();
    cy.get('#accordion-toggle-button-singleRecordImports').click();
    DataImportViewAllPage.singleRecordImports.forEach(filter => {
      DataImportViewAllPage.filterJobsBySingleRecordImports(filter);

      const query = DataImportViewAllPage.getSingleRecordImportsQuery({ isSingleRecord: filter });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);
      });

      DataImportViewAllPage.resetAllFilters();
    });

    // filter by more than one filter
    // E.g. in this case, filter by "User" and "Errors in Import"
    DataImportViewAllPage.getSingleJobProfile().then(({ runBy, userId }) => {
      const userName = `${runBy.firstName} ${runBy.lastName}`;
      const status = DataImportViewAllPage.errorsInImportFilters[0];
      DataImportViewAllPage.filterJobsByUser(userName);
      DataImportViewAllPage.filterJobsByErrors(status);

      // fetch matched jobs from server
      const query = DataImportViewAllPage.getMixedQuery({ status, userId });
      DataImportViewAllPage.getNumberOfMatchedJobs({ query }).then(count => {
        DataImportViewAllPage.checkRowsCount(count);

        DataImportViewAllPage.resetAllFilters();
      });
    });
  });
});
