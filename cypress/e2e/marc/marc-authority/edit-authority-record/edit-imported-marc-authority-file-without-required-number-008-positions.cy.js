import { DEFAULT_JOB_PROFILE_NAMES, RECORD_STATUSES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  new100fieldRecordForFirstFile: getRandomPostfix(),
  new100fieldRecordForSecondFile: getRandomPostfix(),
  field008Updated: { 'Geo Subd': 'b', RecUpd: 'a', 'Mod Rec': 's', Source: 'c' },
  second008Field008Updated: { RefEval: 'a', RecUpd: 'a', 'Pers Name': 'b', 'Level Est': 'a' },
};
const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
const fileName = 'marcFileForC387474.mrc';
const updatedFileName = `testMarcFileUpd.${getRandomPostfix()}.mrc`;
let createdAuthorityID;

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      before('Creating data', () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(fileName, updatedFileName, jobProfileToRun);

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.dataImportPath,
              waiter: DataImport.waitLoading,
            });
            cy.reload();
          }, 20_000);
        });
      });

      after('Deleting data', () => {
        cy.getAdminToken();
        if (createdAuthorityID) MarcAuthority.deleteViaAPI(createdAuthorityID);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C387474 User can edit imported "MARC authority" file without required number (40) of "008" positions (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C387474'] },
        () => {
          Logs.openFileDetails(updatedFileName);
          Logs.getCreatedItemsID().then((link) => {
            createdAuthorityID = link.split('/')[5];
          });
          Logs.verifyInstanceStatus(0, 2);
          Logs.verifyInstanceStatus(1, 2);
          Logs.clickOnHotLink(0, 6, RECORD_STATUSES.CREATED);
          MarcAuthority.edit();
          QuickMarcEditor.check008BoxesCount(19);
          MarcAuthority.select008DropdownsIfOptionsExist(testData.field008Updated);
          QuickMarcEditor.updateExistingFieldContent(9, testData.new100fieldRecordForFirstFile);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          TopMenu.openDataImportApp();
          Logs.verifyInstanceStatus(0, 2);
          Logs.verifyInstanceStatus(1, 2);
          Logs.clickOnHotLink(1, 6, RECORD_STATUSES.CREATED);
          MarcAuthority.edit();
          QuickMarcEditor.check008BoxesCount(19);
          MarcAuthority.select008DropdownsIfOptionsExist(testData.second008Field008Updated);
          QuickMarcEditor.updateExistingFieldContent(9, testData.new100fieldRecordForSecondFile);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
        },
      );
    });
  });
});
