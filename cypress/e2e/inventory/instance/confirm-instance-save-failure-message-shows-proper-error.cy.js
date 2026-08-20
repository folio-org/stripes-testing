import { Permissions } from '../../../support/dictionary';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C423488_FolioInstance_${randomPostfix}`,
      oclcNumber: '1234567',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi();

      cy.getInstanceTypes({ limit: 1, query: 'source<>local' }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      cy.then(() => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: testData.instanceTypeId,
            title: testData.instanceTitle,
          },
        }).then((createdInstance) => {
          testData.instanceId = createdInstance.instanceId;
        });
      });

      cy.createTempUser([
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.dataImportUploadAll.gui,
        Permissions.settingsDataImportCanViewOnly.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C423488 Confirm instance save failure message shows proper error (promin)',
      { tags: ['extendedPath', 'promin', 'C423488'] },
      () => {
        // Step 1-2: Find and open instance; instance details shown (simulates both browser tabs pointing to same instance)
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Step 3: Open edit form in first tab
        InventoryInstance.editInstance();
        InstanceRecordEdit.waitLoading();

        // Step 4: In second tab (simulated via API), overlay source bib record with OCLC — instance becomes MARC-sourced
        InventoryInstances.overlayWithOclcViaApi(testData.oclcNumber, testData.instanceId);
        cy.recurse(
          () => cy.getInstanceById(testData.instanceId),
          (instanceBody) => instanceBody.source === INSTANCE_SOURCE_NAMES.MARC,
          { limit: 15, timeout: 20000, delay: 1000 },
        );

        // Step 5: Back in first tab edit screen, make edits; Save & close button is activated
        InstanceRecordEdit.markAsStaffSuppress();
        InstanceRecordEdit.checkButtonsEnabled({ saveAndClose: true });

        // Step 6: Press Save & close — error appears: Saving instance failed (MARC-controlled fields)
        InstanceRecordEdit.clickSaveAndCloseButton();
        InstanceRecordEdit.verifyMarcControlledErrorMessage();

        // Step 7: Close the error modal and cancel edit — instance details show MARC-updated record
        InstanceRecordEdit.closeSavingFailedModal();
        InstanceRecordEdit.close();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        InventoryInstance.checkExpectedMARCSource();
        InventoryInstance.openAccordion('Identifiers');
        InventoryInstance.checkExpectedOCLCPresence(testData.oclcNumber);
      },
    );
  });
});
