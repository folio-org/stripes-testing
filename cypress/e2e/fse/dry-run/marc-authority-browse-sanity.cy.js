import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const { user, memberTenant } = parseSanityParameters();
      const testData = {
        authority: {
          title: 'C350902Congress and foreign policy series',
          searchOption: 'Uniform title',
        },
      };
      const querySearch = 'C350902*';
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const propertyName = 'authority';
      let createdAuthorityID = null;

      before('Setup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false });
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(querySearch);
        DataImport.uploadFileViaApi('marcAuthFileForC350902.mrc', fileName, jobProfileToRun).then(
          (response) => {
            response.forEach((record) => {
              createdAuthorityID = record[propertyName].id;
            });
          },
        );
        cy.allure().logCommandSteps(false);
        cy.login(user.username, user.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
        cy.allure().logCommandSteps();
      });

      after('Cleanup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password, { log: false });
        if (createdAuthorityID) {
          MarcAuthority.deleteViaAPI(createdAuthorityID);
        }
      });

      it(
        'C350578 Browse existing Authorities (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C350578'] },
        () => {
          const checkPresentedColumns = [
            'Authorized/Reference',
            'Heading/Reference',
            'Type of heading',
            'Authority source',
            'Number of titles',
          ];

          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthority.checkPresentedColumns(checkPresentedColumns);
        },
      );
    });
  });
});
