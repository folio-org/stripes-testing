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
const marcFileName = 'marcAuthFileC409480.mrc';
const uploadFileName = `C409480_testMarcFile.${randomPostfix}.mrc`;
const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const propertyName = 'authority';
const browseQuery = 'C409480';
const authorizedFull =
  'C409480 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz';
const referenceFull =
  'C409480 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz';
const authRefFull =
  'C409480 Uniform title 530 Cartoons und Comics subd subf subg subh subi subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz sub4';
const authorizedInvalid =
  'C409480 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz subw';
const referenceInvalid =
  'C409480 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt--subv--subx--suby--subz subw';
const uniformTitleOption = 'Uniform title';

const createdAuthorityIDs = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      before('Create data, login', () => {
        cy.getAdminToken();
        cy.getAuthorityExtendedMappingState();
        // make sure there are no duplicate records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(browseQuery);

        cy.createTempUser([Permissions.uiMarcAuthoritiesAuthorityRecordView.gui]).then(
          (userProps) => {
            Object.assign(testUser, userProps);

            DataImport.uploadFileViaApi(marcFileName, uploadFileName, jobProfile).then(
              (response) => {
                response.forEach((record) => {
                  createdAuthorityIDs.push(record[propertyName].id);
                });
              },
            );
            cy.waitForAuthRefresh(() => {
              cy.login(testUser.username, testUser.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            });
            MarcAuthorities.switchToBrowse();
          },
        );
      });

      after('Delete data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testUser.userId);
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
      });

      it(
        'C409480 Browse for "MARC authority" records using "Uniform title" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409480'] },
        () => {
          // Browse query and expected heading must both be in the current setting's display form
          const [
            authorizedFullD,
            referenceFullD,
            authRefFullD,
            authorizedInvalidD,
            referenceInvalidD,
          ] = [authorizedFull, referenceFull, authRefFull, authorizedInvalid, referenceInvalid].map(
            headingAsDisplayed,
          );

          // Step 1: Select Uniform title browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(uniformTitleOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(uniformTitleOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFullD);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFullD);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record with valid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authorizedFullD);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFullD, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record with valid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, referenceFullD);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFullD, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (530) - should not be found
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authRefFullD);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefFullD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authorizedInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedInvalidD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, referenceInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceInvalidD);
        },
      );
    });
  });
});
