import { APPLICATION_NAMES, LOCATION_NAMES } from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Holdings', () => {
      const totalVersionHistoryRecords = 25;
      const totalUpdates = totalVersionHistoryRecords - 1;
      const randomPostfix = getRandomPostfix();
      const testData = {
        instance: {
          title: `AT_C651574_HoldingsVersionHistory_${randomPostfix}`,
        },
      };

      function updateHoldingNTimes(holdingId, iteration = 1) {
        if (iteration > totalUpdates) return cy.wrap(null);

        return cy
          .getHoldings({ limit: 1, query: `"id"=="${holdingId}"` })
          .then((holdings) => {
            return cy.updateHoldingRecord(holdingId, {
              ...holdings[0],
              copyNumber: `AT_C651574_Copy_${iteration}`,
            });
          })
          .then(() => updateHoldingNTimes(holdingId, iteration + 1));
      }

      before('Create test data', () => {
        cy.getAdminToken();
        cy.setVersionHistoryRecordsPerPage(10);

        cy.then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.holdingTypeId = holdingTypes[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((res) => {
            testData.location = res;
          });
          InventoryHoldings.getHoldingsFolioSource().then((source) => {
            testData.holdingsSourceId = source.id;
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypeId,
                  permanentLocationId: testData.location.id,
                  sourceId: testData.holdingsSourceId,
                },
              ],
            }).then((createdInstance) => {
              testData.instance.id = createdInstance.instanceId;
              testData.holdingId = createdInstance.holdingIds[0].id;
            });
          })
          .then(() => {
            updateHoldingNTimes(testData.holdingId);
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
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.id);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651574 Pagination of "Version history" with default value in Holdings (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651574'] },
        () => {
          // Step 1: Open Holdings details from Instance.
          InventoryInstances.searchByTitle(testData.instance.id);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.waitLoading();

          // Step 2: Open Holdings' Version history pane.
          HoldingsRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();

          // Step 3: Version history pane shows first 10 records (default page size).
          VersionHistorySection.verifyVersionHistoryPane(10, true, totalVersionHistoryRecords);

          // Step 4: Load the next 10 records.
          VersionHistorySection.clickLoadMore();
          VersionHistorySection.verifyVersionHistoryPane(20, true, totalVersionHistoryRecords);

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
