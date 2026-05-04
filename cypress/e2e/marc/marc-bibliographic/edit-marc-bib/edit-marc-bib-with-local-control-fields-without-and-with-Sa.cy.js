import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  findLocalField,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle:
          'C503159 Edit MARC bib with Local control fields which don\'t have subfield "Sa"',
        tags: {
          tag002: '002',
          tag004: '004',
          tag009: '009',
          tag245: '245',
        },
        fieldValues: {
          field002: 'FOLIO23491',
          field004: 'FOLIO23492',
          field009: 'FOLIO23493',
          field002WithSubfield: '$a FOLIO23491',
          field004WithSubfield: '$a FOLIO23492',
          field009WithSubfield: '$a FOLIO23493',
        },
        marcFile: {
          marc: 'C503159MarcBib.mrc',
          fileName: `C503159_testMarcFile_${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        instanceId: null,
      };

      const validationRulePayloads = {
        field002: {
          tag: '002',
          label: `AT_C503159_ControlField_002_${getRandomPostfix()}`,
          url: 'http://example.org/002.html',
          repeatable: false,
          required: true,
          deprecated: false,
          scope: 'local',
        },
        field004: {
          tag: '004',
          label: `AT_C503159_ControlField_004_${getRandomPostfix()}`,
          url: 'http://example.org/004.html',
          repeatable: false,
          required: true,
          deprecated: false,
          scope: 'local',
        },
      };

      let bibSpecId;
      const createdFieldIds = {};
      const fieldInitialStates = {};

      before('Create test data', () => {
        cy.getAdminToken();

        InventoryInstances.deleteInstanceByTitleViaApi('C503159');

        getBibliographicSpec().then((bibSpec) => {
          bibSpecId = bibSpec.id;

          cy.getSpecificationFields(bibSpecId).then((fieldsResponse) => {
            const fields = fieldsResponse.body.fields;

            ['field002', 'field004'].forEach((key) => {
              const payload = validationRulePayloads[key];
              const existing = findLocalField(fields, payload.tag);

              if (existing) {
                fieldInitialStates[key] = {
                  id: existing.id,
                  tag: existing.tag,
                  label: existing.label,
                  url: existing.url,
                  repeatable: existing.repeatable,
                  required: existing.required,
                  deprecated: existing.deprecated,
                };
                cy.updateSpecificationField(existing.id, {
                  tag: payload.tag,
                  label: payload.label,
                  url: payload.url,
                  repeatable: payload.repeatable,
                  required: payload.required,
                  deprecated: payload.deprecated,
                });
              } else {
                cy.createSpecificationField(bibSpecId, payload).then((fieldResp) => {
                  expect(fieldResp.status).to.eq(201);
                  createdFieldIds[key] = fieldResp.body.id;
                });
              }
            });
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            testData.instanceId = response[0].instance.id;
          });

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

        // Restore pre-existing fields to their initial state
        Object.values(fieldInitialStates).forEach((initial) => {
          cy.updateSpecificationField(initial.id, {
            tag: initial.tag,
            label: initial.label,
            url: initial.url,
            repeatable: initial.repeatable,
            required: initial.required,
            deprecated: initial.deprecated,
          });
        });

        // Delete fields that were newly created by this test
        Object.values(createdFieldIds).forEach((fieldId) => {
          if (fieldId) {
            cy.deleteSpecificationField(fieldId, false);
          }
        });

        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C503159 Save existing "MARC bib" record with multiple Local control fields (002, 004, 009) which don\'t have or have subfield "$a" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503159', 'nonParallel'] },
        () => {
          // Open imported instance
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Step 1: Actions → Edit MARC bibliographic record
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains('Edit MARC record');

          // Verify local control fields don't have subfield indicators ($a)
          QuickMarcEditor.checkContentByTag(testData.tags.tag002, testData.fieldValues.field002);
          QuickMarcEditor.checkContentByTag(testData.tags.tag004, testData.fieldValues.field004);
          QuickMarcEditor.checkContentByTag(testData.tags.tag009, testData.fieldValues.field009);

          // Step 2: Update 245 field
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.instanceTitle} - UPDATED`,
          );

          // Step 3: Save & close
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          // Step 4: Actions → View source; control fields still without $a
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();
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

          // Step 5: Close source view
          InventoryViewSource.close();
          InventoryInstance.waitLoading();

          // Step 6: Actions → Edit MARC bibliographic record again
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains('Edit MARC record');

          QuickMarcEditor.checkContentByTag(testData.tags.tag002, testData.fieldValues.field002);
          QuickMarcEditor.checkContentByTag(testData.tags.tag004, testData.fieldValues.field004);
          QuickMarcEditor.checkContentByTag(testData.tags.tag009, testData.fieldValues.field009);

          // Step 7: Add $a subfield indicators to each local control field
          cy.wait(500);
          QuickMarcEditor.updateExistingField(
            testData.tags.tag002,
            testData.fieldValues.field002WithSubfield,
          );
          QuickMarcEditor.updateExistingField(
            testData.tags.tag004,
            testData.fieldValues.field004WithSubfield,
          );
          QuickMarcEditor.updateExistingField(
            testData.tags.tag009,
            testData.fieldValues.field009WithSubfield,
          );

          QuickMarcEditor.checkContentByTag(
            testData.tags.tag002,
            testData.fieldValues.field002WithSubfield,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tags.tag004,
            testData.fieldValues.field004WithSubfield,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tags.tag009,
            testData.fieldValues.field009WithSubfield,
          );

          // Step 8: Save & keep editing
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkContentByTag(
            testData.tags.tag002,
            testData.fieldValues.field002WithSubfield,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tags.tag004,
            testData.fieldValues.field004WithSubfield,
          );
          QuickMarcEditor.checkContentByTag(
            testData.tags.tag009,
            testData.fieldValues.field009WithSubfield,
          );

          // Step 9: Cancel - close editor pane
          QuickMarcEditor.closeEditorPane();
          InventoryInstance.waitLoading();

          // Step 10: Actions → View source; control fields now have $a
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tags.tag002,
            testData.fieldValues.field002WithSubfield,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tags.tag004,
            testData.fieldValues.field004WithSubfield,
          );
          InventoryViewSource.verifyFieldInMARCBibSource(
            testData.tags.tag009,
            testData.fieldValues.field009WithSubfield,
          );
        },
      );
    });
  });
});
