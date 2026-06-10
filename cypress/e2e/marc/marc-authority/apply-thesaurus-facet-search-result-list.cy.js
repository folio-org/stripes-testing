import {
  AUTHORITY_SEARCH_ACCORDION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
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
        searchQueryNotSpecified: '4394',
        tag008: '008',
        thesaurusAccordion: AUTHORITY_SEARCH_ACCORDION_NAMES.THESAURUS,
        thesaurus: {
          LCSH: {
            name: 'Library of Congress Subject Headings',
            code: 'a',
            authorizedHeading: 'UXPROD-4394 Personal name 100',
            authorizedHeadingType: 'Personal Name',
            referenceHeading: 'UXPROD-4394 Personal name 400',
          },
          LC_CHILDRENS: {
            name: "LC subject headings for children's literature",
            code: 'b',
            authorizedHeading: 'UXPROD-4394 Personal name-title 100',
            authorizedHeadingType: 'Personal Name',
            referenceHeading: 'UXPROD-4394 Personal name-title 400',
          },
          MESH: {
            name: 'Medical Subject Headings',
            code: 'c',
            authorizedHeading: 'UXPROD-4394 Chronological Term 148',
            authorizedHeadingType: 'Chronological Term',
            referenceHeading: 'UXPROD-4394 Chronological Term 448',
          },
          NAL: {
            name: 'National Agricultural Library subject authority file',
            code: 'd',
            authorizedHeading: 'UXPROD-4394 Corporate name 110',
            authorizedHeadingType: 'Corporate Name',
            referenceHeading: 'UXPROD-4394 Corporate name 410',
          },
          CANADIAN: {
            name: 'Canadian Subject Headings',
            code: 'k',
            authorizedHeading: 'UXPROD-4394 Conference Name-title 111',
            authorizedHeadingType: 'Conference Name',
            referenceHeading: 'UXPROD-4394 Conference Name-title 411',
          },
          NOT_APPLICABLE: {
            name: 'Not applicable',
            code: 'n',
            authorizedHeading: 'UXPROD-4394 General Subdivision 180',
            authorizedHeadingType: 'General Subdivision',
            referenceHeading: 'UXPROD-4394 General Subdivision 480',
          },
          AAT: {
            name: 'Art and Architecture Thesaurus',
            code: 'r',
            authorizedHeading: 'UXPROD-4394 Conference Name 111',
            authorizedHeadingType: 'Conference Name',
            referenceHeading: 'UXPROD-4394 Conference Name 411',
          },
          SEARS: {
            name: 'Sears List of Subject Headings',
            code: 's',
            authorizedHeading: 'UXPROD-4394 Corporate name-title 110',
            authorizedHeadingType: 'Corporate Name',
            referenceHeading: 'UXPROD-4394 Corporate name-title 410',
          },
          REPERTOIRE: {
            name: 'Répertoire de vedettes-matière',
            code: 'v',
            authorizedHeading: 'UXPROD-4394 Form Subdivision 185',
            authorizedHeadingType: 'Form Subdivision',
            referenceHeading: 'UXPROD-4394 Form Subdivision 485',
          },
          OTHER: {
            name: 'Other',
            code: 'z',
            authorizedHeading: 'UXPROD-4394 Named Event 147',
            authorizedHeadingType: 'Named Event',
            referenceHeading: 'UXPROD-4394 Named Event 447',
          },
          NOT_SPECIFIED: {
            name: 'Not specified',
            code: ' ',
            authorizedHeading: '4394 Methods (Salsa) Self-instruction',
            authorizedHeadingType: 'Form Subdivision',
            referenceHeading: '4394 Methods Self-instruction',
          },
        },
        marcFile: {
          marc: 'C409494MarcAuth.mrc',
          fileName: `testMarcFileAuthC409494.${randomFourDigitNumber()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
        createdAuthorityIDs: [],
      };

      before('Create user and import MARC authority records', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('UXPROD-4394');
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('4394');

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
        'C409494 Apply "Thesaurus" facet to the "MARC authority" search result list (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409494'] },
        () => {
          // Steps 1-2: Search for records and verify results are displayed
          MarcAuthoritiesSearch.searchBy('Keyword', testData.searchQuery);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.LCSH.authorizedHeading,
            'Authorized',
            testData.thesaurus.LCSH.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.MESH.authorizedHeading,
            'Authorized',
            testData.thesaurus.MESH.authorizedHeadingType,
          );

          // Step 3: Click on the "Thesaurus" accordion button
          MarcAuthorities.verifyThesaurusAccordionAndClick();

          // Step 4: Click multiselect element and verify options
          MarcAuthorities.checkOptionsWithCountersExistInAccordion(testData.thesaurusAccordion);

          // Step 5: Type-ahead search - type "Subject" and verify LCSH appears
          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            testData.thesaurusAccordion,
            'Subject',
            testData.thesaurus.LCSH.name,
          );

          // Steps 6-7: Select "Library of Congress Subject Headings" and verify 008[11] code
          MarcAuthorities.chooseThesaurus(testData.thesaurus.LCSH.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.LCSH.authorizedHeading,
            'Authorized',
            testData.thesaurus.LCSH.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.LCSH.referenceHeading,
            'Reference',
            testData.thesaurus.LCSH.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.LCSH.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.LCSH.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Steps 8-9: Switch to "LC subject headings for children's literature" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.LCSH.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.LC_CHILDRENS.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.LC_CHILDRENS.authorizedHeading,
            'Authorized',
            testData.thesaurus.LC_CHILDRENS.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.LC_CHILDRENS.referenceHeading,
            'Reference',
            testData.thesaurus.LC_CHILDRENS.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.LC_CHILDRENS.authorizedHeading);
          MarcAuthority.contains(
            `${testData.tag008}\t.{11}${testData.thesaurus.LC_CHILDRENS.code}`,
            { regexp: true },
          );
          MarcAuthorities.closeMarcViewPane();

          // Steps 10-11: Switch to "Medical Subject Headings" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.LC_CHILDRENS.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.MESH.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.MESH.authorizedHeading,
            'Authorized',
            testData.thesaurus.MESH.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.MESH.referenceHeading,
            'Reference',
            testData.thesaurus.MESH.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.MESH.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.MESH.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Steps 12-13: Add "National Agricultural Library" (keep MeSH selected) and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.NAL.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.MESH.authorizedHeading,
            'Authorized',
            testData.thesaurus.MESH.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.NAL.authorizedHeading,
            'Authorized',
            testData.thesaurus.NAL.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.NAL.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.NAL.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Steps 14-15: Cancel previous options, select "Canadian Subject Headings" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.MESH.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.NAL.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.CANADIAN.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.CANADIAN.authorizedHeading,
            'Authorized',
            testData.thesaurus.CANADIAN.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.CANADIAN.referenceHeading,
            'Reference',
            testData.thesaurus.CANADIAN.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.CANADIAN.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.CANADIAN.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Steps 16-17: Switch to "Not applicable" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.CANADIAN.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.NOT_APPLICABLE.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.NOT_APPLICABLE.authorizedHeading,
            'Authorized',
            testData.thesaurus.NOT_APPLICABLE.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.NOT_APPLICABLE.referenceHeading,
            'Reference',
            testData.thesaurus.NOT_APPLICABLE.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.NOT_APPLICABLE.authorizedHeading);
          MarcAuthority.contains(
            `${testData.tag008}\t.{11}${testData.thesaurus.NOT_APPLICABLE.code}`,
            { regexp: true },
          );
          MarcAuthorities.closeMarcViewPane();

          // Steps 18-19: Switch to "Art and Architecture Thesaurus" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.NOT_APPLICABLE.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.AAT.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.AAT.authorizedHeading,
            'Authorized',
            testData.thesaurus.AAT.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.AAT.referenceHeading,
            'Reference',
            testData.thesaurus.AAT.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.AAT.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.AAT.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Steps 20-21: Switch to "Sears List of Subject Headings" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.AAT.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.SEARS.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.SEARS.authorizedHeading,
            'Authorized',
            testData.thesaurus.SEARS.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.SEARS.referenceHeading,
            'Reference',
            testData.thesaurus.SEARS.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.SEARS.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.SEARS.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Steps 22-23: Switch to "Répertoire de vedettes-matière" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.SEARS.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.REPERTOIRE.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.REPERTOIRE.authorizedHeading,
            'Authorized',
            testData.thesaurus.REPERTOIRE.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.REPERTOIRE.referenceHeading,
            'Reference',
            testData.thesaurus.REPERTOIRE.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.REPERTOIRE.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.REPERTOIRE.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Steps 24-25 (part 1): Switch to "Other" and verify 008[11]
          MarcAuthorities.chooseThesaurus(testData.thesaurus.REPERTOIRE.name);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.OTHER.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.OTHER.authorizedHeading,
            'Authorized',
            testData.thesaurus.OTHER.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.OTHER.referenceHeading,
            'Reference',
            testData.thesaurus.OTHER.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.OTHER.authorizedHeading);
          MarcAuthority.contains(`${testData.tag008}\t.{11}${testData.thesaurus.OTHER.code}`, {
            regexp: true,
          });
          MarcAuthorities.closeMarcViewPane();

          // Step 25: Cancel "Thesaurus" facet by clicking "x" icon in Thesaurus accordion
          InventorySearchAndFilter.clearDefaultFilter(testData.thesaurusAccordion);
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(
            testData.thesaurusAccordion,
            0,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.LCSH.authorizedHeading,
            'Authorized',
            testData.thesaurus.LCSH.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.MESH.authorizedHeading,
            'Authorized',
            testData.thesaurus.MESH.authorizedHeadingType,
          );

          // Steps 26-28: Search "4394", select "Not specified" and verify 008[11]
          MarcAuthoritiesSearch.searchBy('Keyword', testData.searchQueryNotSpecified);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.chooseThesaurus(testData.thesaurus.NOT_SPECIFIED.name);
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.NOT_SPECIFIED.authorizedHeading,
            'Authorized',
            testData.thesaurus.NOT_SPECIFIED.authorizedHeadingType,
          );
          MarcAuthorities.verifyResultsRowContent(
            testData.thesaurus.NOT_SPECIFIED.referenceHeading,
            'Reference',
            testData.thesaurus.NOT_SPECIFIED.authorizedHeadingType,
          );
          MarcAuthorities.selectIncludingTitle(testData.thesaurus.NOT_SPECIFIED.authorizedHeading);
          MarcAuthority.contains(
            `${testData.tag008}\t.{11}${testData.thesaurus.NOT_SPECIFIED.code}`,
            { regexp: true },
          );
        },
      );
    });
  });
});
