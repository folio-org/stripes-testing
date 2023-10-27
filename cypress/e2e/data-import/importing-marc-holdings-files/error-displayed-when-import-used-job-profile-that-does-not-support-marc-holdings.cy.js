import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { JOB_STATUS_NAMES } from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';

describe('data-import', () => {
  describe('Importing MARC Holdings files', () => {
    let user;

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.uiTenantSettingsSettingsLocation.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    it(
      'C359245 Checking the error displayed when the import used a "Job Profile" that does not support the "MARC Holding" record type (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
      () => {},
    );
  });
});
