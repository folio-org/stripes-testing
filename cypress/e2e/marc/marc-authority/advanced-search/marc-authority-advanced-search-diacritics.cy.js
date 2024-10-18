import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const testData = {
      resultsSortedByHeading: [
        'ASB Community Trust. Māoriautodia and Pacific Education Initiative',
        'Māoriautodia & Pacific Education Initiative',
        'Māoriautodia and Pacific Education Initiative',
        'Māoriautodia drama',
        'Māoriautodia imprints',
        'Māoriautodia imprints',
        'Māoriautodia literature',
        'Maoriautodia, Andrea, 1960-',
        'Straussautodia, Anselm',
        'Straussautodia, Anselm',
        'Straussautodia, Anselm L.',
        'Straussautodia, Barry S.',
        'Straussautodia, Barry, 1953-',
        'Śtraussautodia, Bob.',
        'Straussautodia, Gerald, 1922-',
        'Straussautodia, Ludwig',
        'Straussautodia, Walter',
        'Straussautodia, Walter L.',
        'Żabautodiaczyc, Jan, -approximately 1629. Kolęda mieszkańcom ziemskim od muzyki niebieskiej, wdzięcznym okrzykiem na Dzień Narodzenia Pańskiego zaśpiewane',
        'Żabautodiaczyc, Jan, -approximately 1629. Symfonije anielskie',
        'Żabautodiaczyc, Jan, -approximately 1629. Symfonije anielskie, abo, Kolęda mieszkańcom ziemskim od muzyki niebieskiej, wdzięcznym okrzykiem na Dzień Narodzenia Pańskiego zaśpiewane',
        'Żabautodiaczyc, Jan, d. ca. 1629. Symfonije anielskie',
        'Zabautodiael, Albert, 1834-1910. Am Springbrunnen',
        'Zabautodiael, Albert, 1834-1910. Fountain',
        'Zabautodiael, Albert, 1834-1910. Source',
        'Zabautodiael, Eugen, 1851-1924. Graf Lev Nikolaevich Tolstoĭ',
        'Zabautodiael, Eugen, 1851-1924. L. N. Tolstoi. Russian',
        'Zabautodiael, Eugen, 1851-1924. Граф Лев Николаевич Толстой',
      ],
      resultsSortedByAuthorized: [
        'Māoriautodia literature',
        'Māoriautodia & Pacific Education Initiative',
        'Māoriautodia drama',
        'Māoriautodia imprints',
        'Māoriautodia imprints',
        'Maoriautodia, Andrea, 1960-',
        'Straussautodia, Anselm L.',
        'Straussautodia, Barry S.',
        'Śtraussautodia, Bob.',
        'Straussautodia, Gerald, 1922-',
        'Straussautodia, Ludwig',
        'Straussautodia, Walter L.',
        'Żabautodiaczyc, Jan, -approximately 1629. Symfonije anielskie',
        'Zabautodiael, Albert, 1834-1910. Am Springbrunnen',
        'Zabautodiael, Eugen, 1851-1924. L. N. Tolstoi. Russian',
        'ASB Community Trust. Māoriautodia and Pacific Education Initiative',
        'Māoriautodia and Pacific Education Initiative',
        'Straussautodia, Anselm',
        'Straussautodia, Anselm',
        'Straussautodia, Barry, 1953-',
        'Straussautodia, Walter',
        'Żabautodiaczyc, Jan, -approximately 1629. Kolęda mieszkańcom ziemskim od muzyki niebieskiej, wdzięcznym okrzykiem na Dzień Narodzenia Pańskiego zaśpiewane',
        'Żabautodiaczyc, Jan, -approximately 1629. Symfonije anielskie, abo, Kolęda mieszkańcom ziemskim od muzyki niebieskiej, wdzięcznym okrzykiem na Dzień Narodzenia Pańskiego zaśpiewane',
        'Żabautodiaczyc, Jan, d. ca. 1629. Symfonije anielskie',
        'Zabautodiael, Albert, 1834-1910. Fountain',
        'Zabautodiael, Albert, 1834-1910. Source',
        'Zabautodiael, Eugen, 1851-1924. Graf Lev Nikolaevich Tolstoĭ',
        'Zabautodiael, Eugen, 1851-1924. Граф Лев Николаевич Толстой',
      ],
      resultsSortedByType: [
        'ASB Community Trust. Māoriautodia and Pacific Education Initiative',
        'Māoriautodia & Pacific Education Initiative',
        'Māoriautodia and Pacific Education Initiative',
        'Maoriautodia, Andrea, 1960-',
        'Straussautodia, Anselm',
        'Straussautodia, Anselm',
        'Straussautodia, Anselm L.',
        'Straussautodia, Barry S.',
        'Straussautodia, Barry, 1953-',
        'Śtraussautodia, Bob.',
        'Straussautodia, Gerald, 1922-',
        'Straussautodia, Ludwig',
        'Straussautodia, Walter',
        'Straussautodia, Walter L.',
        'Żabautodiaczyc, Jan, -approximately 1629. Kolęda mieszkańcom ziemskim od muzyki niebieskiej, wdzięcznym okrzykiem na Dzień Narodzenia Pańskiego zaśpiewane',
        'Żabautodiaczyc, Jan, -approximately 1629. Symfonije anielskie',
        'Żabautodiaczyc, Jan, -approximately 1629. Symfonije anielskie, abo, Kolęda mieszkańcom ziemskim od muzyki niebieskiej, wdzięcznym okrzykiem na Dzień Narodzenia Pańskiego zaśpiewane',
        'Żabautodiaczyc, Jan, d. ca. 1629. Symfonije anielskie',
        'Zabautodiael, Albert, 1834-1910. Am Springbrunnen',
        'Zabautodiael, Albert, 1834-1910. Fountain',
        'Zabautodiael, Albert, 1834-1910. Source',
        'Zabautodiael, Eugen, 1851-1924. Graf Lev Nikolaevich Tolstoĭ',
        'Zabautodiael, Eugen, 1851-1924. L. N. Tolstoi. Russian',
        'Zabautodiael, Eugen, 1851-1924. Граф Лев Николаевич Толстой',
        'Māoriautodia drama',
        'Māoriautodia imprints',
        'Māoriautodia imprints',
        'Māoriautodia literature',
      ],
      headingColumn: 'Heading/Reference',
      authorizedColumn: 'Authorized/Reference',
      typeColumn: 'Type of heading',
    };
    const searchParameters = [
      {
        operator: null,
        query: 'Żabautodia',
        modifier: 'Starts with',
        searchIn: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
      },
      {
        operator: 'OR',
        query: 'Straussautodia',
        modifier: 'Contains all',
        searchIn: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
      },
      {
        operator: 'OR',
        query: 'Maoriautodia',
        modifier: 'Contains all',
        searchIn: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
      },
    ];
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
    const importProperty = 'authority';
    const marcFiles = [
      {
        marc: 'marcAuthFileC466268_Strauss.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      },
      {
        marc: 'marcAuthFileC466268_Maori.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      },
      {
        marc: 'marcAuthFileC466268_Zabel.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
      },
    ];

    const createdAuthorityID = [];

    before('Create test data, login', () => {
      cy.getAdminToken();
      searchParameters.forEach((parameters) => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`*${parameters.query}*`);
      });

      marcFiles.forEach((marcFile) => {
        DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityID.push(record[importProperty].id);
            });
          },
        );
      });

      cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
        (createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      createdAuthorityID.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C466268 Diacritics are properly handled when user sorting search result list (spitfire)',
      { tags: ['criticalPath', 'spitfire', 'C466268'] },
      () => {
        MarcAuthorities.clickAdvancedSearchButton();
        searchParameters.forEach((parameters, index) => {
          MarcAuthorities.fillAdvancedSearchField(
            index,
            parameters.query,
            parameters.searchIn,
            parameters.operator,
            parameters.modifier,
          );
        });
        MarcAuthorities.clickSearchButton();
        MarcAuthorities.checkResultList(testData.resultsSortedByHeading);

        MarcAuthorities.clickOnColumnHeader(testData.headingColumn);
        testData.resultsSortedByHeading.forEach((result, index) => {
          MarcAuthorities.checkCellValueIsExists(index, 2, result);
        });

        MarcAuthorities.clickOnColumnHeader(testData.authorizedColumn);
        testData.resultsSortedByAuthorized.forEach((result, index) => {
          MarcAuthorities.checkCellValueIsExists(index, 2, result);
        });

        MarcAuthorities.clickOnColumnHeader(testData.typeColumn);
        testData.resultsSortedByType.forEach((result, index) => {
          MarcAuthorities.checkCellValueIsExists(index, 2, result);
        });
      },
    );
  });
});
