import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../../support/fragments/inventory/versionHistorySection';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import UsersCard from '../../../../../support/fragments/users/usersCard';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Version history', () => {
      describe('Consortia', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = `397353${randomNDigitNumber(18)}`;
        const testData = {
          tag100: '100',
          authorityHeading: `AT_C663355_MarcAuthority_${randomPostfix}`,
          authorityHeadingUpdated: `AT_C663355_MarcAuthority_${randomPostfix} updated`,
          date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        };

        const authData = {
          prefix: '',
          startWithNumber: randomDigits,
        };

        const userPermissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiUsersView.gui,
        ];

        let userA;
        let userB;
        let createdAuthorityId;

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663355_');

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            `${authData.startWithNumber}1`,
            [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ],
          ).then((id) => {
            createdAuthorityId = id;
          });

          // Create User A in Central (affiliations: Central + Member 1)
          // User A will log into Central automatically
          cy.resetTenant();
          cy.createTempUser(userPermissions).then((userProperties) => {
            userA = userProperties;
            cy.assignAffiliationToUser(Affiliations.College, userA.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(userA.userId, userPermissions);
            cy.resetTenant();
          });

          // Create User B in University/Member 2 (affiliations: Central + Member 2)
          // User B will log into University automatically
          cy.setTenant(Affiliations.University);
          cy.createTempUser(userPermissions).then((userProperties) => {
            userB = userProperties;
            cy.resetTenant();
            cy.assignPermissionsToExistingUser(userB.userId, userPermissions);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
          // Delete User A from Central
          Users.deleteViaApi(userA.userId);

          // Delete User B from University (their creation tenant)
          cy.setTenant(Affiliations.University);
          Users.deleteViaApi(userB.userId);
        });

        it(
          'C663355 Check "Source" field in "Version history" pane when "MARC authority" record was updated by user from different tenant and user has permission to view users (consortia) (spitfire)',
          { tags: ['extendedPathECS', 'spitfire', 'C663355'] },
          () => {
            // Precondition: User B edits authority from Member 2 (University)
            cy.setTenant(Affiliations.University);
            cy.login(userB.username, userB.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

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

            // User A logs in to Central
            cy.resetTenant();
            cy.login(userA.username, userA.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            MarcAuthorities.searchBeats(testData.authorityHeadingUpdated);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();

            // Step 1: Click Version history icon — check source shows User B
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

            // Step 2: Switch active affiliation to Member 1 (College)
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            MarcAuthorities.waitLoading();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

            // Step 3: Find and open detail view of updated MARC authority record
            MarcAuthorities.searchBeats(testData.authorityHeadingUpdated);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();

            // Step 4: Click Version history icon — check source still shows User B
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

            // Step 5: Click hyperlink in Source field — redirected to User B's user record
            VersionHistorySection.verifySourceIsALink(0, true);
            VersionHistorySection.clickOnSourceLinkInCard(0);
            UsersCard.verifyUserCardOpened();
            // TO DO: add verification for correct user record after https://folio-org.atlassian.net/browse/UIIN-3470 is done
          },
        );
      });
    });
  });
});
