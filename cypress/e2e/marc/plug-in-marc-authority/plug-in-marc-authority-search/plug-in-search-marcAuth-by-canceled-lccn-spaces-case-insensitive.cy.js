import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix, {
  randomFourDigitNumber,
  getRandomLetters,
} from '../../../../support/utils/stringTools';
import {
  MARC_AUTHORITY_SEARCH_OPTIONS,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../../support/constants';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const randomDigits = `440124${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag010: '010',
        tag008: '008',
        tag100: '100',
        tag245: '245',
        bibTitle: `AT_C440124_MarcBibInstance_${randomPostfix}`,
        bibTag100Content: `C440124 Contributor ${randomPostfix}`,
        user: {},
        searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.LCCN,
      };

      const lccnTestData = [
        {
          heading: `AT_C440124_MarcAuthority 1 ${randomPostfix}`,
          lccn: `n ${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 2 ${randomPostfix}`,
          lccn: `n  ${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 3 ${randomPostfix}`,
          lccn: ` n${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 4 ${randomPostfix}`,
          lccn: `  n${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 5 ${randomPostfix}`,
          lccn: `  n  ${randomDigits}  `,
        },
        {
          heading: `AT_C440124_MarcAuthority 6 ${randomPostfix}`,
          lccn: `n${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 7 ${randomPostfix}`,
          lccn: `N ${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 8  ${randomPostfix}`,
          lccn: `N  ${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 9 ${randomPostfix}`,
          lccn: ` N${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 10 ${randomPostfix}`,
          lccn: `  N${randomDigits}`,
        },
        {
          heading: `AT_C440124_MarcAuthority 11 ${randomPostfix}`,
          lccn: `  N  ${randomDigits}  `,
        },
        {
          heading: `AT_C440124_MarcAuthority 12 ${randomPostfix}`,
          lccn: `N${randomDigits}`,
        },
      ];

      const searchQueries = [
        { query: `n${randomDigits}`, description: 'lower case prefix without spaces' },
        { query: `N${randomDigits}`, description: 'upper case prefix without spaces' },
        { query: `n ${randomDigits}`, description: 'lower case prefix with one space internal' },
        { query: `N ${randomDigits}`, description: 'upper case prefix with one space internal' },
        {
          query: `  n  ${randomDigits}  `,
          description: 'lower case prefix with two spaces everywhere',
        },
        {
          query: `  N  ${randomDigits}  `,
          description: 'upper case prefix with two spaces everywhere',
        },
      ];

      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 1,
      };

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag100,
          content: testData.bibTag100Content,
          indicators: ['1', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.bibTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const expectedHeadings = lccnTestData.map((record) => record.heading);
      const createdAuthorityIds = [];
      let createdInstanceId;

      before('Create test data and login', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C440124_MarcAuthority');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          lccnTestData.forEach((recordData, index) => {
            const marcAuthorityFields = [
              {
                tag: testData.tag010,
                content: `$z ${recordData.lccn}`,
                indicators: ['\\', '\\'],
              },
              {
                tag: testData.tag100,
                content: `$a ${recordData.heading}`,
                indicators: ['1', '\\'],
              },
            ];
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startsWithNumber + index}`,
              marcAuthorityFields,
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
          });
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          InventoryInstance.deleteInstanceViaApi(createdInstanceId);
          createdAuthorityIds.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C440124 MARC Authority plug-in | Search by "LCCN" option using a query with lower, UPPER case when "Canceled LCCN" (010 $z) has (leading, internal, trailing) spaces. (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C440124'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag100);
          MarcAuthorities.switchToSearch();
          MarcAuthorities.verifySearchTabIsOpened();

          searchQueries.forEach((searchData, index) => {
            cy.log(`Step ${index + 1}: Run search with query with ${searchData.description}`);
            if (index > 0) {
              MarcAuthorities.clickResetAndCheck();
              cy.ifConsortia(true, () => {
                MarcAuthorities.clickAccordionByName('Shared');
                MarcAuthorities.verifySharedAccordionOpen(false);
              });
            }
            MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
            MarcAuthorities.checkSelectOptionFieldContent(testData.searchOption);
            MarcAuthorities.searchBeats(searchData.query);
            MarcAuthorities.verifySearchResultTabletIsAbsent(false);
            MarcAuthoritiesSearch.selectExcludeReferencesFilter();
            MarcAuthoritiesSearch.selectExcludeReferencesFilter(
              REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
            );
            cy.ifConsortia(true, () => {
              MarcAuthorities.clickAccordionByName('Shared');
              MarcAuthorities.verifySharedAccordionOpen(true);
              MarcAuthorities.actionsSelectCheckbox('No');
            });

            expectedHeadings.forEach((heading) => {
              MarcAuthorities.verifyRecordFound(heading);
            });
          });
        },
      );
    });
  });
});
