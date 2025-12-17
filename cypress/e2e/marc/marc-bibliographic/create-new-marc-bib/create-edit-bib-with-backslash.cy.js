import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
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
        instanceHrid: null,
        instanceId: null,
        uniquePostfix: getRandomPostfix(),
      };

      const titleWithBackslashes =
        'Test back\\slash in middle. Test slash at the \\start and end\\. Test \\ lonely. Te\\\\st multiple\\\\. Test \\\\ multiple';
      testData.instanceTitle = `AT_C877076_${titleWithBackslashes}_${testData.uniquePostfix}`;
      testData.fields = {
        field245: `$a AT_C877076_${titleWithBackslashes}_${testData.uniquePostfix}`,
        field050_1: '$a A 1.1\\8:100.A1',
        field050_2: '$a A 1.1\\\\8:100.A2',
        field600: '$a test backsl\\ashes',
        field700: '$a test backsl\\ashes',
      };
      testData.expectedClassifications = ['A 1.1\\8:100.A1', 'A 1.1\\\\8:100.A2'];
      testData.expectedContributor = 'test backsl\\ashes';
      testData.expectedSubject = 'test backsl\\ashes';

      before('Create test user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        if (testData.instanceId) {
          InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        }
      });

      it(
        'C877076 Create/Edit MARC bib record with backslash ("\\") character in some fields and check Instance detail view pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C877076'] },
        () => {
          // Step 1: Click on "Actions" button → Select "+ New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Steps 2-3: Select valid values in "LDR" positions 06, 07 and fill 008 field
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 4: Fill in "245" field with data which contains backslashes
          QuickMarcEditor.addEmptyFields(3);
          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(3, '245', testData.fields.field245, '\\', '\\');

          // Step 5: Add two "050" fields with data which contains backslashes
          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.addEmptyFields(5);
          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(
            4,
            '050',
            testData.fields.field050_1,
            '\\',
            '\\',
          );
          QuickMarcEditor.addValuesToExistingField(
            5,
            '050',
            testData.fields.field050_2,
            '\\',
            '\\',
          );

          // Step 6: Click on the "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag('245', testData.fields.field245);
          QuickMarcEditor.checkContent(testData.fields.field050_1, 5);
          QuickMarcEditor.checkContent(testData.fields.field050_2, 6);

          // Step 7: Close "quickmarc" pane and find created Instance by its "HRID"
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.waitLoading();

          InventoryInstance.getId().then((id) => {
            testData.instanceId = id;
          });

          InventoryInstance.getAssignedHRID().then((hrid) => {
            testData.instanceHrid = hrid;
            InventoryInstances.searchByTitle(hrid);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            InventoryInstance.checkInstanceTitle(testData.instanceTitle);
            InventoryInstance.checkPresentedText(titleWithBackslashes);

            testData.expectedClassifications.forEach((classification) => {
              InventoryInstance.verifyClassificationValueInView('LC', classification);
            });
          });

          // Step 8: Click on "Actions" button → Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Step 9: Add "600" field with data which contains backslashes
          QuickMarcEditor.addNewField('600', testData.fields.field600, 7);

          // Step 10: Add "700" field with data which contains backslashes
          QuickMarcEditor.addNewField('700', testData.fields.field700, 8);

          // Step 11: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          InventoryInstance.checkInstanceTitle(testData.instanceTitle);

          testData.expectedClassifications.forEach((classification) => {
            InventoryInstance.verifyClassificationValueInView('LC', classification);
          });

          InventoryInstance.checkContributor(testData.expectedContributor);
          InventoryInstance.verifySubjectHeading(testData.expectedSubject);
        },
      );
    });
  });
});
