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

let user;

const emptyFile = `emptyFile${getRandomPostfix()}.csv`;
const uuidsInInvalidFormat = 'invalid-uuids.csv';
const notFoundUUIDsInValidFormat = 'not-found-uuids.csv';

describe('data-export', () => {
  beforeEach('create test data', () => {
    cy.createTempUser([permissions.dataExportAll.gui, permissions.dataExportEnableModule.gui]).then(
      (userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataExportPath,
          waiter: DataExportLogs.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${emptyFile}`);
      },
    );
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    FileManager.deleteFile(`cypress/fixtures/${emptyFile}`);
  });

  it(
    'C345415 Job triggered with invalid data fails (firebird) (Taas)',
    { tags: [devTeams.firebird, testTypes.extendedPath] },
    () => {
      ExportFileHelper.uploadFile(emptyFile);
      ExportFileHelper.exportWithDefaultJobProfile(emptyFile, 'authority', 'Authorities');
      DataExportResults.verifyLastLog(emptyFile, 'Fail');
      ExportFileHelper.uploadFile(uuidsInInvalidFormat);
      ExportFileHelper.exportWithDefaultJobProfile(
        uuidsInInvalidFormat,
        'authority',
        'Authorities',
      );
      DataExportResults.verifyLastLog(emptyFile, 'Fail');
      ExportFileHelper.uploadFile(notFoundUUIDsInValidFormat);
      ExportFileHelper.exportWithDefaultJobProfile(
        notFoundUUIDsInValidFormat,
        'authority',
        'Authorities',
      );
      DataExportResults.verifyLastLogs(3, 'Fail');
    },
  );
});
