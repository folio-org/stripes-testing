import {
  DEFAULT_JOB_PROFILE_NAMES,
  RECORD_STATUSES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    let user;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const fileName = `C359207 autotestFile${getRandomPostfix()}.mrc`;
    // eslint-disable-next-line
    const error =
      '{"error":"A new MARC-Authority was not created because the incoming record already contained a 999ff$s or 999ff$i field"}';

    before('login', () => {
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359207 Checking the import to Create MARC Authority records, when incoming records do and do not have 999 ff field (folijet)',
      { tags: ['criticalPath', 'folijet', 'C359207', 'shiftLeft'] },
      () => {
        DataImport.verifyUploadState();
        // upload the first .mrc file
        DataImport.uploadFile('marcAuthFileC359207.mrc', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(fileName);
        cy.wrap([0, 6]).each((rowNumber) => {
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.authority,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName, rowNumber);
          });
        });
        cy.wrap([1, 2, 3, 4, 5, 7]).each((rowNumber) => {
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.NO_ACTION,
            FileDetails.columnNameInResultList.srsMarc,
            rowNumber,
          );
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.ERROR,
            FileDetails.columnNameInResultList.error,
            rowNumber,
          );
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('2');
        FileDetails.checkAuthorityQuantityInSummaryTable('2');
        // check No action counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable('6', 2);
        FileDetails.openJsonScreen('No content');
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(error);
      },
    );
  });
});
