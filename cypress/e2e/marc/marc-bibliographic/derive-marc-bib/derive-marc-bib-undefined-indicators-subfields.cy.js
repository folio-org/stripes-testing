import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
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
  toggleAllUndefinedValidationRules,
  generateTestFieldData,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        title: 'C514910 Edit MARC bib which has standard and appended Indicator, Subfield codes',
        tag245: '245',
        tag983: '983',
        field245: {
          indicators: ['8', '8'],
          content:
            '$a Derive MARC bib $t Indicator, Subfield codes not specified in MARC validation rules',
        },
        field983: {
          indicators: ['1', '2'],
          content: '$a Local field with local indicator $b and subfield',
        },
        indicatorWarningText: (index, value) => `Warn: ${index ? 'Second' : 'First'} Indicator '${value}' is undefined.`,
        subfieldWarningText: (code) => `Warn: Subfield '${code}' is undefined.`,
        expectedWarningCount: 21,
        userProperties: {},
        marcFile: {
          marc: 'C514910MarcBib.mrc',
          fileName: `C514910_${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
        },
      };

      let specId;
      let createdInstanceId;
      let derivedInstanceId;
      let field983Id;

      before('Create user, import MARC file, and enable validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getBibliographicSpec().then((bibSpec) => {
            specId = bibSpec.id;

            // Get all fields and check if 983 exists
            cy.getSpecificationFields(specId).then((fieldsResponse) => {
              const field983 = fieldsResponse.body.fields.find((field) => field.tag === '983');

              if (field983) {
                // Delete existing field 983 to reset configuration
                cy.deleteSpecificationField(field983.id, false);
              }

              // Create fresh field 983 without any indicators/subfields defined
              const field983Data = generateTestFieldData('C514910', {
                tag: '983',
                label: 'Local_Field_983',
                scope: 'local',
                repeatable: true,
                required: false,
              });

              cy.createSpecificationField(specId, field983Data, false).then((fieldResponse) => {
                field983Id = fieldResponse.body.id;
              });

              // Enable undefined validation rules
              toggleAllUndefinedValidationRules(specId, { enable: true });
            });
          });

          // Import MARC bib file
          DataImport.uploadFileViaApi(
            testData.marcFile.marc,
            testData.marcFile.fileName,
            testData.marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdInstanceId = record[testData.marcFile.propertyName].id;
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete user and disable validation rules', () => {
        cy.getAdminToken();
        getBibliographicSpec().then(({ id }) => {
          toggleAllUndefinedValidationRules(id, { enable: false });
        });
        if (testData.userProperties.userId) {
          Users.deleteViaApi(testData.userProperties.userId);
        }
        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }
        if (derivedInstanceId) {
          InventoryInstance.deleteInstanceViaApi(derivedInstanceId);
        }
        if (field983Id) {
          cy.deleteSpecificationField(field983Id, false);
        }
      });

      it(
        'C514910 Derive MARC bib record with undefined Indicators / Subfield codes in Standard and Local fields when "Undefined" rules are enabled (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514910', 'nonParallel'] },
        () => {
          // Step 1: Open derive window
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/Derive a new MARC bib record/);

          // Step 2: Update field 245 with undefined indicators '8' '8' and subfield $t
          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245.content);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '8', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '8', 1);

          // Step 3: Add local field 983 with undefined indicators and subfields
          QuickMarcEditor.addNewField(testData.tag983, testData.field983.content, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag983, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag983, '2', 1);

          // Step 4: First save attempt - verify validation warnings
          QuickMarcEditor.pressSaveAndCloseButton();

          // Verify warning callout toast with expected count
          QuickMarcEditor.verifyValidationCallout(testData.expectedWarningCount, 0);

          // Verify inline warnings for field 245
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(testData.indicatorWarningText(0, '8')),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(testData.subfieldWarningText('t')),
          );

          // Verify inline warnings for field 983
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(0, '1')),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(1, '2')),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.subfieldWarningText('a')),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.subfieldWarningText('b')),
          );

          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          // Step 5: Second save attempt - record created successfully
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();

          // Capture derived instance ID
          InventoryInstance.getId().then((id) => {
            derivedInstanceId = id;
          });

          // Step 6: Verify data persisted via View Source
          InventoryInstance.viewSource();

          // Verify field 245 retained the specified values (indicators 8 8 and subfield $t)
          InventoryViewSource.contains('245');
          InventoryViewSource.contains('Derive MARC bib');
          InventoryViewSource.contains('Indicator, Subfield codes not specified');

          // Verify field 983 retained the specified values (indicators 1 2 and subfields $a $b)
          InventoryViewSource.contains('983');
          InventoryViewSource.contains('Local field with local indicator');
          InventoryViewSource.contains('and subfield');
        },
      );
    });
  });
});
