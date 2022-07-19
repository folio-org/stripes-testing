import getRandomPostfix from '../../support/utils/stringTools';
import LogsViewAll from '../../support/fragments/data_import/logs/logsViewAll';
import FileManager from '../../support/utils/fileManager';
import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import DataImport from '../../support/fragments/data_import/dataImport';
import DevTeams from '../../support/dictionary/devTeams';

describe('ui-data-import: Search the "View all" log screen', () => {
  let id;
  // Create unique file name with given type to upload
  const fileType = 'mrc';
  const uniqueFileName = `C11112test${getRandomPostfix()}.${fileType}`;

  before(() => {
    cy.login(
      Cypress.env('diku_login'),
      Cypress.env('diku_password')
    );
    cy.getAdminToken();

    cy.visit(TopMenu.dataImportPath);
    // create dynamically file with given name in fixtures
    FileManager.createFile(`cypress/fixtures/${uniqueFileName}`);

    // remove generated test file from fixtures after uploading
    cy.uploadFileWithDefaultJobProfile(uniqueFileName);
    FileManager.deleteFile(`cypress/fixtures/${uniqueFileName}`);
  });

  beforeEach(() => {
    // fetch dynamic data from server
    LogsViewAll.getSingleJobProfile().then(({ hrId }) => {
      id = hrId;
    });

    DataImport.checkUploadState();
  });

  afterEach(() => {
    DataImport.checkUploadState();
  });

  it('C11112 Search the "View all" log screen (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    LogsViewAll.gotoViewAllPage();

    LogsViewAll.options.forEach((option) => {
      LogsViewAll.selectOption(option);
      // when option is "ID", search with hrId otherwise, with file name
      const term = option === 'ID' ? `${id}` : uniqueFileName;

      LogsViewAll.searchWithTerm(term);

      if (option === 'ID') {
        LogsViewAll.checkById({ id });
      } else {
        // file name is always unique
        // so, there is always one row
        LogsViewAll.checkRowsCount(1);
      }
    });
  });
});
