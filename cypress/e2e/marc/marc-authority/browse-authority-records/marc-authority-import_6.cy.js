import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Browse - Authority records', () => {
      const testData = {
        searchOptionPersonalName: 'Personal name',
        searchOptionNameTitle: 'Name-title',
        searchOptionKeyword: 'Keyword',
        recordA: 'Angelou, Maya.',
        recordB: 'Angelou, Maya. And still I rise',
        recordBRef: 'Angelou, Maya. Still I rise',
        authorized: 'Authorized',
        reference: 'Reference',
        recordWithoutTitle: 'Twain, Mark, 1835-1910',
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const propertyName = 'authority';
      const fileName = `C356765 testMarcFile.${getRandomPostfix()}.mrc`;
      const createdAuthorityIDs = [];

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
        });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        createdAuthorityIDs.length = 0;
      });

      it(
        'C356765 Search for record without subfield "t" (personalNameTitle and sftPersonalName) (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi('marcFileForC356765.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.clickActionsButton();
          MarcAuthorities.actionsSortBy('Type of heading');

          MarcAuthorities.checkSearchOption('keyword');
          MarcAuthorities.searchByParameter('Keyword', 'C356765 Twain');
          MarcAuthorities.checkResultList([
            'C356765 Twain, Marek, 1835-1910',
            'C356765 Twain, Mark, 1835-1910',
          ]);

          MarcAuthorities.searchByParameter('Personal name', 'C356765 Twain');
          MarcAuthorities.checkResultList([
            'C356765 Twain, Marek, 1835-1910',
            'C356765 Twain, Mark, 1835-1910',
          ]);

          MarcAuthorities.searchByParameter('Name-title', 'C356765 Twain');
          MarcAuthorities.checkNoResultsMessage(
            'No results found for "C356765 Twain". Please check your spelling and filters.',
          );
        },
      );

      it(
        'C353995 Search for records which have subfield "t" value (personalNameTitle and sftPersonalNameTitle) (spitfire)',
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          DataImport.uploadFileViaApi('marcFileForC353995.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityIDs.push(record[propertyName].id);
              });
            },
          );

          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.checkSearchOption('keyword');
          MarcAuthorities.searchByParameter(
            testData.searchOptionKeyword,
            `C353995 ${testData.recordB}`,
          );
          MarcAuthorityBrowse.checkResultWithValue(
            testData.authorized,
            `C353995 ${testData.recordB}`,
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionKeyword,
            `C353995 ${testData.recordA}`,
          );

          MarcAuthorityBrowse.checkResultWithValueB(
            testData.authorized,
            `C353995 ${testData.recordB}`,
            testData.reference,
            `C353995 ${testData.recordBRef}`,
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionPersonalName,
            `C353995 ${testData.recordA}`,
          );
          MarcAuthorities.checkNoResultsMessage(
            'No results found for "C353995 Angelou, Maya.". Please check your spelling and filters.',
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionNameTitle,
            `C353995 ${testData.recordB}`,
          );
          MarcAuthorityBrowse.checkResultWithValue(
            testData.authorized,
            `C353995 ${testData.recordB}`,
          );

          MarcAuthorities.searchByParameter(
            testData.searchOptionNameTitle,
            `C353995 ${testData.recordA}`,
          );
          MarcAuthorityBrowse.checkResultWithValueB(
            testData.authorized,
            `C353995 ${testData.recordB}`,
            testData.reference,
            `C353995 ${testData.recordBRef}`,
          );
        },
      );
    });
  });
});
