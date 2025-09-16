import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        marcFiles: [
          {
            marc: 'C350577MarcAuth_1.mrc',
            fileName: `C350577 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          },
          {
            marc: 'C350577MarcAuth_2.mrc',
            fileName: `C350577 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          },
          {
            marc: 'C350577MarcAuth_3.mrc',
            fileName: `C350577 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          },
          {
            marc: 'C350577MarcAuth_4.mrc',
            fileName: `C350577 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          },
          {
            marc: 'C350577MarcAuth_5.mrc',
            fileName: `C350577 testMarcFile${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          },
        ],
        searchConfigurations: [
          {
            query: 'Jack, Adrienne',
            operator: 'Contains all',
            searchOption: 'Keyword',
          },
          {
            booleanOperator: 'OR',
            query: 'maps',
            operator: 'Contains any',
            searchOption: 'Keyword',
          },
          {
            booleanOperator: 'OR',
            query: 'no2009097825',
            operator: 'Exact phrase',
            searchOption: 'Keyword',
          },
          {
            booleanOperator: 'OR',
            query: 'Bel',
            operator: 'Starts with',
            searchOption: 'Keyword',
          },
          {
            booleanOperator: 'AND',
            query: 'gf201',
            operator: 'Contains any',
            searchOption: 'Keyword',
          },
          {
            booleanOperator: 'NOT',
            query: '007',
            operator: 'Contains any',
            searchOption: 'Keyword',
          },
        ],
        expectedResults: [
          {
            searchRecordName: 'C350577 Plans (Maps)',
            type: 'Reference',
            headingType: 'Genre',
          },
          {
            searchRecordName: 'C350577 Maps',
            type: 'Authorized',
            headingType: 'Genre',
          },
          {
            searchRecordName: 'Maps350577',
            type: 'Auth/Ref',
            headingType: 'Genre',
          },
          {
            searchRecordName: 'C350577 Mental maps',
            type: 'Authorized',
            headingType: 'Genre',
          },
          {
            searchRecordName: 'C350577 Maps mental',
            type: 'Auth/Ref',
            headingType: 'Genre',
          },
        ],
      };
      const createdAuthorityIDs = [];

      before(() => {
        cy.getAdminToken();

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

            testData.marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record.authority.id);
                });
              });
            });

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });

        if (testData.user && testData.user.userId) {
          Users.deleteViaApi(testData.user.userId);
        }
      });

      it(
        'C350577 Advanced search of "MARC authority" records with boolean operators and search options (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C350577'] },
        () => {
          MarcAuthorities.clickAdvancedSearchButton();

          testData.searchConfigurations.forEach((config, index) => {
            MarcAuthorities.fillAdvancedSearchField(
              index,
              config.query,
              config.searchOption,
              config.booleanOperator,
              config.operator,
            );
          });

          MarcAuthorities.clickSearchButton();
          MarcAuthorities.checkAdvancedSearchModalAbsence();

          testData.expectedResults.forEach((result) => {
            MarcAuthorities.checkAfterSearch(result.type, result.searchRecordName);
          });
        },
      );
    });
  });
});
