import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { QuickMarcEditorRow, Select } from '../../../../../interactors';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const marcAuthorityHeading = `AT_C423510_MarcAuthority_${getRandomPostfix()}`;
      const tag010 = '010';
      const tag100 = '100';
      const tag001 = '001';
      const field001Value = 'test 001 value';
      const authorityFile1 = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const authorityFile2 = DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS;
      const prefix = 'n';
      const naturalId = `${randomFourDigitNumber()}${randomFourDigitNumber()}C423510`;
      const secondSourceFileSelect = QuickMarcEditorRow({ index: 6 }).find(
        Select('Authority file name'),
      );
      const errorNonRepeatable = 'Field is non-repeatable.';
      let userProperties;

      before('Create user and login', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUser) => {
          userProperties = createdUser;
          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(authorityFile1);
          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(authorityFile2);
          cy.waitForAuthRefresh(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete user and record', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(authorityFile1);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(authorityFile2);
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C423510 Create a new MARC authority record with multiple "001" field (spitfire)',
        { tags: ['extendedPathFlaky', 'spitfire', 'nonParallel', 'C423510'] },
        () => {
          // Open new authority record pane
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkRecordStatusNew();
          MarcAuthority.setValid008DropdownValues();

          // Select authority file (LCNAF)
          MarcAuthority.selectSourceFile(authorityFile1);

          // Add 010 and 100 fields
          QuickMarcEditor.addNewField(tag010, `$a ${prefix}${naturalId}`, 3);
          QuickMarcEditor.checkContent(`$a ${prefix}${naturalId}`, 4);
          QuickMarcEditor.addNewField(tag100, `$a ${marcAuthorityHeading}`, 4);
          QuickMarcEditor.checkContent(`$a ${marcAuthorityHeading}`, 5);

          // Add an empty field
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);

          // Fill in the 4th box of the new field
          QuickMarcEditor.updateExistingFieldContent(6, `$a ${field001Value}`);
          QuickMarcEditor.checkContent(`$a ${field001Value}`, 6);

          // Fill in the first box (MARC tag) with '001'
          QuickMarcEditor.updateTagNameToLockedTag(6, tag001);

          // The new row should be read-only (1st and 4th boxes)
          QuickMarcEditor.verifyTagValue(6, tag001);
          QuickMarcEditor.verifyAllBoxesInARowAreDisabled(6, true, false);
          // Source file select is shown in updated field
          cy.expect(secondSourceFileSelect.exists());

          // Select a different source in a select in updated field
          cy.do(secondSourceFileSelect.choose(authorityFile2));
          cy.expect(secondSourceFileSelect.has({ checkedOptionText: authorityFile2 }));
          QuickMarcEditor.checkRecordStatusNew();

          // Try to save and check for error message
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(6, errorNonRepeatable);
          QuickMarcEditor.checkRecordStatusNew();
        },
      );
    });
  });
});
