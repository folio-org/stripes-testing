import Permissions from '../../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../../support/dictionary/affiliations';
import Users from '../../../../../../support/fragments/users/users';
import TopMenu from '../../../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../../../support/utils/stringTools';
import InventoryInstance from '../../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../../support/fragments/data_import/dataImport';
import { JOB_STATUS_NAMES } from '../../../../../../support/constants';
import JobProfiles from '../../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../../support/fragments/data_import/logs/logs';
import QuickMarcEditor from '../../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MarcAuthority from '../../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseContributors from '../../../../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../../../../support/fragments/inventory/search/browseSubjects';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          instanceTitle: 'C405559 Instance Shared Central',
          authoritySearchOption: 'Keyword',
        };

        const linkingTagAndValues = {
          authorityHeading: 'C405559 Lentz Shared',
          rowIndex: 16,
          tag: '100',
          secondBox: '1',
          thirdBox: '\\',
          content: '$a C405559 Lentz Shared',
          eSubfield: '',
          zeroSubfield: '$0 http://id.loc.gov/authorities/names/n2011049161405559',
          seventhBox: '',
        };

        const users = {};

        const marcFilesForCentral = [
          {
            marc: 'marcBibFileForC405559_1.mrc',
            fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          },
          {
            marc: 'marcAuthFileForC405559.mrc',
            fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
          },
        ];

        const marcFilesForMember = [
          {
            marc: 'marcBibFileForC405559_2.mrc',
            fileNameImported: `testMarcFileC397343.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          },
        ];

        const createdRecordIDs = [];

        before('Create users, data', () => {
          cy.getAdminToken();

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
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
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]);
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(users.userProperties.userId, [
                Permissions.inventoryAll.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              ]);
            })
            .then(() => {
              cy.resetTenant();
              cy.loginAsAdmin().then(() => {
                marcFilesForCentral.forEach((marcFile) => {
                  cy.visit(TopMenu.dataImportPath);
                  DataImport.verifyUploadState();
                  DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileNameImported);
                  JobProfiles.waitLoadingList();
                  JobProfiles.search(marcFile.jobProfileToRun);
                  JobProfiles.runImportFile();
                  Logs.waitFileIsImported(marcFile.fileNameImported);
                  Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
                  Logs.openFileDetails(marcFile.fileNameImported);
                  Logs.getCreatedItemsID().then((link) => {
                    createdRecordIDs.push(link.split('/')[5]);
                  });
                });
              });

              cy.visit(TopMenu.inventoryPath).then(() => {
                InventoryInstances.waitContentLoading();
                InventoryInstances.searchByTitle(createdRecordIDs[0]);
                InventoryInstances.selectInstance();
                InventoryInstance.editMarcBibliographicRecord();
                QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
                MarcAuthorities.switchToSearch();
                InventoryInstance.verifySelectMarcAuthorityModal();
                InventoryInstance.verifySearchOptions();
                InventoryInstance.searchResults(linkingTagAndValues.authorityHeading);
                InventoryInstance.clickLinkButton();
                QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                  linkingTagAndValues.tag,
                  linkingTagAndValues.rowIndex,
                );
                QuickMarcEditor.pressSaveAndClose();
                QuickMarcEditor.checkAfterSaveAndClose();
              });

              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
              InventoryInstances.waitContentLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
              marcFilesForMember.forEach((marcFile) => {
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

              cy.login(users.userProperties.username, users.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              }).then(() => {
                ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
                InventoryInstances.waitContentLoading();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
              });
            });
        });

        after('Delete users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(users.userProperties.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
          MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
          cy.resetTenant();
          cy.setTenant(Affiliations.University);
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[2]);
        });

        it(
          'C405559 Link Local MARC bib with Shared MARC Authority in Member tenant (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[2]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(linkingTagAndValues.authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              linkingTagAndValues.tag,
              linkingTagAndValues.rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues.rowIndex,
              linkingTagAndValues.tag,
              linkingTagAndValues.secondBox,
              linkingTagAndValues.thirdBox,
              linkingTagAndValues.content,
              linkingTagAndValues.eSubfield,
              linkingTagAndValues.zeroSubfield,
              linkingTagAndValues.seventhBox,
            );
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.openLinkingAuthorityByIndex(16);
            MarcAuthorities.checkFieldAndContentExistence(
              linkingTagAndValues.tag,
              linkingTagAndValues.authorityHeading,
            );
            cy.go('back');
            QuickMarcEditor.closeEditorPane();

            InventoryInstance.verifyRecordAndMarcAuthIcon(
              'Contributor',
              `Linked to MARC authority\n${linkingTagAndValues.authorityHeading}`,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              linkingTagAndValues.rowIndex,
              linkingTagAndValues.tag,
              linkingTagAndValues.secondBox,
              linkingTagAndValues.thirdBox,
              linkingTagAndValues.content,
              linkingTagAndValues.eSubfield,
              linkingTagAndValues.zeroSubfield,
              linkingTagAndValues.seventhBox,
            );
            QuickMarcEditor.closeEditorPane();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseContributors.select();
            BrowseContributors.browse(linkingTagAndValues.authorityHeading);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(
              linkingTagAndValues.authorityHeading,
            );
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBy(
              testData.authoritySearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.selectTitle(`Shared\n${linkingTagAndValues.authorityHeading}`);
            MarcAuthorities.checkRecordDetailPageMarkedValue(linkingTagAndValues.authorityHeading);

            cy.visit(TopMenu.inventoryPath);
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBy(
              testData.authoritySearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.selectTitle(`Shared\n${linkingTagAndValues.authorityHeading}`);
            MarcAuthorities.checkRecordDetailPageMarkedValue(linkingTagAndValues.authorityHeading);
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyNumberOfTitles(5, '1');
            MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
            InventoryInstance.verifyInstanceTitle(testData.instanceTitle);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.searchBy(
              testData.authoritySearchOption,
              linkingTagAndValues.authorityHeading,
            );
            MarcAuthorities.selectTitle(`Shared\n${linkingTagAndValues.authorityHeading}`);
            MarcAuthorities.checkRecordDetailPageMarkedValue(linkingTagAndValues.authorityHeading);
            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyNumberOfTitles(5, '1');
            MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
            InventoryInstance.verifyInstanceTitle(testData.instanceTitle);
          },
        );
      });
    });
  });
});
