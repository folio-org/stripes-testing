import Permissions from '../../../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Optimistic locking', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const naturalIdPrefix = `407673${randomNDigitNumber(19)}`;

        const testData = {
          tag110: '110',
          tag410: '410',
          authorityHeading: `AT_C407673_MarcAuthority_${randomPostfix}`,
          authorityHeadingUpdatedByB: `AT_C407673_MarcAuthority_${randomPostfix} Updated by B Heading`,
          tag410ContentUpdatedByA: `$a AT_C407673_MarcAuthority_${randomPostfix} Updated by A Akita`,
        };

        const editSharedPaneheader = 'Edit shared MARC authority record';

        let authorityId;
        let userA;
        let userB;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407673_');

          // Create shared MARC authority record in Central with 110 and 410 fields
          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI('', naturalIdPrefix, [
              {
                tag: testData.tag110,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['2', '\\'],
              },
              {
                tag: testData.tag410,
                content: '$a placeholder 410',
                indicators: ['2', '\\'],
              },
            ]).then((id) => {
              authorityId = id;
            });
          });

          // Create User A in College (primary affiliation = College, logs into Member directly)
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((userProperties) => {
            userA = userProperties;
            // Assign Central tenant permissions (Central affiliation is automatic)
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(userA.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
              Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            ]);
          });

          // Create User B in Central tenant only
          cy.resetTenant();
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((userProperties) => {
            userB = userProperties;
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userB.userId);
          if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);

          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
        });

        it(
          'C407673 Optimistic locking error appears when Shared "MARC authority" record opened at Member tenant has been edited at Central tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C407673'] },
          () => {
            // Steps 1-4: User A (Member/College) opens the authority record for editing
            cy.setTenant(Affiliations.College);
            cy.login(userA.username, userA.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectAuthorityById(authorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.verifySharedAuthorityDetailsHeading(testData.authorityHeading);

            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.checkPaneheaderContains(editSharedPaneheader);

            // Steps 5-10: User B (Central) finds the same record, edits 110 field, and saves via API
            // (Cypress does not support multiple real browser tabs, so User B's edit is done via API)
            cy.resetTenant();
            cy.getToken(userB.username, userB.password);
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              const field110 = marcData.fields.find((f) => f.tag === testData.tag110);
              field110.content = `$a ${testData.authorityHeadingUpdatedByB}`;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.be.greaterThan(200);

                  // Restore User A's token (College tenant)

                  cy.getAdminToken(false);
                  cy.setTenant(Affiliations.College);
                  cy.getToken(userA.username, userA.password);

                  // Step 11: User A edits 410 field and tries to save & keep editing
                  QuickMarcEditor.updateExistingField(
                    testData.tag410,
                    testData.tag410ContentUpdatedByA,
                  );
                  QuickMarcEditor.checkContentByTag(
                    testData.tag410,
                    testData.tag410ContentUpdatedByA,
                  );

                  // Step 12: Save & keep editing → optimistic locking banner shown
                  QuickMarcEditor.clickSaveAndKeepEditingButton();
                  QuickMarcEditor.verifyOptimisticLockingBanner();

                  // Step 13: Click "View latest version" → opens detail view with User B's changes
                  QuickMarcEditor.clickViewLatestVersionLink();
                  MarcAuthority.waitLoading();
                  MarcAuthority.contains(testData.authorityHeadingUpdatedByB);

                  // Step 14: User A opens edit from the latest version
                  MarcAuthority.edit();
                  QuickMarcEditor.waitLoading();
                  QuickMarcEditor.checkPaneheaderContains(editSharedPaneheader);
                  QuickMarcEditor.checkUserNameInHeader(userB.firstName, userB.lastName);

                  // Steps 15-16: User A edits 410 field and saves & keep editing → succeeds
                  QuickMarcEditor.updateExistingField(
                    testData.tag410,
                    testData.tag410ContentUpdatedByA,
                  );
                  QuickMarcEditor.checkContentByTag(
                    testData.tag410,
                    testData.tag410ContentUpdatedByA,
                  );
                  QuickMarcEditor.clickSaveAndKeepEditingButton();
                  QuickMarcEditor.verifyOptimisticLockingBanner({ isShown: false });
                  QuickMarcEditor.checkButtonsDisabled();
                  QuickMarcEditor.checkUserNameInHeader(userA.firstName, userA.lastName);
                  QuickMarcEditor.checkContentByTag(
                    testData.tag410,
                    testData.tag410ContentUpdatedByA,
                  );
                },
              );
            });
          },
        );
      });
    });
  });
});
