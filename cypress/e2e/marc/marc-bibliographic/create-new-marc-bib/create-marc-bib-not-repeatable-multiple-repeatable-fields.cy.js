/* eslint-disable no-unused-expressions */
import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import {
  getBibliographicSpec,
  findStandardField,
  findLocalField,
  generateTestFieldData,
} from '../../../../support/api/specifications-helper';
import { INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tag010: '010',
          tag600: '600',
          tag980: '980',
          tag981: '981',
          tag008: '008',
        },
        instanceTitle:
          'AT_C514980_Create MARC bib with not-repeatable / multiple repeatable fields (Standard and Local)',
        fieldContents: {
          tag010Value: '$a n12345',
          tag600Value1: '$a Repeatable subject 1',
          tag600Value2: '$a Repeatable subject 2',
          tag980Value: '$a Not-repeatable local',
          tag981Value1: '$a Repeatable local 1st',
          tag981Value2: '$a Repeatable local 2nd',
        },
        successMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
        userProperties: {},
      };

      let specId;
      let field010;
      let field600;
      let field980Id;
      let field981Id;
      let createdInstanceId;

      before('Create user and configure validation rules', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getBibliographicSpec().then((bibSpec) => {
            specId = bibSpec.id;

            cy.getSpecificationFields(specId).then((response) => {
              field010 = findStandardField(response.body.fields, testData.tags.tag010);
              expect(field010, 'Standard field 010 exists').to.exist;

              field600 = findStandardField(response.body.fields, testData.tags.tag600);
              expect(field600, 'Standard field 600 exists').to.exist;

              const existingField980 = findLocalField(response.body.fields, testData.tags.tag980);
              if (existingField980) {
                cy.deleteSpecificationField(existingField980.id, false);
              }

              const field980Data = generateTestFieldData('C514980', {
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

              const field981Data = generateTestFieldData('C514980', {
                tag: testData.tags.tag981,
                label: 'Repeatable_Local_Field',
                scope: 'local',
                repeatable: true,
                required: false,
              });

              cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
                field981Id = fieldResp.body.id;
              });
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete created instance and restore validation rules', () => {
        cy.getAdminToken();

        if (createdInstanceId) {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        }

        if (field980Id) {
          cy.deleteSpecificationField(field980Id, false);
        }

        if (field981Id) {
          cy.deleteSpecificationField(field981Id, false);
        }

        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C514980 Create MARC bib record with not-repeatable / multiple repeatable fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514980', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "New MARC bibliographic record"
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/New .*MARC bib record/);

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 3: Select any values from the dropdowns of "008" field which are highlighted in red
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          // Step 4: Add "245" field
          QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${testData.instanceTitle}`);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag245, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag245, '\\', 1);

          // Step 5: Add multiple repeatable fields (Standard and Local) and 1 not repeatable field
          MarcAuthority.addNewField(4, testData.tags.tag010, testData.fieldContents.tag010Value);
          MarcAuthority.addNewField(5, testData.tags.tag600, testData.fieldContents.tag600Value1);
          MarcAuthority.addNewField(6, testData.tags.tag600, testData.fieldContents.tag600Value2);
          MarcAuthority.addNewField(7, testData.tags.tag980, testData.fieldContents.tag980Value);
          MarcAuthority.addNewField(8, testData.tags.tag981, testData.fieldContents.tag981Value1);
          MarcAuthority.addNewField(9, testData.tags.tag981, testData.fieldContents.tag981Value2);

          // Step 6: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(including(testData.successMessage));
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          InventoryInstance.getId().then((id) => {
            createdInstanceId = id;
          });
        },
      );
    });
  });
});
