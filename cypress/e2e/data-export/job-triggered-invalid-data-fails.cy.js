import uuid from 'uuid';
import TopMenu from '../../support/fragments/topMenu';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import ExportFileHelper from '../../support/fragments/data-export/exportFile';
import getRandomPostfix from '../../support/utils/stringTools';
import devTeams from '../../support/dictionary/devTeams';
import testTypes from '../../support/dictionary/testTypes';
import DataExportLogs from '../../support/fragments/data-export/dataExportLogs';
import FileManager from '../../support/utils/fileManager';
import DataExportResults from '../../support/fragments/data-export/dataExportResults';
import { getLongDelay } from '../../support/utils/cypressTools';

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
        FileManager.createFile(
          `cypress/fixtures/${notFoundUUIDsInValidFormat}`,
          `${getRandomPostfix()}\r\n${validUserUUID}`,
        );
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
    { tags: [devTeams.firebird, testTypes.extendedPath] },
    () => {
      ExportFileHelper.uploadFile(emptyFile);
      ExportFileHelper.exportWithDefaultJobProfile(emptyFile, 'authority', 'Authorities');
      ExportFileHelper.uploadFile(uuidsInInvalidFormat);
      ExportFileHelper.exportWithDefaultJobProfile(
        uuidsInInvalidFormat,
        'authority',
        'Authorities',
      );
      ExportFileHelper.uploadFile(notFoundUUIDsInValidFormat);
      ExportFileHelper.exportWithDefaultJobProfile(
        notFoundUUIDsInValidFormat,
        'authority',
        'Authorities',
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
          'authority',
        );
      });
    },
  );
});
