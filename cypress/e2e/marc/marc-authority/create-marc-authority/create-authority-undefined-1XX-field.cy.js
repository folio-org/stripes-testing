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
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C813641_MarcAuthority_${getRandomPostfix()}`,
        tags: {
          tag008: '008',
          tag010: '010',
          tag199: '199',
          tag499: '499',
          tag599: '599',
        },
        tag008Index: 3,
        undefinedFieldContent: '$a Undefined 1XX field',
        expectedWarning: 'Warn: Field is undefined.',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n813641${randomDigits}${randomDigits}`,
        userProperties: {},
      };

      const fields = [
        { tag: testData.tags.tag010, content: `$a ${testData.naturalId}` },
        { tag: testData.tags.tag199, content: `$a ${testData.authorityHeading}` },
        { tag: testData.tags.tag499, content: testData.undefinedFieldContent },
        { tag: testData.tags.tag599, content: testData.undefinedFieldContent },
      ];

      let specId;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C813641_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          getAuthoritySpec().then((spec) => {
            specId = spec.id;
            toggleAllUndefinedValidationRules(specId, { enable: true });
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
        toggleAllUndefinedValidationRules(specId, { enable: false });
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C813641 Create MARC authority record with undefined 1XX field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813641'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          fields.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, testData.tag008Index + index);
          });
          fields.forEach((field) => {
            QuickMarcEditor.checkContentByTag(field.tag, field.content);
          });

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(3, 0);
          fields.slice(1).forEach((_, index) => {
            QuickMarcEditor.checkErrorMessage(
              testData.tag008Index + index + 2,
              testData.expectedWarning,
            );
          });

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          MarcAuthority.contains(testData.authorityHeading);
        },
      );
    });
  });
});
