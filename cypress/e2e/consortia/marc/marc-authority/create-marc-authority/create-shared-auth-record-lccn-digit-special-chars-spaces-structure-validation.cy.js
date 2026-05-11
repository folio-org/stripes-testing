import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(2);
        const localAuthFile = {
          name: `C569549 auth source file active ${randomPostfix}`,
          prefix: `${randomLetters}`,
          hridStartsWith: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        };
        const sharedMarcAuthorityHeading = `AT_C569549_SharedMarcAuthority_${randomPostfix}`;
        const errorText = including('Fail: 010 $a is in an invalid format.');
        const invalidLccn = [
          {
            name: 'special character in prefix',
            value: 'aa-79051956',
          },
          {
            name: 'digit in prefix',
            value: 'aa979051956',
          },
          {
            name: 'special character in prefix',
            value: '\\at79051956',
          },
          {
            name: 'digit in prefix',
            value: '1at79051956',
          },
          {
            name: 'special character in prefix',
            value: 'a_t79051956',
          },
          {
            name: 'digit in prefix',
            value: 'a9t79051956',
          },
          {
            name: 'special character in prefix',
            value: 'n-7951959',
          },
          {
            name: 'digit in prefix',
            value: 'n007951959',
          },
          {
            name: 'special character in prefix',
            value: '+o7951959',
          },
          {
            name: 'digit in prefix',
            value: '1o7951959',
          },
        ];
        const validLccn = `${randomLetters} ${randomNDigitNumber(8)}`;
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569549');

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;

              cy.createAuthoritySourceFileUsingAPI(
                localAuthFile.prefix,
                localAuthFile.hridStartsWith,
                localAuthFile.name,
              ).then(() => {
                MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: true });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(localAuthFile.name);
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569549');
          MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: false });
        });

        it(
          'C569549 Digit, special characters, space existing validation in LCCN prefix on "Create a new MARC authority record" pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569549'] },
          () => {
            // Step 1: Click on "Actions" button in second pane >> Select "+ New" option
            MarcAuthorities.clickActionsAndNewAuthorityButton();

            // Step 2: Click on the "Select authority file" placeholder in dropdown and select created by user "Local" option
            MarcAuthority.selectSourceFile(localAuthFile.name);
            QuickMarcEditor.checkContentByTag('001', `${localAuthFile.prefix}1`);

            // Step 3: Select valid values in highlighted in red positions (dropdowns) of "008" field
            MarcAuthority.setValid008DropdownValues();

            // Step 4: Add 100 field
            QuickMarcEditor.addNewField('100', `$a ${sharedMarcAuthorityHeading}`, 3);

            // Steps 5-14: Add 010 and check invalid LCCNs
            QuickMarcEditor.addNewField('010', '', 3);
            invalidLccn.forEach((lccn) => {
              QuickMarcEditor.updateExistingField('010', `$a ${lccn.value}`);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
              QuickMarcEditor.closeAllCallouts();
            });

            // Step 15: Update "010 $a" with valid LCCN
            QuickMarcEditor.updateExistingField('010', `$a ${validLccn}`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();
            MarcAuthority.contains(`${validLccn} `);
          },
        );
      });
    });
  });
});
