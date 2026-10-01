import {
  AUTHORITY_SEARCH_ACCORDION_NAMES,
  DEFAULT_FOLIO_AUTHORITY_FILES,
  MARC_AUTHORITY_SEARCH_OPTIONS,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, {
  getRandomLetters,
  randomNDigitNumber,
} from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    const randomPostfix = getRandomPostfix();
    const searchQuery = `AT_C422175_MarcAuthority_${randomPostfix}`;
    const notSpecifiedOption = 'Not specified';

    const customSource = {
      name: `AT_C422175_CustomSource_${randomPostfix}`,
      code: getRandomLetters(15).toUpperCase(),
      heading: `${searchQuery}_CustomSource`,
      digits: randomNDigitNumber(6),
    };

    // Table 1 from the precondition: one record per pre-defined FOLIO authority source file.
    // FAST/RBMS/AAT/GSAFD only carry a prefixed "001" (no matching "010 $a"), per the "check 001
    // if not present in 010 $a" rule - everything else carries a prefixed "010 $a".
    const predefinedSources = [
      { name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE, prefix: 'n', use001: false },
      { name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_SUBJECT_HEADINGS, prefix: 'sh', use001: false },
      {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_CHILDREN_SUBJECT_HEADINGS,
        prefix: 'sj',
        use001: false,
      },
      { name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_GENRE_FORM_TERMS, prefix: 'gf', use001: false },
      {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_DEMOGRAPHIC_GROUP_TERMS,
        prefix: 'dg',
        use001: false,
      },
      {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.LC_MEDIUM_OF_PERFORMANCE_THESAURUS_FOR_MUSIC,
        prefix: 'mp',
        use001: false,
      },
      {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.FACETED_APPLICATION_OF_SUBJECT_TERMINOLOGY,
        prefix: 'fst',
        use001: true,
      },
      { name: DEFAULT_FOLIO_AUTHORITY_FILES.MEDICAL_SUBJECT_HEADINGS, prefix: 'D', use001: false },
      {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.THESAURUS_FOR_GRAPHIC_MATERIALS,
        prefix: 'tgm',
        use001: false,
      },
      {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.RARE_BOOKS_AND_MANUSCRIPTS_SECTION,
        prefix: 'rbmscv',
        use001: true,
      },
      {
        name: DEFAULT_FOLIO_AUTHORITY_FILES.ART_AND_ARCHITECTURE_THESAURUS,
        prefix: 'aat',
        use001: true,
      },
      { name: DEFAULT_FOLIO_AUTHORITY_FILES.GSAFD_GENRE_TERMS, prefix: 'gsafd', use001: true },
    ].map((source, index) => ({
      ...source,
      heading: `${searchQuery}_${source.name.replace(/[^A-Za-z0-9]/g, '')}`,
      digits: `${randomNDigitNumber(9)}${index}`,
    }));

    const notSpecifiedRecord = {
      heading: `${searchQuery}_NotSpecified`,
      digits: randomNDigitNumber(9),
    };

    // Only "View" is needed here - all record/source-file setup happens via API, so the
    // Data Import permission from the precondition isn't required (Data Import UI is unused)
    const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

    let user;
    let customSourceId;
    const createdAuthorityIds = [];

    const authorityFields = ({ heading, prefix, digits, use001 }) => {
      const fields = [{ tag: '100', content: `$a ${heading}`, indicators: ['1', '\\'] }];
      if (!use001 && prefix) {
        fields.unshift({
          tag: '010',
          content: `$a ${prefix}${digits}`,
          indicators: ['\\', '\\'],
        });
      }
      return fields;
    };

    before('Create test data', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422175_');

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
        MarcAuthorities.createMarcAuthorityViaAPI(
          '',
          `${customSource.code}${customSource.digits}`.slice(-9),
          [
            {
              tag: '010',
              content: `$a ${customSource.code}${customSource.digits}`,
              indicators: ['\\', '\\'],
            },
            { tag: '100', content: `$a ${customSource.heading}`, indicators: ['1', '\\'] },
          ],
        ).then((id) => {
          createdAuthorityIds.push(id);
        });

        predefinedSources.forEach((source) => {
          MarcAuthorities.createMarcAuthorityViaAPI(
            source.use001 ? source.prefix : '',
            source.digits,
            authorityFields(source),
          ).then((id) => {
            createdAuthorityIds.push(id);
            source.id = id;
          });
        });

        MarcAuthorities.createMarcAuthorityViaAPI('', notSpecifiedRecord.digits, [
          { tag: '100', content: `$a ${notSpecifiedRecord.heading}`, indicators: ['1', '\\'] },
        ]).then((id) => {
          createdAuthorityIds.push(id);
        });
      });

      cy.createTempUser(permissions).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      createdAuthorityIds.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
      if (customSourceId) cy.deleteAuthoritySourceFileViaAPI(customSourceId, true);
    });

    it(
      'C422175 Apply "Authority source" facet not from pre-defined list to the search result list (promin)',
      { tags: ['extendedPath', 'promin', 'C422175'] },
      () => {
        // Step 7: Search for all records created for this test
        MarcAuthorities.searchBy(MARC_AUTHORITY_SEARCH_OPTIONS.KEYWORD, searchQuery);
        MarcAuthorities.verifySearchResultTabletIsAbsent(false);

        // Step 8: Select the custom (not pre-defined) "Authority source" facet option
        MarcAuthorities.chooseAuthoritySourceOption(customSource.name);
        MarcAuthorities.checkSelectedAuthoritySource(customSource.name);
        MarcAuthorities.checkRowsCount(1);
        MarcAuthorities.checkResultsPaneRecordsCounter(1);
        MarcAuthorities.verifyAllResultsHaveSource([customSource.name]);

        // Step 9: The record's own "010 $a" prefix matches the selected custom facet's code
        MarcAuthority.waitLoading();
        MarcAuthority.contains(`${customSource.code}${customSource.digits}`);

        MarcAuthorities.removeAuthoritySourceOption(customSource.name);

        // Step 10: Select every pre-defined "Authority source" facet option (not "Not specified")
        predefinedSources.forEach((source) => {
          MarcAuthorities.chooseAuthoritySourceOption(source.name);
        });
        MarcAuthorities.verifyMultiSelectFilterNumberOfSelectedOptions(
          AUTHORITY_SEARCH_ACCORDION_NAMES.AUTHORITY_SOURCE,
          predefinedSources.length,
        );
        MarcAuthorities.checkRowsCount(predefinedSources.length);
        MarcAuthorities.checkResultsPaneRecordsCounter(predefinedSources.length);
        MarcAuthorities.verifyAllResultsHaveSource(predefinedSources.map((source) => source.name));

        // Step 11-12: Open one record's detail view - its "010 $a"/"001" prefix matches its facet
        const sampleSource = predefinedSources[0];
        MarcAuthorities.selectAuthorityById(sampleSource.id);
        MarcAuthority.waitLoading();
        MarcAuthority.contains(`${sampleSource.prefix} ${sampleSource.digits}`);

        predefinedSources.forEach((source) => {
          MarcAuthorities.removeAuthoritySourceOption(source.name);
        });

        // Step 13: Select "Not specified" - only the record with no matching source is shown
        MarcAuthorities.chooseAuthoritySourceOption(notSpecifiedOption);
        MarcAuthorities.checkSelectedAuthoritySource(notSpecifiedOption);
        MarcAuthorities.checkResultsPaneRecordsCounter(1);
        MarcAuthorities.verifyAllResultsHaveSource([notSpecifiedOption]);
      },
    );
  });
});
