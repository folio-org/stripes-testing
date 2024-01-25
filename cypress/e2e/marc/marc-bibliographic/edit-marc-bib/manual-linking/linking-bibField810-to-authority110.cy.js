import { Permissions } from '../../../../../support/dictionary';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag810: '810',
          authorityMarkedValue: 'C375085 John Bartholomew and Son.',
          seriesStatementValue:
            'C375085 John Bartholomew and Son. Bartholomew world travel series English 1995 810 map',
          authorityIconText: 'Linked to MARC authority',
          accordion: 'Title data',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC375085.mrc',
            fileName: `testMarcBibFileC375071.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          },
          {
            marc: 'marcAuthFileForC375085.mrc',
            fileName: `testMarcAuthFileC375071.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            authorityHeading: 'C375085 John Bartholomew and Son.',
          },
        ];

        const createdRecordIDs = [];
        const bib810InitialFieldValues = [
          25,
          testData.tag810,
          '2',
          '\\',
          '$a C375085 J. Bartholomew & Son. $t  world travel ser-s. $x 810 $e map',
        ];
        const bib810UnlinkedFieldValues = [
          25,
          testData.tag810,
          '2',
          '\\',
          '$a C375085 John Bartholomew and Son. $t Bartholomew world travel series $l English $d 1995 $x 810 $e map $0 id.loc.gov/authorities/names/n84704570',
        ];
        const bib810LinkedFieldValues = [
          25,
          testData.tag810,
          '2',
          '\\',
          '$a C375085 John Bartholomew and Son. $t Bartholomew world travel series $l English $d 1995',
          '$x 810 $e map',
          '$0 id.loc.gov/authorities/names/n84704570',
          '',
        ];

        before('Creating user', () => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.loginAsAdmin().then(() => {
              marcFiles.forEach((marcFile) => {
                cy.visit(TopMenu.dataImportPath);
                DataImport.verifyUploadState();
                DataImport.uploadFile(marcFile.marc, marcFile.fileName);
                JobProfiles.waitLoadingList();
                JobProfiles.search(marcFile.jobProfileToRun);
                JobProfiles.runImportFile();
                Logs.waitFileIsImported(marcFile.fileName);
                Logs.checkStatusOfJobProfile('Completed');
                Logs.openFileDetails(marcFile.fileName);
                Logs.getCreatedItemsID().then((link) => {
                  createdRecordIDs.push(link.split('/')[5]);
                });
              });
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C375085 Link the "810" of "MARC Bib" field with "110" field of "MARC Authority" record. (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib810InitialFieldValues);
            InventoryInstance.verifyAndClickLinkIcon(testData.tag810);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResults(marcFiles[1].authorityHeading);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag810);
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib810LinkedFieldValues);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifySeriesStatement(
              0,
              `${testData.authorityIconText}${testData.seriesStatementValue}`,
            );
            InventoryInstance.checkExistanceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.clickViewAuthorityIconDisplayedInInstanceDetailsPane(
              testData.accordion,
            );
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryInstance.waitLoading();
            InventoryInstance.viewSource();
            InventoryInstance.checkExistanceOfAuthorityIconInMarcViewPane();
            InventoryInstance.clickViewAuthorityIconDisplayedInMarcViewPane();
            MarcAuthorities.checkDetailViewIncludesText(testData.authorityMarkedValue);
            InventoryInstance.goToPreviousPage();
            // Wait for the content to be loaded.
            cy.wait(6000);
            InventoryViewSource.waitLoading();
            InventoryViewSource.close();
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyTagFieldAfterLinking(...bib810LinkedFieldValues);
            QuickMarcEditor.clickUnlinkIconInTagField(bib810UnlinkedFieldValues[0]);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...bib810UnlinkedFieldValues);
            QuickMarcEditor.verifyIconsAfterUnlinking(bib810UnlinkedFieldValues[0]);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkAbsenceOfAuthorityIconInInstanceDetailPane(testData.accordion);
            InventoryInstance.viewSource();
            InventoryInstance.checkAbsenceOfAuthorityIconInMarcViewPane();
          },
        );
      });
    });
  });
});
