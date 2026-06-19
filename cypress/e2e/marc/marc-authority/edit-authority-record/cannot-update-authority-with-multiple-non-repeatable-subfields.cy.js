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
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(16);

      const testData = {
        tag100: '100',
        localFieldTag: '986',
        standardSubfieldCode: 'a',
        appendedSubfieldCode: 'w',
        localSubfieldCode: 'a',
        localInd1: '#',
        localInd2: '#',
        localInd1Ui: '\\',
        localInd2Ui: '\\',
        authorityHeading: `AT_C514939_MarcAuthority_${randomPostfix}`,
        field1XXWithMultipleSubfields:
          '$a Standard not repeatable subfield one $w Appended not repeatable subfield one $a Standard not repeatable subfield two $w Appended not repeatable subfield two',
        localFieldWithMultipleSubfields:
          '$a Not repeatable subfield 1 $a not repeatable subfield 2',
        localFieldWithEmptySecondSubfield: '$a Not repeatable $a',
        localFieldWithWhitespaceSecondSubfield: '$a Not repeatable $a ',
        localFieldWithSwitchedSubfields: '$a $a Not repeatable',
        errorSubfieldANonRepeatable: "Fail: Subfield 'a' is non-repeatable.",
        errorSubfieldWNonRepeatable: "Fail: Subfield 'w' is non-repeatable.",
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let standardSubfieldAId;
      let standardSubfieldAOriginalData;
      let appendedSubfieldId;
      let localFieldId;

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

        if (standardSubfieldAId && standardSubfieldAOriginalData) {
          cy.updateSpecificationSubfield(standardSubfieldAId, standardSubfieldAOriginalData, false);
        }
        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514939 Cannot update MARC authority record with multiple not-repeatable standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514939'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514939_');

            MarcAuthorities.createMarcAuthorityViaAPI(`${randomLetters}C514939`, '', [
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
              // Setup 100 field: ensure standard subfield 'a' is not-repeatable
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field100 = findStandardField(fieldsResp.body.fields, testData.tag100);

                cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                  const subfieldA = findStandardSubfield(
                    subfieldsResp.body.subfields,
                    testData.standardSubfieldCode,
                  );
                  if (subfieldA) {
                    standardSubfieldAId = subfieldA.id;
                    standardSubfieldAOriginalData = { ...subfieldA };
                    cy.updateSpecificationSubfield(subfieldA.id, {
                      ...subfieldA,
                      repeatable: false,
                    });
                  }
                });

                // Create appended not-repeatable subfield 'w' for 100
                cy.createSpecificationFieldSubfield(field100.id, {
                  code: testData.appendedSubfieldCode,
                  label: `AT_C514939_Appended_Subfield_${testData.appendedSubfieldCode}_${randomPostfix}`,
                  repeatable: false,
                  required: false,
                }).then((subfieldResp) => {
                  appendedSubfieldId = subfieldResp.body.id;
                });
              });

              // Setup local field 986 with not-repeatable subfield 'a'
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514939_Local_Field_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localFieldId = fieldResp.body.id;

                cy.createSpecificationFieldIndicator(localFieldId, {
                  order: 1,
                  label: `AT_C514939_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.localInd1,
                    label: `AT_C514939_Local_Indicator_Code_1_${randomPostfix}`,
                  });
                });

                cy.createSpecificationFieldIndicator(localFieldId, {
                  order: 2,
                  label: `AT_C514939_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.localInd2,
                    label: `AT_C514939_Local_Indicator_Code_2_${randomPostfix}`,
                  });
                });

                cy.createSpecificationFieldSubfield(localFieldId, {
                  code: testData.localSubfieldCode,
                  label: `AT_C514939_Local_Subfield_${testData.localSubfieldCode}_${randomPostfix}`,
                  repeatable: false,
                  required: false,
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

              // Step 2: Update 1XX field with multiple not-repeatable subfields
              QuickMarcEditor.updateExistingField(
                testData.tag100,
                testData.field1XXWithMultipleSubfields,
              );
              QuickMarcEditor.checkContentByTag(
                testData.tag100,
                testData.field1XXWithMultipleSubfields,
              );

              // Step 3: Add local field 986 with multiple not-repeatable $a subfields
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.localFieldTag,
                testData.localFieldWithMultipleSubfields,
                testData.localInd1Ui,
                testData.localInd2Ui,
              );

              function checkAllErrors() {
                QuickMarcEditor.verifyValidationCallout(0, 3);
                QuickMarcEditor.closeAllCallouts();
                QuickMarcEditor.checkErrorMessageForFieldByTag(
                  testData.tag100,
                  including(testData.errorSubfieldANonRepeatable),
                );
                QuickMarcEditor.checkErrorMessageForFieldByTag(
                  testData.tag100,
                  including(testData.errorSubfieldWNonRepeatable),
                );
                QuickMarcEditor.checkErrorMessageForFieldByTag(
                  testData.localFieldTag,
                  including(testData.errorSubfieldANonRepeatable),
                );
                QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
                QuickMarcEditor.verifySaveAndCloseButtonEnabled();
              }

              function check1XXErrorsOnly() {
                QuickMarcEditor.verifyValidationCallout(0, 2);
                QuickMarcEditor.closeAllCallouts();
                QuickMarcEditor.checkErrorMessageForFieldByTag(
                  testData.tag100,
                  including(testData.errorSubfieldANonRepeatable),
                );
                QuickMarcEditor.checkErrorMessageForFieldByTag(
                  testData.tag100,
                  including(testData.errorSubfieldWNonRepeatable),
                );
                QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();
                QuickMarcEditor.verifySaveAndCloseButtonEnabled();
              }

              // Step 4: Click "Save & close" → 3 fail errors (1XX: $a, $w; 986: $a)
              QuickMarcEditor.pressSaveAndCloseButton();
              checkAllErrors();

              // Step 5: Click "Save & keep editing" → same 3 fail errors
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              checkAllErrors();

              // Step 6: Delete value from second $a in local field
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.localFieldWithEmptySecondSubfield,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldWithEmptySecondSubfield,
              );

              // Step 7: Click "Save & close" → 2 fail errors, no error for 986
              QuickMarcEditor.pressSaveAndCloseButton();
              check1XXErrorsOnly();

              // Step 8: Add whitespace to second $a in local field
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.localFieldWithWhitespaceSecondSubfield,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldWithWhitespaceSecondSubfield,
              );

              // Step 9: Click "Save & close" → still 2 fail errors, no error for 986
              QuickMarcEditor.pressSaveAndCloseButton();
              check1XXErrorsOnly();

              // Step 10: Switch places of 1st and 2nd $a in local field
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.localFieldWithSwitchedSubfields,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.localFieldWithSwitchedSubfields,
              );

              // Step 11: Click "Save & close" → still 2 fail errors, no error for 986
              QuickMarcEditor.pressSaveAndCloseButton();
              check1XXErrorsOnly();
            });
        },
      );
    });
  });
});
