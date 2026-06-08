import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../../support/utils/stringTools';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(2);
        const localAuthFile = {
          name: `C514873 auth source file active ${randomPostfix}`,
          prefix: `${randomLetters}`,
          hridStartsWith: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        };
        const marcAuthorityHeadingExisting = `AT_C514873_SharedMarcAuthorityExisting_${randomPostfix}`;
        const marcAuthorityHeadingToBeEdited = `AT_C514873_SharedMarcAuthorityToBeEdited_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${marcAuthorityHeadingExisting}_1`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a   58020559 $z  19951908',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${marcAuthorityHeadingExisting}_2`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$avp  58020560 $zpv  19951909',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${marcAuthorityHeadingExisting}_3`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$avp 58020561$zpv 19951910',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${marcAuthorityHeadingExisting}_4`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$avp58020562$zpv19951911',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${marcAuthorityHeadingToBeEdited}`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a vp  12341236',
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const invalidLccn = [
          {
            name: 'value without prefix which matches to "010 $a" of existing (saved) record',
            value: '58020559',
          },
          {
            name: 'value with prefix and internal spaces which matches to "010 $a" of existing (saved) record',
            value: 'vp  58020560 ',
          },
          {
            name: 'value with prefix and without spaces which matches to "010 $a" of existing (saved) record',
            value: 'vp58020560',
          },
          {
            name: 'value with prefix and one internal space which matches to "010 $a" of existing (saved) record',
            value: 'vp 58020561',
          },
          {
            name: 'value with prefix and without internal spaces which matches to "010 $a" of existing (saved) record',
            value: 'vp58020562',
          },
          {
            name: 'value with prefix and with internal spaces which matches to "010 $a" of existing (saved) record',
            value: 'vp  58020562',
          },
        ];
        const validLccn = [
          {
            name: 'value without prefix which matches to "010 $z" of existing (saved) record',
            value: '19951908',
          },
          {
            name: 'value with prefix and internal spaces which matches to "010 $z" of existing (saved) record',
            value: 'pv  19951909',
          },
          {
            name: 'value with prefix and without spaces which matches to "010 $z" of existing (saved) record',
            value: 'pv19951909',
          },
          {
            name: 'value with prefix and one internal space which matches to "010 $z" of existing (saved) record',
            value: 'pv 19951910',
          },
          {
            name: 'value with prefix and without internal spaces which matches to "010 $z" of existing (saved) record',
            value: 'pv19951911',
          },
          {
            name: 'value with prefix and with internal spaces which matches to "010 $z" of existing (saved) record',
            value: 'pv  19951911',
          },
        ];
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514873');

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
                marcAuthorityFields.forEach((record) => {
                  MarcAuthorities.createMarcAuthorityViaAPI(
                    localAuthFile.prefix,
                    localAuthFile.hridStartsWith,
                    record,
                  ).then((authorityId) => {
                    createdAuthorityId.push(authorityId);
                  });
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514873');
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514873 Cannot save existing MARC authority record with value in "010 $a" subfield which matches to other records "010 $a" when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514873'] },
          () => {
            // Step 0: User is on detail view pane of record
            MarcAuthorities.searchBeats(marcAuthorityHeadingToBeEdited);
            MarcAuthorities.waitLoading();

            // Step 1: Click on "Actions" button in second pane >> "Edit"
            MarcAuthority.edit();

            // Steps 2,4,5,8,10,12: Update "010 $a" with LCCNs of existing Shared record
            invalidLccn.forEach((lccn) => {
              QuickMarcEditor.updateExistingField('010', `$a ${lccn.value}`);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
              QuickMarcEditor.closeAllCallouts();
            });

            // Steps 3,6,7,9,11,13: Update "010 $a" with Canceled LCCNs of existing Shared record
            validLccn.forEach((lccn) => {
              QuickMarcEditor.updateExistingField('010', `$a ${lccn.value}`);
              QuickMarcEditor.clickSaveAndKeepEditing();
              cy.wait(3000);
            });
          },
        );
      });
    });
  });
});
