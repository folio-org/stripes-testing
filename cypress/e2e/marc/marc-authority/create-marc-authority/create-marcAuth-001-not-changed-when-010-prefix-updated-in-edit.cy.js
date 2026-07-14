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
      const tag151 = '151';
      const folioAuthFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_GENRE_FORM_TERMS;
      const naturalId = `gf423545${randomDigits}`;
      const authorityHeading = `AT_C423545_MarcAuthority_${randomPostfix}`;
      const tag010InitialContent = `$a ${naturalId}`;
      const tag010UpdatedContent = `$a dg423545${randomDigits}`;
      const tag001RowIndex = 1;
      const tag010RowIndex = 4;
      const users = {};
      let createdAuthorityId;

      before('Create user, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423545_');

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
        'C423545 Copied "001" field value of created MARC authority record doesn\'t change when prefix in "010 $a" subfield is updated from edit window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C423545'] },
        () => {
          // Step 1: Open new MARC authority record form
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.waitLoading();
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select LC Genre/Form Terms authority file; verify 001 is empty
          MarcAuthority.selectSourceFile(folioAuthFile);
          QuickMarcEditor.checkContentByTag(tag001, '');

          // Step 4: Add 010 field with gf prefix and 151 heading field
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, tag010InitialContent);
          QuickMarcEditor.checkContentByTag(tag010, tag010InitialContent);

          MarcAuthority.addNewFieldAfterExistingByTag(tag010, tag151, `$a ${authorityHeading}`);
          QuickMarcEditor.checkContentByTag(tag151, `$a ${authorityHeading}`);

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

            // Step 7: Update prefix in 010 $a to non-matching value
            QuickMarcEditor.updateExistingField(tag010, tag010UpdatedContent);
            QuickMarcEditor.checkContentByTag(tag010, tag010UpdatedContent);

            // Step 8: Save & close; verify 001 not changed, 010 updated with new prefix
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
            MarcAuthority.checkTagInRow(tag001RowIndex, naturalId);
            MarcAuthority.checkTagInRow(tag010RowIndex, tag010UpdatedContent);
          });
        },
      );
    });
  });
});
