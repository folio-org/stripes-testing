import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      user: {},
      searchOptions: {
        IDENTIFIERS_ALL: 'Identifier (all)',
      },
      marcFile: {
        marc: 'marcAuthC359212.mrc',
        fileName: `testMarcFileC359212.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numberOfRecords: 2,
      },
      positiveSearchQueries: [
        // Search doesn't work with values with slash at the end
        // https://issues.folio.org/browse/UISAUTCOMP-103
        'bslw85033655\\',
        'nb2006354903\\',
        'bslw85033881',
        'nt2316353105',
      ],
      negativeSearchQueries: ['bslw85033655', 'bslw85033881\\', 'nt2316353105\\', 'nb2006354903'],
      searchResults: ['Cowlitz people', 'Cree people'],
    };
    const createdAuthorityID = [];

    before('Creating data', () => {
      cy.getAdminToken();
      testData.searchResults.forEach((query) => {
        MarcAuthorities.getMarcAuthoritiesViaApi({
          limit: 100,
          query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
        }).then((authorities) => {
          if (authorities) {
            authorities.forEach(({ id }) => {
              MarcAuthority.deleteViaAPI(id);
            });
          }
        });
      });

      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        testData.marcFile.jobProfileToRun,
      ).then((response) => {
        response.entries.forEach((record) => {
          createdAuthorityID.push(record.relatedAuthorityInfo.idList[0]);
        });
      });
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Deleting data', () => {
      cy.getAdminToken();
      createdAuthorityID.forEach((authId) => {
        MarcAuthority.deleteViaAPI(authId);
      });
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C359212 Verify that search using "Identifier (all)" option will return records with "\\" at the end of 010 $a and $z subfields (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        MarcAuthorities.switchToSearch();
        testData.positiveSearchQueries.forEach((query) => {
          MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIERS_ALL, query);
          MarcAuthorities.checkRowsCount(1);
          MarcAuthority.waitLoading();
        });

        testData.negativeSearchQueries.forEach((query) => {
          MarcAuthorities.searchBy(testData.searchOptions.IDENTIFIERS_ALL, query);
          MarcAuthorities.verifySearchResultTabletIsAbsent();
        });
      },
    );
  });
});
