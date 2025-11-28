import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tag002: '002',
          tag004: '004',
          tag009: '009',
        },
        fieldValues: {
          instanceTitle: `AT_C503157_Create MARC bib with Local control fields which don't have subfield "Sa"_${getRandomPostfix()}`,
          field002: 'FOLIO23491',
          field004: 'FOLIO23492',
          field009: 'FOLIO23493',
        },
        instanceId: null,
      };

      const validationRulePayloads = {
        field002: {
          tag: '002',
          label: `AT_C503157_ControlField_002_${getRandomPostfix()}`,
          url: 'http://example.org/002.html',
          repeatable: true,
          required: false,
          deprecated: false,
        },
        field004: {
          tag: '004',
          label: `AT_C503157_ControlField_004_${getRandomPostfix()}`,
          url: 'http://example.org/004.html',
          repeatable: true,
          required: false,
          deprecated: false,
        },
      };

      let bibSpecId;
      const createdFieldIds = {};

      before('Create test data', () => {
        cy.getAdminToken();

        // Get bibliographic specification ID
        cy.getSpecificationIds().then((specs) => {
          const bibSpec = specs.find((s) => s.profile === 'bibliographic');
          /* eslint-disable no-unused-expressions */
          expect(bibSpec, 'MARC bibliographic specification exists').to.exist;
          bibSpecId = bibSpec.id;

          // Clean up any existing fields with the same tags and create new ones
          cy.deleteSpecificationFieldByTag(bibSpecId, testData.tags.tag002, false).then(() => {
            cy.createSpecificationField(bibSpecId, validationRulePayloads.field002).then(
              (fieldResp) => {
                expect(fieldResp.status).to.eq(201);
                createdFieldIds.field002 = fieldResp.body.id;
              },
            );
          });

          cy.deleteSpecificationFieldByTag(bibSpecId, testData.tags.tag004, false).then(() => {
            cy.createSpecificationField(bibSpecId, validationRulePayloads.field004).then(
              (fieldResp) => {
                expect(fieldResp.status).to.eq(201);
                createdFieldIds.field004 = fieldResp.body.id;
              },
            );
          });
        });

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
        if (testData.instanceId) {
          InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        }
        Users.deleteViaApi(testData.user.userId);
        if (createdFieldIds.field002) {
          cy.deleteSpecificationField(createdFieldIds.field002, false);
        }
        if (createdFieldIds.field004) {
          cy.deleteSpecificationField(createdFieldIds.field004, false);
        }
      });

      it(
        'C503157 Create "MARC bib" record with multiple Local control fields (002, 004, 009) which don\'t have subfield "$a" (Not required; repeatable) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503157'] },
        () => {
          // Step 1: Click on "Actions" button in second pane >> Select "+ New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Verify initial fields are present
          QuickMarcEditor.checkContent('', 1); // 001 - empty initially
          QuickMarcEditor.checkContent('', 2); // 005 - empty initially
          QuickMarcEditor.checkContentByTag('245', '$a '); // 245 - empty initially

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 4: Fill in "$a" subfield of "245" with some valid value
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.fieldValues.instanceTitle}`,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tags.tag245,
            `$a ${testData.fieldValues.instanceTitle}`,
          );

          // Step 5: Add multiple fields (MARC tag - value in the fourth box of added field)
          // Important: Add fields WITHOUT "$a" prefix - these are control fields

          // Add 002 field without "$a" subfield
          let currentRowIndex = 4; // Row 4 is after 245 field
          QuickMarcEditor.addNewField(
            testData.tags.tag002,
            testData.fieldValues.field002,
            currentRowIndex++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.field002, currentRowIndex);

          // Add 004 field without "$a" subfield
          QuickMarcEditor.addNewField(
            testData.tags.tag004,
            testData.fieldValues.field004,
            currentRowIndex++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.field004, currentRowIndex);

          // Add 009 field without "$a" subfield
          QuickMarcEditor.addNewField(
            testData.tags.tag009,
            testData.fieldValues.field009,
            currentRowIndex++,
          );
          QuickMarcEditor.checkContent(testData.fieldValues.field009, currentRowIndex);

          // Step 6: Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();

          // Verify successful save and pane closure
          InventoryInstance.waitLoading();

          // Capture instance ID for cleanup
          cy.url().then((url) => {
            testData.instanceId = url.split('/').pop();
          });

          // Step 7: Click on the "Actions" button in the third pane >> Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Verify added Local control fields (002, 004, 009) don't have indicator boxes and subfield indicators
          // Control fields should not display "$a" prefix and should not have indicator boxes
          QuickMarcEditor.checkContentByTag(testData.tags.tag002, testData.fieldValues.field002);
          QuickMarcEditor.checkContentByTag(testData.tags.tag004, testData.fieldValues.field004);
          QuickMarcEditor.checkContentByTag(testData.tags.tag009, testData.fieldValues.field009);

          // Step 8: Click on the "Cancel" button
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.waitLoading();

          // Step 9: Click on the "Actions" button in the third pane >> Select "View source" option
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();

          // Verify added Local control fields (002, 004, 009) don't have subfield indicators (ex.: "$a") in it
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tags.tag002,
            testData.fieldValues.field002,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tags.tag004,
            testData.fieldValues.field004,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tags.tag009,
            testData.fieldValues.field009,
          );
        },
      );
    });
  });
});
