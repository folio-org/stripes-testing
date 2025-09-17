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
    };

    const searchQueries = [
      'sh85057895',
      '  sh  85057895 ',
      'sh 85057895',
      'sh  85057895',
      'sh85057895 ',
      'sh85057895  ',
      ' sh85057895',
      '  sh85057895',
      '  sh  85057895  ',
    ];

    const searchResults = [
      'C422236 Test LCCN subfield a record 1 (two leading spaces, one trailing space, two internal spaces)',
      'C422236 Test LCCN subfield a record 2 (one space internal)',
      'C422236 Test LCCN subfield a record 3 (two spaces internal)',
      'C422236 Test LCCN subfield a record 4 (one space trailing)',
      'C422236 Test LCCN subfield a record 5 (two spaces trailing)',
      'C422236 Test LCCN subfield a record 6 (one space leading)',
      'C422236 Test LCCN subfield a record 7 (two spaces leading)',
      'C422236 Test LCCN subfield a record 8 (two spaces everywhere)',
      'C422236 Test LCCN subfield a record 9 (no spaces)',
    ];

    const marcFiles = [
      {
        marc: 'marcAuthFileForC422236.mrc',
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
      'C422236 Search for "MARC authority" by "LCCN" option when "LCCN" (010 $a) has (leading, internal, trailing) spaces. (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C422236'] },
      () => {
        searchQueries.forEach((query) => {
          MarcAuthorities.searchByParameter(testData.searchOption, query);
          searchResults.forEach((result) => {
            MarcAuthorities.checkAfterSearch(testData.AUTHORIZED, result);
          });
        });
      },
    );
  });
});
