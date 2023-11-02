import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import FileManager from '../../support/utils/fileManager';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import getRandomPostfix from '../../support/utils/stringTools';
import { getLongDelay } from '../../support/utils/cypressTools';
import permissions from '../../support/dictionary/permissions';
import devTeams from '../../support/dictionary/devTeams';
import parallelization from '../../support/dictionary/parallelization';
import Users from '../../support/fragments/users/users';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';

let user;
const editedFileName = `invalid-query-${getRandomPostfix()}.cql`;

describe('data-export', () => {
  beforeEach('create test data', () => {
    cy.createTempUser([permissions.inventoryAll.gui, permissions.dataExportEnableModule.gui]).then(
      (userProperties) => {
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
      },
    );
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
  });

  it(
    'C397323 Verify trigger Data export with invalid CQL (firebird)',
    { tags: [testTypes.criticalPath, devTeams.firebird, parallelization.parallel] },
    () => {
      ExportFileHelper.uploadFile(editedFileName);
      ExportFileHelper.exportWithDefaultJobProfile(
        editedFileName,
        'instances',
        'Instances',
        '.cql',
      );

      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
      cy.wait('@getInfo', getLongDelay()).then((interception) => {
        const job = interception.response.body.jobExecutions[0];
        const resultFileName = job.exportedFiles[0].fileName;
        const recordsCount = job.progress.total;
        const jobId = job.hrId;

        DataExportResults.verifyFailedExportResultCells(
          resultFileName,
          recordsCount,
          jobId,
          user.username,
          'instances',
          true,
        );
      });
    },
  );
});
