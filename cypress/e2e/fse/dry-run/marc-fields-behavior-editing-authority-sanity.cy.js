import {
  DEFAULT_JOB_PROFILE_NAMES,
  AUTHORITY_LDR_FIELD_STATUS_DROPDOWN,
  AUTHORITY_LDR_FIELD_TYPE_DROPDOWN,
  AUTHORITY_LDR_FIELD_ELVL_DROPDOWN,
  AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
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
        'C916260 MARC fields behavior when editing "MARC Authority" record (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C916260'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectFirst(testData.authority.title);
          MarcAuthority.edit();
          QuickMarcEditor.verifyBoxValuesInLDRFieldInMarcAuthorityRecord(
            '00853',
            AUTHORITY_LDR_FIELD_STATUS_DROPDOWN.C,
            AUTHORITY_LDR_FIELD_TYPE_DROPDOWN.Z,
            '\\\\a2200241',
            AUTHORITY_LDR_FIELD_ELVL_DROPDOWN.N,
            AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN['\\'],
            '\\4500',
          );
          MarcAuthority.check008Field('e');
          MarcAuthority.checkRemovedTag(9);
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkErrorMessage(
            9,
            'Tag must contain three characters and can only accept numbers 0-9.',
          );
        },
      );
    });
  });
});
