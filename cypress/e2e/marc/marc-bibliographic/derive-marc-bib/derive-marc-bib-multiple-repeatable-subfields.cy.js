import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  findStandardField,
  validateApiResponse,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        importedMarcFile: 'C515001MarcBib.mrc',
        fileName: `C515001testMarcFile${getRandomPostfix()}.mrc`,
        jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tags: {
          tag245: '245',
          tag100: '100',
          tag985: '985',
        },
        fieldContents: {
          tag100:
            '$a Contributor name $e Repeatable Standard 1 $x Repeatable Appended 1 $e Repeatable Standard 2 $x Repeatable Appended 2',
          tag985: '$a First repeatable subfield $a Second repeatable subfield',
        },
        indicators: {
          tag100FirstIndicator: '1',
          tag100SecondIndicator: '1',
          tag985FirstIndicator: '\\',
          tag985SecondIndicator: '\\',
        },
        successMessage: 'successfully saved',
      };

      const requiredPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.specificationStorageGetSpecificationFields.gui,
        Permissions.specificationStorageCreateSpecificationField.gui,
        Permissions.specificationStorageGetSpecificationFieldSubfields.gui,
        Permissions.specificationStorageCreateSpecificationFieldSubfield.gui,
      ];

      let user;
      let importedInstanceId;
      let derivedInstanceId;
      let bibSpecId;
      let field100SubfieldXId;
      let localField985Id;

      before('Setup test data and validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser(requiredPermissions).then((createdUser) => {
          user = createdUser;

          getBibliographicSpec().then((bibSpec) => {
            bibSpecId = bibSpec.id;

            cy.getSpecificationFields(bibSpecId).then((response) => {
              validateApiResponse(response, 200);

              const field100 = findStandardField(response.body.fields, testData.tags.tag100);
              // eslint-disable-next-line no-unused-expressions
              expect(field100, 'Field 100 exists').to.exist;

              cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                validateApiResponse(subfieldsResp, 200);
              });

              const subfieldXPayload = {
                code: 'x',
                label: 'AT_C515001_Subfield_x_repeatable',
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
            });

            cy.deleteSpecificationFieldByTag(bibSpecId, testData.tags.tag985, false);

            const field985Payload = {
              tag: testData.tags.tag985,
              label: 'AT_C515001_Local_Field_985',
              url: 'http://www.example.org/field985.html',
              repeatable: true,
              required: false,
              deprecated: false,
              scope: 'local',
            };

            cy.createSpecificationField(bibSpecId, field985Payload).then((fieldResp) => {
              validateApiResponse(fieldResp, 201);
              localField985Id = fieldResp.body.id;

              const subfieldAPayload = {
                code: 'a',
                label: 'AT_C515001_Subfield_a_repeatable',
                repeatable: true,
                required: false,
                deprecated: false,
                scope: 'local',
              };

              cy.createSpecificationFieldSubfield(localField985Id, subfieldAPayload).then(
                (subfieldResp) => {
                  validateApiResponse(subfieldResp, 201);

                  DataImport.uploadFileViaApi(
                    testData.importedMarcFile,
                    testData.fileName,
                    testData.jobProfile,
                  ).then((response) => {
                    importedInstanceId = response[0].instance.id;

                    cy.login(user.username, user.password, {
                      path: TopMenu.inventoryPath,
                      waiter: InventoryInstances.waitContentLoading,
                    });
                  });
                },
              );
            });
          });
        });
      });

      after('Delete user, instances, and cleanup validation rules', () => {
        cy.getAdminToken();

        if (importedInstanceId) {
          InventoryInstance.deleteInstanceViaApi(importedInstanceId);
        }
        if (derivedInstanceId) {
          InventoryInstance.deleteInstanceViaApi(derivedInstanceId);
        }

        if (field100SubfieldXId) {
          cy.deleteSpecificationFieldSubfield(field100SubfieldXId, false);
        }
        if (localField985Id) {
          cy.deleteSpecificationField(localField985Id, false);
        }

        if (user) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C515001 Derive MARC bib record which has multiple repeatable standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'C515001', 'spitfire', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "Derive new MARC bibliographic record" option
          InventoryInstances.searchByTitle(importedInstanceId);
          InventoryInstances.selectInstanceById(importedInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(/Derive a new MARC bib record/);

          // Step 2: Add Standard "100" field with multiple repeatable standard and appended Subfield codes
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

          // Step 3: Add Local "985" field with multiple repeatable Subfield codes
          MarcAuthority.addNewField(5, testData.tags.tag985, testData.fieldContents.tag985);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag985,
            testData.indicators.tag985FirstIndicator,
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag985,
            testData.indicators.tag985SecondIndicator,
            1,
          );

          // Step 4: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.waitLoading();

          InventoryInstance.getId().then((id) => {
            derivedInstanceId = id;
          });

          cy.url().then((url) => {
            const currentInstanceId = url.split('/').pop();
            expect(currentInstanceId, 'Derived instance has different ID').to.not.equal(
              importedInstanceId,
            );
          });
        },
      );
    });
  });
});
