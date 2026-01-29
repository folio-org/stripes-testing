import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../../../support/fragments/inventory/search/browseContributors';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Consortia', () => {
        const randomDigits = randomFourDigitNumber();
        const testData = {
          sharedBibSourcePaheheaderText: 'Shared MARC bibliographic record',
          tag710: '710',
          tag650: '650',
          tag600: '600',
          tag100: '100',
          title: 'C405513 Auto Instance Shared Central',
          editSharedRecordText: 'Edit shared MARC record',
          tag100UpdatedContent: '$a C405513 Auto Coates, Ta-Nehisi,',
          tag600UpdatedContent: `$a C405513 Auto Black Panther $c (Fictitious character) $v Comic books, strips, etc. ${randomDigits}`,
          tag710Content: `$a New Contrib C405513 ${randomDigits}`,
          expectedContributorNames: [
            'C405513 Auto Coates, Ta-Nehisi',
            'Stelfreeze, Brian',
            `New Contrib C405513 ${randomDigits}`,
          ],
          notExpectedContributorName: 'Testauthor.',
          expectedSubjectName: `C405513 Auto Black Panther (Fictitious character)--Comic books, strips, etc. ${randomDigits}`,
          notExpectedSubjectName: 'C405513 Auto Superheroes--Comic books, strips, etc.',
        };

        const users = {};

        const marcFiles = [
          {
            marc: 'marcBibFileC405513.mrc',
            fileNameImported: `testMarcFileC405513.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
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

              cy.affiliateUserToTenant({
                tenantId: Affiliations.College,
                userId: users.userProperties.userId,
                permissions: [
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                ],
              });

              cy.affiliateUserToTenant({
                tenantId: Affiliations.University,
                userId: users.userProperties.userId,
                permissions: [
                  Permissions.inventoryAll.gui,
                  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                ],
              });
            })
            .then(() => {
              cy.resetTenant();
              marcFiles.forEach((marcFile) => {
                DataImport.uploadFileViaApi(
                  marcFile.marc,
                  marcFile.fileNameImported,
                  marcFile.jobProfileToRun,
                ).then((response) => {
                  response.forEach((record) => {
                    createdRecordIDs.push(record.instance.id);
                  });
                });
              });

              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              }).then(() => {
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
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
          { tags: ['criticalPathECS', 'spitfire', 'C405513'] },
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
            // wait for fields list to update
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
            testData.expectedContributorNames.forEach((contributorName) => {
              InventoryInstance.checkContributor(contributorName);
            });
            InventoryInstance.checkPresentedText(testData.notExpectedContributorName, false);
            InventoryInstance.verifySubjectHeading(testData.expectedSubjectName);
            InventoryInstance.checkPresentedText(testData.notExpectedSubjectName, false);
            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
            InventoryViewSource.verifyFieldInMARCBibSource(
              testData.tag100,
              testData.tag100UpdatedContent,
            );
            InventoryViewSource.verifyFieldInMARCBibSource(
              testData.tag600,
              testData.tag600UpdatedContent,
            );
            InventoryViewSource.verifyFieldInMARCBibSource(testData.tag710, testData.tag710Content);
            InventoryViewSource.verifyAbsenceOfValue(`${testData.tag650}\t`);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkInstanceTitle(testData.title);
            testData.expectedContributorNames.forEach((contributorName) => {
              InventoryInstance.checkContributor(contributorName);
            });
            InventoryInstance.checkPresentedText(testData.notExpectedContributorName, false);
            InventoryInstance.verifySubjectHeading(testData.expectedSubjectName);
            InventoryInstance.checkPresentedText(testData.notExpectedSubjectName, false);

            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
            InventoryViewSource.verifyFieldInMARCBibSource(
              testData.tag100,
              testData.tag100UpdatedContent,
            );
            InventoryViewSource.verifyFieldInMARCBibSource(
              testData.tag600,
              testData.tag600UpdatedContent,
            );
            InventoryViewSource.verifyFieldInMARCBibSource(testData.tag710, testData.tag710Content);
            InventoryViewSource.verifyAbsenceOfValue(`${testData.tag650}\t`);
            InventoryViewSource.close();
            InventoryInstance.waitLoading();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkPaneheaderContains(testData.editSharedRecordText);
            QuickMarcEditor.checkContentByTag(testData.tag100, testData.tag100UpdatedContent);
            QuickMarcEditor.checkContentByTag(testData.tag600, testData.tag600UpdatedContent);
            QuickMarcEditor.checkTagAbsent(testData.tag650);
            QuickMarcEditor.checkContentByTag(testData.tag710, testData.tag710Content);
            QuickMarcEditor.closeUsingCrossButton();
            InventoryInstance.waitLoading();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseSubjects.select();
            BrowseSubjects.waitForSubjectToAppear(testData.expectedSubjectName);
            BrowseSubjects.browse(testData.expectedSubjectName);
            BrowseSubjects.checkValueIsBold(testData.expectedSubjectName);
            BrowseSubjects.waitForSubjectToAppear(testData.notExpectedSubjectName, false);
            BrowseSubjects.browse(testData.notExpectedSubjectName);
            BrowseSubjects.verifyNonExistentSearchResult(testData.notExpectedSubjectName);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.checkInstanceTitle(testData.title);
            testData.expectedContributorNames.forEach((contributorName) => {
              InventoryInstance.checkContributor(contributorName);
            });
            InventoryInstance.checkPresentedText(testData.notExpectedContributorName, false);
            InventoryInstance.verifySubjectHeading(testData.expectedSubjectName);
            InventoryInstance.checkPresentedText(testData.notExpectedSubjectName, false);

            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.sharedBibSourcePaheheaderText);
            InventoryViewSource.verifyFieldInMARCBibSource(
              testData.tag100,
              testData.tag100UpdatedContent,
            );
            InventoryViewSource.verifyFieldInMARCBibSource(
              testData.tag600,
              testData.tag600UpdatedContent,
            );
            InventoryViewSource.verifyFieldInMARCBibSource(testData.tag710, testData.tag710Content);
            InventoryViewSource.verifyAbsenceOfValue(`${testData.tag650}\t`);
            InventoryViewSource.close();
            InventoryInstance.waitLoading();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseContributors.select();
            BrowseContributors.waitForContributorToAppear(testData.expectedContributorNames[0]);
            BrowseContributors.browse(testData.expectedContributorNames[0]);
            BrowseSubjects.checkValueIsBold(testData.expectedContributorNames[0]);
            BrowseContributors.waitForContributorToAppear(testData.expectedContributorNames[2]);
            BrowseContributors.browse(testData.expectedContributorNames[2]);
            BrowseSubjects.checkValueIsBold(testData.expectedContributorNames[2]);
          },
        );
      });
    });
  });
});
