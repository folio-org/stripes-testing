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
        const sharedMarcAuthorityHeadingExisting = `AT_C523575_SharedMarcAuthorityExisting_${randomPostfix}`;
        const sharedMarcAuthorityHeadingToBeEdited = `AT_C523575_SharedMarcAuthorityToBeEdited_${randomPostfix}`;
        const validLccn = '58020559';
        const randomDigits = `${randomNDigitNumber(5)}`;
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeadingExisting}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a   ${validLccn} $z  19951908`,
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
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C523575');

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

              MarcAuthorities.createMarcAuthorityViaAPI(
                '',
                `${randomDigits}2`,
                marcAuthorityFields[1],
              ).then((authorityId) => {
                createdAuthorityId.push(authorityId);
              });

              cy.toggleLccnDuplicateCheck({ enable: false });
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C523575');
        });

        it(
          'C523575 Save existing MARC authority record with value in "010 $a" subfield which matches to other records "010 $a" when duplicate LCCN check is disabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C523575'] },
          () => {
            // Step 0: User is on detail view pane of record
            MarcAuthorities.searchBeats(sharedMarcAuthorityHeadingToBeEdited);
            MarcAuthorities.waitLoading();

            // Step 1: Click on "Actions" button in second pane >> "Edit"
            MarcAuthority.edit();

            // Step 2: Update "010 $a" with LCCNs of existing Shared record
            QuickMarcEditor.updateExistingField('010', `$a ${validLccn}`);
            QuickMarcEditor.clickSaveAndKeepEditing();
          },
        );
      });
    });
  });
});
