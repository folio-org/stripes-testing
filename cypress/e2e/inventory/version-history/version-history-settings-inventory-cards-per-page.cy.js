import { APPLICATION_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import SettingsInventory from '../../../support/fragments/settings/inventory/settingsInventory';
import VersionHistorySettings from '../../../support/fragments/settings/inventory/versionHistory';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsPane from '../../../support/fragments/settings/settingsPane';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Version history', () => {
      const totalUpdates = 100;
      const totalVersions = totalUpdates + 1;
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C655274_MarcBibInstance_${randomPostfix}`,
        versionHistoryTab: 'Version history',
      };

      const permissions = [
        Permissions.inventoryViewEditGeneralSettings.gui,
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ];

      function navigateToVersionHistorySettings() {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab(testData.versionHistoryTab);
      }

      function openVersionHistory(initial = false) {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        if (initial) {
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.createdRecordId);
          InventoryInstances.selectInstanceById(testData.createdRecordId);
        } else InventoryInstances.waitLoading();
        InventoryInstance.waitLoading();
        InventoryInstance.viewSource();
        InventoryViewSource.verifyVersionHistoryButtonShown();
        InventoryViewSource.clickVersionHistoryButton();
        VersionHistorySection.waitLoading();
      }

      function updateRecordNTimes(instanceId, iteration) {
        if (iteration > totalUpdates) return;
        cy.getMarcRecordDataViaAPI(instanceId).then((marcData) => {
          const field245 = marcData.fields.find((f) => f.tag === '245');
          field245.content = `$a ${testData.instanceTitle} v${iteration}`;
          marcData.relatedRecordVersion = iteration;
          cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(({ status }) => {
            expect(status).to.be.greaterThan(200);
            updateRecordNTimes(instanceId, iteration + 1);
          });
        });
      }

      function closeVersionHistory() {
        VersionHistorySection.clickCloseButton();
        InventoryViewSource.close();
        InventoryInstance.waitLoading();
      }

      before('Create test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('C655274_');
        cy.setVersionHistoryRecordsPerPage(10);

        cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
          testData.createdRecordId = instanceId;

          // Update the MARC record multiple times to create 100+ versions
          cy.then(() => {
            updateRecordNTimes(testData.createdRecordId, 1);
          }).then(() => {
            cy.createTempUser(permissions).then((userProperties) => {
              testData.userProperties = userProperties;
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        // Reset cards per page to default (10) via API
        cy.setVersionHistoryRecordsPerPage(10);
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C655274 Edit "Cards to display per page on Version history" on "Settings >> Inventory >> Version history" page (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C655274'] },
        () => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });

          // Step 1-2: Go to Settings > Inventory > Version history
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.selectSettingsTab(testData.versionHistoryTab);
          VersionHistorySettings.waitLoading();
          VersionHistorySettings.verifyDefaultCardsPerPage();
          VersionHistorySettings.verifySaveButtonEnabled(false);

          // Step 3: Verify dropdown options
          VersionHistorySettings.verifyDropdownOptions();

          // Step 4-5: Select "25" and save
          VersionHistorySettings.selectCardsPerPageAndSave(25);

          // Step 6: Open version history - verify 25 cards and Load more
          openVersionHistory(true);
          VersionHistorySection.verifyVersionHistoryPane(25, true, totalVersions);
          VersionHistorySection.verifyLoadMoreButton(true);

          // Step 7: First Load more - verify next 25 versions are displayed
          VersionHistorySection.clickLoadMore();
          VersionHistorySection.verifyVersionHistoryPane(25 + 25, true, totalVersions);
          // Step 8: Continue clicking Load more until we reach the end
          const clicksNeeded = Math.ceil(totalVersions / 25) - 1;
          for (let i = 1; i < clicksNeeded; i++) {
            VersionHistorySection.clickLoadMore();
          }
          // After loading all: Original card is displayed, no Load more
          VersionHistorySection.verifyLoadMoreButton(false);
          VersionHistorySection.verifyVersionHistoryCard(
            totalVersions - 1,
            undefined,
            undefined,
            undefined,
            true,
            false,
          );
          closeVersionHistory();

          // Step 9-10: Go to Settings, select "50" and save
          navigateToVersionHistorySettings();
          VersionHistorySettings.verifyCardsPerPageValue(25);
          VersionHistorySettings.verifySaveButtonEnabled(false);
          VersionHistorySettings.selectCardsPerPageAndSave(50);

          // Step 11: Open version history - verify 50 cards and Load more
          openVersionHistory();
          VersionHistorySection.verifyVersionsCount(totalVersions);
          VersionHistorySection.verifyLoadMoreButton(true);
          closeVersionHistory();

          // Step 12-13: Go to Settings, select "75" and save
          navigateToVersionHistorySettings();
          VersionHistorySettings.verifyCardsPerPageValue(50);
          VersionHistorySettings.verifySaveButtonEnabled(false);
          VersionHistorySettings.selectCardsPerPageAndSave(75);

          // Step 14: Open version history - verify 75 cards and Load more
          openVersionHistory();
          VersionHistorySection.verifyVersionsCount(totalVersions);
          VersionHistorySection.verifyLoadMoreButton(true);
          closeVersionHistory();

          // Step 15-16: Go to Settings, select "100" and save
          navigateToVersionHistorySettings();
          VersionHistorySettings.verifyCardsPerPageValue(75);
          VersionHistorySettings.verifySaveButtonEnabled(false);
          VersionHistorySettings.selectCardsPerPageAndSave(100);

          // Step 17: Open version history - verify 100 cards and Load more
          openVersionHistory();
          VersionHistorySection.verifyVersionsCount(totalVersions);
          VersionHistorySection.verifyLoadMoreButton(true);

          // Step 18: Click Load more - verify Original card, no Load more
          VersionHistorySection.clickLoadMore();
          VersionHistorySection.verifyLoadMoreButton(false);
          VersionHistorySection.verifyVersionHistoryCard(
            totalVersions - 1,
            undefined,
            undefined,
            undefined,
            true,
            false,
          );
          closeVersionHistory();
        },
      );
    });
  });
});
