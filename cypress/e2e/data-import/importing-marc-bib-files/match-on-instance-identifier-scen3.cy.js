import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
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
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let userId = null;
    const randomIdentifierCode = `(OCoLC)847143${generateItemBarcode()}8`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const filePathForCreateInstance = 'marcFileForC347830.mrc';
    const filePathForUpdateInstance = 'marcFileForC347830_1.mrc';
    const editedMarcFileNameForCreate = `C347830 marcFileForCreate${getRandomPostfix()}.mrc`;
    const editedMarcFileNameForUpdate = `C347830 marcFileForUpdate${getRandomPostfix()}.mrc`;
    const fileNameForCreateInstance = `C347830 autotestFile${getRandomPostfix()}.mrc`;
    const fileNameForUpdateInstance = `C347830 autotestFile${getRandomPostfix()}.mrc`;
    const instanceGeneralNote = 'IDENTIFIER UPDATE 3';
    const resourceIdentifiers = [
      { type: 'UPC', value: 'ORD32671387-6' },
      { type: 'OCLC', value: randomIdentifierCode },
      { type: 'Invalid UPC', value: 'ORD32671387-6' },
      { type: 'System control number', value: '(AMB)84714376518561876438' },
    ];
    const matchProfile = {
      profileName: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '*',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      qualifierType: 'Begins with',
      qualifierValue: '(OCoLC)',
      compareValue: 'Numerics only',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.identifierOCLC,
      compareValueInComparison: 'Numerics only',
    };
    const mappingProfile = {
      name: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      staffSuppress: 'Unmark for all affected records',
      catalogedDate: '"2021-12-03"',
      catalogedDateUI: '2021-12-03',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.NOTYETASSIGNED,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken().then(() => {
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
          (response) => {
            if (response.totalRecords !== 0) {
              response.instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          },
        );
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.assignAcqUnitsToNewInvoice.gui,
        Permissions.invoiceSettingsAll.gui,
        Permissions.remoteStorageView.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        // delete profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(userId);
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
          (response) => {
            if (response.totalRecords !== 0) {
              response.instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          },
        );
      });
    });

    it(
      'C347830 Match on Instance identifier match meets both the Identifier type and Data requirements Scenario 3 (folijet)',
      { tags: ['criticalPath', 'folijet', 'C347830'] },
      () => {
        DataImport.editMarcFile(
          filePathForCreateInstance,
          editedMarcFileNameForCreate,
          ['(OCoLC)84714376518561876438'],
          [randomIdentifierCode],
        );
        DataImport.editMarcFile(
          filePathForUpdateInstance,
          editedMarcFileNameForUpdate,
          ['(OCoLC)84714376518561876438'],
          [randomIdentifierCode],
        );

        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreateInstance);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForCreateInstance);
        Logs.checkJobStatus(fileNameForCreateInstance, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreateInstance);
        Logs.clickOnHotLink(0, 3, RECORD_STATUSES.CREATED);
        InventoryInstance.verifyResourceIdentifier(
          resourceIdentifiers[0].type,
          resourceIdentifiers[0].value,
          6,
        );
        InventoryInstance.verifyResourceIdentifier(
          resourceIdentifiers[1].type,
          resourceIdentifiers[1].value,
          4,
        );
        cy.go('back');
        Logs.clickOnHotLink(1, 3, RECORD_STATUSES.CREATED);
        InventoryInstance.verifyResourceIdentifier(
          resourceIdentifiers[2].type,
          resourceIdentifiers[2].value,
          0,
        );
        InventoryInstance.verifyResourceIdentifier(
          resourceIdentifiers[3].type,
          resourceIdentifiers[3].value,
          3,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfileWithQualifierAndComparePart(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addStaffSuppress(mappingProfile.staffSuppress);
        NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.instanceStatus);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForUpdate, fileNameForUpdateInstance);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdateInstance);
        Logs.checkJobStatus(fileNameForUpdateInstance, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdateInstance);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.NO_ACTION, columnName, 1);
        });

        // check updated instance in Inventory
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
        InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
        InstanceRecordView.verifyGeneralNoteContent(instanceGeneralNote);
      },
    );
  });
});
