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
import Affiliations from '../../../../../support/dictionary/affiliations';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(2);
        const localAuthFile = {
          name: `C514882 auth source file active ${randomPostfix}`,
          prefix: `${randomLetters}`,
          hridStartsWith: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        };
        const sharedMarcAuthorityHeadingExisting = `AT_C514882_SharedMarcAuthorityExisting_${randomPostfix}`;
        const localMarcAuthorityHeadingExisting = `AT_C514882_LocalMarcAuthorityExisting_${randomPostfix}`;
        const sharedMarcAuthorityHeadingToBeEdited = `AT_C514882_SharedMarcAuthorityToBeEdited_${randomPostfix}`;
        const lccnOfSharedRecord = `${getRandomLetters(2)} ${randomNDigitNumber(8)}`;
        const canceledLccnOfSharedRecord = `${getRandomLetters(2)} ${randomNDigitNumber(8)}`;
        const lccnOfLocalRecord = `${getRandomLetters(2)} ${randomNDigitNumber(8)}`;
        const canceledlccnOfLocalRecord = `${getRandomLetters(2)} ${randomNDigitNumber(8)}`;
        const errorText = including('Fail: 010 $a already exists.');
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeadingExisting}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnOfSharedRecord} $z ${canceledLccnOfSharedRecord}`,
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
              content: '$a dr 12331244',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${localMarcAuthorityHeadingExisting}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnOfLocalRecord} $z ${canceledlccnOfLocalRecord}`,
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const invalidLccn = [
          {
            name: 'Existing LCCN of Shared record',
            value: lccnOfSharedRecord,
          },
          {
            name: 'Existing LCCN of Local record',
            value: lccnOfLocalRecord,
          },
        ];
        const validLccn = [
          {
            name: 'Existing Canceled LCCN of Shared record',
            value: canceledLccnOfSharedRecord,
          },
          {
            name: 'Existing Canceled LCCN of Local record',
            value: canceledlccnOfLocalRecord,
          },
        ];
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514882');
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514882');

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          ])
            .then((createdUser) => {
              user = createdUser;
              cy.resetTenant();
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
              ]);

              cy.createAuthoritySourceFileUsingAPI(
                localAuthFile.prefix,
                localAuthFile.hridStartsWith,
                localAuthFile.name,
              ).then(() => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  localAuthFile.prefix,
                  localAuthFile.hridStartsWith,
                  marcAuthorityFields[0],
                ).then((authorityId) => {
                  createdAuthorityId.push(authorityId);
                });

                MarcAuthorities.createMarcAuthorityViaAPI(
                  localAuthFile.prefix,
                  localAuthFile.hridStartsWith,
                  marcAuthorityFields[1],
                ).then((authorityId) => {
                  createdAuthorityId.push(authorityId);
                });

                cy.setTenant(Affiliations.College);
                MarcAuthorities.createMarcAuthorityViaAPI(
                  localAuthFile.prefix,
                  localAuthFile.hridStartsWith,
                  marcAuthorityFields[2],
                ).then((authorityId) => {
                  createdAuthorityId.push(authorityId);
                });

                cy.toggleLccnDuplicateCheck({ enable: true });
              });
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
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(localAuthFile.name);
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514882');
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514882');
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514882 Cannot save existing Shared MARC authority record with value in "010 $a" subfield which matches to other Shared, Local record "010 $a", "010 $z" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514882'] },
          () => {
            // Step 0: User is on detail view pane of record
            MarcAuthorities.searchBeats(sharedMarcAuthorityHeadingToBeEdited);
            MarcAuthorities.waitLoading();

            // Step 1: Click on "Actions" button in second pane >> "Edit"
            MarcAuthority.edit();

            // Steps 2, 4: Update "010 $a" with LCCNs of existing Shared, Local record
            invalidLccn.forEach((lccn) => {
              QuickMarcEditor.updateExistingField('010', `$a ${lccn.value}`);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
              QuickMarcEditor.closeAllCallouts();
            });

            // Steps 3, 5: Update "010 $a" with Canceled LCCN of Shared record, Canceled LCCN of Local record
            validLccn.forEach((lccn) => {
              QuickMarcEditor.updateExistingField('010', `$a ${lccn.value}`);
              QuickMarcEditor.clickSaveAndKeepEditing();
            });
          },
        );
      });
    });
  });
});
