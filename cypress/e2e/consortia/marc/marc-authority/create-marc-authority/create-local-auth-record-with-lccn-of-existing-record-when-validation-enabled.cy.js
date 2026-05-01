import { including } from '@interactors/html';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
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
          name: `C514877 auth source file active ${randomPostfix}`,
          prefix: `${randomLetters}`,
          hridStartsWith: '1',
          baseUrl: '',
          source: 'Local',
          isActive: true,
        };
        const lccnNumberOfSharedAuthority = `${randomLetters}  ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const canceledLccnNumberOfSharedAuthority = `${randomLetters}  ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const lccnNumberOfLocalAuthority = `${randomLetters}  ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const canceledLccnNumberOfLocalAuthority = `${randomLetters}  ${randomFourDigitNumber()}${randomFourDigitNumber()}`;
        const sharedMarcAuthorityHeading = `AT_C514877_SharedMarcAuthority_${randomPostfix}`;
        const localMarcAuthorityHeading = `AT_C514877_LocalMarcAuthority_${randomPostfix}`;
        const errorText = including('Fail: 010 $a already exists.');
        const marcAuthorityFields = [
          [
            {
              tag: '100',
              content: `$a ${sharedMarcAuthorityHeading} 1`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfSharedAuthority} $z ${canceledLccnNumberOfSharedAuthority}`,
              indicators: ['\\', '\\'],
            },
          ],
          [
            {
              tag: '100',
              content: `$a ${localMarcAuthorityHeading} 1`,
              indicators: ['1', '1'],
            },
            {
              tag: '010',
              content: `$a ${lccnNumberOfLocalAuthority} $z ${canceledLccnNumberOfLocalAuthority}`,
              indicators: ['\\', '\\'],
            },
          ],
        ];
        const createdAuthorityId = [];
        let user;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514883');
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514883');

          cy.setTenant(Affiliations.College);
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

                cy.setTenant(Affiliations.College);
                MarcAuthorities.createMarcAuthorityViaAPI(
                  localAuthFile.prefix,
                  localAuthFile.hridStartsWith,
                  marcAuthorityFields[1],
                ).then((authorityId) => {
                  createdAuthorityId.push(authorityId);
                });

                cy.toggleLccnDuplicateCheck({ enable: true });
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.login(user.username, user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(localAuthFile.name);
          Users.deleteViaApi(user.userId);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514883');
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514883');
          cy.toggleLccnDuplicateCheck({ enable: false });
        });

        it(
          'C514883 Cannot create Local MARC authority record with value in "010 $a" subfield which matches to other Shared, Local record "010 $a", "010 $z" fields when duplicate LCCN check is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C514883'] },
          () => {
            // Step 1: Click on "Actions" button in second pane >> Select "+ New" option
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            MarcAuthority.setValid008DropdownValues();

            // Step 2: Click on the "Select authority file" placeholder in dropdown and select created by user "Local" option
            MarcAuthority.selectSourceFile(localAuthFile.name);
            QuickMarcEditor.checkContentByTag('001', `${localAuthFile.prefix}1`);

            // Step 3: Add 100 field
            QuickMarcEditor.addNewField('100', `$a ${localMarcAuthorityHeading}_2`, 3);

            // Step 4: Add "010 $a" value which matches to "010 $a" of existing Shared record
            QuickMarcEditor.addNewField('010', `$a ${lccnNumberOfSharedAuthority}`, 3);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 5: Update "010 $a" value which matches to "010 $a" of existing Local record
            QuickMarcEditor.updateExistingField('010', `$a ${lccnNumberOfLocalAuthority}`);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.checkErrorMessageForFieldByTag('010', errorText);
            QuickMarcEditor.closeAllCallouts();

            // Step 6: Update "010 $a" value which matches to "010 $z" of existing Shared record
            QuickMarcEditor.updateExistingField('010', `$a ${canceledLccnNumberOfSharedAuthority}`);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();

            // Step 7: Repeat steps 1-3 and add "010 $a" value which matches to "010 $z" of existing Local record
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            MarcAuthority.setValid008DropdownValues();
            MarcAuthority.selectSourceFile(localAuthFile.name);
            QuickMarcEditor.checkContentByTag('001', `${localAuthFile.prefix}2`);
            QuickMarcEditor.addNewField('100', `$a ${localMarcAuthorityHeading}_3`, 3);
            QuickMarcEditor.addNewField('010', `$a ${canceledLccnNumberOfLocalAuthority}`, 3);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          },
        );
      });
    });
  });
});
