/* eslint-disable cypress/no-unnecessary-waiting */
import { calloutTypes } from '../../../../interactors';
import { RECORD_STATUSES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';
import LogsViewAll from '../../../support/fragments/data_import/logs/logsViewAll';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const OCLCAuthentication = '100481406/PAOLF';
    const fileName = `C356824autotestFile${getRandomPostfix()}.mrc`;
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
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.remoteStorageView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C356824 Inventory single record import is not delayed when large data import jobs are running (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);

        // import a file
        cy.visit(TopMenu.dataImportPath);
        DataImport.checkIsLandingPageOpened();
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcBibFileForC356824.mrc', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.checkFileIsRunning(fileName);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.importWithOclc(oclcForImport);
        cy.wait(15000);
        cy.reload();

        cy.visit(TopMenu.dataImportPath);
        Logs.openViewAllLogs();
        LogsViewAll.openUserIdAccordion();
        LogsViewAll.filterJobsByUser(`${user.firstName} ${user.lastName}`);
        LogsViewAll.openFileDetails('No file name');
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.waitLoading();
        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.singleOverlaySourceBibRecordModalIsPresented();
        InventoryInstance.overlayWithOclc(oclcForUpdating);
        InteractorsTools.checkCalloutMessage(
          `Record ${oclcForUpdating} updated. Results may take a few moments to become visible in Inventory`,
          calloutTypes.success,
        );
        cy.wait(15000);
        cy.reload();
        // check instance is updated
        InventoryInstance.verifyInstanceTitle(updatedInstanceData.title);
        InventoryInstance.verifyInstanceLanguage(updatedInstanceData.language);
        InventoryInstance.verifyInstancePublisher({
          publisher: updatedInstanceData.publisher,
          place: updatedInstanceData.placeOfPublication,
          date: updatedInstanceData.publicationDate,
        });
        InventoryInstance.verifyInstancePhysicalcyDescription(
          updatedInstanceData.physicalDescription,
        );
        InventoryInstance.openSubjectAccordion();
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
