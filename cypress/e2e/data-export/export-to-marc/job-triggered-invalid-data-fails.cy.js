import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
let emptyFile;
let uuidsInInvalidFormat;
let notFoundUUIDsInValidFormat;
let validUserUUID;

describe(
  'Data Export',
  {
    retries: {
      runMode: 1,
    },
  },
  () => {
    describe('Export to MARC', () => {
      beforeEach('create test data', () => {
        emptyFile = `emptyFile${getRandomPostfix()}.csv`;
        uuidsInInvalidFormat = `invalid-uuids${getRandomPostfix()}.csv`;
        notFoundUUIDsInValidFormat = `not-found-uuids${getRandomPostfix()}.csv`;
        validUserUUID = uuid();

        cy.createTempUser([
          permissions.inventoryAll.gui,
          permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
          FileManager.createFile(`cypress/fixtures/${emptyFile}`);
          FileManager.createFile(`cypress/fixtures/${uuidsInInvalidFormat}`, getRandomPostfix());
          FileManager.createFile(`cypress/fixtures/${notFoundUUIDsInValidFormat}`, validUserUUID);
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${emptyFile}`);
        FileManager.deleteFile(`cypress/fixtures/${uuidsInInvalidFormat}`);
        FileManager.deleteFile(`cypress/fixtures/${notFoundUUIDsInValidFormat}`);
      });

      it(
        'C345415 Job triggered with invalid data fails (firebird) (TaaS)',
        { tags: ['extendedPath', 'firebird', 'C345415'] },
        () => {
          ExportFileHelper.uploadFile(emptyFile);
          ExportFileHelper.exportWithDefaultJobProfile(
            emptyFile,
            'Default authority',
            'Authorities',
          );
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo');
          cy.wait('@getInfo', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const job = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
            const resultFileName = job.exportedFiles[0].fileName;
            const recordsCount = job.progress.total;
            const jobId = job.hrId;

            DataExportResults.verifyFailedExportResultCells(
              resultFileName,
              recordsCount,
              jobId,
              user.username,
              'Default authority',
            );
          });
          cy.getUserToken(user.username, user.password);
          ExportFileHelper.uploadFile(uuidsInInvalidFormat);
          ExportFileHelper.exportWithDefaultJobProfile(
            uuidsInInvalidFormat,
            'Default authority',
            'Authorities',
          );
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo1');
          cy.wait('@getInfo1', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const job = jobExecutions.find(({ exportedFiles }) => {
              return exportedFiles[0].fileName.startsWith(uuidsInInvalidFormat.replace('.csv', ''));
            });
            const resultFileName = job.exportedFiles[0].fileName;
            const recordsCount = job.progress.total;
            const jobId = job.hrId;

            DataExportResults.verifyFailedExportResultCells(
              resultFileName,
              recordsCount,
              jobId,
              user.username,
              'Default authority',
            );
          });
          cy.getUserToken(user.username, user.password);
          ExportFileHelper.uploadFile(notFoundUUIDsInValidFormat);
          ExportFileHelper.exportWithDefaultJobProfile(
            notFoundUUIDsInValidFormat,
            'Default authority',
            'Authorities',
          );
          cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getInfo2');
          cy.wait('@getInfo2', getLongDelay()).then(({ response }) => {
            const { jobExecutions } = response.body;
            const job = jobExecutions.find(({ exportedFiles }) => {
              return exportedFiles[0].fileName.startsWith(
                notFoundUUIDsInValidFormat.replace('.csv', ''),
              );
            });
            const resultFileName = job.exportedFiles[0].fileName;
            const recordsCount = job.progress.total;
            const jobId = job.hrId;

            DataExportResults.verifyFailedExportResultCells(
              resultFileName,
              recordsCount,
              jobId,
              user.username,
              'Default authority',
            );
          });
        },
      );
    });
  },
);
