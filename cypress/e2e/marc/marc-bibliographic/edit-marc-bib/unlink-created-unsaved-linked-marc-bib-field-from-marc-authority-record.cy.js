import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        marcBibTitle: 'Black Panther',
        searchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
      };
      const marcFiles = [
        {
          marc: 'marcAuthFileC366554_1.mrc',
          fileName: `testMarcAuthFile1C366554.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
        {
          marc: 'marcAuthFileC366554_2.mrc',
          fileName: `testMarcAuthFile2C366554.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
        {
          marc: 'marcBibFileC366554.mrc',
          fileName: `testMarcBibFileC366554.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
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
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
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
        { tags: ['extendedPath', 'spitfire', 'C366554'] },
        () => {
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.addNewField('700', '', 12);
          QuickMarcEditor.addNewField('700', '$a Sabino, J.', 13);
          QuickMarcEditor.clickLinkIconInTagField(13);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.searchBy('Keyword', 'C366554 Sprouse, Chris');
          MarcAuthority.contains('\t$a C366554 Sprouse, Chris');
          MarcAuthorities.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(13, 700);
          QuickMarcEditor.verifyTagFieldAfterLinking(
            13,
            '700',
            '\\',
            '\\',
            '$a C366554 Sprouse, Chris',
            '',
            '$0 http://id.loc.gov/authorities/names/nb98017694',
            '',
          );
          QuickMarcEditor.clickLinkIconInTagField(14);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.searchBy('Keyword', 'C366554 Sabino, Joe');
          MarcAuthority.contains('\t$a C366554 Sabino, Joe');
          MarcAuthorities.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingAuthorityByIndex(14, 700);
          QuickMarcEditor.verifyTagFieldAfterLinking(
            14,
            '700',
            '\\',
            '\\',
            '$a C366554 Sabino, Joe',
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
