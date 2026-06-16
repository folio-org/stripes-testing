import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import VersionHistorySection from '../../../../../support/fragments/inventory/versionHistorySection';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../../support/utils/stringTools';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Settings', () => {
      describe('Version history', () => {
        describe('Consortia', () => {
          const randomPostfix = getRandomPostfix();
          const randomDigits = `656250${randomNDigitNumber(17)}`;

          const testData = {
            sharedAuthorityHeading: `AT_C656250_SharedMarcAuthority_${randomPostfix}`,
            localAuthorityHeading: `AT_C656250_LocalMarcAuthority_${randomPostfix}`,
            tag100: '100',
            tag640: '640',
            marcAuthorityTabName: 'MARC authority',
            versionHistoryTab: 'Version history',
            initialVersionHistoryCount: 2,
          };

          const centralTenant = { affiliation: Affiliations.Consortia, name: tenantNames.central };
          const memberTenant = { affiliation: Affiliations.College, name: tenantNames.college };

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

          let sharedAuthorityId;
          let localAuthorityId;
          let testUser;

          before('Create test data', () => {
            cy.resetTenant();
            cy.getAdminToken();
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C656250_');

            cy.enableMarcAuthorityVersionHistoryFeature(true);
            cy.withinTenant(memberTenant.affiliation, () => {
              cy.enableMarcAuthorityVersionHistoryFeature(true);
            });

            // Create Shared authority on Central with 1 update (2 versions total)
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
              cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
                const field640 = marcData.fields.find((f) => f.tag === testData.tag640);
                field640.content = `$a ${testData.sharedAuthorityHeading} Series Stmt v2`;
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.be.greaterThan(200);
                  },
                );
              });
            });

            // Create Local authority on Member with 1 update (2 versions total)
            cy.setTenant(memberTenant.affiliation);
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
              cy.getMarcRecordDataViaAPI(authorityId).then((marcData) => {
                const field640 = marcData.fields.find((f) => f.tag === testData.tag640);
                field640.content = `$a ${testData.localAuthorityHeading} Series Stmt v2`;
                cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(
                  ({ status }) => {
                    expect(status).to.be.greaterThan(200);
                  },
                );
              });
            });
            cy.resetTenant();

            // Create user in Central with Member affiliation
            cy.createTempUser(permissions).then((userProperties) => {
              testUser = userProperties;
              cy.affiliateUserToTenant({
                tenantId: memberTenant.affiliation,
                userId: testUser.userId,
                permissions,
              });
            });
          });

          after('Delete test data', () => {
            cy.resetTenant();
            cy.getAdminToken();

            cy.enableMarcAuthorityVersionHistoryFeature(true);
            MarcAuthority.deleteViaAPI(sharedAuthorityId, true);
            Users.deleteViaApi(testUser.userId);

            cy.setTenant(memberTenant.affiliation);
            cy.enableMarcAuthorityVersionHistoryFeature(true);
            MarcAuthority.deleteViaAPI(localAuthorityId, true);
          });

          it(
            'C656250 Disable "Audit log" feature from Central tenant and check detail view panes of Shared and Local "MARC authority" record (consortia) (spitfire)',
            { tags: ['extendedPathECS', 'spitfire', 'nonParallel', 'C656250'] },
            () => {
              cy.resetTenant();
              cy.login(testUser.username, testUser.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(centralTenant.name);

              // Step 1: Open Shared on Central, verify VH icon shown
              MarcAuthorities.searchBeats(testData.sharedAuthorityHeading);
              MarcAuthorities.selectAuthorityById(sharedAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.sharedAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(true);

              // Step 2: Click VH icon and note version count
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionsCount(testData.initialVersionHistoryCount);
              VersionHistorySection.checkChangeForCard(
                0,
                `Field ${testData.tag640}`,
                VersionHistorySection.fieldActions.EDITED,
              );
              VersionHistorySection.clickCloseButton();

              // Step 3: Switch to Member tenant
              ConsortiumManager.switchActiveAffiliation(centralTenant.name, memberTenant.name);
              MarcAuthorities.waitLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(memberTenant.name);

              // Step 4: Open Local on Member, verify VH icon shown
              MarcAuthorities.searchBeats(testData.localAuthorityHeading);
              MarcAuthorities.selectAuthorityById(localAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.localAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(true);

              // Step 5: Click VH icon and note version count
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionsCount(testData.initialVersionHistoryCount);
              VersionHistorySection.checkChangeForCard(
                0,
                `Field ${testData.tag640}`,
                VersionHistorySection.fieldActions.EDITED,
              );
              VersionHistorySection.clickCloseButton();

              // Step 6: Disable VH for MARC authority on Central via API
              cy.withinTenant(centralTenant.affiliation, () => {
                cy.enableMarcAuthorityVersionHistoryFeature(false);
              });
              cy.setTenant(memberTenant.affiliation);

              // Step 7: Find Shared on Member — VH icon NOT shown (Central VH disabled)
              MarcAuthorities.searchBeats(testData.sharedAuthorityHeading);
              MarcAuthorities.selectAuthorityById(sharedAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.sharedAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(false);

              // Steps 8-10: Edit Shared authority and save
              MarcAuthority.edit();
              QuickMarcEditor.updateExistingField(
                testData.tag640,
                `$a ${testData.sharedAuthorityHeading} edited`,
              );
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.waitLoading();

              // Step 11: Find Local on Member — VH icon IS shown (Member VH still enabled)
              MarcAuthorities.searchBeats(testData.localAuthorityHeading);
              MarcAuthorities.selectAuthorityById(localAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.localAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(true);

              // Steps 12-14: Edit Local authority and save
              MarcAuthority.edit();
              QuickMarcEditor.updateExistingField(
                testData.tag640,
                `$a ${testData.localAuthorityHeading} edited`,
              );
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.localAuthorityHeading);

              // Step 15: Settings > MARC authority — VH tab IS displayed (Member, VH enabled)
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
              SettingsPane.waitLoading();
              SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
              SettingsPane.checkTabPresentInSecondPane(
                testData.marcAuthorityTabName,
                testData.versionHistoryTab,
                true,
              );

              // Step 16: Switch to Central
              ConsortiumManager.switchActiveAffiliation(memberTenant.name, centralTenant.name);
              ConsortiumManager.checkCurrentTenantInTopMenu(centralTenant.name);

              // Step 17: Settings > MARC authority — VH tab NOT displayed (Central, VH disabled)
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
              SettingsPane.waitLoading();
              SettingsPane.selectSettingsTab(testData.marcAuthorityTabName);
              SettingsPane.checkTabPresentInSecondPane(
                testData.marcAuthorityTabName,
                testData.versionHistoryTab,
                false,
              );

              // Step 18: Open Shared on Central — VH icon NOT shown
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
              MarcAuthorities.waitLoading();
              MarcAuthorities.searchBeats(testData.sharedAuthorityHeading);
              MarcAuthorities.selectAuthorityById(sharedAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.sharedAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(false);
              MarcAuthorities.clickResetAndCheck(testData.sharedAuthorityHeading);

              // Step 19: Enable VH for MARC authority on Central via API
              cy.withinTenant(centralTenant.affiliation, () => {
                cy.enableMarcAuthorityVersionHistoryFeature(true);
              });

              // Step 20: Open Shared on Central — VH shown; count = sharedVersionCount (no new version from step 9-10)
              MarcAuthorities.searchBeats(testData.sharedAuthorityHeading);
              MarcAuthorities.selectAuthorityById(sharedAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.sharedAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(true);
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionsCount(testData.initialVersionHistoryCount);
              VersionHistorySection.clickCloseButton();

              // Step 21: Switch to Member
              ConsortiumManager.switchActiveAffiliation(centralTenant.name, memberTenant.name);
              MarcAuthorities.waitLoading();
              ConsortiumManager.checkCurrentTenantInTopMenu(memberTenant.name);

              // Step 22: Open Local on Member — VH shown; count = localVersionCount + 1 (new version from step 12-14)
              MarcAuthorities.searchBeats(testData.localAuthorityHeading);
              MarcAuthorities.selectAuthorityById(localAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.localAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(true);
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionsCount(testData.initialVersionHistoryCount + 1);
              VersionHistorySection.checkChangeForCard(
                0,
                `Field ${testData.tag640}`,
                VersionHistorySection.fieldActions.EDITED,
              );
              VersionHistorySection.checkChangeForCard(
                1,
                `Field ${testData.tag640}`,
                VersionHistorySection.fieldActions.EDITED,
              );
              VersionHistorySection.clickCloseButton();

              // Step 23: Open Shared from Member — VH shown; count = sharedVersionCount (still no new version)
              MarcAuthorities.searchBeats(testData.sharedAuthorityHeading);
              MarcAuthorities.selectAuthorityById(sharedAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.sharedAuthorityHeading);
              MarcAuthority.verifyVersionHistoryButtonShown(true);
              MarcAuthority.clickVersionHistoryButton();
              VersionHistorySection.waitLoading();
              VersionHistorySection.verifyVersionsCount(testData.initialVersionHistoryCount);
            },
          );
        });
      });
    });
  });
});
