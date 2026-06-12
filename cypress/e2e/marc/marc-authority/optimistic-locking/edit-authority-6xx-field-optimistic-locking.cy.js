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
      const naturalId = `415265${randomNDigitNumber(19)}`;

      const testData = {
        tag100: '100',
        tag670: '670',
        authHeading: `AT_C415265_MarcAuthority_${randomPostfix}`,
        authHeadingUpdatedByA: `AT_C415265_MarcAuthority_${randomPostfix} Updated by A`,
        field670Content: `$a AT_C415265_Field670_${randomPostfix}`,
        field670UpdatedByB: `$a AT_C415265_Field670_${randomPostfix} Updated by B`,
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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C415265_');

        cy.then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI('', naturalId, [
            {
              tag: testData.tag100,
              content: `$a ${testData.authHeading}`,
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag670,
              content: testData.field670Content,
              indicators: ['\\', '\\'],
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
        'C415265 Optimistic locking when editing 6XX field of "MARC authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C415265'] },
        () => {
          // Steps 1-4: User A logs in, searches for and opens the authority record for editing
          cy.login(userA.username, userA.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
          MarcAuthorities.searchBeats(testData.authHeading);
          MarcAuthorities.selectAuthorityById(authorityId);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authHeading);
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 5: Verify URL contains relatedRecordVersion=0
          cy.url().should('include', 'relatedRecordVersion=0');

          // Steps 6-12: While User A has the record open for editing,
          // User B updates the 670 field via API (simulating concurrent edit in another browser tab)
          cy.then(() => {
            cy.getToken(userB.username, userB.password);
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              // Step 10: Verify relatedRecordVersion is 0 (matches User A's open record version)
              const field670 = marcData.fields.find((f) => f.tag === testData.tag670);
              field670.content = testData.field670UpdatedByB;
              marcData.relatedRecordVersion = 0;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.eq(202);
                },
              );
            });
          }).then(() => {
            // Switch back to User A's token so the UI session continues as User A
            cy.getToken(userA.username, userA.password);

            // Step 13: User A edits the 100 field
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.authHeadingUpdatedByA}`,
            );
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              `$a ${testData.authHeadingUpdatedByA}`,
            );

            // Step 14: User A clicks "Save & close" — triggers optimistic locking conflict
            // because User B has already saved a newer version of the record
            QuickMarcEditor.pressSaveAndCloseButton();

            // Step 14 (expected): Conflict detection banner is displayed
            QuickMarcEditor.verifyOptimisticLockingBanner();

            // Step 15: User A clicks "View latest version" link
            QuickMarcEditor.clickViewLatestVersionLink();

            // Step 15 (expected): Detail view shows User B's 670 changes; User A's 100 changes are NOT applied
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.field670UpdatedByB);
            MarcAuthority.notContains(testData.authHeadingUpdatedByA);
          });
        },
      );
    });
  });
});
