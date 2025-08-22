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
const marcFileName = 'marcAuthFileC409480.mrc';
const uploadFileName = `C409480_testMarcFile.${randomPostfix}.mrc`;
const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const propertyName = 'authority';
const browseQuery = 'C409480';
const authorizedFull =
  'C409480 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz';
const referenceFull =
  'C409480 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz';
const authRefFull =
  'C409480 Uniform title 530 Cartoons und Comics subd subf subg subh subi subk subl subm subn subo subp subr subs subt subv subx suby subz sub4';
const authorizedInvalid =
  'C409480 Uniform title 130 Cartoons & Comics subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz subw';
const referenceInvalid =
  'C409480 Uniform title 430 Reihe "Cartoons & Comics" subd subf subg subh subk subl subm subn subo subp subr subs subt subv subx suby subz subw';
const uniformTitleOption = 'Uniform title';

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
        'C409480 Browse for "MARC authority" records using "Uniform title" browse option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409480'] },
        () => {
          // Step 1: Select Uniform title browse option
          // Step 2: Enter browse query and check Search button
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(uniformTitleOption, browseQuery);

          // Step 3: Search and verify results for base query
          MarcAuthorityBrowse.searchBy(uniformTitleOption, browseQuery);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFull);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFull);
          MarcAuthorityBrowse.checkResultWithNoValue(browseQuery);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 4: Search for full Authorized record with valid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authorizedFull);
          MarcAuthorityBrowse.checkResultWithValue('Authorized', authorizedFull, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 5: Search for full Reference record with valid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, referenceFull);
          MarcAuthorityBrowse.checkResultWithValue('Reference', referenceFull, true, true);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 6: Search for Auth/Ref record (530) - should not be found
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authRefFull);
          MarcAuthorityBrowse.checkResultWithNoValue(authRefFull);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 7: Search for Authorized with invalid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, authorizedInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(authorizedInvalid);
          MarcAuthorityBrowse.clickResetAllAndCheck();

          // Step 8: Search for Reference with invalid subfields
          MarcAuthorityBrowse.searchBy(uniformTitleOption, referenceInvalid);
          MarcAuthorityBrowse.checkResultWithNoValue(referenceInvalid);
        },
      );
    });
  });
});
