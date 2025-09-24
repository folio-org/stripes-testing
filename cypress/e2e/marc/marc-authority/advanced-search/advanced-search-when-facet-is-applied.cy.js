import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Advanced Search', () => {
      const testData = {
        searchConfigurations: [
          {
            query: 'Jack, Adriennetestauto*',
            operator: 'Contains any',
            searchOption: 'Personal name',
          },
          {
            booleanOperator: 'OR',
            query: 'Maps - Montessoritestauto method of education',
            operator: 'Exact phrase',
            searchOption: 'Subject',
          },
          {
            booleanOperator: 'OR',
            query: 'Belarustestauto',
            operator: 'Exact phrase',
            searchOption: 'Geographic name',
          },
        ],
        expectedResults: [
          {
            searchRecordName: 'Jack, Adriennetestauto',
            type: 'Authorized',
            headingType: 'Personal Name',
          },
          {
            searchRecordName: 'Belarustestauto',
            type: 'Authorized',
            headingType: 'Geographic Name',
          },
        ],
      };
      const marcFiles = [
        {
          marc: 'marcAuthFileForC409433_1.mrc',
          fileName: `C409433 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        {
          marc: 'marcAuthFileForC409433_2.mrc',
          fileName: `C409433 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        {
          marc: 'marcAuthFileForC409433_3.mrc',
          fileName: `C409433 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
      ];
      const createdAuthorityIDs = [];

      before(() => {
        cy.getAdminToken();
        testData.searchConfigurations.forEach((config) => {
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(config.query);
        });
        marcFiles.forEach((marcFile) => {
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

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;
            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C409433 Advanced search of "MARC authority" records when facets were applied to the search result list (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409433'] },
        () => {
          MarcAuthorities.searchByParameter('Keyword', '*');
          MarcAuthorities.chooseAuthoritySourceOption('LC Name Authority file (LCNAF)');
          MarcAuthoritiesSearch.selectExcludeReferencesFilter();
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
            MarcAuthorities.verifyResultsRowContent(
              result.searchRecordName,
              result.type,
              result.headingType,
            );
          });
        },
      );
    });
  });
});
