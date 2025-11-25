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
    describe('Edit Authority record', () => {
      const testData = {
        tag040: '040',
        searchOption: 'Keyword',
        title: 'C523595 Dramas',
        successMessage:
          'This record has successfully saved and is in process. Changes may not appear immediately.',
      };

      const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const fileName = `testMarcFileC523595.${getRandomPostfix()}.mrc`;
      const propertyName = 'authority';
      let createdAuthorityID;
      let user;

      before('Creating data', () => {
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          DataImport.uploadFileViaApi('marcAuthFileForC523595.mrc', fileName, jobProfileToRun).then(
            (response) => {
              response.forEach((record) => {
                createdAuthorityID = record[propertyName].id;
              });
            },
          );

          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      afterEach('Deleting data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(createdAuthorityID);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C523595 "MARC validation rules check" modal appears during edit of MARC authority record (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C523595'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, testData.title);
          MarcAuthorities.selectFirstRecord();
          MarcAuthority.edit();
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag040);
          cy.wait(1000);

          QuickMarcEditor.simulateSlowNetwork('**/records-editor/validate', 5000);

          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.verifySlowInternetConnectionModal();

          cy.wait('@slowNetworkRequest');
          cy.wait(1500);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeletingFieldsModal();

          QuickMarcEditor.confirmDeletingFields();

          QuickMarcEditor.checkCallout(testData.successMessage);
          cy.wait(2000);
          MarcAuthorities.waitLoading();
        },
      );
    });
  });
});
