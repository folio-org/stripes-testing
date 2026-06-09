import { APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import SoftwareVersions from '../../../../support/fragments/settings/softwareVersions/software-versions';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      describe('Version history', () => {
        const randomPostfix = getRandomPostfix();
        const randomDigits = `655300${randomNDigitNumber(17)}`;

        const testData = {
          authorityHeading: `AT_C655300_MarcAuthority_${randomPostfix}`,
          tag100: '100',
          tag640: '640',
          marcAuthorityTabName: 'MARC authority',
          versionHistoryTab: 'Version history',
          initialVersionHistoryCount: 2,
        };

        const permissions = [
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiMarcAuthoritiesSettingsVersionHistory.gui,
          Permissions.auditConfigGroupsCollectionGet.gui,
          Permissions.auditConfigGroupsSettingsCollectionGet.gui,
          Permissions.auditConfigGroupsSettingsAuditAuthorityCollectionGet.gui,
          Permissions.auditConfigGroupsSettingsItemPut.gui,
          Permissions.auditConfigGroupsSettingsAuditAuthorityEnabledItemPut.gui,
        ];

        let authorityId;
        let testUser;

        before('Create test data', () => {
          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C655300_');

          cy.enableMarcAuthorityVersionHistoryFeature(true);

          // Create authority with 1 update (2 versions total)
          MarcAuthorities.createMarcAuthorityViaAPI('', `${randomDigits}1`, [
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
          ]).then((id) => {
            authorityId = id;
            cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
              const field640 = marcData.fields.find((f) => f.tag === testData.tag640);
              field640.content = `$a ${testData.authorityHeading} Series Stmt v2`;
              cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                ({ status }) => {
                  expect(status).to.be.greaterThan(200);
                },
              );
            });
          });

          cy.createTempUser(permissions).then((userProperties) => {
            testUser = userProperties;
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          cy.enableMarcAuthorityVersionHistoryFeature(true);
          MarcAuthority.deleteViaAPI(authorityId, true);
          Users.deleteViaApi(testUser.userId);
        });

        it(
          'C655300 Disable "Audit log" feature and check detail view pane of "MARC authority" record (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C655300'] },
          () => {
            cy.login(testUser.username, testUser.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });

            // Step 1: Open record, verify VH icon shown
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectAuthorityById(authorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthority.verifyVersionHistoryButtonShown(true);

            // Step 2: Click VH and verify count
            MarcAuthority.clickVersionHistoryButton();
            VersionHistorySection.waitLoading();
            VersionHistorySection.verifyVersionsCount(testData.initialVersionHistoryCount);
            VersionHistorySection.checkChangeForCard(
              0,
              `Field ${testData.tag640}`,
              VersionHistorySection.fieldActions.EDITED,
            );
            VersionHistorySection.clickCloseButton();
            MarcAuthorities.clickResetAndCheck(testData.authorityHeading);

            // Step 3: Settings > MARC authority — VH tab IS displayed
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsPane.waitLoading();
            SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
            SettingsPane.checkTabPresentInSecondPane(
              testData.marcAuthorityTabName,
              testData.versionHistoryTab,
              true,
            );

            // Step 4: Disable VH via API
            cy.enableMarcAuthorityVersionHistoryFeature(false);

            // Step 5: Settings > VH tab NOT displayed
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsPane.waitLoading();
            SettingsPane.checkPaneIsOpened(testData.marcAuthorityTabName);
            SoftwareVersions.selectSoftwareVersions();
            SoftwareVersions.waitLoading();
            SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
            SettingsPane.checkTabPresentInSecondPane(
              testData.marcAuthorityTabName,
              testData.versionHistoryTab,
              false,
            );

            // Step 6: Open record — VH icon NOT shown
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectAuthorityById(authorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthority.verifyVersionHistoryButtonShown(false);

            // Steps 7-9: Edit record and save
            MarcAuthority.edit();
            QuickMarcEditor.updateExistingField(
              testData.tag640,
              `$a ${testData.authorityHeading} edited`,
            );
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthorities.clickResetAndCheck(testData.authorityHeading);

            // Step 10: Enable VH via API
            cy.enableMarcAuthorityVersionHistoryFeature(true);

            // Steps 11-12: Open record — VH shown; count = initial (no new version while disabled)
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectAuthorityById(authorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
            MarcAuthority.verifyVersionHistoryButtonShown(true);
            MarcAuthority.clickVersionHistoryButton();
            VersionHistorySection.waitLoading();
            VersionHistorySection.verifyVersionsCount(testData.initialVersionHistoryCount);
            VersionHistorySection.checkChangeForCard(
              0,
              `Field ${testData.tag640}`,
              VersionHistorySection.fieldActions.EDITED,
            );
            VersionHistorySection.clickCloseButton();

            // Step 13: Settings > VH tab IS displayed again
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsPane.waitLoading();
            SettingsPane.checkPaneIsOpened(testData.marcAuthorityTabName);
            SoftwareVersions.selectSoftwareVersions();
            SoftwareVersions.waitLoading();
            SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
            SettingsPane.checkTabPresentInSecondPane(
              testData.marcAuthorityTabName,
              testData.versionHistoryTab,
              true,
            );
          },
        );
      });
    });
  });
});
