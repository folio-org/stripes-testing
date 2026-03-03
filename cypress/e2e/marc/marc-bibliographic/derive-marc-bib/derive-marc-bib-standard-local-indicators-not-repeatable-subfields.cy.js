import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  findSystemField,
  findLocalField,
  validateApiResponse,
} from '../../../../support/api/specifications-helper';

/* eslint-disable no-unused-expressions */

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        importedMarcFile: 'C514907MarcBib.mrc',
        fileName: `C514907testMarcFile${getRandomPostfix()}.mrc`,
        jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tags: {
          tag245: '245',
          tag981: '981',
        },
        field245: {
          originalContent:
            'C514907 Edit MARC bib which has standard and appended Indicator, Subfield codes',
          subfieldL: 'appended subfield code value',
          newContent: 'C514907 Create MARC bib',
          newSubfieldL: 'which has standard and appended Indicator, Subfield codes',
          indicators: {
            first: '2',
            second: '0',
          },
        },
        field981: {
          content: 'Local field with local indicator and not repeatable subfield',
          indicators: {
            first: '1',
            second: '\\',
          },
        },
      };

      const requiredPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.specificationStorageGetSpecificationFields.gui,
        Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
        Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
        Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
        Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
        Permissions.specificationStorageCreateSpecificationField.gui,
        Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
      ];

      let user;
      let instanceId;
      let createdInstanceId;
      let bibSpecId;
      let field245SubfieldLId;
      let localField981Id;
      let field245IndicatorCodeId;

      before('Setup test data and validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser(requiredPermissions).then((createdUser) => {
          user = createdUser;

          getBibliographicSpec().then((bibSpec) => {
            bibSpecId = bibSpec.id;

            // Setup validation rules for field 245
            cy.getSpecificationFields(bibSpecId).then((response) => {
              validateApiResponse(response, 200);
              const field245 = findSystemField(response.body.fields, testData.tags.tag245);
              expect(field245, 'Field 245 exists').to.exist;

              // Add appended indicator code '2' for field 245, indicator 1
              cy.getSpecificationFieldIndicators(field245.id).then((indicatorsResp) => {
                validateApiResponse(indicatorsResp, 200);
                const indicator1 = indicatorsResp.body.indicators.find((ind) => ind.order === 1);
                expect(indicator1, 'Field 245 Indicator 1 exists').to.exist;

                const indicatorCodePayload = {
                  code: testData.field245.indicators.first,
                  label: `AT_C514907_Ind_Code_${testData.field245.indicators.first}`,
                  deprecated: false,
                };
                cy.createSpecificationIndicatorCode(
                  indicator1.id,
                  indicatorCodePayload,
                  false,
                ).then((resp) => {
                  field245IndicatorCodeId = resp.body.id;
                });
              });

              // Add non-repeatable subfield 'l' for field 245
              const subfieldLPayload = {
                code: 'l',
                label: 'AT_C514907_Subfield_l_not_repeatable',
                repeatable: false,
                required: false,
                deprecated: false,
                scope: 'local',
              };
              cy.createSpecificationFieldSubfield(field245.id, subfieldLPayload, false).then(
                (resp) => {
                  if (resp.status === 201) {
                    field245SubfieldLId = resp.body.id;
                  }
                },
              );

              // Check for existing local field 981, delete if present
              const existingField981 = findLocalField(response.body.fields, testData.tags.tag981);
              if (existingField981) {
                cy.deleteSpecificationField(existingField981.id, false);
              }
            });

            // Create local field 981 with indicators and subfield
            const field981Payload = {
              tag: testData.tags.tag981,
              label: 'AT_C514907_Local_Field_981',
              url: 'http://www.example.org/field981.html',
              repeatable: true,
              required: false,
              deprecated: false,
              scope: 'local',
            };

            cy.createSpecificationField(bibSpecId, field981Payload).then((fieldResp) => {
              validateApiResponse(fieldResp, 201);
              localField981Id = fieldResp.body.id;

              // Create indicator 1 for field 981
              const indicator1Payload = {
                order: 1,
                label: 'AT_C514907_Field_981_Indicator_1',
              };
              cy.createSpecificationFieldIndicator(localField981Id, indicator1Payload).then(
                (ind1Resp) => {
                  validateApiResponse(ind1Resp, 201);
                  const code1Payload = {
                    code: testData.field981.indicators.first,
                    label: `AT_C514907_Ind_Code_${testData.field981.indicators.first}`,
                    deprecated: false,
                  };
                  cy.createSpecificationIndicatorCode(ind1Resp.body.id, code1Payload);
                },
              );

              // Create indicator 2 for field 981
              const indicator2Payload = {
                order: 2,
                label: 'AT_C514907_Field_981_Indicator_2',
              };
              cy.createSpecificationFieldIndicator(localField981Id, indicator2Payload);

              // Create non-repeatable subfield 'a' for field 981
              const subfieldAPayload = {
                code: 'a',
                label: 'AT_C514907_Subfield_a_not_repeatable',
                repeatable: false,
                required: false,
                deprecated: false,
                scope: 'local',
              };
              cy.createSpecificationFieldSubfield(localField981Id, subfieldAPayload);
            });
          });

          // Import MARC file
          DataImport.uploadFileViaApi(
            testData.importedMarcFile,
            testData.fileName,
            testData.jobProfile,
          ).then((response) => {
            instanceId = response[0].instance.id;

            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete user, instance, and cleanup validation rules', () => {
        cy.getAdminToken();

        if (instanceId) {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        }
        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }
        if (field245IndicatorCodeId) {
          cy.deleteSpecificationIndicatorCode(field245IndicatorCodeId, false);
        }
        if (field245SubfieldLId) {
          cy.deleteSpecificationFieldSubfield(field245SubfieldLId, false);
        }
        if (localField981Id) {
          cy.deleteSpecificationField(localField981Id, false);
        }

        Users.deleteViaApi(user.userId);
      });

      it(
        'C514907 Derive MARC bib record with standard / local indicators, not repeatable subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514907', 'nonParallel'] },
        () => {
          // Step 1: Navigate to imported record and derive
          InventoryInstances.searchByTitle(instanceId);
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains('Derive a new MARC bib record');

          // Step 2: Update field 245 with standard and appended Indicator and Subfield codes
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.field245.newContent} $l ${testData.field245.newSubfieldL}`,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.field245.indicators.first,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.field245.indicators.second,
            1,
          );

          // Step 3: Add Local field 981 with local Indicator and Subfield codes
          MarcAuthority.addNewField(4, testData.tags.tag981, `$a ${testData.field981.content}`);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag981,
            testData.field981.indicators.first,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag981,
            testData.field981.indicators.second,
            1,
          );

          // Step 4: Save and verify
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();

          // Store derived instance ID for cleanup
          InventoryInstance.getId().then((id) => {
            createdInstanceId = id;
          });

          // Verify instance title
          InventoryInstance.checkInstanceTitle(testData.field245.newContent);

          // Verify in MARC source view
          InventoryInstance.viewSource();
          InventoryViewSource.contains(
            `\t${testData.tags.tag245}\t${testData.field245.indicators.first} ${testData.field245.indicators.second}\t$a ${testData.field245.newContent} $l ${testData.field245.newSubfieldL}`,
          );
          InventoryViewSource.contains(
            `\t${testData.tags.tag981}\t${testData.field981.indicators.first}  \t$a ${testData.field981.content}`,
          );
        },
      );
    });
  });
});
