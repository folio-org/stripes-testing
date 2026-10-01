import {
  DEFAULT_FOLIO_AUTHORITY_FILES,
  MARC_AUTHORITY_BROWSE_OPTIONS,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const titlePrefix = `AT_C422172_MarcAuthority_${randomPostfix}`;
      const accordionName = 'Authority source';
      const authoritySourceColumn = 'Authority source';
      const naturalIdDigitValue = `422172${randomNDigitNumber(15)}`;

      // Predefined prefixes from Table 1 of the precondition - stored in "010 $a", not "001"
      const sourceA = {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_CHILDREN_SUBJECT_HEADINGS,
        prefix: 'sj',
        digits: naturalIdDigitValue,
        heading: `${titlePrefix} Montessori method of education`,
      };
      const sourceB = {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS,
        prefix: 'sh',
        digits: naturalIdDigitValue,
        // Shares titlePrefix with sourceA, so both records sort next to each other and stay
        // inside the same browse window regardless of which one is used as the anchor query
        heading: `${titlePrefix} Music appreciation`,
      };

      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      const createdAuthorityIds = [];

      const createSubjectAuthority = (source) => {
        MarcAuthorities.createMarcAuthorityViaAPI('', source.digits, [
          { tag: '010', content: `$a ${source.prefix}${source.digits}`, indicators: ['\\', '\\'] },
          { tag: '150', content: `$a ${source.heading}`, indicators: ['\\', '\\'] },
        ]).then((id) => createdAuthorityIds.push(id));
      };

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422172_');

        createSubjectAuthority(sourceA);
        createSubjectAuthority(sourceB);

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
        'C422172 Apply "Authority source" facet to the browse result list (promin)',
        { tags: ['extendedPath', 'promin', 'C422172'] },
        () => {
          // Steps 1-3: Query for our anchor record, select "Subject" browse option, search
          MarcAuthoritiesSearch.fillSearchInput(sourceA.heading);
          MarcAuthorities.selectSearchOptionInDropdown(MARC_AUTHORITY_BROWSE_OPTIONS.SUBJECT);
          MarcAuthorities.checkSelectOptionFieldContent(MARC_AUTHORITY_BROWSE_OPTIONS.SUBJECT);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 4: "Authority source" multiselect (accordion is open by default) shows options
          // with a record count next to each - including the 2 sources our own records use
          MarcAuthorities.checkOptionsWithCountersExistInAccordion(accordionName);
          MarcAuthorities.verifyOptionAvailableMultiselect(accordionName, sourceA.name);
          MarcAuthorities.verifyOptionAvailableMultiselect(accordionName, sourceB.name);

          // Step 5: Type-ahead "Subject" matches "LC Children's Subject Headings" (not a prefix)
          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            accordionName,
            'Subject',
            sourceA.name,
          );

          // Step 6: Select it - result list narrows to that source only
          MarcAuthorities.chooseAuthoritySourceOption(sourceA.name);
          MarcAuthorities.checkSelectedAuthoritySource(sourceA.name);
          MarcAuthorities.verifyRecordFound(sourceB.heading, false, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(sourceA.heading, true, { partialMatch: true });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [sourceA.name],
            browsePane: true,
          });

          // Step 7: Collapse the accordion - result pane stays unchanged
          MarcAuthorities.clickAccordionByName(accordionName);
          MarcAuthorities.verifyAccordionOpenState(accordionName, false);
          MarcAuthorities.verifyRecordFound(sourceB.heading, false, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(sourceA.heading, true, { partialMatch: true });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [sourceA.name],
            browsePane: true,
          });

          // Step 8: Re-expand it - the step 6 selection is still shown, result pane unchanged
          MarcAuthorities.clickAccordionByName(accordionName);
          MarcAuthorities.verifyAccordionOpenState(accordionName, true);
          MarcAuthorities.checkSelectedAuthoritySource(sourceA.name);
          MarcAuthorities.verifyRecordFound(sourceB.heading, false, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(sourceA.heading, true, { partialMatch: true });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [sourceA.name],
            browsePane: true,
          });

          // Step 9: Open the bold (exact-match) heading's detail view
          MarcAuthorities.selectIncludingTitle(sourceA.heading);
          MarcAuthority.waitLoading();

          // Step 10: The natural id prefix shown matches the selected Authority source
          MarcAuthority.contains(`${sourceA.prefix}${sourceA.digits}`);

          // Step 11: Also select "LC Subject Headings (LCSH)" - result list shows both sources
          MarcAuthorities.chooseAuthoritySourceOption(sourceB.name);
          MarcAuthorities.checkSelectedAuthoritySource(sourceA.name);
          MarcAuthorities.checkSelectedAuthoritySource(sourceB.name);
          MarcAuthorities.verifyRecordFound(sourceB.heading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(sourceA.heading, true, { partialMatch: true });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [sourceA.name, sourceB.name],
            browsePane: true,
          });

          // Steps 12-13: Update the query to the other record's heading - it gets highlighted
          MarcAuthoritiesSearch.fillSearchInput(sourceB.heading);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.checkRecordInBold(sourceB.heading);
          MarcAuthorities.verifyRecordFound(sourceB.heading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(sourceA.heading, true, { partialMatch: true });

          // Step 14: Open its detail view
          MarcAuthorities.selectIncludingTitle(sourceB.heading);
          MarcAuthority.waitLoading();

          // Step 15: Its natural id prefix matches the "LC Subject Headings (LCSH)" source
          MarcAuthority.contains(`${sourceB.prefix}${sourceB.digits}`);

          // Step 16: Remove the step 5/6 selection via its tag's "x" - only the other one remains
          MarcAuthorities.removeAuthoritySourceOption(sourceA.name);
          MarcAuthorities.checkSelectedAuthoritySource(sourceB.name);
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(accordionName, 1);
          MarcAuthorities.verifyRecordFound(sourceA.heading, false, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(sourceB.heading, true, { partialMatch: true });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [sourceB.name],
            browsePane: true,
          });

          // Step 17: Cancel the whole facet via the "x" next to the accordion header
          MarcAuthorities.closeAuthoritySourceOption();
          MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(accordionName, 0);
        },
      );
    });
  });
});
