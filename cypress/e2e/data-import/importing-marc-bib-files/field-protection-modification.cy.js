import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    let instanceHrid = null;
    const fieldsForDelete = ['977', '978', '979'];
    const fieldsForDeleteIds = [];
    // unique file name to upload
    const fileName = `C350678 autotestFileProtection${getRandomPostfix()}.mrc`;

    const mappingProfile = {
      name: `C350678 Remove extraneous MARC fields ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };

    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C350678 Remove extraneous MARC fields ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.MODIFY,
    };

    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C350678 Create bib and instance, but remove some MARC fields first ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.getAdminToken();
      // create protection fields
      MarcFieldProtection.createViaApi({
        field: '*',
        indicator1: '*',
        indicator2: '*',
        subfield: '5',
        data: 'NcD',
        source: 'USER',
      }).then((resp) => {
        const id = resp.id;
        fieldsForDeleteIds.push(id);
      });
      MarcFieldProtection.createViaApi({
        field: fieldsForDelete[2],
        indicator1: '*',
        indicator2: '*',
        subfield: '*',
        data: '*',
        source: 'USER',
      }).then((resp) => {
        const id = resp.id;
        fieldsForDeleteIds.push(id);
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        fieldsForDeleteIds.forEach((fieldId) => MarcFieldProtection.deleteViaApi(fieldId));
        // delete profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C350678 MARC field protections apply to MARC modifications of incoming records when they should not: Scenario 1 (folijet)',
      { tags: ['criticalPath', 'folijet', 'C350678'] },
      () => {
        // create mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addFieldMappingsForMarc();
        NewFieldMappingProfile.fillModificationSectionWithDelete('Delete', fieldsForDelete[0], 0);
        NewFieldMappingProfile.addNewFieldInModificationSection();
        NewFieldMappingProfile.fillModificationSectionWithDelete('Delete', fieldsForDelete[1], 1);
        NewFieldMappingProfile.addNewFieldInModificationSection();
        NewFieldMappingProfile.fillModificationSectionWithDelete('Delete', fieldsForDelete[2], 2);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName(actionProfile.name);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating of the new instance, holding and item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC350678.mrc', fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileName);
        Logs.checkJobStatus(fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable('1', 0);
        FileDetails.checkInstanceQuantityInSummaryTable('1', 0);

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          // check fields are absent in the view source
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          // verify table data in marc bibliographic source
          InstanceRecordView.viewSource();
          fieldsForDelete.forEach((fieldNumber) => {
            InventoryViewSource.notContains(`${fieldNumber}\t`);
          });
        });
      },
    );
  });
});
