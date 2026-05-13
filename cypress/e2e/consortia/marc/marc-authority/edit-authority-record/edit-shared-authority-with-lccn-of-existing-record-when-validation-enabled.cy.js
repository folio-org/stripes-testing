import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
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
          name: `C514881 auth source file active ${randomPostfix}`,
          prefix: `${randomLetters}`,
          hridStartsWith: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        };
        const sharedMarcAuthorityHeadingExisting = `AT_C514881_SharedMarcAuthorityExisting_${randomPostfix}`;
        const sharedMarcAuthorityHeadingToBeEdited = `AT_C514881_SharedMarcAuthorityToBeEdited_${randomPostfix}`;
        const localMarcAuthorityHeading = `AT_C514881_LocalMarcAuthority_${randomPostfix}`;
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
              content: '$a vp  58020321 $z pv  19951908 ',
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
              content: '$a vp  12341236',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${localMarcAuthorityHeading}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a vp  58020322 $z pv  19951909',
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const invalidLccn = 'vp  58020321';
        const validLccn = [
          {
            name: 'Existing Canceled LCCN of Shared record',
            value: 'pv  19951908',
          },
          {
            name: 'Existing LCCN of Local record',
            value: 'vp  58020322',
          },
        ];
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514881');

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

                cy.resetTenant();
                cy.toggleLccnDuplicateCheck({ enable: true });
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514881');
          cy.toggleLccnDuplicateCheck({ enable: false });
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514881');
        });

        it(
          'C514881 Cannot save existing Shared MARC authority record with value in "010 $a" subfield which matches to other Shared record "010 $a" field when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514881'] },
          () => {
            // Step 0: User is on detail view pane of record
            MarcAuthorities.searchBeats(sharedMarcAuthorityHeadingToBeEdited);
            MarcAuthorities.waitLoading();

            // Step 1: Click on "Actions" button in second pane >> "Edit"
            MarcAuthority.edit();

            // Step 2: Update "010 $a" with LCCNs of existing Shared record
            QuickMarcEditor.updateExistingField('010', `$a ${invalidLccn}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Steps 3-4: Update "010 $a" with Canceled LCCN of Shared record, LCCN of Local record
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
