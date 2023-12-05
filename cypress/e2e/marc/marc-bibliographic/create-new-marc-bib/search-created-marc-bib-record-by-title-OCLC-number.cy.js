import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

let userId;
const testData = {
  firstSearchOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
  secondSearchOption: 'OCLC number, normalized',
  textFor245Filed: '$a Sophisticated title #1',
  textFor035Filed: '$a (OCoLC)ocn607TST001',
  searchText1: '(OCoLC)ocn607TST001',
  searchText2: 'Sophisticated title #1',
  instanceTitle: 'Sophisticated title #1',
};
const createdInstanceIDs = [];

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
  before(() => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });
  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(userId);
    InventoryInstance.deleteInstanceViaApi(createdInstanceIDs[0]);
  });

  it(
    'C422121 Search created "MARC bib" record by Title, OCLC number(spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.checkSubfieldsAbsenceInTag008();
      QuickMarcEditor.updateExistingField('LDR', '00000naa\\a2200000uu\\4500');
      QuickMarcEditor.check008FieldContent();
      QuickMarcEditor.updateExistingField('245', 'Sophisticated title #1');
      QuickMarcEditor.addNewField('035', '$a (OCoLC)ocn607TST001', 4);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdInstanceIDs.push(id);
      });
      InventorySearchAndFilter.selectSearchOptions(
        testData.firstSearchOption,
        testData.searchText1,
      );
      InventorySearchAndFilter.clickSearch();
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle, true);
      InventorySearchAndFilter.selectSearchOptions(
        testData.secondSearchOption,
        testData.searchText1,
      );
      InventorySearchAndFilter.clickSearch();
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle, true);
      InventorySearchAndFilter.selectSearchOptions(
        testData.firstSearchOption,
        testData.searchText2,
      );
      InventorySearchAndFilter.clickSearch();
      InventorySearchAndFilter.verifyInstanceDisplayed(testData.instanceTitle, true);
      InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);
    },
  );
});
