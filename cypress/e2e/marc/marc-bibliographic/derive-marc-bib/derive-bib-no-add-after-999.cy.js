import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C494040_MarcBibInstance_${randomPostfix}`,
        user: {},
        tags: {
          ldr: 'LDR',
          field001: '001',
          field005: '005',
          field008: '008',
          field245: '245',
          field999: '999',
        },
        indexes: {
          for245: 4,
        },
      };

      const fieldsWithoutAddButton = [
        testData.tags.ldr,
        testData.tags.field001,
        testData.tags.field005,
        testData.tags.field999,
      ];

      const fieldsWithAddButton = [testData.tags.field008, testData.tags.field245];

      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C494040 User cannot add a new field below "999 ff" field on "Derive a new MARC bib record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C494040'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();

          fieldsWithoutAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, false);
          });
          fieldsWithAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, true);
          });

          QuickMarcEditor.addEmptyFields(testData.indexes.for245);

          QuickMarcEditor.verifyTagValue(testData.indexes.for245, testData.tags.field245);
          QuickMarcEditor.verifyTagValue(testData.indexes.for245 + 1, '');
          QuickMarcEditor.verifyTagValue(testData.indexes.for245 + 2, testData.tags.field999);
        },
      );
    });
  });
});
