import { JOB_STATUS_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC -> MARC Bibliographic -> Derive MARC bib', () => {
  const testData = {
    tagLDR: 'LDR',
    tagLdrValue: '01338cas\\a2200409\\\\\\4500',
    tag022: '022',
    tag222: '222',
    tag300: '300',
    tag300Value: '$av.$b25 cm.',
  };

  const calloutLDRMessage =
    'Record cannot be saved. The Leader must contain 24 characters, including null spaces.';
  const calloutTagMessage = 'Record cannot be saved. A MARC tag must contain three characters.';

  const marcFile = {
    marc: 'marcBibForC375177.mrc',
    fileName: `testMarcFileC375177.${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };

  const createdInstanceIDs = [];

  before('Creating data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
    ]).then((createdUserProperties) => {
      testData.userProperties = createdUserProperties;
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
        JobProfiles.search(marcFile.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFile.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFile.fileName);
        Logs.getCreatedItemsID().then((link) => {
          createdInstanceIDs.push(link.split('/')[5]);
        });
      });
    });
  });

  beforeEach('Login', () => {
    cy.login(testData.userProperties.username, testData.userProperties.password, {
      path: TopMenu.inventoryPath,
      waiter: InventoryInstances.waitContentLoading,
    });
  });

  after('Deleting created user and data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.userProperties.userId);
    createdInstanceIDs.forEach((instanceID) => {
      InventoryInstance.deleteInstanceViaApi(instanceID);
    });
  });

  it(
    'C375177 Error notifications shown before confirmation modals when saving "MARC bib" record while deriving record (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      // #1 Input query in search input filed which will return "Instance" record with source "MARC".
      InventoryInstance.searchByTitle(createdInstanceIDs[0]);
      // #2 Click on a row with the result of search from step 1.
      InventoryInstances.selectInstance();
      // #3 Click on the "Actions" button → select "Derive new MARC bibliographic record" option from the expanded menu.
      InventoryInstance.deriveNewMarcBib();

      // #4 Delete the last character from "LDR" field.
      QuickMarcEditor.updateExistingField(testData.tagLDR, testData.tagLdrValue.slice(0, -1));
      // #5 Input "0" in tag box (first box) for any field.
      QuickMarcEditor.updateExistingTagName(testData.tag022, '0');

      // #6 Delete any un-edited field.
      QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag222);

      // #7 Update any un-edited field with valid value.
      QuickMarcEditor.updateExistingField(testData.tag300, `${testData.tag300Value} test`);

      // #8 Click "Save & close" button.
      QuickMarcEditor.pressSaveAndClose();
      InteractorsTools.checkCalloutMessage(calloutLDRMessage, 'error');

      // #9 Input deleted value in "LDR" field.
      QuickMarcEditor.updateExistingField(testData.tagLDR, testData.tagLdrValue);

      // #10 Click "Save & close" button.
      QuickMarcEditor.pressSaveAndClose();
      InteractorsTools.checkCalloutMessage(calloutTagMessage, 'error');

      // #11 Input original tag value for field updated in Step 5.
      QuickMarcEditor.updateExistingTagName('0', testData.tag022);

      // #12 Click "Save & close" button.
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkDeleteModal(1);

      // #13 Click "Restore deleted field(s)" button in modal.
      QuickMarcEditor.clickRestoreDeletedField();
      QuickMarcEditor.checkDeleteModalClosed();
      QuickMarcEditor.checkFieldsExist([testData.tag222]);
    },
  );
});
