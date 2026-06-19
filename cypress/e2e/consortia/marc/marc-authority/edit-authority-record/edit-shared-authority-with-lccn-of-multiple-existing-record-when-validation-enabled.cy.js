import { including } from '@interactors/html';
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
        const sharedMarcAuthorityHeadingExisting = `AT_C514874_SharedMarcAuthorityExisting_${randomPostfix}`;
        const sharedMarcAuthorityHeadingToBeEdited = `AT_C514874_SharedMarcAuthorityToBeEdited_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
        const randomDigits = `${randomNDigitNumber(5)}`;
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeadingExisting}_1`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a kk58020544 $z ek19951959',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeadingExisting}_2`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a kk58020544 $z ek19951959',
              indicators: ['\\', '\\'],
            },
          ],
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
        const invalidLccn = 'kk58020544';
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514874');

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;

              marcAuthorityFields.forEach((record) => {
                MarcAuthorities.createMarcAuthorityViaAPI('', randomDigits, record).then(
                  (authorityId) => {
                    createdAuthorityId.push(authorityId);
                  },
                );
              });

              cy.toggleLccnDuplicateCheck({ enable: true });
            })
            .then(() => {
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514874');
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514874 Cannot save existing MARC authority record with value in "010 $a" subfield which matches to Multiple records "010 $a" when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514874'] },
          () => {
            // Step 0: User is on detail view pane of record
            MarcAuthorities.searchBeats(sharedMarcAuthorityHeadingToBeEdited);
            MarcAuthorities.waitLoading();

            // Step 1: Click on "Actions" button in second pane >> "Edit"
            MarcAuthority.edit();

            // Step 2: Update "010" field with value which matches to multiple "010 $a" of existing (saved) records:
            QuickMarcEditor.updateExistingField('010', `$a ${invalidLccn}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Steps 3: Update "010" field with value which matches to multiple "010 $z" of existing (saved) records
            QuickMarcEditor.updateExistingField('010', `$z ${invalidLccn}`);
            QuickMarcEditor.clickSaveAndKeepEditing();
            cy.wait(3000);

            // Steps 4: Update "010" field with "$a" only
            QuickMarcEditor.updateExistingField('010', '$a');
            QuickMarcEditor.clickSaveAndKeepEditing();
          },
        );
      });
    });
  });
});
