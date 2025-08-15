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
        marcFile: {
          marc: 'C409431MarcAuth.mrc',
          fileName: `C409431 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        },
        searchConfigurations: [
          {
            query: 'advST*',
            operator: 'Contains any',
            searchOption: 'Identifier (all)',
          },
          {
            booleanOperator: 'OR',
            query: 'n  79061096409431',
            operator: 'Contains all',
            searchOption: 'Identifier (all)',
          },
          {
            booleanOperator: 'OR',
            query: '(OCoLC)oca00295650409431',
            operator: 'Exact phrase',
            searchOption: 'Identifier (all)',
          },
          {
            booleanOperator: 'AND',
            query: '*test*',
            operator: 'Contains all',
            searchOption: 'Identifier (all)',
          },
          {
            booleanOperator: 'NOT',
            query: 'advST00002',
            operator: 'Starts with',
            searchOption: 'Identifier (all)',
          },
        ],
        expectedResults: [
          {
            searchRecordName: 'C409431 advanced search record 8',
            type: 'Authorized',
            headingType: 'Geographic Name',
          },
          {
            searchRecordName: 'C409431 advanced search record 5',
            type: 'Authorized',
            headingType: 'Personal Name',
          },
          {
            searchRecordName: 'C409431 advanced search record 6',
            type: 'Authorized',
            headingType: 'Geographic Name',
          },
          {
            searchRecordName: 'C409431 advanced search record 2',
            type: 'Authorized',
            headingType: 'Personal Name',
          },
          {
            searchRecordName: 'C409431 advanced search record 7',
            type: 'Authorized',
            headingType: 'Personal Name',
          },
        ],
      };
      const createdAuthorityIDs = [];

      before(() => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C409431*');
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record.authority.id);
          });
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.user = userProperties;

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
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C409431 Advanced search of "MARC authority" records "Identifier (all)" search option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409431'] },
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
