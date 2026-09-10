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
// query and the expected result must both be in the current "mapping.extended" form. For the
// Geographic name headings the difference is:
//  ON  -> "--" before each subdivision ($v/$x/$y/$z) value; numeric subfields kept inline
//  OFF (or setting not retrieved) -> "--" rendered as a space, and numeric subfield values
//        ("sub<digit>") moved to the end (letter subfields keep their authored order)
const headingAsDisplayed = (extendedForm) => {
  if (Cypress.env('authorityExtendedMappingState') === true) return extendedForm;
  const collapsed = extendedForm.replace(/---/g, '- ').replace(/--/g, ' ');
  const isNumericSubfield = (token) => /^sub[0-9]$/.test(token);
  const tokens = collapsed.split(' ');
  if (!tokens.some(isNumericSubfield)) return collapsed;
  return [
    ...tokens.filter((token) => !isNumericSubfield(token)),
    ...tokens.filter(isNumericSubfield),
  ].join(' ');
};

const randomPostfix = getRandomPostfix();
const testUser = {};
const marcFileName = 'marcAuthFileC409477.mrc';
const uploadFileName = `C409477_testMarcFile.${randomPostfix}.mrc`;
const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const propertyName = 'authority';
const browseQuery = 'C409477';
const authorizedFull = 'C409477 Geographic name 151 Gulf Stream subg--subv--subx--suby--subz';
const referenceFull =
  'C409477 Geographic name 451 Gulf Stream subg subi sub4 sub5--subv--subx--suby--subz';
const authRefFull =
  'C409477 Geographic name 551 Ocean currents subg subi sub4 sub5--subv--subx--suby--subz';
const authorizedInvalid =
  'C409477 Geographic name 151 Gulf Stream subg sub4--subv--subx--suby--subz';
const referenceInvalid =
  'C409477 Geographic name 451 Gulf Stream subg subi sub4 sub5 sub1--subv--subx--suby--subz';
const geographicNameOption = 'Geographic name';

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
        'C409477 Browse for "MARC authority" records using "Geographic name" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409477'] },
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

          // Step 1: Select Geographic name browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(geographicNameOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(geographicNameOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFullD);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFullD);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record with valid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, authorizedFullD);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFullD, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record with valid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, referenceFullD);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFullD, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (551) - should not be found
          MarcAuthorityBrowse.searchBy(geographicNameOption, authRefFullD);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefFullD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, authorizedInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedInvalidD);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(geographicNameOption, referenceInvalidD);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceInvalidD);
        },
      );
    });
  });
});
