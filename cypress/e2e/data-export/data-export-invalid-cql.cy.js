import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';
import SearchPane from '../../support/fragments/circulation-log/searchPane';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../support/constants';

let user;
const editedFileName = `invalid-query-${getRandomPostfix()}.cql`;

describe('Data Export', () => {
  beforeEach('create test data', () => {
    cy.createTempUser([
      permissions.inventoryAll.gui,
      permissions.dataExportUploadExportDownloadFileViewLogs.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.dataExportPath,
        waiter: DataExportLogs.waitLoading,
      });
      // Create file with invalid cql query
      FileManager.createFile(
        `cypress/fixtures/${editedFileName}`,
        '(languages=="eng" and hello=="123") sortby title',
      );
    });
  });

  after('delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
  });

  it(
    'C397323 C831974 Verify trigger Data export of Instances, Authorities with invalid CQL (firebird)',
    { tags: ['criticalPath', 'firebird', 'C397323', 'C831974'] },
    () => {
      const checkedProfiles = [
        { id: 1, name: 'Default instances', recordType: 'Instances' },
        { id: 2, name: 'Default authority', recordType: 'Authorities' },
      ];
      checkedProfiles.forEach((profile) => {
        ExportFileHelper.uploadFile(editedFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          editedFileName,
          profile.name,
          profile.recordType,
          '.cql',
        );

        const checkedJob = `getInfo${profile.id}`;
        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as(checkedJob);
        cy.wait(`@${checkedJob}`, getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(
            ({ runBy, jobProfileName }) => runBy.userId === user.userId && jobProfileName.includes(profile.name),
          );
          const recordsCount = jobData.progress.total;
          const jobId = jobData.hrId;
          const resultFileName = `${editedFileName.replace('.cql', '')}-${jobId}.mrc`;

          DataExportResults.verifyFailedExportResultCells(
            resultFileName,
            recordsCount,
            jobId,
            user.username,
            profile.name,
            true,
          );

          cy.getUserToken(user.username, user.password);

          SearchPane.findResultRowIndexByContent(user.username).then((rowIndex) => {
            DataExportResults.verifyFileNameIsDisabled(Number(rowIndex));
            DataExportResults.verifyErrorMessage(Number(rowIndex), editedFileName);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
            DataExportLogs.waitLoading();
          });
        });
      });
    },
  );
});
