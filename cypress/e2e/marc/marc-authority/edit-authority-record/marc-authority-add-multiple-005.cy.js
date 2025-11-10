import { Permissions } from '../../../../support/dictionary';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const nonRepeatableErrorText = 'Field is non-repeatable.';
      const keywordOption = 'Keyword';
      const marcAuthorityHeading = `AT_C496211_MarcAuthority_${getRandomPostfix()}`;
      const prefix = '';
      const startsWith = `${randomFourDigitNumber()}${randomFourDigitNumber()}C496211`;
      const authorityFields = [
        { tag: '100', content: `$a ${marcAuthorityHeading}`, indicators: ['1', '\\'] },
      ];
      const tag005 = '005';
      let createdAuthorityId;
      let userProperties;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C496211_');
        // Create shared MARC authority record
        MarcAuthorities.createMarcAuthorityViaAPI(prefix, startsWith, authorityFields).then(
          (createdRecordId) => {
            createdAuthorityId = createdRecordId;
          },
        );
        cy.createTempUser([
          Permissions.dataImportUploadAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUser) => {
          userProperties = createdUser;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C496211 Add multiple 005s when editing "MARC authority" record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C496211'] },
        () => {
          MarcAuthorities.searchBy(keywordOption, marcAuthorityHeading);
          MarcAuthorities.select(createdAuthorityId);
          MarcAuthority.edit();

          // Step 2: Add a new field (row) below the current one
          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.updateExistingFieldContent(5);
          QuickMarcEditor.updateTagNameToLockedTag(5, tag005);

          // Step 3: The new row should be disabled (read-only)
          QuickMarcEditor.verifyTagValue(5, tag005);
          QuickMarcEditor.checkFourthBoxEditable(5, false);

          // Step 4: Try to save and check for error messages
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, nonRepeatableErrorText);
          QuickMarcEditor.verifyValidationCallout(0, 1);
        },
      );
    });
  });
});
