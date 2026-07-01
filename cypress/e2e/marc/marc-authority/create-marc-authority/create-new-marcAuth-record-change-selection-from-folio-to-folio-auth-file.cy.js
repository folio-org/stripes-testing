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
      const tag100 = '100';
      const tag001RowIndex = 1;
      const tag010RowIndex = 4;
      const headerText = MarcAuthority.createAuthorityPaneTitleRegExp;
      const folioAuthFileMismatched = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const folioAuthFileMatched = DEFAULT_FOLIO_AUTHORITY_FILES.LC_GENRE_FORM_TERMS;
      const naturalId = `gf423551${randomNDigitNumber(15)}`;
      const field010Content = `$a ${naturalId}`;
      const authorityHeading = `AT_C423551_MarcAuthority_${randomPostfix}`;
      const users = {};
      let createdAuthorityId;

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423551_');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthFileMismatched);
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthFileMatched);
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
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFileMismatched);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFileMatched);
      });

      it(
        'C423551 Change selection of authority file from "FOLIO" to different "FOLIO" and create a new MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423551'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();

          // Step 2: Set valid 008 dropdown values
          MarcAuthority.setValid008DropdownValues();

          // Step 3: Add 010 and 100 fields
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, field010Content);
          QuickMarcEditor.checkContentByTag(tag010, field010Content);
          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag100, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          // Step 4: Select FOLIO file that doesn't match 010 prefix; verify 001 is empty
          MarcAuthority.selectSourceFile(folioAuthFileMismatched);
          QuickMarcEditor.checkContentByTag(tag001, naturalId);

          // Step 5: Switch to FOLIO file that matches 010 prefix; verify 001 is empty
          MarcAuthority.selectSourceFile(folioAuthFileMatched);
          QuickMarcEditor.checkContentByTag(tag001, naturalId);

          // Step 6: Save & close; verify record created with matching 001 and 010 values
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;
            MarcAuthority.checkTagInRow(tag001RowIndex, naturalId);
            MarcAuthority.checkTagInRow(tag010RowIndex, naturalId);
          });
        },
      );
    });
  });
});
