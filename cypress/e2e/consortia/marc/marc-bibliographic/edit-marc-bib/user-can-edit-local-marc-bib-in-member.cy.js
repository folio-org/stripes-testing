import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../../../support/constants';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        sharedBibSourcePaheheaderText: 'C405549 Instance Local M1 Updated',
        instanceSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        tag245: '245',
        tag500: '500',
        tag245Content: 'C405549 Instance Local M1 Updated',
        tag500Content: 'Proceedings. Updated',
      };

      const users = {};

      const marcFiles = [
        {
          marc: 'marcBibFileForC405549.mrc',
          fileNameImported: `testMarcFileC405549.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        },
      ];

      const createdRecordIDs = [];

      before('Create users, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.loginAsAdmin().then(() => {
              marcFiles.forEach((marcFile) => {
                cy.visit(TopMenu.dataImportPath);
                ConsortiumManager.switchActiveAffiliation(tenantNames.university);
                DataImport.waitLoading();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
                DataImport.verifyUploadState();
                DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFile.jobProfileToRun);
                JobProfiles.runImportFile();
                Logs.waitFileIsImported(marcFile.fileNameImported);
                Logs.checkJobStatus(marcFile.fileNameImported, JOB_STATUS_NAMES.COMPLETED);
                Logs.openFileDetails(marcFile.fileNameImported);
                Logs.getCreatedItemsID().then((link) => {
                  createdRecordIDs.push(link.split('/')[5]);
                });
              });
            });
          });
      });

      after('Delete users, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        cy.setTenant(Affiliations.University);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
      });

      it(
        'C405549 User can edit local "MARC Bib" in member tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.university);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          });

          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);
          QuickMarcEditor.updateExistingField(testData.tag500, `$a ${testData.tag500Content}`);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.tag245Content);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
          InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245Content);
          InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500Content);
          InventoryViewSource.close();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.tag245Content,
          );
          InventoryInstance.verifyNoResultFoundMessage(
            `No results found for "${testData.tag245Content}". Please check your spelling and filters.`,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.searchByParameter(
            testData.instanceSearchOption,
            testData.tag245Content,
          );
          InventoryInstance.verifyNoResultFoundMessage(
            `No results found for "${testData.tag245Content}". Please check your spelling and filters.`,
          );
        },
      );
    });
  });
});
