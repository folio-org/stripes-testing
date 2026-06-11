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
        const field001value = `${getRandomLetters(15)}569539${randomNDigitNumber(4)}`;
        const authorityHeading = `AT_C569539_MarcAuthority_${randomPostfix}`;
        const tag010 = '010';
        const tag100 = '100';
        const errorText = including('Fail: 010 $a is in an invalid format.');

        // Steps 2-9: values that save successfully and are normalized
        const successCases = [
          {
            description: '8 digits',
            input: '56953955',
            normalized: '$a    56953955 ',
          },
          {
            description: '1 space + 8 digits',
            input: ' 56953955',
            normalized: '$a    56953955 ',
          },
          {
            description: '2 spaces + 8 digits',
            input: '  56953955',
            normalized: '$a    56953955 ',
          },
          {
            description: '3 spaces + 8 digits',
            input: '   56953955',
            normalized: '$a    56953955 ',
          },
          {
            description: '3 spaces + 8 digits + trailing space',
            input: '   56953956 ',
            normalized: '$a    56953956 ',
          },
          {
            description: '10 digits',
            input: '5695390268',
            normalized: '$a   5695390268',
          },
          {
            description: '1 space + 10 digits',
            input: ' 5695390268',
            normalized: '$a   5695390268',
          },
          {
            description: '2 spaces + 10 digits',
            input: '  5695390269',
            normalized: '$a   5695390269',
          },
        ];

        // Steps 10-14: values that trigger inline validation error
        const errorCases = [
          { description: '12 digits', value: '569539026812' },
          { description: '11 digits', value: '56953902681' },
          { description: '9 digits', value: '569539026' },
          { description: '7 digits', value: '5695390' },
          { description: '1 digit', value: '9' },
        ];

        let authorityId;
        let userProperties;

        before('Create users, data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Clean up any leftover authority records from previous runs
          [...successCases, ...errorCases].forEach((caseItem) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 200,
              query: `naturalId="${caseItem.input}*" and authRefType=="Authorized"`,
            }).then((records) => {
              records.forEach((record) => {
                MarcAuthority.deleteViaAPI(record.id, true);
              });
            });
          });
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C569539_');

          // Create MARC authority record with 100 and 010 fields
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

          // Create user and login
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ])
            .then((createdUser) => {
              userProperties = createdUser;

              // Enable LCCN validation rule
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
          'C569539 Update "MARC authority" record without prefix in LCCN when "LCCN structure validation" is enabled (consortia) (spitfire)',
          { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C569539'] },
          () => {
            // Step 1: Click Edit → "Edit MARC authority record" pane opens
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();

            // Steps 2-9: Each value saves successfully; field is normalized after save
            successCases.forEach(({ description, input, normalized }) => {
              cy.log(`Testing success case: ${description} - input: "${input}"`);
              QuickMarcEditor.updateExistingField(tag010, `$a ${input}`);
              QuickMarcEditor.checkContentByTag(tag010, `$a ${input}`);
              QuickMarcEditor.clickSaveAndKeepEditing();
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkButtonsDisabled();
              QuickMarcEditor.checkContentByTag(tag010, normalized);
              cy.wait(1000); // Wait for save to complete before next iteration
            });

            // Steps 10-14: Each value shows inline validation error
            errorCases.forEach(({ description, value }) => {
              cy.log(`Testing error case: ${description} - value: "${value}"`);
              QuickMarcEditor.updateExistingField(tag010, `$a ${value}`);
              QuickMarcEditor.checkContentByTag(tag010, `$a ${value}`);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.checkErrorMessageForFieldByTag(tag010, errorText);
              QuickMarcEditor.verifyValidationCallout();
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkButtonsEnabled();
              cy.wait(1000); // Wait for save to complete before next iteration
            });
          },
        );
      });
    });
  });
});
