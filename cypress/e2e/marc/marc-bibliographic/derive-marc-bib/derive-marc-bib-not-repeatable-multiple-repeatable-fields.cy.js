/* eslint-disable no-unused-expressions */
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
        importedMarcFile: 'C514981MarcBib.mrc',
        fileName: `C514981_testMarcFile_${getRandomPostfix()}.mrc`,
        jobProfile: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        tags: {
          tag010: '010',
          tag600: '600',
          tag980: '980',
          tag981: '981',
        },
        fieldContents: {
          tag010: '$a n12345',
          tag600Value1: '$a Repeatable subject 1',
          tag600Value2: '$a Repeatable subject 2',
          tag980: '$a Not-repeatable local',
          tag981Value1: '$a Repeatable local 1st',
          tag981Value2: '$a Repeatable local 2nd',
        },
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
      let field010;
      let field600;
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

              field010 = findStandardField(response.body.fields, testData.tags.tag010);
              expect(field010, 'Standard field 010 exists').to.exist;

              field600 = findStandardField(response.body.fields, testData.tags.tag600);
              expect(field600, 'Standard field 600 exists').to.exist;

              const existingField980 = findLocalField(response.body.fields, testData.tags.tag980);
              if (existingField980) {
                cy.deleteSpecificationField(existingField980.id, false);
              }

              const field980Data = generateTestFieldData('C514981', {
                tag: testData.tags.tag980,
                label: 'Not_Repeatable_Local_Field',
                scope: 'local',
                repeatable: false,
                required: false,
              });

              cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                field980Id = fieldResp.body.id;
              });

              const existingField981 = findLocalField(response.body.fields, testData.tags.tag981);
              if (existingField981) {
                cy.deleteSpecificationField(existingField981.id, false);
              }

              const field981Data = generateTestFieldData('C514981', {
                tag: testData.tags.tag981,
                label: 'Repeatable_Local_Field',
                scope: 'local',
                repeatable: true,
                required: false,
              });

              cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
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
        'C514981 Derive MARC bib record with not-repeatable / multiple repeatable fields (Standard and Local) (spitfire)',
        { tags: ['extendedPath', 'C514981', 'spitfire', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "Derive new MARC bibliographic record" option
          InventoryInstances.searchByTitle(importedInstanceId);
          InventoryInstances.selectInstanceById(importedInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(/Derive a new MARC bib record/);

          // Step 2: Add multiple repeatable fields (Standard and Local) and 1 not repeatable field
          MarcAuthority.addNewField(
            4,
            testData.tags.tag010,
            testData.fieldContents.tag010,
            '\\',
            '\\',
          );

          MarcAuthority.addNewField(
            5,
            testData.tags.tag600,
            testData.fieldContents.tag600Value1,
            '\\',
            '\\',
          );

          MarcAuthority.addNewField(
            6,
            testData.tags.tag600,
            testData.fieldContents.tag600Value2,
            '\\',
            '\\',
          );

          MarcAuthority.addNewField(
            7,
            testData.tags.tag980,
            testData.fieldContents.tag980,
            '\\',
            '\\',
          );

          MarcAuthority.addNewField(
            8,
            testData.tags.tag981,
            testData.fieldContents.tag981Value1,
            '\\',
            '\\',
          );

          MarcAuthority.addNewField(
            9,
            testData.tags.tag981,
            testData.fieldContents.tag981Value2,
            '\\',
            '\\',
          );

          // Step 3: Click on the "Save & close" button
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
