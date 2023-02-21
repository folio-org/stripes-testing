import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import Helper from '../../../support/fragments/finance/financeHelper';

describe('ui-data-import:', () => {
  let user;
  let instanceHrid;

  const fileName = `oneMarcBib.mrc${Helper.getRandomBarcode()}`;

  before('create test data', () => {
    cy.getAdminToken()
      .then(() => {
        DataImport.uploadFileViaApi('oneMarcBib.mrc', fileName);
      });

    cy.createTempUser([
      permissions.settingsDataImportView.gui,
      permissions.uiInventoryViewInstances.gui,
      permissions.remoteStorageView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password,
          { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
  });

  after('delete test data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(user.userId);
  });

  it('C356780 A user can view logs but can not import files with "Data import: Can view only" permission (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      DataImport.checkChooseFileButtonState({ isDisabled: true });
      Logs.openFileDetails(fileName);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(hrId => {
        instanceHrid = hrId;
      });
      InventoryInstances.verifyInstanceDetailsView();
      cy.visit(TopMenu.dataImportPath);
      Logs.openViewAllLogs();
      LogsViewAll.viewAllIsOpened();
      LogsViewAll.searchWithTerm(fileName);
      LogsViewAll.openFileDetails(fileName);
      FileDetails.openInstanceInInventory('Created');
      InventoryInstances.verifyInstanceDetailsView();
    });
});
