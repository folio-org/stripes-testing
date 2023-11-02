import generateItemBarcode from '../../../support/utils/generateItemBarcode';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let userId = null;
    const randomIdentifierCode = `(OCoLC)847143${generateItemBarcode()}8`;
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const filePathForCreateInstance = 'marcFileForMatchOnIdentifierForCreate.mrc';
    const filePathForUpdateInstance = 'marcFileForMatchOnIdentifierForUpdate_3.mrc';
    const editedMarcFileNameForCreate = `C347830 marcFileForCreate.${getRandomPostfix()}.mrc`;
    const editedMarcFileNameForUpdate = `C347830 marcFileForUpdate.${getRandomPostfix()}.mrc`;
    const fileNameForCreateInstance = `C347830autotestFile.${getRandomPostfix()}.mrc`;
    const fileNameForUpdateInstance = `C347830autotestFile.${getRandomPostfix()}.mrc`;
    const instanceGeneralNote = 'IDENTIFIER UPDATE 3';
    const resourceIdentifiers = [
      { type: 'UPC', value: 'ORD32671387-4' },
      { type: 'OCLC', value: randomIdentifierCode },
      { type: 'Invalid UPC', value: 'ORD32671387-4' },
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
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
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
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C347830 ID Match Test - Update3 (OCLC).${getRandomPostfix()}`,
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

    after('delete test data', () => {
      // delete profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(userId);
      InventorySearchAndFilter.getInstancesByIdentifierViaApi(resourceIdentifiers[0].value).then(
        (instances) => {
          instances.forEach(({ id }) => {
            InventoryInstance.deleteInstanceViaApi(id);
          });
        },
      );
    });

    it(
      'C347830 Match on Instance identifier match meets both the Identifier type and Data requirements Scenario 3 (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.parallel] },
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

        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreateInstance);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForCreateInstance);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreateInstance);
        Logs.clickOnHotLink(0, 3, 'Created');
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
        MatchProfiles.createMatchProfileWithQualifierAndComparePart(matchProfile);
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
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
        });
        FileDetails.checkStatusInColumn(
          FileDetails.status.dash,
          FileDetails.columnNameInResultList.srsMarc,
          1,
        );
        FileDetails.checkStatusInColumn(
          FileDetails.status.noAction,
          FileDetails.columnNameInResultList.instance,
          1,
        );

        // check updated instance in Inventory
        FileDetails.openInstanceInInventory('Updated');
        InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogedDateUI);
        InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.instanceStatus);
        InstanceRecordView.verifyGeneralNoteContent(instanceGeneralNote);
      },
    );
  });
});
