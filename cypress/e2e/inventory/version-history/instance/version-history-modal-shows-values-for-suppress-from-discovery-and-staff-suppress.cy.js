import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C700853_FolioInstance_${randomPostfix}`,
        // Names of the fields in the "Field" column of the changes modal
        discoverySuppressField: 'Suppressed from discovery',
        staffSuppressField: 'Staff suppressed',
      };

      const openInstanceEditForm = () => {
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
      };

      // Opens the changes of the latest card of the version history
      const openLatestChangesModal = () => {
        InstanceRecordView.clickVersionHistoryButton();
        VersionHistorySection.waitLoading();
        VersionHistorySection.openChangesForCard(0);
        VersionHistorySection.verifyChangesModal();
      };

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C700853_');

        InventoryInstance.createInstanceViaApi({ instanceTitle: testData.instanceTitle }).then(
          ({ instanceData }) => {
            testData.instanceId = instanceData.instanceId;
          },
        );

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C700853 Missing values in modal for Suppressed from discovery and Staff suppressed when viewing version history (promin)',
        { tags: ['extendedPath', 'promin', 'C700853'] },
        () => {
          // Precondition: the instance details are opened
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 1: Actions > Edit instance
          openInstanceEditForm();

          // Step 2: check "Suppress from discovery" and "Staff suppress", save and close
          InstanceRecordEdit.clickDiscoverySuppressCheckbox();
          InstanceRecordEdit.markAsStaffSuppress();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(true);
          InstanceRecordEdit.verifyStaffSuppressCheckbox(true);
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndStaffSuppressedWarning();

          // Steps 3-4: Version history > "Changed" - the "Changed to" values are "true"
          openLatestChangesModal();
          VersionHistorySection.checkChangedToValueInModal(testData.discoverySuppressField, 'true');
          VersionHistorySection.checkChangedToValueInModal(testData.staffSuppressField, 'true');

          // Step 5: close the modal
          VersionHistorySection.closeChangesModal();

          // Step 6: close the version history pane, Actions > Edit instance
          VersionHistorySection.clickCloseButton();
          openInstanceEditForm();

          // Step 7: uncheck both checkboxes, save and close
          InstanceRecordEdit.clickDiscoverySuppressCheckbox();
          InstanceRecordEdit.markAsStaffSuppress();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(false);
          InstanceRecordEdit.verifyStaffSuppressCheckbox(false);
          InstanceRecordEdit.clickSaveAndCloseButton();
          InstanceRecordView.verifyInstanceRecordViewOpened();

          // Steps 8-9: Version history > the latest card "Changed" - the "Changed to" values are "false"
          openLatestChangesModal();
          VersionHistorySection.checkChangedToValueInModal(
            testData.discoverySuppressField,
            'false',
          );
          VersionHistorySection.checkChangedToValueInModal(testData.staffSuppressField, 'false');
        },
      );
    });
  });
});
