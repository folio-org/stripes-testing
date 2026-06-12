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
        const field001value = `${getRandomLetters(15)}569544${randomNDigitNumber(4)}`;
        const authorityHeading = `AT_C569544_MarcAuthority_${randomPostfix}`;
        const tag010 = '010';
        const tag100 = '100';
        const errorText = including('Fail: 010 $a is in an invalid format.');

        // Steps 2-11: all values trigger inline validation error (invalid prefix case)
        const errorCases = [
          {
            description: '11 chars - whole 3-char prefix uppercase + 8 digits',
            value: 'FST56954428',
          },
          {
            description: '11 chars - first letter of 3-char prefix uppercase + 8 digits',
            value: 'Fst56954428',
          },
          {
            description: '11 chars - second letter of 3-char prefix uppercase + 8 digits',
            value: 'fSt56954428',
          },
          {
            description: '11 chars - third letter of 3-char prefix uppercase + 8 digits',
            value: 'fsT56954428',
          },
          {
            description: '11 chars - 1-char uppercase prefix + 2 spaces + 8 digits',
            value: 'F  56954428',
          },
          {
            description: '12 chars - whole 2-char prefix uppercase + 10 digits',
            value: 'NO5695445331',
          },
          {
            description: '12 chars - first letter of 2-char prefix uppercase + 10 digits',
            value: 'No5695445221',
          },
          {
            description: '12 chars - second letter of 2-char prefix uppercase + 10 digits',
            value: 'nO5695445331',
          },
          {
            description: '12 chars - 2-char uppercase prefix + space + 8 digits',
            value: 'NO 56954457',
          },
          {
            description: '11 chars - space + 2-char uppercase prefix + 8 digits',
            value: ' OO56954451',
          },
        ];

        let authorityId;
        let userProperties;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569544_');

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
          ])
            .then((createdUser) => {
              userProperties = createdUser;

              cy.then(() => {
                MarcAuthorities.toggleAuthorityLccnValidationRule({ enable: true });
              });
            })
            .then(() => {
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
          'C569544 LCCN\'s prefix case validation on "Edit MARC authority record" pane when "LCCN structure validation" rule is enabled (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C569544'] },
          () => {
            // Step 1: Click Edit → "Edit MARC authority record" pane opens
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            // Steps 2-11: Each value triggers inline validation error due to invalid prefix case
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
