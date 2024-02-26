import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('End to end scenarios', () => {
    let id;
    // Create unique file name with given type to upload
    const fileType = 'mrc';
    const uniqueFileName = `C11112test${getRandomPostfix()}.${fileType}`;

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });

      // create dynamically file with given name in fixtures
      FileManager.createFile(`cypress/fixtures/${uniqueFileName}`);
      cy.getAdminToken().then(() => {
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        // remove generated test file from fixtures after uploading
        cy.uploadFileWithDefaultJobProfile(uniqueFileName);
      });
      FileManager.deleteFile(`cypress/fixtures/${uniqueFileName}`);
    });

    beforeEach(() => {
      cy.getAdminToken().then(() => {
        // fetch dynamic data from server
        LogsViewAll.getSingleJobProfile().then(({ hrId }) => {
          id = hrId;
        });
      });
    });

    it('C11112 Search the "View all" log screen (folijet)', { tags: ['smoke', 'folijet'] }, () => {
      Logs.openViewAllLogs();

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
});
