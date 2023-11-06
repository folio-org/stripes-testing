import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';

describe('Create new MARC bib', () => {
  const createdInstanceIDs = [];
  const testData = {
    marcBibTitle: 'title' + getRandomPostfix(),
    validLDRValue: '00000naa\\a2200000uu\\4500',
    newField: {
      tag: '035',
      content: '(OCoLC)' + getRandomPostfix(),
    },
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
    'C380736 Search created "MARC bib" record by Title, OCLC number (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField('245', `$a ${testData.marcBibTitle}`);
      QuickMarcEditor.updateExistingField('LDR', testData.validLDRValue);
      QuickMarcEditor.checkSubfieldsPresenceInTag008();
      QuickMarcEditor.addNewField(testData.newField.tag, `$a ${testData.newField.content}`, 4);
      QuickMarcEditor.pressSaveAndClose();
      InventoryInstance.waitLoading();
      QuickMarcEditor.checkAfterSaveAndClose();
      InventoryInstance.getId().then((id) => {
        createdInstanceIDs.push(id);
      });
      InventorySearchAndFilter.searchInstanceByKeyword(testData.newField.content);
      InventorySearchAndFilter.verifySearchResult(testData.marcBibTitle);
      InventorySearchAndFilter.searchInstanceByOCLC(testData.newField.content);
      InventorySearchAndFilter.verifySearchResult(testData.marcBibTitle);
      InventorySearchAndFilter.searchInstanceByKeyword(testData.marcBibTitle);
      InventorySearchAndFilter.verifySearchResult(testData.marcBibTitle);
      InventorySearchAndFilter.selectFoundInstance(testData.marcBibTitle);
      InventorySearchAndFilter.verifyInstanceDetailsView();
    },
  );
});
