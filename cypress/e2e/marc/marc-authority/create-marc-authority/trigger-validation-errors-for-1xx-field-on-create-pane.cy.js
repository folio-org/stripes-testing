import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import {
  getAuthoritySpec,
  findStandardField,
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag110: '110',
        tag199: '199',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}566596`,
        field110Ind1: '$',
        field110Ind2: '5',
        field110Content: `$5 $a AT_C566596_MarcAuthority_${randomPostfix} $f NR subfield 1 $f NR subfield 2 $t subfield t $9 undefined subfield nine`,
        field199Ind1: '1',
        field199Ind2: '&',
        field199Content: '$a Undefined 1XX field',
        requiredSubfield: 'e',
        row1XXIndex: 5,
        row199Index: 6,
      };

      const validationMessages = {
        secondIndicatorUndefined: "Warn: Second Indicator '5' is undefined.",
        subfield9Undefined: "Warn: Subfield '9' is undefined.",
        nonRepeatableRequired1XX: QuickMarcEditor.tag1XXNonRepeatableRequiredCalloutText,
        indicatorInvalid:
          "Fail: Indicator must contain one character and can only accept numbers 0-9, letters a-z or a '\\'.",

        subfieldERequired: "Fail: Subfield 'e' is required.",
        subfieldFNonRepeatable: QuickMarcEditor.getSubfieldNonRepeatableInlineErrorText('f'),
        fieldUndefined: 'Warn: Field is undefined.',
      };

      let user;
      let authSpecId;
      let field110Id;
      let subfieldEId;
      let subfieldEOriginalData;

      before('Get authority spec and create user', () => {
        cy.getAdminToken();
        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });
        if (subfieldEId && subfieldEOriginalData) {
          cy.updateSpecificationSubfield(
            subfieldEId,
            { ...subfieldEOriginalData, required: false },
            false,
          );
        }
        cy.syncSpecifications(authSpecId);
        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      // Will FAIL until this is fixed - https://folio-org.atlassian.net/browse/UIQM-833
      it(
        'C566596 Trigger validation errors for 1XX field of MARC authority record on "Create MARC authority record" pane (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C566596'] },
        () => {
          cy.then(() => {
            cy.createTempUser([
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
            ]).then((userProperties) => {
              user = userProperties;
              MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile);
            });
          })
            .then(() => {
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field110 = findStandardField(fieldsResp.body.fields, testData.tag110);
                if (field110) {
                  field110Id = field110.id;
                  cy.getSpecificationFieldSubfields(field110Id).then((subfieldsResp) => {
                    const subfieldE = findStandardSubfield(
                      subfieldsResp.body.subfields,
                      testData.requiredSubfield,
                    );
                    if (subfieldE) {
                      subfieldEId = subfieldE.id;
                      subfieldEOriginalData = { ...subfieldE };
                      if (!subfieldE.required) {
                        cy.updateSpecificationSubfield(
                          subfieldEId,
                          { ...subfieldE, required: true },
                          false,
                        );
                      }
                    }
                  });
                }
              });
            })
            .then(() => {
              toggleAllUndefinedValidationRules(authSpecId, { enable: true });
            })
            .then(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });

              // Step 1: Open new MARC authority record form
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              QuickMarcEditor.checkPaneheaderContains(MarcAuthority.createAuthorityPaneTitleRegExp);
              MarcAuthority.checkSourceFileSelectShown();

              // Step 2: Select FOLIO authority file
              MarcAuthority.selectSourceFile(testData.folioAuthFile);
              MarcAuthority.verifySourceFileSelected(testData.folioAuthFile);

              // Step 3: Set valid 008 dropdown values
              MarcAuthority.setValid008DropdownValues();
              QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

              // Step 4: Add 010 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag008,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              // Step 5: Add 110 1XX with ind2=5 (undefined), duplicate $f (non-rep), undefined $9
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag110,
                testData.field110Content,
                testData.field110Ind1,
                testData.field110Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag110, testData.field110Content);

              // Step 6: Add undefined 199 field with invalid indicator '&'
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag110,
                testData.tag199,
                testData.field199Content,
                testData.field199Ind1,
                testData.field199Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag199, testData.field199Content);

              // Step 7: Save & keep editing → validate inline errors and toast
              QuickMarcEditor.clickSaveAndKeepEditingButton();

              // Inline errors on the 110 (1XX) row
              QuickMarcEditor.checkErrorMessage(
                testData.row1XXIndex,
                validationMessages.secondIndicatorUndefined,
              );
              QuickMarcEditor.checkErrorMessage(
                testData.row1XXIndex,
                validationMessages.subfield9Undefined,
              );
              QuickMarcEditor.checkErrorMessage(
                testData.row1XXIndex,
                validationMessages.nonRepeatableRequired1XX,
              );
              QuickMarcEditor.checkErrorMessage(
                testData.row1XXIndex,
                validationMessages.indicatorInvalid,
              );
              QuickMarcEditor.checkErrorMessage(
                testData.row1XXIndex,
                validationMessages.subfieldERequired,
              );
              QuickMarcEditor.checkErrorMessage(
                testData.row1XXIndex,
                validationMessages.subfieldFNonRepeatable,
              );

              // Inline errors on the 199 row
              QuickMarcEditor.checkErrorMessage(
                testData.row199Index,
                validationMessages.fieldUndefined,
              );
              QuickMarcEditor.checkErrorMessage(
                testData.row199Index,
                validationMessages.nonRepeatableRequired1XX,
              );

              // Toast: Warn errors: 3, Fail errors: 5
              QuickMarcEditor.verifyValidationCallout(3, 5);
            });
        },
      );
    });
  });
});
