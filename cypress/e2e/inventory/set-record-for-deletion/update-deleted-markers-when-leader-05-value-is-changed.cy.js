import {
  AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Set record for deletion', () => {
    const testData = {};
    const textForUpdateInMarcFile = '01328dam';
    const marcFile = {
      marc: 'marcBibFileForC656318.mrc',
      fileName: `C656318 testMarcFile${getRandomPostfix()}.mrc`,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      DataImport.uploadFileViaApi(
        marcFile.marc,
        marcFile.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      ).then((response) => {
        testData.instanceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(testData.instanceId);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });
    });

    it(
      'C656318 Update "deleted" markers when leader 05 value is changed (folijet)',
      { tags: ['criticalPath', 'folijet', 'C656318'] },
      () => {
        InventoryInstance.waitLoading();
        InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
        InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
        InstanceRecordView.verifyInstanceIsSetForDeletion();
        InstanceRecordView.viewSource();
        InventoryViewSource.contains(textForUpdateInMarcFile);
        InventoryViewSource.editMarcBibRecord();
        QuickMarcEditor.selectFieldsDropdownOption(
          'LDR',
          AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
          AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.C,
        );
        QuickMarcEditor.saveAndCloseWithValidationWarnings();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
        InstanceRecordView.verifyInstanceIsMarkedAsStaffSuppressed();
        InstanceRecordView.verifyInstanceIsSetForDeletion(false);
      },
    );
  });
});
