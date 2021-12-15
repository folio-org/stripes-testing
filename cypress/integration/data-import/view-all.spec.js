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

    // upload generated file
    cy.uploadFile(uniqueFileName);
    DataImportViewAllPage.gotoViewAllPage();

    const query = '((status any "COMMITTED ERROR")) sortby completedDate/sort.descending';
    cy.getJobLogs({ limit: 1, query });

    // remove generated test file from fixtures after uploading
    fileManager.deleteFile(`cypress/fixtures/${uniqueFileName}`);
  });

  it('C11112 allows to search with "Keyword"', () => {
    DataImportViewAllPage.selectOption('Keyword (ID, File name)');

    // search by name
    let searchTerm = uniqueFileName;
    DataImportViewAllPage.searchWithTerm(searchTerm);

    DataImportViewAllPage.checkRowsCount(1);

    // search by id
    searchTerm = `${Cypress.env('jobLogs')[0].hrId}`;
    DataImportViewAllPage.searchWithTerm(searchTerm);

    DataImportViewAllPage.checkRowsCount(1);
  });


  it('C11112 allows to search with only "ID"', () => {
    const searchTerm = `${Cypress.env('jobLogs')[0].hrId}`;
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
