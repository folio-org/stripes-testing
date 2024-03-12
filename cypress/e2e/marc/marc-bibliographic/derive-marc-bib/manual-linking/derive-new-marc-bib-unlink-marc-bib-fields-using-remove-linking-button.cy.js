import Permissions from '../../../../../support/dictionary/permissions';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        tag700: '700',
        firstTag700Values: [
          76,
          '700',
          '1',
          '\\',
          '$a C366115 Sprouse, Chris $e artist. $0 1357871',
        ],
        secondTag700Values: [
          77,
          '700',
          '1',
          '\\',
          '$a C366115 Martin, Laura $c (Comic book artist) $e colorist. $0 http://id.loc.gov/authorities/names/n2014052262',
        ],
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC366115.mrc',
          fileName: `C366115 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          numOfRecords: 1,
          propertyName: 'relatedInstanceInfo',
        },
        {
          marc: 'marcAuthFileForC366115_1.mrc',
          fileName: `C366115 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          numOfRecords: 1,
          propertyName: 'relatedAuthorityInfo',
        },
        {
          marc: 'marcAuthFileForC366115_2.mrc',
          fileName: `C366115 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          numOfRecords: 1,
          propertyName: 'relatedAuthorityInfo',
        },
      ];
      const linkingTagAndValues = [
        {
          rowIndex: 76,
          value: 'C366115 Sprouse, Chris',
          tag: 700,
        },
        {
          rowIndex: 77,
          value: 'C366115 Martin, Laura (Comic book artist)',
          tag: 700,
        },
      ];
      const createdRecordIDs = [];

      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.user = createdUserProperties;

          marcFiles.forEach((marcFile) => {
            cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
              () => {
                DataImport.uploadFileViaApi(
                  marcFile.marc,
                  marcFile.fileName,
                  marcFile.jobProfileToRun,
                ).then((response) => {
                  response.entries.forEach((record) => {
                    createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
                  });
                });
              },
            );
          });

          cy.visit(TopMenu.inventoryPath).then(() => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            linkingTagAndValues.forEach((linking) => {
              QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.verifySearchOptions();
              InventoryInstance.searchResults(linking.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
            });
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Deleting created user and data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[0]);
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C366115 Derive a new MARC bib record: Unlink "MARC Bibliographic" fields from "MARC Authority" records using "Remove linking" button in "Remove authority linking" modal (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstance();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.verifyRemoveLinkingModal();
          QuickMarcEditor.confirmRemoveAuthorityLinking();
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[0].rowIndex);
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[1].rowIndex);
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.firstTag700Values);
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[0].rowIndex);
          QuickMarcEditor.verifyTagFieldAfterUnlinking(...testData.secondTag700Values);
          QuickMarcEditor.checkLinkButtonToolTipTextByIndex(linkingTagAndValues[1].rowIndex);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.verifyContributor(2, 1, linkingTagAndValues[0].value);
          InventoryInstance.checkMarcAppIconAbsent(2);
          InventoryInstance.verifyContributor(3, 1, linkingTagAndValues[1].value);
          InventoryInstance.checkMarcAppIconAbsent(3);

          InventoryInstance.goToEditMARCBiblRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyIconsAfterUnlinking(72);
          QuickMarcEditor.verifyIconsAfterUnlinking(73);
        },
      );
    });
  });
});
