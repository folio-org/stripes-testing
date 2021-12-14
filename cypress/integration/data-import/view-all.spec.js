import ViewAllView from '../../support/fragments/data_import/viewAllView';
import getRandomPostfix from '../../support/utils/stringTools';

describe('ui-data-import: "View all" log screen', () => {
  // Create unique file name with given type to upload
  const fileType = 'mrc';
  const uniqueFileName = `test${getRandomPostfix()}.${fileType}`;

  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getToken('diku_admin', 'admin');


    cy.uploadFile(uniqueFileName);
    ViewAllView.gotoViewAllPage();

    const query = '((status any "COMMITTED ERROR")) sortby completedDate/sort.descending';
    cy.getJobLogs({ limit: 1, query });
  });

  it('C11112 allows to search with "File name" or "ID"', () => {
    ViewAllView.selectOption('Keyword (ID, File name)');

    // search by name
    let searchTerm = `${Cypress.env('jobLogs')[0].fileName}`;
    ViewAllView.searchWithTerm(searchTerm);

    ViewAllView.checkRowsCount(1);

    // search by id
    searchTerm = `${Cypress.env('jobLogs')[0].hrId}`;
    ViewAllView.searchWithTerm(searchTerm);

    ViewAllView.checkRowsCount(1);
  });


  it('C11112 allows to search with only "ID"', () => {
    const searchTerm = `${Cypress.env('jobLogs')[0].hrId}`;
    ViewAllView.selectOption('ID');
    ViewAllView.searchWithTerm(searchTerm);

    ViewAllView.checkRowsCount(1);
  });

  it('C11112 allows to search with only "File name"', () => {
    const searchTerm = `${Cypress.env('jobLogs')[0].fileName}`;
    ViewAllView.selectOption('File name');
    ViewAllView.searchWithTerm(searchTerm);

    ViewAllView.checkRowsCount(1);
  });
});
