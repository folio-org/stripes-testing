import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import {
  getAuthoritySpec,
  findStandardField,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag110: '110',
        tag856: '856',
        localFieldTag: '981',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        // 'n' prefix matches LCNAF
        naturalId: `n${randomNDigitNumber(18)}514933`,
        // Step 7: 110 with standard ind1=1, appended ind2=1, standard+appended subfields
        field110Content: `$a AT_C514933_MarcAuthority_${randomPostfix} $b Standard Repeatable subfield 1 $b Standard Repeatable subfield 2 $j Appended Not required and repeatable subfield 1 $q Appended Not repeatable subfield $j Appended Not required and repeatable subfield 2`,
        field110Ind1: '1',
        field110Ind2: '1',
        // Step 8: 856 with multiple repeatable standard subfields
        field856Content:
          '$a Testing $h Testingh $h Testingh $g Testingg $g Testingg $l Testingl $l Testingl $n Testing $n Testing $r Testingr $r Testingr $t Testingt $t Testingt',
        // Step 9: local 981 with local indicator and subfields
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
          toggleAllUndefinedValidationRules(authSpecId, { enable: false });
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

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514933 Create MARC authority record with Standard / Local fields which has standard and local: indicators; not required, repeatable and not repeatable subfields (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514933'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514933_');
          })
            .then(() => {
              // Setup 110 standard field: add appended indicator code '1' for indicator 2,
              // and appended subfields 'j' (repeatable) and 'q' (not repeatable)
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field110 = findStandardField(fieldsResp.body.fields, testData.tag110);

                cy.getSpecificationFieldIndicators(field110.id).then((indicatorsResp) => {
                  const indicator2 = indicatorsResp.body.indicators.find((ind) => ind.order === 2);
                  cy.createSpecificationIndicatorCode(indicator2.id, {
                    code: testData.field110Ind2,
                    label: `AT_C514933_Appended_Ind2_Code_1_${randomPostfix}`,
                    deprecated: false,
                  }).then((codeResp) => {
                    appendedIndCodeId = codeResp.body.id;
                  });
                });

                cy.createSpecificationFieldSubfield(field110.id, {
                  code: 'j',
                  label: `AT_C514933_Appended_Subfield_j_${randomPostfix}`,
                  repeatable: true,
                  required: false,
                  deprecated: false,
                }).then((subfieldResp) => {
                  appendedSubfieldJId = subfieldResp.body.id;
                });

                cy.createSpecificationFieldSubfield(field110.id, {
                  code: 'q',
                  label: `AT_C514933_Appended_Subfield_q_${randomPostfix}`,
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
                label: `AT_C514933_Local_Field_981_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField981Id = fieldResp.body.id;

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 1,
                  label: `AT_C514933_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981Ind1,
                    label: `AT_C514933_Local_Ind1_Code_1_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 2,
                  label: `AT_C514933_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981Ind2Api,
                    label: `AT_C514933_Local_Ind2_Code_hash_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldSubfield(localField981Id, {
                  code: 'a',
                  label: `AT_C514933_Local_Subfield_a_${randomPostfix}`,
                  repeatable: false,
                  required: false,
                  deprecated: false,
                });

                cy.createSpecificationFieldSubfield(localField981Id, {
                  code: 'b',
                  label: `AT_C514933_Local_Subfield_b_${randomPostfix}`,
                  repeatable: true,
                  required: false,
                  deprecated: false,
                });
              });
            })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: true });
                MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile);

                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              });
            })
            .then(() => {
              // Step 1: Open new MARC authority record form
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              QuickMarcEditor.checkPaneheaderContains(MarcAuthority.createAuthorityPaneTitleRegExp);
              MarcAuthority.checkSourceFileSelectShown();

              // Step 3: Set valid 008 dropdown values
              MarcAuthority.setValid008DropdownValues();
              QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

              // Steps 2, 4, 5: Select FOLIO authority file (handles look-up link + modal + save)
              MarcAuthority.selectSourceFile(testData.folioAuthFile);
              MarcAuthority.verifySourceFileSelected(testData.folioAuthFile);

              // Step 6: Add 010 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag008,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              // Step 7: Add 110 with standard ind1=1, appended ind2=1, and mixed subfields
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag110,
                testData.field110Content,
                testData.field110Ind1,
                testData.field110Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag110, testData.field110Content);

              // Step 8: Add standard 856 field with multiple repeatable subfields
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag110,
                testData.tag856,
                testData.field856Content,
              );
              QuickMarcEditor.checkContentByTag(testData.tag856, testData.field856Content);

              // Step 9: Add local field 981 with local indicator and subfields
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag856,
                testData.localFieldTag,
                testData.field981Content,
                testData.field981Ind1,
                testData.field981Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field981Content);

              // Step 10: Save & close; verify detail view shows all created fields
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.waitLoading();
              MarcAuthority.getId().then((id) => {
                createdAuthorityId = id;
              });
              MarcAuthority.contains(testData.naturalId);
              MarcAuthority.contains(testData.field110Content);
              MarcAuthority.contains(testData.field981Content);
            });
        },
      );
    });
  });
});
