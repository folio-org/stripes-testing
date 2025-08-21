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
const marcFileName = 'marcAuthFileC409485.mrc';
const uploadFileName = `C409485_testMarcFile.${randomPostfix}.mrc`;
const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const propertyName = 'authority';
const browseQuery = 'C409485';
const authorizedFull = 'C409485 Genre 155 Peplum films subv subx suby subz';
const referenceFull = 'C409485 Genre 455 Gladiator films subi subv subx suby subz sub4 sub5';
const authRefFull = 'C409485 Genre 555 Motion pictures subi subv subx suby subz sub4 sub5';
const authorizedInvalid = 'C409485 Genre 155 Peplum films subv subx suby subz sub1';
const referenceInvalid =
  'C409485 Genre 455 Gladiator films subi subv subx suby subz sub4 sub5 sub1';
const genreOption = 'Genre';

const createdAuthorityIDs = [];

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      before('Create data, login', () => {
        cy.getAdminToken();
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

            cy.login(testUser.username, testUser.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
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
        'C409485 Browse for "MARC authority" records using "Genre" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409485'] },
        () => {
          // Step 1: Select Genre browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(genreOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(genreOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFull);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFull);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record with valid subfields
          MarcAuthorityBrowse.searchBy(genreOption, authorizedFull);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFull, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record with valid subfields
          MarcAuthorityBrowse.searchBy(genreOption, referenceFull);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFull, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (555) - should not be found
          MarcAuthorityBrowse.searchBy(genreOption, authRefFull);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefFull);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(genreOption, authorizedInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(genreOption, referenceInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceInvalid);
        },
      );
    });
  });
});
