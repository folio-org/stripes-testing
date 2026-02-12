import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import DeveloperPane from '../../../support/fragments/settings/developer/developerPane';
import UserLocale from '../../../support/fragments/settings/developer/user-locate/temporaryUserLocale';

describe('Inventory', () => {
  describe('MARC Bibliographic', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tags: {
          tag008: '008',
          tag245: '245',
        },
        instanceTitle: `AT_C692114_MarcBibInstance_${randomPostfix}`,
        createdRecordId: null,
        userProperties: null,
        newTimezone: 'America/Toronto',
        initialTimestamp: null,
      };
      const permissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiSettingsDeveloperUserLocale.gui,
      ];

      const marcBibFields = [
        {
          tag: testData.tags.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tags.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '0'],
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              testData.createdRecordId = instanceId;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
              InventoryInstances.searchByTitle(testData.createdRecordId);
              InventoryInstances.selectInstanceById(testData.createdRecordId);
              InventoryInstance.waitLoading();

              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              QuickMarcEditor.updateLDR06And07Positions();
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
              InventoryInstance.waitLoading();

              InventoryInstance.viewSource();
              InventoryViewSource.waitLoading();
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C692114 Verify that "Updated date/time stamp" is displayed based on current locale in "Version history" pane of "MARC bibliographic" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C692114'] },
        () => {
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();

          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(2);

          VersionHistorySection.getCardTimestamp(0).then((initialTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(initialTimestamp);
            testData.initialTimestamp = initialTimestamp;
          });
          InventoryViewSource.close();

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.DEVELOPER);
          DeveloperPane.waitLoading();

          DeveloperPane.selectOption('User locale');
          DeveloperPane.waitLoading();
          UserLocale.waitLoading();

          UserLocale.configureUserLocale({
            username: testData.userProperties.username,
            timezone: testData.newTimezone,
          });
          UserLocale.verifySuccessCallout(testData.userProperties.username);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.searchByTitle(testData.createdRecordId);
          InventoryInstances.selectInstanceById(testData.createdRecordId);
          InventoryInstance.waitLoading();
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();
          cy.reload();

          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(2);

          VersionHistorySection.getCardTimestamp(0).then((updatedTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(updatedTimestamp);
            expect(updatedTimestamp).to.not.equal(testData.initialTimestamp);
          });

          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.getTimestampFromOpenModalChanges().then((modalTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(modalTimestamp);
            expect(modalTimestamp).to.not.equal(testData.initialTimestamp);
          });
        },
      );
    });
  });
});
