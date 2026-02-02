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
      const marcAuthorityHeading = `AT_C499628_MarcAuthority_${getRandomPostfix()}`;
      const prefix = '';
      const startsWith = `${randomFourDigitNumber()}${randomFourDigitNumber()}C499628`;
      const authorityFields = [
        { tag: '100', content: `$a ${marcAuthorityHeading}`, indicators: ['1', '\\'] },
      ];
      const tag008 = '008';
      let createdAuthorityId;
      let userProperties;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C499628_');
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
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C499628 Cannot save exisitng "MARC authority" record with multiple "008" fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C499628'] },
        () => {
          MarcAuthorities.searchBy(keywordOption, marcAuthorityHeading);
          MarcAuthorities.select(createdAuthorityId);
          MarcAuthority.edit();

          // Step 2: Add a new field (row) below the current one
          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.updateTagNameToLockedTag(5, tag008);

          // Step 3: The new row should be disabled (read-only)
          QuickMarcEditor.verifyTagValue(5, tag008);

          // Step 4: Try to save and check for error messages
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, nonRepeatableErrorText);
          QuickMarcEditor.verifyValidationCallout(0, 1);
        },
      );
    });
  });
});
