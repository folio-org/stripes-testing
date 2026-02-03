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
            tag245Content: `AT_C422140_MarcBibInstance_${getRandomPostfix()}`,
          },
          marcAuthIcon: 'Linked to MARC authority',
          accordion: 'Contributor',
        };

        const newFields = {
          rowIndex: 5,
          tag: '100',
          content: 'test123',
          boxFourth: '$a C417050 Chin, Staceyann, $d 1972-',
          boxFifth: '',
          boxSixth: '$0 http://id.loc.gov/authorities/names/n2008417050',
          boxSeventh: '',
          searchOption: 'Personal name',
          marcValue: 'C417050 Chin, Staceyann, 1972-',
        };

        const marcFiles = [
          {
            marc: 'marcAuthFileForC417050.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const createdAuthorityIDs = [];

        before(() => {
          cy.getAdminToken();
          // make sure there are no duplicate authority records in the system
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C417050');

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            testData.userAData = createdUserProperties;

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
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userBData = createdUserProperties;
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userAData.userId);
          Users.deleteViaApi(testData.userBData.userId);
          MarcAuthority.deleteViaAPI(createdAuthorityIDs[0], true);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[1]);
        });

        it(
          'C422140 Create | Verify that created MARC bib with linked field by user without "Edit" permissions can be opened (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C422140'] },
          () => {
            cy.login(testData.userAData.username, testData.userAData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventoryInstances.waitContentLoading();
            InventoryInstance.newMarcBibRecord();
            QuickMarcEditor.updateExistingField(
              testData.tags.tag245,
              `$a ${testData.fieldContents.tag245Content}`,
            );
            QuickMarcEditor.updateLDR06And07Positions();
            MarcAuthority.addNewField(4, newFields.tag, `$a ${newFields.content}`);
            QuickMarcEditor.checkLinkButtonExistByRowIndex(5);

            QuickMarcEditor.clickLinkIconInTagField(newFields.rowIndex);
            MarcAuthorityBrowse.checkSearchOptions();
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            MarcAuthorities.searchByParameter(newFields.searchOption, newFields.marcValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(newFields.rowIndex);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              newFields.rowIndex,
              newFields.tag,
              '\\',
              '\\',
              `${newFields.boxFourth}`,
              `${newFields.boxFifth}`,
              `${newFields.boxSixth}`,
              `${newFields.boxSeventh}`,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.accordion,
              `${testData.marcAuthIcon}\n${newFields.marcValue}`,
            );
            InventoryInstance.getId().then((id) => {
              createdAuthorityIDs.push(id);

              cy.login(testData.userBData.username, testData.userBData.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              cy.waitForAuthRefresh(() => {
                cy.reload();
                InventoryInstances.waitContentLoading();
              });
              InventoryInstances.searchByTitle(createdAuthorityIDs[1]);
              InventoryInstances.selectInstance();
              InventoryInstance.waitInventoryLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.verifyTagFieldAfterLinking(
                newFields.rowIndex,
                newFields.tag,
                '\\',
                '\\',
                `${newFields.boxFourth}`,
                `${newFields.boxFifth}`,
                `${newFields.boxSixth}`,
                `${newFields.boxSeventh}`,
              );
            });
          },
        );
      });
    });
  });
});
