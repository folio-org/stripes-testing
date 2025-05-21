import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { randomFourDigitNumber } from '../../../support/utils/stringTools';

const testData = {
  authorityIDs: [],
  searchOptions: {
    IDENTIFIERS_ALL: 'Identifier (all)',
    KEYWORD: 'Keyword',
  },
  searchQueries: {
    firstQuery: {
      query: '0035800 035892 http://example.au a46850',
    },
    secondQuery: {
      query: '35589 38453 0246587 more info 0035800 035892 http://example.au a46859*',
      result:
        '$a 35589 $c 38453 $d 0246587 $q more info $z 0035800 $0 035892 $1 http://example.au $2 a46859',
    },
    thirdQuery: {
      query: '35589 38453 0246587 more info 0035800 035892 http://example.au a4685*',
    },
    fourthQuery: {
      query: '*a46850*',
    },
    fifthQuery: {
      query: '*http://example.au a46859*',
    },
    sixthQuery: {
      query: '0035800 035892 http://example.au a46850',
    },
    seventhQuery: {
      query: '35589 38453 0246587 more info 0035800 035892 http://example.au a4685*',
    },
    eighthQuery: {
      query: '*a46850',
    },
    ninthQuery: {
      query: '*http://example.au a46859*',
    },
  },
  authRows: {
    stravinsky: 'Mostly Stravinsky Festival. sonet',
    clearCreek: 'Clear Creek (Tex.) Place in Texas',
    johnBartholomew: 'John Bartholomew and Son. Bartholomew world travel series 1995 English',
  },
  authorizedTypes: {
    AUTHORIZED: 'Authorized',
  },
  marcFiles: [
    {
      marc: 'marcAuthC380587_01.mrc',
      fileName: `testMarcFileAuthC380587_01.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuthC380587_02.mrc',
      fileName: `testMarcFileAuthC380587_02.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
    },
    {
      marc: 'marcAuthC380587_03.mrc',
      fileName: `testMarcFileAuthC380587_03.${randomFourDigitNumber()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numberOfRecords: 1,
    },
  ],
};

describe('MARC', () => {
  describe('MARC Authority', () => {
    before('Create test data', () => {
      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui])
        .then((userProperties) => {
          testData.user = userProperties;
          Object.values(testData.authRows).forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id, true);
                });
              }
            });
          });
        })
        .then(() => {
          testData.marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                testData.authorityIDs.push(record.authority.id);
              });
            });
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      testData.authorityIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C380587 Search MARC: support searching by 024 field value using "Identifier (all) " option (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire', 'C380587'] },
      () => {
        MarcAuthorities.checkSearchOptions();
        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.firstQuery.query,
        );
        cy.ifConsortia(true, () => {
          MarcAuthorities.clickAccordionByName('Shared');
          MarcAuthorities.actionsSelectCheckbox('No');
        });
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.stravinsky,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.secondQuery.query,
        );
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.clearCreek,
        );

        MarcAuthorities.selectFirstRecord();
        MarcAuthorities.checkFieldAndContentExistence(
          '024',
          testData.searchQueries.secondQuery.result,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.thirdQuery.query,
        );
        MarcAuthorities.checkRowsCount(2);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.johnBartholomew,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.clearCreek,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.fourthQuery.query,
        );
        MarcAuthorities.checkRowsCount(2);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.stravinsky,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.johnBartholomew,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.IDENTIFIERS_ALL,
          testData.searchQueries.fifthQuery.query,
        );
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.clearCreek,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.KEYWORD,
          testData.searchQueries.sixthQuery.query,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.stravinsky,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.KEYWORD,
          testData.searchQueries.seventhQuery.query,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.johnBartholomew,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.clearCreek,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.KEYWORD,
          testData.searchQueries.eighthQuery.query,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.stravinsky,
        );

        MarcAuthorities.searchBy(
          testData.searchOptions.KEYWORD,
          testData.searchQueries.ninthQuery.query,
        );
        MarcAuthorities.checkAfterSearch(
          testData.authorizedTypes.AUTHORIZED,
          testData.authRows.clearCreek,
        );
      },
    );
  });
});
