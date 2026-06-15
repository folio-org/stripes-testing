import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const sharedMarcAuthorityHeadingToBeEdited = `AT_C569536_SharedMarcAuthorityToBeEdited_${randomPostfix}`;
        const randomDigits = `${randomNDigitNumber(5)}`;
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeadingToBeEdited}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a 12341236',
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const testCases = [
          {
            name: '11 characters (1 letter + 10 digits)',
            value: '$a n2001050268',
            result: '$a n 2001050268',
          },
          {
            name: '12 characters (space + letter + 10 digits)',
            value: '$a  n2001050269',
            result: '$a n 2001050269',
          },
          {
            name: '12 characters (letter + space + 10 digits)',
            value: '$a n 2001050268',
            result: '$a n 2001050268',
          },
          {
            name: '12 characters (2 letters + 10 digits)',
            value: '$a no2001050268',
            result: '$a no2001050268',
          },
          {
            name: '9 characters (1 letter + 8 digits)',
            value: '$a n79051955',
            result: '$a n  79051955 ',
          },
          {
            name: '10 characters (2 letters + 8 digits)',
            value: '$a nb79051955',
            result: '$a nb 79051955 ',
          },
          {
            name: '11 characters (3 letters + 8 digits)',
            value: '$a aat79051955',
            result: '$a aat79051955 ',
          },
          {
            name: '12 characters (3 letters + 8 digits + space)',
            value: '$a aat79051956 ',
            result: '$a aat79051956 ',
          },
          {
            name: '10 characters (1 letter + space + 8 digits)',
            value: '$a n 79051955',
            result: '$a n  79051955 ',
          },
          {
            name: '10 characters (space + 1 letter + 8 digits)',
            value: '$a  n79051956',
            result: '$a n  79051956 ',
          },
          {
            name: '11 characters (space + 1 letter + space + 8 digits)',
            value: '$a  n 79051955',
            result: '$a n  79051955 ',
          },
        ];
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569536');

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;

              MarcAuthorities.createMarcAuthorityViaAPI(
                '',
                randomDigits,
                marcAuthorityFields[0],
              ).then((authorityId) => {
                createdAuthorityId.push(authorityId);
              });

              MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: true });
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
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569536');
          MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: false });
        });

        it(
          'C569536 Spaces are added automatically in LCCN during saving on "Edit MARC authority record" pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569536'] },
          () => {
            // Step 0: User is on detail view pane of record
            MarcAuthorities.searchBeats(sharedMarcAuthorityHeadingToBeEdited);
            MarcAuthorities.waitLoading();

            // Step 1: Click on "Actions" button in second pane >> "Edit"
            MarcAuthority.edit();

            // Step 2-12: Update "010 $a" with specified LCCN
            testCases.forEach((testCase) => {
              cy.log(`Checking valid LCCN: ${testCase.name}`);
              QuickMarcEditor.updateExistingField('010', testCase.value);
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkContentByTag('010', testCase.result);
              cy.wait(1000);
            });
          },
        );
      });
    });
  });
});
