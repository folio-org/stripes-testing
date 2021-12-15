import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import getRandomPostfix from '../../support/utils/stringTools';
import fileManager from '../../support/utils/fileManager';

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

    // create dynamically file with given name in fixtures
    fileManager.createFile(`cypress/fixtures/${uniqueFileName}`);

    // remove generated test file from fixtures after uploading
    cy.uploadFile(uniqueFileName);
    fileManager.deleteFile(`cypress/fixtures/${uniqueFileName}`);

    DataImportViewAllPage.gotoViewAllPage();

    // fetch dynamic data from server
    const query = '((status any "COMMITTED ERROR")) sortby completedDate/sort.descending';
    DataImportViewAllPage.getJobLogs({ limit: 1, query });
  });

  it('C11112 allows to search with "Keyword"', () => {
    DataImportViewAllPage.selectOption('Keyword (ID, File name)');

    // search by name
    let searchTerm = uniqueFileName;
    DataImportViewAllPage.searchWithTerm(searchTerm);

    DataImportViewAllPage.checkRowsCount(1);

    // search by id
    searchTerm = `${Cypress.env('viewAllJobLogs')[0].hrId}`;
    DataImportViewAllPage.searchWithTerm(searchTerm);

    DataImportViewAllPage.checkRowsCount(1);
  });


  it('C11112 allows to search with only "ID"', () => {
    const jobLog = Cypress.env('viewAllJobLogs').find(job => job.fileName === uniqueFileName);
    const searchTerm = `${jobLog.hrId}`;
    DataImportViewAllPage.selectOption('ID');
    DataImportViewAllPage.searchWithTerm(searchTerm);

    DataImportViewAllPage.checkRowsCount(1);
  });

  it('C11112 allows to search with only "File name"', () => {
    const searchTerm = uniqueFileName;
    DataImportViewAllPage.selectOption('File name');
    DataImportViewAllPage.searchWithTerm(searchTerm);

    DataImportViewAllPage.checkRowsCount(1);
  });
});
