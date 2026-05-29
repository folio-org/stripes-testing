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
    describe('Create MARC Authority', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomLetters = getRandomLetters(2);
        const localAuthFile = {
          name: `C514872 auth source file active ${randomPostfix}`,
          prefix: `${randomLetters}`,
          hridStartsWith: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        };
        const sharedMarcAuthorityHeading = `AT_C514872_SharedMarcAuthority_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeading}_1_spaces`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a    58020559 $z   19951908',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeading}_2_spaces_prefix`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a vp  58020560 $z pv  19951909',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeading}_3_space_prefix`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a vp 58020561 $z pv 19951910',
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeading}_4_without_space_wiht_prefix`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: '$a vp58020562 $z pv19951911',
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const existingLccn = [
          {
            name: 'Existing LCCN without prefix',
            value: '58020559',
          },
          {
            name: 'Existing LCCN with prefix and internal spaces',
            value: 'vp  58020560 ',
          },
          {
            name: 'Existing LCCN with prefix and without spaces',
            value: 'vp58020560',
          },
          {
            name: 'Existing LCCN with prefix and one internal space',
            value: 'vp 58020561',
          },
          {
            name: 'Existing LCCN with prefix and without internal spaces',
            value: 'vp58020562',
          },
          {
            name: 'Existing LCCN with prefix and with internal spaces',
            value: 'vp  58020562',
          },
        ];
        const existingCanceledLccn = [
          {
            name: 'Existing Canceled LCCN with prefix and internal spaces',
            value: 'pv  19951909',
          },
          {
            name: 'Existing Canceled LCCN with prefix and 1 internal space',
            value: 'pv 19951910',
          },
          {
            name: 'Existing Canceled LCCN without prefix and without spaces',
            value: '19951908',
          },
          {
            name: 'Existing Canceled LCCN with prefix and without internal space',
            value: 'pv19951911',
          },
        ];
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514872');

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
                marcAuthorityFields.forEach((field) => {
                  MarcAuthorities.createMarcAuthorityViaAPI(
                    localAuthFile.prefix,
                    localAuthFile.hridStartsWith,
                    field,
                  ).then((authorityId) => {
                    createdAuthorityId.push(authorityId);
                  });
                });

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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514872');
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514872 Cannot create MARC authority record with value in "010 $a" subfield which matches to other records "010 $a" when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514872'] },
          () => {
            // Step 1: Click on "Actions" button in second pane >> Select "+ New" option
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            MarcAuthority.setValid008DropdownValues();

            // Step 2: Click on the "Select authority file" placeholder in dropdown and select created by user "Local" option
            MarcAuthority.selectSourceFile(localAuthFile.name);
            QuickMarcEditor.checkContentByTag('001', `${localAuthFile.prefix}1`);

            // Step 3: Add 100 and 010 fields
            QuickMarcEditor.addNewField('100', `$a ${sharedMarcAuthorityHeading}_5`, 3);
            QuickMarcEditor.addNewField('010', '', 3);

            // Steps 4-9: Update "010 $a" with LCCNs of existing Shared record
            existingLccn.forEach((lccn) => {
              QuickMarcEditor.updateExistingField('010', `$a ${lccn.value}`);
              QuickMarcEditor.checkContentByTag('010', `$a ${lccn.value}`);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
              QuickMarcEditor.verifyValidationCallout();
              QuickMarcEditor.closeAllCallouts();
            });
            QuickMarcEditor.close();
            QuickMarcEditor.closeWithoutSavingInEditConformation();

            // Steps 10-13: Update "010 $a" with Canceled LCCNs of existing Shared record
            existingCanceledLccn.forEach((canleledLccn, index) => {
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              MarcAuthority.selectSourceFile(localAuthFile.name);
              MarcAuthority.setValid008DropdownValues();
              QuickMarcEditor.addNewField(
                '100',
                `$a ${sharedMarcAuthorityHeading}_${index + 6}`,
                3,
              );
              QuickMarcEditor.addNewField('010', `$a ${canleledLccn.value}`, 3);
              QuickMarcEditor.checkContentByTag('010', `$a ${canleledLccn.value}`);
              QuickMarcEditor.pressSaveAndClose();
              QuickMarcEditor.checkAfterSaveAndCloseAuthority();
            });
          },
        );
      });
    });
  });
});
