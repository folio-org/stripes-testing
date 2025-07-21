import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const errorNonRepeatable = 'Field is non-repeatable.';
      const marcAuthorityHeading = `AT_C423506_MarcAuthority_${getRandomPostfix()}`;
      const tag010 = '010';
      const tag008 = '008';
      const tag100 = '100';
      const authorityFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const prefix = 'n';
      const naturalId = `${randomFourDigitNumber()}${randomFourDigitNumber()}C423506`;
      let userProperties;

      before('Create user and login', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUser) => {
          userProperties = createdUser;
          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(authorityFile);
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(authorityFile);
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C423506 Create a new MARC authority record with multiple "008" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423506'] },
        () => {
          // Step 1: Open new authority record pane
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkRecordStatusNew();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select authority file (LCNAF)
          MarcAuthority.selectSourceFile(authorityFile);

          // Step 3: Add 3 new fields: 010, 010, 100
          // Add first 010 field
          QuickMarcEditor.addNewField(tag010, `$a ${prefix}${naturalId}`, 3);
          QuickMarcEditor.checkContent(`$a ${prefix}${naturalId}`, 4);
          // Add 100 field
          QuickMarcEditor.addNewField(tag100, `$a ${marcAuthorityHeading}`, 4);
          QuickMarcEditor.checkContent(`$a ${marcAuthorityHeading}`, 5);
          // Add an empty field and change tag to 008
          QuickMarcEditor.addEmptyFields(3);
          QuickMarcEditor.checkEmptyFieldAdded(4);
          QuickMarcEditor.updateTagNameToLockedTag(4, tag008);

          // The new row should be disabled (read-only)
          QuickMarcEditor.verifyTagValue(4, tag008);
          QuickMarcEditor.verifyDropdownsShownInField(4, true);

          // Step 4: Try to save and check for error message
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkErrorMessage(4, errorNonRepeatable);
          // The pane should still be open
          QuickMarcEditor.checkRecordStatusNew();
        },
      );
    });
  });
});
