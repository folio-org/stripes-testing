import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const errorText = 'Record not saved: Communication problem with server. Please try again.';
      const marcAuthorityHeading = `AT_C496202_MarcAuthority_${getRandomPostfix()}`;
      const tagLdr = 'LDR';
      const tag100 = '100';
      const tag010 = '010';
      const localAuthFile = {
        name: `C496202 auth source file active ${randomPostfix}`,
        prefix: `na${getRandomLetters(6)}`,
        startWithNumber: '1',
        isActive: true,
      };
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
          cy.createAuthoritySourceFileUsingAPI(
            localAuthFile.prefix,
            localAuthFile.startWithNumber,
            localAuthFile.name,
            localAuthFile.isActive,
          ).then((sourceId) => {
            localAuthFile.id = sourceId;
          });
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C496202 Create a new MARC authority record with multiple "LDR" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C496202'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkRecordStatusNew();
          MarcAuthority.setValid008DropdownValues();

          MarcAuthority.selectSourceFile(localAuthFile.name);

          QuickMarcEditor.addEmptyFields(3);
          QuickMarcEditor.checkEmptyFieldAdded(4);
          QuickMarcEditor.updateTagNameToLockedTag(4, tagLdr);
          QuickMarcEditor.verifyTagValue(0, tagLdr);
          QuickMarcEditor.verifyTagValue(4, tagLdr);

          QuickMarcEditor.addNewField(tag100, `$a ${marcAuthorityHeading}`, 3);
          QuickMarcEditor.checkContent(`$a ${marcAuthorityHeading}`, 4);
          QuickMarcEditor.updateIndicatorValue(tag100, validFirstindicatorValue, 0);

          QuickMarcEditor.addNewField(tag010, `$a ${localAuthFile.prefix}${naturalId}`, 4);
          QuickMarcEditor.checkContent(`$a ${localAuthFile.prefix}${naturalId}`, 5);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(errorText);
          QuickMarcEditor.checkRecordStatusNew();
        },
      );
    });
  });
});
