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
      const titlePrefix = `AT_C466270_MarcAuthority_${randomPostfix}`;
      const naturalIdPrefix = `466270${randomNDigitNumber(15)}`;

      // Each group has a "center" record carrying the TestRail-specified diacritic heading, and
      // "before"/"after" plain-letter siblings picked so the folded center heading must land
      // between them alphabetically - this makes the diacritic-folding sort behavior observable
      // instead of just checking a single record's presence

      // Group 1 - "Name-title" browse option: a single 1XX field with $a/$d/$t subfields
      const nameTitle = {
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.NAME_TITLE,
        heading: `${titlePrefix} Żabczyc, Jan, -approximately 1629. Symfonije anielskie`,
        foldedQuery: `${titlePrefix} Zabczyc, Jan, -approximately 1629. Symfonije anielskie`,
        // "Zabbo" < "Zabczyc"(folded) < "Zabielski" ('b' < 'c' < 'i')
        beforeHeading: `${titlePrefix} Zabbo, Anna, -approximately 1600. Test composition`,
        afterHeading: `${titlePrefix} Zabielski, Karol, -approximately 1650. Test composition`,
      };

      // Group 2 - "Personal name" browse option: a single 1XX field, $a only
      const personalName = {
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.PERSONAL_NAME,
        heading: `${titlePrefix} Štrauss, Augusts`,
        foldedQuery: `${titlePrefix} Strauss, Augusts`,
        // "Strauber" < "Strauss"(folded) < "Strauta" ('b' < 's' < 't')
        beforeHeading: `${titlePrefix} Strauber, Anna`,
        afterHeading: `${titlePrefix} Strauta, Boris`,
      };
      personalName.nonExactQuery = `${personalName.heading} test`;
      personalName.nonExactFoldedQuery = `${personalName.foldedQuery} test`;

      // Group 3 - "Subject" browse option: a 150 field
      const subject = {
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.SUBJECT,
        heading: `${titlePrefix} Māori drama`,
        foldedQuery: `${titlePrefix} Maori drama`,
        // "Manitoba" < "Maori"(folded) < "Marine" ('n' < 'o' < 'r')
        beforeHeading: `${titlePrefix} Manitoba history`,
        afterHeading: `${titlePrefix} Marine biology`,
      };

      const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

      let user;
      const createdAuthorityIds = [];
      let recordIndex = 1;

      const createAuthority = (fields) => {
        MarcAuthorities.createMarcAuthorityViaAPI(
          '',
          `${naturalIdPrefix}${recordIndex++}`,
          fields,
        ).then((id) => createdAuthorityIds.push(id));
      };

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C466270_');

        // Name-title: 100 with $a/$d/$t
        createAuthority([
          {
            tag: '100',
            content: `$a ${titlePrefix} Żabczyc, Jan, $d -approximately 1629. $t Symfonije anielskie`,
            indicators: ['1', '\\'],
          },
        ]);
        createAuthority([
          {
            tag: '100',
            content: `$a ${titlePrefix} Zabbo, Anna, $d -approximately 1600. $t Test composition`,
            indicators: ['1', '\\'],
          },
        ]);
        createAuthority([
          {
            tag: '100',
            content: `$a ${titlePrefix} Zabielski, Karol, $d -approximately 1650. $t Test composition`,
            indicators: ['1', '\\'],
          },
        ]);

        // Personal name: 100, $a only
        createAuthority([
          { tag: '100', content: `$a ${titlePrefix} Štrauss, Augusts`, indicators: ['1', '\\'] },
        ]);
        createAuthority([
          { tag: '100', content: `$a ${titlePrefix} Strauber, Anna`, indicators: ['1', '\\'] },
        ]);
        createAuthority([
          { tag: '100', content: `$a ${titlePrefix} Strauta, Boris`, indicators: ['1', '\\'] },
        ]);

        // Subject: 150
        createAuthority([
          { tag: '150', content: `$a ${titlePrefix} Māori drama`, indicators: ['\\', '\\'] },
        ]);
        createAuthority([
          { tag: '150', content: `$a ${titlePrefix} Manitoba history`, indicators: ['\\', '\\'] },
        ]);
        createAuthority([
          { tag: '150', content: `$a ${titlePrefix} Marine biology`, indicators: ['\\', '\\'] },
        ]);

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

      const verifyGroupRecordsFound = (group) => {
        MarcAuthorities.verifyRecordFound(group.beforeHeading);
        MarcAuthorities.verifyRecordFound(group.heading);
        MarcAuthorities.verifyRecordFound(group.afterHeading);
      };

      it(
        'C466270 Diacritics are properly handled when user browsing for "MARC authority" records (promin)',
        { tags: ['extendedPath', 'promin', 'C466270'] },
        () => {
          // Step 1: Browse "Name-title" using the diacritic query
          MarcAuthorityBrowse.searchBy(nameTitle.browseOption, nameTitle.heading);
          verifyGroupRecordsFound(nameTitle);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();

          // Step 2: Same browse option, using the plain (folded) query - same records displayed
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSearchQuery('');
          MarcAuthorityBrowse.searchBy(nameTitle.browseOption, nameTitle.foldedQuery);
          verifyGroupRecordsFound(nameTitle);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();

          // Step 3: Reset, then browse "Personal name" using the diacritic query
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSearchQuery('');
          MarcAuthorityBrowse.searchBy(personalName.browseOption, personalName.heading);
          verifyGroupRecordsFound(personalName);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();

          // Step 4: Reset, then browse a non-exact diacritic query - placeholder row expected
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSearchQuery('');
          MarcAuthorityBrowse.searchBy(personalName.browseOption, personalName.nonExactQuery);
          MarcAuthorityBrowse.checkHeadingReference(
            personalName.nonExactQuery,
            personalName.heading,
          );
          verifyGroupRecordsFound(personalName);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();

          // Step 5: Reset, then browse "Personal name" using the plain (folded) query
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSearchQuery('');
          MarcAuthorityBrowse.searchBy(personalName.browseOption, personalName.foldedQuery);
          verifyGroupRecordsFound(personalName);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();

          // Step 6: Reset, then browse a non-exact folded query - same placeholder row expected
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSearchQuery('');
          MarcAuthorityBrowse.searchBy(personalName.browseOption, personalName.nonExactFoldedQuery);
          MarcAuthorityBrowse.checkHeadingReference(
            personalName.nonExactFoldedQuery,
            personalName.heading,
          );
          verifyGroupRecordsFound(personalName);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();

          // Step 7: Reset, then browse "Subject" using the diacritic query
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSearchQuery('');
          MarcAuthorityBrowse.searchBy(subject.browseOption, subject.heading);
          verifyGroupRecordsFound(subject);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();

          // Step 8: Reset, then browse "Subject" using the plain (folded) query
          MarcAuthorities.clickReset();
          MarcAuthorities.checkSearchQuery('');
          MarcAuthorityBrowse.searchBy(subject.browseOption, subject.foldedQuery);
          verifyGroupRecordsFound(subject);
          MarcAuthorities.checkResultsSortedWithDiacriticFolding();
        },
      );
    });
  });
});
