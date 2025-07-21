import moment from 'moment';
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
      const marcAuthorityHeading = `AT_C423507_MarcAuthority_${getRandomPostfix()}`;
      const todayDate = moment(new Date()).format('YYYYMMDD');
      const tag010 = '010';
      const tag100 = '100';
      const tag005 = '005';
      const field005Value = 'test 005 value';
      const authorityFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const prefix = 'n';
      const naturalId = `${randomFourDigitNumber()}${randomFourDigitNumber()}C423507`;
      const validFirstindicatorValue = '1';
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

      after('Delete user and record', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(authorityFile);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423507_');
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C423507 Create a new MARC authority record with multiple "005" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423507'] },
        () => {
          // Step 1: Open new authority record pane
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkRecordStatusNew();

          // Step 2: Select authority file (LCNAF)
          MarcAuthority.selectSourceFile(authorityFile);

          // Step 3: Add 010 and 100 fields
          QuickMarcEditor.addNewField(tag010, `$a ${prefix}${naturalId}`, 3);
          QuickMarcEditor.checkContent(`$a ${prefix}${naturalId}`, 4);
          QuickMarcEditor.addNewField(tag100, `$a ${marcAuthorityHeading}`, 4);
          QuickMarcEditor.checkContent(`$a ${marcAuthorityHeading}`, 5);
          QuickMarcEditor.updateIndicatorValue(tag100, validFirstindicatorValue, 0);

          // Step 4: Add an empty field
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);

          // Step 5: Fill in the 4th box of the new field
          QuickMarcEditor.updateExistingFieldContent(6, `$a ${field005Value}`);
          QuickMarcEditor.checkContent(`$a ${field005Value}`, 6);

          // Step 6: Fill in the first box (MARC tag) with '005'
          QuickMarcEditor.updateTagNameToLockedTag(6, tag005);

          // The new row should be read-only (1st and 4th boxes)
          QuickMarcEditor.verifyTagValue(6, tag005);
          QuickMarcEditor.verifyAllBoxesInARowAreDisabled(6, true, false);

          // Step 7: Save and check for successful creation
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          // Detail view: Only original 005 field, system-generated value (YYYYMMDDHHMMSS)
          // (Check that 005 field exists and matches expected format)
          MarcAuthority.contains(new RegExp(`${tag005}.*${todayDate}\\d{6}`), { regexp: true });
          MarcAuthority.notContains(field005Value);
        },
      );
    });
  });
});
