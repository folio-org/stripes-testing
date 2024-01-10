import uuid from 'uuid';
import permissions from '../../support/dictionary/permissions';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getLongDelay } from '../../support/utils/cypressTools';
import FileManager from '../../support/utils/fileManager';
import getRandomPostfix from '../../support/utils/stringTools';

let user;
const emptyFile = `emptyFile${getRandomPostfix()}.csv`;
const uuidsInInvalidFormat = `invalid-uuids${getRandomPostfix()}.csv`;
const notFoundUUIDsInValidFormat = `not-found-uuids${getRandomPostfix()}.csv`;
const validUserUUID = uuid();

describe('data-export', () => {
  before('create test data', () => {
    cy.createTempUser([permissions.dataExportAll.gui, permissions.dataExportEnableModule.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${emptyFile}`);
        FileManager.createFile(`cypress/fixtures/${uuidsInInvalidFormat}`, getRandomPostfix());
        FileManager.createFile(`cypress/fixtures/${notFoundUUIDsInValidFormat}`, validUserUUID);
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${emptyFile}`);
    FileManager.deleteFile(`cypress/fixtures/${uuidsInInvalidFormat}`);
    FileManager.deleteFile(`cypress/fixtures/${notFoundUUIDsInValidFormat}`);
  });

  it(
    'C345415 Job triggered with invalid data fails (firebird) (TaaS)',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      ExportFileHelper.uploadFile(emptyFile);
      ExportFileHelper.exportWithDefaultJobProfile(emptyFile, 'authority', 'Authorities');
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
          'authority',
        );
      });
      ExportFileHelper.uploadFile(uuidsInInvalidFormat);
      ExportFileHelper.exportWithDefaultJobProfile(
        uuidsInInvalidFormat,
        'authority',
        'Authorities',
      );
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo1');
      cy.wait('@getInfo1', getLongDelay()).then((interception) => {
        const job = interception.response.body.jobExecutions[0];
        const resultFileName = job.exportedFiles[0].fileName;
        const recordsCount = job.progress.total;
        const jobId = job.hrId;

        DataExportResults.verifyFailedExportResultCells(
          resultFileName,
          recordsCount,
          jobId,
          user.username,
          'authority',
        );
      });
      ExportFileHelper.uploadFile(notFoundUUIDsInValidFormat);
      ExportFileHelper.exportWithDefaultJobProfile(
        notFoundUUIDsInValidFormat,
        'authority',
        'Authorities',
      );
      cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo2');
      cy.wait('@getInfo2', getLongDelay()).then((interception) => {
        const job = interception.response.body.jobExecutions[0];
        const resultFileName = job.exportedFiles[0].fileName;
        const recordsCount = job.progress.total;
        const jobId = job.hrId;

        DataExportResults.verifyFailedExportResultCells(
          resultFileName,
          recordsCount,
          jobId,
          user.username,
          'authority',
        );
      });
    },
  );
});
