import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData;
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const createdRecordIDs = [];
        const naturalIds = ['n2008052404', 'sh96007532', 'sh99014708', 'sh85009933'];
        const preLinkedFields = [
          {
            tag: '650',
            value: 'Lesbian authors',
            rowIndex: 31,
            newContent:
              '$a Lesbian authors $z Jamaica $v Biography. $0 id.loc.gov/authorities/subjects/sh96007532',
          },
          {
            tag: '650',
            value: 'Lesbian activists',
            rowIndex: 32,
            newContent: '$a Lesbian activists $0 id.loc.gov/authorities/subjects/sh960075325555',
          },
        ];
        const authority = {
          searchOption: 'Keyword',
          title: 'Lesbian activists--Jamaica--Biography',
        };
        const marcFiles = [
          {
            marc: 'marcBibFileForC388537.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388537-1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388537-2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388537-3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388537-4.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
          },
        ];

        before('Create test data', () => {
          // Making sure there are no duplicate authority records in the system before auto-linking
          cy.getAdminToken().then(() => {
            naturalIds.forEach((id) => {
              MarcAuthorities.getMarcAuthoritiesViaApi({
                limit: 200,
                query: `naturalId="${id}*" and authRefType=="Authorized"`,
              }).then((records) => {
                records.forEach((record) => {
                  MarcAuthority.deleteViaAPI(record.id);
                });
              });
            });
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            linkableFields.forEach((field) => QuickMarcEditor.setRulesForField(field, true));
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
                for (let i = 0; i < marcFile.numOfRecords; i++) {
                  Logs.getCreatedItemsID(i).then((link) => {
                    createdRecordIDs.push(link.split('/')[5]);
                  });
                }
              });
              cy.visit(TopMenu.inventoryPath).then(() => {
                InventoryInstances.searchByTitle(createdRecordIDs[0]);
                InventoryInstances.selectInstance();
                InventoryInstance.editMarcBibliographicRecord();
                preLinkedFields.forEach((field) => {
                  QuickMarcEditor.clickLinkIconInTagField(field.rowIndex);
                  MarcAuthorities.switchToSearch();
                  InventoryInstance.verifySelectMarcAuthorityModal();
                  InventoryInstance.searchResults(field.value);
                  InventoryInstance.clickLinkButton();
                  QuickMarcEditor.verifyAfterLinkingUsingRowIndex(field.tag, field.rowIndex);
                });
                QuickMarcEditor.pressSaveAndClose();
                QuickMarcEditor.checkAfterSaveAndClose();
              });
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(userData.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index === 0) InventoryInstance.deleteInstanceViaApi(id);
              else MarcAuthority.deleteViaAPI(id);
            });
          });
        });

        it(
          'C388537 Edit subfield "$0" in the unlinked fields before clicking on "Link headings" button when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire'] },
          () => {
            // #1 Find and open detail view of "MARC Bib" record from precondition, ex. of search query:
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            // #2 Click on "Actions" button in second pane → Select "Edit MARC bibliographic record" option
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #3-5 Unlink and edit both linked fields from precondition
            preLinkedFields.forEach((field) => {
              QuickMarcEditor.clickUnlinkIconInTagField(field.rowIndex);
              cy.wait(1000);
              QuickMarcEditor.confirmUnlinkingField();
              QuickMarcEditor.verifyRowLinked(field.rowIndex, false);
              QuickMarcEditor.updateExistingFieldContent(field.rowIndex, field.newContent);
            });
            // #6 Click on the "Link headings" button.
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout('Field 650 has been linked to MARC authority record(s).');
            QuickMarcEditor.checkCallout(
              'Field 650 must be set manually by selecting the link icon.',
            );
            QuickMarcEditor.verifyRowLinked(preLinkedFields[0].rowIndex, true);
            QuickMarcEditor.verifyRowLinked(preLinkedFields[1].rowIndex, false);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            // #7 Unlink the linked 650 field with "Lesbian activists" value in "$a" subfield by clicking on the "Unlink from MARC authority record" icon >> confirm unlinking.
            QuickMarcEditor.clickUnlinkIconInTagField(preLinkedFields[0].rowIndex);
            QuickMarcEditor.confirmUnlinkingField();
            QuickMarcEditor.verifyRowLinked(preLinkedFields[0].rowIndex, false);
            QuickMarcEditor.checkContent(
              preLinkedFields[0].newContent,
              preLinkedFields[0].rowNumber,
            );
            // #8 Click on the "Link headings" again.
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(
              preLinkedFields[0].rowIndex,
              preLinkedFields[0].tag,
              '\\',
              '0',
              '$a Lesbian activists',
              '$z Jamaica $v Biography.',
              '$0 id.loc.gov/authorities/subjects/sh96007532',
              '',
            );
            // #9 Click on the "Save & close" button.
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            // #10 Click on the "Browse" toggle >> Select "Subjects" in browse option dropdown >> Enter "Lesbian activists--Jamaica--Biography" value in the search box >> Click on the "Search"  button.
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseSubjects.select();
            BrowseSubjects.browse(authority.title);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(authority.title);
            BrowseSubjects.checkRowWithValueAndNoAuthorityIconExists(authority.title);
            BrowseSubjects.checkRowValueIsBold(5, authority.title);
            BrowseSubjects.checkRowValueIsBold(6, authority.title);
            // #11 Click on any "MARC authority app" icon placed next to auto-linked subject name.
            cy.visit(TopMenu.marcAuthorities);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBy(authority.searchOption, 'Lesbian activists');
            MarcAuthorities.selectTitle('Lesbian activists');
            MarcAuthority.waitLoading();
          },
        );
      });
    });
  });
});
