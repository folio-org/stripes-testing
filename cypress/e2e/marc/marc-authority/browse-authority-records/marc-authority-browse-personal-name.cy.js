import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const randomPostfix = getRandomPostfix();
const testUser = {};
const marcFileName = 'marcAuthFileC409464.mrc';
const uploadFileName = `C409464_testMarcFile.${randomPostfix}.mrc`;
const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const propertyName = 'authority';
const browseQuery = 'C409464';
const authorizedFull =
  'C409464 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq Musical settings Literary style Stage history 1950- England';
const referenceFull =
  'C409464 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subv subx suby subz';
const authRefFull =
  'C409464 Personal name 500 Windsor (Royal house : 1917- : Great Britain) II subg subq subv subx suby subz';
const authorizedInvalid =
  'C409464 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq subk Musical settings Literary style Stage history 1950- England';
const referenceInvalid =
  'C409464 Personal name 400 Elizabeth, II Princess, Duchess of Edinburgh, 1926- subg subq subk subv subx suby subz';
const personalNameOption = 'Personal name';
const personalNameValueInList = 'Personal Name';

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
          // Step 1: Select Personal name browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(personalNameOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(personalNameOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFull);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFull);
          MarcAuthorityBrowse.checkResultWithValue('Auth/Ref', authRefFull, false);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.checkAllRowsHaveOnlyExpectedValues(3, [personalNameValueInList]);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record
          MarcAuthorityBrowse.searchBy(personalNameOption, authorizedFull);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFull, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record
          MarcAuthorityBrowse.searchBy(personalNameOption, referenceFull);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFull, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (500)
          MarcAuthorityBrowse.searchBy(personalNameOption, authRefFull);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefFull);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(personalNameOption, authorizedInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(personalNameOption, referenceInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceInvalid);
        },
      );
    });
  });
});
