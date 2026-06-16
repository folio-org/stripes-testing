import { including } from '../../../../../../interactors';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../../support/utils/stringTools';
import { tenantNames } from '../../../../../support/dictionary/affiliations';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const field001value = `${getRandomLetters(15)}569552${randomNDigitNumber(4)}`;
        const authorityHeading = `AT_C569552_MarcAuthority_${randomPostfix}`;
        const tag010 = '010';
        const tag100 = '100';
        const errorText = including('Fail: 010 $a is in an invalid format.');

        // Steps 2-19: all values trigger inline validation error (special chars, spaces, letters in LCCN body)
        const errorCases = [
          {
            description: 'special character in LCCN body (no-prefix, underscore)',
            value: 'no_951569552',
          },
          {
            description: 'space in LCCN body (no-prefix, space in middle)',
            value: 'no 951569552',
          },
          {
            description: 'letter in LCCN body (no-prefix, extra letter)',
            value: 'not951569552',
          },
          {
            description: 'special character in LCCN body (no-prefix, comma)',
            value: 'no79,1569552',
          },
          {
            description: 'space in LCCN body (no-prefix, space after 2-digit year)',
            value: 'no79 1569552',
          },
          {
            description: 'letter in LCCN body (no-prefix, letter after 2-digit year)',
            value: 'no79n1569552',
          },
          {
            description: 'special character at end of LCCN body (no-prefix, exclamation mark)',
            value: 'no795569552!',
          },
          {
            description: 'trailing space in LCCN body (no-prefix, space at end)',
            value: 'no795569552 ',
          },
          {
            description: 'letter at end of LCCN body (no-prefix, letter at end)',
            value: 'no795569552q',
          },
          {
            description: 'special character in LCCN body (fst-prefix, parenthesis)',
            value: 'fst(0569552',
          },
          {
            description: 'space in LCCN body (fst-prefix, space after prefix)',
            value: 'fst 0569552',
          },
          {
            description: 'letter in LCCN body (fst-prefix, letter after prefix)',
            value: 'fstq0569552',
          },
          {
            description: 'special characters in LCCN body (fst-prefix, parentheses around digit)',
            value: 'fst56(9)552',
          },
          {
            description: 'spaces in LCCN body (fst-prefix, double space in middle)',
            value: 'fst5  69552',
          },
          {
            description: 'letter in LCCN body (fst-prefix, letter in middle)',
            value: 'fst256t9552',
          },
          {
            description: 'special character at end of LCCN body (fst-prefix, bracket)',
            value: 'fst2569552]',
          },
          {
            description: 'trailing space in LCCN body (fst-prefix, space at end)',
            value: 'fst2569552 ',
          },
          {
            description: 'letter at end of LCCN body (fst-prefix, letter at end)',
            value: 'fst2569552n',
          },
        ];

        let authorityId;
        let userProperties;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569552_');

          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI('', field001value, [
              {
                tag: tag100,
                content: `$a ${authorityHeading}`,
                indicators: ['1', '\\'],
              },
              {
                tag: tag010,
                content: `$a ${field001value}`,
                indicators: ['\\', '\\'],
              },
            ]).then((id) => {
              authorityId = id;
            });
          });

          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUser) => {
            userProperties = createdUser;

            cy.then(() => {
              MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: true });
            });
          });
        });

        after('Cleanup', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: false });
          if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
          if (userProperties) Users.deleteViaApi(userProperties.userId);
        });

        it(
          'C569552 Special characters, spaces, letters existing validation in LCCN body on "Edit MARC authority record" pane when LCCN structure validation is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569552'] },
          () => {
            cy.resetTenant();
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            MarcAuthorities.searchBeats(authorityHeading);
            MarcAuthorities.selectAuthorityById(authorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeading);

            // Step 1: Click Edit → "Edit MARC authority record" pane opens
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            // Steps 2-19: Each value triggers inline validation error due to invalid chars/spaces/letters in LCCN body
            errorCases.forEach(({ description, value }) => {
              cy.log(`Testing error case: ${description} - value: "${value}"`);
              QuickMarcEditor.updateExistingField(tag010, `$a ${value}`);
              QuickMarcEditor.checkContentByTag(tag010, `$a ${value}`);
              QuickMarcEditor.clickSaveAndKeepEditingButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag(tag010, errorText);
              QuickMarcEditor.verifyValidationCallout();
              QuickMarcEditor.closeAllCallouts();
              cy.wait(1000);
            });
          },
        );
      });
    });
  });
});
