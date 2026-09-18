import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const titlePrefix = `AT_C359607_MarcAuthority_${randomPostfix}`;
      const accordionName = 'Type of heading';
      const typeOfHeadingColumn = 'Type of heading';
      const headingTypes = ['Corporate Name', 'Conference Name'];
      const naturalIdPrefix = `359607${randomNDigitNumber(15)}`;

      const corporateHeadings = [
        `${titlePrefix} Apple & Honey Productions`,
        `${titlePrefix} Apple Academic Press`,
      ];
      const conferenceHeadings = [
        `${titlePrefix} Western Region Agricultural Education Research Meeting`,
        `${titlePrefix} Western Region Research Conference in Agricultural Education`,
      ];

      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      const createdAuthorityIds = [];
      let recordIndex = 1;

      const createAuthority = (tag, heading, indicators = ['2', '\\']) => {
        MarcAuthorities.createMarcAuthorityViaAPI('', `${naturalIdPrefix}${recordIndex++}`, [
          { tag, content: `$a ${heading}`, indicators },
        ]).then((id) => createdAuthorityIds.push(id));
      };

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C359607_');

        corporateHeadings.forEach((heading) => createAuthority('110', heading));
        conferenceHeadings.forEach((heading) => createAuthority('111', heading));

        cy.createTempUser(permissions).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.verifyBrowseTabIsOpened();
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
        'C359607 Apply "Type of heading" facet to the browse result list (promin)',
        { tags: ['extendedPath', 'promin', 'C359607'] },
        () => {
          // Steps 1-3: Select "Corporate/Conference name", query for our records, search
          MarcAuthorities.searchByParameter(
            MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
            titlePrefix,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          corporateHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          conferenceHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: headingTypes,
            browsePane: true,
          });
          MarcAuthorities.checkResultsPaneRecordsCounterAbsent();

          // Step 4: Expand the "Type of heading" accordion
          MarcAuthorities.verifyTypeOfHeadingAccordionAndClick();

          // Step 5: Open the multiselect - options show a record count next to each
          MarcAuthorities.checkOptionsWithCountersExistInAccordion(accordionName);

          // Step 6: Type-ahead "Name" - matches options containing it anywhere, not just prefix
          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            accordionName,
            'Name',
            headingTypes[1],
          );
          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            accordionName,
            'Name',
            headingTypes[0],
          );

          // Step 7: Select "Conference Name" - result list narrows to that type only
          MarcAuthorities.chooseTypeOfHeading(headingTypes[1]);
          MarcAuthorities.verifySelectedTypeOfHeading(headingTypes[1]);
          corporateHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, false, { partialMatch: true });
          });
          conferenceHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: headingTypes[1],
            browsePane: true,
          });
          MarcAuthorities.checkResultsPaneRecordsCounterAbsent();

          // Step 8: Also select "Corporate Name" - result list shows both types again
          MarcAuthorities.chooseTypeOfHeading(headingTypes[0]);
          MarcAuthorities.verifySelectedTypeOfHeading(headingTypes[1]);
          MarcAuthorities.verifySelectedTypeOfHeading(headingTypes[0]);
          corporateHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          conferenceHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: headingTypes,
            browsePane: true,
          });
          MarcAuthorities.checkResultsPaneRecordsCounterAbsent();

          // Step 9: Remove "Corporate Name" via its tag's "x" icon
          MarcAuthorities.unselectHeadingType(headingTypes[0]);
          MarcAuthorities.verifySelectedTypeOfHeading(headingTypes[0], false);
          MarcAuthorities.verifySelectedTypeOfHeading(headingTypes[1]);
          MarcAuthorities.verifySelectedTypeOfHeadingCount(1);
          corporateHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, false, { partialMatch: true });
          });
          conferenceHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: headingTypes[1],
            browsePane: true,
          });
          MarcAuthorities.checkResultsPaneRecordsCounterAbsent();

          // Step 10: Remove "Conference Name" by clicking it again in the open dropdown
          MarcAuthorities.chooseTypeOfHeading(headingTypes[1]);
          MarcAuthorities.verifySelectedTypeOfHeading(headingTypes[1], false);
          MarcAuthorities.verifySelectedTypeOfHeadingCount(0);
          corporateHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          conferenceHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          MarcAuthorityBrowse.checkResultWithNoValue(titlePrefix);
          MarcAuthorities.checkResultsPaneRecordsCounterAbsent();

          // Step 11: Only "Corporate Name"/"Conference Name" are offered -
          // select either one, then cancel the whole facet via the accordion header's "x" icon
          MarcAuthorities.chooseTypeOfHeading(headingTypes[0]);
          MarcAuthorities.verifySelectedTypeOfHeadingCount(1);
          conferenceHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, false, { partialMatch: true });
          });
          corporateHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          MarcAuthorities.resetTypeOfHeading();
          conferenceHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          corporateHeadings.forEach((heading) => {
            MarcAuthorities.verifyRecordFound(heading, true, { partialMatch: true });
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: typeOfHeadingColumn,
            expectedValues: headingTypes,
            browsePane: true,
          });
          MarcAuthorities.checkResultsPaneRecordsCounterAbsent();
        },
      );
    });
  });
});
