import permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Users from '../../../support/fragments/users/users';

let user;
const maxLogsQuantityOnPage = 100;

describe('ui-data-import: delete logs from "View all" page', () => {
  before(() => {
    cy.createTempUser([
      permissions.dataImportDeleteLogs.gui
    ])
      .then(userProperties => {
        user = userProperties;

        const fileName = 'oneMarcBib.mrc';

        for (let i = 0; i < 101; i++) {
          DataImport.uploadFileViaApi(fileName);
        }

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
  });

  it('C367923 A user can delete logs from the Import app "View all" page (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      LogsViewAll.openViewAll();
      LogsViewAll.viewAllIsOpened();
      LogsViewAll.selectAllLogs();
      LogsViewAll.checkIsLogsSelected(maxLogsQuantityOnPage);
      LogsViewAll.deleteLog();
      DeleteDataImportLogsModal.cancelDelete(maxLogsQuantityOnPage);
      LogsViewAll.checkmarkAllLogsIsRemoved();

      LogsViewAll.selectAllLogs();
      LogsViewAll.checkIsLogsSelected(maxLogsQuantityOnPage);
      LogsViewAll.deleteLog();
      DeleteDataImportLogsModal.confirmDelete(maxLogsQuantityOnPage);
      LogsViewAll.verifyMessageOfDeleted(maxLogsQuantityOnPage);
      LogsViewAll.modalIsAbsent();
    });
});
