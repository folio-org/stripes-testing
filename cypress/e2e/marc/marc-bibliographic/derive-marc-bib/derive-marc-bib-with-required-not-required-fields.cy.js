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
  findLocalField,
  generateTestFieldData,
  validateApiResponse,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const testData = {
        importedMarcFile: 'C514974MarcBib.mrc',
        fileName: `C514974_testMarcFile_${getRandomPostfix()}.mrc`,
        jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tags: {
          tag245: '245',
          tag600: '600',
          tag700: '700',
          tag800: '800',
          tag980: '980',
          tag981: '981',
        },
        fieldContents: {
          tag600: '$a Standard Not Required Field',
          tag700: '$a Standard Required Field',
          tag800: '$a Another Standard Required Field',
          tag980: '$a Local Required Field',
          tag981: '$a Local Not Required Field',
        },
        indicators: {
          default: ['\\', '\\'],
        },
        updatedField245: '$a AT_C514974_Derived_MARC_bib test',
      };

      const requiredPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        Permissions.moduleDataImportEnabled.gui,
      ];

      let user;
      let importedInstanceId;
      let derivedInstanceId;
      let specId;
      let field600;
      let field600Id;
      let originalField600Required;
      let field700;
      let field700Id;
      let originalField700Required;
      let field800;
      let field800Id;
      let originalField800Required;
      let field980Id;
      let field981Id;

      before('Setup test data and validation rules', () => {
        cy.getAdminToken();
        cy.createTempUser(requiredPermissions).then((createdUser) => {
          user = createdUser;

          getBibliographicSpec().then((bibSpec) => {
            specId = bibSpec.id;

            cy.getSpecificationFields(specId).then((response) => {
              validateApiResponse(response, 200);

              field600 = findStandardField(response.body.fields, testData.tags.tag600);
              field600Id = field600.id;
              originalField600Required = field600.required;

              if (field600.required) {
                cy.updateSpecificationField(field600Id, {
                  ...field600,
                  required: false,
                });
              }

              field700 = findStandardField(response.body.fields, testData.tags.tag700);
              field700Id = field700.id;
              originalField700Required = field700.required;

              cy.updateSpecificationField(field700Id, {
                ...field700,
                required: true,
              });

              field800 = findStandardField(response.body.fields, testData.tags.tag800);
              field800Id = field800.id;
              originalField800Required = field800.required;

              cy.updateSpecificationField(field800Id, {
                ...field800,
                required: true,
              });

              const existingField980 = findLocalField(response.body.fields, testData.tags.tag980);
              if (existingField980) {
                cy.deleteSpecificationField(existingField980.id, false);
              }

              const field980Data = generateTestFieldData('C514974', {
                tag: testData.tags.tag980,
                label: 'Required_Local_Field',
                scope: 'local',
                repeatable: true,
                required: true,
              });

              cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                validateApiResponse(fieldResp, 201);
                field980Id = fieldResp.body.id;
              });

              const existingField981 = findLocalField(response.body.fields, testData.tags.tag981);
              if (existingField981) {
                cy.deleteSpecificationField(existingField981.id, false);
              }

              const field981Data = generateTestFieldData('C514974', {
                tag: testData.tags.tag981,
                label: 'Not_Required_Local_Field',
                scope: 'local',
                repeatable: true,
                required: false,
              });

              cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
                validateApiResponse(fieldResp, 201);
                field981Id = fieldResp.body.id;

                DataImport.uploadFileViaApi(
                  testData.importedMarcFile,
                  testData.fileName,
                  testData.jobProfile,
                ).then((uploadResponse) => {
                  importedInstanceId = uploadResponse[0].instance.id;

                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                  });
                });
              });
            });
          });
        });
      });

      after('Delete user, instances, and restore validation rules', () => {
        cy.getAdminToken();

        if (importedInstanceId) {
          InventoryInstance.deleteInstanceViaApi(importedInstanceId);
        }
        if (derivedInstanceId) {
          InventoryInstance.deleteInstanceViaApi(derivedInstanceId);
        }

        if (field600Id && originalField600Required !== undefined) {
          cy.getSpecificationFields(specId).then((resp) => {
            const field = findStandardField(resp.body.fields, testData.tags.tag600);
            if (field) {
              cy.updateSpecificationField(field600Id, {
                ...field,
                required: originalField600Required,
              });
            }
          });
        }

        if (field700Id && originalField700Required !== undefined) {
          cy.getSpecificationFields(specId).then((resp) => {
            const field = findStandardField(resp.body.fields, testData.tags.tag700);
            if (field) {
              cy.updateSpecificationField(field700Id, {
                ...field,
                required: originalField700Required,
              });
            }
          });
        }

        if (field800Id && originalField800Required !== undefined) {
          cy.getSpecificationFields(specId).then((resp) => {
            const field = findStandardField(resp.body.fields, testData.tags.tag800);
            if (field) {
              cy.updateSpecificationField(field800Id, {
                ...field,
                required: originalField800Required,
              });
            }
          });
        }

        if (field980Id) {
          cy.deleteSpecificationField(field980Id, false);
        }
        if (field981Id) {
          cy.deleteSpecificationField(field981Id, false);
        }

        if (user) {
          Users.deleteViaApi(user.userId);
        }
      });

      it(
        'C514974 Derive MARC bib record with required / not required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'C514974', 'spitfire', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "Derive new MARC bibliographic record" option
          InventoryInstances.searchByTitle(importedInstanceId);
          InventoryInstances.selectInstanceById(importedInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(/Derive a new MARC bib record/);

          // Step 2: Ensure required / not required fields (Standard and Local) exist in the record
          MarcAuthority.addNewField(4, testData.tags.tag600, testData.fieldContents.tag600);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag600,
            testData.indicators.default[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag600,
            testData.indicators.default[1],
            1,
          );

          MarcAuthority.addNewField(5, testData.tags.tag700, testData.fieldContents.tag700);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag700,
            testData.indicators.default[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag700,
            testData.indicators.default[1],
            1,
          );

          MarcAuthority.addNewField(6, testData.tags.tag800, testData.fieldContents.tag800);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag800,
            testData.indicators.default[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag800,
            testData.indicators.default[1],
            1,
          );

          MarcAuthority.addNewField(7, testData.tags.tag980, testData.fieldContents.tag980);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag980,
            testData.indicators.default[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag980,
            testData.indicators.default[1],
            1,
          );

          MarcAuthority.addNewField(8, testData.tags.tag981, testData.fieldContents.tag981);
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag981,
            testData.indicators.default[0],
            0,
          );
          QuickMarcEditor.updateIndicatorValue(
            testData.tags.tag981,
            testData.indicators.default[1],
            1,
          );

          // Step 3: Update field 245 by adding "test"
          QuickMarcEditor.updateExistingField(testData.tags.tag245, testData.updatedField245);

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
