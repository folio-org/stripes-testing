import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();
      const tag001 = '001';
      const tag008 = '008';
      const tag010 = '010';
      const tag111 = '111';
      const tag010RowIndex = 4;
      const headerText = MarcAuthority.createAuthorityPaneTitleRegExp;
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const authorityHeading = `AT_C436884_MarcAuthority_${randomPostfix}`;
      // LCNAF prefix is 'n'; 'na' is n + extra 'a' — matches start but does not equal the file's prefix
      const field010Content = `$a na${randomNDigitNumber(15)}436884`;
      const errorMessage =
        'Record cannot be saved. Prefix in the 010 field does not match the selected authority file.';
      const users = {};

      before('Create user, activate authority file', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C436884_');
        ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthFile);

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users?.userProperties.userId);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
      });

      it(
        'C436884 Create a new MARC authority record with "Folio" authority file selected and added "010" field with prefix which includes default and additional letters (promin)',
        { tags: ['extendedPath', 'promin', 'nonParallel', 'C436884'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();

          // Step 2: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();

          // Step 3: Select FOLIO authority file; verify 001 is empty
          MarcAuthority.selectSourceFile(folioAuthFile);
          QuickMarcEditor.checkContentByTag(tag001, '');

          // Step 4: Add 010 with FOLIO prefix + extra letter ('na' vs expected 'n')
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, field010Content);
          QuickMarcEditor.checkContentByTag(tag010, field010Content);

          // Step 5: Add 111 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag111, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag111, `$a ${authorityHeading}`);

          // Step 6: Try to save; verify inline error on 010 row and form stays open
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(tag010RowIndex, errorMessage);
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkPaneheaderContains(headerText);
        },
      );
    });
  });
});
