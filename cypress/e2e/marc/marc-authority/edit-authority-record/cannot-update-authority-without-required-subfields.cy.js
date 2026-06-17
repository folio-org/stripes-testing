import { including } from '../../../../../interactors';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  findStandardField,
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testCaseId = 'C514936';
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(16);

      const testData = {
        tag100: '100',
        localFieldTag: '981',
        standardRequiredSubfieldCode: 'a',
        appendedRequiredSubfieldCode: 'w',
        localRequiredSubfieldCode: 'a',
        localUndefinedSubfieldCode: 'b',
        localInd1: '#',
        localInd2: '#',
        localInd1Ui: '\\',
        localInd2Ui: '\\',
        authorityHeading: `AT_${testCaseId}_MarcAuthority_${randomPostfix}`,
        field1XXContentWithoutRequired: '$b Edit MARC auth $d without required subfields',
        field1XXContentWithEmptyRequired:
          '$b Edit MARC auth $d without required subfields $w $a   ',
        localFieldContentWithoutRequired: '$b No required Subfield code',
        errorMessageSubfieldARequired: "Fail: Subfield 'a' is required.",
        errorMessageSubfieldWRequired: "Fail: Subfield 'w' is required.",
        warningMessageSubfieldBUndefined: "Warn: Subfield 'b' is undefined.",
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let appendedSubfieldId;
      let localFieldId;
      let standardSubfieldAId;
      let standardSubfieldAOriginalData;
      let field100Id;

      before('Get authority spec', () => {
        cy.getAdminToken();

        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
          cy.syncSpecifications(authSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        // Restore standard subfield 'a' to not required
        if (standardSubfieldAId && field100Id && standardSubfieldAOriginalData) {
          cy.updateSpecificationSubfield(
            standardSubfieldAId,
            { ...standardSubfieldAOriginalData, required: false },
            false,
          );
        }

        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514936 Cannot update MARC authority record without required standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514936'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`AT_${testCaseId}_`);

            MarcAuthorities.createMarcAuthorityViaAPI(`${randomLetters}${testCaseId}`, '', [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              createdAuthorityId = id;
            });
          })
            .then(() => {
              // Setup 100 standard field: mark standard subfield 'a' as required
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field100 = findStandardField(fieldsResp.body.fields, testData.tag100);
                field100Id = field100.id;

                cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                  const subfieldA = findStandardSubfield(
                    subfieldsResp.body.subfields,
                    testData.standardRequiredSubfieldCode,
                  );
                  if (subfieldA) {
                    standardSubfieldAId = subfieldA.id;
                    standardSubfieldAOriginalData = { ...subfieldA };
                    cy.updateSpecificationSubfield(subfieldA.id, {
                      ...subfieldA,
                      required: true,
                    });
                  }
                });

                // Create appended required subfield 'w' for 100
                cy.createSpecificationFieldSubfield(field100.id, {
                  code: testData.appendedRequiredSubfieldCode,
                  label: `AT_${testCaseId}_Appended_Required_Subfield_${testData.appendedRequiredSubfieldCode}_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                }).then((subfieldResp) => {
                  appendedSubfieldId = subfieldResp.body.id;
                });
              });

              // Setup local field 981: create field with required subfield 'a' and indicator codes
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
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
                    code: testData.localInd1,
                    label: `AT_${testCaseId}_Local_Indicator_Code_1_${randomPostfix}`,
                  });
                });

                cy.createSpecificationFieldIndicator(localFieldId, {
                  order: 2,
                  label: `AT_${testCaseId}_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.localInd2,
                    label: `AT_${testCaseId}_Local_Indicator_Code_2_${randomPostfix}`,
                  });
                });

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
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: true });

                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                  authRefresh: true,
                });
              });
            })
            .then(() => {
              // Step 1: Open authority record for editing
              MarcAuthorities.searchBeats(testData.authorityHeading);
              MarcAuthorities.selectAuthorityById(createdAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();

              // Step 2: Update 1XX field to remove required subfields (only $b and $d)
              QuickMarcEditor.updateExistingField(
                testData.tag100,
                testData.field1XXContentWithoutRequired,
              );

              // Step 3: Add local field 981 with only $b (no required $a)
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.localFieldTag,
                testData.localFieldContentWithoutRequired,
                testData.localInd1Ui,
                testData.localInd2Ui,
              );

              function checkValidation() {
                QuickMarcEditor.verifyValidationCallout(1, 3);
                QuickMarcEditor.closeAllCallouts();
                [
                  testData.errorMessageSubfieldARequired,
                  testData.errorMessageSubfieldWRequired,
                ].forEach((errorMessage) => {
                  QuickMarcEditor.checkErrorMessageForFieldByTag(
                    testData.tag100,
                    including(errorMessage),
                  );
                });
                QuickMarcEditor.checkErrorMessageForFieldByTag(
                  testData.localFieldTag,
                  including(testData.errorMessageSubfieldARequired),
                );
                QuickMarcEditor.checkWarningMessageForFieldByTag(
                  testData.localFieldTag,
                  including(testData.warningMessageSubfieldBUndefined),
                );
                QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
                QuickMarcEditor.verifySaveAndCloseButtonEnabled();
              }

              // Step 4: Click "Save & close" - should show validation errors
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidation();

              // Step 5: Click "Save & keep editing" - should show same validation errors
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              checkValidation();

              // Step 6: Add empty required subfields to 100 field: $w only code, $a with whitespaces
              QuickMarcEditor.updateExistingField(
                testData.tag100,
                testData.field1XXContentWithEmptyRequired,
              );

              // Step 7: Click "Save & close" again - should still show validation errors
              QuickMarcEditor.pressSaveAndCloseButton();
              checkValidation();
            });
        },
      );
    });
  });
});
