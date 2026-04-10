import { APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import VersionHistorySettings from '../../../../support/fragments/settings/inventory/versionHistory';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Settings', () => {
      describe('Version history', () => {
        const totalUpdates = 100;
        const totalVersions = totalUpdates + 1;
        const randomPostfix = getRandomPostfix();
        const randomDigits = randomNDigitNumber(10);
        const testData = {
          authorityHeading: `AT_C655287_MarcAuthority_${randomPostfix}`,
          tag100: '100',
          tag640: '640',
          versionHistoryTab: 'Version history',
          marcAuthorityTabName: 'MARC authority',
        };

        const permissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesSettingsVersionHistory.gui,
        ];

        function navigateToVersionHistorySettings() {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
          SettingsPane.checkPaneIsOpened(testData.marcAuthorityTabName);
          SettingsPane.selectSettingsTab(testData.versionHistoryTab);
          VersionHistorySettings.waitLoading();
        }

        function openVersionHistory(initial = false) {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          if (initial) {
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
          } else MarcAuthorities.waitLoading();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
        }

        function updateRecordNTimes(authorityId, iteration) {
          if (iteration > totalUpdates) return;
          cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
            const field640 = marcData.fields.find((f) => f.tag === testData.tag640);
            field640.content = `$a ${testData.authorityHeading} Series Stmt v${iteration}`;
            marcData.relatedRecordVersion = iteration;
            cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(({ status }) => {
              expect(status).to.be.greaterThan(200);
              updateRecordNTimes(authorityId, iteration + 1);
            });
          });
        }

        function closeVersionHistory() {
          VersionHistorySection.clickCloseButton();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);
        }

        before('Create test data', () => {
          cy.getAdminToken();
          cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);

          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C655287');

          MarcAuthorities.createMarcAuthorityViaAPI('', `655287${randomDigits}`, [
            {
              tag: testData.tag100,
              content: `$a ${testData.authorityHeading}`,
              indicators: ['1', '\\'],
            },
            {
              tag: testData.tag640,
              content: `$a ${testData.authorityHeading} Series Stmt`,
              indicators: ['\\', '\\'],
            },
          ]).then((authorityId) => {
            testData.authorityId = authorityId;

            cy.then(() => {
              updateRecordNTimes(testData.authorityId, 1);
            }).then(() => {
              cy.createTempUser(permissions).then((userProperties) => {
                testData.userProperties = userProperties;
              });
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          cy.setMarcAuthorityVersionHistoryRecordsPerPage(10);
          MarcAuthority.deleteViaAPI(testData.authorityId, true);
          Users.deleteViaApi(testData.userProperties.userId);
        });

        // Will FAIL due to https://folio-org.atlassian.net/browse/UISMRCCOMP-41
        it(
          'C655287 Edit "Cards to display per page on Version history" on "Settings >> MARC authority >> Version history" page (spitfire)',
          { tags: ['criticalPath', 'spitfire', 'C655287'] },
          () => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });

              // Steps 1-2: Go to Settings > MARC authority > Version history
              SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
            });
            SettingsPane.checkPaneIsOpened(testData.marcAuthorityTabName);
            SettingsPane.selectSettingsTab(testData.versionHistoryTab);
            VersionHistorySettings.waitLoading();
            VersionHistorySettings.verifyDefaultCardsPerPage();
            VersionHistorySettings.verifySaveButtonEnabled(false);

            // Step 3: Verify dropdown options
            VersionHistorySettings.verifyDropdownOptions();

            // Steps 4-5: Select "25" and save
            VersionHistorySettings.selectCardsPerPageAndSave(25);

            // Step 6: Open version history - verify 25 cards and Load more
            openVersionHistory(true);
            VersionHistorySection.verifyVersionHistoryPane(25, true, totalVersions);
            VersionHistorySection.verifyLoadMoreButton(true);

            // Step 7: First Load more - verify next 25 versions are displayed
            VersionHistorySection.clickLoadMore();
            VersionHistorySection.verifyVersionHistoryPane(25 + 25, true, totalVersions);
            // Step 8: Continue clicking Load more until we reach the end
            const clicksNeeded = Math.ceil(totalVersions / 25) - 1;
            for (let i = 1; i < clicksNeeded; i++) {
              VersionHistorySection.clickLoadMore();
            }
            // After loading all: Original card is displayed, no Load more
            VersionHistorySection.verifyLoadMoreButton(false);
            VersionHistorySection.verifyVersionHistoryCard(
              totalVersions - 1,
              undefined,
              undefined,
              undefined,
              true,
              false,
            );
            closeVersionHistory();

            // Steps 9-10: Go to Settings, select "50" and save
            navigateToVersionHistorySettings();
            VersionHistorySettings.verifyCardsPerPageValue(25);
            VersionHistorySettings.verifySaveButtonEnabled(false);
            VersionHistorySettings.selectCardsPerPageAndSave(50);

            // Step 11: Open version history - verify 50 cards and Load more
            openVersionHistory();
            VersionHistorySection.verifyVersionsCount(totalVersions);
            VersionHistorySection.verifyLoadMoreButton(true);
            closeVersionHistory();

            // Steps 12-13: Go to Settings, select "75" and save
            navigateToVersionHistorySettings();
            VersionHistorySettings.verifyCardsPerPageValue(50);
            VersionHistorySettings.verifySaveButtonEnabled(false);
            VersionHistorySettings.selectCardsPerPageAndSave(75);

            // Step 14: Open version history - verify 75 cards and Load more
            openVersionHistory();
            VersionHistorySection.verifyVersionsCount(totalVersions);
            VersionHistorySection.verifyLoadMoreButton(true);
            closeVersionHistory();

            // Steps 15-16: Go to Settings, select "100" and save
            navigateToVersionHistorySettings();
            VersionHistorySettings.verifyCardsPerPageValue(75);
            VersionHistorySettings.verifySaveButtonEnabled(false);
            VersionHistorySettings.selectCardsPerPageAndSave(100);

            // Step 17: Open version history - verify 100 cards and Load more
            openVersionHistory();
            VersionHistorySection.verifyVersionsCount(totalVersions);
            VersionHistorySection.verifyLoadMoreButton(true);

            // Step 18: Click Load more - verify Original card, no Load more
            VersionHistorySection.clickLoadMore();
            VersionHistorySection.verifyLoadMoreButton(false);
            VersionHistorySection.verifyVersionHistoryCard(
              totalVersions - 1,
              undefined,
              undefined,
              undefined,
              true,
              false,
            );
            closeVersionHistory();
          },
        );
      });
    });
  });
});
