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
      const errorMultiple010MarcTags = 'Field is non-repeatable.';
      const marcAuthorityHeading = `AT_C423511_MarcAuthority_${randomPostfix}`;
      const tag010 = '010';
      const tag100 = '100';
      const localAuthFile = {
        name: `C423511 auth source file active ${randomPostfix}`,
        prefix: `na${getRandomLetters(6)}`,
        startWithNumber: '1',
        isActive: true,
      };
      const naturalId = `${randomFourDigitNumber()}${randomFourDigitNumber()}C423511`;
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
          cy.waitForAuthRefresh(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423511 Create a new MARC authority record with multiple "010" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423511'] },
        () => {
          // Step 1: Open new authority record pane
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkRecordStatusNew();
          MarcAuthority.setValid008DropdownValues();

          // Step 2: Select authority file
          MarcAuthority.selectSourceFile(localAuthFile.name);

          // Step 3: Add 3 new fields: 010, 010, 100
          // Add first 010 field
          QuickMarcEditor.addNewField(tag010, `$a ${localAuthFile.prefix}${naturalId}`, 3);
          QuickMarcEditor.checkContent(`$a ${localAuthFile.prefix}${naturalId}`, 4);
          // Add second 010 field
          QuickMarcEditor.addNewField(tag010, `$a ${localAuthFile.prefix}${naturalId}`, 4);
          QuickMarcEditor.checkContent(`$a ${localAuthFile.prefix}${naturalId}`, 5);
          // Add 100 field
          QuickMarcEditor.addNewField(tag100, `$a ${marcAuthorityHeading}`, 5);
          QuickMarcEditor.checkContent(`$a ${marcAuthorityHeading}`, 6);

          // Step 4: Try to save and check for error message
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(5, errorMultiple010MarcTags);
          // The pane should still be open
          QuickMarcEditor.checkRecordStatusNew();
        },
      );
    });
  });
});
