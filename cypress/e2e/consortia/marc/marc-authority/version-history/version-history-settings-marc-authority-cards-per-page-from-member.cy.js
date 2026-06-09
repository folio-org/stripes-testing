import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import VersionHistorySection from '../../../../../support/fragments/inventory/versionHistorySection';
import VersionHistorySettings from '../../../../../support/fragments/settings/inventory/versionHistory';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      describe('Version history', () => {
        describe('Consortia', () => {
          const totalUpdates = 26;
          const totalSharedVersions = totalUpdates + 1;
          const totalLocalVersions = totalUpdates + 1;
          const cardsPerPageCentral = 10;
          const cardsPerPageMember = 25;
          const randomPostfix = getRandomPostfix();
          const randomDigits = `655285${randomNDigitNumber(17)}`;

          const testData = {
            sharedAuthorityHeading: `AT_C655285_SharedMarcAuthority_${randomPostfix}`,
            localAuthorityHeading: `AT_C655285_LocalMarcAuthority_${randomPostfix}`,
            tag100: '100',
            tag640: '640',
            versionHistoryTab: 'Version history',
            marcAuthorityTabName: 'MARC authority',
          };

          const permissions = [
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesSettingsVersionHistory.gui,
          ];

          let sharedAuthorityId;
          let localAuthorityId;
          let testUser;

          function updateRecordNTimes(authorityId, iteration) {
            if (iteration > totalUpdates) return;
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              const field640 = marcData.fields.find((f) => f.tag === testData.tag640);
              field640.content = `$a Updated content v${iteration}`;
              marcData.relatedRecordVersion = iteration;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.be.greaterThan(200);
                  updateRecordNTimes(authorityId, iteration + 1);
                },
              );
            });
          }

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C655285_');

            // Reset settings to 10 on Central and Member
            cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);
            cy.setTenant(Affiliations.College);
            cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);
            cy.resetTenant();

            // Create Shared authority on Central with 26 updates
            MarcAuthorities.createMarcAuthorityViaAPI('', `${randomDigits}1`, [
              {
                tag: testData.tag100,
                content: `$a ${testData.sharedAuthorityHeading}`,
                indicators: ['1', '\\'],
              },
              {
                tag: testData.tag640,
                content: `$a ${testData.sharedAuthorityHeading} Series Stmt`,
                indicators: ['\\', '\\'],
              },
            ]).then((authorityId) => {
              sharedAuthorityId = authorityId;
              cy.then(() => {
                updateRecordNTimes(sharedAuthorityId, 1);
              });
            });

            // Create Local authority on Member (College) with 26 updates
            cy.setTenant(Affiliations.College);
            MarcAuthorities.createMarcAuthorityViaAPI('', `${randomDigits}2`, [
              {
                tag: testData.tag100,
                content: `$a ${testData.localAuthorityHeading}`,
                indicators: ['1', '\\'],
              },
              {
                tag: testData.tag640,
                content: `$a ${testData.localAuthorityHeading} Series Stmt`,
                indicators: ['\\', '\\'],
              },
            ]).then((authorityId) => {
              localAuthorityId = authorityId;
              cy.then(() => {
                updateRecordNTimes(localAuthorityId, 1);
              });
            });

            // Create user in College (primary affiliation = College, logs in directly to Member)
            cy.setTenant(Affiliations.College);
            cy.createTempUser(permissions).then((userProperties) => {
              testUser = userProperties;
              // Assign Central permissions (Central affiliation is automatic)
              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testUser.userId, permissions);
            });
          });

          after('Delete test data', () => {
            cy.resetTenant();
            cy.getAdminToken();

            cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);
            MarcAuthority.deleteViaAPI(sharedAuthorityId, true);

            cy.setTenant(Affiliations.College);
            cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);
            MarcAuthority.deleteViaAPI(localAuthorityId, true);
            Users.deleteViaApi(testUser.userId);
          });

          it(
            'C655285 Edit "Cards to display per page on Version history" on "Settings >> MARC authority >> Version history" page from Member tenant (consortia) (spitfire)',
            { tags: ['criticalPathECS', 'spitfire', 'nonParallel', 'C655285'] },
            () => {
              cy.setTenant(Affiliations.College);
              cy.login(testUser.username, testUser.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
                authRefresh: true,
              });
              // User's primary affiliation is College — lands directly on Member tenant
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

              // Navigate to Settings > MARC authority > Version history on Member tenant
              SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
              SettingsPane.checkPaneIsOpened(testData.marcAuthorityTabName);
              SettingsPane.selectSettingsTab(testData.versionHistoryTab);
              VersionHistorySettings.waitLoading();

              // Steps 1-2: Change setting to 25 on Member tenant and save
              VersionHistorySettings.selectCardsPerPageAndSave(cardsPerPageMember);

              // Step 3: Open shared record from Member — Central setting (10) applies to shared
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();
              MarcAuthorities.searchBeats(testData.sharedAuthorityHeading);
              MarcAuthorities.selectAuthorityById(sharedAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionHistoryPane(
                cardsPerPageCentral,
                true,
                totalSharedVersions,
              );
              VersionHistorySection.clickCloseButton();

              // Step 4: Open local record from Member — Member setting (25) applies
              MarcAuthorities.searchBeats(testData.localAuthorityHeading);
              MarcAuthorities.selectAuthorityById(localAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionHistoryPane(
                cardsPerPageMember,
                true,
                totalLocalVersions,
              );
              VersionHistorySection.clickCloseButton();

              // Step 5: Switch active affiliation to Central tenant
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              MarcAuthorities.waitLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

              // Step 6: Open shared record from Central — Central setting (10) applies
              MarcAuthorities.searchBeats(testData.sharedAuthorityHeading);
              MarcAuthorities.selectAuthorityById(sharedAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionHistoryPane(
                cardsPerPageCentral,
                true,
                totalSharedVersions,
              );
            },
          );
        });
      });
    });
  });
});
