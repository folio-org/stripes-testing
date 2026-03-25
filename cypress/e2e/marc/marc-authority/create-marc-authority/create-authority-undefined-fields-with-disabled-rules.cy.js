import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeadingPrefix: 'AT_C895680_MarcAuthority',
        authorityHeading: `AT_C895680_MarcAuthority_${randomPostfix}`,
        tag008: '008',
        tag010: '010',
        tag130: '130',
        tag983: '983',
        tag008Index: 3,
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomDigits}${randomDigits}`,
        field983Content: '$a Undefined field',
        field130Ind1: '5',
        field130Ind2: '0',
        field983Ind1: '1',
        field983Ind2: '2',
      };
      const field130Content = `$a ${testData.authorityHeading} $b with ind and subfield codes not specified in rules`;

      let specId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeadingPrefix);
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getAuthoritySpec().then((spec) => {
            specId = spec.id;
            toggleAllUndefinedValidationRules(specId, { enable: false });
          });

          MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.authoritySourceFile);

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeadingPrefix);
        Users.deleteViaApi(testData.userProperties.userId);
        toggleAllUndefinedValidationRules(specId, { enable: true });
      });

      it(
        'C895680 Create MARC authority record with undefined field, indicator, and subfield codes when "Undefined" validation rules are disabled (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C895680'] },
        () => {
          // Step 1: Open "Create a new MARC authority record" window
          MarcAuthorities.clickActionsAndNewAuthorityButton();

          // Step 2: Select authority file
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          // Step 3: Set valid values in "008" field dropdowns
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008);
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

          // Step 4–6: Add 010, 130, and 983 fields
          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.addEmptyFields(testData.tag008Index + i);
          }
          cy.wait(1000);

          // Step 4: Add "010" field with LCNAF prefix + identifier
          QuickMarcEditor.addValuesToExistingField(
            testData.tag008Index,
            testData.tag010,
            `$a ${testData.naturalId}`,
            '\\',
            '\\',
          );

          // Step 5: Add "130" field with indicator and subfield codes not defined in MARC rules
          QuickMarcEditor.addValuesToExistingField(
            testData.tag008Index + 1,
            testData.tag130,
            field130Content,
            testData.field130Ind1,
            testData.field130Ind2,
          );

          // Step 6: Add undefined field "983 12 $a Undefined field"
          QuickMarcEditor.addValuesToExistingField(
            testData.tag008Index + 2,
            testData.tag983,
            testData.field983Content,
            testData.field983Ind1,
            testData.field983Ind2,
          );

          // Step 7: Click "Save & close"
          // With disabled "Undefined" rules, expect no validation warnings/fails
          // and the record should save successfully on first attempt
          QuickMarcEditor.pressSaveAndClose();

          // Verify success: toast displayed, editor closed, detail view opened
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          // Verify created fields appear in detail view (no warn/fail messages appeared)
          MarcAuthority.contains(testData.authorityHeading);
          MarcAuthority.contains(testData.tag983);
        },
      );
    });
  });
});
