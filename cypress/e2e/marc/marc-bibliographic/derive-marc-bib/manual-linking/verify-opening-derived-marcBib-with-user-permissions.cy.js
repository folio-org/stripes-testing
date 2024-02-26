import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag245: '245',
          tag245Content:
            '$a C417049 Derive Crossfire : $b a litany for survival : poems 1998-2019 / $c Staceyann Chin ; foreword by Jacqueline Woodson.',
          instanceTitleAfterUpdate:
            'C417049 Derive Crossfire : a litany for survival : poems 1998-2019 / Staceyann Chin ; foreword by Jacqueline Woodson.',
          marcAuthIcon: 'Linked to MARC authority',
          accordion: 'Contributor',
          marcValue: 'C417049 Chin, Staceyann, 1972-',
        };

        const marcFiles = [
          {
            marc: 'marcBibFileForC417049.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
            numOfRecords: 1,
            propertyName: 'relatedInstanceInfo',
          },
          {
            marc: 'marcAuthFileForC417049.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: 'Default - Create SRS MARC Authority',
            numOfRecords: 1,
            propertyName: 'relatedAuthorityInfo',
          },
        ];

        const linkingTagAndValues = {
          rowIndex: 11,
          value: 'C417049 Chin, Staceyann, 1972-',
          tag: 100,
        };

        const createdAuthorityIDs = [];

        before(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          ]).then((createdUserProperties) => {
            testData.userData = createdUserProperties;

            cy.loginAsAdmin().then(() => {
              cy.visit(TopMenu.dataImportPath);
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
            });

            cy.loginAsAdmin({
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            }).then(() => {
              InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.clickLinkIconInTagField(linkingTagAndValues.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linkingTagAndValues.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValues.tag,
                linkingTagAndValues.rowIndex,
              );
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndClose();
            });
          });
        });

        after('Deleting created user and data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userData.userId);
          InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
          MarcAuthority.deleteViaAPI(createdAuthorityIDs[1]);
        });

        it(
          'C417049 Derive | Verify that derived MARC bib with linked field by user without "Edit" permissions can be opened (spitfire)',
          { tags: ['criticalPath', 'spitfire'] },
          () => {
            cy.login(testData.userData.username, testData.userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyRemoveLinkingModal();

            QuickMarcEditor.clickKeepLinkingButton();
            QuickMarcEditor.updateExistingField(testData.tag245, testData.tag245Content);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.verifyAfterDerivedMarcBibSave();
            InventoryInstance.checkPresentedText(testData.instanceTitleAfterUpdate);
            InventoryInstance.verifyRecordAndMarcAuthIcon(
              testData.accordion,
              `${testData.marcAuthIcon}\n${testData.marcValue}`,
            );
            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.verifyRemoveLinkingModal();
          },
        );
      });
    });
  });
});
