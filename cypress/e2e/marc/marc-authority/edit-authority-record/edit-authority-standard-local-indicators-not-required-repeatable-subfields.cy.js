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
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(16);

      const testData = {
        tag110: '110',
        localFieldTag: '981',
        authorityHeading: `AT_C514934_MarcAuthority_${randomPostfix}`,
        // Step 2: 110 field content with standard and appended ind/subfields
        // ind1=1 (standard), ind2=1 (appended)
        field110Content:
          '$a AT_C514934 Not required and not repeatable Standard subfield $b Standard Repeatable subfield 1 $b Standard Repeatable subfield 2 $j Appended Not required and repeatable subfield 1 $q Appended Not repeatable subfield $j Appended Not required and repeatable subfield 2',
        field110Ind1: '1',
        field110Ind2: '1',
        // Step 3: local field 981
        field981Content: '$a Local field with local indicator $b and $b subfield',
        field981Ind1: '1',
        field981Ind2: '\\',
        field981Ind2Api: '#',
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let appendedSubfieldJId;
      let appendedSubfieldQId;
      let appendedIndCodeId;
      let localField981Id;

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

        if (appendedIndCodeId) cy.deleteSpecificationIndicatorCode(appendedIndCodeId, false);
        if (appendedSubfieldJId) cy.deleteSpecificationFieldSubfield(appendedSubfieldJId, false);
        if (appendedSubfieldQId) cy.deleteSpecificationFieldSubfield(appendedSubfieldQId, false);
        if (localField981Id) cy.deleteSpecificationField(localField981Id, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514934 Edit MARC authority record with Standard / Local fields which has standard and local: indicators; not required, repeatable and not repeatable subfields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514934'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514934_');

            MarcAuthorities.createMarcAuthorityViaAPI(`${randomLetters}C514934`, '', [
              {
                tag: testData.tag110,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['2', '\\'],
              },
            ]).then((id) => {
              createdAuthorityId = id;
            });
          })
            .then(() => {
              // Setup 110 standard field: add appended indicator code '1' for indicator 2,
              // and appended subfields 'j' (repeatable) and 'q' (not repeatable)
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field110 = findStandardField(fieldsResp.body.fields, testData.tag110);

                // Add appended indicator code '1' for indicator 2 of 110
                cy.getSpecificationFieldIndicators(field110.id).then((indicatorsResp) => {
                  const indicator2 = indicatorsResp.body.indicators.find((ind) => ind.order === 2);
                  cy.createSpecificationIndicatorCode(indicator2.id, {
                    code: testData.field110Ind2,
                    label: `AT_C514934_Appended_Ind2_Code_1_${randomPostfix}`,
                    deprecated: false,
                  }).then((codeResp) => {
                    appendedIndCodeId = codeResp.body.id;
                  });
                });

                // Create appended subfield 'j' (not required, repeatable) for 110
                cy.createSpecificationFieldSubfield(field110.id, {
                  code: 'j',
                  label: `AT_C514934_Appended_Subfield_j_${randomPostfix}`,
                  repeatable: true,
                  required: false,
                  deprecated: false,
                }).then((subfieldResp) => {
                  appendedSubfieldJId = subfieldResp.body.id;
                });

                // Create appended subfield 'q' (not required, not repeatable) for 110
                cy.createSpecificationFieldSubfield(field110.id, {
                  code: 'q',
                  label: `AT_C514934_Appended_Subfield_q_${randomPostfix}`,
                  repeatable: false,
                  required: false,
                  deprecated: false,
                }).then((subfieldResp) => {
                  appendedSubfieldQId = subfieldResp.body.id;
                });
              });

              // Create local field 981 with indicator code '1' for ind 1, and subfields 'a' / 'b'
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514934_Local_Field_981_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField981Id = fieldResp.body.id;

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 1,
                  label: `AT_C514934_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981Ind1,
                    label: `AT_C514934_Local_Ind1_Code_1_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 2,
                  label: `AT_C514934_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981Ind2Api,
                    label: `AT_C514934_Local_Ind2_Code_hash_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                // Subfield 'a': not required, not repeatable
                cy.createSpecificationFieldSubfield(localField981Id, {
                  code: 'a',
                  label: `AT_C514934_Local_Subfield_a_${randomPostfix}`,
                  repeatable: false,
                  required: false,
                  deprecated: false,
                });

                // Subfield 'b': not required, repeatable
                cy.createSpecificationFieldSubfield(localField981Id, {
                  code: 'b',
                  label: `AT_C514934_Local_Subfield_b_${randomPostfix}`,
                  repeatable: true,
                  required: false,
                  deprecated: false,
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

              // Step 2: Update 110 field with standard/appended indicators and subfields
              QuickMarcEditor.updateExistingField(testData.tag110, testData.field110Content);
              QuickMarcEditor.updateIndicatorValue(testData.tag110, testData.field110Ind1, 0);
              QuickMarcEditor.updateIndicatorValue(testData.tag110, testData.field110Ind2, 1);
              QuickMarcEditor.checkContentByTag(testData.tag110, testData.field110Content);

              // Step 3: Add local field 981 with local indicator and subfields
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.localFieldTag,
                testData.field981Content,
                testData.field981Ind1,
                testData.field981Ind2,
              );

              // Step 4: Click "Save & keep editing"
              QuickMarcEditor.clickSaveAndKeepEditing({ checkCallout: false });
              QuickMarcEditor.checkButtonsDisabled();
              QuickMarcEditor.checkContentByTag(testData.tag110, testData.field110Content);
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field981Content);
            });
        },
      );
    });
  });
});
