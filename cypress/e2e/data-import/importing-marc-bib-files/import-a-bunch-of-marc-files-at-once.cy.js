import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const filePathForUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before(() => {
      cy.getAdminToken();
      cy.loginAsAdmin();
    });

    it(
      'C6707 Import a bunch of MARC files at once (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        [
          {
            fileName: `C6707 autotestFiles${getRandomPostfix()}.mrc`,
            quantityOfFiles: '2',
          },
          {
            fileName: `C6707 autotestFiles${getRandomPostfix()}.mrc`,
            quantityOfFiles: '4',
          },
          {
            fileName: `C6707 autotestFiles${getRandomPostfix()}.mrc`,
            quantityOfFiles: '15',
          },
        ].forEach((upload) => {
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadBunchOfFiles(filePathForUpload, upload.quantityOfFiles, upload.fileName);
          DataImport.waitFileIsUploaded();
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(upload.fileName);
          cy.wait(180000);

          Logs.openViewAllLogs();
          LogsViewAll.viewAllIsOpened();
          LogsViewAll.selectOption('Keyword (ID, File name)');
          LogsViewAll.searchWithTerm(upload.fileName);
          // TODO need to wait until files are filtered
          cy.wait(2000);
          LogsViewAll.verifyQuantityOfLogs(upload.quantityOfFiles);
        });
      },
    );
  });
});
