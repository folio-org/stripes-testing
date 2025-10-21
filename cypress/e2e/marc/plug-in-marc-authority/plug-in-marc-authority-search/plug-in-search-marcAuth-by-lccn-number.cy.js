import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix, {
  getRandomLetters,
  randomFourDigitNumber,
} from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../../support/constants';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const testData = {
        tag001: '001',
        tag008: '008',
        tag010: '010',
        tag024: '024',
        tag035: '035',
        tag130: '130',
        tag245: '245',
        authorityHeadingPrefix: `AT_C422233_MarcAuthority_${randomPostfix}`,
        bibTitle: `AT_C422233_MarcBibInstance_${randomPostfix}`,
        sourceFilePrefix: 'n',
        lccnNumberBase: `422233${randomDigits}${randomDigits}`,
        lccnSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
        advancedSearchOption: MARC_AUTHORITY_SEARCH_OPTIONS.ADVANCED_SEARCH,
      };

      const authorityHeadings = {
        numbersIn001And024_1: `${testData.authorityHeadingPrefix} (001 field and 024 field)`,
        numbersIn010: `${testData.authorityHeadingPrefix} (010Sa field and 010Sz field)`,
        numbersIn001And024_2: `${testData.authorityHeadingPrefix} (001 field and 024 field)`,
        numbersIn035: `${testData.authorityHeadingPrefix} (035 fields)`,
      };

      const searchQueries = {
        first: `${testData.sourceFilePrefix} ${testData.lccnNumberBase}95`,
        second: `${testData.sourceFilePrefix} ${testData.lccnNumberBase}96`,
        advancedSearch: `lccn containsAll ${testData.sourceFilePrefix} ${testData.lccnNumberBase}95 and lccn containsAll ${testData.sourceFilePrefix} ${testData.lccnNumberBase}96`,
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag130,
          content: `$a ${testData.authorityHeadingPrefix}`,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const authority001Numbers = [
        ` ${testData.lccnNumberBase}95`,
        getRandomLetters(15),
        ` ${testData.lccnNumberBase}96`,
        getRandomLetters(15),
      ];

      const authorityFields = [
        [
          {
            tag: testData.tag024,
            content: `$a ${searchQueries.second}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn001And024_1}`,
            indicators: ['1', '0'],
          },
        ],
        [
          {
            tag: testData.tag010,
            content: `$a ${searchQueries.first} $z ${searchQueries.second}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn010}`,
            indicators: ['1', '0'],
          },
        ],
        [
          {
            tag: testData.tag024,
            content: `$a ${searchQueries.first}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn001And024_2}`,
            indicators: ['1', '0'],
          },
        ],
        [
          {
            tag: testData.tag035,
            content: `$a ${searchQueries.first}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag035,
            content: `$a ${searchQueries.second}`,
            indicators: ['\\', '\\'],
          },
          {
            tag: testData.tag130,
            content: `$a ${authorityHeadings.numbersIn035}`,
            indicators: ['1', '0'],
          },
        ],
      ];

      const createdAuthorityIds = [];
      let createdBibId;

      before('Creating user', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422233_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.then(() => {
            authorityFields.forEach((fields, index) => {
              MarcAuthorities.createMarcAuthorityViaAPI(
                testData.sourceFilePrefix,
                authority001Numbers[index],
                fields,
              ).then((createdRecordId) => {
                createdAuthorityIds.push(createdRecordId);
              });
            });

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
              (instanceId) => {
                createdBibId = instanceId;
              },
            );
          }).then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdBibId);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C422233 MARC Authority plug-in | Verify that "LCCN" search option searches by "$a" and "$z" subfields of "010" field only (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422233'] },
        () => {
          InventoryInstances.searchByTitle(createdBibId);
          InventoryInstances.selectInstanceById(createdBibId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag130);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();

          [searchQueries.first, searchQueries.second].forEach((query) => {
            MarcAuthorities.selectSearchOptionInDropdown(testData.lccnSearchOption);
            MarcAuthorities.checkSelectOptionFieldContent(testData.lccnSearchOption);
            MarcAuthoritiesSearch.selectExcludeReferencesFilter();
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
            );

            MarcAuthorities.searchBeats(query);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(authorityHeadings.numbersIn010);

            MarcAuthorities.clickResetAndCheck();
          });

          MarcAuthorities.selectSearchOptionInDropdown(testData.advancedSearchOption);
          MarcAuthorities.checkSelectOptionFieldContent(testData.advancedSearchOption);
          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );

          MarcAuthoritiesSearch.fillSearchInput(searchQueries.advancedSearch);
          // for unclear reasons, search fails without this wait
          cy.wait(2000);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeadings.numbersIn010);
        },
      );
    });
  });
});
