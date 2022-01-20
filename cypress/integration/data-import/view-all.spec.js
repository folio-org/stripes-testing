import DataImportViewAllPage from '../../support/fragments/data_import/dataImportViewAllPage';
import getRandomPostfix from '../../support/utils/stringTools';
import fileManager from '../../support/utils/fileManager';
import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';

describe('ui-data-import: Search the "View all" log screen', () => {
  let id;
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

    cy.visit(TopMenu.dataImportPath);

    // create dynamically file with given name in fixtures
    fileManager.createFile(`cypress/fixtures/${uniqueFileName}`);

    // remove generated test file from fixtures after uploading
    cy.uploadFile(uniqueFileName);
    fileManager.deleteFile(`cypress/fixtures/${uniqueFileName}`);
  });

  beforeEach(() => {
    // fetch dynamic data from server
    DataImportViewAllPage.getSingleJobProfile().then(({ hrId }) => {
      id = hrId;
    });
  });

  it('C11112 Search the "View all" log screen', { tags: [testTypes.smoke] }, () => {
    DataImportViewAllPage.gotoViewAllPage();

    DataImportViewAllPage.options.forEach((option) => {
      DataImportViewAllPage.selectOption(option);
      // when option is "ID", search with hrId otherwise, with file name
      const term = option === 'ID' ? `${id}` : uniqueFileName;

      DataImportViewAllPage.searchWithTerm(term);

      if (option === 'ID') {
        DataImportViewAllPage.checkById({ id });
      } else {
        // file name is always unique
        // so, there is always one row
        DataImportViewAllPage.checkRowsCount(1);
      }
    });
  });
});
