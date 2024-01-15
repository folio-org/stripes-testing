import {
  ACCEPTED_DATA_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  RECORD_STATUSES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import {
  JobProfiles as SettingsJobProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user = null;
    let instanceHrid = null;
    const fieldsForDelete = ['977', '978', '979'];
    const fieldsForDeleteIds = [];
    // unique file name to upload
    const fileName = `C350678autotestFileProtection.${getRandomPostfix()}.mrc`;

    const mappingProfile = {
      name: `C350678 Remove extraneous MARC fields ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };

    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C350678 Remove extraneous MARC fields ${getRandomPostfix()}`,
      action: 'Modify (MARC Bibliographic record type only)',
    };

    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C350678 Create bib and instance, but remove some MARC fields first ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
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
      { tags: ['criticalPath', 'folijet'] },
      () => {
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

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
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
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName(actionProfile.name);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
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
          cy.visit(TopMenu.inventoryPath);
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
