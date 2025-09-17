import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const marcFile = {
  marc: 'marcAuthFileC409442.mrc',
  fileName: `testMarcFileC409442.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  propertyName: 'authority',
};
const testData = {};

const searchCases = [
  // Step 3: All Personal name headings
  {
    searchOption: 'Personal name',
    query: 'AT_C409442',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409442 Personal name 100', type: 'Personal Name' },
      { authRef: 'Reference', heading: 'AT_C409442 Personal name 400', type: 'Personal Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409442 Personal name 500', type: 'Personal Name' },
    ],
  },
  // Step 4: Only Authorized Personal name
  {
    searchOption: 'Personal name',
    query:
      'AT_C409442 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq Musical settings Literary style Stage history 1950- England',
    expected: [
      {
        authRef: 'Authorized',
        heading:
          'AT_C409442 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq--Musical settings--Literary style--Stage history--1950---England',
        type: 'Personal Name',
      },
    ],
  },
  // Step 5: Only Reference Personal name
  {
    searchOption: 'Personal name',
    query:
      'AT_C409442 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Reference',
        heading:
          'AT_C409442 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq--subv--subx--suby--subz',
        type: 'Personal Name',
      },
    ],
  },
  // Step 6: Only Auth/Ref Personal name
  {
    searchOption: 'Personal name',
    query:
      'AT_C409442 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq--subv--subx--suby--subz',
    expected: [
      {
        authRef: 'Auth/Ref',
        heading:
          'AT_C409442 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq--subv--subx--suby--subz',
        type: 'Personal Name',
      },
    ],
  },
  // Step 7-9: Negative cases (no records) - using invalid subfields
  {
    searchOption: 'Personal name',
    query:
      'AT_C409442 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq subk Musical settings Literary style Stage history 1950- England',
    expected: [],
  },
  {
    searchOption: 'Personal name',
    query:
      'AT_C409442 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subk--subv--subx--suby--subz',
    expected: [],
  },
  {
    searchOption: 'Personal name',
    query:
      'Family AT_C409442 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq--subv--subx--suby--subz',
    expected: [],
  },

  {
    searchOption: 'Keyword',
    query: 'AT_C409442 Personal name',
    expected: [
      {
        authRef: 'Authorized',
        heading:
          'AT_C409442 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq--Musical settings--Literary style--Stage history--1950---England',
        type: 'Personal Name',
      },
      {
        authRef: 'Reference',
        heading:
          'AT_C409442 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq--subv--subx--suby--subz',
        type: 'Personal Name',
      },
      {
        authRef: 'Auth/Ref',
        heading:
          'AT_C409442 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq--subv--subx--suby--subz',
        type: 'Personal Name',
      },
    ],
  },
];

describe('MARC', () => {
  describe('MARC Authority', () => {
    const createdAuthorityIds = [];

    before('Create test data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.getAdminToken();
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409442*');
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIds.push(record[marcFile.propertyName].id);
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            MarcAuthorities.waitLoading();
          }, 20_000);
        },
      );
    });

    after('Delete data, user', () => {
      cy.getAdminToken();
      createdAuthorityIds.forEach((createdAuthorityId) => {
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
      });

      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C409442 Search for "MARC authority" records using "Personal name" search option (spitfire)',
      { tags: ['extendedPath', 'C409442', 'spitfire'] },
      () => {
        searchCases.forEach(({ searchOption, query, expected }) => {
          MarcAuthorities.selectSearchOptionInDropdown(searchOption);

          MarcAuthoritiesSearch.verifySelectedSearchOption(searchOption);
          MarcAuthorities.searchBeats(query);
          cy.wait(3000);

          if (expected.length === 0) {
            MarcAuthorities.verifyEmptySearchResults(query);
          } else {
            expected.forEach(({ authRef, heading, type }) => {
              MarcAuthorities.verifyResultsRowContent(heading, type, authRef);
            });
          }
        });
      },
    );
  });
});
