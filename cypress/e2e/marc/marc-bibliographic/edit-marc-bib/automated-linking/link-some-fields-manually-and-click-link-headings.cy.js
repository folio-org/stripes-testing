import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};
        const marcAuthIcon = 'Linked to MARC authority';

        const marcFiles = [
          {
            marc: 'marcBibFileForC388504.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numOfRecords: 1,
          },
          {
            marc: 'marcAuthFileForC388504.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 4,
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 17,
            value: 'C388504 Chin, Staceyann, 1972-',
            tag: 100,
            defaultSearchOption: 'personalNameTitle',
            searchQuery: 'C388504 Chin, Staceyann, 1972-',
            searchOption: 'Personal name',
            boxSecond: '1',
            boxThird: '\\',
            boxFourth: '$a C388504 Chin, Staceyann, $d 1972-',
            boxFifth: '$e author.',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n2008052404C388504',
            boxSeventh: '',
            linkHeadingsEnabledOrDisabled: () => {
              return QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            },
          },
          {
            rowIndex: 32,
            value: 'sh 99014708C388504',
            tag: 650,
            defaultSearchOption: 'advancedSearch',
            searchQuery:
              'keyword exactPhrase C388504 Normal activists or identifiers.value exactPhrase sh 96007532C388504',
            searchOption: 'Identifier (all)',
            boxSecond: '\\',
            boxThird: '0',
            boxFourth: '$a C388504 Normal authors',
            boxFifth: '$z Jamaica $v Biography.',
            boxSixth: '$0 http://id.loc.gov/authorities/subjects/sh99014708C388504',
            boxSeventh: '',
            linkHeadingsEnabledOrDisabled: () => {
              return QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            },
          },
        ];

        const fieldToUpdate = [
          30,
          '650',
          '\\',
          '0',
          '$a Authors, Jamaican $y 21st century $v Biography. $0 sh85009933C388504',
        ];

        const fieldAfterUpdate = [
          30,
          '650',
          '\\',
          '0',
          '$a C388504 Authors, Jamaican',
          '$y 21st century $v Biography.',
          '$0 http://id.loc.gov/authorities/subjects/sh85009933C388504',
          '',
        ];

        const createdRecordsIDs = [];

        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];

        before('Creating user and data', () => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

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
                    createdRecordsIDs.push(link.split('/')[5]);
                  });
                }
              });
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdRecordsIDs[0]);
          createdRecordsIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C388504 Link some fields manually >> click on "Link headings" button when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            linkingTagAndValues.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
              MarcAuthoritiesSearch.verifyFiltersState(
                linking.defaultSearchOption,
                linking.searchQuery,
                'Browse',
              );
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResultsWithOption(linking.searchOption, linking.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
              QuickMarcEditor.verifyTagFieldAfterLinking(
                linking.rowIndex,
                `${linking.tag}`,
                linking.boxSecond,
                linking.boxThird,
                linking.boxFourth,
                linking.boxFifth,
                linking.boxSixth,
                linking.boxSeventh,
              );
              linking.linkHeadingsEnabledOrDisabled();
            });
            QuickMarcEditor.updateExistingFieldContent(fieldToUpdate[0], fieldToUpdate[4]);
            QuickMarcEditor.verifyTagFieldAfterUnlinking(...fieldToUpdate);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout('Field 650 has been linked to MARC authority record(s).');
            QuickMarcEditor.verifyTagFieldAfterLinking(...fieldAfterUpdate);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              'Contributor',
              `${marcAuthIcon}\n${linkingTagAndValues[0].value}`,
            );
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              'Subject',
              `${marcAuthIcon}\nC388504 Authors, Jamaican--21st century--Biography`,
            );
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              'Subject',
              `${marcAuthIcon}\nC388504 Normal authors--Jamaica--Biography`,
            );
          },
        );
      });
    });
  });
});
