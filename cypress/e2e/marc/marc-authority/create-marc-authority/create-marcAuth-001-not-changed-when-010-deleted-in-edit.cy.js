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
      const randomDigits = randomNDigitNumber(15);
      const tag001 = '001';
      const tag008 = '008';
      const tag010 = '010';
      const tag100 = '100';
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const naturalId = `n423543${randomDigits}`;
      const authorityHeading = `AT_C423543_MarcAuthority_${randomPostfix}`;
      const tag010Content = `$a ${naturalId}`;
      const tag001RowIndex = 1;
      const tag010RowIndex = 4;
      const users = {};
      let createdAuthorityId;

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423543_');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(folioAuthFile);
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
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });

      it(
        'C423543 Copied "001" field value of created MARC authority record doesn\'t change when "010" field is deleted from edit window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423543'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.waitLoading();
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select FOLIO authority file; verify 001 is empty
          MarcAuthority.selectSourceFile(folioAuthFile);
          QuickMarcEditor.checkContentByTag(tag001, '');

          // Step 4: Add 010 field with FOLIO prefix and 100 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, tag010Content);
          QuickMarcEditor.checkContentByTag(tag010, tag010Content);

          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag100, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag100, `$a ${authorityHeading}`);

          // Step 5: Save & close; verify 001 equals 010 $a value
          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.waitLoading();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthority.checkTagInRow(tag001RowIndex, naturalId);
            MarcAuthority.checkTagInRow(tag010RowIndex, naturalId);

            // Step 6: Open edit mode
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            // Step 7: Delete 010 field
            QuickMarcEditor.deleteFieldByTagAndCheck(tag010);
            QuickMarcEditor.afterDeleteNotification(tag010);

            // Step 8: Save & close with Continue with save; verify 001 not changed and 010 absent
            QuickMarcEditor.saveAndCloseAfterFieldDelete();
            MarcAuthority.waitLoading();
            MarcAuthority.checkTagInRow(tag001RowIndex, naturalId);
            MarcAuthority.notContains(`${tag010}\t`);
          });
        },
      );
    });
  });
});
