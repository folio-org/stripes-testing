import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView, {
  actionsMenuOptions,
} from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Set record for deletion', () => {
    const testData = {};
    const ldrValue = '01182dam';
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `C656297 testMarcFile${getRandomPostfix()}.mrc`,
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
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySetRecordsForDeletion.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
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
      'C656297 Check "Set for deletion" checkbox in "Edit instance" for MARC records (folijet)',
      { tags: ['criticalPath', 'folijet', 'C656297'] },
      () => {
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();

        const isChecked = true;
        const isDisabled = true;
        InstanceRecordEdit.clickSetForDeletionCheckbox(isChecked);
        InstanceRecordEdit.verifyDiscoverySuppressCheckbox(isChecked, isDisabled);
        InstanceRecordEdit.verifyStaffSuppressCheckbox(isChecked, isDisabled);
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();
        InstanceRecordView.verifyInstanceIsSetForDeletion();
        InstanceRecordView.validateOptionInActionsMenu(
          actionsMenuOptions.setRecordForDeletion,
          false,
        );
        InstanceRecordView.clickActionsButton();
        InstanceRecordView.viewSource();
        InventoryViewSource.contains(ldrValue);
      },
    );
  });
});
