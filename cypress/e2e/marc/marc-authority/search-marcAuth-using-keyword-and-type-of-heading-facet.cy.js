import { including } from '@interactors/html';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Search', () => {
      describe('Filters', () => {
        const testData = {
          searchQuery: 'C409438',
          searchOption: MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD,
          typeOfHeadingAccordionName: 'Type of heading',
          marcFile: 'C409438MarcAuth.mrc',
          expectedTotalRecords: 54,
          headingTypes: {
            namedEvent: 'Named Event',
            chronologicalTerm: 'Chronological Term',
            mediumOfPerformance: 'Medium of Performance Term',
            generalSubdivision: 'General Subdivision',
            geographicSubdivision: 'Geographic Subdivision',
            chronologicalSubdivision: 'Chronological Subdivision',
            formSubdivision: 'Form Subdivision',
            personalName: 'Personal Name',
            corporateName: 'Corporate Name',
            conferenceName: 'Conference Name',
            genre: 'Genre',
            topical: 'Topical',
            geographicName: 'Geographic Name',
            uniformTitle: 'Uniform Title',
          },
          expectedHeadingOptions: [
            'Chronological Subdivision',
            'Chronological Term',
            'Conference Name',
            'Corporate Name',
            'Form Subdivision',
            'General Subdivision',
            'Genre',
            'Geographic Name',
            'Geographic Subdivision',
            'Medium of Performance Term',
            'Named Event',
            'Personal Name',
            'Topical',
            'Uniform Title',
          ],
          expectedRecords: {
            namedEvent: [
              'C409438 Named Event 147',
              'C409438 Named Event 447',
              'C409438 Named Event 547',
            ],
            chronologicalTerm: [
              'C409438 Chronological Term 148',
              'C409438 Chronological Term 448',
              'C409438 Chronological Term 548',
            ],
            mediumOfPerformance: [
              'C409438 Medium of Performance Term 162',
              'C409438 Medium of Performance Term 462',
              'C409438 Medium of Performance Term 562',
            ],
            generalSubdivision: [
              'C409438 General Subdivision 180',
              'C409438 General Subdivision 480',
              'C409438 General Subdivision 580',
            ],
            geographicSubdivision: [
              'C409438 Geographic Subdivision 181',
              'C409438 Geographic Subdivision 481',
              'C409438 Geographic Subdivision 581',
            ],
            chronologicalSubdivision: [
              'C409438 Chronological Subdivision 182',
              'C409438 Chronological Subdivision 482',
              'C409438 Chronological Subdivision 582',
            ],
            formSubdivision: [
              'C409438 Form Subdivision 185',
              'C409438 Form Subdivision 485',
              'C409438 Form Subdivision 585',
              'C409438 Methods (Salsa)',
              'C409438 Methods',
              'C409438 Self-instruction',
            ],
            personalName: [
              'C409438 Personal name 100',
              'C409438 Personal name 400',
              'C409438 Personal name 500',
              'C409438 Personal name-title 100',
              'C409438 Personal name-title 400',
              'C409438 Personal name-title 500',
            ],
            corporateName: [
              'C409438 Corporate name 110',
              'C409438 Corporate name 410',
              'C409438 Corporate name 510',
              'C409438 Corporate name-title 110',
              'C409438 Corporate name-title 410',
              'C409438 Corporate name-title 510',
            ],
          },
        };
        const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
        const createdAuthorityIDs = [];

        before('Create test data', () => {
          cy.getAdminToken();

          // Clean up any existing records with the test prefix
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.searchQuery);

          // Import MARC Authority records
          DataImport.uploadFileViaApi(
            testData.marcFile,
            `testMarcFileC409438.${getRandomPostfix()}.mrc`,
            jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record.authority.id);
            });
          });

          // Create user and login
          cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
            (userProperties) => {
              testData.userProperties = userProperties;

              cy.login(userProperties.username, userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            },
          );
        });

        after('Delete test data', () => {
          cy.getAdminToken();
          Users.deleteViaApi(testData.userProperties.userId);
          createdAuthorityIDs.forEach((id) => {
            MarcAuthority.deleteViaAPI(id, true);
          });
        });

        it(
          'C409438 Searching "MARC authority" records using "Keyword" search option and "Type of heading" facet (spitfire)',
          { tags: ['extendedPath', 'C409438', 'spitfire'] },
          () => {
            // Step 1-2: Select "Keyword" search option
            MarcAuthorities.selectSearchOptionInDropdown(testData.searchOption);
            MarcAuthoritiesSearch.verifySelectedSearchOption(testData.searchOption);

            // Step 3: Search for C409438
            MarcAuthorities.searchBeats(testData.searchQuery);
            cy.wait(2000);
            MarcAuthorities.checkRowsCount(testData.expectedTotalRecords);

            // Step 4: Click on Type of heading accordion
            MarcAuthorities.verifyTypeOfHeadingAccordionAndClick();
            MarcAuthorities.checkOptionsWithCountersExistInAccordion(
              testData.typeOfHeadingAccordionName,
            );

            testData.expectedHeadingOptions.forEach((headingType) => {
              MarcAuthorities.verifyOptionAvailableMultiselect(
                testData.typeOfHeadingAccordionName,
                headingType,
              );
            });

            // Step 5: Type-ahead search for "event" to find "Named Event"
            MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
              testData.typeOfHeadingAccordionName,
              'event',
              testData.headingTypes.namedEvent,
            );

            // Step 6: Select "Named Event"
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.namedEvent);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.namedEvent.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(3);

            // Step 7: Clear filter
            MarcAuthorities.resetTypeOfHeading();
            cy.wait(2000);
            MarcAuthorities.checkRowsCount(testData.expectedTotalRecords);

            // Step 8: Select "Chronological Term"
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.chronologicalTerm);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.chronologicalTerm.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(3);

            // Step 9: Clear filter
            MarcAuthorities.resetTypeOfHeading();
            cy.wait(2000);
            MarcAuthorities.checkRowsCount(testData.expectedTotalRecords);

            // Step 10: Select "Medium of Performance Term"
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.mediumOfPerformance);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.mediumOfPerformance.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(3);

            // Step 11: Clear filter
            MarcAuthorities.resetTypeOfHeading();
            cy.wait(2000);
            MarcAuthorities.checkRowsCount(testData.expectedTotalRecords);

            // Step 12: Select "General Subdivision"
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.generalSubdivision);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.generalSubdivision.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(3);

            // Step 13: Clear filter
            MarcAuthorities.resetTypeOfHeading();
            cy.wait(2000);
            MarcAuthorities.checkRowsCount(testData.expectedTotalRecords);

            // Step 14: Select "Geographic Subdivision"
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.geographicSubdivision);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.geographicSubdivision.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(3);

            // Step 15: Clear filter
            MarcAuthorities.resetTypeOfHeading();
            cy.wait(2000);
            MarcAuthorities.checkRowsCount(testData.expectedTotalRecords);

            // Step 16: Select "Chronological Subdivision"
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.chronologicalSubdivision);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.chronologicalSubdivision.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(3);

            // Step 17: Add "Form Subdivision" to existing selection (multi-select)
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.formSubdivision);
            cy.wait(2000);
            MarcAuthorities.checkResultList([
              ...testData.expectedRecords.formSubdivision.map((heading) => including(heading)),
              ...testData.expectedRecords.chronologicalSubdivision.map((heading) => including(heading)),
            ]);
            MarcAuthorities.checkRowsCount(9);
            MarcAuthorities.verifySelectedTextOfHeadingType(
              testData.headingTypes.chronologicalSubdivision,
            );
            MarcAuthorities.verifySelectedTextOfHeadingType(testData.headingTypes.formSubdivision);

            // Step 18: Remove "Chronological Subdivision"
            MarcAuthorities.unselectHeadingType(testData.headingTypes.chronologicalSubdivision);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.formSubdivision.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(6);

            // Step 19: Remove "Form Subdivision"
            MarcAuthorities.resetTypeOfHeading();
            cy.wait(2000);
            MarcAuthorities.checkRowsCount(testData.expectedTotalRecords);

            // Step 20: Select "Personal Name"
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.personalName);
            cy.wait(2000);
            MarcAuthorities.checkResultList(
              testData.expectedRecords.personalName.map((heading) => including(heading)),
            );
            MarcAuthorities.checkRowsCount(6);

            // Step 21: Add "Corporate Name" to selection (multi-select)
            MarcAuthorities.chooseTypeOfHeading(testData.headingTypes.corporateName);
            cy.wait(2000);
            MarcAuthorities.checkResultList([
              ...testData.expectedRecords.personalName.map((heading) => including(heading)),
              ...testData.expectedRecords.corporateName.map((heading) => including(heading)),
            ]);
            MarcAuthorities.checkRowsCount(12);
            MarcAuthorities.verifySelectedTextOfHeadingType(testData.headingTypes.personalName);
            MarcAuthorities.verifySelectedTextOfHeadingType(testData.headingTypes.corporateName);
          },
        );
      });
    });
  });
});
