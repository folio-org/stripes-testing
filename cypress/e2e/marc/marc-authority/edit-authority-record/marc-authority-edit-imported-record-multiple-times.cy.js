import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const testData = {
        authority: {
          title: 'Congress and foreign policy series',
          searchOption: 'Uniform title',
          newField: {
            title: `Test authority ${getRandomPostfix()}`,
            tag: '901',
            content: 'venn',
          },
        },
        newFields: [
          { tag: '500', content: 'Added tag 1' },
          { tag: '510', content: 'Added tag 2' },
          { tag: '511', content: 'Added tag 3' },
        ],
        deletedFieldTags: ['380', '642', '645'],
        editedFieldValues: ['edited 1 time', 'edited 2 times', 'edited 3 times'],
      };
      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const marcFiles = [
        { marc: 'oneMarcAuthority.mrc', fileName: `testMarcFile.${getRandomPostfix()}.mrc` },
      ];
      const createdAuthorityID = [];

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.settingsDataImportEnabled.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
        });
      });

      before('Upload files', () => {
        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        }).then(() => {
          DataImport.uploadFileViaApi(
            marcFiles[0].marc,
            marcFiles[0].fileName,
            jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityID.push(record.authority.id);
            });
          });
        });
      });

      beforeEach('Login', () => {
        cy.visit(TopMenu.marcAuthorities);
        MarcAuthorities.waitLoading();
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        createdAuthorityID.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C350696 Edit the imported MARC Authority record via MARC Authority app multiple times (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C350696'] },
        () => {
          MarcAuthorities.searchBy(testData.authority.searchOption, testData.authority.title);
          MarcAuthorities.select(createdAuthorityID[0]);
          testData.newFields.forEach((newField, index) => {
            MarcAuthority.edit();
            QuickMarcEditor.checkPaneheaderContains(`Source: ${testData.userProperties.username}`);
            MarcAuthority.addNewField(4, newField.tag, `$a ${newField.content}`);
            QuickMarcEditor.verifyTagValue(5, newField.tag);
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.deleteFieldByTagAndCheck(testData.deletedFieldTags[index]);
            QuickMarcEditor.verifySaveAndCloseButtonEnabled();
            MarcAuthority.changeField('130', testData.editedFieldValues[index]);
            MarcAuthority.clickSaveAndCloseButton();
            MarcAuthority.continueWithSaveAndCheck();
          });
        },
      );
    });
  });
});
