import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = `autothreesevenfivetwofiveseven${getRandomLetters(7)}`;
    const testData = {
      bibTitlePrefix: `AT_C375257_MarcBibInstance_${randomPostfix}`,
      tag008: '008',
      tag245: '245',
      tag100: '100',
      tag110: '110',
      tag111: '111',
      tag130: '130',
      tag800: '800',
      tag810: '810',
      tag811: '811',
      tag830: '830',
      searchOption: searchInstancesOptions[2],
      searchQueries: [
        `Robinson${randomLetters}`,
        `Robinson${randomLetters} eminent scholar lecture series`,
      ],
    };

    const authData = {
      prefix: getRandomLetters(15),
      startWithNumber: 1000,
    };

    const authorityFields = [
      {
        tag: testData.tag100,
        content: `$a AT_C375257 Robinson${randomLetters}, Peter, $d 1950-2022 $c Inspector Banks series ;`,
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag110,
        content: `$a AT_C375257 Robinson${randomLetters} & Associates, Inc.`,
        indicators: ['2', '\\'],
      },
      {
        tag: testData.tag111,
        content: `$a AT_C375257 1938-1988 Jubilee Conference of the Institution of Agricultural Engineers $d (1988 : $c Robinson${randomLetters} College, Cambridge)`,
        indicators: ['2', '\\'],
      },
      {
        tag: testData.tag130,
        content: `$a AT_C375257 Robinson${randomLetters} eminent scholar lecture series`,
        indicators: ['\\', '0'],
      },
    ];

    const marcBibFieldsToLink = [
      {
        tag: testData.tag800,
        content: '$a AT_C375257_Tag800',
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag810,
        content: '$a AT_C375257_Tag810',
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag811,
        content: '$a AT_C375257_Tag811',
        indicators: ['1', '\\'],
      },
      {
        tag: testData.tag830,
        content: '$a AT_C375257_Tag830',
        indicators: ['1', '\\'],
      },
    ];

    const createdAuthorityIds = [];
    const createdInstanceIds = [];

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C375257');
      InventoryInstances.deleteInstanceByTitleViaApi('AT_C375257');
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.then(() => {
          authorityFields.forEach((field, index) => {
            MarcAuthorities.createMarcAuthorityViaAPI(
              authData.prefix,
              `${authData.startWithNumber + index}`,
              [field],
            ).then((createdRecordId) => {
              createdAuthorityIds.push(createdRecordId);
            });
          });

          marcBibFieldsToLink.forEach((field, index) => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              {
                tag: testData.tag008,
                content: QuickMarcEditor.valid008ValuesInstance,
              },
              {
                tag: testData.tag245,
                content: `$a ${testData.bibTitlePrefix}_${index}`,
                indicators: ['1', '\\'],
              },
              field,
            ]).then((instanceId) => {
              createdInstanceIds.push(instanceId);
            });
          });
        })
          .then(() => {
            authorityFields.forEach((_, index) => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId: createdInstanceIds[index],
                authorityIds: [createdAuthorityIds[index]],
                bibFieldTags: [marcBibFieldsToLink[index].tag],
                authorityFieldTags: [authorityFields[index].tag],
                finalBibFieldContents: [authorityFields[index].content],
              });
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.selectSearchOption(testData.searchOption);
            InventorySearchAndFilter.verifyDefaultSearchOptionSelected(testData.searchOption);
          });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      createdAuthorityIds.forEach((createdAuthorityId) => {
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
      });
      createdInstanceIds.forEach((createdInstanceId) => {
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C375257 Title (all) | Search by "Series" field of linked "MARC Bib" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C375257'] },
      () => {
        InventorySearchAndFilter.fillInSearchQuery(testData.searchQueries[0]);
        InventorySearchAndFilter.checkSearchQueryText(testData.searchQueries[0]);
        InventorySearchAndFilter.checkSearchButtonEnabled();

        InventorySearchAndFilter.clickSearch();
        marcBibFieldsToLink.forEach((_, index) => {
          InventorySearchAndFilter.verifySearchResult(`${testData.bibTitlePrefix}_${index}`);
        });
        InventorySearchAndFilter.verifyNumberOfSearchResults(marcBibFieldsToLink.length);

        InventorySearchAndFilter.fillInSearchQuery(testData.searchQueries[1]);
        InventorySearchAndFilter.checkSearchQueryText(testData.searchQueries[1]);

        InventorySearchAndFilter.clickSearch();
        InventorySearchAndFilter.verifyNumberOfSearchResults(1);
        InventorySearchAndFilter.verifySearchResult(`${testData.bibTitlePrefix}_3`);
      },
    );
  });
});
