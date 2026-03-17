import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        user: {},
        tags: {
          tag008: '008',
          tag003: '003',
          tag035: '035',
          tag245: '245',
        },
        tag008Index: 3,
        tag003Content: '$a new field',
        firstTag035Content: '$a (OCoLC)ocm000064758',
        secondTag035Content: '$a (OCoLC)on.000064759',
        thirdTag035Content:
          '$a (OCoLC)ocm000064758 $z (OCoLC)0000976939443 $z (OCoLC)ocn00001001261435 $z (OCoLC)120194933',
        tag245Content: `$a AT_C1045400_MarcBib_${getRandomPostfix()}`,
        firstTag035ContentAfterSave: '$a (OCoLC)64759',
        secondTag035ContentAfterSave:
          '$a (OCoLC)64758 $z (OCoLC)976939443 $z (OCoLC)1001261435 $z (OCoLC)120194933',
      };

      const fieldsBeforeSave = [
        { tag: testData.tags.tag003, content: testData.tag003Content, id: 4 },
        { tag: testData.tags.tag035, content: testData.firstTag035Content, id: 5 },
        { tag: testData.tags.tag035, content: testData.secondTag035Content, id: 6 },
        { tag: testData.tags.tag035, content: testData.thirdTag035Content, id: 7 },
        { tag: testData.tags.tag245, content: testData.tag245Content, id: 8 },
      ];

      const fieldsAfterSave = [
        { tag: testData.tags.tag035, content: testData.firstTag035ContentAfterSave, id: 4 },
        { tag: testData.tags.tag035, content: testData.secondTag035ContentAfterSave, id: 5 },
        { tag: testData.tags.tag245, content: testData.tag245Content, id: 6 },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('C1045400');
      });

      it(
        'C1045400 Create MARC bibliographic record with 003 and 035 fields (verify normalization) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C1045400'] },
        () => {
          // Step 1: Click on "Actions" button → Select "+ New MARC bibliographic record" option
          InventoryInstances.createNewMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Steps 2, 3: Select valid values in "LDR" and "008" fields
          QuickMarcEditor.updateLDR06And07Positions();

          // Steps 4-6: Fill in "245" field, add 003 and 035 fields
          fieldsBeforeSave.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, testData.tag008Index + index);
          });
          fieldsBeforeSave.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });

          // Step 7: Click on the "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();

          // Verify fields are displayed correctly in QuickMARC editor
          fieldsAfterSave.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });
        },
      );
    });
  });
});
