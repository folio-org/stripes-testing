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

    const searchQueries = ['sh 766*', '*6384', '*6638*'];

    const searchResults = [
      'C440119 Test LCCN subfield z record 1 (two leading spaces, one trailing space, two internal spaces)',
      'C440119 Test LCCN subfield z record 2 (one space internal)',
      'C440119 Test LCCN subfield z record 3 (two spaces internal)',
      'C440119 Test LCCN subfield z record 4 (one space trailing)',
      'C440119 Test LCCN subfield z record 5 (two spaces trailing)',
      'C440119 Test LCCN subfield z record 6 (one space leading)',
      'C440119 Test LCCN subfield z record 7 (two spaces leading)',
      'C440119 Test LCCN subfield z record 8 (two spaces everywhere)',
      'C440119 Test LCCN subfield z record 9 (no spaces)',
    ];

    const marcFiles = [
      {
        marc: 'marcAuthFileForC440119.mrc',
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
      'C440119 Search for "MARC authority" by "LCCN" option using a query with asterisk when "Canceled LCCN" (010 $z) has (leading, internal, trailing) spaces". (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C440119'] },
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
