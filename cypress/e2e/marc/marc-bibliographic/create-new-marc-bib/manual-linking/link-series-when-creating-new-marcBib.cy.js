import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'Important book',
          },
          marcAuthIcon: 'Linked to MARC authority',
          accordion: 'Title data',
        };

        const newFields = [
          {
            rowIndex: 5,
            tag: '800',
            content: '$t testT $0 123 $dtestD  $a testA $0 971256422129',
            boxFourth: '$a C422129 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
            boxFifth: '',
            boxSixth: '$0 3052044422129',
            boxSeventh: '',
            searchOption: 'Personal name',
            marcValue: 'C422129 Jackson, Peter, 1950-2022 Inspector Banks series ;',
            markedValue: 'C422129 Kerouac, Jack,',
            valueAfterSave: 'C422129 Jackson, Peter, 1950-2022 Inspector Banks series',
          },
          {
            rowIndex: 6,
            tag: '810',
            content: '$a test123',
            boxFourth:
              '$a C422129 John Bartholomew and Son. $t Bartholomew world travel series $d 1995 $l English',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n84704570422129',
            boxSeventh: '',
            searchOption: 'Name-title',
            marcValue:
              'C422129 John Bartholomew and Son. Bartholomew world travel series 1995 English',
            valueAfterSave:
              'C422129 John Bartholomew and Son. Bartholomew world travel series 1995 English',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC422129.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 3,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422129');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record[marcFile.propertyName].id);
                });
              });
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422129');
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[3]);
        });

        it(
          'C740235 Link "Series" fields when creating "MARC Bibliographic" record (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C740235'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(4, newFields[0].tag, `$a ${newFields[0].content}`);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(5);
            MarcAuthority.addNewField(5, newFields[1].tag, `$a ${newFields[1].content}`);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(6);

            InventoryInstance.verifyAndClickLinkIcon(newFields[0].tag);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            MarcAuthorities.checkSearchInput(
              'keyword exactPhrase testA estD testT or identifiers.value exactPhrase 123 or identifiers.value exactPhrase 971256422129',
            );
            MarcAuthorities.verifyEmptyAuthorityField();
            MarcAuthorities.checkRecordDetailPageMarkedValue(newFields[0].markedValue);
            MarcAuthorities.switchToBrowse();
            MarcAuthorities.verifyDisabledSearchButton();
            MarcAuthorityBrowse.checkSearchOptions();
            MarcAuthorityBrowse.searchBy(newFields[0].searchOption, newFields[0].marcValue);
            MarcAuthorities.checkRow(newFields[0].marcValue);
            MarcAuthorities.selectTitle(newFields[0].marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFields[0].tag,
              newFields[0].rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              newFields[0].rowIndex,
              newFields[0].tag,
              '\\',
              '\\',
              `${newFields[0].boxFourth}`,
              `${newFields[0].boxFifth}`,
              `${newFields[0].boxSixth}`,
              `${newFields[0].boxSeventh}`,
            );

            InventoryInstance.verifyAndClickLinkIcon(newFields[1].tag);
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.switchToSearch();
            MarcAuthorities.searchBy(newFields[1].searchOption, newFields[1].marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              newFields[1].tag,
              newFields[1].rowIndex,
            );
            QuickMarcEditor.verifyTagFieldAfterLinking(
              newFields[1].rowIndex,
              newFields[1].tag,
              '\\',
              '\\',
              `${newFields[1].boxFourth}`,
              `${newFields[1].boxFifth}`,
              `${newFields[1].boxSixth}`,
              `${newFields[1].boxSeventh}`,
            );
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(4000);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.accordion,
              `${testData.marcAuthIcon}\n${newFields[0].valueAfterSave}`,
            );
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.accordion,
              `${testData.marcAuthIcon}\n${newFields[1].valueAfterSave}`,
            );
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
            });

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(5);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(6);
            newFields.forEach((newField) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(
                newField.rowIndex,
                newField.tag,
                '\\',
                '\\',
                `${newField.boxFourth}`,
                `${newField.boxFifth}`,
                `${newField.boxSixth}`,
                `${newField.boxSeventh}`,
              );
            });

            QuickMarcEditor.closeEditorPane();
            InventoryInstance.viewSource();
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t${newFields[0].tag}\t   \t$a C422129 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ; $0 3052044422129 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t${newFields[1].tag}\t   \t$a C422129 John Bartholomew and Son. $t Bartholomew world travel series $d 1995 $l English $0 http://id.loc.gov/authorities/names/n84704570422129 $9`,
            );

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.searchByParameter(newFields[1].searchOption, newFields[1].marcValue);
            MarcAuthorities.checkRow(newFields[1].marcValue);
            MarcAuthorities.verifyNumberOfTitles(5, '1');
            MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
            InventorySearchAndFilter.verifySearchResult(testData.fieldContents.tag245Content);
            InventoryInstance.checkPresentedText(testData.fieldContents.tag245Content);
          },
        );
      });
    });
  });
});
