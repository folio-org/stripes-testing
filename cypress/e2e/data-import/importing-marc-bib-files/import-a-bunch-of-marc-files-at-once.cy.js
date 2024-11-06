import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let userId;
    const filePathForUpload = 'oneMarcBib.mrc';
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;

    before('Create user and login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C6707 Import a bunch of MARC files at once (folijet)',
      { tags: ['criticalPathFlaky', 'folijet', 'C6707'] },
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
          DataImport.verifyUploadState();
          DataImport.uploadBunchOfFiles(filePathForUpload, upload.quantityOfFiles, upload.fileName);
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(upload.fileName);

          Logs.openViewAllLogs();
          LogsViewAll.viewAllIsOpened();
          cy.wait(80000);
          LogsViewAll.selectOption('Keyword (ID, File name)');
          LogsViewAll.searchWithTerm(upload.fileName);
          // TODO need to wait until files are filtered
          cy.wait(2000);
          LogsViewAll.verifyQuantityOfLogs(upload.quantityOfFiles);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        });
      },
    );
  });
});
