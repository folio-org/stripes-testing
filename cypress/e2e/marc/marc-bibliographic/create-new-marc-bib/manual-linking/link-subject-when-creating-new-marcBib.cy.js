import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import BrowseSubjects from '../../../../../support/fragments/inventory/search/browseSubjects';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tags: {
            tag245: '245',
          },
          fieldContents: {
            tag245Content: 'The most important book',
          },
          marcAuthIcon: 'Linked to MARC authority',
          accordion: 'Subject',
        };

        const newFields = [
          {
            rowIndex: 5,
            tag: '600',
            content: '$e test123',
            boxFourth: '$a C422128 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
            boxFifth: '$e test123',
            boxSixth: '$0 3052044422128',
            boxSeventh: '',
            searchOption: 'Personal name',
            marcValue: 'C422128 Jackson, Peter, 1950-2022',
            valueAfterSave: 'C422128 Jackson, Peter, 1950-2022 Inspector Banks series ; test123',
          },
          {
            rowIndex: 6,
            tag: '611',
            content: '$4 test123',
            boxFourth: '$a C422128 Mostly Chopin Festival. $e Orchestra $t sonet',
            boxFifth: '',
            boxSixth: '$0 997404422128',
            boxSeventh: '$4 test123',
            searchOption: 'Name-title',
            marcValue: 'C422128 Mostly Chopin Festival. sonet',
            valueAfterSave: 'C422128 Mostly Chopin Festival. Orchestra sonet',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC422128.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 2,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422128');

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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422128');
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
        });

        it(
          'C422128 Link "Subject" fields when creating "MARC Bibliographic" record (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C422128'] },
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

            newFields.forEach((newField) => {
              QuickMarcEditor.clickLinkIconInTagField(newField.rowIndex);
              MarcAuthorities.verifyDisabledSearchButton();
              MarcAuthorityBrowse.checkSearchOptions();
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.searchByParameter(newField.searchOption, newField.marcValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(newField.rowIndex);
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
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(2500);
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
              `${testData.marcAuthIcon}\n\t${newFields[0].tag}\t   \t$a C422128 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ; $e test123 $0 3052044422128 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t${newFields[1].tag}\t   \t$a C422128 Mostly Chopin Festival. $e Orchestra $t sonet $0 997404422128 $9`,
            );
            QuickMarcEditor.closeEditorPane();

            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.verifyKeywordsAsDefault();
            BrowseSubjects.select();
            BrowseSubjects.waitForSubjectToAppear(newFields[0].valueAfterSave, true, true);
            BrowseSubjects.browse(newFields[0].valueAfterSave);
            BrowseSubjects.checkRowWithValueAndAuthorityIconExists(newFields[0].valueAfterSave);
          },
        );
      });
    });
  });
});
