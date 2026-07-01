import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import UsersCard from '../../../../support/fragments/users/usersCard';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);
      const testData = {
        authorityHeading: `AT_C651478_MarcAuthority_${randomPostfix}`,
        tag001: '001',
        tag008: '008',
        tag010: '010',
        tag100: '100',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
      };
      const naturalId = `n651478${randomDigits}`;
      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiUsersView.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C651478');

        cy.then(() => {
          cy.createTempUser(permissions).then((userProperties) => {
            testData.userProperties = userProperties;
          });

          cy.getAdminUserDetails().then((user) => {
            testData.lastName = user.personal.lastName;
            testData.firstName = user.personal.firstName;
          });

          MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', [
            { tag: testData.tag010, content: `$a ${naturalId}` },
            {
              tag: testData.tag100,
              content: `$a ${testData.authorityHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((id) => {
            testData.authorityId = id;
          });
        }).then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            waiter: MarcAuthorities.waitLoading,
            path: TopMenu.marcAuthorities,
          });
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.authorityId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C651478 "Version history" pane is displayed for "MARC authority" records created via "quickmarc" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C651478'] },
        () => {
          MarcAuthority.verifyVersionHistoryButtonShown();
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.verifyVersionHistoryPane();
          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.firstName,
            testData.lastName,
            true,
          );

          VersionHistorySection.clickOnSourceLinkInCard(0);
          UsersCard.verifyUserLastFirstNameInCard(testData.lastName, testData.firstName);

          cy.go('back');
          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);
          VersionHistorySection.checkPaneShown(false);
          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.clickCloseButton();
          MarcAuthority.waitLoading();
          MarcAuthority.checkActionsButtonEnabled();
        },
      );
    });
  });
});
