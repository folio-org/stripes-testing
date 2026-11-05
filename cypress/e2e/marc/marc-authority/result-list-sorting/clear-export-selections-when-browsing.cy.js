import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
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
      const randomDigits = `353560${randomNDigitNumber(6)}`;
      // Browse query (A) doesn't match any record → shows "would be here" placeholder;
      // the B and C records appear in the browse results next to the placeholder
      const browseQuery = `AT_C353560_MarcAuthority_${randomPostfix}_A`;

      const testData = {
        // Headings B and C appear alphabetically after the non-exact query A
        authorityHeadings: [
          `AT_C353560_MarcAuthority_${randomPostfix}_B`,
          `AT_C353560_MarcAuthority_${randomPostfix}_C`,
        ],
        naturalIds: [`${randomLetters}${randomDigits}1`, `${randomLetters}${randomDigits}2`],
      };

      const marcAuthFieldsFor = (heading) => [
        {
          tag: '100',
          content: `$a ${heading} $t work`,
          indicators: ['1', '\\'],
        },
      ];

      const authorityIds = [];
      let user;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C353560_');

        testData.authorityHeadings.forEach((heading, idx) => {
          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.naturalIds[idx],
            '',
            marcAuthFieldsFor(heading),
          ).then((id) => {
            authorityIds[idx] = id;
          });
        });

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
        authorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
      });

      it(
        'C353560 Clear all export selections when browsing "MARC Authority" records (promin)',
        { tags: ['extendedPath', 'promin', 'C353560'] },
        () => {
          // Steps 1-3: switch to Browse, select Name-title, search with a non-exact query
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
          MarcAuthorityBrowse.searchBy(
            MarcAuthorityBrowse.searchOptions.nameTitle.option,
            browseQuery,
          );

          // Step 4: select checkbox next to the B record — header shows "1 record selected"
          MarcAuthorities.checkSelectAuthorityRecordCheckbox(testData.authorityHeadings[0]);
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');

          // Step 5: Actions dropdown (Browse mode) — Export is enabled
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenuBrowse({ exportEnabled: true });
          MarcAuthorities.clickActionsButton();

          // Step 6: Reset all — browse results cleared, selection count gone from header
          MarcAuthorities.clickReset();
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthorityAbsent('selected');

          // Step 7: Actions dropdown — Export is disabled (no selection)
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenuBrowse({ exportEnabled: false });
          MarcAuthorities.clickActionsButton();

          // Step 8: repeat steps 1-5 — browse again, select, verify Export enabled
          MarcAuthorityBrowse.searchBy(
            MarcAuthorityBrowse.searchOptions.nameTitle.option,
            browseQuery,
          );
          MarcAuthorities.checkSelectAuthorityRecordCheckbox(testData.authorityHeadings[0]);
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenuBrowse({ exportEnabled: true });
          MarcAuthorities.clickActionsButton();

          // Step 9: switch to Search tab — results cleared, selection count gone from header
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthorityAbsent('selected');

          // Step 10: Actions dropdown (Search mode) — Export is disabled
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.verifyActionsMenu({ exportEnabled: false });
        },
      );
    });
  });
});
