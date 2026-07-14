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
      const naturalId = `n423539${randomDigits}`;
      const naturalIdUpdated = `n423539001${randomDigits}`;
      const authorityHeading = `AT_C423539_MarcAuthority_${randomPostfix}`;
      const tag010InitialContent = `$a ${naturalId}`;
      const tag010UpdatedContent = `$a ${naturalIdUpdated}`;
      const tag001RowIndex = 1;
      const tag010RowIndex = 4;
      const users = {};
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423539_');

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

      after('Delete users, data', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(folioAuthFile);
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });

      it(
        'C423539 Copied "001" field value of created MARC authority record doesn\'t change when "010" field is updated from edit window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423539'] },
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
          MarcAuthority.addNewFieldAfterExistingByTag(tag008, tag010, tag010InitialContent);
          QuickMarcEditor.checkContentByTag(tag010, tag010InitialContent);

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

            // Step 7: Update 010 $a value
            QuickMarcEditor.updateExistingField(tag010, tag010UpdatedContent);
            QuickMarcEditor.checkContentByTag(tag010, tag010UpdatedContent);

            // Step 8: Save & close; verify 001 not changed by updated 010
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
            MarcAuthority.checkTagInRow(tag001RowIndex, naturalId);
            MarcAuthority.checkTagInRow(tag010RowIndex, naturalIdUpdated);
          });
        },
      );
    });
  });
});
