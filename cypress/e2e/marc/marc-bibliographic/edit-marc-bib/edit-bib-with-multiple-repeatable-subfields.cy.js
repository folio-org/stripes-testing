import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  findStandardField,
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C515002';
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag100: '100',
        tag245: '245',
        localFieldTag: '985',
        standardRepeatableSubfieldCode: 'e',
        appendedRepeatableSubfieldCode: 'x',
        localRepeatableSubfieldCode: 'a',
        field100ContentMultipleRepeatable: `$a AT_${testCaseId}_Contributor_name_${randomPostfix} $e Repeatable Standard 1 $x Repeatable Appended 1 $e Repeatable Standard 2 $x Repeatable Appended 2`,
        localFieldContentMultipleRepeatable:
          '$a First repeatable subfield $a Second repeatable subfield',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag100,
          content: `$a AT_${testCaseId}_Contributor_name_${randomPostfix}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag245,
          content: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix}`,
          indicators: ['1', '1'],
        },
      ];

      let createdInstanceId;
      let user;
      let bibSpecId;
      let appendedSubfieldId;
      let localFieldId;

      before('Create test data', () => {
        cy.getAdminToken();

        getBibliographicSpec().then((bibSpec) => {
          bibSpecId = bibSpec.id;
          cy.syncSpecifications(bibSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (user?.userId) Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);
        cy.syncSpecifications(bibSpecId);
      });

      it(
        'C515002 Edit MARC bib record with multiple repeatable standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C515002'] },
        () => {
          cy.then(() => {
            // Create user and MARC bib FIRST (before setting up validation rules)
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;

              toggleAllUndefinedValidationRules(bibSpecId, { enable: false });

              cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
                (instanceId) => {
                  createdInstanceId = instanceId;
                },
              );
            });
          })
            .then(() => {
              // NOW setup validation rules AFTER bib is created
              // Setup 100 standard field: mark standard subfield 'e' as repeatable + create appended repeatable subfield 'x'
              cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
                const field100 = findStandardField(fieldsResp.body.fields, testData.tag100);

                // Get existing subfields and mark 'e' as repeatable (if not already)
                cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                  const subfieldE = findStandardSubfield(
                    subfieldsResp.body.subfields,
                    testData.standardRepeatableSubfieldCode,
                  );
                  if (subfieldE) {
                    if (!subfieldE.repeatable) {
                      cy.updateSpecificationSubfield(subfieldE.id, {
                        ...subfieldE,
                        repeatable: true,
                      });
                    }
                  }
                });

                // Create appended repeatable subfield 'x' for 100
                cy.createSpecificationFieldSubfield(field100.id, {
                  code: testData.appendedRepeatableSubfieldCode,
                  label: `AT_${testCaseId}_Appended_Repeatable_Subfield_${testData.appendedRepeatableSubfieldCode}_${randomPostfix}`,
                  repeatable: true,
                }).then((subfieldResp) => {
                  appendedSubfieldId = subfieldResp.body.id;
                });
              });

              // Setup local field 985: create field with repeatable subfield 'a'
              cy.deleteSpecificationFieldByTag(bibSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(bibSpecId, {
                tag: testData.localFieldTag,
                label: `AT_${testCaseId}_Local_Field_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localFieldId = fieldResp.body.id;

                // Create repeatable subfield 'a' for 985
                cy.createSpecificationFieldSubfield(localFieldId, {
                  code: testData.localRepeatableSubfieldCode,
                  label: `AT_${testCaseId}_Local_Repeatable_Subfield_${testData.localRepeatableSubfieldCode}_${randomPostfix}`,
                  repeatable: true,
                });
              });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
                authRefresh: true,
              });
            })
            .then(() => {
              // Step 1: Open the MARC bib record for editing
              InventoryInstances.searchByTitle(createdInstanceId);
              InventoryInstances.selectInstanceById(createdInstanceId);
              InventoryInstance.waitLoading();
              InventoryInstance.editMarcBibliographicRecord();
              QuickMarcEditor.waitLoading();

              // Step 2: Update field 100 with multiple repeatable standard and appended subfields
              QuickMarcEditor.updateExistingField(
                testData.tag100,
                testData.field100ContentMultipleRepeatable,
              );
              QuickMarcEditor.checkContentByTag(
                testData.tag100,
                testData.field100ContentMultipleRepeatable,
              );

              // Step 3: Add local field 985 with multiple repeatable subfields
              QuickMarcEditor.addEmptyFields(4);
              QuickMarcEditor.checkEmptyFieldAdded(5);
              QuickMarcEditor.addValuesToExistingField(
                4,
                testData.localFieldTag,
                testData.localFieldContentMultipleRepeatable,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldContentMultipleRepeatable,
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
