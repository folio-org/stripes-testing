import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    let userId;
    const filePathForCreateInstance = 'marcFileForC347828.mrc';
    const filePathForUpdateInstance = 'marcFileForC347828_1.mrc';
    const fileNameForCreateInstance = `C347828 autotestFile${getRandomPostfix()}.mrc`;
    const fileNameForUpdateInstance = `C347828 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileToRun = DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS;
    const instanceGeneralNote = 'IDENTIFIER UPDATE 1';
    const resourceIdentifiers = [
      { type: 'UPC', value: 'ORD32671387-4' },
      { type: 'OCLC', value: '(OCoLC)84714376518561876438' },
      { type: 'Invalid UPC', value: 'ORD32671387-4' },
      { type: 'System control number', value: '(AMB)84714376518561876438' },
    ];
    const matchProfile = {
      profileName: `autotestMatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '024',
        in1: '1',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: 'Identifier: UPC',
    };
    const mappingProfile = {
      name: `C347828 autotestMappingProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      suppressFromDiscavery: 'Mark for all affected records',
      catalogedDate: '"2021-12-01"',
      catalogedDateUI: '2021-12-01',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
    };
    const actionProfile = {
      name: `C347828 autotestActionProf${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const jobProfile = {
      profileName: `C347828 autotestJobProf${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
        (instances) => {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        },
      );

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataImportDeleteLogs.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.viewEditDeleteInvoiceInvoiceLine.gui,
        Permissions.viewEditCreateInvoiceInvoiceLine.gui,
        Permissions.assignAcqUnitsToNewInvoice.gui,
        Permissions.invoiceSettingsAll.gui,
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
        Users.deleteViaApi(userId);
        // delete profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });
    });

    it(
      'C347828 MODDICORE-231 "Match on Instance identifier match meets both the Identifier type and Data requirements" Scenario 1 (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateInstance, fileNameForCreateInstance);
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

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addSuppressFromDiscovery(mappingProfile.suppressFromDiscavery);
        NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.instanceStatus);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfile,
          actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpdateInstance, fileNameForUpdateInstance);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdateInstance);
        Logs.checkJobStatus(fileNameForUpdateInstance, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdateInstance);
        Logs.verifyInstanceStatus(0, 3, RECORD_STATUSES.UPDATED);
        Logs.verifyInstanceStatus(1, 3, RECORD_STATUSES.NO_ACTION);
        Logs.clickOnHotLink(0, 3, RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyMarkAsSuppressedFromDiscovery();
        InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
        InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
        InstanceRecordView.verifyGeneralNoteContent(instanceGeneralNote);
      },
    );
  });
});
