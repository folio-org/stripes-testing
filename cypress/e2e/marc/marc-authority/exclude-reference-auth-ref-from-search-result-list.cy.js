import {
  DEFAULT_JOB_PROFILE_NAMES,
  REFERENCES_FILTER_CHECKBOXES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      const testData = {
        searchQuery: 'UXPROD-4394',
        authorizedColumnName: 'Authorized/Reference',
        marcFile: {
          marc: 'C409481MarcAuth.mrc',
          fileName: `testMarcFileAuthC409481.${randomFourDigitNumber()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
        createdAuthorityIDs: [],
      };

      before('Create user and import MARC authority records', () => {
        cy.getAdminToken();

        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: 'keyword="UXPROD-4394" and (authRefType==("Authorized" or "Auth/Ref"))',
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id);
            });
          }
        });

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProperties) => {
            testData.userProperties = userProperties;

            DataImport.uploadFileViaApi(
              testData.marcFile.marc,
              testData.marcFile.fileName,
              testData.marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.createdAuthorityIDs.push(record[testData.marcFile.propertyName].id);
              });
            });

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          },
        );
      });

      after('Delete user and authority records', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C409481 Exclude "Reference" and "Auth/Ref" records from search result list using "Reference" filter (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409481'] },
        () => {
          // Step 1-2: Search with keyword that returns all auth ref types
          MarcAuthoritiesSearch.searchBy('Keyword', testData.searchQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Reference', 'Auth/Ref'],
          });

          // Step 3-4: Click "References" accordion and check "Exclude see from"
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyValueDoesntExistInColumn(
            testData.authorizedColumnName,
            'Reference',
          );
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Auth/Ref'],
          });

          // Step 5: Check "Exclude see from also"
          MarcAuthoritiesSearch.selectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );
          MarcAuthorities.verifyValueDoesntExistInColumn(
            testData.authorizedColumnName,
            'Reference',
          );
          MarcAuthorities.verifyValueDoesntExistInColumn(testData.authorizedColumnName, 'Auth/Ref');
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized'],
          });

          // Step 6: Uncheck "Exclude see from"
          MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM,
          );
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Reference'],
          });
          MarcAuthorities.verifyValueDoesntExistInColumn(testData.authorizedColumnName, 'Auth/Ref');

          // Step 7: Uncheck "Exclude see from also"
          MarcAuthoritiesSearch.unselectExcludeReferencesFilter(
            REFERENCES_FILTER_CHECKBOXES.EXCLUDE_SEE_FROM_ALSO,
          );
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: testData.authorizedColumnName,
            expectedValues: ['Authorized', 'Reference', 'Auth/Ref'],
          });
        },
      );
    });
  });
});
