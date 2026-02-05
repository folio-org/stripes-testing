import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe(
      'Edit Authority record',
      {
        retries: {
          runMode: 1,
        },
      },
      () => {
        let testData;
        const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
        let fileName;
        const propertyName = 'authority';
        let createdAuthorityID;

        beforeEach('Creating data', () => {
          testData = {
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
          fileName = `testMarcFile.${getRandomPostfix()}.mrc`;

          cy.createTempUser([
            Permissions.settingsDataImportEnabled.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]).then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            DataImport.uploadFileViaApi('marcAuthC350572.mrc', fileName, jobProfileToRun).then(
              (response) => {
                response.forEach((record) => {
                  createdAuthorityID = record[propertyName].id;
                });
              },
            );

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });

        afterEach('Deleting data', () => {
          cy.getAdminToken();
          if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
          Users.deleteViaApi(testData.userProperties.userId);
        });

        it(
          'C350572 Edit an Authority record (spitfire)',
          { tags: ['smoke', 'spitfire', 'shiftLeft', 'C350572'] },
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
      },
    );
  });
});
