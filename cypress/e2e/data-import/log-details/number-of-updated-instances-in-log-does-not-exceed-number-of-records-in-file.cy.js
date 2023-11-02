import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FileManager from '../../../support/utils/fileManager';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const fieldProtectionIds = [];
    let instanceHRID = null;
    const quantityOfItems = '1';
    const jobProfileToRun = 'Default - Create instance and SRS MARC Bib';
    const marcFileNameForCreate = `C367966 autotestFile.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C367966 editedAutotestFile.${getRandomPostfix()}.mrc`;
    const marcFileName = `C367966 autotestFile.${getRandomPostfix()}.mrc`;
    const protectedFields = {
      firstField: '020',
      secondField: '514',
    };
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C367966 Update MARC Bib with protections ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          name: `createInstanceActionProf${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          name: `C367966 Update instance 1 ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          administrativeNote:
            'This note was added when the MARC Bib was updated to check field protections',
          noteInFile: 'This is the ORIGINAL version of the non-repeatable 514 note',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `createInstanceActionProf${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];
    const matchProfile = {
      profileName: `C367966 001 to 001 MARC Bib ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C367966 Update 1: MARC Bib with protections ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.wrap(fieldProtectionIds).each((id) => {
        MarcFieldProtection.deleteViaApi(id);
      });
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      // delete created file in fixtures
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
        (instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C367966 Confirm the number of updated instances in the import log does not exceed the number of records in the file (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: protectedFields.firstField,
        }).then((resp) => {
          fieldProtectionIds.push(resp.id);
        });
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: protectedFields.secondField,
        }).then((resp) => {
          fieldProtectionIds.push(resp.id);
        });

        // create Field mapping profiles
        FieldMappingProfiles.createMappingProfileForUpdatesMarc(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.createMappingProfileWithNotes(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
          collectionOfMappingAndActionProfiles[1].mappingProfile.administrativeNote,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create Action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create Match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create Job profiles
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndTwoActionProfiles(
          matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC367966_BeforeOverride.mrc', marcFileNameForCreate);
        JobProfiles.search(jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForCreate);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(marcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems);
        FileDetails.openInstanceInInventory('Created');
        InstanceRecordView.verifyInstanceRecordViewOpened();
        InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;

          InstanceRecordView.viewSource();
          InventoryViewSource.contains('514\t');
          InventoryViewSource.contains(
            collectionOfMappingAndActionProfiles[1].mappingProfile.noteInFile,
          );
          DataImport.editMarcFile(
            'marcFileForC367966_Rev1Protect.mrc',
            editedMarcFileName,
            ['in00000000331'],
            [instanceHRID],
          );
        });

        // upload an edited marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile();
        Logs.openFileDetails(marcFileName);
        FileDetails.checkStatusInColumn(
          FileDetails.status.updated,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);
      },
    );
  });
});
