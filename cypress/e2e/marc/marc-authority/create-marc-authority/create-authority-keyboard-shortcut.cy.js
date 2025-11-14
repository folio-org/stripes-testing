import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import { MARC_AUTHORITY_SEARCH_OPTIONS } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        authorityHeadingPrefix: `AT_C436885_MarcAuthority_${getRandomPostfix()}`,
        tag010: '010',
        tag100: '100',
        prefix: getRandomLetters(15),
        paneheaderRegExp: /New .*MARC authority record/gi,
        personalNameOption: MARC_AUTHORITY_SEARCH_OPTIONS.PERSONAL_NAME,
      };

      const openCreateViaShortcutAndCheck = () => {
        cy.wait(1000);
        cy.get('textarea#textarea-authorities-search')
          .should('not.be.disabled')
          .focus()
          .type('{alt}{n}');
        QuickMarcEditor.checkPaneheaderContains(testData.paneheaderRegExp);
      };

      const closeCreateAndCheck = ({ browse = false } = {}) => {
        QuickMarcEditor.close();
        MarcAuthorities.waitLoading();
        if (browse) MarcAuthorities.checkDefaultBrowseOptions();
      };

      const createdAuthorityIds = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C436885_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          for (let i = 1; i <= 2; i++) {
            MarcAuthorities.createMarcAuthorityViaAPI(testData.prefix, i, [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeadingPrefix} ${i}`,
                indicators: ['1', '\\'],
              },
            ]).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
          }

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
          MarcAuthorities.switchToSearch();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIds.forEach((id) => {
          MarcAuthorities.deleteViaAPI(id, true);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C436885 Keyboard shortcut - Create a new MARC authority record (Windows) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C436885'] },
        () => {
          openCreateViaShortcutAndCheck();
          closeCreateAndCheck();

          MarcAuthorities.searchBeats(testData.authorityHeadingPrefix);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          openCreateViaShortcutAndCheck();
          closeCreateAndCheck();

          MarcAuthorities.selectIncludingTitle(`${testData.authorityHeadingPrefix} 1`);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.authorityHeadingPrefix} 1`);

          openCreateViaShortcutAndCheck();
          closeCreateAndCheck();

          MarcAuthorities.switchToBrowse();
          MarcAuthorities.checkDefaultBrowseOptions();

          openCreateViaShortcutAndCheck();
          closeCreateAndCheck({ browse: true });

          MarcAuthorityBrowse.searchBy(
            testData.personalNameOption,
            testData.authorityHeadingPrefix,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          openCreateViaShortcutAndCheck();
          closeCreateAndCheck({ browse: true });

          MarcAuthorities.selectTitle(`${testData.authorityHeadingPrefix} 2`);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(`${testData.authorityHeadingPrefix} 2`);

          openCreateViaShortcutAndCheck();
        },
      );
    });
  });
});
