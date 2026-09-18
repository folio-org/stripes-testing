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
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const randomPostfix = getRandomPostfix();
      const titlePrefix = `AT_C422173_MarcAuthority_${randomPostfix}`;
      const browseOption = MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME;
      const accordionName = 'Authority source';
      const authoritySourceColumn = 'Authority source';
      const notSpecifiedOption = 'Not specified';
      const randomDigits = `422173${randomNDigitNumber(15)}`;

      // Custom (not pre-defined) source, created via API in place of the Postman + MarcEdit +
      // Data Import steps from the TestRail case
      const customSource = {
        name: `AT_C422173_CustomSource_${randomPostfix}`,
        code: getRandomLetters(15).toUpperCase(),
        digits: '422173',
        heading: `${titlePrefix} Canady, Robert Lynn`,
      };

      // Pre-defined source from Table 1 - stored in "010 $a", not "001"
      const predefinedSource = {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        prefix: 'n',
        digits: randomDigits,
        heading: `${titlePrefix} Bechhöfer, Susi, 1936-`,
      };

      // No "010 $a"/"001" prefix at all - falls under "Not specified"
      const notSpecifiedRecord = {
        digits: randomDigits,
        heading: `${titlePrefix} Stone, Robert B (not specified source)`,
      };

      // Only "View" is needed - all record/source-file setup happens via API, so the Data Import
      // permission from the precondition isn't required (its UI is never used)
      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      let customSourceId;
      const createdAuthorityIds = [];

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422173_');

        cy.createAuthoritySourceFileUsingAPI(
          customSource.code,
          customSource.digits,
          customSource.name,
        ).then((id) => {
          customSourceId = id;
        });

        cy.then(() => {
          cy.wait(70_000); // wait for created source file to be processed by scheduled job
          cy.getAdminToken(false);

          MarcAuthorities.createMarcAuthorityViaAPI('', customSource.digits, [
            {
              tag: '010',
              content: `$a ${customSource.code}${customSource.digits}`,
              indicators: ['\\', '\\'],
            },
            { tag: '100', content: `$a ${customSource.heading}`, indicators: ['1', '\\'] },
          ]).then((id) => createdAuthorityIds.push(id));

          MarcAuthorities.createMarcAuthorityViaAPI('', predefinedSource.digits, [
            {
              tag: '010',
              content: `$a ${predefinedSource.prefix}${predefinedSource.digits}`,
              indicators: ['\\', '\\'],
            },
            { tag: '100', content: `$a ${predefinedSource.heading}`, indicators: ['1', '\\'] },
          ]).then((id) => createdAuthorityIds.push(id));

          MarcAuthorities.createMarcAuthorityViaAPI('', notSpecifiedRecord.digits, [
            { tag: '100', content: `$a ${notSpecifiedRecord.heading}`, indicators: ['1', '\\'] },
          ]).then((id) => createdAuthorityIds.push(id));
        });

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
        if (customSourceId) cy.deleteAuthoritySourceFileViaAPI(customSourceId, true);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C422173 Apply "Authority source" facet not from pre-defined list to the browse result list (promin)',
        { tags: ['extendedPath', 'promin', 'C422173'] },
        () => {
          // Steps 7-8: Query for the custom-source record, select "Personal name", search
          MarcAuthoritiesSearch.fillSearchInput(customSource.heading);
          MarcAuthorities.selectSearchOptionInDropdown(browseOption);
          MarcAuthorities.checkSelectOptionFieldContent(browseOption);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          // Step 9: Select the custom (not pre-defined) Authority source facet option
          MarcAuthorities.chooseAuthoritySourceOption(customSource.name);
          MarcAuthorities.checkSelectedAuthoritySource(customSource.name);
          MarcAuthorities.verifyRecordFound(customSource.heading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(predefinedSource.heading, false, {
            partialMatch: true,
          });
          MarcAuthorities.verifyRecordFound(notSpecifiedRecord.heading, false, {
            partialMatch: true,
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [customSource.name],
            browsePane: true,
          });

          // Step 10: Open the record's detail view
          MarcAuthorities.selectIncludingTitle(customSource.heading);
          MarcAuthority.waitLoading();

          // Step 11: The natural id prefix shown matches the custom source's own code
          MarcAuthority.contains(`${customSource.code}${customSource.digits}`);

          // Step 12: Collapse the accordion - result pane stays unchanged
          MarcAuthorities.clickAccordionByName(accordionName);
          MarcAuthorities.verifyAccordionOpenState(accordionName, false);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [customSource.name],
            browsePane: true,
          });

          // Step 13: Re-expand it - the step 9 selection is still shown, result pane unchanged
          MarcAuthorities.clickAccordionByName(accordionName);
          MarcAuthorities.verifyAccordionOpenState(accordionName, true);
          MarcAuthorities.checkSelectedAuthoritySource(customSource.name);
          MarcAuthorities.verifyRecordFound(customSource.heading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(predefinedSource.heading, false, {
            partialMatch: true,
          });
          MarcAuthorities.verifyRecordFound(notSpecifiedRecord.heading, false, {
            partialMatch: true,
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [customSource.name],
            browsePane: true,
          });

          // Step 14: Also select "LC Name Authority file (LCNAF)" - a pre-defined source
          MarcAuthorities.chooseAuthoritySourceOption(predefinedSource.name);
          MarcAuthorities.checkSelectedAuthoritySource(customSource.name);
          MarcAuthorities.checkSelectedAuthoritySource(predefinedSource.name);
          MarcAuthorities.verifyRecordFound(predefinedSource.heading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(customSource.heading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(notSpecifiedRecord.heading, false, {
            partialMatch: true,
          });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [customSource.name, predefinedSource.name],
            browsePane: true,
          });

          // Steps 15-16: Update the query to the pre-defined-source record - it gets highlighted
          MarcAuthoritiesSearch.fillSearchInput(predefinedSource.heading);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.checkRecordInBold(predefinedSource.heading);

          // Step 17: Open its detail view
          MarcAuthorities.selectIncludingTitle(predefinedSource.heading);
          MarcAuthority.waitLoading();

          // Step 18: Its natural id prefix matches the "LC Name Authority file (LCNAF)" source
          MarcAuthority.contains(`${predefinedSource.prefix}${predefinedSource.digits}`);

          // Step 19: Also select "Not specified"
          MarcAuthorities.chooseAuthoritySourceOption(notSpecifiedOption);
          MarcAuthorities.checkSelectedAuthoritySource(notSpecifiedOption);
          MarcAuthorities.verifyRecordFound(notSpecifiedRecord.heading, true, {
            partialMatch: true,
          });
          MarcAuthorities.verifyRecordFound(customSource.heading, true, { partialMatch: true });
          MarcAuthorities.verifyRecordFound(predefinedSource.heading, true, { partialMatch: true });
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: authoritySourceColumn,
            expectedValues: [customSource.name, predefinedSource.name, notSpecifiedOption],
            browsePane: true,
          });

          // Steps 20-21: Update the query to the "Not specified" record - it gets highlighted
          MarcAuthoritiesSearch.fillSearchInput(notSpecifiedRecord.heading);
          MarcAuthoritiesSearch.clickSearchButton();
          MarcAuthorities.checkRecordInBold(notSpecifiedRecord.heading);

          // Step 22: Open its detail view
          MarcAuthorities.selectIncludingTitle(notSpecifiedRecord.heading);
          MarcAuthority.waitLoading();

          // Step 23: No recognized prefix is shown - the natural id is the bare digits
          MarcAuthority.contains(`001\t${notSpecifiedRecord.digits}`);
        },
      );
    });
  });
});
