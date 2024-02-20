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
            tagLDR: 'LDR',
          },
          fieldContents: {
            tag245Content: 'The Book of books',
            tagLDRContent: '00000naa\\a2200000uu\\4500',
          },
          errorMessage:
            'You have selected an invalid heading based on the bibliographic field you want controlled. Please revise your selection.',
        };

        const newFields = [
          {
            rowIndex: 4,
            tag: '100',
            content: '$a test123',
            marcValue:
              'C380730 John Bartholomew and Son. Bartholomew world travel series 1995 English',
            searchOption: 'Name-title',
          },
          {
            rowIndex: 5,
            tag: '240',
            content: '$a test123',
            marcValue: 'C380730 Jackson, Peter, 1950-2022 Inspector Banks series ;',
            searchOption: 'Personal name',
          },
        ];

        let userData = {};

        const marcFiles = [
          {
            marc: 'marcAuthFileForC380730.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 2,
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        const createdAuthorityIDs = [];

        before('Create user and data', () => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

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

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          for (let i = 0; i < 2; i++) {
            MarcAuthority.deleteViaAPI(createdAuthorityIDs[i]);
          }
        });

        it(
          'C422130 "$t" validation when linking "MARC Bibliographic" record\'s fields upon record creation (spitfire) (TaaS)',
          { tags: ['criticalPath', 'spitfire'] },
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

            newFields.forEach((field) => {
              InventoryInstance.verifyAndClickLinkIcon(field.tag);
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorityBrowse.checkSearchOptions();
              MarcAuthorities.clickReset();
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              MarcAuthorities.searchByParameter(field.searchOption, field.marcValue);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.checkCallout(testData.errorMessage);
              // wait for error message to appear
              cy.wait(1000);
              InventoryInstance.closeFindAuthorityModal();
            });
          },
        );
      });
    });
  });
});
