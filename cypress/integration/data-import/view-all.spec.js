import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import getRandomPostfix from '../../support/utils/stringTools';
import fileManager from '../../support/utils/fileManager';
import { testType } from '../../support/utils/tagTools';

describe('ui-data-import: Search the "View all" log screen', () => {
  let hrId;
  // Create unique file name with given type to upload
  const fileType = 'mrc';
  const uniqueFileName = `test${getRandomPostfix()}.${fileType}`;

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

  beforeEach(() => {
    // fetch dynamic data from server
    const query = '((status any "COMMITTED ERROR")) sortby completedDate/sort.descending';
    cy
      .okapiRequest({
        path: 'metadata-provider/jobExecutions',
        searchParams: { limit: 1, query },
      })
      .then(({ body }) => {
        hrId = body.jobExecutions[0].hrId;
      });
  });

  it('C11112 Search the "View all" log screen', { tags: [testType.smoke] }, () => {
    DataImportViewAllPage.gotoViewAllPage();

    DataImportViewAllPage.options.forEach((option) => {
      DataImportViewAllPage.selectOption(option);
      // when option is "ID", search with hrId otherwise, with file name
      const term = option === 'ID' ? `${hrId}` : uniqueFileName;

      DataImportViewAllPage.searchWithTerm(term);

      DataImportViewAllPage.checkRowsCount(1);
    });
  });
});
