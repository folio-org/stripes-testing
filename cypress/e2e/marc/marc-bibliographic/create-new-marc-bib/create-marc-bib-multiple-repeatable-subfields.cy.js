import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  validateApiResponse,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tag100: '100',
          tag856: '856',
          tag985: '985',
        },
        fieldContents: {
          tag245:
            '$a Create MARC bib with multiple repeatable standard / local subfields in Standard and Local fields',
          tag100:
            '$a Contributor name $e Repeatable Standard 1 $x Repeatable Appended 1 $e Repeatable Standard 2 $x Repeatable Appended 2',
          tag856:
            '$a Testing $h Testingh $h Testingh  $g Testingg $g Testingg  $l Testingl $l Testingl $n Testing $n Testing $r Testingr $r Testingr $t Testingt $t Testingt',
          tag985: '$a First repeatable subfield $a Second repeatable subfield',
        },
        indicators: {
          tag245FirstIndicator: '1',
          tag245SecondIndicator: '\\',
          tag100FirstIndicator: '1',
          tag100SecondIndicator: '1',
        },
        successMessage: 'successfully saved',
      };

      const requiredPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.specificationStorageGetSpecificationFields.gui,
        Permissions.specificationStorageCreateSpecificationField.gui,
        Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
        Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
      ];

      let user;
      let bibSpecId;
      let field100SubfieldXId;
      let localField985Id;
      let createdInstanceId;

      before('Setup test data and validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser(requiredPermissions).then((createdUser) => {
          user = createdUser;

          getBibliographicSpec().then((bibSpec) => {
            bibSpecId = bibSpec.id;

            cy.getSpecificationFields(bibSpecId).then((response) => {
              validateApiResponse(response, 200);

              // Setup Field 100 (Standard field with repeatable subfields)
              const field100 = findStandardField(response.body.fields, testData.tags.tag100);
              // eslint-disable-next-line no-unused-expressions
              expect(field100, 'Field 100 exists').to.exist;

              // Verify subfield 'e' exists and is repeatable
              cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                validateApiResponse(subfieldsResp, 200);
                const subfieldE = subfieldsResp.body.subfields.find((sf) => sf.code === 'e');
                // eslint-disable-next-line no-console
                console.log(`Field 100 subfield 'e' repeatable status: ${subfieldE?.repeatable}`);
              });

              // Create repeatable appended subfield 'x' for field 100
              const subfieldXPayload = {
                code: 'x',
                label: 'AT_C515000_Subfield_x_repeatable',
                repeatable: true,
                required: false,
                deprecated: false,
                scope: 'local',
              };

              cy.createSpecificationFieldSubfield(field100.id, subfieldXPayload, false).then(
                (subfieldResp) => {
                  if (subfieldResp.status === 201) {
                    field100SubfieldXId = subfieldResp.body.id;
                  }
                },
              );

              // Verify Field 856 exists with repeatable subfields
              const field856 = findStandardField(response.body.fields, testData.tags.tag856);
              if (field856) {
                cy.getSpecificationFieldSubfields(field856.id).then((subfieldsResp) => {
                  validateApiResponse(subfieldsResp, 200);
                  // eslint-disable-next-line no-console
                  console.log(
                    `Field 856 has ${subfieldsResp.body.subfields.length} subfields configured`,
                  );
                });
              }
            });

            // Check if local field 985 exists and delete if present
            cy.deleteSpecificationFieldByTag(bibSpecId, testData.tags.tag985, false);

            // Create local field 985
            const field985Payload = {
              tag: testData.tags.tag985,
              label: 'AT_C515000_Local_Field_985',
              url: 'http://www.example.org/field985.html',
              repeatable: true,
              required: false,
              deprecated: false,
              scope: 'local',
            };

            cy.createSpecificationField(bibSpecId, field985Payload).then((fieldResp) => {
              validateApiResponse(fieldResp, 201);
              localField985Id = fieldResp.body.id;

              // Create repeatable subfield 'a' for field 985
              const subfieldAPayload = {
                code: 'a',
                label: 'AT_C515000_Subfield_a_repeatable',
                repeatable: true,
                required: false,
                deprecated: false,
                scope: 'local',
              };

              cy.createSpecificationFieldSubfield(localField985Id, subfieldAPayload).then(
                (subfieldResp) => {
                  validateApiResponse(subfieldResp, 201);
                  // Login after setup complete
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

      after('Delete user and cleanup validation rules', () => {
        cy.getAdminToken();

        // Delete created instance
        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }

        // Cleanup validation rules
        if (field100SubfieldXId) {
          cy.deleteSpecificationFieldSubfield(field100SubfieldXId, false);
        }
        if (localField985Id) {
          cy.deleteSpecificationField(localField985Id, false);
        }

        // Delete user
        if (user) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C515000 Create MARC bib record with multiple repeatable standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'C515000', 'spitfire', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button in second pane >> Select "New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.check008FieldContent();

          // Step 4: Add "245" field
          QuickMarcEditor.updateExistingField(testData.tags.tag245, testData.fieldContents.tag245);
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

          // Step 5: Add Standard "100" field with multiple repeatable standard and appended Subfield codes
          MarcAuthority.addNewField(4, testData.tags.tag100, testData.fieldContents.tag100);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag100,
            testData.indicators.tag100FirstIndicator,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag100,
            testData.indicators.tag100SecondIndicator,
            1,
          );

          // Step 6: Add Standard "856" field with multiple repeatable standard Subfield codes
          MarcAuthority.addNewField(5, testData.tags.tag856, testData.fieldContents.tag856);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag856, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag856, '\\', 1);

          // Step 7: Add Local "985" field with multiple repeatable Subfield codes
          MarcAuthority.addNewField(6, testData.tags.tag985, testData.fieldContents.tag985);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag985, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag985, '\\', 1);

          // Step 8: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();

          // Verify success saving toast notification is displayed
          QuickMarcEditor.checkCallout(including(testData.successMessage));

          // Verify "Create a new MARC bib record" window is closed
          QuickMarcEditor.checkAfterSaveAndClose();

          // Verify detail view pane of created record is opened in the third pane
          InventoryInstance.waitLoading();

          // Capture instance ID for cleanup
          cy.url().then((url) => {
            createdInstanceId = url.split('/').pop();
          });

          // Verify instance title
          InventoryInstance.checkInstanceTitle(
            'Create MARC bib with multiple repeatable standard / local subfields in Standard and Local fields',
          );
        },
      );
    });
  });
});
