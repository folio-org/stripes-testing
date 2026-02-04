import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../support/utils/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const { user, memberTenant } = parseSanityParameters();
      const testData = {
        authority: {
          title: 'C350572 Sprouse, Chris',
          searchOption: 'Keyword',
          newField: {
            title: `Test authority ${getRandomPostfix()}`,
            tag: '901',
            content: 'venn',
          },
        },
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const fileName = `testMarcFile.${getRandomPostfix()}.mrc`;
      const propertyName = 'authority';
      let createdAuthorityID = null;

      before('Setup', () => {
        cy.setTenant(memberTenant.id);
        cy.getUserToken(user.username, user.password);
        DataImport.uploadFileViaApi('marcAuthC350572.mrc', fileName, jobProfileToRun).then(
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
        cy.getUserToken(user.username, user.password);
        if (createdAuthorityID) {
          MarcAuthority.deleteViaAPI(createdAuthorityID);
        }
      });

      it(
        'C350572 Edit an Authority record (spitfire)',
        { tags: ['dryRun', 'spitfire', 'C350572'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.selectFirst(testData.authority.title);
          MarcAuthority.edit();
          MarcAuthority.addNewField(
            5,
            testData.authority.newField.tag,
            `$a ${testData.authority.newField.content}`,
          );
          cy.wait(1000);
          MarcAuthority.changeField('100', testData.authority.newField.title);
          QuickMarcEditor.pressSaveAndClose();
          cy.wait(1500);

          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          MarcAuthority.contains(testData.authority.newField.tag);
          MarcAuthority.contains(testData.authority.newField.content);

          MarcAuthorities.searchBy(
            testData.authority.searchOption,
            testData.authority.newField.title,
          );
          MarcAuthorities.checkRow(testData.authority.newField.title);
        },
      );
    });
  });
});
