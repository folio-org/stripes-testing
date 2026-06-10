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
          const cardsPerPageCentral = 25;
          const cardsPerPageMember = 10;
          const randomPostfix = getRandomPostfix();
          const randomDigits = `655284${randomNDigitNumber(17)}`;

          const testData = {
            sharedAuthorityHeading: `AT_C655284_SharedMarcAuthority_${randomPostfix}`,
            localAuthorityHeading: `AT_C655284_LocalMarcAuthority_${randomPostfix}`,
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
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C655284_');

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
            cy.resetTenant();

            // Create user in Central with College affiliation
            cy.createTempUser(permissions).then((userProperties) => {
              testUser = userProperties;
              cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testUser.userId, permissions);
              cy.resetTenant();
            });
          });

          after('Delete test data', () => {
            cy.resetTenant();
            cy.getAdminToken();

            cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);
            Users.deleteViaApi(testUser.userId);
            MarcAuthority.deleteViaAPI(sharedAuthorityId, true);

            cy.setTenant(Affiliations.College);
            cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);
            MarcAuthority.deleteViaAPI(localAuthorityId, true);
          });

          it(
            'C655284 Edit "Cards to display per page on Version history" on "Settings >> MARC authority >> Version history" page from Central tenant (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C655284'] },
            () => {
              cy.resetTenant();
              cy.login(testUser.username, testUser.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

              // Steps 1-2: Change setting to 25 on Central and save
              SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
              SettingsPane.checkPaneIsOpened(testData.marcAuthorityTabName);
              SettingsPane.selectSettingsTab(testData.versionHistoryTab);
              VersionHistorySettings.waitLoading();
              VersionHistorySettings.selectCardsPerPageAndSave(cardsPerPageCentral);

              // Step 3: Open shared record from Central and verify 25 cards shown
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

              // Step 4: Switch active affiliation to Member (College)
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              MarcAuthorities.waitLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

              // Step 5: Open shared record from Member — Central setting applies, shows 25 cards
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

              // Step 6: Open local record from Member — Member setting (10) applies
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
            },
          );
        });
      });
    });
  });
});
