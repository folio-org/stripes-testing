import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Result list / sorting', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(13);
      const randomDigits = `353552${randomNDigitNumber(6)}`;

      const testData = {
        authorityHeading: `AT_C353552_MarcAuthority_${randomPostfix}`,
        naturalId: `${randomLetters}${randomDigits}`,
      };

      const marcAuthFields = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      let user;
      let authorityId;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C353552_');

        MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', marcAuthFields).then(
          (id) => {
            authorityId = id;
          },
        );

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(user.userId);
        MarcAuthority.deleteViaAPI(authorityId, true);
      });

      it(
        'C353552 Clear all export selections when searching "MARC Authority" records (promin)',
        { tags: ['extendedPath', 'promin', 'C353552'] },
        () => {
          // Steps 1-2: search for the own record — it appears with a checkbox
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.verifyRecordFound(testData.authorityHeading);
          MarcAuthority.contains(testData.authorityHeading);

          // Step 3: check the checkbox next to the record — header shows "1 record selected"
          MarcAuthorities.selectCheckboxByRowIndex(0);
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');

          // Step 4: Actions dropdown — Export is enabled
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenu({
            saveUuidsEnabled: true,
            saveCqlEnabled: true,
            exportEnabled: true,
          });
          MarcAuthorities.clickActionsButton();

          // Step 5: Reset all — results cleared, selection count gone from header
          MarcAuthorities.clickReset();
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthorityAbsent('selected');

          // Step 6: Actions dropdown — Export is disabled (no selection)
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenu({ exportEnabled: false });
          MarcAuthorities.clickActionsButton();

          // Step 7: repeat steps 1-4 — search, select, verify Export enabled again
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.verifyRecordFound(testData.authorityHeading);
          MarcAuthority.contains(testData.authorityHeading);
          MarcAuthorities.selectCheckboxByRowIndex(0);
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenu({
            saveUuidsEnabled: true,
            saveCqlEnabled: true,
            exportEnabled: true,
          });
          MarcAuthorities.clickActionsButton();

          // Step 8: switch to Browse tab — results cleared, selection count gone from header
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthorityAbsent('selected');

          // Step 9: Actions dropdown (Browse mode) — Export is disabled
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenuBrowse({ exportEnabled: false });
        },
      );
    });
  });
});
