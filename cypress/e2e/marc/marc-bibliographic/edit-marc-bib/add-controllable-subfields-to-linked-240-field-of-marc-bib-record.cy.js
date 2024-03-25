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
        tagForLinking: '240',
        marcBibTitle: 'Variations / Ludwig Van Beethoven.',
        searchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
        marcAuthTitle: 'Variations',
        errorCalloutMessage:
          'MARC 240 has a subfield(s) that cannot be saved because the field is controlled by an authority record.',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileForC376598.mrc',
          fileName: `testMarcBibFileC376598.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC376598.mrc',
          fileName: `testMarcAuthFileC376598.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
      ];

      const createdRecordIDs = [];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
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

          cy.loginAsAdmin({
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          }).then(() => {
            InventorySearchAndFilter.selectSearchOptions(
              testData.searchOption,
              testData.marcBibTitle,
            );
            InventorySearchAndFilter.clickSearch();
            InventoryInstances.selectInstanceById(createdRecordIDs[0]);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tagForLinking);
            MarcAuthorities.switchToSearch();
            cy.wait(1000); // need to wait for choose Type of Heading
            MarcAuthorities.chooseTypeOfHeading('Conference Name');
            InventoryInstance.searchResults(testData.marcAuthTitle);
            InventoryInstance.selectRecord();
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tagForLinking);
            QuickMarcEditor.pressSaveAndClose();
            cy.wait(1000); // need to wait until save is done
          });
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(() => {
          Users.deleteViaApi(testData.userProperties.userId);
        });
        createdRecordIDs.forEach((id, index) => {
          if (index) MarcAuthority.deleteViaAPI(id);
          else InventoryInstance.deleteInstanceViaApi(id);
        });
      });

      it(
        'C376598 Add controllable subfields to linked "240" field of a "MARC bib" record (linked to "111" field of "MARC authority" record) (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire'] },
        () => {
          InventorySearchAndFilter.selectSearchOptions(
            testData.searchOption,
            testData.marcBibTitle,
          );
          InventorySearchAndFilter.clickSearch();
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLinkedFifthBox(18, '$n test');
          cy.wait(500); // need wait until changes appear
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$f test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$h test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$k test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$l test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$p test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$s test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$g test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
          QuickMarcEditor.updateLinkedFifthBox(18, '$d test');
          QuickMarcEditor.pressSaveAndKeepEditing(testData.errorCalloutMessage);
        },
      );
    });
  });
});
