import permissions from '../../../../support/dictionary/permissions';
import TestTypes from '../../../../support/dictionary/testTypes';
import DevTeams from '../../../../support/dictionary/devTeams';
import TopMenu from '../../../../support/fragments/topMenu';
import Helper from '../../../../support/fragments/finance/financeHelper';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import LogsViewAll from '../../../../support/fragments/data_import/logs/logsViewAll';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../../support/fragments/users/users';

describe('ui-data-import', () => {
  let user;
  let instanceHrid;
  const fileName = `C353641 autotestFile.${Helper.getRandomBarcode()}.mrc`;

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
      });
  });

  after(() => {
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C353641 A user can not delete import logs with standard Data import: Can upload files, import, and view logs permission (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadFile('oneMarcBib.mrc', fileName);
      JobProfiles.searchJobProfileForImport('Default - Create instance and SRS MARC Bib');
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileName);
      Logs.checkStatusOfJobProfile('Completed');
      // get Instance HRID through API for delete instance
      InventorySearchAndFilter.getInstanceHRID().then(hrId => { instanceHrid = hrId[0]; });
      Logs.verifyCheckboxForMarkingLogsAbsent();
      Logs.actionsButtonClick();
      Logs.verifyDeleteSelectedLogsButtonAbsent();
      Logs.viewAllLogsButtonClick();
      LogsViewAll.viewAllIsOpened();
      LogsViewAll.verifyCheckboxForMarkingLogsAbsent();
    });
});
