import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findLocalField,
  generateTestFieldData,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C514982';
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag245: '245',
        tag600: '600',
        tag980: '980',
        tag981: '981',
        field010Content: '$a n12345',
        field600Content1: '$a Repeatable subject 1',
        field600Content2: '$a Repeatable subject 2',
        field980Content: '$a Not-repeatable local',
        field981Content1: '$a Repeatable local 1st',
        field981Content2: '$a Repeatable local 2nd',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix}`,
          indicators: ['1', '1'],
        },
      ];

      let specId;
      let createdInstanceId;
      let user;
      let field980Id;
      let field981Id;

      before('Sync specification storage and get bibSpecId', () => {
        cy.getAdminToken();
        getBibliographicSpec().then((bibSpec) => {
          specId = bibSpec.id;
          cy.syncSpecifications(specId);
        });
      });

      after('Delete user, instance and restore validation rules', () => {
        cy.getAdminToken();
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        // Delete local fields 980 and 981
        if (field980Id) cy.deleteSpecificationField(field980Id, false);
        if (field981Id) cy.deleteSpecificationField(field981Id, false);
        cy.syncSpecifications(specId);
      });

      it(
        'C514982 Update MARC bib record with not-repeatable / multiple repeatable fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514982', 'nonParallel'] },
        () => {
          cy.then(() => {
            // Create user and MARC bib FIRST (before setting up validation rules)
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              toggleAllUndefinedValidationRules(specId, { enable: false });

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceIdValue) => {
                  createdInstanceId = instanceIdValue;
                },
              );
            });
          })
            .then(() => {
              // NOW setup validation rules AFTER bib is created
              cy.getSpecificationFields(specId).then((response) => {
                // Delete existing local field 980 if it exists
                const existingField980 = findLocalField(response.body.fields, testData.tag980);
                if (existingField980) {
                  cy.deleteSpecificationField(existingField980.id, false);
                }

                // Create local field 980 as not repeatable
                const field980Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag980,
                  label: `Not_Repeatable_Local_Field_${randomPostfix}`,
                  scope: 'local',
                  repeatable: false,
                  required: false,
                });

                cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                  field980Id = fieldResp.body.id;
                });

                // Delete existing local field 981 if it exists
                const existingField981 = findLocalField(response.body.fields, testData.tag981);
                if (existingField981) {
                  cy.deleteSpecificationField(existingField981.id, false);
                }

                // Create local field 981 as repeatable
                const field981Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag981,
                  label: `Repeatable_Local_Field_${randomPostfix}`,
                  scope: 'local',
                  repeatable: true,
                  required: false,
                });

                cy.createSpecificationField(specId, field981Data, false).then((fieldResp) => {
                  field981Id = fieldResp.body.id;
                });
              });
            })
            .then(() => {
              // Login and navigate to inventory
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            })
            .then(() => {
              // Step 1: Navigate to the created instance and open edit MARC bib
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();

              // Click Actions → Edit MARC bibliographic record
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Add multiple repeatable fields and not repeatable fields
              // Add 010 field (not repeatable standard)
              QuickMarcEditor.addNewField(testData.tag010, testData.field010Content, 4);
              QuickMarcEditor.verifyTagValue(5, testData.tag010);
              QuickMarcEditor.checkContent(testData.field010Content, 5);

              // Add 600 field #1 (repeatable standard)
              QuickMarcEditor.addNewField(testData.tag600, testData.field600Content1, 5);
              QuickMarcEditor.verifyTagValue(6, testData.tag600);
              QuickMarcEditor.checkContent(testData.field600Content1, 6);

              // Add 600 field #2 (repeatable standard)
              QuickMarcEditor.addNewField(testData.tag600, testData.field600Content2, 6);
              QuickMarcEditor.verifyTagValue(7, testData.tag600);
              QuickMarcEditor.checkContent(testData.field600Content2, 7);

              // Add 980 field (not repeatable local)
              QuickMarcEditor.addNewField(testData.tag980, testData.field980Content, 7);
              QuickMarcEditor.verifyTagValue(8, testData.tag980);
              QuickMarcEditor.checkContent(testData.field980Content, 8);

              // Add 981 field #1 (repeatable local)
              QuickMarcEditor.addNewField(testData.tag981, testData.field981Content1, 8);
              QuickMarcEditor.verifyTagValue(9, testData.tag981);
              QuickMarcEditor.checkContent(testData.field981Content1, 9);

              // Add 981 field #2 (repeatable local)
              QuickMarcEditor.addNewField(testData.tag981, testData.field981Content2, 9);
              QuickMarcEditor.verifyTagValue(10, testData.tag981);
              QuickMarcEditor.checkContent(testData.field981Content2, 10);

              // Step 3: Click "Save & keep editing", verify success
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.checkButtonsDisabled();

              // Verify all changes were saved
              QuickMarcEditor.verifyTagValue(5, testData.tag010);
              QuickMarcEditor.checkContent(testData.field010Content, 5);
              QuickMarcEditor.verifyTagValue(6, testData.tag600);
              QuickMarcEditor.checkContent(testData.field600Content1, 6);
              QuickMarcEditor.verifyTagValue(7, testData.tag600);
              QuickMarcEditor.checkContent(testData.field600Content2, 7);
              QuickMarcEditor.verifyTagValue(8, testData.tag980);
              QuickMarcEditor.checkContent(testData.field980Content, 8);
              QuickMarcEditor.verifyTagValue(9, testData.tag981);
              QuickMarcEditor.checkContent(testData.field981Content1, 9);
              QuickMarcEditor.verifyTagValue(10, testData.tag981);
              QuickMarcEditor.checkContent(testData.field981Content2, 10);
            });
        },
      );
    });
  });
});
