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
      const errorText = 'Record not saved: Communication problem with server. Please try again.';
      const keywordOption = 'Keyword';
      const marcAuthorityHeading = `AT_C496203_MarcAuthority_${getRandomPostfix()}`;
      const prefix = '';
      const startsWith = `${randomFourDigitNumber()}${randomFourDigitNumber()}C496203`;
      const authorityFields = [
        { tag: '100', content: `$a ${marcAuthorityHeading}`, indicators: ['1', '\\'] },
      ];
      const tagLdr = 'LDR';
      let createdAuthorityId;
      let userProperties;

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C496203_');
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
        'C496203 Cannot save "MARC authority" record with multiple "LDR" fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C496203'] },
        () => {
          MarcAuthorities.searchBy(keywordOption, marcAuthorityHeading);
          MarcAuthorities.select(createdAuthorityId);
          MarcAuthority.edit();

          // Step 2: Add a new field (row) below the current one
          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.updateTagNameToLockedTag(5, tagLdr);

          // Step 3: The new row should be disabled (read-only)
          QuickMarcEditor.verifyTagValue(5, tagLdr);
          QuickMarcEditor.verifyDropdownsShownInField(5, true);

          // Step 4: Try to save and check for error messages
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(errorText);
          QuickMarcEditor.waitLoading();
        },
      );
    });
  });
});
