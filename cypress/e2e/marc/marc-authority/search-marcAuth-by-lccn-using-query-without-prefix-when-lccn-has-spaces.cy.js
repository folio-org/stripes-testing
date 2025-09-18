import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      searchOption: 'LCCN',
      AUTHORIZED: 'Authorized',
      searchQueryWithoutAsteriks: '85057895',
      searchQueryWithAsteriks: '*85057895',
    };

    const searchResultWithoutAsteriks = 'C440111 Test LCCN subfield a record 10 (digits only)';
    const searchResultsWithAsteriks = [
      'C440111 Test LCCN subfield a record 1 (two leading spaces, one trailing space, two internal spaces)',
      'C440111 Test LCCN subfield a record 2 (one space internal)',
      'C440111 Test LCCN subfield a record 3 (two spaces internal)',
      'C440111 Test LCCN subfield a record 4 (one space trailing)',
      'C440111 Test LCCN subfield a record 5 (two spaces trailing)',
      'C440111 Test LCCN subfield a record 6 (one space leading)',
      'C440111 Test LCCN subfield a record 7 (two spaces leading)',
      'C440111 Test LCCN subfield a record 8 (two spaces everywhere)',
      'C440111 Test LCCN subfield a record 9 (no spaces)',
    ];

    const marcFiles = [
      {
        marc: 'marcAuthFileForC440111.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
      },
    ];

    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.getUserToken(testData.userProperties.username, testData.userProperties.password);
        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
          authRefresh: true,
        });
      });
    });

    after('Deleting created user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdAuthorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C440111 Search for "MARC authority" by "LCCN" option using a query without prefix (numbers only) when "LCCN" (010 $a) has (leading, internal, trailing) spaces". (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C440111'] },
      () => {
        MarcAuthorities.searchByParameter(
          testData.searchOption,
          testData.searchQueryWithoutAsteriks,
        );
        MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, searchResultWithoutAsteriks);
        MarcAuthorities.searchByParameter(testData.searchOption, testData.searchQueryWithAsteriks);
        searchResultsWithAsteriks.forEach((result) => {
          MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, result);
        });
      },
    );
  });
});
