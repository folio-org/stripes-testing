import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import getRandomPostfix from '../../support/utils/stringTools';
import fileManager from '../../support/utils/fileManager';

describe('ui-data-import: Search the "View all" log screen', () => {
  let jobLog;
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

    // fetch dynamic data from server
    const query = '((status any "COMMITTED ERROR")) sortby completedDate/sort.descending';
    DataImportViewAllPage.getJobLogs({ limit: 1, query });
  });

  beforeEach(() => {
    jobLog = Cypress.env('viewAllJobLogs').find(job => job.fileName === uniqueFileName);
  });

  it('C11112 Search the "View all" log screen', () => {
    DataImportViewAllPage.gotoViewAllPage();

    // Search by "Keyword"
    DataImportViewAllPage.selectOption('Keyword (ID, File name)');

    // by file name
    DataImportViewAllPage.searchWithTerm(uniqueFileName);

    DataImportViewAllPage.checkRowsCount(1);

    // by id
    DataImportViewAllPage.searchWithTerm(`${jobLog.hrId}`);

    DataImportViewAllPage.checkRowsCount(1);

    // Search by only "ID"
    DataImportViewAllPage.selectOption('ID');
    DataImportViewAllPage.searchWithTerm(`${jobLog.hrId}`);

    DataImportViewAllPage.checkRowsCount(1);

    // Search by only "File name"
    DataImportViewAllPage.selectOption('File name');
    DataImportViewAllPage.searchWithTerm(uniqueFileName);

    DataImportViewAllPage.checkRowsCount(1);
  });
});
