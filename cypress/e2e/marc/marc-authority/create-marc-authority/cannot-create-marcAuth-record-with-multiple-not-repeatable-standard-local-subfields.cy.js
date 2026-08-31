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
        tag100: '100',
        localFieldTag: '986',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}514938`,
        // Step 5: 100 with duplicate $a (standard, non-rep) and $w (appended, non-rep)
        field100Content: `$a AT_C514938_MarcAuthority_${randomPostfix} $w Appended not repeatable subfield one $a AT_C514938 Standard not repeatable subfield two $w Appended not repeatable subfield two`,
        field100Ind1: '1',
        field100Ind2: '\\',
        // Step 6: 986 with duplicate $a (local, non-repeatable)
        field986Content: '$a Not repeatable subfield 1 $a not repeatable subfield 2',
        field986Ind1: '\\',
        field986Ind2: '\\',
        // Step 9: delete value from second $a → keeps code, empties value
        field986ContentStep9: '$a Not repeatable subfield 1 $a',
        // Step 11: add space to second $a value
        field986ContentStep11: '$a Not repeatable subfield 1 $a ',
        // Step 13: switch subfield positions (first $a empty, second has value)
        field986ContentStep13: '$a $a Not repeatable subfield 1',
        // Row indices: 010(4), 100(5), 986(6)
        tag100RowIndex: 5,
        localFieldRowIndex: 6,
      };

      let user;
      let authSpecId;
      let appendedSubfieldWId;
      let localField986Id;

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

        if (appendedSubfieldWId) cy.deleteSpecificationFieldSubfield(appendedSubfieldWId, false);
        if (localField986Id) cy.deleteSpecificationField(localField986Id, false);

        cy.syncSpecifications(authSpecId);

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514938 Cannot create MARC authority record with multiple not-repeatable standard / local subfields in Standard and Local fields (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514938'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514938_');
          })
            .then(() => {
              // Setup 100: create appended non-repeatable subfield 'w'
              // Standard subfield 'a' is already non-repeatable per LOC spec — no update needed
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field100 = findStandardField(fieldsResp.body.fields, testData.tag100);

                cy.createSpecificationFieldSubfield(field100.id, {
                  code: 'w',
                  label: `AT_C514938_Appended_Subfield_w_${randomPostfix}`,
                  repeatable: false,
                  required: false,
                  deprecated: false,
                }).then((subfieldResp) => {
                  appendedSubfieldWId = subfieldResp.body.id;
                });
              });

              // Create local field 986 with non-repeatable subfield 'a'
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514938_Local_Field_986_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField986Id = fieldResp.body.id;

                cy.createSpecificationFieldIndicator(localField986Id, {
                  order: 1,
                  label: `AT_C514938_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: '#',
                    label: `AT_C514938_Local_Ind1_Code_blank_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldIndicator(localField986Id, {
                  order: 2,
                  label: `AT_C514938_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: '#',
                    label: `AT_C514938_Local_Ind2_Code_blank_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldSubfield(localField986Id, {
                  code: 'a',
                  label: `AT_C514938_Local_Subfield_a_${randomPostfix}`,
                  repeatable: false,
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

              // Step 5: Add 100 with duplicate non-repeatable $a and $w
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag100,
                testData.field100Content,
                testData.field100Ind1,
                testData.field100Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100Content);

              // Step 6: Add local 986 with duplicate non-repeatable $a
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.localFieldTag,
                testData.field986Content,
                testData.field986Ind1,
                testData.field986Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field986Content);

              // Step 7: Save → 3 fail errors (100: $a non-rep, $w non-rep; 986: $a non-rep)
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 3);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('w'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 8: Save again → same 3 errors persist
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 3);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('w'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 9: Delete value from second $a of 986 (keep code, clear value)
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.field986ContentStep9,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.field986ContentStep9,
              );

              // Step 10: Save → 2 fail errors (100 only); 986 has no error (second $a has no value)
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 2);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('w'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
                false,
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 11: Add space to second $a value in 986
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.field986ContentStep11,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.field986ContentStep11,
              );

              // Step 12: Save → still 2 fail errors; space-only $a still treated as empty
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 2);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('w'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
                false,
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 13: Switch $a positions in 986 (first empty, second has value)
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.field986ContentStep13,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.field986ContentStep13,
              );

              // Step 14: Save → still 2 fail errors; 986 still no error (first $a empty)
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(0, 2);
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag100RowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('w'),
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('a'),
                false,
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);
            });
        },
      );
    });
  });
});
