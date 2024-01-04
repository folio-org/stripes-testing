import {
  ACCEPTED_DATA_TYPE_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
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
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    const rowNumbers = [0, 1];
    const instanceHrids = [];
    const marcFileName = `C368005 autotestFile.${getRandomPostfix()}.mrc`;
    const itemNotes = {
      note: 'This is a plain note',
      checkInNoteForFirstItem: 'This is a check in note',
      blindingNote: 'This is a binding note',
      electronicBookplate: 'This is an electronic bookplate note',
      checkOutNote: 'This is a check out note',
      checkInNoteForSecondItem: 'This is a check in note',
      staffOnly: 'Yes',
    };
    const collectionOfProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C368005 Create instance for mapping notes ${getRandomPostfix()}`,
          catalogingDate: '###TODAY###',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C368005 Create instance for mapping notes ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C368005 Create holdings for mapping notes ${getRandomPostfix()}`,
          permanetLocation: `"${LOCATION_NAMES.ANNEX}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C368005 Create holdings for mapping notes ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C368005 Create item for mapping notes ${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
          noteType: '876$t',
          note: '876$n',
          staffOnly: 'Mark for all affected records',
          noteTypeForCheckIn: '878$t',
          noteForCheckIn: '878$a',
          staffOnlyForCheckIn: 'Mark for all affected records',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C368005 Create items for mapping notes ${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C368005 Create mappings for item notes ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
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
        Users.deleteViaApi(user.userId);
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        instanceHrids.forEach((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              cy.deleteItemViaApi(instance.items[0].id);
              cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C368005 Verify the mapping for item record notes and check in/out notes from MARC field (folijet)',
      { tags: ['criticalPath', 'folijet', 'parallel'] },
      () => {
        // create Field mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[2].mappingProfile);
        NewFieldMappingProfile.fillMaterialType(
          collectionOfProfiles[2].mappingProfile.materialType,
        );
        NewFieldMappingProfile.addItemNotes(
          collectionOfProfiles[2].mappingProfile.noteType,
          collectionOfProfiles[2].mappingProfile.note,
          collectionOfProfiles[2].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.addCheckInCheckOutNote(
          collectionOfProfiles[2].mappingProfile.noteTypeForCheckIn,
          collectionOfProfiles[2].mappingProfile.noteForCheckIn,
          collectionOfProfiles[2].mappingProfile.staffOnlyForCheckIn,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(`"${collectionOfProfiles[2].mappingProfile.status}"`);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfiles[2].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[2].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[1].mappingProfile);
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfProfiles[1].mappingProfile.permanetLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfiles[1].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfiles[0].mappingProfile);
        NewFieldMappingProfile.fillCatalogedDate(
          collectionOfProfiles[0].mappingProfile.catalogingDate,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfiles[0].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfiles[0].mappingProfile.name,
        );

        // create Action profiles
        collectionOfProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfProfiles[2].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC368005.mrc', marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName, 1);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '2');

        // get instance hrids
        rowNumbers.forEach((row) => {
          FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, row);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrids.push(initialInstanceHrId);
          });
          cy.go('back');
        });

        // check item notes in Inventory
        FileDetails.openItemInInventory(RECORD_STATUSES.CREATED);
        ItemRecordView.checkItemNote(itemNotes.note, itemNotes.staffOnly);
        ItemRecordView.checkCheckInNote(itemNotes.checkInNoteForFirstItem);
        cy.wait(2000);
        cy.go('back');
        FileDetails.openItemInInventory(RECORD_STATUSES.CREATED, 1);
        ItemRecordView.checkBindingNote(itemNotes.blindingNote);
        ItemRecordView.checkElectronicBookplateNote(itemNotes.electronicBookplate);
        ItemRecordView.checkCheckOutNote(itemNotes.checkOutNote);
        ItemRecordView.checkCheckInNote(itemNotes.checkInNoteForSecondItem);
      },
    );
  });
});
