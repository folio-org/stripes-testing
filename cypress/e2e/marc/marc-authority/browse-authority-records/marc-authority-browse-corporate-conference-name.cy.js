import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

// Authority browse does NOT match a query against a heading in a different display form, so the
// query and the expected result must both be in the current "mapping.extended" form. Browse keeps
// the subfield order as authored; the only difference is the separator:
//  ON  -> "--" before each subdivision ($v/$x/$y/$z) value
//  OFF (or setting not retrieved) -> "--" rendered as a plain space
const headingAsDisplayed = (extendedForm) => (Cypress.env('authorityExtendedMappingState') === true
  ? extendedForm
  : extendedForm.replace(/---/g, '- ').replace(/--/g, ' '));

const randomPostfix = getRandomPostfix();
const testUser = {};
const marcFileName = 'marcAuthFileC409476.mrc';
const uploadFileName = `C409476_testMarcFile.${randomPostfix}.mrc`;
const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const propertyName = 'authority';
const browseQuery = 'C409476';

const authorizedCorporate =
  'C409476 Corporate name 110 Apple & Honey Productions subb subc subd subg subn--subv--subx--suby--subz';
const referenceCorporate =
  'C409476 Corporate name 410 Apple and Honey Productions subb subc subd subg subn--subv--subx--suby--subz';
const authRefCorporate =
  'C409476 Corporate name 510 Apple & Honey Film Corp. subb subc subd subg subn--subv--subx--suby--subz';
const authorizedConference =
  'C409476 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--suby--subz';
const referenceConference =
  'C409476 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--suby--subz';
const authRefConference =
  'C409476 Conference Name 511 Western Region Agricultural Education Research Seminar (1983- ) subc subd subn subq subg--subv--subx--suby--subz';

const authorizedCorporateInvalid =
  'C409476 Corporate name 110 Apple & Honey Productions subb subc subd subg subn subk--subv--subx--suby--subz';
const referenceCorporateInvalid =
  'C409476 Corporate name 410 Apple and Honey Productions subb subc subd subg subn subk--subv--subx--suby--subz';
const authorizedConferenceInvalid =
  'C409476 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg subk--subv--subx--suby--subz';
const referenceConferenceInvalid =
  'C409476 Conference Name 411 Western Regional Agricultural Education Research Meeting subc subd subn subq subg subk--subv--subx--suby--subz';

const corporateOrConferenceTypes = ['Corporate Name', 'Conference Name'];
const permissions = [Permissions.uiMarcAuthoritiesAuthorityRecordView.gui];

const createdAuthorityIDs = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      before('Create data, login', () => {
        cy.getAdminToken();
        cy.getAuthorityExtendedMappingState();
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
            authRefresh: true,
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
        'C409476 Browse for "MARC authority" records using "Corporate/Conference name" browse option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C409476'] },
        () => {
          // Browse query and expected heading must both be in the current setting's display form
          const [
            authorizedCorporateD,
            referenceCorporateD,
            authRefCorporateD,
            authorizedConferenceD,
            referenceConferenceD,
            authRefConferenceD,
            authorizedCorporateInvalidD,
            referenceCorporateInvalidD,
            authorizedConferenceInvalidD,
            referenceConferenceInvalidD,
          ] = [
            authorizedCorporate,
            referenceCorporate,
            authRefCorporate,
            authorizedConference,
            referenceConference,
            authRefConference,
            authorizedCorporateInvalid,
            referenceCorporateInvalid,
            authorizedConferenceInvalid,
            referenceConferenceInvalid,
          ].map(headingAsDisplayed);

          // Step 1 & 2: Select option, enter query, check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(
            'Corporate/Conference name',
            browseQuery,
          );
          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', browseQuery);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedCorporateD,
            true,
            false,
            'Corporate Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceCorporateD,
            true,
            false,
            'Corporate Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedConferenceD,
            true,
            false,
            'Conference Name',
          );
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceConferenceD,
            true,
            false,
            'Conference Name',
          );
          MarcAuthorityBrowse.checkResultWithValue('Reference', authRefConferenceD, false);
          MarcAuthorityBrowse.checkResultWithValue('Reference', authRefCorporateD, false);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(3, corporateOrConferenceTypes);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized Corporate Name record
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', authorizedCorporateD);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedCorporateD,
            true,
            true,
            'Corporate Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference Corporate Name record
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', referenceCorporateD);
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceCorporateD,
            true,
            true,
            'Corporate Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref Corporate Name record (510)
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', authRefCorporateD);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefCorporateD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for full Authorized Conference Name record
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', authorizedConferenceD);
          MarcAuthorityBrowse.checkResultWithValue(
            'Authorized',
            authorizedConferenceD,
            true,
            true,
            'Conference Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for full Reference Conference Name record
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', referenceConferenceD);
          MarcAuthorityBrowse.checkResultWithValue(
            'Reference',
            referenceConferenceD,
            true,
            true,
            'Conference Name',
          );
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 9: Search for Auth/Ref Conference Name record (511)
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', authRefConferenceD);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefConferenceD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 10: Search for Authorized Corporate Name with invalid subfields
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', authorizedCorporateInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedCorporateInvalidD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 11: Search for Reference Corporate Name with invalid subfields
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', referenceCorporateInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceCorporateInvalidD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 12: Search for Authorized Conference Name with invalid subfields
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', authorizedConferenceInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedConferenceInvalidD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 13: Search for Reference Conference Name with invalid subfields
          MarcAuthorityBrowse.searchBy('Corporate/Conference name', referenceConferenceInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceConferenceInvalidD);
        },
      );
    });
  });
});
