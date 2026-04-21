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
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testCaseId = 'C514906';
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag245: '245',
        localFieldTag: '981',
        appended1stIndicatorCode: '2',
        appendedSubfieldCode: 'l',
        local1stIndicatorCode: '1',
        local2ndIndicatorCode: '0',
        localSubfieldCode: 'a',
        field245Content: `$a AT_${testCaseId}_MarcBibInstance_${randomPostfix} $l which has standard and appended Indicator, Subfield codes`,
        localFieldContent: '$a Local field with local indicator and not repeatable subfield',
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: testData.field245Content,
          indicators: [testData.appended1stIndicatorCode, '1'],
        },
      ];

      let createdInstanceId;
      let user;
      let bibSpecId;
      let appendedIndicatorCodeId;
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
        toggleAllUndefinedValidationRules(bibSpecId, { enable: false });
        if (user?.userId) Users.deleteViaApi(user.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (appendedIndicatorCodeId) {
          cy.deleteSpecificationIndicatorCode(appendedIndicatorCodeId, false);
        }
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);
        cy.syncSpecifications(bibSpecId);
      });

      it(
        'C514906 Edit MARC bib record with standard / local indicators, not repeatable subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514906'] },
        () => {
          cy.then(() => {
            // Setup 245 standard field: appended indicator code + not repeatable subfield
            cy.getSpecificationFields(bibSpecId).then((fieldsResp) => {
              const field245 = findSystemField(fieldsResp.body.fields, testData.tag245);

              // Create appended indicator code '2' for indicator 1 of 245
              cy.getSpecificationFieldIndicators(field245.id).then((indicatorsResp) => {
                const indicator1 = indicatorsResp.body.indicators.find((ind) => ind.order === 1);

                cy.createSpecificationIndicatorCode(indicator1.id, {
                  code: testData.appended1stIndicatorCode,
                  label: `AT_${testCaseId}_Appended_Indicator_Code_${testData.appended1stIndicatorCode}_${randomPostfix}`,
                }).then((codeResp) => {
                  appendedIndicatorCodeId = codeResp.body.id;
                });
              });

              // Create not repeatable subfield 'l' for 245
              cy.createSpecificationFieldSubfield(field245.id, {
                code: testData.appendedSubfieldCode,
                label: `AT_${testCaseId}_Appended_Subfield_${testData.appendedSubfieldCode}_${randomPostfix}`,
                repeatable: false,
              }).then((subfieldResp) => {
                appendedSubfieldId = subfieldResp.body.id;
              });
            });

            // Setup local field 981: create field, indicator 1 with code '1', not repeatable subfield 'a'
            cy.deleteSpecificationFieldByTag(bibSpecId, testData.localFieldTag, false);
            cy.createSpecificationField(bibSpecId, {
              tag: testData.localFieldTag,
              label: `AT_${testCaseId}_Local_Field_${randomPostfix}`,
              repeatable: true,
              required: false,
              deprecated: false,
            }).then((fieldResp) => {
              localFieldId = fieldResp.body.id;

              cy.createSpecificationFieldIndicator(localFieldId, {
                order: 1,
                label: `AT_${testCaseId}_Local_Indicator_1_${randomPostfix}`,
              }).then((indicatorResp) => {
                cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                  code: testData.local1stIndicatorCode,
                  label: `AT_${testCaseId}_Local_Indicator_Code_1_${testData.local1stIndicatorCode}_${randomPostfix}`,
                });
              });

              cy.createSpecificationFieldIndicator(localFieldId, {
                order: 2,
                label: `AT_${testCaseId}_Local_Indicator_2_${randomPostfix}`,
              }).then((indicatorResp) => {
                cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                  code: testData.local2ndIndicatorCode,
                  label: `AT_${testCaseId}_Local_Indicator_Code_2_${testData.local1stIndicatorCode}_${randomPostfix}`,
                });
              });

              cy.createSpecificationFieldSubfield(localFieldId, {
                code: testData.localSubfieldCode,
                label: `AT_${testCaseId}_Local_Subfield_${testData.localSubfieldCode}_${randomPostfix}`,
                repeatable: false,
                required: false,
                deprecated: false,
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

              // Step 2: Update 245 field with appended indicator code '2' and not repeatable subfield '$l'
              QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
                testData.tag245,
                testData.appended1stIndicatorCode,
                '1',
                testData.field245Content,
              );

              // Step 3: Add local field 981 with local indicator code '1' and not repeatable subfield '$a'
              QuickMarcEditor.addEmptyFields(4);
              QuickMarcEditor.checkEmptyFieldAdded(5);
              QuickMarcEditor.addValuesToExistingField(
                4,
                testData.localFieldTag,
                testData.localFieldContent,
                testData.local1stIndicatorCode,
                testData.local2ndIndicatorCode,
              );

              // Step 4: Click "Save & keep editing" and verify success
              QuickMarcEditor.clickSaveAndKeepEditing();
              InteractorsTools.checkNoErrorCallouts();
            });
        },
      );
    });
  });
});
