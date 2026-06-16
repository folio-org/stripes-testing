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
        const naturalIdPrefix = `407678${randomNDigitNumber(19)}`;

        const testData = {
          tag100: '100',
          tag500: '500',
          authorityHeading: `AT_C407678_MarcAuthority_${randomPostfix}`,
          authorityHeadingUpdatedByB: `AT_C407678_MarcAuthority_${randomPostfix} Updated by B`,
          tag500ContentUpdatedByA: `$a AT_C407678_MarcAuthority_${randomPostfix} Updated by A Kid CUDI`,
        };

        const editLocalPaneheader = 'Edit local MARC authority record';

        let authorityId;
        let userA;
        let userB;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C407678_');

          // Create local MARC authority record in College (Member) with 100 and 500 fields
          cy.then(() => {
            cy.setTenant(Affiliations.College);
            MarcAuthorities.createMarcAuthorityViaAPI('', naturalIdPrefix, [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
              {
                tag: testData.tag500,
                content: '$a placeholder 500',
                indicators: ['\\', '\\'],
              },
            ]).then((id) => {
              authorityId = id;
            });
          });

          // Both User A and User B are created in College (Member) tenant
          cy.setTenant(Affiliations.College);
          cy.createTempUser([
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((userProperties) => {
            userA = userProperties;
          });

          cy.setTenant(Affiliations.College);
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
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);
          if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
        });

        it(
          'C407678 Optimistic locking error appears when Local "MARC authority" record opened at Member tenant has been edited at the same Member tenant (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C407678'] },
          () => {
            // Steps 1-4: User A (College) opens the local authority record for editing
            cy.setTenant(Affiliations.College);
            cy.login(userA.username, userA.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectAuthorityById(authorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.verifyLocalAuthorityDetailsHeading(testData.authorityHeading);

            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.checkPaneheaderContains(editLocalPaneheader);

            // Steps 5-10: User B (College) finds the same record, edits 100 field, and saves via API
            // (Cypress does not support multiple real browser tabs, so User B's edit is done via API)
            cy.getToken(userB.username, userB.password);
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
              field100.content = `$a ${testData.authorityHeadingUpdatedByB}`;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.be.greaterThan(200);

                  // Restore User A's token (College tenant)
                  cy.getToken(userA.username, userA.password);

                  // Step 11: User A edits 500 field and tries to save & close
                  QuickMarcEditor.updateExistingField(
                    testData.tag500,
                    testData.tag500ContentUpdatedByA,
                  );
                  QuickMarcEditor.checkContentByTag(
                    testData.tag500,
                    testData.tag500ContentUpdatedByA,
                  );

                  // Step 12: Save & close → optimistic locking banner shown
                  QuickMarcEditor.pressSaveAndCloseButton();
                  QuickMarcEditor.verifyOptimisticLockingBanner();

                  // Step 13: Click "View latest version" → opens detail view with User B's changes
                  QuickMarcEditor.clickViewLatestVersionLink();
                  MarcAuthority.waitLoading();
                  MarcAuthority.contains(testData.authorityHeadingUpdatedByB);

                  // Step 14: User A opens edit from the latest version
                  MarcAuthority.edit();
                  QuickMarcEditor.waitLoading();
                  QuickMarcEditor.checkPaneheaderContains(editLocalPaneheader);
                  QuickMarcEditor.checkUserNameInHeader(userB.firstName, userB.lastName);

                  // Steps 15-16: User A edits 500 field and saves & close → succeeds
                  QuickMarcEditor.updateExistingField(
                    testData.tag500,
                    testData.tag500ContentUpdatedByA,
                  );
                  QuickMarcEditor.checkContentByTag(
                    testData.tag500,
                    testData.tag500ContentUpdatedByA,
                  );
                  QuickMarcEditor.pressSaveAndClose();
                  QuickMarcEditor.checkAfterSaveAndCloseAuthority();
                  MarcAuthority.waitLoading();
                  MarcAuthority.contains(testData.authorityHeadingUpdatedByB);
                },
              );
            });
          },
        );
      });
    });
  });
});
