import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      updatedTitle: `AT_C358993_MarcBibInstance_${randomPostfix}`,
      importedTitle: 'Harry Potter and the goblet of fire / J.K. Rowling.',
      oclcNumber: '1158372966',
      tag245: '245',
    };

    let createdInstanceId;
    let userA;
    let userB;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((createdUserPropertiesA) => {
        userA = createdUserPropertiesA;

        cy.createTempUser([
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.inventoryAll.gui,
        ]).then((createdUserPropertiesB) => {
          userB = createdUserPropertiesB;

          cy.login(userA.username, userA.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userA.userId);
      Users.deleteViaApi(userB.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
    });

    it(
      'C358993 Verify that 006 / 007 tag(s) do not persist if record overlaid does not contain the tag(s) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C358993'] },
      () => {
        InventoryInstances.importWithOclc(testData.oclcNumber);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(testData.importedTitle);
        InventoryInstance.getId().then((id) => {
          createdInstanceId = id;

          cy.getAdminToken();
          Users.deleteViaApi(userA.userId).then((deleteStatus) => {
            expect(deleteStatus).to.equal(204);

            cy.login(userB.username, userB.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });

            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();

            InventoryInstance.deriveNewMarcBibRecord();
            QuickMarcEditor.pressCancel();
            InventoryInstance.waitLoading();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.updatedTitle}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.checkInstanceTitle(testData.updatedTitle);
          });
        });
      },
    );
  });
});
