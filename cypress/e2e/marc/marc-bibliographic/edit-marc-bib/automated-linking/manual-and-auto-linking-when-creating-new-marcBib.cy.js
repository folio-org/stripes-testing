import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        const testData = {
          tags: {
            tag245: '245',
            tagLDR: 'LDR',
          },
          fieldContents: {
            tag245Content: 'New title C388565',
            tagLDRContent: '00000nca\\a2200000uu\\4500',
          },
          naturalIds: {
            tag100: '0255861',
            tag240: 'n99036055',
            tag600: 'n93094741',
            tag711: 'n79084162',
          },
          searchOptions: {
            identifierAll: 'Identifier (all)',
          },
          marcValue: 'C422149Radio "Vaticana". Hrvatski program',
        };

        const newFields = [
          {
            rowIndex: 4,
            tag: '100',
            content: '',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$0 n99036088',
          },
          {
            rowIndex: 6,
            tag: '610',
            content: '$0 n93094741',
          },
          {
            rowIndex: 7,
            tag: '711',
            content: '$0 n79084162',
          },
          {
            rowIndex: 8,
            tag: '830',
            content: '',
          },
        ];

        let userData = {};

        const linkableFields = [100, 240, 610, 711, 830];

        const marcFiles = [
          {
            marc: 'marcAuthFileForC422149_1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 5,
            propertyName: 'relatedAuthorityInfo',
          },
          {
            marc: 'marcAuthFileForC422149_2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 3,
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                createdAuthorityIDs.push(record[marcFile.propertyName].idList[0]);
              });
            });
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          for (let i = 0; i < 8; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
          }
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[8]);
        });

        it(
          'C422149 Link certain fields manually and then use auto-linking when creating new "MARC Bib" record (spitfire)',
          { tags: ['smoke', 'spitfire'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateExistingField(
              testData.tags.tagLDR,
              testData.fieldContents.tagLDRContent,
            );
            newFields.forEach((newField) => {
              MarcAuthority.addNewField(newField.rowIndex, newField.tag, newField.content);
            });

            QuickMarcEditor.clickLinkIconInTagField(newFields[0].rowIndex + 1);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResultsWithOption(
              testData.searchOptions.identifierAll,
              testData.naturalIds.tag100,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFields[0].tag,
              newFields[0].rowIndex + 1,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              '100',
              '\\',
              '\\',
              '$a C422149Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
              '',
              '$0 3052044',
              '',
            );
            QuickMarcEditor.clickLinkIconInTagField(newFields[1].rowIndex + 1);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResultsWithOption(
              testData.searchOptions.identifierAll,
              testData.naturalIds.tag240,
            );
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFields[1].tag,
              newFields[1].rowIndex + 1,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              6,
              '240',
              '\\',
              '\\',
              '$a Hosanna Bible',
              '',
              '$0 http://id.loc.gov/authorities/names/n99036055',
              '',
            );
            cy.getAdminToken();
            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });
            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.verifyTagWithNaturalIdExistance(
              newFields[2].rowIndex + 1,
              newFields[2].tag,
              testData.naturalIds.tag600,
            );
            QuickMarcEditor.verifyTagWithNaturalIdExistance(
              newFields[3].rowIndex + 1,
              newFields[3].tag,
              testData.naturalIds.tag711,
            );
            QuickMarcEditor.checkCallout(
              'Field 610 and 711 has been linked to MARC authority record(s).',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              5,
              '100',
              '\\',
              '\\',
              '$a C422149Jackson, Peter, $c Inspector Banks series ; $d 1950-2022',
              '',
              '$0 3052044',
              '',
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              6,
              '240',
              '\\',
              '\\',
              '$a Hosanna Bible',
              '',
              '$0 http://id.loc.gov/authorities/names/n99036055',
              '',
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseSubjects.select();
            BrowseSubjects.browse(testData.marcValue);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(testData.marcValue);
            InventorySearchAndFilter.selectFoundItemFromBrowseResultList(testData.marcValue);
            InventorySearchAndFilter.verifyInstanceDisplayed(testData.fieldContents.tag245Content);
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });
            cy.wait(1000);
            InventoryInstance.viewSource();
            InventoryViewSource.contains('Linked to MARC authority\n\t100');
            InventoryViewSource.contains('Linked to MARC authority\n\t240');
            InventoryViewSource.contains('Linked to MARC authority\n\t610');
            InventoryViewSource.contains('Linked to MARC authority\n\t711');
          },
        );
      });
    });
  });
});
