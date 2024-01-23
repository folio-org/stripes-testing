/* eslint-disable no-unused-vars */
import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../../../support/constants';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomDigits = randomFourDigitNumber();
        const testData = {
          sharedBibSourcePaheheaderText: 'Shared MARC bibliographic record',
          tag245: '245',
          tag710: '710',
          tag504: '504',
          tag650: '650',
          tag600: '600',
          tag100: '100',
          title: 'C405513 Auto Instance Shared Central',
          editSharedRecordText: 'Edit shared MARC record',
          tag100UpdatedContent: '$a C405513 Auto Coates, Ta-Nehisi,',
          tag600UpdatedContent: `$a C405513 Auto Black Panther $c (Fictitious character) $v Comic books, strips, etc. ${randomDigits}`,
          tag710Content: `$a New Contrib C405513 ${randomDigits}`,
        };

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileC405513.mrc',
            fileNameImported: `testMarcFileC405513.${getRandomPostfix()}.mrc`,
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

              cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
              cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.loginAsAdmin().then(() => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                marcFiles.forEach((marcFile) => {
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
                    createdRecordIDs.push(link.split('/')[5]);
                  });
                });
              });

              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              }).then(() => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                InventoryInstances.waitContentLoading();
                ConsortiumManager.switchActiveAffiliation(tenantNames.college);
                InventoryInstances.waitContentLoading();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              });
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        });

        it(
          'C405513 Adding/deleting fields and subfields when editing shared "MARC Bib" in member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkInstanceTitle(testData.title);

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkPaneheaderContains(testData.editSharedRecordText);
            QuickMarcEditor.addEmptyFields(4);
            QuickMarcEditor.checkEmptyFieldAdded(5);
            QuickMarcEditor.updateExistingTagValue(5, testData.tag710);
            QuickMarcEditor.updateExistingField(testData.tag710, testData.tag710Content);
            QuickMarcEditor.checkContentByTag(testData.tag710, testData.tag710Content);
            // wait for fileds list to update
            cy.wait(1000);
            QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag650);
            QuickMarcEditor.afterDeleteNotification(testData.tag650);
            QuickMarcEditor.updateExistingField(testData.tag600, testData.tag600UpdatedContent);
            QuickMarcEditor.checkContentByTag(testData.tag600, testData.tag600UpdatedContent);
            QuickMarcEditor.updateExistingField(testData.tag100, testData.tag100UpdatedContent);
            QuickMarcEditor.checkContentByTag(testData.tag100, testData.tag100UpdatedContent);
            QuickMarcEditor.clickSaveAndKeepEditingButton();
            QuickMarcEditor.confirmDeletingFields();
            QuickMarcEditor.checkAfterSaveAndKeepEditing();
            QuickMarcEditor.checkContentByTag(testData.tag100, testData.tag100UpdatedContent);
            QuickMarcEditor.checkContentByTag(testData.tag600, testData.tag600UpdatedContent);
            QuickMarcEditor.checkTagAbsent(testData.tag650);
            QuickMarcEditor.checkContentByTag(testData.tag710, testData.tag710Content);
            QuickMarcEditor.closeUsingCrossButton();

            InventoryInstance.waitLoading();
            InventoryInstance.checkInstanceTitle(testData.title);

            // QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.tag245Content}`);
            // QuickMarcEditor.updateExistingField(testData.tag500, `$a ${testData.tag500Content}`);
            // QuickMarcEditor.moveFieldUp(17);
            // QuickMarcEditor.pressSaveAndClose();
            // QuickMarcEditor.checkAfterSaveAndClose();
            // InventoryInstance.checkInstanceTitle(testData.tag245Content);
            // InventoryInstance.verifyLastUpdatedSource(
            //   users.userAProperties.firstName,
            //   users.userAProperties.lastName,
            // );

            // cy.login(users.userBProperties.username, users.userBProperties.password, {
            //   path: TopMenu.inventoryPath,
            //   waiter: InventoryInstances.waitContentLoading,
            // });
            // InventoryInstance.searchByTitle(createdRecordIDs[0]);
            // InventoryInstances.selectInstance();
            // InventoryInstance.checkInstanceTitle(testData.tag245Content);
            // InventoryInstance.verifyLastUpdatedSource(
            //   users.userAProperties.firstName,
            //   users.userAProperties.lastName,
            // );
            // InventoryInstance.viewSource();
            // InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
            // InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245Content);
            // InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500Content);
            // InventoryViewSource.close();
            // ConsortiumManager.switchActiveAffiliation(tenantNames.university);
            // InventoryInstance.searchByTitle(createdRecordIDs[0]);
            // InventoryInstances.selectInstance();
            // InventoryInstance.checkInstanceTitle(testData.tag245Content);
            // // TO DO: fix this check failure - 'Unknown user' is shown, possibly due to the way users are created in test
            // // InventoryInstance.verifyLastUpdatedSource(users.userAProperties.firstName, users.userAProperties.lastName);
            // InventoryInstance.viewSource();
            // InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
            // InventoryViewSource.verifyFieldInMARCBibSource(testData.tag245, testData.tag245Content);
            // InventoryViewSource.verifyFieldInMARCBibSource(testData.tag500, testData.tag500Content);
          },
        );
      });
    });
  });
});
