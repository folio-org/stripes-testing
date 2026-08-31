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
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        localFieldTag: '981',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}514935`,
        // Step 5: 100 WITHOUT required $a or $w
        field100Content: `$b AT_C514935_MarcAuthority_${randomPostfix} $d without required subfields`,
        field100Ind1: '1',
        field100Ind2: '\\',
        // Step 9: same content with empty $w and $a appended
        field100ContentWithEmptySubfields:
          '$b Create MARC auth $d without required subfields $w $a ',
        // Step 6: 981 WITHOUT required $a (only $b which is undefined in spec → warn)
        field981Content: '$b No required Subfield code',
        field981Ind1: '\\',
        field981Ind2: '\\',
        field981IndApi: '#',
        // Row indices after adding 010 (row 4), 100 (row 5), 981 (row 6)
        tag100RowIndex: 5,
        localFieldRowIndex: 6,
      };

      let user;
      let authSpecId;
      let standardSubfieldAId;
      let standardSubfieldAData;
      let appendedSubfieldWId;
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

        // Restore standard $a subfield of 100 to its original required=false state
        if (standardSubfieldAId && standardSubfieldAData) {
          cy.updateSpecificationSubfield(standardSubfieldAId, {
            ...standardSubfieldAData,
            required: false,
          });
        }
        if (appendedSubfieldWId) cy.deleteSpecificationFieldSubfield(appendedSubfieldWId, false);
        if (localField981Id) cy.deleteSpecificationField(localField981Id, false);

        cy.syncSpecifications(authSpecId);

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514935 Cannot create MARC authority record without required standard / local subfields in Standard and Local fields (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514935'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514935_');
          })
            .then(() => {
              // Setup 100 standard field: mark standard subfield 'a' as required,
              // and create appended required subfield 'w'
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field100 = findStandardField(fieldsResp.body.fields, testData.tag100);

                cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                  const subfieldA = findStandardSubfield(subfieldsResp.body.subfields, 'a');
                  standardSubfieldAId = subfieldA.id;
                  standardSubfieldAData = subfieldA;

                  cy.updateSpecificationSubfield(subfieldA.id, { ...subfieldA, required: true });
                });

                // Create appended required subfield 'w' for 100
                cy.createSpecificationFieldSubfield(field100.id, {
                  code: 'w',
                  label: `AT_C514935_Appended_Subfield_w_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                  deprecated: false,
                }).then((subfieldResp) => {
                  appendedSubfieldWId = subfieldResp.body.id;
                });
              });

              // Create local field 981: only required subfield 'a' (no 'b' → 'b' will be "undefined")
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514935_Local_Field_981_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField981Id = fieldResp.body.id;

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 1,
                  label: `AT_C514935_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981IndApi,
                    label: `AT_C514935_Local_Ind1_Code_blank_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 2,
                  label: `AT_C514935_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981IndApi,
                    label: `AT_C514935_Local_Ind2_Code_blank_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                // Subfield 'a': required — must be present to save
                cy.createSpecificationFieldSubfield(localField981Id, {
                  code: 'a',
                  label: `AT_C514935_Local_Subfield_a_${randomPostfix}`,
                  repeatable: false,
                  required: true,
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

              // Step 2: Select FOLIO authority file
              MarcAuthority.selectSourceFile(testData.folioAuthFile);
              MarcAuthority.verifySourceFileSelected(testData.folioAuthFile);

              // Step 4: Add 010 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag008,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              // Step 5: Add 100 WITHOUT required $a and $w subfields
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag100,
                testData.field100Content,
                testData.field100Ind1,
                testData.field100Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100Content);

              // Step 6: Add local 981 WITHOUT required $a (only $b which is not in spec)
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.localFieldTag,
                testData.field981Content,
                testData.field981Ind1,
                testData.field981Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field981Content);

              // Step 7: Save → inline errors for missing required subfields; save button stays enabled
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(1, 3);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                "Fail: Subfield 'a' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                "Fail: Subfield 'w' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Fail: Subfield 'a' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 8: Save again → same errors persist
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(1, 3);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                "Fail: Subfield 'a' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                "Fail: Subfield 'w' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Fail: Subfield 'a' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 9: Add empty required subfields ($w with no value, $a with only whitespace)
              QuickMarcEditor.updateExistingField(
                testData.tag100,
                testData.field100ContentWithEmptySubfields,
              );
              QuickMarcEditor.checkContentByTag(
                testData.tag100,
                testData.field100ContentWithEmptySubfields,
              );

              // Step 10: Save again → empty subfields still fail "required" validation
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(1, 3);
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                "Fail: Subfield 'a' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                "Fail: Subfield 'w' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Fail: Subfield 'a' is required.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);
            });
        },
      );
    });
  });
});
