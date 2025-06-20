import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import VersionHistorySection from '../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import DateTools from '../../../support/utils/dateTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsInventory from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C655297_MarcBibInstance_${randomPostfix}`,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        tag245: '245',
        addedField: {
          tag: '100',
          content: ['1', '\\', '$a Some contributor C655297'],
          indexAbove: 3,
        },
        valid245IndicatorValue: '1',
        versionHistoryTab: 'Version history',
      };
      const updatedTitle = `${testData.instanceTitle}_UPD`;
      const versionHistorySourceCardsData = [
        {
          isOriginal: false,
          isCurrent: true,
          changes: [
            { text: 'Field 100', action: VersionHistorySection.fieldActions.ADDED },
            { text: 'Field 245', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field 008', action: VersionHistorySection.fieldActions.EDITED },
            { text: 'Field LDR', action: VersionHistorySection.fieldActions.EDITED },
          ],
        },
        { isOriginal: true, isCurrent: false },
      ];
      const permissions = [
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryViewEditGeneralSettings.gui,
        Permissions.auditConfigGroupsCollectionGet.gui,
        Permissions.auditConfigGroupsSettingsCollectionGet.gui,
        Permissions.auditConfigGroupsSettingsAuditInventoryCollectionGet.gui,
        Permissions.auditConfigGroupsSettingsItemPut.gui,
        Permissions.auditConfigGroupsSettingsAuditInventoryEnabledItemPut.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        cy.enableVersionHistoryFeature(true);
        InventoryInstances.deleteInstanceByTitleViaApi('C655297');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getUsers({ limit: 1, query: `"username"="${Cypress.env('diku_login')}"` }).then(
            (users) => {
              testData.adminLastName = users[0].personal.lastName;
              testData.adminFirstName = users[0].personal.firstName;

              versionHistorySourceCardsData.forEach((cardData, index) => {
                if (index) {
                  cardData.firstName = testData.adminFirstName;
                  cardData.lastName = testData.adminLastName;
                } else {
                  cardData.firstName = userProperties.firstName;
                  cardData.lastName = userProperties.lastName;
                }
              });
            },
          );

          cy.getAdminToken();
          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            testData.createdRecordId = instanceId;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(testData.createdRecordId);
            InventoryInstances.selectInstanceById(testData.createdRecordId);
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.addEmptyFields(testData.addedField.indexAbove);
            QuickMarcEditor.addValuesToExistingField(
              testData.addedField.indexAbove,
              testData.addedField.tag,
              testData.addedField.content[2],
              testData.addedField.content[0],
              testData.addedField.content[1],
            );
            QuickMarcEditor.updateIndicatorValue(
              testData.tag245,
              testData.valid245IndicatorValue,
              0,
            );
            QuickMarcEditor.updateIndicatorValue(
              testData.tag245,
              testData.valid245IndicatorValue,
              1,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        cy.enableVersionHistoryFeature(true);
        InventoryInstance.deleteInstanceViaApi(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C655297 Check "Version history" pane after CRUD multiple repeatable fields and subfields in "MARC bibliographic" record via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C655297'] },
        () => {
          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryButtonShown();
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane(versionHistorySourceCardsData.length);
          versionHistorySourceCardsData.forEach((cardData, index) => {
            VersionHistorySection.verifyVersionHistoryCard(
              index,
              testData.date,
              cardData.firstName,
              cardData.lastName,
              cardData.isOriginal,
              cardData.isCurrent,
            );
            if (cardData.changes) {
              cardData.changes.forEach((change) => {
                VersionHistorySection.checkChangeForCard(index, change.text, change.action);
              });
              VersionHistorySection.checkChangesCountForCard(index, cardData.changes.length);
            }
          });
          VersionHistorySection.clickCloseButton();
          InventoryViewSource.close();
          InventoryInstance.checkInstanceTitle(testData.instanceTitle);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsInventory.goToSettingsInventory();
          SettingsInventory.validateSettingsTab({
            name: testData.versionHistoryTab,
            isPresent: true,
          });
          cy.enableVersionHistoryFeature(false).then(() => {
            // wait for settings to be updated
            cy.wait(1000);
            cy.visit(TopMenu.settingsPath);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.validateSettingsTab({
              name: testData.versionHistoryTab,
              isPresent: false,
            });

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.searchByTitle(testData.createdRecordId);
            InventoryInstances.selectInstanceById(testData.createdRecordId);
            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
            InventoryInstance.viewSource();
            InventoryViewSource.verifyVersionHistoryButtonShown(false);
            InventoryViewSource.close();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateExistingField(testData.tag245, updatedTitle);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkInstanceTitle(updatedTitle);

            cy.enableVersionHistoryFeature(true).then(() => {
              // wait for settings to be updated
              cy.wait(1000);
              cy.visit(TopMenu.settingsPath);
              SettingsInventory.goToSettingsInventory();
              SettingsInventory.validateSettingsTab({
                name: testData.versionHistoryTab,
                isPresent: true,
              });

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
              InventoryInstances.searchByTitle(testData.createdRecordId);
              InventoryInstances.selectInstanceById(testData.createdRecordId);
              InventoryInstance.checkInstanceTitle(updatedTitle);
              InventoryInstance.viewSource();
              InventoryViewSource.verifyVersionHistoryButtonShown();

              InventoryViewSource.clickVersionHistoryButton();
              VersionHistorySection.verifyVersionHistoryPane(versionHistorySourceCardsData.length);
              versionHistorySourceCardsData.forEach((cardData, index) => {
                VersionHistorySection.verifyVersionHistoryCard(
                  index,
                  testData.date,
                  cardData.firstName,
                  cardData.lastName,
                  cardData.isOriginal,
                  cardData.isCurrent,
                );
                if (cardData.changes) {
                  cardData.changes.forEach((change) => {
                    VersionHistorySection.checkChangeForCard(index, change.text, change.action);
                  });
                  VersionHistorySection.checkChangesCountForCard(index, cardData.changes.length);
                }
              });
            });
          });
        },
      );
    });
  });
});
