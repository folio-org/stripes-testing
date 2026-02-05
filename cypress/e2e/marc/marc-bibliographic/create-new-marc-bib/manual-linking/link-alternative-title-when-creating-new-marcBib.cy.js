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
            tag245Content: 'Secret archives',
          },
          marcAuthIcon: 'Linked to MARC authority',
          accordion: 'Title data',
        };

        const newFields = [
          {
            rowIndex: 5,
            tag: '130',
            content: '',
            boxFourth:
              '$a C422127 Edinburgh tracts in mathematics and mathematical physics $l english',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n84801249422127',
            boxSeventh: '',
            searchOption: 'Uniform title',
            marcValue:
              'C422127 Edinburgh tracts in mathematics and mathematical physics no. 19. english England',
            valueAfterSave:
              'C422127 Edinburgh tracts in mathematics and mathematical physics english',
          },
          {
            rowIndex: 6,
            tag: '240',
            content: '$9 test123',
            boxFourth: '$a C422127 Hosanna Bible',
            boxFifth: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n99036055422127',
            boxSeventh: '',
            searchOption: 'Name-title',
            marcValue: 'C422127 Abraham, Angela, 1958- C422127 Hosanna Bible',
            valueAfterSave: 'C422127 Hosanna Bible',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC422127.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 3,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422127');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.getAdminToken();
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380727');
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
        });

        it(
          'C422127 Link "Alternative title" fields when creating "MARC Bibliographic" record (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C422127'] },
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
              InventoryInstance.verifyAndClickLinkIcon(newField.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorityBrowse.checkSearchOptions();
              MarcAuthorityBrowse.searchBy(newField.searchOption, newField.marcValue);
              cy.wait(1000);
              MarcAuthorities.checkRow(newField.marcValue);
              cy.wait(1000);
              MarcAuthorities.selectTitle(newField.marcValue);
              cy.wait(2000);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(newField.tag, newField.rowIndex);
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
            cy.wait(1500);
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
              `${testData.marcAuthIcon}\n\t${newFields[0].tag}\t   \t$a C422127 Edinburgh tracts in mathematics and mathematical physics $l english $0 http://id.loc.gov/authorities/names/n84801249422127 $9`,
            );
            InventoryViewSource.contains(
              `${testData.marcAuthIcon}\n\t${newFields[1].tag}\t   \t$a C422127 Hosanna Bible $0 http://id.loc.gov/authorities/names/n99036055422127 $9`,
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
