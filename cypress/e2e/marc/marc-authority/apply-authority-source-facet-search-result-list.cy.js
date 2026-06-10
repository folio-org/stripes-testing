import {
  AUTHORITY_SEARCH_ACCORDION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
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
        authoritySources: {
          FAST: 'Faceted Application of Subject Terminology (FAST)',
          MESH: 'Medical Subject Headings (MeSH)',
          LCMPT: 'LC Medium of Performance Thesaurus for Music (LCMPT)',
          TGM: 'Thesaurus for Graphic Materials (TGM)',
          RBMS: 'Rare Books and Manuscripts Section (RBMS)',
          AAT: 'Art & architecture thesaurus (AAT)',
        },
        marcFile: {
          marc: 'C409483MarcAuth.mrc',
          fileName: `testMarcFileAuthC409483.${randomFourDigitNumber()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
        createdAuthorityIDs: [],
      };

      before('Create user and import MARC authority records', () => {
        cy.getAdminToken();

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('UXPROD-4394');

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
        'C409483 Apply "Authority source" facet to the search result list (including additional authority headings) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409483'] },
        () => {
          // Step 1-2: Search with keyword and verify results are displayed
          MarcAuthoritiesSearch.searchBy('Keyword', testData.searchQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 3: Select "Faceted Application of Subject Terminology (FAST)"
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySources.FAST);
          MarcAuthorities.checkSelectedAuthoritySource(testData.authoritySources.FAST);
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Named Event 147',
            'Authorized',
            'Named Event',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Named Event 447',
            'Reference',
            'Named Event',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Named Event 547',
            'Auth/Ref',
            'Named Event',
          );

          // Step 4: Deselect "Faceted Application of Subject Terminology (FAST)"
          MarcAuthorities.removeAuthoritySourceOption(testData.authoritySources.FAST);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          // Verify full result list is restored
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Personal name 100',
            'Authorized',
            'Personal Name',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 148',
            'Authorized',
            'Chronological Term',
          );

          // Step 5: Select "Medical Subject Headings (MeSH)"
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySources.MESH);
          MarcAuthorities.checkSelectedAuthoritySource(testData.authoritySources.MESH);
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 148',
            'Authorized',
            'Chronological Term',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 448',
            'Reference',
            'Chronological Term',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 548',
            'Auth/Ref',
            'Chronological Term',
          );

          // Step 6: Also select "LC Medium of Performance Thesaurus for Music (LCMPT)"
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySources.LCMPT);
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(
            AUTHORITY_SEARCH_ACCORDION_NAMES.AUTHORITY_SOURCE,
            2,
          );
          // Verify Chronological Term still visible (MeSH)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 148',
            'Authorized',
            'Chronological Term',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 448',
            'Reference',
            'Chronological Term',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 548',
            'Auth/Ref',
            'Chronological Term',
          );
          // Verify Medium of Performance Term visible (LCMPT)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Medium of Performance Term 162',
            'Authorized',
            'Medium of Performance Term',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Medium of Performance Term 462',
            'Reference',
            'Medium of Performance Term',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Medium of Performance Term 562',
            'Auth/Ref',
            'Medium of Performance Term',
          );

          // Step 7: Also select "Thesaurus for Graphic Materials (TGM)"
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySources.TGM);
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(
            AUTHORITY_SEARCH_ACCORDION_NAMES.AUTHORITY_SOURCE,
            3,
          );
          // Verify Chronological Term still visible (MeSH)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 148',
            'Authorized',
            'Chronological Term',
          );
          // Verify Medium of Performance Term still visible (LCMPT)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Medium of Performance Term 162',
            'Authorized',
            'Medium of Performance Term',
          );
          // Verify General Subdivision visible (TGM)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 General Subdivision 180',
            'Authorized',
            'General Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 General Subdivision 480',
            'Reference',
            'General Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 General Subdivision 580',
            'Auth/Ref',
            'General Subdivision',
          );
          // Verify Geographic Subdivision visible (TGM)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Geographic Subdivision 181',
            'Authorized',
            'Geographic Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Geographic Subdivision 481',
            'Reference',
            'Geographic Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Geographic Subdivision 581',
            'Auth/Ref',
            'Geographic Subdivision',
          );

          // Step 8: Clear all Authority source filters by removing each individually
          MarcAuthorities.removeAuthoritySourceOption(testData.authoritySources.TGM);
          MarcAuthorities.removeAuthoritySourceOption(testData.authoritySources.LCMPT);
          MarcAuthorities.removeAuthoritySourceOption(testData.authoritySources.MESH);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          // Verify full result list is restored
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Personal name 100',
            'Authorized',
            'Personal Name',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Term 148',
            'Authorized',
            'Chronological Term',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Medium of Performance Term 162',
            'Authorized',
            'Medium of Performance Term',
          );

          // Step 9: Select "Rare Books and Manuscripts Section (RBMS)"
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySources.RBMS);
          MarcAuthorities.checkSelectedAuthoritySource(testData.authoritySources.RBMS);
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Subdivision 182',
            'Authorized',
            'Chronological Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Subdivision 482',
            'Reference',
            'Chronological Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Subdivision 582',
            'Auth/Ref',
            'Chronological Subdivision',
          );

          // Step 10: Also select "Art & architecture thesaurus (AAT)"
          MarcAuthorities.chooseAuthoritySourceOption(testData.authoritySources.AAT);
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(
            AUTHORITY_SEARCH_ACCORDION_NAMES.AUTHORITY_SOURCE,
            2,
          );
          // Verify Chronological Subdivision still visible (RBMS)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Subdivision 182',
            'Authorized',
            'Chronological Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Subdivision 482',
            'Reference',
            'Chronological Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Chronological Subdivision 582',
            'Auth/Ref',
            'Chronological Subdivision',
          );
          // Verify Geographic Name visible (AAT)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Geographic name 151',
            'Authorized',
            'Geographic Name',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Geographic name 451',
            'Reference',
            'Geographic Name',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Geographic name 551',
            'Auth/Ref',
            'Geographic Name',
          );
          // Verify Form Subdivision visible (AAT)
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Form Subdivision 185',
            'Authorized',
            'Form Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Form Subdivision 485',
            'Reference',
            'Form Subdivision',
          );
          MarcAuthorities.verifyResultsRowContent(
            'UXPROD-4394 Form Subdivision 585',
            'Auth/Ref',
            'Form Subdivision',
          );

          // Step 11: Type "Books" in typeahead search for Authority source
          MarcAuthorities.fillInAuthoritySourceFilter('Books');
          MarcAuthorities.verifyMultiselectFilterOptionExists(
            AUTHORITY_SEARCH_ACCORDION_NAMES.AUTHORITY_SOURCE,
            'Rare Books and Manuscripts Section (RBMS)',
          );
        },
      );
    });
  });
});
