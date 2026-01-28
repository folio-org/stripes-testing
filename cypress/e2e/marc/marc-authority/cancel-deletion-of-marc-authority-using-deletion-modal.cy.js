import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesDelete from '../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Delete Authority record', () => {
      const testData = {
        searchOption: 'Keyword',
      };
      const marcFile = {
        marc: 'marcAuthFileForC367928.mrc',
        fileName: `testMarcFileC367928.${getRandomPostfix()}.mrc`,
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
        propertyName: 'authority',
        authorityTitle: 'Erbil, H. Yıldırım',
      };

      let createdAuthorityID;

      before('Creating data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            if (response && response.length > 0) {
              createdAuthorityID = response[0][marcFile.propertyName].id;
            }
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        if (createdAuthorityID) {
          MarcAuthority.deleteViaAPI(createdAuthorityID, true);
        }
        if (testData.userProperties?.userId) {
          Users.deleteViaApi(testData.userProperties.userId);
        }
      });

      it(
        'C367928 Cancel deletion of "MARC Authority" record from "Confirm deletion of authority record" modal (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C367928'] },
        () => {
          MarcAuthorities.searchBy(testData.searchOption, marcFile.authorityTitle);

          MarcAuthorities.selectFirstRecord();
          MarcAuthority.waitLoading();

          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();

          QuickMarcEditor.closeModalWithEscapeKey();

          MarcAuthority.waitLoading();

          MarcAuthoritiesDelete.clickDeleteButton();
          MarcAuthoritiesDelete.checkDeleteModal();

          MarcAuthoritiesDelete.clickCancelButton();
        },
      );
    });
  });
});
