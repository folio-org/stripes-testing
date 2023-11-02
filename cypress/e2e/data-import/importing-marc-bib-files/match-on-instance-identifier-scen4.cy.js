import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import {
  JOB_STATUS_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
} from '../../../support/constants';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import GenerateIdentifierCode from '../../../support/utils/generateIdentifierCode';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const randomIdentifierCode = GenerateIdentifierCode.getRandomIdentifierCode();
    const editedMarcFileNameForCreate = `C347831 marcFileForCreate.${getRandomPostfix()}.mrc`;
    const editedMarcFileNameForUpdate = `C347831 marcFileForUpdate.${getRandomPostfix()}.mrc`;
    const fileNameForCreateInstance = `C347831autotestFile.${getRandomPostfix()}.mrc`;
    const fileNameForUpdateInstance = `C347831autotestFile.${getRandomPostfix()}.mrc`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const firstInstanceTitle =
      'Competing with idiots : Herman and Joe Mankiewicz, a dual portrait / Nick Davis.';
    const secondInstaneTitle =
      'Letters from a Stoic : The Ancient Classic  / Seneca, with a introduction of Donald Robertson.';
    const instanceGeneralNote = 'IDENTIFIER UPDATE 4';
    const resourceIdentifiers = [
      { type: 'UPC', value: 'ORD32671387-4' },
      { type: 'OCLC', value: '(OCoLC)84714376518561876438' },
      { type: 'Invalid UPC', value: 'ORD32671387-4' },
      { type: 'System control number', value: `(${randomIdentifierCode})84714376518561876438` },
    ];
    const matchProfile = {
      profileName: `C347831 ID Match Test - Update4 (System control number).${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '*',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      qualifierType: 'Begins with',
      qualifierValue: `(${randomIdentifierCode})`,
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.systemControlNumber,
    };
    const mappingProfile = {
      name: `C347831 ID Match Test - Update4 (System control number).${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      staffSuppress: 'Unmark for all affected records',
      catalogedDate: '"2021-12-04"',
      catalogedDateUI: '2021-12-04',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.OTHER,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C347831 ID Match Test - Update4 (System control number).${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C347831 ID Match Test - Update4 (System control number).${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.getAdminToken().then(() => {
        InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
          (instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
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
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
        (instances) => {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        },
      );
    });

    it(
      'C347831 MODDICORE-231 "Match on Instance identifier match meets both the Identifier type and Data requirements" Scenario 4 (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        // change files for create and update instance using random identifier code
        DataImport.editMarcFile(
          'marcFileForMatchOnIdentifierForCreate.mrc',
          editedMarcFileNameForCreate,
          ['AMB'],
          [randomIdentifierCode],
        );
        DataImport.editMarcFile(
          'marcFileForMatchOnIdentifierForUpdate_4.mrc',
          editedMarcFileNameForUpdate,
          ['AMB'],
          [randomIdentifierCode],
        );

        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreateInstance);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForCreateInstance);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreateInstance);
        Logs.clickOnHotLink(0, 3, 'Created');
        InventoryInstance.verifyInstanceTitle(firstInstanceTitle);
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
        Logs.clickOnHotLink(1, 3, 'Created');
        InventoryInstance.verifyInstanceTitle(secondInstaneTitle);
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
        MatchProfiles.createMatchProfileWithQualifierAndExistingRecordField(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addStaffSuppress(mappingProfile.staffSuppress);
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
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForUpdate, fileNameForUpdateInstance);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForUpdateInstance);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdateInstance);
        FileDetails.checkStatusInColumn(
          FileDetails.status.dash,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.instance,
        );
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName, 1);
        });

        // check updated instance in Inventory
        FileDetails.openInstanceInInventory('Updated', 1);
        InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
        InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
        InstanceRecordView.verifyGeneralNoteContent(instanceGeneralNote);
      },
    );
  });
});
