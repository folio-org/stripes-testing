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
      const errorText = 'Record not saved: Communication problem with server. Please try again.';
      const marcAuthorityHeading = `AT_C496202_MarcAuthority_${getRandomPostfix()}`;
      const tagLdr = 'LDR';
      const tag100 = '100';
      const tag010 = '010';
      const authorityFile = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const prefix = 'n';
      const naturalId = `${randomFourDigitNumber()}${randomFourDigitNumber()}C496202`;
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

      after('Delete user', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(authorityFile);
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C496202 Create a new MARC authority record with multiple "LDR" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C496202'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkRecordStatusNew();

          MarcAuthority.selectSourceFile(authorityFile);

          QuickMarcEditor.addEmptyFields(3);
          QuickMarcEditor.checkEmptyFieldAdded(4);
          QuickMarcEditor.updateTagNameToLockedTag(4, tagLdr);
          QuickMarcEditor.verifyTagValue(0, tagLdr);
          QuickMarcEditor.verifyTagValue(4, tagLdr);

          QuickMarcEditor.addNewField(tag100, `$a ${marcAuthorityHeading}`, 3);
          QuickMarcEditor.checkContent(`$a ${marcAuthorityHeading}`, 4);
          QuickMarcEditor.updateIndicatorValue(tag100, validFirstindicatorValue, 0);

          QuickMarcEditor.addNewField(tag010, `$a ${prefix}${naturalId}`, 4);
          QuickMarcEditor.checkContent(`$a ${prefix}${naturalId}`, 5);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(errorText);
          QuickMarcEditor.checkRecordStatusNew();
        },
      );
    });
  });
});
