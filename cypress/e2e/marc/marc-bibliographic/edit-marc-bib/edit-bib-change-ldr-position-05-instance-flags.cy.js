import {
  INVENTORY_LDR_FIELD_STATUS_DROPDOWN,
  INVENTORY_LDR_FIELD_DROPDOWNS_NAMES,
} from '../../../../support/constants';
import permissions from '../../../../support/dictionary/permissions';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C1307997_MarcBibInstance_${randomPostfix}`,
        tag245: '245',
        tagLDR: 'LDR',
        statusD: INVENTORY_LDR_FIELD_STATUS_DROPDOWN.D,
        statusC: INVENTORY_LDR_FIELD_STATUS_DROPDOWN.C,
      };
      const marcInstanceFields = [
        {
          tag: '008',
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];
      let userId;
      let instanceId;

      before('Create test data', () => {
        cy.getAdminToken().then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C1307997');

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((id) => {
            instanceId = id;
          });
        });

        cy.createTempUser([
          permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C1307997 Change "LDR" position 05 to "d" and check folio instance (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C1307997'] },
        () => {
          // Navigate to instance
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 1-2: Edit MARC record and change LDR position 05 to "d"
          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            testData.statusD,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            testData.statusD,
          );

          // Step 3: Save & close and verify instance flags
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Verify instance is set for deletion, suppressed from discovery, and staff suppressed
          InstanceRecordView.verifyInstanceIsSetForDeletionSuppressedFromDiscoveryStaffSuppressedWarning();

          // Step 4-5: Edit MARC record again and change LDR position 05 to "c"
          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            testData.statusD,
          );
          QuickMarcEditor.selectFieldsDropdownOption(
            testData.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            testData.statusC,
          );
          QuickMarcEditor.verifyDropdownOptionChecked(
            testData.tagLDR,
            INVENTORY_LDR_FIELD_DROPDOWNS_NAMES.STATUS,
            testData.statusC,
          );

          // Step 6: Save & close and verify instance flags updated
          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Verify "Set for deletion" flag is changed to False, but still suppressed and staff suppressed
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();
        },
      );
    });
  });
});
