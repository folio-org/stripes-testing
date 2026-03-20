import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';
import { QuickMarcEditorRow, HTML, including } from '../../../../../interactors';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Validation rules', () => {
      const randomPostfix = getRandomPostfix();
      const authorityHeading = `AT_C895681_MarcAuthority_${randomPostfix}`;
      const testData = {
        tag130: '130',
        tag983: '983',
        tag130Content: `$a ${authorityHeading} $b with ind and subfield codes not specified in rules`,
        tag983Content: '$a Undefined field',
        userProperties: {},
      };

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag130,
          content: testData.tag130Content,
          indicators: ['5', '0'],
        },
      ];

      const userCapabilitySets = [
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
        CapabilitySets.uiMarcAuthoritiesAuthorityRecordEdit,
        CapabilitySets.uiQuickMarcQuickMarcAuthoritiesEditorManage,
      ];

      let createdAuthorityId;
      let authSpecId;

      before('Create test data', () => {
        cy.getAdminToken();
        getAuthoritySpec().then((spec) => {
          authSpecId = spec.id;
          // Ensure "Undefined" validation rules are disabled (default state)
          toggleAllUndefinedValidationRules(authSpecId, { enable: false });
        });
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C895681_MarcAuthority');
        cy.createTempUser([])
          .then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(
              testData.userProperties.userId,
              [],
              userCapabilitySets,
            );
          })
          .then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              authData.startWithNumber,
              authorityFields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C895681 Edit MARC authority record when "Undefined" validation rules are disabled and verify no warnings on "Save & keep editing" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C895681'] },
        () => {
          // Step 1: Navigate to the authority record detail view and open editor
          MarcAuthorities.searchBeats(authorityHeading);
          MarcAuthorities.selectTitle(authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();

          // Step 2: Verify 1XX field has indicator and subfield codes not specified in rules
          // (130 with indicators 5 and 0, containing undefined subfield $b)
          QuickMarcEditor.verifyIndicatorValue(testData.tag130, '5', 0);
          QuickMarcEditor.verifyIndicatorValue(testData.tag130, '0', 1);
          QuickMarcEditor.checkContentByTag(testData.tag130, testData.tag130Content);

          // Step 3: Add undefined field (983 12 $a Undefined field) after the 1XX field
          MarcAuthority.addNewFieldAfterExistingByTag(
            testData.tag130,
            testData.tag983,
            testData.tag983Content,
            '1',
            '2',
          );
          QuickMarcEditor.checkContentByTag(testData.tag983, testData.tag983Content);

          // Step 4: Click "Save & keep editing" and verify expected results
          QuickMarcEditor.clickSaveAndKeepEditing();

          // Verify: success toast notification is displayed and editor window is still open
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          // Verify: updates are saved
          QuickMarcEditor.checkContentByTag(testData.tag130, testData.tag130Content);
          QuickMarcEditor.checkContentByTag(testData.tag983, testData.tag983Content);

          // Verify: warn error messages related to "Undefined" field, indicator, subfield don't display
          cy.expect(
            QuickMarcEditorRow({ tagValue: testData.tag130 })
              .find(HTML(including('Warn:')))
              .absent(),
          );
          cy.expect(
            QuickMarcEditorRow({ tagValue: testData.tag983 })
              .find(HTML(including('Warn:')))
              .absent(),
          );
        },
      );
    });
  });
});
