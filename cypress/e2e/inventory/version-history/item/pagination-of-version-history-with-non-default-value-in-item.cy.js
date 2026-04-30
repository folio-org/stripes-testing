import {
  APPLICATION_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
} from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import SettingsInventory from '../../../../support/fragments/settings/inventory/settingsInventory';
import VersionHistorySettings from '../../../../support/fragments/settings/inventory/versionHistory';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const totalVersionHistoryRecords = 55;
      const totalUpdates = totalVersionHistoryRecords - 1;
      const randomPostfix = getRandomPostfix();
      const testData = {
        instance: {
          title: `AT_C651578_ItemVersionHistory_${randomPostfix}`,
        },
        item: {
          barcode: `AT_C651578_${randomPostfix}`,
        },
        versionHistoryTab: 'Version history',
      };

      function updateItemNTimes(iteration = 1) {
        if (iteration > totalUpdates) return cy.wrap(null);

        return cy
          .getItems({ limit: 1, query: `"barcode"=="${testData.item.barcode}"` })
          .then((item) => {
            return cy.updateItemViaApi({
              ...item,
              copyNumber: `AT_C651578_Copy_${iteration}`,
            });
          })
          .then(() => updateItemNTimes(iteration + 1));
      }

      function navigateToVersionHistorySettings() {
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(testData.versionHistoryTab);
        VersionHistorySettings.waitLoading();
      }

      function openItemFromInventory() {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instance.title);
        InventoryInstances.selectInstance();
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InventoryInstance.openHoldingsAccordion(testData.location.name);
        InventoryInstance.openItemByBarcode(testData.item.barcode);
        ItemRecordView.waitLoading();
      }

      before('Create test data', () => {
        cy.getAdminToken();
        cy.setVersionHistoryRecordsPerPage(10);

        cy.then(() => {
          cy.getDefaultMaterialType().then((materialTypes) => {
            testData.materialType = materialTypes;
          });
          InventoryHoldings.getHoldingSources({ limit: 1 }).then((source) => {
            testData.holdingsSourceId = source.id;
          });
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypes = instanceTypes;
          });
          cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
            testData.holdingTypes = holdingTypes;
          });
          cy.getLoanTypes({ query: `name=="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((res) => {
            testData.location = res;
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypes[0].id,
                title: testData.instance.title,
              },
              holdings: [
                {
                  holdingsTypeId: testData.holdingTypes[0].id,
                  permanentLocationId: testData.location.id,
                  sourceId: testData.holdingsSourceId,
                },
              ],
              items: [
                {
                  barcode: testData.item.barcode,
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: testData.loanTypeId },
                  materialType: { id: testData.materialType.id },
                },
              ],
            }).then((createdInstance) => {
              testData.instance.id = createdInstance.instanceId;
            });
          })
          .then(() => {
            updateItemNTimes();
          })
          .then(() => {
            cy.createTempUser([]).then((userProperties) => {
              testData.user = userProperties;

              cy.assignCapabilitiesToExistingUser(
                testData.user.userId,
                [],
                [CapabilitySets.uiInventory, CapabilitySets.uiInventorySettingsDisplaySettingsView],
              );
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.setVersionHistoryRecordsPerPage(10);
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.item.barcode);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C651578 Pagination of "Version history" with Non-default value in Item (folijet)',
        { tags: ['criticalPath', 'folijet', 'C651578'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });

          navigateToVersionHistorySettings();
          VersionHistorySettings.selectCardsPerPageAndSave(25);

          // Step 1: Open Item details from the Holdings accordion.
          openItemFromInventory();

          // Step 2: Open Version history fourth pane.
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();

          // Step 3: Non-default page size shows first 25 records.
          VersionHistorySection.verifyVersionHistoryPane(25, true, totalVersionHistoryRecords);
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            undefined,
            undefined,
            undefined,
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
