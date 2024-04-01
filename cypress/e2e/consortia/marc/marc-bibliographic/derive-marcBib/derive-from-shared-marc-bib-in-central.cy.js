import { JOB_STATUS_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag245: '245',
        tag245DerivedContent: '$a C402767 Variations (derived record) / $c Ludwig Van Beethoven.',
        tag245EditedContent:
          '$a C402767 Variations (derived and edited record) / $c Ludwig Van Beethoven.',
        instanceTitle: 'C402767 Variations / Ludwig Van Beethoven.',
        instanceDerivedTitle: 'C402767 Variations (derived record) / Ludwig Van Beethoven.',
        instanceEditedTitle:
          'C402767 Variations (derived and edited record) / Ludwig Van Beethoven.',
        deriveSharedPaneheaderText: 'Derive a new shared MARC bib record',
        sourceViewSharedText: 'Shared MARC bibliographic record',
      };

      const marcFile = {
        marc: 'marcBibFileC402767.mrc',
        fileNameImported: `testMarcFileC402767.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES,
      };

      const users = {};

      const createdInstanceIDs = [];

      before('Create user, data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;

            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.loginAsAdmin().then(() => {
              cy.visit(TopMenu.dataImportPath);
              DataImport.verifyUploadState();
              DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(marcFile.fileNameImported);
              Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
              Logs.openFileDetails(marcFile.fileNameImported);
              Logs.getCreatedItemsID().then((link) => {
                createdInstanceIDs.push(link.split('/')[5]);
              });
            });

            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
          });
      });

      after('Delete user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        createdInstanceIDs.forEach((instanceID) => {
          InventoryInstance.deleteInstanceViaApi(instanceID);
        });
      });

      it(
        'C402767 Derive new Shared MARC bib record from Shared Instance in Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          cy.visit(`${TopMenu.inventoryPath}/view/${createdInstanceIDs[0]}`);
          InventoryInstance.waitLoading();
          InventoryInstance.checkPresentedText(testData.instanceTitle);

          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.checkPaneheaderContains(testData.deriveSharedPaneheaderText);
          QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245DerivedContent);
          QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.checkSharedTextInDetailView();
          InventoryInstance.checkExpectedMARCSource();
          InventoryInstance.checkPresentedText(testData.instanceDerivedTitle);
          InventoryInstance.verifyLastUpdatedSource(
            users.userProperties.firstName,
            users.userProperties.lastName,
          );
          InventoryInstance.verifyLastUpdatedDate();
          InventoryInstance.verifyRecordCreatedSource(
            users.userProperties.firstName,
            users.userProperties.lastName,
          );
          InventoryInstance.getId().then((id) => {
            createdInstanceIDs.push(id);

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245DerivedContent);
            QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245EditedContent);
            QuickMarcEditor.checkContentByTag(testData.tag245, testData.tag245EditedContent);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkSharedTextInDetailView();
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.checkPresentedText(testData.instanceEditedTitle);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            InventoryInstances.searchByTitle(createdInstanceIDs[1]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkPresentedText(testData.instanceEditedTitle);
            InventoryInstance.checkExpectedMARCSource();
            InventoryInstance.verifyLastUpdatedSource(
              users.userProperties.firstName,
              users.userProperties.lastName,
            );
            InventoryInstance.verifyLastUpdatedDate();
            InventoryInstance.verifyRecordCreatedSource(
              users.userProperties.firstName,
              users.userProperties.lastName,
            );

            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.tag245EditedContent);
            InventoryViewSource.contains(testData.sourceViewSharedText);
          });
        },
      );
    });
  });
});
