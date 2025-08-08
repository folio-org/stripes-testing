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
  marc: 'marcAuthFileC409446.mrc',
  fileName: `testMarcFileC409446.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
  propertyName: 'authority',
};
const testData = {};

const searchOption = 'Geographic name';
const searchCases = [
  // Step 3: All headings
  {
    query: 'AT_C409446',
    expected: [
      { authRef: 'Authorized', heading: 'AT_C409446 Geographic name 151', type: 'Geographic Name' },
      { authRef: 'Reference', heading: 'AT_C409446 Geographic name 451', type: 'Geographic Name' },
      { authRef: 'Auth/Ref', heading: 'AT_C409446 Geographic name 551', type: 'Geographic Name' },
    ],
  },
  // Step 4: Only Authorized Geographic name
  {
    query: 'AT_C409446 Geographic name 151 Gulf Stream subg subv subx suby subz',
    expected: [
      {
        authRef: 'Authorized',
        heading: 'AT_C409446 Geographic name 151 Gulf Stream subg subv subx suby subz',
        type: 'Geographic Name',
      },
    ],
  },
  // Step 5: Only Reference Geographic name
  {
    query: 'AT_C409446 Geographic name 451 Gulf Stream subg subi subv subx suby subz sub4 sub5',
    expected: [
      {
        authRef: 'Reference',
        heading:
          'AT_C409446 Geographic name 451 Gulf Stream subg subi subv subx suby subz sub4 sub5',
        type: 'Geographic Name',
      },
    ],
  },
  // Step 6: Only Auth/Ref Geographic name
  {
    query: 'AT_C409446 Geographic name 551 Ocean currents subg subi subv subx suby subz sub4 sub5',
    expected: [
      {
        authRef: 'Auth/Ref',
        heading:
          'AT_C409446 Geographic name 551 Ocean currents subg subi subv subx suby subz sub4 sub5',
        type: 'Geographic Name',
      },
    ],
  },
  // Step 7-9: Negative cases (no records)
  {
    query: 'AT_C409446 Geographic name 151 Gulf Stream subg subv subx suby subz sub4',
    expected: [],
  },
  {
    query:
      'AT_C409446 Geographic name 451 Gulf Stream subg subi subv subx suby subz sub4 sub5 sub1',
    expected: [],
  },
  {
    query:
      'AT_C409446 Geographic name 551 Ocean currents subg subi subv subx suby subz sub4 sub5 sub1',
    expected: [],
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
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409446*');
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
            cy.reload();
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
      'C409446 Search for "MARC authority" records using "Geographic name" search option (spitfire)',
      { tags: ['extendedPath', 'C409446', 'spitfire'] },
      () => {
        MarcAuthorities.selectSearchOptionInDropdown(searchOption);
        MarcAuthoritiesSearch.verifySelectedSearchOption(searchOption);
        cy.wait(2000);

        searchCases.forEach(({ query, expected }) => {
          MarcAuthorities.searchBeats(query);
          if (expected.length === 0) {
            MarcAuthorities.verifyEmptySearchResults(query);
          } else {
            expected.forEach(({ authRef, heading, type }) => {
              MarcAuthorities.verifyResultsRowContent(heading, type, authRef);
            });
            MarcAuthorities.checkRowsCount(expected.length);
          }
        });
      },
    );
  });
});
