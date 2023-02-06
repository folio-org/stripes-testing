import permissions from '../../../support/dictionary/permissions';
import DevTeams from '../../../support/dictionary/devTeams';
import TestTypes from '../../../support/dictionary/testTypes';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import DeleteDataImportLogsModal from '../../../support/fragments/data_import/logs/deleteDataImportLogsModal';
import Users from '../../../support/fragments/users/users';

let user;
const maxLogsQuantityOnPage = 100;
const instanceIds = [];

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
          // get Instance HRID through API
          InventorySearchAndFilter.getInstanceHRID()
            .then(hrId => {
              instanceIds.push(hrId[0]);
            });
        }

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading
        });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
    for (let i = 0; i < instanceIds.length; i++) {
      cy.getInstance({ query: `"hrid"=="${instanceIds[i]}"` })
        .then((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
    }
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
