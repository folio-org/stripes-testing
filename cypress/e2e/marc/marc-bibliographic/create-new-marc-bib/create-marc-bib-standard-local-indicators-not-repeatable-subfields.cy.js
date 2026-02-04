import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findSystemField,
  findLocalField,
  validateApiResponse,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tag981: '981',
          tagLDR: 'LDR',
          tag008: '008',
        },
        fieldContents: {
          tag245Content: 'Create MARC bib',
          tag245SubfieldL: 'which has standard and appended Indicator, Subfield codes',
          tag981Content: 'Local field with local indicator and not repeatable subfield',
        },
        indicators: {
          tag245FirstIndicator: '2',
          tag245SecondIndicator: '0',
          tag981FirstIndicator: '1',
          tag981SecondIndicator: '1',
        },
      };

      const requiredPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.specificationStorageGetSpecificationFields.gui,
        Permissions.specificationStorageCreateSpecificationField.gui,
        Permissions.specificationStorageGetSpecificationFieldIndicators.gui,
        Permissions.specificationStorageCreateSpecificationFieldIndicator.gui,
        Permissions.specificationStorageGetSpecificationIndicatorCodes.gui,
        Permissions.specificationStorageCreateSpecificationIndicatorCode.gui,
        Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
        Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
      ];

      let user;
      let createdInstanceId;
      let bibSpecId;
      let localField981Id;
      let field245SubfieldLId;

      before('Create test user and setup validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser(requiredPermissions).then((createdUser) => {
          user = createdUser;

          // Get MARC bibliographic specification
          getBibliographicSpec().then((bibSpec) => {
            bibSpecId = bibSpec.id;

            // First, get existing fields and check for field 245
            cy.getSpecificationFields(bibSpecId).then((response) => {
              validateApiResponse(response, 200);

              // Find field 245 (try standard first, then system)
              const field245 = findSystemField(response.body.fields, testData.tags.tag245);
              // eslint-disable-next-line no-unused-expressions
              expect(field245, 'Field 245 exists').to.exist;

              // Setup appended indicator code '2' for field 245, indicator 1
              cy.getSpecificationFieldIndicators(field245.id).then((indicatorsResp) => {
                validateApiResponse(indicatorsResp, 200);
                const indicator1 = indicatorsResp.body.indicators.find((ind) => ind.order === 1);
                // eslint-disable-next-line no-unused-expressions
                expect(indicator1, 'Field 245 Indicator 1 exists').to.exist;

                // Create appended indicator code '2' for indicator 1
                const indicatorCodePayload = {
                  code: testData.indicators.tag245FirstIndicator,
                  label: `AT_C514905_Appended_Indicator_Code_${testData.indicators.tag245FirstIndicator}`,
                  deprecated: false,
                };

                cy.createSpecificationIndicatorCode(indicator1.id, indicatorCodePayload, false);
              });

              // Setup not repeatable subfield 'l' for field 245
              const subfieldLPayload = {
                code: 'l',
                label: 'AT_C514905_Subfield_l_not_repeatable',
                repeatable: false,
                required: false,
                deprecated: false,
                scope: 'local',
              };

              cy.createSpecificationFieldSubfield(field245.id, subfieldLPayload, false).then(
                (subfieldResp) => {
                  if (subfieldResp.status === 201) {
                    field245SubfieldLId = subfieldResp.body.id;
                  }
                },
              );

              // Check if local field 981 already exists, delete if present
              const existingField981 = findLocalField(response.body.fields, testData.tags.tag981);
              if (existingField981) {
                cy.deleteSpecificationField(existingField981.id, false);
              }
            });

            // Create local field 981 with indicators and subfield
            const field981Payload = {
              tag: testData.tags.tag981,
              label: 'AT_C514905_Local_Field_981',
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
                label: 'AT_C514905_Field_981_Indicator_1',
              };

              cy.createSpecificationFieldIndicator(localField981Id, indicator1Payload).then(
                (ind1Resp) => {
                  validateApiResponse(ind1Resp, 201);
                  // Create indicator code '1' for indicator 1
                  const indicatorCode1Payload = {
                    code: testData.indicators.tag981FirstIndicator,
                    label: `AT_C514905_Indicator_Code_${testData.indicators.tag981FirstIndicator}`,
                    deprecated: false,
                  };

                  cy.createSpecificationIndicatorCode(ind1Resp.body.id, indicatorCode1Payload);
                },
              );

              // Create indicator 2 for field 981
              const indicator2Payload = {
                order: 2,
                label: 'AT_C514905_Field_981_Indicator_2',
              };

              cy.createSpecificationFieldIndicator(localField981Id, indicator2Payload).then(
                (ind2Resp) => {
                  validateApiResponse(ind2Resp, 201);
                  // Create indicator code '1' for indicator 2
                  const indicatorCode2Payload = {
                    code: testData.indicators.tag981SecondIndicator,
                    label: `AT_C514905_Indicator_Code_${testData.indicators.tag981SecondIndicator}`,
                    deprecated: false,
                  };

                  cy.createSpecificationIndicatorCode(ind2Resp.body.id, indicatorCode2Payload);
                },
              );

              // Create not repeatable subfield 'a' for field 981
              const subfieldAPayload = {
                code: 'a',
                label: 'AT_C514905_Subfield_a_not_repeatable',
                repeatable: false,
                required: false,
                deprecated: false,
                scope: 'local',
              };

              cy.createSpecificationFieldSubfield(localField981Id, subfieldAPayload).then(
                (subfieldResp) => {
                  validateApiResponse(subfieldResp, 201);
                  // Login with created user after all validation rules are set up
                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                },
              );
            });
          });
        });
      });

      after('Delete user, instance, and cleanup validation rules', () => {
        cy.getAdminToken();

        // Delete created instance
        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }
        if (field245SubfieldLId) {
          cy.deleteSpecificationFieldSubfield(field245SubfieldLId, false);
        }
        if (localField981Id) {
          cy.deleteSpecificationField(localField981Id, false);
        }

        // Delete user
        Users.deleteViaApi(user.userId);
      });

      it(
        'C514905 Create MARC bib record with standard / local indicators, not repeatable subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514905'] },
        () => {
          // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.check008FieldContent();

          // Step 4: Add "245" field with standard and appended Indicator and Subfield codes
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            `$a ${testData.fieldContents.tag245Content} $l ${testData.fieldContents.tag245SubfieldL}`,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.indicators.tag245FirstIndicator,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag245,
            testData.indicators.tag245SecondIndicator,
            1,
          );

          // Verify 245 field has correct indicators and content
          QuickMarcEditor.verifyIndicatorValue(
            testData.tags.tag245,
            testData.indicators.tag245FirstIndicator,
            0,
          );
          QuickMarcEditor.verifyIndicatorValue(
            testData.tags.tag245,
            testData.indicators.tag245SecondIndicator,
            1,
          );

          // Step 5: Add Local field by clicking on "+" icon
          MarcAuthority.addNewField(
            4,
            testData.tags.tag981,
            `$a ${testData.fieldContents.tag981Content}`,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag981,
            testData.indicators.tag981FirstIndicator,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag981,
            testData.indicators.tag981SecondIndicator,
            1,
          );

          // Verify 981 field has correct indicators
          QuickMarcEditor.verifyIndicatorValue(
            testData.tags.tag981,
            testData.indicators.tag981FirstIndicator,
            0,
          );
          QuickMarcEditor.verifyIndicatorValue(
            testData.tags.tag981,
            testData.indicators.tag981SecondIndicator,
            1,
          );

          // Step 6: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();

          // Store instance ID for cleanup
          InventoryInstance.getId().then((id) => {
            createdInstanceId = id;
          });

          InventoryInstance.checkInstanceTitle(testData.fieldContents.tag245Content);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(
            `\t${testData.tags.tag245}\t${testData.indicators.tag245FirstIndicator} ${testData.indicators.tag245SecondIndicator}\t$a ${testData.fieldContents.tag245Content} $l ${testData.fieldContents.tag245SubfieldL}`,
          );
          InventoryViewSource.contains(
            `\t${testData.tags.tag981}\t${testData.indicators.tag981FirstIndicator} ${testData.indicators.tag981SecondIndicator}\t$a ${testData.fieldContents.tag981Content}`,
          );
        },
      );
    });
  });
});
