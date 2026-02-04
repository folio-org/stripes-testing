import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
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
            tag245Content: 'Important book',
          },
          marcAuthIcon: 'Linked to MARC authority',
          accordion: 'Subject',
          searchOption: 'Keyword',
          fieldName: {
            fifthBox: (rowIndex) => {
              return `records[${rowIndex}].subfieldGroups.uncontrolledAlpha`;
            },
            seventhBox: (rowIndex) => {
              return `records[${rowIndex}].subfieldGroups.uncontrolledNumber`;
            },
          },
          successMessage:
            'This record has successfully saved and is in process. Changes may not appear immediately.',
        };

        const newFields = [
          {
            rowIndex: 5,
            tag: '240',
            content: '$a test123',
            boxFourth: '$a Hosanna Bible',
            boxFourthUpdate: '$a Hosanna Bible',
            boxFifth: '',
            boxFifthUpdate: '$d test',
            boxFifthAfterSave: '$d test',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n99036055',
            boxSeventh: '',
            boxSeventhUpdate: '$1 test',
            boxSeventhAfterSave: '$1 test',
            marcValue: 'C380747 Abraham, Angela, 1958- Hosanna Bible',
          },
          {
            rowIndex: 6,
            tag: '730',
            content: '$a test123',
            boxFourth:
              '$a C380747 Edinburgh tracts in mathematics and mathematical physics $l english',
            boxFourthUpdate:
              '$a C380747 Edinburgh tracts in mathematics and mathematical physics $l english',
            boxFifth: '',
            boxFifthUpdate: '',
            boxFifthAfterSave: '',
            boxSixth: '$0 http://id.loc.gov/authorities/names/n84801249',
            boxSeventh: '',
            boxSeventhUpdate: '$2 ppt3',
            boxSeventhAfterSave: '$2 ppt3',
            marcValue:
              'C380747 Edinburgh tracts in mathematics and mathematical physics no. 19. english England',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC380747.mrc',
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380747');

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
          for (let i = 0; i < 2; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i], true);
          }
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[2]);
        });

        it(
          'C422133 Add non-controllable subfields to a linked field when creating "MARC Bibliographic" record (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C422133'] },
          () => {
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(4, newFields[0].tag, `$a ${newFields[0].content}`);
            cy.wait(500);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(5);
            MarcAuthority.addNewField(5, newFields[1].tag, `$a ${newFields[1].content}`);
            cy.wait(500);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(6);

            newFields.forEach((newField) => {
              QuickMarcEditor.clickLinkIconInTagField(newField.rowIndex);
              MarcAuthorityBrowse.checkSearchOptions();
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.searchByParameter(testData.searchOption, newField.marcValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(newField.rowIndex);
              QuickMarcEditor.verifyTagFieldAfterLinking(
                newField.rowIndex,
                newField.tag,
                '\\',
                '\\',
                `${newField.boxFourthUpdate}`,
                `${newField.boxFifth}`,
                `${newField.boxSixth}`,
                `${newField.boxSeventh}`,
              );
            });

            QuickMarcEditor.fillEmptyTextAreaOfField(
              6,
              testData.fieldName.seventhBox(6),
              newFields[1].boxSeventhUpdate,
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              5,
              testData.fieldName.fifthBox(5),
              newFields[0].boxFifthUpdate,
            );
            QuickMarcEditor.fillEmptyTextAreaOfField(
              5,
              testData.fieldName.seventhBox(5),
              newFields[0].boxSeventhUpdate,
            );
            cy.wait(500);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1500);
            QuickMarcEditor.checkCallout(testData.successMessage);
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);
              newFields.forEach((newField) => {
                QuickMarcEditor.verifyTagFieldAfterLinking(
                  newField.rowIndex,
                  newField.tag,
                  '\\',
                  '\\',
                  `${newField.boxFourthUpdate}`,
                  `${newField.boxFifthAfterSave}`,
                  `${newField.boxSixth}`,
                  `${newField.boxSeventhAfterSave}`,
                );
              });
            });
          },
        );
      });
    });
  });
});
