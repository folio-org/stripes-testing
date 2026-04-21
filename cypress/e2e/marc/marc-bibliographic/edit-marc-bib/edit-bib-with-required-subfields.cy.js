import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  findSystemField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C514948';
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag245: '245',
        localFieldTag: '981',
        standardRequiredSubfieldCode: 'a',
        appendedRequiredSubfieldCode: 'l',
        localRequiredSubfieldCode: 'a',
        local1stIndicatorCode: '1',
        local2ndIndicatorCode: '0',
        field245ContentWithRequired: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix} $l Subfield codes`,
        localFieldContentWithRequired: '$a Has required Subfield code',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: testData.field245ContentWithRequired,
          indicators: ['1', '1'],
        },
      ];

      let createdInstanceId;
      let user;
      let bibSpecId;
      let appendedSubfieldId;
      let localFieldId;
      let standardSubfieldAId;
      let field245Id;

      before('Create test data', () => {
        cy.getAdminToken();

        getBibliographicSpec().then((bibSpec) => {
          bibSpecId = bibSpec.id;
          cy.syncSpecifications(bibSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(bibSpecId, { enable: false });
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);
        // Restore standard subfield 'a' to not required
        if (standardSubfieldAId && field245Id) {
          cy.getSpecificationFieldSubfields(field245Id).then((response) => {
            const subfieldA = response.body.subfields.find((sf) => sf.id === standardSubfieldAId);
            if (subfieldA) {
              cy.updateSpecificationSubfield(
                standardSubfieldAId,
                {
                  ...subfieldA,
                  required: false,
                },
                false,
              );
            }
          });
        }
        cy.syncSpecifications(bibSpecId);
      });

      it(
        'C514948 Edit MARC bib record with required standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514948'] },
        () => {
          cy.then(() => {
            // Setup 245 standard field: mark standard subfield 'a' as required + create appended required subfield 'l'
            cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
              const field245 = findSystemField(fieldsResp.body.fields, testData.tag245);
              field245Id = field245.id;

              // Get existing subfields and mark 'a' as required
              cy.getSpecificationFieldSubfields(field245.id).then((subfieldsResp) => {
                const subfieldA = subfieldsResp.body.subfields.find(
                  (subfield) => subfield.code === testData.standardRequiredSubfieldCode &&
                    subfield.scope === 'standard',
                );
                if (subfieldA) {
                  standardSubfieldAId = subfieldA.id;
                  cy.updateSpecificationSubfield(subfieldA.id, {
                    ...subfieldA,
                    required: true,
                  });
                }
              });

              // Create appended required subfield 'l' for 245
              cy.createSpecificationFieldSubfield(field245.id, {
                code: testData.appendedRequiredSubfieldCode,
                label: `AT_${testCaseId}_Appended_Required_Subfield_${testData.appendedRequiredSubfieldCode}_${randomPostfix}`,
                repeatable: false,
                required: true,
              }).then((subfieldResp) => {
                appendedSubfieldId = subfieldResp.body.id;
              });
            });

            // Setup local field 981: create field with required subfield 'a' and indicator codes
            cy.deleteSpecificationFieldByTag(bibSpecId, testData.localFieldTag, false);
            cy.createSpecificationField(bibSpecId, {
              tag: testData.localFieldTag,
              label: `AT_${testCaseId}_Local_Field_${randomPostfix}`,
              repeatable: true,
              required: false,
              deprecated: false,
            }).then((fieldResp) => {
              localFieldId = fieldResp.body.id;

              // Create indicator 1 code
              cy.createSpecificationFieldIndicator(localFieldId, {
                order: 1,
                label: `AT_${testCaseId}_Local_Indicator_1_${randomPostfix}`,
              }).then((indicatorResp) => {
                cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                  code: testData.local1stIndicatorCode,
                  label: `AT_${testCaseId}_Local_Indicator_Code_1_blank_${randomPostfix}`,
                });
              });

              // Create indicator 2 code
              cy.createSpecificationFieldIndicator(localFieldId, {
                order: 2,
                label: `AT_${testCaseId}_Local_Indicator_2_${randomPostfix}`,
              }).then((indicatorResp) => {
                cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                  code: testData.local2ndIndicatorCode,
                  label: `AT_${testCaseId}_Local_Indicator_Code_2_blank_${randomPostfix}`,
                });
              });

              // Create required subfield 'a' for 981
              cy.createSpecificationFieldSubfield(localFieldId, {
                code: testData.localRequiredSubfieldCode,
                label: `AT_${testCaseId}_Local_Required_Subfield_${testData.localRequiredSubfieldCode}_${randomPostfix}`,
                repeatable: false,
                required: true,
              });
            });
          })
            .then(() => {
              cy.createTempUser([
                Permissions.inventoryAll.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
                Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              ]).then((userProperties) => {
                user = userProperties;

                cy.createMarcBibliographicViaAPI(
                  QuickMarcEditor.defaultValidLdr,
                  marcBibFields,
                ).then((instanceId) => {
                  createdInstanceId = instanceId;

                  toggleAllUndefinedValidationRules(bibSpecId, { enable: true });

                  cy.login(user.username, user.password, {
                    path: TopMenu.inventoryPath,
                    waiter: InventoryInstances.waitContentLoading,
                    authRefresh: true,
                  });
                });
              });
            })
            .then(() => {
              // Step 1: Open the MARC bib record for editing
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Make sure that "245" has required standard and appended Subfield codes
              QuickMarcEditor.checkContentByTag(
                testData.tag245,
                testData.field245ContentWithRequired,
              );

              // Step 3: Add local field 981 with required subfield 'a'
              QuickMarcEditor.addEmptyFields(4);
              QuickMarcEditor.checkEmptyFieldAdded(5);
              QuickMarcEditor.addValuesToExistingField(
                4,
                testData.localFieldTag,
                testData.localFieldContentWithRequired,
                testData.local1stIndicatorCode,
                testData.local2ndIndicatorCode,
              );

              // Step 4: Click "Save & keep editing" - should succeed
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.checkButtonsDisabled();
            });
        },
      );
    });
  });
});
