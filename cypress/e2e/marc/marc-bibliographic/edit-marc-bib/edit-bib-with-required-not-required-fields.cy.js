import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getBibliographicSpec,
  findStandardField,
  findLocalField,
  generateTestFieldData,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C514975';
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag245: '245',
        tag600: '600',
        tag700: '700',
        tag980: '980',
        tag981: '981',
        originalTitle: `AT_${testCaseId}_MarcBibInstance_${randomPostfix}`,
        updatedTitle: `AT_${testCaseId}_MarcBibInstance_${randomPostfix} test`,
        field600Content: '$a Subject Heading',
        field700Content: '$a Additional Author',
        field980Content: '$a Required_Local_Field',
        field981Content: '$a Not_Required_Local_Field',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.originalTitle}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag600,
          content: testData.field600Content,
          indicators: ['\\', '0'],
        },
        {
          tag: testData.tag700,
          content: testData.field700Content,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag980,
          content: testData.field980Content,
        },
        {
          tag: testData.tag981,
          content: testData.field981Content,
        },
      ];

      let specId;
      let createdInstanceId;
      let user;
      let field700;
      let field700Id;
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
        // Restore field 700 to not required
        if (field700Id) {
          cy.getSpecificationFields(specId).then((resp) => {
            const field = findStandardField(resp.body.fields, testData.tag700);
            if (field) {
              cy.updateSpecificationField(field700Id, {
                ...field,
                required: false,
              });
            }
          });
        }
        // Delete local fields 980 and 981
        if (field980Id) cy.deleteSpecificationField(field980Id, false);
        if (field981Id) cy.deleteSpecificationField(field981Id, false);
        cy.syncSpecifications(specId);
      });

      it(
        'C514975 Edit MARC bib record with required / not required fields (Standard and Local) (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514975', 'nonParallel'] },
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
                // Get field 700 and mark it as required
                field700 = findStandardField(response.body.fields, testData.tag700);
                field700Id = field700.id;

                cy.updateSpecificationField(field700Id, {
                  ...field700,
                  required: true,
                });

                // Delete existing local field 980 if it exists
                const existingField980 = findLocalField(response.body.fields, testData.tag980);
                if (existingField980) {
                  cy.deleteSpecificationField(existingField980.id, false);
                }

                // Create local field 980 as required
                const field980Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag980,
                  label: `Required_Local_Field_${randomPostfix}`,
                  scope: 'local',
                  repeatable: true,
                  required: true,
                });

                cy.createSpecificationField(specId, field980Data, false).then((fieldResp) => {
                  field980Id = fieldResp.body.id;
                });

                // Delete existing local field 981 if it exists
                const existingField981 = findLocalField(response.body.fields, testData.tag981);
                if (existingField981) {
                  cy.deleteSpecificationField(existingField981.id, false);
                }

                // Create local field 981 as not required
                const field981Data = generateTestFieldData(testCaseId, {
                  tag: testData.tag981,
                  label: `Not_Required_Local_Field_${randomPostfix}`,
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
              InventoryInstances.selectInstance();
              InventoryInstance.waitLoading();

              // Click Actions → Edit MARC bibliographic record
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Verify required/not required fields exist
              QuickMarcEditor.checkContentByTag(testData.tag600, testData.field600Content);
              QuickMarcEditor.checkContentByTag(testData.tag700, testData.field700Content);
              QuickMarcEditor.checkContentByTag(testData.tag980, testData.field980Content);
              QuickMarcEditor.checkContentByTag(testData.tag981, testData.field981Content);

              // Step 3: Update field 245 (add "test")
              QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.updatedTitle}`);

              // Step 4: Click "Save & keep editing", verify success
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.checkButtonsDisabled();
              // Verify the change was saved
              QuickMarcEditor.checkContentByTag(testData.tag245, `$a ${testData.updatedTitle}`);
            });
        },
      );
    });
  });
});
