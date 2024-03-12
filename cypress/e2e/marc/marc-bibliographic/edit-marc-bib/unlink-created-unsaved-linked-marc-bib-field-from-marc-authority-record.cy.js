import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Users from '../../../../support/fragments/users/users';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        marcBibTitle: 'Black Panther',
        searchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
      };
      const marcFiles = [
        {
          marc: 'marcAutoFile1C366554.mrc',
          fileName: `testMarcAuthFile1C366554.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          propertyName: 'relatedAuthorityInfo',
        },
        {
          marc: 'marcAutoFile2C366554.mrc',
          fileName: `testMarcAuthFile2C366554.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create SRS MARC Authority',
          propertyName: 'relatedAuthorityInfo',
        },
        {
          marc: 'marcBibFileC366554.mrc',
          fileName: `testMarcBibFileC366554.${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          propertyName: 'relatedInstanceInfo',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.entries.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].idList[0]);
              });
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            InventorySearchAndFilter.selectSearchOptions(
              testData.searchOption,
              testData.marcBibTitle,
            );
            InventorySearchAndFilter.clickSearch();
            InventoryInstances.selectInstanceById(createdRecordIDs[2]);
            InventoryInstance.waitLoading();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(() => {
          Users.deleteViaApi(testData.userProperties.userId);
        });
        MarcAuthority.deleteViaAPI(createdRecordIDs[0]);
        MarcAuthority.deleteViaAPI(createdRecordIDs[1]);
        InventoryInstance.deleteInstanceViaApi(createdRecordIDs[2]);
      });

      it(
        'C366554 Unlink created unsaved linked "MARC Bib" field from "MARC Authority" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.addNewField('700', '', 12);
          QuickMarcEditor.addNewField('700', '$a Sabino, J.', 13);
          QuickMarcEditor.clickLinkIconInTagField(13);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.searchBy('Keyword', 'Sprouse, Chris');
          InventoryInstance.selectRecord();
          MarcAuthorities.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(13, 700);
          QuickMarcEditor.verifyTagFieldAfterLinking(
            13,
            '700',
            '\\',
            '\\',
            '$a Sprouse, Chris',
            '',
            '$0 http://id.loc.gov/authorities/names/nb98017694',
            '',
          );
          QuickMarcEditor.clickLinkIconInTagField(14);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.searchBy('Keyword', 'Sabino, Joe');
          InventoryInstance.selectRecord();
          MarcAuthorities.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(14, 700);
          QuickMarcEditor.verifyTagFieldAfterLinking(
            14,
            '700',
            '\\',
            '\\',
            '$a Sabino, Joe',
            '',
            '$0 http://id.loc.gov/authorities/names/no2011137752',
            '',
          );
          QuickMarcEditor.clickUnlinkIconInTagField(13);
          QuickMarcEditor.confirmUnlinkingField();
          QuickMarcEditor.verifyTagFieldAfterUnlinking(13, '700', '\\', '\\', '');
          QuickMarcEditor.clickUnlinkIconInTagField(14);
          cy.wait(500); // wait until confirmation panel will appear
          QuickMarcEditor.confirmUnlinkingField();
          QuickMarcEditor.verifyTagFieldAfterUnlinking(14, '700', '\\', '\\', '$a Sabino, J.');
          QuickMarcEditor.deleteField(13);
          QuickMarcEditor.checkUndoDeleteAbsent();
          QuickMarcEditor.deleteField(13);
          QuickMarcEditor.checkUndoDeleteAbsent();
        },
      );
    });
  });
});
