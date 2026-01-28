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
          fieldName: {
            fifthBox: (rowIndex) => {
              return `records[${rowIndex}].subfieldGroups.uncontrolledAlpha`;
            },
            seventhBox: (rowIndex) => {
              return `records[${rowIndex}].subfieldGroups.uncontrolledNumber`;
            },
          },
          errorCalloutMessage:
            'A subfield(s) cannot be updated because it is controlled by an authority heading.',
        };

        const newFields = [
          {
            rowIndex: 5,
            tag: '100',
            content: '$a test123',
            boxFourth: '$a C380745 Jackson, Peter, $d 1950-2022 $c Inspector Banks series ;',
            boxFifth: '',
            boxSixth: '$0 3052044',
            boxSeventh: '',
            searchOption: 'Personal name',
            marcValue: 'C380745 Jackson, Peter, 1950-2022 Inspector Banks series',
          },
          {
            rowIndex: 6,
            tag: '611',
            content: '$a test123',
            boxFourth: '$a C380745 Mostly Chopin Festival. $e Orchestra $t sonet',
            boxFifth: '',
            boxSixth: '$0 997404',
            boxSeventh: '',
            searchOption: 'Name-title',
            marcValue: 'C380745 Mostly Chopin Festival. sonet',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC380745.mrc',
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380745*');

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
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id);
          });
        });

        it(
          'C422132 Add controllable subfields to a linked field when creating "MARC Bibliographic" record (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire', 'C422132'] },
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

            QuickMarcEditor.fillEmptyTextAreaOfField(5, testData.fieldName.fifthBox(5), '$a test');
            QuickMarcEditor.fillEmptyTextAreaOfField(
              5,
              testData.fieldName.seventhBox(5),
              '$b test',
            );
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(5, testData.errorCalloutMessage);

            QuickMarcEditor.fillEmptyTextAreaOfField(5, testData.fieldName.fifthBox(5), '');
            QuickMarcEditor.fillEmptyTextAreaOfField(5, testData.fieldName.seventhBox(5), '');
            QuickMarcEditor.fillEmptyTextAreaOfField(6, testData.fieldName.fifthBox(6), '$c test');
            QuickMarcEditor.fillEmptyTextAreaOfField(
              6,
              testData.fieldName.seventhBox(6),
              '$f test',
            );
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessage(6, testData.errorCalloutMessage);
          },
        );
      });
    });
  });
});
