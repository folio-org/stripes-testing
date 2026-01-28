import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES, DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import DateTools from '../../../../support/utils/dateTools';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import UsersCard from '../../../../support/fragments/users/usersCard';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        authorityHeading: `AT_C651478_MarcAuthority_${randomPostfix}`,
        tag001: '001',
        tag008: '008',
        tag010: '010',
        tag100: '100',
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        sourceName: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
      };
      const newFields = [
        {
          previousFieldTag: testData.tag008,
          tag: testData.tag010,
          content: `$a n651478${randomDigits}`,
        },
        {
          previousFieldTag: testData.tag010,
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
        },
      ];
      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiUsersView.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C651478');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          cy.getAdminUserDetails().then((user) => {
            testData.lastName = user.personal.lastName;
            testData.firstName = user.personal.firstName;
          });

          cy.then(() => {
            cy.getAdminToken();
            ManageAuthorityFiles.setAuthorityFileToActiveViaApi(testData.sourceName);
          }).then(() => {
            cy.loginAsAdmin();
            TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();
            MarcAuthorities.clickActionsAndNewAuthorityButton();
            MarcAuthority.checkSourceFileSelectShown();
            MarcAuthority.setValid008DropdownValues();
            MarcAuthority.selectSourceFile(testData.sourceName);
            newFields.forEach((newField) => {
              MarcAuthority.addNewFieldAfterExistingByTag(
                newField.previousFieldTag,
                newField.tag,
                newField.content,
              );
            });
            QuickMarcEditor.checkContentByTag(testData.tag010, newFields[0].content);
            QuickMarcEditor.checkContentByTag(testData.tag100, newFields[1].content);
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.verifyCreatedRecordSuccess();
            MarcAuthority.contains(testData.authorityHeading);

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
              authRefresh: true,
            });
            MarcAuthorities.searchBeats(testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(testData.authorityHeading);
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.instanceTitle);
        Users.deleteViaApi(testData.userProperties.userId);
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(testData.sourceName);
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
