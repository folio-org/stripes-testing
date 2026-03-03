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

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        instanceTitle:
          'C503160 Edit MARC bib with Local control fields which don\'t have subfield "Sa"',
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
          marc: 'C503160MarcBib.mrc',
          fileName: `C503160_testMarcFile_${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        },
        instanceId: null,
        derivedInstanceId1: null,
        derivedInstanceId2: null,
      };

      const validationRulePayloads = {
        field002: {
          tag: '002',
          label: `AT_C503160_ControlField_002_${getRandomPostfix()}`,
          url: 'http://example.org/002.html',
          repeatable: false,
          required: true,
          deprecated: false,
          scope: 'local',
        },
        field004: {
          tag: '004',
          label: `AT_C503160_ControlField_004_${getRandomPostfix()}`,
          url: 'http://example.org/004.html',
          repeatable: false,
          required: true,
          deprecated: false,
          scope: 'local',
        },
      };

      let bibSpecId;
      const createdFieldIds = {};

      before('Create test data', () => {
        cy.getAdminToken();

        InventoryInstances.deleteInstanceByTitleViaApi('C503160');
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
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          // Import MARC file using Data Import
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

        // Delete all created instances
        if (testData.instanceId) {
          InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        }
        if (testData.derivedInstanceId1) {
          InventoryInstance.deleteInstanceViaApi(testData.derivedInstanceId1);
        }
        if (testData.derivedInstanceId2) {
          InventoryInstance.deleteInstanceViaApi(testData.derivedInstanceId2);
        }

        // Delete validation rules
        Object.values(createdFieldIds).forEach((fieldId) => {
          if (fieldId) {
            cy.deleteSpecificationField(fieldId, false);
          }
        });

        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C503160 Derive "MARC bib" record with multiple Local control fields (002, 004, 009) which don\'t have or have subfield "$a" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503160'] },
        () => {
          // Step 1: Navigate to imported instance and derive new MARC bib
          InventoryInstances.searchByTitle(testData.instanceTitle);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();

          // Click on Actions → Derive new MARC bibliographic record
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains('Derive a new MARC bib record');

          // Verify local control fields don't have subfield indicators ($a)
          QuickMarcEditor.checkContentByTag(testData.tags.tag002, testData.fieldValues.field002);
          QuickMarcEditor.checkContentByTag(testData.tags.tag004, testData.fieldValues.field004);
          QuickMarcEditor.checkContentByTag(testData.tags.tag009, testData.fieldValues.field009);

          // Step 2: Update any field (add text in 245 field)
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.instanceTitle} - UPDATED`,
          );

          // Step 3: Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.waitLoading();

          // Capture first derived instance ID
          cy.url().then((url) => {
            testData.derivedInstanceId1 = url.split('/').pop();
          });

          // Step 4: Click Actions → View source
          InventoryInstance.viewSource();
          InventoryViewSource.waitLoading();

          // Verify local control fields don't have indicators or $a in source view
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

          // Step 5: Close source view pane
          InventoryViewSource.close();
          InventoryInstance.waitLoading();

          // Step 6: Derive again from first derived record
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains('Derive a new MARC bib record');

          // Verify fields still don't have $a subfield indicators
          QuickMarcEditor.checkContentByTag(testData.tags.tag002, testData.fieldValues.field002);
          QuickMarcEditor.checkContentByTag(testData.tags.tag004, testData.fieldValues.field004);
          QuickMarcEditor.checkContentByTag(testData.tags.tag009, testData.fieldValues.field009);

          // Step 7: Add subfield indicators ($a) in each local control field
          cy.wait(500); // Small wait to ensure fields are fully loaded

          // Update field 002 to include $a subfield
          QuickMarcEditor.updateExistingField(
            testData.tags.tag002,
            testData.fieldValues.field002WithSubfield,
          );

          // Update field 004 to include $a subfield
          QuickMarcEditor.updateExistingField(
            testData.tags.tag004,
            testData.fieldValues.field004WithSubfield,
          );

          // Update field 009 to include $a subfield
          QuickMarcEditor.updateExistingField(
            testData.tags.tag009,
            testData.fieldValues.field009WithSubfield,
          );

          // Verify fields now have $a subfield
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

          // Step 8: Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.waitLoading();

          // Capture second derived instance ID
          cy.url().then((url) => {
            testData.derivedInstanceId2 = url.split('/').pop();
          });

          // Step 9: Click Actions → Edit MARC bibliographic record
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Verify local control fields NOW have $a subfield indicators in edit mode
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
        },
      );
    });
  });
});
