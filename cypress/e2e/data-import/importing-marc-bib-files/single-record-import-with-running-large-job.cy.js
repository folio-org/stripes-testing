/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Users from '../../../support/fragments/users/users';
import { TARGET_PROFILE_NAMES } from '../../../support/constants';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user = {};
    const OCLCAuthentication = '100481406/PAOLF';
    const fileName = `C356824autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const oclcForImport = '912958093';
    const oclcForUpdating = '698820890';
    const updatedInstanceData = {
      title:
        'Dictionary of Louisiana French : as spoken in Cajun, Creole, and American Indian communities / Albert Valdman, editor ; Kevin J. Rottet, associate editor.',
      language: 'English, French',
      publisher: 'University Press of Mississippi',
      placeOfPublication: 'Jackson',
      publicationDate: '2010',
      physicalDescription: 'XL, 892 S',
      subject: 'French language--Dialects--Louisiana--Dictionaries',
      notes: {
        noteType: 'Bibliography note',
        noteContent: 'Includes bibliographical references and index',
      },
    };

    before('create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.remoteStorageView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
      });
    });

    after('delete test data', () => {
      Z3950TargetProfiles.changeOclcWorldCatToDefaultViaApi();
      Users.deleteViaApi(user.userId);
      // TODO delete all instances
    });

    it(
      'C356824 Inventory single record import is not delayed when large data import jobs are running (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        Z3950TargetProfiles.editOclcWorldCat(
          OCLCAuthentication,
          TARGET_PROFILE_NAMES.OCLC_WORLDCAT,
        );
        Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(OCLCAuthentication);

        // import a file
        cy.visit(TopMenu.dataImportPath);
        DataImport.checkIsLandingPageOpened();
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneThousandMarcBib.mrc', fileName);
        // wait until file will be uploaded
        cy.wait(10000);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(fileName);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.importWithOclc(oclcForImport);
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.singleOverlaySourceBibRecordModalIsPresented();
        InventoryInstance.importWithOclc(oclcForUpdating);
        InventoryInstance.checkCalloutMessage(
          `Record ${oclcForUpdating} updated. Results may take a few moments to become visible in Inventory`,
        );

        // check instance is updated
        InventoryInstance.verifyInstanceTitle(updatedInstanceData.title);
        InventoryInstance.verifyInstanceLanguage(updatedInstanceData.language);
        InventoryInstance.verifyInstancePublisher(0, 0, updatedInstanceData.publisher);
        InventoryInstance.verifyInstancePublisher(0, 2, updatedInstanceData.placeOfPublication);
        InventoryInstance.verifyInstancePublisher(0, 3, updatedInstanceData.publicationDate);
        InventoryInstance.verifyInstancePhysicalcyDescription(
          updatedInstanceData.physicalDescription,
        );
        InventoryInstance.verifyInstanceSubject(0, 0, updatedInstanceData.subject);
        InventoryInstance.checkInstanceNotes(
          updatedInstanceData.notes.noteType,
          updatedInstanceData.notes.noteContent,
        );

        cy.visit(TopMenu.dataImportPath);
        Logs.checkFileIsRunning(fileName);
      },
    );
  });
});
