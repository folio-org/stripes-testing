import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('marc', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const createdInstanceIDs = [];
      const testData = {
        marcBibTitle: 'title' + getRandomPostfix(),
        validLDRValue: '00000naa\\a2200000uu\\4500',
        newField: {
          tag: '035',
          content: '(OCoLC)' + getRandomPostfix(),
        },
        searchOptionKeyword: 'Keyword (title, contributor, identifier, HRID, UUID)',
        searchOptionOCLC: 'OCLC number, normalized',
      };

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.user.userId);
          InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[0]);
        });
      });

      it(
        'C422121 Search created "MARC bib" record by Title, OCLC number (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.updateExistingField('245', `$a ${testData.marcBibTitle}`);
          QuickMarcEditor.updateExistingField('LDR', testData.validLDRValue);
          QuickMarcEditor.checkSubfieldsPresenceInTag008();
          QuickMarcEditor.addNewField(testData.newField.tag, `$a ${testData.newField.content}`, 4);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            createdInstanceIDs.push(id);
          });
          InventoryInstances.searchInstancesWithOption(
            testData.searchOptionKeyword,
            testData.newField.content,
          );
          InventorySearchAndFilter.verifySearchResult(testData.marcBibTitle);
          cy.wait(100);
          InventoryInstances.searchInstancesWithOption(
            testData.searchOptionOCLC,
            testData.newField.content,
          );
          InventorySearchAndFilter.verifySearchResult(testData.marcBibTitle);
          InventoryInstances.searchInstancesWithOption(
            testData.searchOptionKeyword,
            testData.marcBibTitle,
          );
          InventorySearchAndFilter.verifySearchResult(testData.marcBibTitle);
          InventorySearchAndFilter.selectFoundInstance(testData.marcBibTitle);
          InventorySearchAndFilter.verifyInstanceDetailsView();
        },
      );
    });
  });
});
