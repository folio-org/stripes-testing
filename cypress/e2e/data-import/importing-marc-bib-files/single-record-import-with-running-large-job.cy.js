import { calloutTypes } from '../../../../interactors';
import { APPLICATION_NAMES, DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const OCLCAuthentication = '100481406/PAOLF';
const fileName = `C356824 autotestFile${getRandomPostfix()}.mrc`;
const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
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
  subject: {
    indexRow: 0,
    subjectHeadings: 'French language--Dialects--Louisiana--Dictionaries',
    subjectSource: 'Library of Congress Subject Headings',
    subjectType: 'Topical term',
  },
  notes: {
    noteType: 'Bibliography note',
    noteContent: 'Includes bibliographical references and index',
  },
};

describe('Data Import', () => {
  describe(
    'Importing MARC Bib files',
    {
      retries: {
        runMode: 2,
      },
    },
    () => {
      beforeEach('Create test user and login', () => {
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiInventorySingleRecordImport.gui,
          Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.remoteStorageView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.dataImportPath,
            waiter: DataImport.waitLoading,
          });
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
        });
      });

      it(
        'C356824 Inventory single record import is not delayed when large data import jobs are running (folijet)',
        { tags: ['criticalPath', 'folijet', 'C356824'] },
        () => {
          Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);

          // import a file
          DataImport.checkIsLandingPageOpened();
          DataImport.verifyUploadState();
          DataImport.uploadFile('marcBibFileForC356824.mrc', fileName);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileToRun);
          JobProfiles.runImportFile();
          Logs.checkFileIsRunning(fileName);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.importWithOclc(oclcForImport);
          InventoryInstance.waitLoading();
          InventoryInstance.startOverlaySourceBibRecord();
          InventoryInstance.singleOverlaySourceBibRecordModalIsPresented();
          InventoryInstance.overlayWithOclc(oclcForUpdating);
          InteractorsTools.checkCalloutMessage(
            `Record ${oclcForUpdating} updated. Results may take a few moments to become visible in Inventory`,
            calloutTypes.success,
          );

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
          InstanceRecordView.verifyInstanceSubject(updatedInstanceData.subject);
          InventoryInstance.checkInstanceNotes(
            updatedInstanceData.notes.noteType,
            updatedInstanceData.notes.noteContent,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          Logs.checkFileIsRunning(fileName);
        },
      );
    },
  );
});
