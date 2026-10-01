import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const titlePrefix = `AT_C409448_MarcAuthority_${randomPostfix}`;
      const typeOfHeadingColumn = 'Type of heading';
      const allHeadingTypes = ['Personal Name', 'Corporate Name', 'Conference Name'];
      const naturalIdPrefix = `409448${randomNDigitNumber(15)}`;

      // Each record has a 1XX (Authorized) field and a matching 4XX (Reference) field, both
      // carrying "$t" - that's what makes them show up under the "Name-title" browse option
      const personalNameTitle = {
        headingType: 'Personal Name',
        authorizedHeading: `${titlePrefix} Personal name-title 100`,
        referenceHeading: `${titlePrefix} Personal name-title 400`,
      };
      const corporateNameTitle = {
        headingType: 'Corporate Name',
        authorizedHeading: `${titlePrefix} Corporate name-title 110`,
        referenceHeading: `${titlePrefix} Corporate name-title 410`,
      };
      const conferenceNameTitle = {
        headingType: 'Conference Name',
        authorizedHeading: `${titlePrefix} Conference name-title 111`,
        referenceHeading: `${titlePrefix} Conference name-title 411`,
      };
      const allGroups = [personalNameTitle, corporateNameTitle, conferenceNameTitle];

      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      const createdAuthorityIds = [];
      let recordIndex = 1;

      const createAuthority = (authorizedTag, referenceTag, group, authorizedIndicators) => {
        MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}${recordIndex++}`, [
          {
            tag: authorizedTag,
            content: `$a ${group.authorizedHeading} $t Test title`,
            indicators: authorizedIndicators,
          },
          {
            tag: referenceTag,
            content: `$a ${group.referenceHeading} $t Test title`,
            indicators: authorizedIndicators,
          },
        ]).then((id) => createdAuthorityIds.push(id));
      };

      const verifyHeadingsFound = (groups, isFound) => {
        groups.forEach((group) => {
          MarcAuthorities.verifyRecordFound(group.authorizedHeading, isFound, {
            partialMatch: true,
          });
          MarcAuthorities.verifyRecordFound(group.referenceHeading, isFound, {
            partialMatch: true,
          });
        });
      };

      before('Create user and test data', () => {
        cy.getAdminToken();

        createAuthority('100', '400', personalNameTitle, ['1', '\\']);
        createAuthority('110', '410', corporateNameTitle, ['2', '\\']);
        createAuthority('111', '411', conferenceNameTitle, ['2', '\\']);

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.switchToBrowse();
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken(false);
        createdAuthorityIds.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C409448 Browse "MARC authority" records using "Name-title" search option and "Type of heading" facet (promin)',
        { tags: ['extendedPath', 'promin', 'C409448'] },
        () => {
          // Steps 1-2: "Browse" toggle is already selected - pick "Name-title" browse option
          MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE);
          MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE);

          // Step 3-4: Query on the shared prefix - all 6 rows (3 records x Authorized/Reference)
          // are shown, no other type of heading appears, and a non-exact-match placeholder shows
          MarcAuthoritiesSearch.fillSearchInput(titlePrefix);
          MarcAuthoritiesSearch.clickSearchButton();
          verifyHeadingsFound(allGroups, true);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: allHeadingTypes,
            browsePane: true,
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);

          // Step 5: Select "Personal Name" - only that type's records remain
          MarcAuthorities.chooseTypeOfHeading(personalNameTitle.headingType);
          verifyHeadingsFound([corporateNameTitle, conferenceNameTitle], false);
          verifyHeadingsFound([personalNameTitle], true);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: [personalNameTitle.headingType],
            browsePane: true,
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);

          // Step 6: Remove "Personal Name" via its own "x" - back to all 3 types
          MarcAuthorities.unselectHeadingType(personalNameTitle.headingType);
          verifyHeadingsFound(allGroups, true);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: allHeadingTypes,
            browsePane: true,
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);

          // Step 7: Select "Corporate Name" - only that type's records remain
          MarcAuthorities.chooseTypeOfHeading(corporateNameTitle.headingType);
          verifyHeadingsFound([personalNameTitle, conferenceNameTitle], false);
          verifyHeadingsFound([corporateNameTitle], true);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: [corporateNameTitle.headingType],
            browsePane: true,
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);

          // Step 8: Also select "Conference Name" - both types shown together
          MarcAuthorities.chooseTypeOfHeading(conferenceNameTitle.headingType);
          verifyHeadingsFound([corporateNameTitle, conferenceNameTitle], true);
          verifyHeadingsFound([personalNameTitle], false);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: [corporateNameTitle.headingType, conferenceNameTitle.headingType],
            browsePane: true,
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);

          // Step 9: Remove "Corporate Name" via its own "x" - only "Conference Name" remains
          MarcAuthorities.unselectHeadingType(corporateNameTitle.headingType);
          verifyHeadingsFound([personalNameTitle, corporateNameTitle], false);
          verifyHeadingsFound([conferenceNameTitle], true);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: [conferenceNameTitle.headingType],
            browsePane: true,
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);

          // Step 10: Cancel the whole facet via the accordion header's "x" - back to all 3 types
          MarcAuthorities.resetTypeOfHeading();
          verifyHeadingsFound(allGroups, true);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: allHeadingTypes,
            browsePane: true,
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);
        },
      );
    });
  });
});
