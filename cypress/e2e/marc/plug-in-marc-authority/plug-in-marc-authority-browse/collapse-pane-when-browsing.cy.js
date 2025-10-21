import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import {
  MARC_AUTHORITY_BROWSE_OPTIONS,
  DEFAULT_FOLIO_AUTHORITY_FILES,
} from '../../../../support/constants';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `380558${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        tag010: '010',
        tag008: '008',
        tag100: '100',
        tag245: '245',
        bibTitle: `AT_C380558_MarcBibInstance_${randomPostfix}`,
        authorityheading: `AT_C380558_MarcAuthority_${randomPostfix}`,
        bibTag100Content: `C380558 Contributor ${randomPostfix}`,
        authoritySource: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        sourceFilePrefix: 'n',
      };

      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 1,
      };

      const marcAuthorityFields = [
        {
          tag: testData.tag010,
          content: `$a ${testData.sourceFilePrefix}${randomDigits}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityheading}`,
          indicators: ['1', '\\'],
        },
      ];

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.bibTag100Content}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      let createdAuthorityId;
      let createdInstanceId;

      before('Creating user', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C380558_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startsWithNumber}`,
              marcAuthorityFields,
            ).then((createdRecordId) => {
              createdAuthorityId = createdRecordId;
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdInstanceId = instanceId;
              },
            );
          }).then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
            InventoryInstances.searchByTitle(createdInstanceId);
            InventoryInstances.selectInstanceById(createdInstanceId);
            InventoryInstance.waitLoading();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
            MarcAuthorities.verifyBrowseTabIsOpened();
            MarcAuthorityBrowse.checkResultWithNoValue(testData.bibTag100Content);
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });

      it(
        'C380558 MARC Authority plug-in | Collapse and expand "Search & filter" pane when browsing "MARC Authority" records (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C380558'] },
        () => {
          MarcAuthorityBrowse.clickResetAllAndCheck();

          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed(true);

          MarcAuthoritiesSearch.expandSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneExpanded(true);

          MarcAuthoritiesSearch.fillSearchInput(testData.authorityheading);
          MarcAuthorities.checkSearchQuery(testData.authorityheading);
          MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME);
          MarcAuthorities.checkSelectOptionFieldContent(
            MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
          );
          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed(true);

          MarcAuthoritiesSearch.clickShowFilters();
          MarcAuthorities.checkSearchQuery(testData.authorityheading);
          MarcAuthorities.checkSelectOptionFieldContent(
            MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
          );
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthoritiesSearch.expandSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneExpanded();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.selectIncludingTitle(testData.authorityheading);
          MarcAuthority.waitLoading();

          MarcAuthoritiesSearch.collapseSearchPane();
          MarcAuthority.verifySearchPanesIsAbsent();
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthoritiesSearch.verifySearchPaneIsCollapsed();

          MarcAuthoritiesSearch.expandSearchPane();
          MarcAuthoritiesSearch.verifySearchPaneExpanded();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySource);
          MarcAuthorities.checkSelectedAuthoritySource(testData.authoritySource);

          MarcAuthorityBrowse.clickResetAllAndCheck();
        },
      );
    });
  });
});
