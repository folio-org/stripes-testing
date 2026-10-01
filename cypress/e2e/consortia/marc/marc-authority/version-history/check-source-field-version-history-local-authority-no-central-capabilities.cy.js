import Affiliations from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../../support/fragments/inventory/versionHistorySection';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Version history', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomNDigitNumber(18);
        const testData = {
          tag100: '100',
          authorityHeading: `AT_C1434630_MarcAuthority_${randomPostfix}`,
          authorityHeadingUpdated: `AT_C1434630_MarcAuthority_${randomPostfix} updated`,
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        };

        // Both users have permissions ONLY in the Member tenant - no Central affiliation setup,
        // matching the "user without Central tenant capabilities" precondition
        const userPermissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ];

        let userA;
        let userB;
        let createdAuthorityId;

        before('Create test data', () => {
          cy.getAdminToken();
          // Everything below is created/scoped to the Member tenant only - the authority stays
          // Local (never shared to Central), and both users get their only affiliation here
          cy.setTenant(Affiliations.College);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C1434630_');

          MarcAuthorities.createMarcAuthorityViaAPI('', `${randomDigits}`, [
            {
              tag: testData.tag100,
              content: `$a ${testData.authorityHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            createdAuthorityId = id;
          });

          cy.createTempUser(userPermissions).then((userProperties) => {
            userA = userProperties;
          });

          cy.createTempUser(userPermissions).then((userProperties) => {
            userB = userProperties;
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken(false);
          cy.setTenant(Affiliations.College);
          if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          Users.deleteViaApi(userA.userId);
          Users.deleteViaApi(userB.userId);
        });

        it(
          'C1434630 Verify "Source" field in "Version history" for Local MARC authority as user without Central tenant capabilities (consortia) (promin)',
          { tags: ['criticalPathECS', 'promin', 'C1434630'] },
          () => {
            // Precondition: User B updates the Local authority record from the Member tenant
            cy.setTenant(Affiliations.College);
            cy.login(userB.username, userB.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateExistingField(
              testData.tag100,
              `$a ${testData.authorityHeadingUpdated}`,
            );
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeadingUpdated);

            // Precondition: User A is on the detail view of the updated record, Member tenant
            cy.setTenant(Affiliations.College);
            cy.login(userA.username, userA.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            MarcAuthorities.searchBeats(testData.authorityHeadingUpdated);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();

            // Step 1: Click "Version history" icon - verify the first card's date, "Source"
            // (User B), bold "Current version" link, and "Changed" bullets
            MarcAuthority.clickVersionHistoryButton();
            VersionHistorySection.waitLoading();
            VersionHistorySection.verifyVersionHistoryCard(
              0,
              testData.date,
              userB.firstName,
              userB.lastName,
              false,
              true,
            );
            VersionHistorySection.checkChangeForCard(
              0,
              `Field ${testData.tag100}`,
              VersionHistorySection.fieldActions.EDITED,
            );
          },
        );
      });
    });
  });
});
