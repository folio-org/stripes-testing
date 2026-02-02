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
          tag980: '980',
          tag008: '008',
        },
        fieldContents: {
          tag245Value: '$a Create MARC bib with multiple not-repeatable "Local" fields',
          tag980FirstValue: '$a First not-repeatable field',
          tag980SecondValue: '$a Second not-repeatable field',
        },
        errorMessages: {
          fieldNonRepeatable: 'Field is non-repeatable.',
          validationToast:
            'Please scroll to view the entire record. Resolve issues as needed and save to revalidate the record.',
        },
        userProperties: {},
      };

      let specId;
      let field980Id;

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
              const existingField980 = findLocalField(response.body.fields, testData.tags.tag980);
              if (existingField980) {
                cy.deleteSpecificationField(existingField980.id, false);
              }

              const field980Data = generateTestFieldData('C552354', {
                tag: testData.tags.tag980,
                label: 'Not_Repeatable_Local_Field',
                scope: 'local',
                repeatable: false,
                required: false,
              });

              cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                field980Id = fieldResp.body.id;
              });
            });
          });

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete validation rules and user', () => {
        cy.getAdminToken();

        if (field980Id) {
          cy.deleteSpecificationField(field980Id, false);
        }

        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C552354 Cannot create MARC bib record with multiple not-repeatable "Local" fields (spitfire)',
        { tags: ['criticalPath', 'C552354', 'spitfire', 'nonParallel'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "New MARC bibliographic record"
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/Create a new .*MARC bib record/);

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 3: Select any values from the dropdowns of "008" field which are highlighted in red
          QuickMarcEditor.checkDropdownMarkedAsInvalid(
            testData.tags.tag008,
            INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
            false,
          );

          // Step 4: Add "245" field
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            testData.fieldContents.tag245Value,
          );
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag245, '\\', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag245, '\\', 1);

          // Step 5: Add multiple not-repeatable Local fields
          MarcAuthority.addNewField(
            4,
            testData.tags.tag980,
            testData.fieldContents.tag980FirstValue,
          );
          MarcAuthority.addNewField(
            5,
            testData.tags.tag980,
            testData.fieldContents.tag980SecondValue,
          );

          // Step 6: Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(6, testData.errorMessages.fieldNonRepeatable);
          QuickMarcEditor.verifyValidationCallout(0, 1);
          QuickMarcEditor.checkCallout(including(testData.errorMessages.validationToast));
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
        },
      );
    });
  });
});
