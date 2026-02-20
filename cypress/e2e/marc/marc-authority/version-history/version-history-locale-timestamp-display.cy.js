import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../../support/constants';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import DeveloperPane from '../../../../support/fragments/settings/developer/developerPane';
import UserLocale from '../../../../support/fragments/settings/developer/user-locate/temporaryUserLocale';
import DateTools from '../../../../support/utils/dateTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        authorityHeading: `AT_C663327_MarcAuthority_${randomPostfix}`,
        tag010: '010',
        tag100: '100',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        newTimezone: 'America/Toronto',
        initialTimestamp: null,
        createdRecordId: null,
        userProperties: null,
      };
      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };
      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiSettingsDeveloperUserLocale.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663327*');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.startWithNumber, [
            {
              tag: testData.tag010,
              content: `$a n663327${randomDigits}`,
            },
            {
              tag: testData.tag100,
              content: `$a ${testData.authorityHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdRecordId) => {
            testData.createdRecordId = createdRecordId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });

            MarcAuthorities.searchByParameter('Keyword', testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();

            MarcAuthority.edit();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateExistingFieldContent(
              5,
              `$a ${testData.authorityHeading} - Updated`,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndCloseAuthority();
            MarcAuthority.waitLoading();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663327 Verify that "Updated date/time stamp" is displayed based on current locale in "Version history" pane of "MARC authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C663327'] },
        () => {
          // Step 1: Click on the 'Version history' icon and note format of Updated date/time stamp
          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(2);

          VersionHistorySection.getCardTimestamp(0).then((initialTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(initialTimestamp);
            testData.initialTimestamp = initialTimestamp;
          });

          VersionHistorySection.clickCloseButton();
          MarcAuthority.waitLoading();

          // Step 2: Go to "Settings" -> Select "Developer" option -> Select "User locale" option
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          SettingsPane.waitLoading();
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.DEVELOPER);
          DeveloperPane.waitLoading();
          DeveloperPane.selectOption('User locale');
          UserLocale.waitLoading();

          // Step 3: Populate "Username" field and change "Time zone" field -> Click "Save" button
          UserLocale.configureUserLocale({
            username: testData.userProperties.username,
            timezone: testData.newTimezone,
          });
          UserLocale.verifySuccessCallout(testData.userProperties.username);

          // Step 4: Back to "MARC authority" record
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchByParameter('Keyword', testData.createdRecordId);
          MarcAuthorities.selectAuthorityById(testData.createdRecordId);
          MarcAuthority.waitLoading();
          cy.reload();

          // Step 5: Click on the 'Version history' icon and verify updated timestamp format
          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(2);

          VersionHistorySection.getCardTimestamp(0).then((updatedTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(updatedTimestamp);
            expect(updatedTimestamp).to.not.equal(testData.initialTimestamp);
          });

          // Step 6: Click on the "Changed" hyperlink of any card and verify modal timestamp
          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.getTimestampFromOpenModalChanges().then((modalTimestamp) => {
            VersionHistorySection.verifyTimestampFormat(modalTimestamp);
            expect(modalTimestamp).to.not.equal(testData.initialTimestamp);
          });
        },
      );
    });
  });
});
