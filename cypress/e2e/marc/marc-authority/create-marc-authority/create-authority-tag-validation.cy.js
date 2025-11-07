import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C813593_MarcAuthority_${getRandomPostfix()}`,
        tag010: '010',
        tag100: '100',
        newFieldIndex: 6,
        invalidTagValues: ['', '0', '01', '01b', '0d$'],
        newFieldIndicatorValue: '\\',
        newFieldContent: '$a test field',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n813593${randomDigits}${randomDigits}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C813593_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C813593 MARC tag box validation in Create a new MARC Authority record window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813593'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
          }
          cy.wait(1000);

          QuickMarcEditor.addValuesToExistingField(
            3,
            testData.tag100,
            `$a ${testData.authorityHeading}`,
            '1',
            '\\',
          );
          QuickMarcEditor.addValuesToExistingField(
            4,
            testData.tag010,
            `$a ${testData.naturalId}`,
            '\\',
            '\\',
          );
          QuickMarcEditor.addValuesToExistingField(
            testData.newFieldIndex - 1,
            '',
            testData.newFieldContent,
          );

          testData.invalidTagValues.forEach((tagValue) => {
            QuickMarcEditor.updateExistingTagValue(testData.newFieldIndex, tagValue);
            QuickMarcEditor.verifyTagField(
              testData.newFieldIndex,
              tagValue,
              testData.newFieldIndicatorValue,
              testData.newFieldIndicatorValue,
              testData.newFieldContent,
              '',
            );
            QuickMarcEditor.checkButtonsEnabled();
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.verifyValidationCallout(0, 1);
            QuickMarcEditor.closeAllCallouts();
            QuickMarcEditor.checkErrorMessage(
              testData.newFieldIndex,
              QuickMarcEditor.tagLengthNumbersOnlyInlineErrorText,
            );
          });
        },
      );
    });
  });
});
