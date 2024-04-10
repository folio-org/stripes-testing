import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let id;
    const filePath = 'oneMarcBib.mrc';
    const uniqueFileName = `C11112 autotestFileName${getRandomPostfix()}.mrc`;

    before('create test data', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePath, uniqueFileName);
      JobProfiles.waitFileIsUploaded();
      JobProfiles.search('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();

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
