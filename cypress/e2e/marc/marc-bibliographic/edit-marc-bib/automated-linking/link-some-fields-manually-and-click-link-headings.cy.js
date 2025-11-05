import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

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
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388504.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 4,
            propertyName: 'authority',
          },
        ];

        const linkingTagAndValues = [
          {
            rowIndex: 16,
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
            rowIndex: 31,
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
          29,
          '650',
          '\\',
          '0',
          '$a Authors, Jamaican $y 21st century $v Biography. $0 sh85009933C388504',
        ];

        const fieldAfterUpdate = [
          29,
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
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C388504*');

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordsIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.getAdminToken();
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.waitForAuthRefresh(() => {
              cy.login(userData.username, userData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.reload();
              InventoryInstances.waitContentLoading();
            }, 20_000);
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
          { tags: ['extendedPath', 'spitfire', 'C388504'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordsIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

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
              `${marcAuthIcon}\nC388504 Authors, Jamaican`,
            );
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              'Subject',
              `${marcAuthIcon}\nC388504 Normal authors`,
            );
          },
        );
      });
    });
  });
});
