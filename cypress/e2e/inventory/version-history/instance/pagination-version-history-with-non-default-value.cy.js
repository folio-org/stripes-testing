import { APPLICATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Instance', () => {
      const totalVersionHistoryRecords = 55;
      const totalUpdates = totalVersionHistoryRecords - 1;
      const randomPostfix = getRandomPostfix();
      const testData = {
        instance: {
          title: `AT_C651546_InstanceVersionHistory_${randomPostfix}`,
        },
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };

      function updateInstanceNTimes(instanceId, iteration = 1) {
        if (iteration > totalUpdates) return cy.wrap(null);

        return cy
          .getInstanceById(instanceId)
          .then((instance) => {
            return cy.updateInstance({
              ...instance,
              indexTitle: `AT_C651546_IndexTitle_${iteration}`,
            });
          })
          .then(() => updateInstanceNTimes(instanceId, iteration + 1));
      }

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getAdminUserDetails().then((admin) => {
          testData.adminUser = admin;
        });
        cy.setVersionHistoryRecordsPerPage(25);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instanceId = instanceData.instanceId;

          updateInstanceNTimes(instanceData.instanceId);
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [CapabilitySets.uiInventory],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651546 Pagination of "Version history" with Non-default value in Instance (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651546'] },
        () => {
          // Step 1: Open Instance details from Inventory.
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();

          // Step 2: Open Instance's Version history pane.
          InstanceRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();

          // Step 3: Version history pane shows first 25 records.
          VersionHistorySection.verifyVersionHistoryPane(25, true, totalVersionHistoryRecords);
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.adminUser.personal.firstName,
            testData.adminUser.personal.lastName,
            false,
            true,
          );

          // Step 4: Load the next 25 records.
          VersionHistorySection.clickLoadMore();
          VersionHistorySection.verifyVersionHistoryPane(50, true, totalVersionHistoryRecords);

          // Step 5: Load the remaining 5 records and verify pagination is complete.
          VersionHistorySection.clickLoadMore();
          VersionHistorySection.verifyVersionHistoryPane(
            totalVersionHistoryRecords,
            false,
            totalVersionHistoryRecords,
          );
          VersionHistorySection.verifyLoadMoreButton(false);
        },
      );
    });
  });
});
