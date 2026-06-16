import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Optimistic locking', () => {
      const randomPostfix = getRandomPostfix();
      const naturalId = `360095${randomNDigitNumber(19)}`;

      const testData = {
        tag100: '100',
        authHeading: `AT_C360095_MarcAuthority_${randomPostfix}`,
        authHeadingUpdatedByA: `AT_C360095_MarcAuthority_${randomPostfix} Updated by A`,
        authHeadingUpdatedByB: `AT_C360095_MarcAuthority_${randomPostfix} Updated by B`,
        authHeadingUpdatedByASecond: `AT_C360095_MarcAuthority_${randomPostfix} Updated by A second`,
      };

      const userPerms = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      let authorityId;
      let userA;
      let userB;

      before('Create test data via API', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C360095_');

        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
            {
              tag: testData.tag100,
              content: `$a ${testData.authHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            authorityId = id;
          });
        })
          .then(() => {
            cy.createTempUser(userPerms).then((userProperties) => {
              userA = userProperties;
            });
          })
          .then(() => {
            cy.createTempUser(userPerms).then((userProperties) => {
              userB = userProperties;
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(authorityId, true);
        Users.deleteViaApi(userA.userId);
        Users.deleteViaApi(userB.userId);
      });

      it(
        'C360095 Editing same "MARC Authority" record by 2 different users (use "Save & keep editing" button) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C360095'] },
        () => {
          // Steps 1-4: User A logs in, searches for and opens the authority record for editing
          cy.login(userA.username, userA.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.searchBeats(testData.authHeading);
          MarcAuthorities.selectAuthorityById(authorityId);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authHeading);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 5: Verify URL contains relatedRecordVersion=0
          cy.url().should('include', 'relatedRecordVersion=0');

          // Steps 6-10: While User A has the record open for editing,
          // User B updates the same record via API (simulating concurrent edit in another browser tab)
          cy.then(() => {
            cy.getToken(userB.username, userB.password);
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              // Step 8: Verify relatedRecordVersion is 0 (matches User A's open record version)
              expect(marcData.sourceVersion).to.eq(0);
              const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
              field100.content = `$a ${testData.authHeadingUpdatedByB}`;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);
                },
              );
            });
          }).then(() => {
            // Switch back to User A's token so the UI session continues as User A
            cy.getToken(userA.username, userA.password);

            // Step 11: User A edits the 100 field
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.authHeadingUpdatedByA}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.authHeadingUpdatedByA}`,
            );

            // Step 12: User A clicks "Save & keep editing" — triggers optimistic locking conflict
            // because User B has already saved a newer version of the record
            QuickMarcEditor.clickSaveAndKeepEditingButton();

            // Step 12 (expected): Conflict detection banner is displayed
            QuickMarcEditor.verifyOptimisticLockingBanner();

            // Step 13: User A clicks "View latest version" link
            QuickMarcEditor.clickViewLatestVersionLink();

            // Step 13 (expected): Detail view shows User B's changes; User A's changes are NOT applied
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authHeadingUpdatedByB);
            MarcAuthority.notContains(testData.authHeadingUpdatedByA);

            // Step 14: User A opens edit again — User B's name is shown in Source field
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.checkUserNameInHeader(userB.firstName, userB.lastName);

            // Step 15: User A makes a new edit and saves successfully
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.authHeadingUpdatedByASecond}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.authHeadingUpdatedByASecond}`,
            );
            QuickMarcEditor.pressSaveAndCloseButton();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authHeadingUpdatedByASecond);
          });
        },
      );
    });
  });
});
