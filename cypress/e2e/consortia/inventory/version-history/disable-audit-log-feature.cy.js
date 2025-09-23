import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import Users from '../../../../support/fragments/users/users';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import SettingsInventory from '../../../../support/fragments/settings/inventory/settingsInventory';
import { getRandomLetters } from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version History', () => {
    describe('Consortia', () => {
      const permissions = [
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryViewEditGeneralSettings.gui,
        Permissions.auditConfigGroupsCollectionGet.gui,
        Permissions.auditConfigGroupsSettingsCollectionGet.gui,
        Permissions.auditConfigGroupsSettingsAuditInventoryCollectionGet.gui,
        Permissions.auditConfigGroupsSettingsItemPut.gui,
        Permissions.auditConfigGroupsSettingsAuditInventoryEnabledItemPut.gui,
      ];
      const testData = {
        sharedMarcTitle: 'AT_C663251 Stockholm International Film Festival.',
        localMarcTitle: 'AT_C663251 Stockholm International Film Festival.',
      };
      const marcFile = {
        marc: 'marcBibFileForC663251.mrc',
        fileName: `AT_C663251_marcBibFile_${Date.now()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        propertyName: 'instance',
      };
      const centralTenant = { affiliation: Affiliations.Consortia, name: tenantNames.central };
      const memberTenant = { affiliation: Affiliations.University, name: tenantNames.university };

      before('Setup test data', () => {
        cy.getAdminToken();
        [centralTenant, memberTenant].forEach(({ affiliation }) => {
          cy.withinTenant(affiliation, () => {
            InventoryInstances.deleteInstanceByTitleViaApi('AT_C663251');
          });
        });

        DataImport.uploadFilesViaApi(marcFile).then((ids) => {
          testData.sharedInstanceId = ids.createdInstanceIDs[0];
        });
        cy.withinTenant(memberTenant.affiliation, () => {
          cy.enableVersionHistoryFeature(true);
          DataImport.uploadFilesViaApi(marcFile).then((ids) => {
            testData.localInstanceId = ids.createdInstanceIDs[0];
          });
        });

        cy.createTempUser(permissions).then((userProperties) => {
          testData.user = userProperties;
          cy.affiliateUserToTenant({
            tenantId: memberTenant.affiliation,
            userId: testData.user.userId,
            permissions,
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            cy.waitForAuthRefresh(() => {
              cy.reload();
              InventoryInstances.waitContentLoading();
            });
          });

          ConsortiumManager.checkCurrentTenantInTopMenu(centralTenant.name);
        });
      });

      after('Clean up test data', () => {
        cy.getAdminToken();
        cy.withinTenant(memberTenant.affiliation, () => {
          cy.enableVersionHistoryFeature(false);
          InventoryInstance.deleteInstanceViaApi(testData.localInstanceId);
        });
        cy.withinTenant(centralTenant.affiliation, () => {
          InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C663251 Disable "Audit log" feature from Member tenant and check "View source" panes of Shared and Local "MARC bibliographic" record (spitfire)',
        { tags: ['criticalPathECS', 'spitfire', 'C663251'] },
        () => {
          // Step 1: Open view source pane of Shared MARC record
          InventoryInstances.searchByTitle(testData.sharedMarcTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.viewSource();
          InventoryViewSource.verifyVersionHistoryIcon({ isPresent: true });

          // Step 2: Note the last version in Version History
          InventoryViewSource.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionsCount(1);
          VersionHistorySection.verifyListOfChanges(['Original version']);
          VersionHistorySection.getVersionHistoryValue().then((sharedInstanceHistoryCount) => {
            // Step 3: Switch to Member tenant
            ConsortiumManager.switchActiveAffiliation(centralTenant.name, memberTenant.name);

            // Step 4: Open view source pane of Local MARC record
            InventoryInstances.searchByTitle(testData.localMarcTitle);
            InventorySearchAndFilter.byShared('No');
            InventoryInstances.selectInstance();
            InventoryInstance.viewSource();
            InventoryViewSource.verifyVersionHistoryIcon({ isPresent: true });

            // Step 5: Note the last version in Version History
            InventoryViewSource.clickVersionHistoryButton();
            VersionHistorySection.verifyVersionsCount(1);
            VersionHistorySection.verifyListOfChanges(['Original version']);
            VersionHistorySection.getVersionHistoryValue().then((localInstanceHistoryCount) => {
              // Step 6: Disable "Version history" for Member tenant via API
              cy.withinTenant(memberTenant.affiliation, () => {
                cy.enableVersionHistoryFeature(false);
              });

              // Step 7: Verify "Version history" tab is not displayed in Member tenant
              cy.visit(TopMenu.settingsPath);
              SettingsInventory.goToSettingsInventory();
              SettingsInventory.validateSettingsTab({ name: 'Version history', isPresent: false });

              // Step 8: Switch to Central tenant`
              ConsortiumManager.switchActiveAffiliation(memberTenant.name, centralTenant.name);

              // Step 9: Verify "Version history" tab is displayed in Central tenant
              SettingsInventory.validateSettingsTab({ name: 'Version history', isPresent: true });

              // Step 10: Switch back to Member tenant
              ConsortiumManager.switchActiveAffiliation(centralTenant.name, memberTenant.name);

              // Step 11: Open view source pane of Shared MARC record
              cy.visit(TopMenu.inventoryPath);
              InventoryInstances.waitContentLoading();
              InventoryInstances.searchByTitle(testData.sharedMarcTitle);
              InventorySearchAndFilter.byShared('Yes');
              InventoryInstances.selectInstance();
              InventoryInstance.viewSource();
              InventoryViewSource.verifyVersionHistoryIcon({ isPresent: true });

              // Step 12: Edit Shared MARC record
              InventoryViewSource.editMarcBibRecord();
              QuickMarcEditor.addValuesToExistingField(18, '300', `$a ${getRandomLetters(5)}`);
              QuickMarcEditor.saveAndCloseWithValidationWarnings();
              QuickMarcEditor.checkAfterSaveAndClose();

              // Step 13: Open view source pane of Local MARC record
              InventoryInstances.resetAllFilters();
              InventoryInstances.searchByTitle(testData.localMarcTitle);
              InventorySearchAndFilter.byShared('No');
              InventoryInstances.selectInstance();
              InventoryInstance.viewSource();
              InventoryViewSource.verifyVersionHistoryIcon({ isPresent: false });

              // Step 14: Edit Local MARC record
              InventoryViewSource.editMarcBibRecord();
              QuickMarcEditor.addValuesToExistingField(18, '300', `$a ${getRandomLetters(5)}`);
              QuickMarcEditor.saveAndCloseWithValidationWarnings();
              QuickMarcEditor.checkAfterSaveAndClose();

              // Step 15: Enable "Version history" for Member tenant via API
              cy.withinTenant(memberTenant.affiliation, () => {
                cy.enableVersionHistoryFeature(true);
              });

              // Step 16: Verify updated Shared MARC record in Version History
              InventoryInstances.resetAllFilters();
              InventoryInstances.searchByTitle(testData.sharedMarcTitle);
              InventorySearchAndFilter.byShared('Yes');
              InventoryInstances.selectInstance();
              InventoryInstance.viewSource();
              InventoryViewSource.clickVersionHistoryButton();
              VersionHistorySection.verifyVersionsCount(sharedInstanceHistoryCount + 1); // New version added
              InventoryViewSource.close();

              // Step 17: Verify updated Local MARC record in Version History
              InventoryInstances.resetAllFilters();
              InventoryInstances.searchByTitle(testData.localMarcTitle);
              InventorySearchAndFilter.byShared('No');
              InventoryInstances.selectInstance();
              InventoryInstance.viewSource();
              InventoryViewSource.clickVersionHistoryButton();
              VersionHistorySection.verifyVersionsCount(localInstanceHistoryCount); // No new version added
              InventoryViewSource.close();

              // Step 18: Switch back to Central tenant
              // Verify that Version History is still available for Shared MARC record
              ConsortiumManager.switchActiveAffiliation(memberTenant.name, centralTenant.name);
              InventoryInstances.searchByTitle(testData.sharedMarcTitle);
              InventoryInstances.selectInstance();
              InventoryInstance.viewSource();
              InventoryViewSource.clickVersionHistoryButton();
              VersionHistorySection.verifyVersionsCount(sharedInstanceHistoryCount + 1);
            });
          });
        },
      );
    });
  });
});
