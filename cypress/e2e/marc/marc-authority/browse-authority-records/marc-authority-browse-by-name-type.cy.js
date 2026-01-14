import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import marcAuthoritiesSearch from '../../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const randomPostfix = getRandomPostfix();
const testUser = {};
const marcFileName = 'marcAuthFileC409464C409476C409477C409479C409480C409484C409485.mrc';
const uploadFileName = `C409464_testMarcFile.${randomPostfix}.mrc`;
const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const propertyName = 'authority';
const browseQuery = 'UXPROD-4394';
// Permissions required for the test user
const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

const createdAuthorityIDs = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      before('Create data, login', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(browseQuery);

        cy.createTempUser(permissions).then((userProps) => {
          Object.assign(testUser, userProps);

          DataImport.uploadFileViaApi(marcFileName, uploadFileName, jobProfile).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[propertyName].id);
            });
          });

          cy.login(testUser.username, testUser.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
          MarcAuthorities.switchToBrowse();
        });
      });

      after('Delete data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testUser.userId);
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C409464 Browse for "MARC authority" records using "Personal name" browse option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C409464'] },
        () => {
          const personalNameOption = 'Personal name';
          const personalNameValueInList = 'Personal Name';
          const authorizedPersonal =
            'UXPROD-4394 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq Musical settings Literary style Stage history 1950- England';
          const referencePersonal =
            'UXPROD-4394 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subv subx suby subz';
          const authRefPersonal =
            'UXPROD-4394 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq subv subx suby subz';
          const authorizedPersonalInvalid =
            'UXPROD-4394 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq subk Musical settings Literary style Stage history 1950- England';
          const referencePersonalInvalid =
            'UXPROD-4394 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subk subv subx suby subz';
          // Step 1: Select Personal name browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(personalNameOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(personalNameOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedPersonal);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referencePersonal);
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefPersonal, false);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(3, [personalNameValueInList]);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record
          MarcAuthorityBrowse.searchBy(personalNameOption, authorizedPersonal);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedPersonal, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record
          MarcAuthorityBrowse.searchBy(personalNameOption, referencePersonal);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referencePersonal, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (500)
          MarcAuthorityBrowse.searchBy(personalNameOption, authRefPersonal);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefPersonal);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(personalNameOption, authorizedPersonalInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedPersonalInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(personalNameOption, referencePersonalInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referencePersonalInvalid);
        },
      );

      it(
        'C409476 Browse for "MARC authority" records using "Corporate/Conference name" browse option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C409476'] },
        () => {
          const corporateConferenceNameOption = 'Corporate/Conference name';
          const corporateOrConferenceTypes = ['Corporate Name', 'Conference Name'];
          const authorizedCorporate =
            'UXPROD-4394 Corporate name 110 Apple & Honey Productions subb subc subd subg subn subv subx suby subz';
          const referenceCorporate =
            'UXPROD-4394 Corporate name 410 Apple and Honey Productions subb subc subd subg subn subv subx suby subz';
          const authRefCorporate =
            'UXPROD-4394 Corporate name 510 Apple & Honey Film Corp. subb subc subd subg subn subv subx suby subz';
          const authorizedConference =
            'UXPROD-4394 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg subv subx suby subz';
          const referenceConference =
            'UXPROD-4394 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subv subx suby subz';
          const authRefConference =
            'UXPROD-4394 Conference Name 511 Western Region Agricultural Education Research Seminar (1983- ) subc subd subn subq subg subv subx suby subz';

          const authorizedCorporateInvalid =
            'UXPROD-4394 Corporate name 110 Apple & Honey Productions subb subc subd subg subn subk subv subx suby subz';
          const referenceCorporateInvalid =
            'UXPROD-4394 Corporate name 410 Apple and Honey Productions subb subc subd subg subn subk subv subx suby subz';
          const authorizedConferenceInvalid =
            'UXPROD-4394 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz';
          const referenceConferenceInvalid =
            'UXPROD-4394 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subk subv subx suby subz';

          // Step 1 & 2: Select option, enter query, check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(
            corporateConferenceNameOption,
            browseQuery,
          );

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedCorporate,
            true,
            false,
            'Corporate Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceCorporate,
            true,
            false,
            'Corporate Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedConference,
            true,
            false,
            'Conference Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceConference,
            true,
            false,
            'Conference Name',
          );
          MarcAuthorityBrowse.checkResultWithValue('Reference', authRefConference, false);
          MarcAuthorityBrowse.checkResultWithValue('Reference', authRefCorporate, false);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(3, corporateOrConferenceTypes);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized Corporate Name record
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, authorizedCorporate);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedCorporate,
            true,
            true,
            'Corporate Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference Corporate Name record
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, referenceCorporate);
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceCorporate,
            true,
            true,
            'Corporate Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref Corporate Name record (510)
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, authRefCorporate);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefCorporate);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for full Authorized Conference Name record
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, authorizedConference);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedConference,
            true,
            true,
            'Conference Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for full Reference Conference Name record
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, referenceConference);
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceConference,
            true,
            true,
            'Conference Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 9: Search for Auth/Ref Conference Name record (511)
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, authRefConference);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefConference);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 10: Search for Authorized Corporate Name with invalid subfields
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, authorizedCorporateInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedCorporateInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 11: Search for Reference Corporate Name with invalid subfields
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, referenceCorporateInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceCorporateInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 12: Search for Authorized Conference Name with invalid subfields
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, authorizedConferenceInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedConferenceInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 13: Search for Reference Conference Name with invalid subfields
          MarcAuthorityBrowse.searchBy(corporateConferenceNameOption, referenceConferenceInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceConferenceInvalid);
        },
      );

      it(
        'C409477 Browse for "MARC authority" records using "Geographic name" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409477'] },
        () => {
          const geographicNameOption = 'Geographic name';
          const authorizedGeographic =
            'UXPROD-4394 Geographic name 151 Gulf Stream subg subv subx suby subz';
          const referenceGeographic =
            'UXPROD-4394 Geographic name 451 Gulf Stream subg subi subv subx suby subz sub4 sub5';
          const authRefGeographic =
            'UXPROD-4394 Geographic name 551 Ocean currents subg subi subv subx suby subz sub4 sub5';
          const authorizedGeographicInvalid =
            'UXPROD-4394 Geographic name 151 Gulf Stream subg subv subx suby subz sub4';
          const referenceGeographicInvalid =
            'UXPROD-4394 Geographic name 451 Gulf Stream subg subi subv subx suby subz sub4 sub5 sub1';
          // Step 1: Select Geographic name browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(geographicNameOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(geographicNameOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedGeographic);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceGeographic);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record with valid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, authorizedGeographic);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedGeographic, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record with valid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, referenceGeographic);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceGeographic, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (551) - should not be found
          MarcAuthorityBrowse.searchBy(geographicNameOption, authRefGeographic);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefGeographic);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, authorizedGeographicInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedGeographicInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, referenceGeographicInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceGeographicInvalid);
        },
      );

      it(
        'C409479 Browse for "MARC authority" records using "Name-title" browse option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C409479'] },
        () => {
          const nameTitleNameOption = 'Name-title';
          const personalOrCorporateOrConferenceTypes = [
            'Personal Name',
            'Corporate Name',
            'Conference Name',
          ];
          const authorizedPersonalTitle =
            'UXPROD-4394 Personal name-title 100 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn subb subc subf subk subl subm subn subo subp subq subr subs';
          const authorizedCorporateTitle =
            'UXPROD-4394 Corporate name-title 110 India. Indian Medical Degrees Act, 1916 subb subc subd subf subk subl subm subn subo subp subq subr subs';
          const authorizedConferenceTitle =
            'UXPROD-4394 Conference Name-title 111 Mostly Chopin Festival. sonet subb subc subd subf subk subl subm subn subo subp subq subr subs';
          const referencePersonalTitle =
            "UXPROD-4394 Personal name-title 400 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn (Tom Sawyer's comrade) subb subc subf subi subk subl subm subn subo subp subq subr subs";
          const referenceCorporateTitle =
            'UXPROD-4394 Corporate name-title 410 Indian Medical Degrees Act, 1916 subb subc subd subf subi subk subl subm subn subo subp subq subr subs title';
          const referenceConferenceTitle =
            'UXPROD-4394 Conference Name-title 411Mostly Chopin Festival Orchestra subb subc subd subf subi subk subl subm subn subo subp subq subr subs subt';
          const authRefPersonalTitle =
            'UXPROD-4394 Personal name-title 500 Twain, Mark, 1835-1910 subb subc subf subi subk subl subm subn subo subp subq subr subs Huckleberry Finn Author';
          const authRefCorporateTitle =
            'UXPROD-4394 Corporate name-title 510 Indian Medical Degrees subb subc subd subf subi subk subl subm subn subo subp subq subr subs title';
          const authRefConferenceTitle =
            'UXPROD-4394 Conference Name-title 511 Mostly Chopin Orchestra subb subc subd subf subi subk subl subm subn subo subp subq subr subs subt';

          const authorizedConferenceTitleInvalid =
            'UXPROD-4394 Conference Name-title 111 Mostly Chopin Festival. sonet subb subc subd subf subk subl subm subn subo subp subq subr subs sub1';
          const referencePersonalTitleInvalid =
            "UXPROD-4394 Personal name-title 400 Twain, Mark, 1835-1910. Adventures of Huckleberry Finn (Tom Sawyer's comrade) subb subc subf subi subk subl subm subn subo subp subq subr subs sub1";
          const authRefCorporateTitleInvalid =
            'UXPROD-4394 Corporate name-title 510 Indian Medical Degrees subb subc subd subf subi subk subl subm subn subo subp subq subr subs sub1 title';

          // Step 1 & 2: Select option, enter query, check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(nameTitleNameOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedPersonalTitle,
            true,
            false,
            'Personal Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referencePersonalTitle,
            true,
            false,
            'Personal Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedCorporateTitle,
            true,
            false,
            'Corporate Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceCorporateTitle,
            true,
            false,
            'Corporate Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedConferenceTitle,
            true,
            false,
            'Conference Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceConferenceTitle,
            true,
            false,
            'Conference Name',
          );
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefPersonalTitle, false);
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefCorporateTitle, false);
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefConferenceTitle, false);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(
            3,
            personalOrCorporateOrConferenceTypes,
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized Personal Name-title record
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, authorizedPersonalTitle);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedPersonalTitle,
            true,
            true,
            'Personal Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference Corporate Name-title record
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, referenceCorporateTitle);
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceCorporateTitle,
            true,
            true,
            'Corporate Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for full Reference Conference Name-title record
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, referenceConferenceTitle);
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceConferenceTitle,
            true,
            true,
            'Conference Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Auth/Ref Conference Name-title record
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, authRefConferenceTitle);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefConferenceTitle);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Authorized Conference Name-title with invalid subfields
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, authorizedConferenceTitleInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedConferenceTitleInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 9: Search for Reference Personal Name-title with invalid subfields
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, referencePersonalTitleInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referencePersonalTitleInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 10: Search for Auth/Ref Corporate Name with invalid subfields
          MarcAuthorityBrowse.searchBy(nameTitleNameOption, authRefCorporateTitleInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefCorporateTitleInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();
        },
      );

      it(
        'C409480 Browse for "MARC authority" records using "Uniform title" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409480'] },
        () => {
          const uniformTitleOption = 'Uniform title';
          const authorizedUniform =
            'UXPROD-4394 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz';
          const referenceUniform =
            'UXPROD-4394 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz';
          const authRefUniform =
            'UXPROD-4394 Uniform title 530 Cartoons und Comics subd subf subg subh subi subk subl subm subn subo subp subr subs subt subv subx suby subz sub4';
          const authorizedUniformInvalid =
            'UXPROD-4394 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz subw';
          const referenceUniformInvalid =
            'UXPROD-4394 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz subw';
          // Step 1: Select Uniform title browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(uniformTitleOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(uniformTitleOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedUniform);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceUniform);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record with valid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authorizedUniform);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedUniform, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record with valid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, referenceUniform);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceUniform, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (530) - should not be found
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authRefUniform);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefUniform);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authorizedUniformInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedUniformInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, referenceUniformInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceUniformInvalid);
        },
      );

      it(
        'C409484 Browse for "MARC authority" records using "Subject" browse option (spitfire)',
        { tags: ['ExtendedPath', 'spitfire', 'C409484'] },
        () => {
          const subjectOption = 'Subject';
          const subjectTypes = [
            'Named Event',
            'Chronological Term',
            'Topical',
            'Medium of Performance Term',
            'General Subdivision',
            'Geographic Subdivision',
            'Chronological Subdivision',
            'Form Subdivision',
          ];
          const authorizedNamedEvent =
            'UXPROD-4394 Named Event 147 Stock Market Crash (1929) subc subg subv subx suby subz';
          const authorizedChronologicalTerm =
            'UXPROD-4394 Chronological Term 148 1500-1700 subv subx suby subz';
          const authorizedTopical = 'UXPROD-4394 Subject 150 Lampetra subb subv subx suby subz';
          const authorizedMediumOfPerformanceTerm = 'UXPROD-4394 Medium of Performance Term 162';
          const authorizedGeneralSubdivision =
            'UXPROD-4394 General Subdivision 180 Surgery Patients subv suby subz';
          const authorizedGeographicSubdivision =
            'UXPROD-4394 Geographic Subdivision 181 Foreign countries History and criticism subv suby subz';
          const authorizedChronologicalSubdivision =
            'UXPROD-4394 Chronological Subdivision 182 Qin-Han dynasties, 221 B.C.-220 A.D. subv subx subz';
          const authorizedFormSubdivision =
            'UXPROD-4394 Form Subdivision 185 Study guides subx suby subz';
          const referenceNamedEvent =
            'UXPROD-4394 Named Event 447Black Tuesday (1929) subc subg subv subx suby subz';
          const referenceChronologicalTerm =
            'UXPROD-4394 Chronological Term 448 Classical Period subv subx suby subz';
          const referenceTopical =
            'UXPROD-4394 Subject 450 Eudontomyzon subb subg subi subv subx suby subz sub4 sub5';
          const referenceMediumOfPerformanceTerm = 'UXPROD-4394 Medium of Performance Term 462';
          const referenceGeneralSubdivision =
            'UXPROD-4394 General Subdivision 480 Patient subv suby subz';
          const referenceGeographicSubdivision =
            'UXPROD-4394 Geographic Subdivision 481 Foreign countries subv suby subz';
          const referenceChronologicalSubdivision =
            'UXPROD-4394 Chronological Subdivision 482 Chʻin-Han dynasties, 221 B.C.-220 A.D. subv subx subz';
          const referenceFormSubdivision =
            'UXPROD-4394 Form Subdivision 485 Studying subx suby subz';
          const authRefNamedEvent =
            'UXPROD-4394 Named Event 547Crash (Stock Market : 1929) subg subv subx suby subz';
          const authRefChronologicalTerm =
            'UXPROD-4394 Chronological Term 548Early Modern Period subv subx suby subz';
          const authRefTopical =
            'UXPROD-4394 Subject 550 Petromyzontidae subb subg subi subv subx suby subz sub4 sub5';
          const authRefMediumOfPerformanceTerm = 'UXPROD-4394 Medium of Performance Term 562';
          const authRefGeneralSubdivision =
            'UXPROD-4394 General Subdivision 580 Patients subv suby subz';
          const authRefGeographicSubdivision =
            'UXPROD-4394 Geographic Subdivision 581 History and criticism subv suby subz';
          const authRefChronologicalSubdivision =
            'UXPROD-4394 Chronological Subdivision 582 Dynasties, 221 B.C.-220 A.D.. subv subx subz';
          const authRefFormSubdivision = 'UXPROD-4394 Form Subdivision 585 Guides subx suby subz';

          const authorizedTopicalInvalid =
            'UXPROD-4394 Subject 150 Lampetra subb subv subx suby subz sub1';
          const referenceTopicalInvalid =
            'UXPROD-4394 Subject 450 Eudontomyzon subb subg subi subv subx suby subz sub4 sub5 sub1';

          // Step 1 & 2: Select option, enter query, check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(subjectOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(subjectOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedNamedEvent,
            true,
            false,
            'Named Event',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceNamedEvent,
            true,
            false,
            'Named Event',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedChronologicalTerm,
            true,
            false,
            'Chronological Term',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceChronologicalTerm,
            true,
            false,
            'Chronological Term',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedTopical,
            true,
            false,
            'Topical',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceTopical,
            true,
            false,
            'Topical',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedMediumOfPerformanceTerm,
            true,
            false,
            'Medium of Performance Term',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceMediumOfPerformanceTerm,
            true,
            false,
            'Medium of Performance Term',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedGeneralSubdivision,
            true,
            false,
            'General Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceGeneralSubdivision,
            true,
            false,
            'General Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedGeographicSubdivision,
            true,
            false,
            'Geographic Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceGeographicSubdivision,
            true,
            false,
            'Geographic Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedChronologicalSubdivision,
            true,
            false,
            'Chronological Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceChronologicalSubdivision,
            true,
            false,
            'Chronological Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedFormSubdivision,
            true,
            false,
            'Form Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceFormSubdivision,
            true,
            false,
            'Form Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefNamedEvent, false);
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefChronologicalTerm, false);
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefTopical, false);
          MarcAuthorityBrowse.checkResultWithValue(
            'Auth/Ref',
            authRefMediumOfPerformanceTerm,
            false,
          );
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefGeneralSubdivision, false);
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefGeographicSubdivision, false);
          MarcAuthorityBrowse.checkResultWithValue(
            'Auth/Ref',
            authRefChronologicalSubdivision,
            false,
          );
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefFormSubdivision, false);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(3, subjectTypes);

          // Step 4: Click on the "Authority source" accordion header and select option in dropdown within this accordion which will return results (ex.: "Rare Books and Manuscripts Section (RBMS)")
          MarcAuthorities.chooseAuthoritySourceOption('Rare Books and Manuscripts Section (RBMS)');
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedChronologicalSubdivision,
            true,
            false,
            'Chronological Subdivision',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceChronologicalSubdivision,
            true,
            false,
            'Chronological Subdivision',
          );
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(4, [
            'Rare Books and Manuscripts Section (RBMS)',
          ]);

          // Step 5: Click on "References" accordion → Check "Exclude see from" checkbox inside accordion
          marcAuthoritiesSearch.selectExcludeReferencesFilter();
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedChronologicalSubdivision,
            true,
            false,
            'Chronological Subdivision',
          );
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(4, [
            'Rare Books and Manuscripts Section (RBMS)',
          ]);

          // Step 6: Click on the "Type of heading" accordion header and select option in dropdown within this accordion which will return results (ex.: "Chronological Subdivision")
          MarcAuthorities.chooseTypeOfHeading('Chronological Subdivision');
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedChronologicalSubdivision,
            true,
            false,
            'Chronological Subdivision',
          );
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(4, [
            'Rare Books and Manuscripts Section (RBMS)',
          ]);

          // Steps 7-10: Uncheck all facets and Click on the "Type of heading" accordion header and select option in dropdown within this accordion which will return results (ex.: "Named Event")
          MarcAuthorities.removeAuthoritySourceOption('Rare Books and Manuscripts Section (RBMS)');
          MarcAuthorities.resetTypeOfHeading();
          marcAuthoritiesSearch.unselectExcludeReferencesFilter();
          MarcAuthorities.chooseTypeOfHeading('Named Event');
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedNamedEvent,
            true,
            false,
            'Named Event',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceNamedEvent,
            true,
            false,
            'Named Event',
          );
          MarcAuthorities.resetTypeOfHeading();

          // Step 11: Search for full Authorized Topical record
          MarcAuthorityBrowse.searchBy(subjectOption, authorizedTopical);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedTopical,
            true,
            false,
            'Topical',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 12: Search for full Reference Topical record
          MarcAuthorityBrowse.searchBy(subjectOption, referenceTopical);
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceTopical,
            true,
            false,
            'Topical',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 13: Search for full Auth/Ref Topical record
          MarcAuthorityBrowse.searchBy(subjectOption, authRefTopical);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefTopical);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 14: Search for Authorized Topical with invalid subfields
          MarcAuthorityBrowse.searchBy(subjectOption, authorizedTopicalInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedTopicalInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 15: Search for Reference Topical with invalid subfields
          MarcAuthorityBrowse.searchBy(subjectOption, referenceTopicalInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceTopicalInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();
        },
      );

      it(
        'C409485 Browse for "MARC authority" records using "Genre" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409485'] },
        () => {
          const genreOption = 'Genre';
          const authorizedGenre = 'UXPROD-4394 Genre 155 Peplum films subv subx suby subz';
          const referenceGenre =
            'UXPROD-4394 Genre 455 Gladiator films subi subv subx suby subz sub4 sub5';
          const authRefGenre =
            'UXPROD-4394 Genre 555 Motion pictures subi subv subx suby subz sub4 sub5';
          const authorizedGenreInvalid =
            'UXPROD-4394 Genre 155 Peplum films subv subx suby subz sub1';
          const referenceGenreInvalid =
            'UXPROD-4394 Genre 455 Gladiator films subi subv subx suby subz sub4 sub5 sub1';
          // Step 1: Select Genre browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(genreOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(genreOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedGenre);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceGenre);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record with valid subfields
          MarcAuthorityBrowse.searchBy(genreOption, authorizedGenre);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedGenre, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record with valid subfields
          MarcAuthorityBrowse.searchBy(genreOption, referenceGenre);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceGenre, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (555) - should not be found
          MarcAuthorityBrowse.searchBy(genreOption, authRefGenre);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefGenre);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(genreOption, authorizedGenreInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedGenreInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(genreOption, referenceGenreInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceGenreInvalid);
        },
      );
    });
  });
});
